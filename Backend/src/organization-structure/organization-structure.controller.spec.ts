import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationStructureController } from './organization-structure.controller';
import { OrganizationStructureService } from './organization-structure.service';
import { ApprovalDecision } from './enums/organization-structure.enums';

describe('OrganizationStructureController', () => {
  let controller: OrganizationStructureController;
  let service: OrganizationStructureService;

  const mockService = {
    createDepartment: jest.fn(),
    updateDepartment: jest.fn(),
    deactivateDepartment: jest.fn(),
    createPosition: jest.fn(),
    updatePosition: jest.fn(),
    deactivatePosition: jest.fn(),
    getOrganizationalHierarchy: jest.fn(),
    getEmployeeHierarchy: jest.fn(),
    getTeamStructure: jest.fn(),
    createChangeRequest: jest.fn(),
    submitChangeRequest: jest.fn(),
    createApproval: jest.fn(),
    implementChangeRequest: jest.fn(),
    getPendingChangeRequests: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrganizationStructureController],
      providers: [
        {
          provide: OrganizationStructureService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<OrganizationStructureController>(
      OrganizationStructureController,
    );
    service = module.get<OrganizationStructureService>(OrganizationStructureService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createDepartment forwards dto and performer', async () => {
    const req = { user: { employeeId: 'admin1' } };
    const dto = { code: 'DEP1', name: 'HR' };
    const result = { id: 'dep1' };
    mockService.createDepartment.mockResolvedValue(result);

    await expect(controller.createDepartment(req as any, dto as any)).resolves.toBe(result);
    expect(service.createDepartment).toHaveBeenCalledWith(dto, 'admin1');
  });

  it('updatePosition forwards dto, id and performer', async () => {
    const req = { user: { employeeId: 'admin1' } };
    const dto = { title: 'Manager' };
    const result = { id: 'pos1' };
    mockService.updatePosition.mockResolvedValue(result);

    await expect(controller.updatePosition(req as any, 'pos1', dto as any)).resolves.toBe(result);
    expect(service.updatePosition).toHaveBeenCalledWith('pos1', dto, 'admin1');
  });

  it('deactivatePosition forwards id and performer', async () => {
    const req = { user: { employeeId: 'admin1' } };
    const result = { id: 'pos1', isActive: false };
    mockService.deactivatePosition.mockResolvedValue(result);

    await expect(controller.deactivatePosition(req as any, 'pos1')).resolves.toBe(result);
    expect(service.deactivatePosition).toHaveBeenCalledWith('pos1', 'admin1');
  });

  it('getOrganizationalHierarchy uses employee hierarchy for employee-only role', async () => {
    const req = { user: { sub: 'emp1', roles: ['DEPARTMENT_EMPLOYEE'] } };
    const result = { departments: [] };
    mockService.getEmployeeHierarchy.mockResolvedValue(result);

    await expect(controller.getOrganizationalHierarchy(req as any)).resolves.toBe(result);
    expect(service.getEmployeeHierarchy).toHaveBeenCalledWith('emp1');
  });

  it('getMyTeamHierarchy forwards manager position', async () => {
    const req = { user: { positionId: 'pos1' } };
    const result = [{ id: 'pos2' }];
    mockService.getTeamStructure.mockResolvedValue(result);

    await expect(controller.getMyTeamHierarchy(req as any)).resolves.toBe(result);
    expect(service.getTeamStructure).toHaveBeenCalledWith('pos1');
  });

  it('createChangeRequest forwards dto and requester', async () => {
    const req = { user: { employeeId: 'mgr1' } };
    const dto = { requestType: 'NEW_POSITION', details: '{}' };
    const result = { id: 'cr1' };
    mockService.createChangeRequest.mockResolvedValue(result);

    await expect(controller.createChangeRequest(req as any, dto as any)).resolves.toBe(result);
    expect(service.createChangeRequest).toHaveBeenCalledWith(dto, 'mgr1');
  });

  it('submitChangeRequest forwards request id and submitter', async () => {
    const req = { user: { employeeId: 'mgr1' } };
    const result = { id: 'cr1', status: 'SUBMITTED' };
    mockService.submitChangeRequest.mockResolvedValue(result);

    await expect(controller.submitChangeRequest(req as any, 'cr1')).resolves.toBe(result);
    expect(service.submitChangeRequest).toHaveBeenCalledWith('cr1', 'mgr1');
  });

  it('approveChangeRequest builds approval dto and forwards to service', async () => {
    const req = { user: { employeeId: 'admin1' } };
    const result = { id: 'approval1' };
    mockService.createApproval.mockResolvedValue(result);

    await expect(controller.approveChangeRequest(req as any, 'cr1', { reviewComments: 'ok' })).resolves.toBe(result);
    expect(service.createApproval).toHaveBeenCalledWith('cr1', 'admin1', {
      decision: ApprovalDecision.APPROVED,
      comments: 'ok',
    });
  });

  it('rejectChangeRequest builds approval dto and forwards to service', async () => {
    const req = { user: { employeeId: 'admin1' } };
    const result = { id: 'approval1' };
    mockService.createApproval.mockResolvedValue(result);

    await expect(controller.rejectChangeRequest(req as any, 'cr1', { reviewComments: 'no' })).resolves.toBe(result);
    expect(service.createApproval).toHaveBeenCalledWith('cr1', 'admin1', {
      decision: ApprovalDecision.REJECTED,
      comments: 'no',
    });
  });
});
