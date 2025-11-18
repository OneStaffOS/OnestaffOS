import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { LeavesService } from './leaves.service';
import { LeavesController } from './leaves.controller';

import {
  LeaveType,
  LeaveTypeSchema,
} from './models/leave-type.schema';
import {
  LeavePolicy,
  LeavePolicySchema,
} from './models/leave-policy.schema';
import {
  LeavePackage,
  LeavePackageSchema,
} from './models/leave-package.schema';
import {
  LeaveBalance,
  LeaveBalanceSchema,
} from './models/leave-balance.schema';
import {
  LeaveHoliday,
  LeaveHolidaySchema,
} from './models/leave-holiday.schema';
import {
  LeaveBlockPeriod,
  LeaveBlockPeriodSchema,
} from './models/leave-block-period.schema';
import {
  LeaveRequest,
  LeaveRequestSchema,
} from './models/leave-request.schema';
import {
  LeaveAdjustment,
  LeaveAdjustmentSchema,
} from './models/leave-adjustment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LeaveType.name, schema: LeaveTypeSchema },
      { name: LeavePolicy.name, schema: LeavePolicySchema },
      { name: LeavePackage.name, schema: LeavePackageSchema },
      { name: LeaveBalance.name, schema: LeaveBalanceSchema },
      { name: LeaveHoliday.name, schema: LeaveHolidaySchema },
      { name: LeaveBlockPeriod.name, schema: LeaveBlockPeriodSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema },
      { name: LeaveAdjustment.name, schema: LeaveAdjustmentSchema },
    ]),
  ],
  controllers: [LeavesController],
  providers: [LeavesService],
  exports: [LeavesService],
})
export class LeavesModule {}