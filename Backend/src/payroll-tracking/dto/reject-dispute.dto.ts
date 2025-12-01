import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RejectDisputeDto {
    @IsMongoId()
    @IsNotEmpty()
    disputeId: string;

    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
