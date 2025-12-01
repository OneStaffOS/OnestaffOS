import { IsMongoId, IsNotEmpty } from 'class-validator';

export class ApproveConfigurationDto {
    @IsMongoId()
    @IsNotEmpty()
    configurationId: string;
}
