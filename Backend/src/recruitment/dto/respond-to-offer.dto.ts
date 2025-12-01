import { IsEnum } from 'class-validator';
import { OfferResponseStatus } from '../enums/offer-response-status.enum';

export class RespondToOfferDto {
  @IsEnum(OfferResponseStatus)
  applicantResponse: OfferResponseStatus;
}
