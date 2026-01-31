import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { NotificationQueryDto } from './dto/chat.dto';

const EMPLOYEE_CHAT_ROLES: Role[] = [
  Role.DEPARTMENT_EMPLOYEE,
  Role.DEPARTMENT_HEAD,
  Role.HR_MANAGER,
  Role.HR_EMPLOYEE,
  Role.PAYROLL_SPECIALIST,
  Role.PAYROLL_MANAGER,
  Role.SYSTEM_ADMIN,
  Role.LEGAL_POLICY_ADMIN,
  Role.RECRUITER,
  Role.FINANCE_STAFF,
  Role.JOB_CANDIDATE,
  Role.HR_ADMIN,
  Role.NEW_HIRE,
  Role.CLIENT
];

@Controller('tickets/chat')
@UseGuards(AuthGuard, authorizationGaurd)
@Roles(...EMPLOYEE_CHAT_ROLES)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Get chat history for a ticket
   */
  @Get(':ticketId/messages')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async getChatHistory(
    @Param('ticketId') ticketId: string,
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('before') before?: string,
  ) {
    const userId = req.user.sub;
    return this.chatService.getChatHistory(ticketId, userId);
  }

  /**
   * Get all notifications for current user
   */
  @Get('/notifications')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async getNotifications(
    @Query() query: NotificationQueryDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    return this.chatService.getNotifications(userId, {
      unreadOnly: query.unreadOnly,
      limit: query.limit,
      skip: query.skip,
    });
  }

  /**
   * Get unread notification count
   */
  @Get('/notifications/count')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async getUnreadCount(@Req() req: any) {
    const userId = req.user.sub;
    const count = await this.chatService.getUnreadNotificationCount(userId);
    return { count };
  }

  /**
   * Mark a notification as read
   */
  @Patch('/notifications/:id/read')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async markNotificationAsRead(
    @Param('id') notificationId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    await this.chatService.markNotificationAsRead(notificationId, userId);
    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  @Patch('/notifications/read-all')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async markAllAsRead(@Req() req: any) {
    const userId = req.user.sub;
    await this.chatService.markAllNotificationsAsRead(userId);
    return { success: true };
  }

  /**
   * Mark messages in a ticket as read
   */
  @Patch(':ticketId/messages/read')
  @Roles(...EMPLOYEE_CHAT_ROLES)
  async markMessagesAsRead(
    @Param('ticketId') ticketId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub;
    await this.chatService.markMessagesAsRead(ticketId, userId);
    return { success: true };
  }
}
