import { Module } from '@nestjs/common';
import { RecruitmentController } from './recruitment.controller';
import { RecruitmentService } from './recruitment.service';
import { GridFSService } from './gridfs.service';
import { DeadlineReminderService } from './deadline-reminder.service';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { JobTemplate, JobTemplateSchema } from './models/job-template.schema';
import { JobRequisition,JobRequisitionSchema } from './models/job-requisition.schema';
import { Application,ApplicationSchema } from './models/application.schema';
import { ApplicationStatusHistory,ApplicationStatusHistorySchema } from './models/application-history.schema';
import { Interview,InterviewSchema } from './models/interview.schema';
import { AssessmentResult,AssessmentResultSchema } from './models/assessment-result.schema';
import { Referral,ReferralSchema } from './models/referral.schema';
import { Offer,OfferSchema } from './models/offer.schema';
import { Contract,ContractSchema } from './models/contract.schema';
import { Document,DocumentSchema } from './models/document.schema';
import { TerminationRequest,TerminationRequestSchema } from './models/termination-request.schema';
import { ClearanceChecklist,ClearanceChecklistSchema } from './models/clearance-checklist.schema';
import { Onboarding,OnboardingSchema } from './models/onboarding.schema';
import { EmployeeProfileModule } from '../employee-profile/employee-profile.module';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleSchema } from '../employee-profile/models/employee-system-role.schema';
import { NotificationModule } from '../notifications/notification.module';
import { LeavesModule } from '../leaves/leaves.module';
import { Candidate, CandidateSchema } from '../employee-profile/models/candidate.schema';
import { Department, DepartmentSchema } from '../organization-structure/models/department.schema';
import { Position, PositionSchema } from '../organization-structure/models/position.schema';
import { employeeSigningBonus, employeeSigningBonusSchema } from '../payroll-execution/models/EmployeeSigningBonus.schema';
import { signingBonus, signingBonusSchema } from '../payroll-configuration/models/signingBonus.schema';
import { payGrade, payGradeSchema } from '../payroll-configuration/models/payGrades.schema';
import { taxRules, taxRulesSchema } from '../payroll-configuration/models/taxRules.schema';
import { insuranceBrackets, insuranceBracketsSchema } from '../payroll-configuration/models/insuranceBrackets.schema';

@Module({
  imports:[
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    MongooseModule.forFeature([
      { name: JobTemplate.name, schema: JobTemplateSchema },
      { name: JobRequisition.name, schema: JobRequisitionSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: ApplicationStatusHistory.name, schema: ApplicationStatusHistorySchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: AssessmentResult.name, schema: AssessmentResultSchema },
      { name: Referral.name, schema: ReferralSchema },
      { name: Offer.name, schema: OfferSchema },
      { name: Contract.name, schema: ContractSchema },
      { name: Document.name, schema: DocumentSchema },
      { name: TerminationRequest.name, schema: TerminationRequestSchema },
      { name: ClearanceChecklist.name, schema: ClearanceChecklistSchema },
      { name: Onboarding.name, schema: OnboardingSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      // Register as 'User' alias for backward compatibility with schema refs
      { name: 'User', schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      { name: Candidate.name, schema: CandidateSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: employeeSigningBonus.name, schema: employeeSigningBonusSchema },
      { name: signingBonus.name, schema: signingBonusSchema },
      { name: payGrade.name, schema: payGradeSchema },
      { name: taxRules.name, schema: taxRulesSchema },
      { name: insuranceBrackets.name, schema: insuranceBracketsSchema },
    ]),
    EmployeeProfileModule,
    NotificationModule,
    LeavesModule
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService, GridFSService, DeadlineReminderService],
  exports:[RecruitmentService]

})
export class RecruitmentModule {}
