import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateSigningBonusDto {
    @IsString()
    @IsNotEmpty()
    positionName: string; // e.g., "Junior TA", "Mid TA", "Senior TA"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount: number;
}
