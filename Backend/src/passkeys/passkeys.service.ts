/**
 * PasskeysService
 * Handles WebAuthn/FIDO2 passkey operations for MFA
 * Uses @simplewebauthn/server for cryptographic operations
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { EmployeePasskey, EmployeePasskeyDocument } from './models/employee-passkey.schema';
import { WebAuthnChallenge, WebAuthnChallengeDocument, ChallengeType } from './models/webauthn-challenge.schema';
import { 
  PasskeyInfo, 
  VerifyRegistrationDto, 
  VerifyAuthenticationDto 
} from './dto/passkey.dto';

// Environment configuration for WebAuthn
const getWebAuthnConfig = () => ({
  rpName: process.env.WEBAUTHN_RP_NAME || 'OneStaff OS',
  rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
  origin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:3001',
});

@Injectable()
export class PasskeysService {
  private readonly logger = new Logger(PasskeysService.name);

  constructor(
    @InjectModel(EmployeePasskey.name)
    private readonly passkeyModel: Model<EmployeePasskeyDocument>,
    @InjectModel(WebAuthnChallenge.name)
    private readonly challengeModel: Model<WebAuthnChallengeDocument>,
  ) {}

  /**
   * Generate a correlation ID for request tracing
   */
  generateCorrelationId(): string {
    return `webauthn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Check if an employee has any registered passkeys
   */
  async hasPasskeys(employeeId: string): Promise<boolean> {
    const count = await this.passkeyModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      isActive: true,
    });
    return count > 0;
  }

  /**
   * Get all passkeys for an employee
   */
  async getPasskeys(employeeId: string): Promise<PasskeyInfo[]> {
    const passkeys = await this.passkeyModel
      .find({ employeeId: new Types.ObjectId(employeeId) })
      .sort({ createdAt: -1 })
      .lean();

    return passkeys.map((pk) => ({
      id: (pk._id as Types.ObjectId).toString(),
      deviceName: pk.deviceName || 'Unknown Device',
      deviceType: pk.deviceType,
      createdAt: pk.createdAt || new Date(),
      lastUsedAt: pk.lastUsedAt,
      isActive: pk.isActive,
    }));
  }

  /**
   * Generate registration options for a new passkey
   */
  async generateRegistrationOptions(
    employeeId: string,
    email: string,
    displayName: string,
  ): Promise<{ options: PublicKeyCredentialCreationOptionsJSON; correlationId: string }> {
    const correlationId = this.generateCorrelationId();
    const config = getWebAuthnConfig();
    
    this.logger.log(`[${correlationId}] Generating registration options for employee: ${employeeId}`);

    // Get existing passkeys to exclude from registration
    const existingPasskeys = await this.passkeyModel
      .find({ employeeId: new Types.ObjectId(employeeId), isActive: true })
      .lean();

    const excludeCredentials = existingPasskeys.map((pk) => ({
      id: pk.credentialId,
      transports: pk.transports as AuthenticatorTransportFuture[],
    }));

    // Generate WebAuthn registration options
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpID,
      userName: email,
      userDisplayName: displayName || email,
      // Use a consistent user ID based on employeeId
      userID: new TextEncoder().encode(employeeId),
      attestationType: 'none', // We don't need attestation for MFA
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer built-in authenticators (Face ID, Touch ID, Windows Hello)
      },
      timeout: 60000, // 60 seconds
    });

    // Store challenge for verification
    await this.storeChallenge(
      employeeId,
      options.challenge,
      ChallengeType.REGISTRATION,
      correlationId,
    );

    this.logger.log(`[${correlationId}] Registration options generated successfully`);
    return { options, correlationId };
  }

  /**
   * Verify registration response and save the new passkey
   */
  async verifyRegistration(
    employeeId: string,
    credential: VerifyRegistrationDto,
    deviceName?: string,
  ): Promise<{ verified: boolean; passkey?: PasskeyInfo; correlationId: string }> {
    const correlationId = this.generateCorrelationId();
    const config = getWebAuthnConfig();

    this.logger.log(`[${correlationId}] Verifying registration for employee: ${employeeId}`);

    // Retrieve stored challenge
    const storedChallenge = await this.getAndDeleteChallenge(
      employeeId,
      ChallengeType.REGISTRATION,
    );

    if (!storedChallenge) {
      this.logger.error(`[${correlationId}] No valid challenge found for registration`);
      throw new BadRequestException('No valid registration challenge found. Please restart the registration process.');
    }

    try {
      // Convert DTO to RegistrationResponseJSON format
      const registrationResponse: RegistrationResponseJSON = {
        id: credential.id,
        rawId: credential.rawId,
        type: credential.type as 'public-key',
        response: {
          clientDataJSON: credential.response.clientDataJSON,
          attestationObject: credential.response.attestationObject,
          transports: credential.response.transports as AuthenticatorTransportFuture[],
          publicKeyAlgorithm: credential.response.publicKeyAlgorithm ? Number(credential.response.publicKeyAlgorithm) : undefined,
          publicKey: credential.response.publicKey,
          authenticatorData: credential.response.authenticatorData,
        },
        authenticatorAttachment: credential.authenticatorAttachment as 'platform' | 'cross-platform',
        clientExtensionResults: (credential.clientExtensionResults || {}) as AuthenticationExtensionsClientOutputs,
      };

      // IMPORTANT: Reject cross-platform credentials (QR code / phone registrations)
      // We only want platform authenticators (Touch ID, Face ID, Windows Hello)
      if (credential.authenticatorAttachment === 'cross-platform') {
        this.logger.warn(`[${correlationId}] Rejected cross-platform credential registration. User must use device's built-in authenticator.`);
        throw new BadRequestException(
          'Please use your device\'s built-in authenticator (Touch ID, Face ID, or Windows Hello). ' +
          'Do not scan the QR code with your phone. Look for "This Device" or your device name in the popup.'
        );
      }

      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpID,
        requireUserVerification: false, // Allow devices without user verification
      });

      if (!verification.verified || !verification.registrationInfo) {
        this.logger.error(`[${correlationId}] Registration verification failed`);
        throw new BadRequestException('Passkey registration failed. Please try again.');
      }

      const { credential: registeredCredential, credentialBackedUp } = verification.registrationInfo;

      // IMPORTANT: Store the credential ID exactly as received from the browser (credential.id)
      // NOT the re-encoded version from registeredCredential.id
      // The browser sends base64url encoded ID, and will send the same ID during authentication
      const credentialIdToStore = credential.id;
      
      // Public key needs to be encoded for storage
      const publicKeyBase64 = Buffer.from(registeredCredential.publicKey).toString('base64url');

      // Determine device type from authenticatorAttachment
      const deviceType = credential.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform';

      // Save the new passkey
      const newPasskey = new this.passkeyModel({
        employeeId: new Types.ObjectId(employeeId),
        credentialId: credentialIdToStore, // Use the browser's credential ID directly
        credentialPublicKey: publicKeyBase64,
        counter: registeredCredential.counter,
        transports: credential.response.transports || ['internal'], // Default to internal for platform auth
        deviceName: deviceName || credential.deviceName || 'Security Key',
        deviceType,
        isActive: true,
      });

      await newPasskey.save();

      this.logger.log(`[${correlationId}] Passkey registered successfully. ID: ${newPasskey._id}, DeviceType: ${deviceType}, BackedUp: ${credentialBackedUp}`);

      return {
        verified: true,
        passkey: {
          id: (newPasskey._id as Types.ObjectId).toString(),
          deviceName: newPasskey.deviceName,
          deviceType: newPasskey.deviceType,
          createdAt: newPasskey.createdAt || new Date(),
          lastUsedAt: null,
          isActive: true,
        },
        correlationId,
      };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[${correlationId}] Registration verification error: ${err.message}`, err.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException(`Passkey registration failed: ${err.message}`);
    }
  }

  /**
   * Generate authentication options for MFA
   */
  async generateAuthenticationOptions(
    employeeId: string,
  ): Promise<{ options: PublicKeyCredentialRequestOptionsJSON; correlationId: string }> {
    const correlationId = this.generateCorrelationId();
    const config = getWebAuthnConfig();

    this.logger.log(`[${correlationId}] Generating authentication options for employee: ${employeeId}`);

    // Verify user has registered passkeys
    const passkeyCount = await this.passkeyModel.countDocuments({
      employeeId: new Types.ObjectId(employeeId),
      isActive: true,
    });

    if (passkeyCount === 0) {
      throw new NotFoundException('No registered passkeys found for this account.');
    }

    // Generate authentication options - use empty allowCredentials to let browser find discoverable credentials
    // This is the recommended approach for passkeys and avoids credential ID mismatch issues
    const options = await generateAuthenticationOptions({
      rpID: config.rpID,
      // Leave allowCredentials empty to use discoverable credentials (resident keys)
      // The browser will find all passkeys for this rpID automatically
      allowCredentials: [],
      userVerification: 'required', // Force biometric/PIN verification
      timeout: 60000, // 60 seconds
    });

    // Store challenge for verification
    await this.storeChallenge(
      employeeId,
      options.challenge,
      ChallengeType.AUTHENTICATION,
      correlationId,
    );

    this.logger.log(`[${correlationId}] Authentication options generated successfully`);
    return { options, correlationId };
  }

  /**
   * Verify authentication response for MFA
   */
  async verifyAuthentication(
    employeeId: string,
    credential: VerifyAuthenticationDto,
  ): Promise<{ verified: boolean; correlationId: string }> {
    const correlationId = this.generateCorrelationId();
    const config = getWebAuthnConfig();

    this.logger.log(`[${correlationId}] Verifying authentication for employee: ${employeeId}`);

    // Retrieve stored challenge
    const storedChallenge = await this.getAndDeleteChallenge(
      employeeId,
      ChallengeType.AUTHENTICATION,
    );

    if (!storedChallenge) {
      this.logger.error(`[${correlationId}] No valid challenge found for authentication`);
      throw new BadRequestException('No valid authentication challenge found. Please try again.');
    }

    // The credential.id from browser is base64url encoded
    // During registration, we store the credential.id directly (already base64url from browser)
    const passkey = await this.passkeyModel.findOne({
      employeeId: new Types.ObjectId(employeeId),
      credentialId: credential.id,
      isActive: true,
    });

    if (!passkey) {
      this.logger.error(`[${correlationId}] Passkey not found for employee ${employeeId}`);
      throw new NotFoundException('Passkey not found or has been disabled.');
    }

    try {
      // Decode stored credential data - publicKey needs to be Uint8Array
      const publicKeyBuffer = Buffer.from(passkey.credentialPublicKey, 'base64url');
      const publicKeyUint8 = new Uint8Array(publicKeyBuffer);

      // Convert DTO to AuthenticationResponseJSON format
      const authResponse: AuthenticationResponseJSON = {
        id: credential.id,
        rawId: credential.rawId,
        type: credential.type as 'public-key',
        response: {
          clientDataJSON: credential.response.clientDataJSON,
          authenticatorData: credential.response.authenticatorData,
          signature: credential.response.signature,
          userHandle: credential.response.userHandle,
        },
        authenticatorAttachment: credential.authenticatorAttachment as 'platform' | 'cross-platform',
        clientExtensionResults: (credential.clientExtensionResults || {}) as AuthenticationExtensionsClientOutputs,
      };

      const verification = await verifyAuthenticationResponse({
        response: authResponse,
        expectedChallenge: storedChallenge.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpID,
        credential: {
          id: passkey.credentialId,
          publicKey: publicKeyUint8,
          counter: passkey.counter,
          transports: passkey.transports as AuthenticatorTransportFuture[],
        },
        requireUserVerification: false,
      });

      if (!verification.verified) {
        this.logger.error(`[${correlationId}] Authentication verification failed`);
        throw new UnauthorizedException('Passkey authentication failed.');
      }

      // Update counter to prevent replay attacks
      const newCounter = verification.authenticationInfo.newCounter;
      await this.passkeyModel.updateOne(
        { _id: passkey._id },
        { 
          counter: newCounter, 
          lastUsedAt: new Date() 
        },
      );

      this.logger.log(`[${correlationId}] Authentication verified successfully`);

      return { verified: true, correlationId };
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[${correlationId}] Authentication verification error: ${err.message}`, err.stack);
      
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new UnauthorizedException(`Passkey authentication failed: ${err.message}`);
    }
  }

  /**
   * Rename a passkey
   */
  async renamePasskey(
    employeeId: string,
    passkeyId: string,
    newName: string,
  ): Promise<PasskeyInfo> {
    const passkey = await this.passkeyModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(passkeyId),
        employeeId: new Types.ObjectId(employeeId),
      },
      { deviceName: newName },
      { new: true },
    );

    if (!passkey) {
      throw new NotFoundException('Passkey not found.');
    }

    this.logger.log(`Passkey ${passkeyId} renamed successfully`);
    return {
      id: (passkey._id as Types.ObjectId).toString(),
      deviceName: passkey.deviceName,
      deviceType: passkey.deviceType,
      createdAt: passkey.createdAt || new Date(),
      lastUsedAt: passkey.lastUsedAt,
      isActive: passkey.isActive,
    };
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(employeeId: string, passkeyId: string): Promise<void> {
    const result = await this.passkeyModel.deleteOne({
      _id: new Types.ObjectId(passkeyId),
      employeeId: new Types.ObjectId(employeeId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Passkey not found.');
    }

    this.logger.log(`Passkey ${passkeyId} deleted successfully`);
  }

  /**
   * Deactivate a passkey (soft delete)
   */
  async deactivatePasskey(employeeId: string, passkeyId: string): Promise<void> {
    const result = await this.passkeyModel.updateOne(
      {
        _id: new Types.ObjectId(passkeyId),
        employeeId: new Types.ObjectId(employeeId),
      },
      { isActive: false },
    );

    if (result.matchedCount === 0) {
      throw new NotFoundException('Passkey not found.');
    }

    this.logger.log(`Passkey ${passkeyId} deactivated successfully`);
  }

  /**
   * Store a challenge for later verification
   */
  private async storeChallenge(
    employeeId: string,
    challenge: string,
    type: ChallengeType,
    _correlationId: string,
  ): Promise<void> {
    // Delete any existing challenges for this employee and type
    await this.challengeModel.deleteMany({
      employeeId: new Types.ObjectId(employeeId),
      type,
    });

    // Create new challenge with 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await this.challengeModel.create({
      employeeId: new Types.ObjectId(employeeId),
      challenge,
      type,
      expiresAt,
      correlationId: _correlationId,
    });
  }

  /**
   * Retrieve and delete a challenge (one-time use)
   */
  private async getAndDeleteChallenge(
    employeeId: string,
    type: ChallengeType,
  ): Promise<WebAuthnChallengeDocument | null> {
    const challenge = await this.challengeModel.findOneAndDelete({
      employeeId: new Types.ObjectId(employeeId),
      type,
      expiresAt: { $gt: new Date() },
    });

    return challenge;
  }
}
