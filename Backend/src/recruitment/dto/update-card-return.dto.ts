import { IsBoolean } from 'class-validator';

export class UpdateCardReturnDto {
  @IsBoolean()
  returned: boolean;
}