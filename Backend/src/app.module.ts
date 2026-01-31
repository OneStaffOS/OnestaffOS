import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController, HealthController } from './app.controller';
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
import { PasswordResetModule } from './password-reset/password-reset.module';
import { PasskeysModule } from './passkeys/passkeys.module';
import { TicketsModule } from './tickets/tickets.module';
import { AIChatbotModule } from './chatbot/ai-chatbot.module';
import { EncryptionModule } from './common/encryption';
import { BiometricsModule } from './biometrics/biometrics.module';
import { BankingContractsModule } from './banking-contracts/banking-contracts.module';
import { CsrfGuard } from './common/guards/csrf.guard';
import { SecurityInterceptor } from './common/interceptors/security.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { NoSQLSanitizeMiddleware } from './common/middleware/nosql-sanitize.middleware';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { LoggerService } from './common/logger/logger.service';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/onestaff'),
    EncryptionModule, // Global encryption module
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
    PasswordResetModule,
    PasskeysModule,
    TicketsModule,
    AIChatbotModule,
    BiometricsModule,
    BankingContractsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    LoggerService, // Add centralized logger
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor, // Add HTTP request/error logging
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
    // Apply request ID middleware first for tracing (replaces correlation ID)
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
    
    // Apply NoSQL injection sanitization
    consumer
      .apply(NoSQLSanitizeMiddleware)
      .forRoutes('*');
  }
}
