import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import * as crypto from 'crypto';
import { EncryptionService, EncryptionKeyType } from '../common/encryption/encryption.service';
import type { EncryptedData } from '../common/encryption/encryption.service';
import { HttpService } from '@nestjs/axios';
import {
  FaceTemplate,
  FaceTemplateDocument,
} from './models/face-template.schema';
import {
  VerificationChallenge,
  VerificationChallengeDocument,
  BiometricsChallengeAction,
} from './models/verification-challenge.schema';
import {
  RecognitionEvent,
  RecognitionEventDocument,
  RecognitionEventStatus,
  RecognitionEventType,
} from './models/recognition-event.schema';
import { EncryptedPayloadDto } from './dto/encrypted-payload.dto';

type BiometricsAnalysisResponse = {
  ok: boolean;
  embeddings: number[][];
  embeddingDim: number;
  liveness: {
    passed: boolean;
    actions: Record<string, boolean>;
  };
  spoof: {
    suspicious: boolean;
    reason?: string;
    stabilityScore?: number;
    variance?: number;
  };
  quality: {
    facesDetected: number;
    avgConfidence?: number;
    minConfidence?: number;
  };
};

type DecryptedBiometricsPayload = {
  frames: string[];
  metadata?: Record<string, any>;
};

@Injectable()
export class BiometricsService {
  private readonly maxFrames = Number(process.env.BIOMETRICS_MAX_FRAMES || 8);
  private readonly minFrames = Number(process.env.BIOMETRICS_MIN_FRAMES || 4);
  private readonly maxPayloadBytes = Number(process.env.BIOMETRICS_MAX_PAYLOAD_BYTES || 3_000_000);
  private readonly challengeTtlMs = Number(process.env.BIOMETRICS_CHALLENGE_TTL_SEC || 120) * 1000;
  private readonly verificationTtlMs = Number(process.env.BIOMETRICS_VERIFICATION_TTL_SEC || 120) * 1000;
  private readonly maxTemplateCount = Number(process.env.FACE_TEMPLATE_MAX_COUNT || 10);
  private readonly matchThreshold = Number(process.env.FACE_MATCH_THRESHOLD || 0.85);
  private readonly updateThreshold = Number(process.env.FACE_UPDATE_THRESHOLD || 0.92);
  private readonly attemptWindowMs = Number(process.env.BIOMETRICS_ATTEMPT_WINDOW_SEC || 600) * 1000;
  private readonly maxAttempts = Number(process.env.BIOMETRICS_MAX_ATTEMPTS || 5);
  private readonly lockoutMs = Number(process.env.BIOMETRICS_LOCKOUT_MINUTES || 15) * 60 * 1000;

  constructor(
    @InjectModel(FaceTemplate.name)
    private readonly faceTemplateModel: Model<FaceTemplateDocument>,
    @InjectModel(VerificationChallenge.name)
    private readonly challengeModel: Model<VerificationChallengeDocument>,
    @InjectModel(RecognitionEvent.name)
    private readonly recognitionEventModel: Model<RecognitionEventDocument>,
    private readonly encryptionService: EncryptionService,
    private readonly httpService: HttpService,
  ) {}

  async createChallenge(
    employeeId: string,
    action: BiometricsChallengeAction,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.assertNotLockedOut(employeeId);

    const challengeId = crypto.randomUUID();
    const nonce = crypto.randomBytes(16).toString('base64url');
    const livenessActions = this.pickLivenessActions(action);
    const expiresAt = new Date(Date.now() + this.challengeTtlMs);

    await this.challengeModel.create({
      employeeId: new Types.ObjectId(employeeId),
      challengeId,
      nonce,
      action,
      livenessActions,
      expiresAt,
      ipAddress,
      userAgent,
    });

    return {
      challengeId,
      nonce,
      expiresAt,
      livenessActions,
      publicKey: this.encryptionService.getPublicKey(EncryptionKeyType.BIOMETRICS),
      keyType: EncryptionKeyType.BIOMETRICS,
      version: 1,
    };
  }

  async enroll(
    employeeId: string,
    challengeId: string,
    nonce: string,
    payload: EncryptedPayloadDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.assertNotLockedOut(employeeId);

    const challenge = await this.consumeChallenge(
      employeeId,
      challengeId,
      nonce,
      BiometricsChallengeAction.ENROLL,
    );

    const decrypted = this.decryptPayload(payload);
    const frames = this.validateFrames(decrypted.frames);

    const analysis = await this.analyzeFrames(frames, challenge.livenessActions);
    if (!analysis.ok) {
      await this.recordEvent(employeeId, RecognitionEventType.ENROLL, RecognitionEventStatus.FAILURE, {
        reason: 'Biometrics analysis failed',
        challengeId,
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Biometrics analysis failed');
    }

    if (!analysis.liveness.passed || analysis.spoof.suspicious) {
      const failedActions = Object.entries(analysis.liveness.actions || {})
        .filter(([, ok]) => !ok)
        .map(([action]) => action);
      const failureReason = analysis.spoof.reason
        ? `Liveness verification failed: ${analysis.spoof.reason}`
        : failedActions.length > 0
          ? `Liveness verification failed: ${failedActions.join(', ')}`
          : 'Liveness verification failed';
      await this.recordEvent(employeeId, RecognitionEventType.ENROLL, RecognitionEventStatus.SUSPICIOUS, {
        reason: failureReason,
        challengeId,
        ipAddress,
        userAgent,
        metadata: { liveness: analysis.liveness, spoof: analysis.spoof },
      });
      throw new ForbiddenException(failureReason);
    }

    await this.saveEmbeddings(employeeId, analysis.embeddings, analysis.embeddingDim, analysis);

    await this.recordEvent(employeeId, RecognitionEventType.ENROLL, RecognitionEventStatus.SUCCESS, {
      challengeId,
      ipAddress,
      userAgent,
      metadata: { liveness: analysis.liveness, spoof: analysis.spoof },
    });

    return { ok: true };
  }

  async verify(
    employeeId: string,
    challengeId: string,
    nonce: string,
    payload: EncryptedPayloadDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.assertNotLockedOut(employeeId);

    const challenge = await this.consumeChallenge(
      employeeId,
      challengeId,
      nonce,
      BiometricsChallengeAction.VERIFY,
    );

    const decrypted = this.decryptPayload(payload);
    const frames = this.validateFrames(decrypted.frames);

    const analysis = await this.analyzeFrames(frames, challenge.livenessActions);
    if (!analysis.ok) {
      await this.recordEvent(employeeId, RecognitionEventType.VERIFY, RecognitionEventStatus.FAILURE, {
        reason: 'Biometrics analysis failed',
        challengeId,
        ipAddress,
        userAgent,
      });
      throw new BadRequestException('Biometrics analysis failed');
    }

    if (!analysis.liveness.passed || analysis.spoof.suspicious) {
      const failedActions = Object.entries(analysis.liveness.actions || {})
        .filter(([, ok]) => !ok)
        .map(([action]) => action);
      const failureReason = analysis.spoof.reason
        ? `Liveness verification failed: ${analysis.spoof.reason}`
        : failedActions.length > 0
          ? `Liveness verification failed: ${failedActions.join(', ')}`
          : 'Liveness verification failed';
      await this.recordEvent(employeeId, RecognitionEventType.VERIFY, RecognitionEventStatus.SUSPICIOUS, {
        reason: failureReason,
        challengeId,
        ipAddress,
        userAgent,
        metadata: { liveness: analysis.liveness, spoof: analysis.spoof },
      });
      throw new ForbiddenException(failureReason);
    }

    const template = await this.faceTemplateModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
    }).exec();
    if (!template || !template.embeddings.length || !template.centroid) {
      throw new NotFoundException('Face template not found. Please enroll first.');
    }

    const templateEmbeddings = template.embeddings.map((e) => this.decryptEmbedding(e));
    const centroid = this.decryptEmbedding(template.centroid);
    const normalized = analysis.embeddings.map((emb) => this.normalizeEmbedding(emb));
    const candidate = this.normalizeEmbedding(this.averageEmbedding(normalized));
    const similarities: number[] = [];

    normalized.forEach((emb) => {
      similarities.push(this.cosineSimilarity(emb, centroid));
      templateEmbeddings.forEach((stored) => {
        similarities.push(this.cosineSimilarity(emb, stored));
      });
    });

    similarities.push(this.cosineSimilarity(candidate, centroid));
    templateEmbeddings.forEach((stored) => {
      similarities.push(this.cosineSimilarity(candidate, stored));
    });

    const maxScore = Math.max(...similarities);

    if (maxScore < this.matchThreshold) {
      await this.recordEvent(employeeId, RecognitionEventType.VERIFY, RecognitionEventStatus.FAILURE, {
        reason: 'Face verification failed',
        challengeId,
        ipAddress,
        userAgent,
        score: maxScore,
        threshold: this.matchThreshold,
        metadata: { liveness: analysis.liveness, spoof: analysis.spoof },
      });
      throw new ForbiddenException('Face verification failed');
    }

    const verificationToken = this.createVerificationToken();
    const verificationTokenExpiresAt = new Date(Date.now() + this.verificationTtlMs);

    await this.recordEvent(employeeId, RecognitionEventType.VERIFY, RecognitionEventStatus.SUCCESS, {
      challengeId,
      ipAddress,
      userAgent,
      score: maxScore,
      threshold: this.matchThreshold,
      verificationTokenHash: verificationToken.tokenHash,
      verificationTokenExpiresAt,
      metadata: { liveness: analysis.liveness, spoof: analysis.spoof },
    });

    if (maxScore >= this.updateThreshold && !analysis.spoof.suspicious) {
      await this.saveEmbeddings(employeeId, analysis.embeddings, analysis.embeddingDim, analysis);
    }

    return {
      ok: true,
      verificationToken: verificationToken.token,
      expiresAt: verificationTokenExpiresAt,
      score: maxScore,
    };
  }

  private async analyzeFrames(
    frames: string[],
    livenessActions: string[],
  ): Promise<BiometricsAnalysisResponse> {
    try {
      const response = await lastValueFrom(
        this.httpService.post('/analyze', {
          frames,
          livenessActions,
        }),
      );
      return response.data as BiometricsAnalysisResponse;
    } catch (error: any) {
      const status = error?.response?.status;
      const detail =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Biometrics service error';
      if (status && status >= 400 && status < 500) {
        throw new BadRequestException(detail);
      }
      throw new HttpException(detail, HttpStatus.BAD_GATEWAY);
    }
  }

  private decryptPayload(payload: EncryptedPayloadDto): DecryptedBiometricsPayload {
    if (payload.keyType !== EncryptionKeyType.BIOMETRICS) {
      throw new BadRequestException('Invalid encryption key type');
    }

    const encryptedPayload: EncryptedData = {
      ...payload,
      version: payload.version ?? 1,
    };
    const plaintext = this.encryptionService.decryptHybrid(encryptedPayload);
    let decoded: DecryptedBiometricsPayload;
    try {
      decoded = JSON.parse(plaintext);
    } catch (error) {
      throw new BadRequestException('Invalid payload format');
    }

    return decoded;
  }

  private validateFrames(frames: string[]): string[] {
    if (!Array.isArray(frames)) {
      throw new BadRequestException('Frames payload must be an array');
    }
    if (frames.length < this.minFrames || frames.length > this.maxFrames) {
      throw new BadRequestException('Invalid number of frames for verification');
    }

    const totalBytes = frames.reduce((sum, frame) => sum + Buffer.byteLength(frame, 'base64'), 0);
    if (totalBytes > this.maxPayloadBytes) {
      throw new BadRequestException('Payload too large');
    }

    return frames.map((frame) => frame.replace(/^data:image\/\w+;base64,/, ''));
  }

  private async consumeChallenge(
    employeeId: string,
    challengeId: string,
    nonce: string,
    action: BiometricsChallengeAction,
  ) {
    const challenge = await this.challengeModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      challengeId,
      action,
    }).exec();

    if (!challenge) {
      throw new NotFoundException('Challenge not found');
    }

    if (challenge.usedAt) {
      throw new BadRequestException('Challenge already used');
    }

    if (challenge.expiresAt && challenge.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Challenge expired');
    }

    const nonceBuffer = Buffer.from(nonce);
    const storedBuffer = Buffer.from(challenge.nonce);
    if (
      nonceBuffer.length !== storedBuffer.length ||
      !crypto.timingSafeEqual(nonceBuffer, storedBuffer)
    ) {
      throw new BadRequestException('Invalid challenge nonce');
    }

    challenge.usedAt = new Date();
    challenge.attempts += 1;
    await challenge.save();

    return challenge;
  }

  private async saveEmbeddings(
    employeeId: string,
    embeddings: number[][],
    embeddingDim: number,
    analysis: BiometricsAnalysisResponse,
  ) {
    if (!Array.isArray(embeddings) || embeddings.length === 0) {
      throw new BadRequestException('No embeddings returned');
    }
    if (embeddings.some((emb) => emb.length !== embeddingDim)) {
      throw new BadRequestException('Embedding dimension mismatch');
    }

    const template = await this.faceTemplateModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
    }).exec();

    const sanitizedEmbeddings = embeddings.map((emb) => this.normalizeEmbedding(emb));
    const encryptedEmbeddings = sanitizedEmbeddings.map((emb) =>
      this.encryptionService.encryptAES(JSON.stringify(emb), EncryptionKeyType.BIOMETRICS),
    );

    if (!template) {
      const centroid = this.averageEmbedding(sanitizedEmbeddings);
      const encryptedCentroid = this.encryptionService.encryptAES(
        JSON.stringify(centroid),
        EncryptionKeyType.BIOMETRICS,
      );
      await this.faceTemplateModel.create({
        employeeId: new Types.ObjectId(employeeId),
        embeddings: encryptedEmbeddings,
        centroid: encryptedCentroid,
        embeddingCount: encryptedEmbeddings.length,
        embeddingDim,
        lastConfidence: analysis.quality.avgConfidence,
      });
      return;
    }

    const existingEmbeddings = template.embeddings.map((emb) => this.decryptEmbedding(emb));
    const updatedEmbeddings = [...existingEmbeddings, ...sanitizedEmbeddings].slice(-this.maxTemplateCount);
    const updatedEncrypted = updatedEmbeddings.map((emb) =>
      this.encryptionService.encryptAES(JSON.stringify(emb), EncryptionKeyType.BIOMETRICS),
    );

    const centroid = this.averageEmbedding(updatedEmbeddings);
    const encryptedCentroid = this.encryptionService.encryptAES(
      JSON.stringify(centroid),
      EncryptionKeyType.BIOMETRICS,
    );

    template.embeddings = updatedEncrypted;
    template.centroid = encryptedCentroid;
    template.embeddingCount = updatedEmbeddings.length;
    template.embeddingDim = embeddingDim;
    template.lastConfidence = analysis.quality.avgConfidence;
    await template.save();
  }

  private decryptEmbedding(encrypted: any): number[] {
    const decrypted = this.encryptionService.decryptAES(encrypted);
    const parsed = JSON.parse(decrypted);
    if (!Array.isArray(parsed)) {
      throw new BadRequestException('Invalid embedding payload');
    }
    return parsed;
  }

  private averageEmbedding(embeddings: number[][]): number[] {
    const length = embeddings[0].length;
    const accumulator = new Array(length).fill(0);
    embeddings.forEach((emb) => {
      for (let i = 0; i < length; i += 1) {
        accumulator[i] += emb[i];
      }
    });
    return accumulator.map((val) => val / embeddings.length);
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
    return embedding.map((val) => val / norm);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, idx) => sum + val * b[idx], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    if (!normA || !normB) {
      return 0;
    }
    return dot / (normA * normB);
  }

  private pickLivenessActions(action: BiometricsChallengeAction): string[] {
    const envOverride =
      action === BiometricsChallengeAction.VERIFY
        ? process.env.BIOMETRICS_VERIFY_ACTIONS
        : process.env.BIOMETRICS_ENROLL_ACTIONS;
    if (envOverride) {
      const actions = envOverride
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      if (actions.length === 1 && actions[0].toLowerCase() === 'none') {
        return [];
      }
      if (actions.length > 0) {
        return actions;
      }
    }

    if (action === BiometricsChallengeAction.VERIFY) {
      return ['blink'];
    }

    const actions = ['blink', 'smile', 'turn_left', 'turn_right'];
    const selected = new Set<string>();
    while (selected.size < 2) {
      selected.add(actions[crypto.randomInt(actions.length)]);
    }
    return Array.from(selected);
  }

  private async assertNotLockedOut(employeeId: string) {
    if (this.lockoutMs <= 0 || this.maxAttempts <= 0) {
      return;
    }

    const windowStart = new Date(Date.now() - this.attemptWindowMs);
    const failures = await this.recognitionEventModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      status: { $in: [RecognitionEventStatus.FAILURE, RecognitionEventStatus.SUSPICIOUS] },
      createdAt: { $gte: windowStart },
    }).exec();

    if (failures < this.maxAttempts) {
      return;
    }

    const lastFailure = await this.recognitionEventModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      status: { $in: [RecognitionEventStatus.FAILURE, RecognitionEventStatus.SUSPICIOUS] },
    }).sort({ createdAt: -1 }).select({ createdAt: 1 }).exec();

    const lastFailureAtValue = (lastFailure as any)?.get?.('createdAt') as Date | undefined;
    const lastFailureAt = lastFailureAtValue
      ? new Date(lastFailureAtValue)
      : undefined;
    const lockoutUntil = lastFailureAt
      ? new Date(lastFailureAt.getTime() + this.lockoutMs)
      : new Date(Date.now() + this.lockoutMs);

    if (lockoutUntil > new Date()) {
      throw new HttpException(
        `Biometric verification locked until ${lockoutUntil.toISOString()}`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private createVerificationToken() {
    const token = crypto.randomBytes(32).toString('base64url');
    const secret = process.env.BIOMETRIC_VERIFICATION_SECRET;
    if (!secret) {
      throw new BadRequestException('Biometric verification secret not configured');
    }
    const tokenHash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    return { token, tokenHash };
  }

  private async recordEvent(
    employeeId: string,
    eventType: RecognitionEventType,
    status: RecognitionEventStatus,
    details: {
      reason?: string;
      challengeId?: string;
      ipAddress?: string;
      userAgent?: string;
      score?: number;
      threshold?: number;
      verificationTokenHash?: string;
      verificationTokenExpiresAt?: Date;
      metadata?: Record<string, any>;
    },
  ) {
    await this.recognitionEventModel.create({
      employeeId: new Types.ObjectId(employeeId),
      eventType,
      status,
      reason: details.reason,
      challengeId: details.challengeId,
      ipAddress: details.ipAddress,
      userAgent: details.userAgent,
      score: details.score,
      threshold: details.threshold,
      verificationTokenHash: details.verificationTokenHash,
      verificationTokenExpiresAt: details.verificationTokenExpiresAt,
      metadata: details.metadata,
    });
  }
}
