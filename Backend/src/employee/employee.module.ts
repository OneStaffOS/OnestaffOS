import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployeeController } from './employee.controller';
import { EmployeeService } from './employee.service';
import { EmployeeService } from './employee.service';
import { Employee, EmployeeSchema } from './models/employee.schema';
import { EmployeeChangeRequest, EmployeeChangeRequestSchema } from './models/employee-change-request.schema';
import { EmployeeController } from './employee.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeChangeRequest.name, schema: EmployeeChangeRequestSchema },
    ]),
  ],
  controllers: [EmployeeController],
  providers: [EmployeeService],
  exports: [MongooseModule, EmployeeService],
})
export class EmployeeModule {}