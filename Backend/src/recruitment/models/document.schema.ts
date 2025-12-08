import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ObjectId } from 'mongodb';
import { DocumentType } from '../enums/document-type.enum';

@Schema({ timestamps: true })
export class Document {

  @Prop({ type: Types.ObjectId, ref: 'User' })
  ownerId: Types.ObjectId;

  @Prop({
    enum: DocumentType,
    required: true
  })
  type: DocumentType;

  @Prop({ required: true })
  fileName: string;

  // GridFS file ID reference
  @Prop({ required: true, type: Types.ObjectId })
  gridFsFileId: ObjectId;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  fileSize: number;

  @Prop()
  uploadedAt: Date;
}

export type DocumentDocument = HydratedDocument<Document>;
export const DocumentSchema = SchemaFactory.createForClass(Document);