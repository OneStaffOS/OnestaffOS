import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class CreateClaimDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    claimType: string;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    amount: number;
}
