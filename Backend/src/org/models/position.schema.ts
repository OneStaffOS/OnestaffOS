import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type PositionStatus = 'Active' | 'Frozen' | 'Inactive';

@Schema({ _id: false })
class PositionAudit {
  @Prop() createdBy?: string; // user id/email
  @Prop() updatedBy?: string;
}

@Schema({ timestamps: true })
export class Position {
  @Prop({ required: true, unique: true })
  code!: string; // Position ID / Job Key (BR5, BR10)

  @Prop({ required: true })
  title!: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department', required: true })
  deptId!: Types.ObjectId; // BR10

  @Prop({ required: true })
  grade!: string; // Pay Grade (BR10)

  @Prop({ required: true })
  costCenter!: string; // BR30

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position', required: true })
  reportsTo!: Types.ObjectId; // reporting manager position (BR30)

  @Prop({ default: 'Active', enum: ['Active', 'Frozen', 'Inactive'] })
  status!: PositionStatus; // BR16

  @Prop({ default: () => new Date() })
  effectiveFrom!: Date;

  @Prop()
  effectiveTo?: Date; // delimiting end date (BR37)

  @Prop({ default: false })
  isDeleted!: boolean; // soft delete flag

  @Prop()
  description?: string;

  @Prop({ type: PositionAudit })
  audit?: PositionAudit;
}

export type PositionDocument = HydratedDocument<Position>;
export const PositionSchema = SchemaFactory.createForClass(Position);