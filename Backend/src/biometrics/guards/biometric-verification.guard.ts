import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { RecognitionEvent, RecognitionEventDocument } from '../models/recognition-event.schema';
import { PunchType } from '../../time-management/models/enums/index';
import * as crypto from 'crypto';

@Injectable()
export class BiometricVerificationGuard implements CanActivate {
  constructor(
    @InjectModel(RecognitionEvent.name)
    private readonly recognitionEventModel: Model<RecognitionEventDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const punchType = request?.body?.type;

    if (punchType !== PunchType.IN && punchType !== 'IN') {
      return true;
    }

    const employeeId = request?.user?.employeeId || request?.user?.sub;
    if (!employeeId) {
      throw new ForbiddenException('Missing employee identity');
    }

    const rawToken =
      request.headers['x-biometric-verification'] ||
      request.headers['x-face-verification'];
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new ForbiddenException('Biometric verification token required');
    }
    const tokenValue = token.trim();

    const secret = process.env.BIOMETRIC_VERIFICATION_SECRET;
    if (!secret) {
      throw new ForbiddenException('Biometric verification not configured');
    }

    const tokenHash = crypto.createHmac('sha256', secret).update(tokenValue).digest('hex');
    const now = new Date();
    const employeeObjectId = Types.ObjectId.isValid(employeeId)
      ? new Types.ObjectId(employeeId)
      : employeeId;

    const event = await this.recognitionEventModel.findOne({
      employeeId: employeeObjectId,
      verificationTokenHash: tokenHash,
      verificationTokenExpiresAt: { $gt: now },
      verificationTokenUsedAt: { $exists: false },
    }).exec();

    if (!event) {
      throw new ForbiddenException('Biometric verification token invalid or expired');
    }

    event.verificationTokenUsedAt = now;
    await event.save();

    return true;
  }
}
