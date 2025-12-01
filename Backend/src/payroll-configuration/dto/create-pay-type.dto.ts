import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePayTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string; // e.g., "Monthly", "Hourly", "Daily"
}
