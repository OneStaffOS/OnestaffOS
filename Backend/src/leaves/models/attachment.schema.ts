import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttachmentDocument = HydratedDocument<Attachment>;

@Schema({ timestamps: true })
export class Attachment {
  @Prop({ required: true })
  originalName: string;

  @Prop()
  filePath?: string;

  @Prop()
  fileType?: string;

  @Prop()
  size?: number;

  // GridFS file ID reference
  @Prop({ type: Types.ObjectId })
  gridFsFileId?: Types.ObjectId;
}

export const AttachmentSchema = SchemaFactory.createForClass(Attachment);
