import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordResetTokenDocument = PasswordResetToken & Document;

@Schema({ timestamps: true })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, required: true, ref: 'EmployeeProfile' })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop()
  usedAt?: Date;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

// Index for automatic cleanup of expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Note: token field has unique: true, so no explicit index needed
// Index for finding tokens by employee
PasswordResetTokenSchema.index({ employeeId: 1 });
