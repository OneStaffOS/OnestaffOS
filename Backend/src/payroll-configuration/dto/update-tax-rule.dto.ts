import { IsString, IsNumber, Min, Max, IsOptional } from 'class-validator';

export class UpdateTaxRuleDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    rate?: number;
}
