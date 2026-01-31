import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { EncryptedData } from '../../common/encryption/encryption.service';

export type FaceTemplateDocument = HydratedDocument<FaceTemplate>;

@Schema({ timestamps: true, collection: 'face_templates' })
export class FaceTemplate {
  @Prop({ type: Types.ObjectId, ref: 'EmployeeProfile', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: [Object], default: [] })
  embeddings: EncryptedData[];

  @Prop({ type: Object })
  centroid?: EncryptedData;

  @Prop({ type: Number, default: 0 })
  embeddingCount: number;

  @Prop({ type: Number, default: 512 })
  embeddingDim: number;

  @Prop({ type: String, default: 'arcface' })
  modelName: string;

  @Prop({ type: String, default: 'insightface-v1' })
  modelVersion: string;

  @Prop({ type: Number })
  lastConfidence?: number;
}

export const FaceTemplateSchema = SchemaFactory.createForClass(FaceTemplate);
