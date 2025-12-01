import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreatePayGradeDto {
    @IsString()
    @IsNotEmpty()
    grade: string; // position name like "Junior TA"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    baseSalary: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    grossSalary: number;
}
