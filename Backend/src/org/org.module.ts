import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrgController } from './org.controller';
import { OrgService } from './org.service';
import { OrgController } from './org.controller';

import { Department, DepartmentSchema } from './models/department.schema';
import { Position, PositionSchema } from './models/position.schema';
import {
  PositionChangeRequest,
  PositionChangeRequestSchema,
} from './models/position-change-request.schema';

import {
  Employee,
  EmployeeSchema,
} from '../employee/models/employee.schema';
import { OrgService } from './org.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Department.name, schema: DepartmentSchema },
      { name: Position.name, schema: PositionSchema },
      { name: PositionChangeRequest.name, schema: PositionChangeRequestSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [OrgController],
  providers: [OrgService],
  exports: [OrgService],
})
export class OrgModule {}