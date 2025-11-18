import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type CandidateSource =
  | 'CareersPage'
  | 'Referral'
  | 'Agency'
  | 'LinkedIn'
  | 'JobBoard'
  | 'Internal';

export type TalentStatus =
  | 'Active'
  | 'DoNotContact'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn';

@Schema({ _id: false })
class CandidateDocumentRef {
  @Prop({ required: true }) key!: string;    // storage key
  @Prop({ required: true }) name!: string;   // "CV.pdf"
  @Prop() contentType?: string;
  @Prop() uploadedAt?: Date;
}

@Schema({ timestamps: true })
export class Candidate {
  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email!: string;

  @Prop()
  phone?: string;

  @Prop({ default: 'CareersPage', enum: ['CareersPage', 'Referral', 'Agency', 'LinkedIn', 'JobBoard', 'Internal'] })
  source!: CandidateSource;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  referralEmployeeId?: Types.ObjectId; // REC-030

  @Prop({ type: [CandidateDocumentRef], default: [] })
  documents!: CandidateDocumentRef[]; // includes CV

  @Prop({ default: false })
  consentForProcessing!: boolean; // REC-028

  @Prop()
  consentGivenAt?: Date;

  @Prop({ default: 'Active', enum: ['Active', 'DoNotContact', 'Hired', 'Rejected', 'Withdrawn'] })
  talentStatus!: TalentStatus;

  @Prop({ type: [String], default: [] })
  tags!: string[]; // "Senior", "Java", "High Potential"
}

export type CandidateDocument = HydratedDocument<Candidate>;
export const CandidateSchema = SchemaFactory.createForClass(Candidate);