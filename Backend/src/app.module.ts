import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TimeManagementModule } from './time-management/time-management.module';
import { RecruitmentModule } from './recruitment/recruitment.module';
import { LeavesModule } from './leaves/leaves.module';
import { AuthModule } from './auth/auth.module';
import { PayrollTrackingModule } from './payroll-tracking/payroll-tracking.module';
import { EmployeeProfileModule } from './employee-profile/employee-profile.module';
import { OrganizationStructureModule } from './organization-structure/organization-structure.module';
import { PerformanceModule } from './performance/performance.module';
import { NotificationModule } from './notifications/notification.module';
import { RegisterModule } from './register/register.module';
import { PayrollConfigurationModule } from './payroll-configuration/payroll-configuration.module';
import { PayrollExecutionModule } from './payroll-execution/payroll-execution.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { SecurityInterceptor } from './common/interceptors/security.interceptor';
import { NoSQLSanitizeMiddleware } from './common/middleware/nosql-sanitize.middleware';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/onestaff'),
    AuthModule,
    TimeManagementModule, 
    RecruitmentModule, 
    LeavesModule, 
    PayrollExecutionModule, 
    PayrollConfigurationModule, 
    PayrollTrackingModule, 
    EmployeeProfileModule, 
    OrganizationStructureModule, 
    PerformanceModule,
    RegisterModule,
    NotificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    // SecurityInterceptor disabled - was causing issues with Mongoose object serialization
    // and React key warnings due to improper object-to-plain conversion
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: SecurityInterceptor,
    // },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(NoSQLSanitizeMiddleware)
      .forRoutes('*'); // Apply to all routes
  }
}
