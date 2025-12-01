import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDeliveryDocument = NotificationDelivery & Document;

@Schema({ timestamps: true })
export class NotificationDelivery {
  @Prop({ type: Types.ObjectId })
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Notification', required: true })
  notificationId: Types.ObjectId;

  @Prop({ type: Number })
  recipientsCount: number;

  @Prop({ type: [Types.ObjectId], ref: 'EmployeeProfile' })
  recipientIds: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile' })
  deliveredBy?: Types.ObjectId; // system or employee who triggered

  @Prop({ type: String })
  channel?: string; // e.g., EMAIL, IN_APP
}

export const NotificationDeliverySchema = SchemaFactory.createForClass(NotificationDelivery);
