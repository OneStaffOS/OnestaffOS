import { IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateRefundDto {
    @IsMongoId()
    @IsOptional()
    disputeId?: string;

    @IsMongoId()
    @IsOptional()
    claimId?: string;
}
