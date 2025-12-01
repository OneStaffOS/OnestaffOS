import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class UnlockPayrollDto {
    @IsMongoId()
    @IsNotEmpty()
    payrollRunId: string;

    @IsString()
    @IsNotEmpty()
    unlockReason: string;
}
