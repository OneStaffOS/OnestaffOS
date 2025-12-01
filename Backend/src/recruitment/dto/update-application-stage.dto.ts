import { IsEnum } from 'class-validator';
import { ApplicationStage } from '../enums/application-stage.enum';
import { ApplicationStatus } from '../enums/application-status.enum';

export class UpdateApplicationStageDto {
  @IsEnum(ApplicationStage)
  currentStage: ApplicationStage;

  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
