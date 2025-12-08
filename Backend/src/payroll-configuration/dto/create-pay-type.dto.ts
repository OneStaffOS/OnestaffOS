import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreatePayTypeDto {
    @IsString()
    @IsNotEmpty()
    type: string; // e.g., "Monthly", "Hourly", "Daily"

    @IsNumber()
    @Min(6000)
    amount: number;
}
