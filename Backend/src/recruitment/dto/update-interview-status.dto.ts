import { IsEnum } from 'class-validator';
import { InterviewStatus } from '../enums/interview-status.enum';

export class UpdateInterviewStatusDto {
  @IsEnum(InterviewStatus)
  status: InterviewStatus;
}