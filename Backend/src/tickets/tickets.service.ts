import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument } from './models/ticket.schema';
import { ChatMessage, ChatMessageDocument } from './models/chat.schema';
import { TicketNotification, TicketNotificationDocument, NotificationType } from './models/notification.schema';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { SystemRole, EmployeeStatus } from '../employee-profile/enums/employee-profile.enums';
import {
  CreateTicketDto,
  UpdateTicketDto,
  AddCommentDto,
  CloseTicketDto,
  AssignTicketDto,
  QueryTicketsDto,
} from './dto/ticket.dto';
import {
  TicketType,
  TicketPriority,
  TicketStatus,
  AgentType,
} from './enums/ticket.enums';
import { TicketClassifierService } from './ticket-classifier.service';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);
  
  // Agent ID to AgentType mapping
  private readonly agentIdToType: Record<string, AgentType> = {
    '692479b918668dee67209282': AgentType.AGENT_1, // Software
    '692a056cfad7d194cd3f0992': AgentType.AGENT_2, // Hardware
    '69438f79c1af7ec03ff7fed0': AgentType.AGENT_3, // Network
  };
  
  constructor(
    @InjectModel(Ticket.name) private ticketModel: Model<TicketDocument>,
    @InjectModel(TicketNotification.name) private notificationModel: Model<TicketNotificationDocument>,
    @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name) private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    private readonly ticketClassifierService: TicketClassifierService,
  ) {}

  /**
   * Create a new support ticket
   */
  async createTicket(
    employeeId: string,
    createTicketDto: CreateTicketDto,
  ): Promise<Ticket> {
    // Auto-assign priority based on type and sub-category
    const priority = createTicketDto.priority || this.determinePriority(
      createTicketDto.type,
      createTicketDto.subCategory,
    );

    // Auto-assign agent using Neural Network classifier
    const { agentType: assignedAgent, agentId, confidence } = await this.assignAgentUsingNN(
      createTicketDto.type,
      priority,
    );
    
    this.logger.log(
      `Creating ticket: Type=${createTicketDto.type}, Priority=${priority}, ` +
      `Assigned=${assignedAgent} (ID: ${agentId}), Confidence=${(confidence * 100).toFixed(1)}%`,
    );

    // Create custom workflow based on type
    const customWorkflow = this.generateWorkflow(
      createTicketDto.type,
      createTicketDto.subCategory,
    );

    const ticket = new this.ticketModel({
      employeeId: new Types.ObjectId(employeeId),
      ...createTicketDto,
      priority,
      assignedAgent,
      assignedTo: new Types.ObjectId(agentId), // Auto-assign to the agent
      customWorkflow,
      status: TicketStatus.IN_PROGRESS,
      statusHistory: [
        {
          status: TicketStatus.IN_PROGRESS,
          changedBy: new Types.ObjectId(employeeId),
          changedAt: new Date(),
          note: `Ticket created and auto-assigned to ${assignedAgent}`,
        },
      ],
      // Store ML metadata
      mlAssignment: {
        agentId,
        agentName: assignedAgent,
        confidence,
        assignedAt: new Date(),
        model: 'neural_network_v1',
      },
    });

    const savedTicket = await ticket.save();
    
    // Create notification for the ticket owner (confirmation)
    await this.createNotification({
      recipientId: employeeId,
      ticketId: savedTicket._id.toString(),
      ticketNumber: savedTicket.ticketNumber,
      type: NotificationType.TICKET_CREATED,
      title: 'Ticket Created',
      message: `Your support ticket "${createTicketDto.title}" has been created successfully.`,
    });

    return savedTicket;
  }

  /**
   * Get all tickets with optional filters
   */
  async getTickets(queryDto: QueryTicketsDto): Promise<Ticket[]> {
    const query: any = {};

    if (queryDto.status) query.status = queryDto.status;
    if (queryDto.type) query.type = queryDto.type;
    if (queryDto.priority) query.priority = queryDto.priority;
    
    if (queryDto.employeeId && Types.ObjectId.isValid(queryDto.employeeId)) {
      query.employeeId = new Types.ObjectId(queryDto.employeeId);
    }
    
    if (queryDto.assignedTo && Types.ObjectId.isValid(queryDto.assignedTo)) {
      query.assignedTo = new Types.ObjectId(queryDto.assignedTo);
    }

    if (queryDto.search) {
      query.$or = [
        { title: { $regex: queryDto.search, $options: 'i' } },
        { description: { $regex: queryDto.search, $options: 'i' } },
      ];
    }

    return this.ticketModel
      .find(query)
      .populate('employeeId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Get tickets for a specific employee
   */
  async getEmployeeTickets(employeeId: string): Promise<Ticket[]> {
    // Convert to ObjectId if it's a string, otherwise use as is
    const empId = typeof employeeId === 'string' && Types.ObjectId.isValid(employeeId)
      ? new Types.ObjectId(employeeId)
      : employeeId;

    return this.ticketModel
      .find({ employeeId: empId })
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Get tickets assigned to an agent
   */
  async getAssignedTickets(agentId: string): Promise<Ticket[]> {
    const agId = typeof agentId === 'string' && Types.ObjectId.isValid(agentId)
      ? new Types.ObjectId(agentId)
      : agentId;

    return this.ticketModel
      .find({ assignedTo: agId })
      .populate('employeeId', 'firstName lastName email')
      .sort({ priority: -1, createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Get single ticket by ID
   */
  async getTicketById(ticketId: string): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('employeeId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email')
      .exec();

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    return ticket;
  }

  /**
   * Update ticket
   */
  async updateTicket(
    ticketId: string,
    updateTicketDto: UpdateTicketDto,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    // Update status history if status changed
    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      ticket.statusHistory.push({
        status: updateTicketDto.status,
        changedBy: new Types.ObjectId(userId),
        changedAt: new Date(),
        note: `Status changed from ${ticket.status} to ${updateTicketDto.status}`,
      });

      if (updateTicketDto.status === TicketStatus.RESOLVED) {
        ticket.resolvedAt = new Date();
      }

      if (updateTicketDto.status === TicketStatus.CLOSED) {
        ticket.closedAt = new Date();
      }
    }

    Object.assign(ticket, updateTicketDto);
    return ticket.save();
  }

  /**
   * Add comment to ticket
   */
  async addComment(
    ticketId: string,
    userId: string,
    userName: string,
    addCommentDto: AddCommentDto,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel
      .findById(ticketId)
      .populate('employeeId', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    ticket.comments.push({
      userId: new Types.ObjectId(userId),
      userName,
      comment: addCommentDto.comment,
      createdAt: new Date(),
    });

    const savedTicket = await ticket.save();

    // Notify ticket owner about new comment (if comment is not from them)
    await this.notifyTicketOwner(
      savedTicket,
      NotificationType.TICKET_COMMENTED,
      'New Comment',
      `${userName} commented on your ticket: "${addCommentDto.comment.substring(0, 100)}${addCommentDto.comment.length > 100 ? '...' : ''}"`,
      userId,
      userName,
    );

    // Notify assigned agent about new comment (if comment is not from them)
    await this.notifyAssignedAgent(
      savedTicket,
      NotificationType.TICKET_COMMENTED,
      'New Comment',
      `${userName} commented on ticket "${savedTicket.title}": "${addCommentDto.comment.substring(0, 100)}${addCommentDto.comment.length > 100 ? '...' : ''}"`,
      userId,
      userName,
    );

    return savedTicket;
  }

  /**
   * Assign ticket to agent
   */
  async assignTicket(
    ticketId: string,
    assignTicketDto: AssignTicketDto,
    assignerId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    ticket.assignedTo = new Types.ObjectId(assignTicketDto.assignedTo);
    if (assignTicketDto.assignedAgent) {
      ticket.assignedAgent = assignTicketDto.assignedAgent;
    }

    ticket.statusHistory.push({
      status: TicketStatus.IN_PROGRESS,
      changedBy: new Types.ObjectId(assignerId),
      changedAt: new Date(),
      note: `Ticket assigned to agent`,
    });

    ticket.status = TicketStatus.IN_PROGRESS;

    const savedTicket = await ticket.save();

    // Notify the ticket owner about assignment
    await this.notifyTicketOwner(
      savedTicket,
      NotificationType.TICKET_ASSIGNED,
      'Ticket Assigned',
      `Your ticket "${savedTicket.title}" has been assigned to an agent and is now in progress.`,
      assignerId,
    );

    // Notify the assigned agent about new assignment
    await this.createNotification({
      recipientId: assignTicketDto.assignedTo,
      ticketId: savedTicket._id.toString(),
      ticketNumber: savedTicket.ticketNumber,
      type: NotificationType.TICKET_ASSIGNED,
      title: 'New Ticket Assigned',
      message: `You have been assigned a new support ticket: "${savedTicket.title}"`,
    });

    return savedTicket;
  }

  /**
   * Close ticket with resolution
   */
  async closeTicket(
    ticketId: string,
    closeTicketDto: CloseTicketDto,
    userId: string,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    ticket.resolution = closeTicketDto.resolution;
    ticket.status = TicketStatus.CLOSED;
    ticket.closedAt = new Date();

    ticket.statusHistory.push({
      status: TicketStatus.CLOSED,
      changedBy: new Types.ObjectId(userId),
      changedAt: new Date(),
      note: 'Ticket closed with resolution',
    });

    const savedTicket = await ticket.save();

    // Notify the ticket owner about closure
    await this.notifyTicketOwner(
      savedTicket,
      NotificationType.TICKET_CLOSED,
      'Ticket Resolved',
      `Your ticket "${savedTicket.title}" has been resolved and closed.`,
      userId,
    );

    return savedTicket;
  }

  /**
   * Update workflow step
   */
  async updateWorkflowStep(
    ticketId: string,
    stepOrder: number,
    completed: boolean,
  ): Promise<Ticket> {
    const ticket = await this.ticketModel.findById(ticketId);

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    if (ticket.customWorkflow && ticket.customWorkflow.steps) {
      const step = ticket.customWorkflow.steps.find(
        (s) => s.order === stepOrder,
      );
      if (step) {
        step.completed = completed;
        if (completed) {
          step.completedAt = new Date();
        }
      }
    }

    return ticket.save();
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(employeeId?: string): Promise<any> {
    const query = employeeId
      ? { employeeId: new Types.ObjectId(employeeId) }
      : {};

    const [total, open, inProgress, resolved, closed] = await Promise.all([
      this.ticketModel.countDocuments(query),
      this.ticketModel.countDocuments({ ...query, status: TicketStatus.OPEN }),
      this.ticketModel.countDocuments({
        ...query,
        status: TicketStatus.IN_PROGRESS,
      }),
      this.ticketModel.countDocuments({
        ...query,
        status: TicketStatus.RESOLVED,
      }),
      this.ticketModel.countDocuments({
        ...query,
        status: TicketStatus.CLOSED,
      }),
    ]);

    const byType = await this.ticketModel.aggregate([
      { $match: query },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);

    const byPriority = await this.ticketModel.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    return {
      total,
      open,
      inProgress,
      resolved,
      closed,
      byType: byType.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byPriority: byPriority.reduce(
        (acc, item) => {
          acc[item._id] = item.count;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }

  /**
   * Auto-determine priority based on type and subcategory
   */
  private determinePriority(type: TicketType, subCategory?: string): TicketPriority {
    // Based on the training data analysis:
    // - Network issues tend to be high priority
    // - Hardware issues are often medium priority
    // - Software issues vary

    if (type === TicketType.NETWORK) {
      return TicketPriority.HIGH;
    }

    if (type === TicketType.HARDWARE) {
      if (subCategory === 'computer' || subCategory === 'phone') {
        return TicketPriority.HIGH;
      }
      return TicketPriority.MEDIUM;
    }

    if (type === TicketType.SOFTWARE) {
      if (
        subCategory === 'application_error' ||
        subCategory === 'performance'
      ) {
        return TicketPriority.HIGH;
      }
      return TicketPriority.MEDIUM;
    }

    return TicketPriority.MEDIUM;
  }

  /**
   * Assign agent using Neural Network classifier
   * Falls back to rule-based assignment if classifier fails
   */
  private async assignAgentUsingNN(
    type: TicketType,
    priority: TicketPriority,
  ): Promise<{ agentType: AgentType; agentId: string; confidence: number }> {
    try {
      const result = await this.ticketClassifierService.getAgentAssignment(
        priority.toLowerCase(),
        type.toLowerCase(),
      );
      
      this.logger.log(
        `Neural Network assigned ${result.agentName} (confidence: ${(result.confidence * 100).toFixed(1)}%) for ${priority} ${type} ticket`,
      );
      
      // Map agent ID to AgentType
      const agentType = this.agentIdToType[result.agentId] || AgentType.AGENT_1;
      
      return {
        agentType,
        agentId: result.agentId,
        confidence: result.confidence,
      };
    } catch (error) {
      this.logger.warn(`Neural Network classification failed: ${error.message}. Using rule-based fallback.`);
      
      // Fallback to rule-based assignment
      const agentType = this.assignAgentByType(type);
      const agentIds = this.ticketClassifierService.getAllAgentIds();
      const agentName = agentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      return {
        agentType,
        agentId: agentIds[agentName] || '692479b918668dee67209282',
        confidence: 1.0,
      };
    }
  }

  /**
   * Assign agent based on ticket type (rule-based fallback)
   */
  private assignAgentByType(type: TicketType): AgentType {
    switch (type) {
      case TicketType.SOFTWARE:
        return AgentType.AGENT_1;
      case TicketType.HARDWARE:
        return AgentType.AGENT_2;
      case TicketType.NETWORK:
        return AgentType.AGENT_3;
      default:
        return AgentType.AGENT_1;
    }
  }

  /**
   * Generate custom workflow based on ticket type
   */
  private generateWorkflow(
    type: TicketType,
    subCategory?: string,
  ): { steps: Array<any> } {
    const workflows: Record<TicketType, Array<any>> = {
      [TicketType.SOFTWARE]: [
        {
          order: 1,
          title: 'Initial Assessment',
          description: 'Review software issue and gather error details',
          completed: false,
        },
        {
          order: 2,
          title: 'Reproduce Issue',
          description: 'Attempt to reproduce the software issue',
          completed: false,
        },
        {
          order: 3,
          title: 'Apply Solution',
          description:
            'Apply fix, update, or reinstall software as needed',
          completed: false,
        },
        {
          order: 4,
          title: 'Verification',
          description: 'Verify issue is resolved with user',
          completed: false,
        },
      ],
      [TicketType.HARDWARE]: [
        {
          order: 1,
          title: 'Initial Diagnosis',
          description: 'Inspect hardware and identify issue',
          completed: false,
        },
        {
          order: 2,
          title: 'Troubleshooting',
          description: 'Perform hardware troubleshooting steps',
          completed: false,
        },
        {
          order: 3,
          title: 'Repair/Replace',
          description: 'Repair or arrange replacement of hardware',
          completed: false,
        },
        {
          order: 4,
          title: 'Testing',
          description: 'Test hardware functionality',
          completed: false,
        },
      ],
      [TicketType.NETWORK]: [
        {
          order: 1,
          title: 'Connectivity Check',
          description: 'Check network connectivity and infrastructure',
          completed: false,
        },
        {
          order: 2,
          title: 'Diagnose Issue',
          description: 'Identify network configuration or hardware issue',
          completed: false,
        },
        {
          order: 3,
          title: 'Apply Fix',
          description: 'Apply network configuration changes or repairs',
          completed: false,
        },
        {
          order: 4,
          title: 'Verify Connection',
          description: 'Verify network connectivity is restored',
          completed: false,
        },
      ],
    };

    return { steps: workflows[type] || workflows[TicketType.SOFTWARE] };
  }

  /**
   * Delete ticket (admin only)
   */
  async deleteTicket(ticketId: string): Promise<void> {
    const result = await this.ticketModel.findByIdAndDelete(ticketId);

    if (!result) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
  }

  /**
   * Create a notification for ticket events
   */
  async createNotification(data: {
    recipientId: string;
    ticketId: string;
    ticketNumber: string;
    type: NotificationType;
    title: string;
    message: string;
    triggeredBy?: string;
    triggeredByName?: string;
    metadata?: Record<string, any>;
  }): Promise<TicketNotification> {
    const notification = new this.notificationModel({
      recipientId: new Types.ObjectId(data.recipientId),
      ticketId: new Types.ObjectId(data.ticketId),
      ticketNumber: data.ticketNumber,
      type: data.type,
      title: data.title,
      message: data.message,
      triggeredBy: data.triggeredBy ? new Types.ObjectId(data.triggeredBy) : undefined,
      triggeredByName: data.triggeredByName,
      metadata: data.metadata,
    });

    return notification.save();
  }

  /**
   * Notify ticket owner about updates
   */
  async notifyTicketOwner(
    ticket: Ticket,
    type: NotificationType,
    title: string,
    message: string,
    triggeredBy?: string,
    triggeredByName?: string,
  ): Promise<void> {
    const ownerId = ticket.employeeId._id 
      ? ticket.employeeId._id.toString() 
      : ticket.employeeId.toString();

    // Don't notify if the trigger is the owner
    if (triggeredBy && triggeredBy === ownerId) {
      return;
    }

    await this.createNotification({
      recipientId: ownerId,
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      type,
      title,
      message,
      triggeredBy,
      triggeredByName,
    });
  }

  /**
   * Notify assigned agent about updates
   */
  async notifyAssignedAgent(
    ticket: Ticket,
    type: NotificationType,
    title: string,
    message: string,
    triggeredBy?: string,
    triggeredByName?: string,
  ): Promise<void> {
    if (!ticket.assignedTo) return;

    const agentId = ticket.assignedTo._id
      ? ticket.assignedTo._id.toString()
      : ticket.assignedTo.toString();

    // Don't notify if the trigger is the agent
    if (triggeredBy && triggeredBy === agentId) {
      return;
    }

    await this.createNotification({
      recipientId: agentId,
      ticketId: ticket._id.toString(),
      ticketNumber: ticket.ticketNumber,
      type,
      title,
      message,
      triggeredBy,
      triggeredByName,
    });
  }

  /**
   * Get all employees with System Admin role (agents)
   * These are the users who can be assigned to tickets
   */
  async getAgents(): Promise<any[]> {
    // First, get all employee system roles with System Admin role
    const systemRoles = await this.employeeSystemRoleModel
      .find({
        roles: SystemRole.SYSTEM_ADMIN,
        isActive: true,
      })
      .exec();

    if (systemRoles.length === 0) {
      return [];
    }

    // Get the employee profile IDs
    const employeeIds = systemRoles.map((role) => role.employeeProfileId);

    // Fetch the employee profiles with active status
    const agents = await this.employeeProfileModel
      .find({
        _id: { $in: employeeIds },
        status: EmployeeStatus.ACTIVE,
      })
      .select('firstName lastName email employeeNumber')
      .lean()
      .exec();

    return agents;
  }
}
