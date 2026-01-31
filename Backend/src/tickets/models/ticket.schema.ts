import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  TicketType,
  TicketPriority,
  TicketStatus,
  AgentType,
  SoftwareSubCategory,
  HardwareSubCategory,
  NetworkSubCategory,
} from '../enums/ticket.enums';

export type TicketDocument = HydratedDocument<Ticket>;

@Schema({ collection: 'tickets', timestamps: true })
export class Ticket {
  _id: Types.ObjectId;

  @Prop({ unique: true })
  ticketNumber: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'EmployeeProfile',
    required: true,
    index: true,
  })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    type: String,
    enum: Object.values(TicketType),
    required: true,
    index: true,
  })
  type: TicketType;

  @Prop({ type: String })
  subCategory: string;

  @Prop({
    type: String,
    enum: Object.values(TicketPriority),
    required: true,
    default: TicketPriority.MEDIUM,
    index: true,
  })
  priority: TicketPriority;

  @Prop({
    type: String,
    enum: Object.values(TicketStatus),
    default: TicketStatus.OPEN,
    index: true,
  })
  status: TicketStatus;

  @Prop({
    type: String,
    enum: Object.values(AgentType),
  })
  assignedAgent: AgentType;

  @Prop({
    type: Types.ObjectId,
    ref: 'EmployeeProfile',
  })
  assignedTo: Types.ObjectId;

  @Prop({ type: String })
  resolution: string;

  @Prop({ type: Date })
  resolvedAt: Date;

  @Prop({ type: Date })
  closedAt: Date;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: Object })
  customWorkflow: {
    steps: Array<{
      order: number;
      title: string;
      description: string;
      completed: boolean;
      completedAt?: Date;
    }>;
  };

  @Prop({ type: [Object], default: [] })
  comments: Array<{
    userId: Types.ObjectId;
    userName: string;
    comment: string;
    createdAt: Date;
  }>;

  @Prop({ type: [Object], default: [] })
  statusHistory: Array<{
    status: TicketStatus;
    changedBy: Types.ObjectId;
    changedAt: Date;
    note: string;
  }>;

  @Prop({ type: Object })
  mlAssignment: {
    agentId: string;
    agentName: string;
    confidence: number;
    assignedAt: Date;
    model: string;
  };
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

// Auto-generate ticket number before save
TicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.ticketNumber = `TKT-${year}${month}-${random}`;
  }
  next();
});

// Index for efficient querying
TicketSchema.index({ employeeId: 1, createdAt: -1 });
TicketSchema.index({ status: 1, priority: -1, createdAt: -1 });
TicketSchema.index({ assignedTo: 1, status: 1 });
TicketSchema.index({ ticketNumber: 1 });
