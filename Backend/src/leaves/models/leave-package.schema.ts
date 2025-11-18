import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

@Schema({ _id: false })
class LeavePackageEntitlement {
  @Prop({ type: MSchema.Types.ObjectId, ref: 'LeaveType', required: true })
  leaveTypeId!: Types.ObjectId;

  /** Entitled days per year for this type in this package */
  @Prop({ required: true })
  daysPerYear!: number;

  /** Optional carry-over cap override for this package/type */
  @Prop()
  carryOverCapDays?: number;
}

@Schema({ timestamps: true })
export class LeavePackage {
  @Prop({ required: true, unique: true, uppercase: true })
  code!: string; // e.g. "VAC_EGY", "VAC_EXPAT"

  @Prop({ required: true })
  name!: string; // "Egyptians Vacation Package"

  @Prop()
  description?: string;

  @Prop()
  countryCode?: string; // e.g. "EG", "DE"

  @Prop({ default: false })
  isDefault!: boolean;

  /** Entitlements by leave type inside this package */
  @Prop({ type: [LeavePackageEntitlement], default: [] })
  entitlements!: LeavePackageEntitlement[];

  @Prop({ default: true })
  isActive!: boolean;
}

export type LeavePackageDocument = HydratedDocument<LeavePackage>;
export const LeavePackageSchema = SchemaFactory.createForClass(LeavePackage);