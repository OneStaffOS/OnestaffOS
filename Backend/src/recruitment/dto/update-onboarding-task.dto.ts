import { IsEnum, IsOptional, IsMongoId, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { OnboardingTaskStatus } from '../enums/onboarding-task-status.enum';

export class UpdateOnboardingTaskDto {
  @IsMongoId()
  taskId: string;

  @IsOptional()
  @IsEnum(OnboardingTaskStatus)
  status?: OnboardingTaskStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  completedAt?: Date;

  @IsOptional()
  documentId?: string;

  @IsOptional()
  notes?: string;
}
