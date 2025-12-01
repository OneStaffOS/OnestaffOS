import { IsMongoId, IsNotEmpty, IsNumber, Min, IsOptional, IsString } from 'class-validator';

export class ApproveClaimDto {
    @IsMongoId()
    @IsNotEmpty()
    claimId: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    approvedAmount: number;

    @IsString()
    @IsOptional()
    resolutionComment?: string;
}
