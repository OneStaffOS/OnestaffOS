import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { TimeAudit, TimeAuditSchema } from './time-audit.schema';

export type HolidayType = 'National' | 'Organizational' | 'WeeklyRest';

@Schema({ timestamps: true })
export class HolidayCalendarEntry {
  @Prop({ required: true })
  date!: Date;

  @Prop({
    required: true,
    enum: ['National', 'Organizational', 'WeeklyRest'],
  })
  type!: HolidayType;

  @Prop({ required: true })
  name!: string; // "Eid", "Company Foundation Day", "Friday Rest Day"

  @Prop()
  country?: string;

  /** Optional: restrict to specific departments if needed */
  @Prop({ type: [String], default: [] })
  deptCodes?: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ type: TimeAuditSchema })
  audit?: TimeAudit;
}

export type HolidayCalendarEntryDocument =
HydratedDocument<HolidayCalendarEntry>;
export const HolidayCalendarEntrySchema =
  SchemaFactory.createForClass(HolidayCalendarEntry);