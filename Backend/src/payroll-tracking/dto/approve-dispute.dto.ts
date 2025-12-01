import { IsMongoId, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ApproveDisputeDto {
    @IsMongoId()
    @IsNotEmpty()
    disputeId: string;

    @IsString()
    @IsOptional()
    resolutionComment?: string;
}
