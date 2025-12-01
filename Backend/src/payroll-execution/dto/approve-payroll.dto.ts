import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ApprovePayrollDto {
    @IsMongoId()
    @IsNotEmpty()
    payrollRunId: string;

    @IsString()
    @IsOptional()
    comment?: string;
}
