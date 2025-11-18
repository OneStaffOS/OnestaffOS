import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MSchema, Types } from 'mongoose';

export type DeptStatus = 'Active' | 'Inactive';

@Schema({ _id: false })
class DeptAudit {
  @Prop() createdBy?: string;
  @Prop() updatedBy?: string;
}

@Schema({ timestamps: true })
export class Department {
  @Prop({ required: true, unique: true })
  code!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ type: MSchema.Types.ObjectId, ref: 'Department', default: null })
  parentDeptId!: Types.ObjectId | null;

  @Prop({ default: 'Active', enum: ['Active', 'Inactive'] })
  status!: DeptStatus;

  @Prop()
  description?: string;

  @Prop({ default: () => new Date() })
  effectiveFrom!: Date;

  @Prop()
  effectiveTo?: Date;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop({ type: DeptAudit })
  audit?: DeptAudit;
}

export type DepartmentDocument = HydratedDocument<Department>;
export const DepartmentSchema = SchemaFactory.createForClass(Department);