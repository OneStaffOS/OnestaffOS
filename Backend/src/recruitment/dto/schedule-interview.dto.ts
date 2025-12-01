import { IsMongoId, IsEnum, IsDate, IsArray, IsString, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStage } from '../enums/application-stage.enum';
import { InterviewMethod } from '../enums/interview-method.enum';

export class ScheduleInterviewDto {
  @IsMongoId()
  applicationId: string;

  @IsEnum(ApplicationStage)
  stage: ApplicationStage;

  @IsDate()
  @Type(() => Date)
  scheduledDate: Date;

  @IsEnum(InterviewMethod)
  @IsOptional()
  method?: InterviewMethod;

  @IsArray()
  @IsMongoId({ each: true })
  panel: string[];

  @IsString()
  @IsOptional()
  videoLink?: string;
}
