import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { EncryptedChatService } from './encrypted-chat.service';
import { TicketChatGateway } from './ticket-chat.gateway';
import { TicketClassifierService } from './ticket-classifier.service';
import { Ticket, TicketSchema } from './models/ticket.schema';
import { ChatMessage, ChatMessageSchema } from './models/chat.schema';
import { TicketNotification, TicketNotificationSchema } from './models/notification.schema';
import {
  EmployeeProfile,
  EmployeeProfileSchema,
} from '../employee-profile/models/employee-profile.schema';
import {
  EmployeeSystemRole,
  EmployeeSystemRoleSchema,
} from '../employee-profile/models/employee-system-role.schema';
import { EncryptionModule } from '../common/encryption';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ticket.name, schema: TicketSchema },
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: TicketNotification.name, schema: TicketNotificationSchema },
      { name: EmployeeProfile.name, schema: EmployeeProfileSchema },
      { name: EmployeeSystemRole.name, schema: EmployeeSystemRoleSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    EncryptionModule,
  ],
  controllers: [TicketsController, ChatController],
  providers: [TicketsService, ChatService, EncryptedChatService, TicketChatGateway, TicketClassifierService],
  exports: [TicketsService, ChatService, EncryptedChatService, TicketChatGateway, TicketClassifierService],
})
export class TicketsModule {}
