/**
 * EmployeePasskey Schema
 * Stores WebAuthn/FIDO2 passkey credentials for employees
 * Used for passwordless MFA authentication via device biometrics
 */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployeePasskeyDocument = EmployeePasskey & Document;

@Schema({ timestamps: true, collection: 'employee_passkeys' })
export class EmployeePasskey {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  credentialId: string; // Base64URL encoded credential ID

  @Prop({ required: true })
  credentialPublicKey: string; // Base64URL encoded public key

  @Prop({ required: true, default: 0 })
  counter: number; // Signature counter for replay attack prevention

  @Prop({ type: [String], default: [] })
  transports: string[]; // e.g., ['internal', 'hybrid', 'usb', 'ble', 'nfc']

  @Prop({ default: '' })
  deviceName: string; // User-friendly name for the device

  @Prop({ default: 'unknown' })
  deviceType: string; // 'platform' (built-in) or 'cross-platform' (external key)

  @Prop({ type: Date, default: null })
  lastUsedAt: Date | null;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const EmployeePasskeySchema = SchemaFactory.createForClass(EmployeePasskey);

// Compound index for efficient lookups
EmployeePasskeySchema.index({ employeeId: 1, credentialId: 1 });

// Index for finding active passkeys by employee
EmployeePasskeySchema.index({ employeeId: 1, isActive: 1 });
