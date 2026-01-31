import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SubmitCompletionDto } from './submit-completion.dto';
import { SignedTransactionPayloadDto } from './signed-action.dto';

export class SubmitCompletionSignedDto extends SubmitCompletionDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SignedTransactionPayloadDto)
  payload?: SignedTransactionPayloadDto;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  actorKeyId?: string;
}
