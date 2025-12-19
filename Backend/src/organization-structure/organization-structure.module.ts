import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { OrganizationStructureController } from './organization-structure.controller';
import { OrganizationStructureService } from './organization-structure.service';
import { Department, DepartmentSchema } from './models/department.schema';
import { Position, PositionSchema } from './models/position.schema';
import {
  PositionAssignment,
  PositionAssignmentSchema,
} from './models/position-assignment.schema';
import {
  StructureApproval,
  StructureApprovalSchema,
} from './models/structure-approval.schema';
import {
  StructureChangeLog,
  StructureChangeLogSchema,
} from './models/structure-change-log.schema';
import {
  StructureChangeRequest,
  StructureChangeRequestSchema,
} from './models/structure-change-request.schema';
import { EmployeeProfile, EmployeeProfileSchema } from '../employee-profile/models/employee-profile.schema';
import { NotificationModule } from '../notifications/notification.module';
import { models, Model } from 'mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: PositionAssignment.name, schema: PositionAssignmentSchema },
      { name: StructureApproval.name, schema: StructureApprovalSchema },
      { name: StructureChangeLog.name, schema: StructureChangeLogSchema },
      {
        name: StructureChangeRequest.name,
        schema: StructureChangeRequestSchema,
      },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    forwardRef(() => NotificationModule),
  ],
  controllers: [OrganizationStructureController],
  providers: [OrganizationStructureService],
  exports: [OrganizationStructureService],
})
export class OrganizationStructureModule {
  constructor(
    @InjectModel(Department.name) private readonly departmentModel: Model<Department>,
  ) {
    // Fix for MissingSchemaError in PositionSchema pre-save hook
    // The hook uses global mongoose.model() which requires the model to be registered globally.
    // We assign the NestJS-managed model (which is connected) to the global mongoose.models.
    models[Department.name] = departmentModel;
  }
}
