import { IsString, IsEmail, IsOptional, IsEnum, IsDate, IsNotEmpty, ValidateNested, IsObject, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';
import { Gender, MaritalStatus, ContractType, WorkType, EmployeeStatus } from '../enums/employee-profile.enums';
import { Types } from 'mongoose';

export class AddressDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  streetAddress?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class CreateEmployeeProfileDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsOptional()
  @IsString()
  middleName?: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsString()
  nationalId: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsNotEmpty()
  @IsString()
  employeeNumber: string;

  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  dateOfHire: Date;

  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @IsOptional()
  @IsEmail()
  googleAccountEmail?: string;

  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @IsOptional()
  @IsString()
  mobilePhone?: string;

  @IsOptional()
  @IsString()
  homePhone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractStartDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  contractEndDate?: Date;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @IsOptional()
  @IsMongoId()
  primaryPositionId?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  primaryDepartmentId?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  supervisorPositionId?: Types.ObjectId;

  @IsOptional()
  @IsMongoId()
  payGradeId?: Types.ObjectId;
}
