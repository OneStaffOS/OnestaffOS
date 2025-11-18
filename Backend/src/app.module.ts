import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import 'dotenv/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { EmployeeModule } from './employee/employee.module';
import { OrgModule } from './org/org.module';
import { PerformanceModule } from './performance/performance.module';
import { AuthModule } from './auth/auth.module';
import { TimeManagementModule } from './time-management/time-management.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { LeavesModule } from './leaves/leaves.module';
import { PayrollConfigModule } from './payroll-config/payroll-config.module';
import { PayrollExecutionModule } from './payroll-execution/payroll-execution.module';
import { PayrollTrackingModule } from './payroll-tracking/payroll-tracking.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI as string),
    EmployeeModule,
    OrgModule,
    PerformanceModule,
    AuthModule,
    TimeManagementModule,
    RecruitmentModule,
    LeavesModule,
    PayrollConfigModule,
    PayrollExecutionModule,
    PayrollTrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}