import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class CreateAllowanceDto {
    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Housing Allowance", "Transport Allowance"

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount: number;
}
