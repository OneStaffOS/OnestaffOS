import { IsString, IsNotEmpty, IsNumber, Min, Max } from 'class-validator';

export class CreateInsuranceBracketDto {
    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Social Insurance", "Health Insurance"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    minSalary: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    maxSalary: number;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsNotEmpty()
    employeeRate: number; // percentage

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsNotEmpty()
    employerRate: number; // percentage
}
