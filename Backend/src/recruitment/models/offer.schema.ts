import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type OfferStatus =
  | 'Draft'
  | 'PendingApproval'
  | 'Approved'
  | 'Sent'
  | 'Accepted'
  | 'Rejected'
  | 'Withdrawn'
  | 'Expired';

@Schema({ timestamps: true })
export class Offer {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'CandidateApplication', required: true })
  applicationId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Candidate', required: true })
  candidateId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'JobRequisition', required: true })
  requisitionId!: Types.ObjectId;

  @Prop()
  positionTitle?: string;

  @Prop()
  payGrade?: string;

  @Prop()
  baseSalary?: number;

  @Prop()
  currency?: string; // "EGP", "USD"

  @Prop()
  benefitsSummary?: string;

  @Prop()
  startDate?: Date;

  @Prop()
  expiryDate?: Date;

  @Prop({
    default: 'Draft',
    enum: [
      'Draft',
      'PendingApproval',
      'Approved',
      'Sent',
      'Accepted',
      'Rejected',
      'Withdrawn',
      'Expired',
    ],
  })
  status!: OfferStatus;

  @Prop()
  approvalWorkflowRef?: string; // id of approval workflow instance

  @Prop()
  offerDocumentKey?: string; // PDF offer letter

  @Prop()
  signedDocumentKey?: string;

  @Prop()
  signedAt?: Date;

  @Prop({ default: false })
  onboardingTriggered!: boolean; // REC-029

  @Prop()
  onboardingChecklistId?: Types.ObjectId; // link to ONB checklist when created
}

export type OfferDocument = HydratedDocument<Offer>;
export const OfferSchema = SchemaFactory.createForClass(Offer);