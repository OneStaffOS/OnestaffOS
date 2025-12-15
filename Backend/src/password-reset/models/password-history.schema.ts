import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PasswordHistoryDocument = PasswordHistory & Document;

@Schema({ timestamps: true })
export class PasswordHistory {
  @Prop({ type: Types.ObjectId, required: true, ref: 'EmployeeProfile' })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  passwordChangedAt: Date;

  @Prop({ required: true })
  expiresAt: Date; // 90 days from passwordChangedAt

  @Prop({ default: 'manual' })
  changeType: 'initial' | 'manual' | 'reset' | 'forced';

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const PasswordHistorySchema = SchemaFactory.createForClass(PasswordHistory);

// Index for finding latest password change by employee
PasswordHistorySchema.index({ employeeId: 1, passwordChangedAt: -1 });
// Index for finding expired passwords
PasswordHistorySchema.index({ expiresAt: 1 });
