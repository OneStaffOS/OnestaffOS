import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RejectPayrollDto {
    @IsMongoId()
    @IsNotEmpty()
    payrollRunId: string;

    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
