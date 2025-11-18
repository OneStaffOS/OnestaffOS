import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceService } from './performance.service';

import {
  AppraisalTemplate,
  AppraisalTemplateSchema,
} from './models/appraisal-template.schema';
import {
  AppraisalCycle,
  AppraisalCycleSchema,
} from './models/appraisal-cycle.schema';
import {
  PerformanceReview,
  PerformanceReviewSchema,
} from './models/performance-review.schema';
import {
  ReviewDispute,
  ReviewDisputeSchema,
} from './models/review-dispute.schema';
import { Employee, EmployeeSchema } from '../employee/models/employee.schema';
import { PerformanceController } from './performance.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AppraisalTemplate.name, schema: AppraisalTemplateSchema },
      { name: AppraisalCycle.name, schema: AppraisalCycleSchema },
      { name: PerformanceReview.name, schema: PerformanceReviewSchema },
      { name: ReviewDispute.name, schema: ReviewDisputeSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}