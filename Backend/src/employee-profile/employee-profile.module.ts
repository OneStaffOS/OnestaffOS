import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { EmployeeProfileController } from './employee-profile.controller';
import { EmployeeProfileService } from './employee-profile.service';
import { Candidate, CandidateSchema } from './models/candidate.schema';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from './models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from './models/employee-system-role.schema';
import {
  EmployeeProfileChangeRequest,
  EmployeeProfileChangeRequestSchema,
} from './models/ep-change-request.schema';
import {
  EmployeeQualification,
  EmployeeQualificationSchema,
} from './models/qualification.schema';
import {
  PositionAssignment,
  PositionAssignmentSchema,
} from '../organization-structure/models/position-assignment.schema';
import {
  Position,
  PositionSchema,
} from '../organization-structure/models/position.schema';
import {
  Department,
  DepartmentSchema,
} from '../organization-structure/models/department.schema';
import { AppraisalAssignment, AppraisalAssignmentSchema } from '../performance/models/appraisal-assignment.schema';
import { AppraisalRecord, AppraisalRecordSchema } from '../performance/models/appraisal-record.schema';
import { AppraisalDispute, AppraisalDisputeSchema } from '../performance/models/appraisal-dispute.schema';
import { NotificationModule } from '../notifications/notification.module';
import { ShiftAssignment, ShiftAssignmentSchema } from '../time-management/models/shift-assignment.schema';
import { payGrade, payGradeSchema } from '../payroll-configuration/models/payGrades.schema';
import { employeePayrollDetails, employeePayrollDetailsSchema } from '../payroll-execution/models/employeePayrollDetails.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
      {
        name: EmployeeProfileChangeRequest.name,
        schema: EmployeeProfileChangeRequestSchema,
      },
      { name: EmployeeQualification.name, schema: EmployeeQualificationSchema },
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: Department.name, schema: DepartmentSchema },
      { name: AppraisalAssignment.name, schema: AppraisalAssignmentSchema },
      { name: AppraisalRecord.name, schema: AppraisalRecordSchema },
      { name: AppraisalDispute.name, schema: AppraisalDisputeSchema },
      { name: ShiftAssignment.name, schema: ShiftAssignmentSchema },
      { name: payGrade.name, schema: payGradeSchema },
      { name: employeePayrollDetails.name, schema: employeePayrollDetailsSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => NotificationModule),
  ],
  controllers: [EmployeeProfileController],
  providers: [EmployeeProfileService],
  exports: [EmployeeProfileService],
})
export class EmployeeProfileModule {}
