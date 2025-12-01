import { IsBoolean } from 'class-validator';

export class TagReferralDto {
  @IsBoolean()
  referral: boolean;
}