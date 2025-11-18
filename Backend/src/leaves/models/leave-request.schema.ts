import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type LeaveRequestStatus =
  | 'Draft'
  | 'Submitted'
  | 'ManagerApproved'
  | 'ManagerRejected'
  | 'HRApproved'
  | 'HRRejected'
  | 'Cancelled'
  | 'Completed';

export type LeaveRequestOrigin = 'PreLeave' | 'PostLeave';

@Schema({ _id: false })
class LeaveAttachment {
  @Prop({ required: true }) key!: string;      // storage key
  @Prop({ required: true }) name!: string;     // filename
  @Prop() contentType?: string;
  @Prop() uploadedAt?: Date;
}

@Schema({ _id: false })
class ApprovalStep {
  @Prop({ required: true }) role!: string;     // "Manager", "HR"
  @Prop() approverId?: string;                // user id / email
  @Prop() decision?: 'Approved' | 'Rejected';
  @Prop() comment?: string;
  @Prop() decidedAt?: Date;
}

@Schema({ timestamps: true })
export class LeaveRequest {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId!: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId!: Types.ObjectId;

  @Prop()
  leaveTypeCode?: string; // denormalized for reporting

  @Prop({ required: true })
  startDate!: Date;

  @Prop({ required: true })
  endDate!: Date;

  /** Net working days requested (exact + rounded) */
  @Prop()
  daysRequestedExact?: number;

  @Prop()
  daysRequestedRounded?: number;

  /** Whether this was submitted after the leave (REQ-031) */
  @Prop({ default: 'PreLeave', enum: ['PreLeave', 'PostLeave'] })
  origin!: LeaveRequestOrigin;

  @Prop()
  reason?: string;

  @Prop({ type: [LeaveAttachment], default: [] })
  attachments!: LeaveAttachment[];

  /** Status lifecycle (Draft → Submitted → ManagerApproved → HRApproved…) */
  @Prop({
    default: 'Draft',
    enum: [
      'Draft',
      'Submitted',
      'ManagerApproved',
      'ManagerRejected',
      'HRApproved',
      'HRRejected',
      'Cancelled',
      'Completed',
    ],
    index: true,
  })
  status!: LeaveRequestStatus;

  /** Manager & HR IDs (for fast queries) */
  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  managerId?: Types.ObjectId;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Employee' })
  hrOwnerId?: Types.ObjectId;

  /** Full approval chain (manager → HR → others) */
  @Prop({ type: [ApprovalStep], default: [] })
  approvals!: ApprovalStep[];

  /** Timestamps for audit */
  @Prop()
  submittedAt?: Date;

  @Prop()
  managerDecidedAt?: Date;

  @Prop()
  hrDecidedAt?: Date;

  @Prop()
  finalizedAt?: Date;

  /** When cancelled / modified by employee before finalization */
  @Prop()
  cancelledAt?: Date;

  /** If HR overrides manager decision (REQ-026) */
  @Prop({ default: false })
  hrOverride!: boolean;

  @Prop()
  hrOverrideReason?: string;

  /** Flags from validation engine (BR 28, 29, 31) */
  @Prop({ default: false })
  exceedsEntitlement!: boolean;

  @Prop({ default: false })
  convertedExcessToUnpaid!: boolean;

  @Prop()
  unpaidPortionDays?: number;

  @Prop({ default: false })
  hasTeamConflict!: boolean; // overlapping critical team members

  @Prop({ default: false })
  overlapsOtherLeaves!: boolean;

  /** Integration flags */
  @Prop({ default: false })
  syncedToTimeManagement!: boolean;

  @Prop({ default: false })
  syncedToPayroll!: boolean;

  @Prop()
  syncReference?: string; // external integration id
}

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;
export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);