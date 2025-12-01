import { IsString, IsNumber, Min, IsOptional } from 'class-validator';

export class UpdateTerminationBenefitsDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @Min(0)
    @IsOptional()
    amount?: number;
}
