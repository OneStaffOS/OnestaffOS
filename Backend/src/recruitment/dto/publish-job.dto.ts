import { IsEnum } from 'class-validator';

export class PublishJobDto {
  @IsEnum(['draft', 'published', 'closed'])
  publishStatus: string;
}
