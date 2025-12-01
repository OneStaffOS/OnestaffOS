import { IsMongoId } from 'class-validator';

export class CreateOnboardingChecklistDto {
  @IsMongoId()
  contractId: string;
}