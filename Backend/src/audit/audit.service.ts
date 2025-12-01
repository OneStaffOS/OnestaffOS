import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AdjustmentAudit, AdjustmentAuditDocument, AdjustmentAuditSchema } from './models/adjustment-audit.schema';
import { NotificationDelivery, NotificationDeliveryDocument } from './models/notification-delivery.schema';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AdjustmentAudit.name) private adjModel: Model<AdjustmentAuditDocument>,
    @InjectModel(NotificationDelivery.name) private ndModel: Model<NotificationDeliveryDocument>,
  ) {}

  async recordAdjustment(payload: {
    disputeId: string;
    appraisalId: string;
    adjustedByEmployeeId: string;
    before: any;
    after: any;
    reason?: string;
  }) {
    try {
      const doc = new this.adjModel({
        _id: new Types.ObjectId(),
        disputeId: new Types.ObjectId(payload.disputeId),
        appraisalId: new Types.ObjectId(payload.appraisalId),
        adjustedByEmployeeId: new Types.ObjectId(payload.adjustedByEmployeeId),
        before: payload.before,
        after: payload.after,
        reason: payload.reason,
      });
      return await doc.save();
    } catch (err) {
      this.logger.error('Failed to record adjustment audit', err?.message || err);
    }
  }

  async recordNotificationDelivery(notificationId: string, recipientIds: string[], deliveredBy?: string) {
    try {
      const doc = new this.ndModel({
        _id: new Types.ObjectId(),
        notificationId: new Types.ObjectId(notificationId),
        recipientsCount: recipientIds.length,
        recipientIds: recipientIds.map(id => new Types.ObjectId(id)),
        deliveredBy: deliveredBy ? new Types.ObjectId(deliveredBy) : undefined,
        channel: 'IN_APP',
      });
      return await doc.save();
    } catch (err) {
      this.logger.error('Failed to record notification delivery', err?.message || err);
    }
  }
}
