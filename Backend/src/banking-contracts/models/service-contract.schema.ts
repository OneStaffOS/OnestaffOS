import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ContractStatus } from '../enums/banking-contracts.enums';

export type ServiceContractDocument = HydratedDocument<ServiceContract>;

@Schema({ _id: false })
export class CompletionRequest {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: Date, default: () => new Date() })
  submittedAt: Date;
}

export const CompletionRequestSchema = SchemaFactory.createForClass(CompletionRequest);

@Schema({ collection: 'service_contracts', timestamps: true })
export class ServiceContract {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true })
  departmentId: Types.ObjectId;

  @Prop({ type: String, required: true })
  requestedService: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true })
  timeEstimateDays: number;

  @Prop({ type: Number, required: true })
  paymentAmount: number;

  @Prop({ type: String, enum: Object.values(ContractStatus), required: true })
  status: ContractStatus;

  @Prop({ type: Date })
  activatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  activatedByEmployeeId?: Types.ObjectId;

  @Prop({ type: Date })
  completionRequestedAt?: Date;

  @Prop({ type: [CompletionRequestSchema], default: [] })
  completionRequests?: CompletionRequest[];

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  completedByEmployeeId?: Types.ObjectId;

  @Prop({ type: Date })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  approvedByClientId?: Types.ObjectId;
}

export const ServiceContractSchema = SchemaFactory.createForClass(ServiceContract);
ServiceContractSchema.index({ departmentId: 1, status: 1 });
ServiceContractSchema.index({ clientId: 1, createdAt: -1 });
