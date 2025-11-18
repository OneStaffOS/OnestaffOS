import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LeaveBlockPeriod {
  @Prop({ required: true, unique: true })
  code!: string; // "YEAR_END_FREEZE_2025"

  @Prop({ required: true })
  name!: string; // "Year-end Closing Block"

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  @Prop()
  reason?: string;

  /** Restrict to specific leave types if needed */
  @Prop({ type: [MSchema.Types.ObjectId], ref: 'LeaveType', default: [] })
  leaveTypeIds!: Types.ObjectId[];

  /** Optional scope to departments / positions */
  @Prop({ type: [MSchema.Types.ObjectId], ref: 'Department', default: [] })
  deptIds!: Types.ObjectId[];

  @Prop({ type: [MSchema.Types.ObjectId], ref: 'Position', default: [] })
  positionIds!: Types.ObjectId[];

  @Prop({ default: true })
  isActive!: boolean;
}

export type LeaveBlockPeriodDocument = HydratedDocument<LeaveBlockPeriod>;
export const LeaveBlockPeriodSchema =
  SchemaFactory.createForClass(LeaveBlockPeriod);