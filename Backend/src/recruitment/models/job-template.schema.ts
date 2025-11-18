import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type JobTemplateStatus = 'Active' | 'Inactive' | 'Archived';

@Schema({ _id: false })
class JobRequirement {
  @Prop() type?: string; // e.g. "Education", "Experience", "Skill"
  @Prop({ required: true }) text!: string;
}

@Schema({ timestamps: true })
export class JobTemplate {
  @Prop({ required: true, unique: true })
  code!: string; // e.g. "JD-SWE-001"

  @Prop({ required: true })
  title!: string; // "Software Engineer"

  @Prop()
  summary?: string;

  @Prop()
  description?: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' })
  deptId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' })
  positionId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  locations!: string[]; // e.g. ["Cairo", "Remote"]

  @Prop({ type: [JobRequirement], default: [] })
  qualifications!: JobRequirement[]; // BR 2 – qualifications & skills

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ default: 'Active', enum: ['Active', 'Inactive', 'Archived'] })
  status!: JobTemplateStatus;
}

export type JobTemplateDocument = HydratedDocument<JobTemplate>;
export const JobTemplateSchema = SchemaFactory.createForClass(JobTemplate);