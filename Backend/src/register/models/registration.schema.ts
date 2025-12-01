import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RegistrationDocument = HydratedDocument<Registration>;

@Schema({ timestamps: true })
export class Registration {
  @Prop({ required: true })
  firstName: string;

  @Prop()
  lastName?: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  password?: string; // hashed password

  @Prop({ type: Types.ObjectId })
  linkedEmployeeId?: Types.ObjectId;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);
