import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UploadAttachmentDto {
  @IsString()
  originalName: string;

  @IsString()
  filePath: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  @IsNumber()
  size?: number;
}
