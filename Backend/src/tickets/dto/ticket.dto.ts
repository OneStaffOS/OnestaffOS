import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  TicketType,
  TicketPriority,
  TicketStatus,
  AgentType,
} from '../enums/ticket.enums';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketType)
  @IsNotEmpty()
  type: TicketType;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @IsString()
  @IsOptional()
  subCategory?: string;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsString()
  @IsOptional()
  resolution?: string;

  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  attachments?: string[];
}

export class AddCommentDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}

export class UpdateWorkflowStepDto {
  @IsString()
  @IsNotEmpty()
  stepId: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CloseTicketDto {
  @IsString()
  @IsNotEmpty()
  resolution: string;
}

export class AssignTicketDto {
  @IsMongoId()
  @IsNotEmpty()
  assignedTo: string;

  @IsEnum(AgentType)
  @IsOptional()
  assignedAgent?: AgentType;
}

export class QueryTicketsDto {
  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketType)
  @IsOptional()
  type?: TicketType;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsMongoId()
  @IsOptional()
  employeeId?: string;

  @IsMongoId()
  @IsOptional()
  assignedTo?: string;

  @IsString()
  @IsOptional()
  search?: string;
}
