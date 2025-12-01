import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreatePayrollRunDto {
    @IsString()
    @IsNotEmpty()
    entity: string;

    @IsNotEmpty()
    payrollPeriod: Date;

    @IsArray()
    @IsOptional()
    employees?: string[]; // Array of employee IDs

    @IsString()
    @IsOptional()
    notes?: string;
}
