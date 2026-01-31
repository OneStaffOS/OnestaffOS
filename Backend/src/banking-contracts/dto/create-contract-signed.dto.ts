import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateContractDto } from './create-contract.dto';
import { SignedActionDto, SignedTransactionPayloadDto } from './signed-action.dto';

export class CreateContractSignedDto extends CreateContractDto implements SignedActionDto {
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
