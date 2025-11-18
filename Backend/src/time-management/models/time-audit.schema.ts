import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/** Simple audit trail for BR-TM-24 (timestamped + who did it). */
@Schema({ _id: false })
export class TimeAudit {
  @Prop() createdBy?: string; // user id / email
  @Prop() updatedBy?: string;
}

export const TimeAuditSchema = SchemaFactory.createForClass(TimeAudit);