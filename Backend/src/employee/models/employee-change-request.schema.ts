import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type ChangeRequestType = 'DATA_CORRECTION' | 'LEGAL_CHANGE';
export type ChangeRequestStatus = 'Pending' | 'Approved' | 'Rejected';

@Schema({ timestamps: true })
export class EmployeeChangeRequest {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true })
  employeeId!: Types.ObjectId;

  @Prop({ required: true, enum: ['DATA_CORRECTION', 'LEGAL_CHANGE'] })
  type!: ChangeRequestType;

  @Prop({ type: MSchema.Types.Mixed, required: true })
  requestedChanges!: Record<string, any>;

  @Prop({ default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] })
  status!: ChangeRequestStatus;

  @Prop() comment?: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
decidedBy?: Types.ObjectId;
  @Prop() decidedAt?: Date;
}

export type EmployeeChangeRequestDocument = HydratedDocument<EmployeeChangeRequest>;
export const EmployeeChangeRequestSchema = SchemaFactory.createForClass(EmployeeChangeRequest);