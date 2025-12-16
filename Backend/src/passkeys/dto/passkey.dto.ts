/**
 * DTOs for Passkey Registration and Authentication
 */

import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsObject, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// ============== Registration DTOs ==============

export class StartRegistrationDto {
  @IsString()
  @IsOptional()
  deviceName?: string;
}

export class AuthenticatorAttestationResponseDto {
  @IsString()
  @IsNotEmpty()
  clientDataJSON: string;

  @IsString()
  @IsNotEmpty()
  attestationObject: string;

  @IsArray()
  @IsOptional()
  transports?: string[];

  @IsNumber()
  @IsOptional()
  publicKeyAlgorithm?: number;

  @IsString()
  @IsOptional()
  publicKey?: string;

  @IsString()
  @IsOptional()
  authenticatorData?: string;
}

export class VerifyRegistrationDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  rawId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAttestationResponseDto)
  response: AuthenticatorAttestationResponseDto;

  @IsString()
  @IsOptional()
  authenticatorAttachment?: string;

  @IsObject()
  @IsOptional()
  clientExtensionResults?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  deviceName?: string;
}

// ============== Authentication DTOs ==============

export class StartAuthenticationDto {
  @IsString()
  @IsNotEmpty()
  email: string;
}

export class AuthenticatorAssertionResponseDto {
  @IsString()
  @IsNotEmpty()
  clientDataJSON: string;

  @IsString()
  @IsNotEmpty()
  authenticatorData: string;

  @IsString()
  @IsNotEmpty()
  signature: string;

  @IsString()
  @IsOptional()
  userHandle?: string;
}

export class VerifyAuthenticationDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  rawId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AuthenticatorAssertionResponseDto)
  response: AuthenticatorAssertionResponseDto;

  @IsString()
  @IsOptional()
  authenticatorAttachment?: string;

  @IsObject()
  @IsOptional()
  clientExtensionResults?: Record<string, unknown>;
}

// ============== Management DTOs ==============

export class RenamePasskeyDto {
  @IsString()
  @IsNotEmpty()
  deviceName: string;
}

// ============== Response Types (not DTOs, just type definitions) ==============

export interface PasskeyInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  isActive: boolean;
}

export interface RegistrationOptionsResponse {
  options: Record<string, unknown>;
  correlationId: string;
}

export interface AuthenticationOptionsResponse {
  options: Record<string, unknown>;
  correlationId: string;
  mfaRequired: boolean;
}
