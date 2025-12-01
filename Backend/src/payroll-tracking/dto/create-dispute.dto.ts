import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class CreateDisputeDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsMongoId()
    @IsNotEmpty()
    payslipId: string;
}
