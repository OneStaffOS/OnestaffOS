import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AdjustmentAuditDocument = AdjustmentAudit & Document;

@Schema({ timestamps: true })
export class AdjustmentAudit {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppraisalDispute', required: true })
  disputeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'AppraisalRecord', required: true })
  appraisalId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
  adjustedByEmployeeId: Types.ObjectId;

  @Prop({ type: Object })
  before: any;

  @Prop({ type: Object })
  after: any;

  @Prop({ type: String })
  reason?: string;
}

export const AdjustmentAuditSchema = SchemaFactory.createForClass(AdjustmentAudit);
