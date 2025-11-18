import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PositionChangeStatus = 'Pending' | 'Approved' | 'Rejected';

@Schema({ timestamps: true })
export class PositionChangeRequest {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  requestedBy!: Types.ObjectId; // manager / HoD

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position', required: true })
  targetPositionId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  newDeptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  newReportsToId?: Types.ObjectId;

  @Prop()
  reason?: string;

  @Prop({ default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] })
  status!: PositionChangeStatus;

  @Prop()
  decidedAt?: Date;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  decidedBy?: Types.ObjectId;

  @Prop()
  decisionComment?: string;
}

export type PositionChangeRequestDocument = HydratedDocument<PositionChangeRequest>;
export const PositionChangeRequestSchema = SchemaFactory.createForClass(PositionChangeRequest);