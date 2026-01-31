import { IsNumber, IsOptional, IsString, IsObject } from 'class-validator';

export class RegisterActorKeyDto {
  @IsString()
  keyId: string;

  @IsString()
  actorRole: string;

  @IsObject()
  publicKeyJwk: Record<string, any>;

  @IsOptional()
  @IsNumber()
  keyVersion?: number;
}
