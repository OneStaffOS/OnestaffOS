import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdatePayGradeDto {
    @IsString()
    @IsOptional()
    grade?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    baseSalary?: number;

    @IsNumber()
    @Min(0)
    @IsOptional()
    grossSalary?: number;
}
