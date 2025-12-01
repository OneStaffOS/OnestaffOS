import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RejectClaimDto {
    @IsMongoId()
    @IsNotEmpty()
    claimId: string;

    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
