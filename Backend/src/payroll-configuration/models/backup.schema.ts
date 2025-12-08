import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BackupDocument = Backup & Document;

@Schema({ timestamps: true })
export class Backup {
    @Prop({ required: true })
    fileName: string;

    @Prop({ required: true })
    fileSize: number;

    @Prop({ required: true })
    filePath: string;

    @Prop({ required: true, enum: ['completed', 'in_progress', 'failed'], default: 'in_progress' })
    status: 'completed' | 'in_progress' | 'failed';

    @Prop({ required: true, enum: ['manual', 'scheduled'], default: 'manual' })
    type: 'manual' | 'scheduled';

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy: Types.ObjectId;

    @Prop()
    errorMessage?: string;

    @Prop()
    restoredAt?: Date;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    restoredBy?: Types.ObjectId;
}

export const BackupSchema = SchemaFactory.createForClass(Backup);
