import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'EmployeeProfile' })
  createdByEmployeeId: Types.ObjectId;

  // Targeting options
  @Prop({ type: String, default: 'ALL' })
  targetRole: string; // 'ALL' | 'EMPLOYEE' | 'MANAGER' | custom role

  @Prop({ type: [Types.ObjectId], ref: 'EmployeeProfile', default: [] })
  targetEmployeeIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Department', default: [] })
  targetDepartmentIds: Types.ObjectId[];

  @Prop({ type: [Types.ObjectId], ref: 'Position', default: [] })
  targetPositionIds: Types.ObjectId[];

  @Prop({ type: Date, required: false })
  sendAt?: Date; // schedule time

  @Prop({ type: String, enum: NotificationStatus, default: NotificationStatus.PENDING })
  status: NotificationStatus;

  @Prop({ type: [Types.ObjectId], ref: 'EmployeeProfile', default: [] })
  recipients: Types.ObjectId[]; // resolved recipients after send

  @Prop({ type: [{ employeeId: Types.ObjectId, readAt: Date }], default: [] })
  readBy: Array<{ employeeId: Types.ObjectId; readAt: Date }>;

  @Prop({ type: [Types.ObjectId], ref: 'EmployeeProfile', default: [] })
  archivedBy: Types.ObjectId[];
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
