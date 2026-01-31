import { Test, TestingModule } from '@nestjs/testing';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { getModelToken } from '@nestjs/mongoose';
import { Ticket } from './models/ticket.schema';

describe('TicketsController', () => {
  let controller: TicketsController;
  let service: TicketsService;

  const mockTicketService = {
    createTicket: jest.fn(),
    getTickets: jest.fn(),
    getEmployeeTickets: jest.fn(),
    getAssignedTickets: jest.fn(),
    getTicketById: jest.fn(),
    updateTicket: jest.fn(),
    addComment: jest.fn(),
    assignTicket: jest.fn(),
    closeTicket: jest.fn(),
    updateWorkflowStep: jest.fn(),
    getTicketStats: jest.fn(),
    deleteTicket: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        {
          provide: TicketsService,
          useValue: mockTicketService,
        },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTicket', () => {
    it('should create a new ticket', async () => {
      const createTicketDto = {
        title: 'Test Issue',
        description: 'Test Description',
        type: 'software' as any,
        subCategory: 'application_error',
      };

      const mockRequest = {
        user: { employeeProfileId: '123' },
      };

      const expectedTicket = {
        _id: '1',
        ...createTicketDto,
        employeeId: '123',
        priority: 'high',
        status: 'open',
      };

      mockTicketService.createTicket.mockResolvedValue(expectedTicket);

      const result = await controller.createTicket(mockRequest, createTicketDto);

      expect(result).toEqual(expectedTicket);
      expect(service.createTicket).toHaveBeenCalledWith('123', createTicketDto);
    });
  });

  describe('getMyTickets', () => {
    it('should return employee tickets', async () => {
      const mockRequest = {
        user: { employeeProfileId: '123' },
      };

      const mockTickets = [
        { _id: '1', title: 'Ticket 1' },
        { _id: '2', title: 'Ticket 2' },
      ];

      mockTicketService.getEmployeeTickets.mockResolvedValue(mockTickets);

      const result = await controller.getMyTickets(mockRequest);

      expect(result).toEqual(mockTickets);
      expect(service.getEmployeeTickets).toHaveBeenCalledWith('123');
    });
  });
});
