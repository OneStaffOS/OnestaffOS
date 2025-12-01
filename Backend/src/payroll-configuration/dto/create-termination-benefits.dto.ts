import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateTerminationBenefitsDto {
    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Severance Pay", "Notice Period Pay"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount: number;
}
