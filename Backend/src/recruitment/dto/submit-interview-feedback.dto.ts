import { IsMongoId, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

export class SubmitInterviewFeedbackDto {
  @IsMongoId()
  interviewId: string;

  @IsMongoId()
  interviewerId: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  score: number;

  @IsString()
  @IsOptional()
  comments?: string;
}
