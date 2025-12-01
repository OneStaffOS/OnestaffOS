import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdjustmentAudit, AdjustmentAuditSchema } from './models/adjustment-audit.schema';
import { NotificationDelivery, NotificationDeliverySchema } from './models/notification-delivery.schema';
import { AuditService } from './audit.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdjustmentAudit.name, schema: AdjustmentAuditSchema },
      { name: NotificationDelivery.name, schema: NotificationDeliverySchema },
    ]),
  ],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
