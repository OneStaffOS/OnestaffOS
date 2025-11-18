import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type EmploymentType = 'FullTime' | 'PartTime' | 'Intern' | 'Contract';
export type Gender = 'Male' | 'Female' | 'Other';
export type MaritalStatus = 'Single' | 'Married' | 'Divorced' | 'Widowed';
export type EmployeeStatus = 'Active' | 'OnLeave' | 'Suspended' | 'Terminated';

@Schema({ _id: false })
class Address {
  @Prop() line1?: string;
  @Prop() line2?: string;
  @Prop() city?: string;
  @Prop() state?: string;
  @Prop() country?: string;
  @Prop() postalCode?: string;
}

@Schema({ _id: false })
class ContactInfo {
  @Prop() phone?: string;
  @Prop() workPhone?: string;
  @Prop() personalEmail?: string;
}

@Schema({ _id: false })
class BankInfo {
  @Prop() bankName?: string;
  @Prop() accountName?: string;
  @Prop() accountNumber?: string;
  @Prop() iban?: string;
}

@Schema({ _id: false })
class Employment {
  @Prop({ required: true, enum: ['FullTime','PartTime','Intern','Contract'] })
  type!: EmploymentType;

  @Prop({ required: true }) hireDate!: Date;
  @Prop() probationEndDate?: Date;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department' }) deptId?: Types.ObjectId;
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Position' }) positionId?: Types.ObjectId;
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' }) managerId?: Types.ObjectId;

  @Prop() payGradeCode?: string;

  @Prop({ default: 'Active', enum: ['Active','OnLeave','Suspended','Terminated'] })
  status!: EmployeeStatus;

  @Prop() terminationDate?: Date;
  @Prop() terminationReason?: string;
}

@Schema({ _id: false })
class DocumentRef {
  @Prop({ required: true }) key!: string;
  @Prop({ required: true }) name!: string;
  @Prop() contentType?: string;
  @Prop() uploadedAt?: Date;
}

@Schema({ _id: false })
class Audit {
  @Prop() createdBy?: string;
  @Prop() updatedBy?: string;
}

/** 🔹 New: summarized appraisal history stored on profile (BR 6) */
@Schema({ _id: false })
class AppraisalSummary {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'PerformanceReview', required: true })
  reviewId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'AppraisalCycle' })
  cycleId?: Types.ObjectId;

  @Prop() cycleTitle?: string;
  @Prop() templateName?: string;
  @Prop() ratingScale?: string;          // e.g. "FivePoint"
  @Prop() score?: number;                // final overall score
  @Prop() date?: Date;                   // published/finalized date
}

@Schema({ timestamps: true })
export class Employee {
  @Prop({ required: true }) firstName!: string;
  @Prop({ required: true }) lastName!: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email!: string;

  @Prop({ enum: ['Male','Female','Other'] }) gender?: Gender;
  @Prop() dateOfBirth?: Date;
  @Prop({ enum: ['Single','Married','Divorced','Widowed'] }) maritalStatus?: MaritalStatus;
  @Prop() nationalId?: string;

  @Prop({ type: Address }) address?: Address;
  @Prop({ type: ContactInfo }) contact?: ContactInfo;

  @Prop({ type: Employment, required: true })
  employment!: Employment;

  @Prop({ type: BankInfo }) bank?: BankInfo;

  @Prop({ type: [DocumentRef], default: [] })
  documents?: DocumentRef[];

  /** Optional: hashed login password */
  @Prop({ select: false })
  passwordHash?: string;

  /** 🔹 New: appraisals history from Performance module */
  @Prop({ type: [AppraisalSummary], default: [] })
  appraisals?: AppraisalSummary[];

  @Prop({ type: [String], default: [] })
  roles!: string[];

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ type: Audit })
  audit?: Audit;
}

export type EmployeeDocument = HydratedDocument<Employee>;
export const EmployeeSchema = SchemaFactory.createForClass(Employee);