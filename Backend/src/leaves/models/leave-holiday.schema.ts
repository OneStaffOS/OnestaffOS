import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type HolidayType = 'Public' | 'Company';

@Schema({ timestamps: true })
export class LeaveHoliday {
  @Prop({ required: true })
  name!: string; // "Eid El-Fitr", "Company Offsite"

  @Prop({ required: true })
  date!: Date;

  @Prop({
    default: 'Public',
    enum: ['Public', 'Company'],
  })
  type!: HolidayType;

  @Prop()
  countryCode?: string; // "EG"

  @Prop()
  locationCode?: string; // site/branch (optional)

  @Prop({ default: true })
  isWorkingDayExcluded!: boolean; // whether to exclude from leave duration
}

export type LeaveHolidayDocument = HydratedDocument<LeaveHoliday>;
export const LeaveHolidaySchema = SchemaFactory.createForClass(LeaveHoliday);