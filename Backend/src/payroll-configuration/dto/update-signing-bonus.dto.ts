import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateSigningBonusDto {
    @IsString()
    @IsOptional()
    positionName?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    amount?: number;
}
