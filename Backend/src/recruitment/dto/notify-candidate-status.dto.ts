import { IsString } from 'class-validator';

export class NotifyCandidateStatusDto {
  @IsString()
  message: string;
}