import { Module, forwardRef } from '@nestjs/common';
import { LeavesController } from './leaves.controller';
import { LeavesService } from './leaves.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { LeaveType, LeaveTypeSchema } from './models/leave-type.schema';
import { LeaveRequest, LeaveRequestSchema } from './models/leave-request.schema';
import { LeavePolicy, LeavePolicySchema } from './models/leave-policy.schema';
import { LeaveEntitlement, LeaveEntitlementSchema } from './models/leave-entitlement.schema';
import { LeaveCategory, LeaveCategorySchema } from './models/leave-category.schema';
import { LeaveAdjustment, LeaveAdjustmentSchema } from './models/leave-adjustment.schema';
import { Calendar, CalendarSchema} from './models/calendar.schema';
import { Attachment,AttachmentSchema } from './models/attachment.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import { TimeManagementModule } from '../time-management/time-management.module';
import { NotificationModule } from '../notifications/notification.module';
import { LeaveGridFSService } from './leave-gridfs.service';

@Module({
  imports:[
    MongooseModule.forFeature([
      {name:LeaveType.name,schema:LeaveTypeSchema},
      {name:LeaveRequest.name, schema: LeaveRequestSchema},
      {name:LeavePolicy.name, schema:LeavePolicySchema},
      {name:LeaveEntitlement.name, schema:LeaveEntitlementSchema},
      {name: LeaveCategory.name, schema:LeaveCategorySchema},
      {name: LeaveAdjustment.name, schema:LeaveAdjustmentSchema},
      {name:Calendar.name, schema:CalendarSchema},
      {name:Attachment.name, schema: AttachmentSchema}
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    EmployeeProfileModule,
    TimeManagementModule,
    forwardRef(() => NotificationModule),
  ],
  controllers: [LeavesController],
  providers: [LeavesService, LeaveGridFSService],
  exports:[LeavesService]
})
export class LeavesModule {}
