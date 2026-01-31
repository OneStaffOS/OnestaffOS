import { Test, TestingModule } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { getModelToken } from '@nestjs/mongoose';
import { Ticket } from './models/ticket.schema';
import { TicketType, TicketPriority, TicketStatus } from './enums/ticket.enums';

describe('TicketsService', () => {
  let service: TicketsService;
  let mockTicketModel: any;

  beforeEach(async () => {
    mockTicketModel = {
      create: jest.fn(),
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndDelete: jest.fn(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      save: jest.fn(),
      populate: jest.fn(),
      sort: jest.fn(),
      exec: jest.fn(),
    };

    // Setup chain methods
    mockTicketModel.find.mockReturnValue(mockTicketModel);
    mockTicketModel.findById.mockReturnValue(mockTicketModel);
    mockTicketModel.populate.mockReturnValue(mockTicketModel);
    mockTicketModel.sort.mockReturnValue(mockTicketModel);
    mockTicketModel.exec.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: getModelToken(Ticket.name),
          useValue: mockTicketModel,
        },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('determinePriority', () => {
    it('should assign high priority to network issues', () => {
      const priority = service['determinePriority'](TicketType.NETWORK);
      expect(priority).toBe(TicketPriority.HIGH);
    });

    it('should assign high priority to computer hardware issues', () => {
      const priority = service['determinePriority'](TicketType.HARDWARE, 'computer');
      expect(priority).toBe(TicketPriority.HIGH);
    });

    it('should assign high priority to application errors', () => {
      const priority = service['determinePriority'](
        TicketType.SOFTWARE,
        'application_error',
      );
      expect(priority).toBe(TicketPriority.HIGH);
    });

    it('should assign medium priority to other hardware issues', () => {
      const priority = service['determinePriority'](TicketType.HARDWARE, 'printer');
      expect(priority).toBe(TicketPriority.MEDIUM);
    });
  });

  describe('assignAgentByType', () => {
    it('should assign Agent 1 to software issues', () => {
      const agent = service['assignAgentByType'](TicketType.SOFTWARE);
      expect(agent).toBe('Agent 1');
    });

    it('should assign Agent 2 to hardware issues', () => {
      const agent = service['assignAgentByType'](TicketType.HARDWARE);
      expect(agent).toBe('Agent 2');
    });

    it('should assign Agent 3 to network issues', () => {
      const agent = service['assignAgentByType'](TicketType.NETWORK);
      expect(agent).toBe('Agent 3');
    });
  });

  describe('generateWorkflow', () => {
    it('should generate workflow for software issues', () => {
      const workflow = service['generateWorkflow'](TicketType.SOFTWARE);
      expect(workflow.steps).toHaveLength(4);
      expect(workflow.steps[0].title).toBe('Initial Assessment');
    });

    it('should generate workflow for hardware issues', () => {
      const workflow = service['generateWorkflow'](TicketType.HARDWARE);
      expect(workflow.steps).toHaveLength(4);
      expect(workflow.steps[0].title).toBe('Initial Diagnosis');
    });

    it('should generate workflow for network issues', () => {
      const workflow = service['generateWorkflow'](TicketType.NETWORK);
      expect(workflow.steps).toHaveLength(4);
      expect(workflow.steps[0].title).toBe('Connectivity Check');
    });
  });
});
