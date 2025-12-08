import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';

export class CreateTerminationBenefitsDto {
    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Severance Pay", "Notice Period Pay"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsOptional()
    terms?: string; // Optional terms and conditions
}
