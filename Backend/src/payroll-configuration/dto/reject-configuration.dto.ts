import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RejectConfigurationDto {
    @IsMongoId()
    @IsNotEmpty()
    configurationId: string;

    @IsString()
    @IsNotEmpty()
    rejectionReason: string;
}
