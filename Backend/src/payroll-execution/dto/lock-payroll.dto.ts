import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LockPayrollDto {
    @IsMongoId()
    @IsNotEmpty()
    payrollRunId: string;

    @IsString()
    @IsOptional()
    comment?: string;
}
