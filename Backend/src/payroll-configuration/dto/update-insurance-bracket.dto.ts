import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateInsuranceBracketDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    amount?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    minSalary?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    maxSalary?: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    employeeRate?: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    employerRate?: number;
}
