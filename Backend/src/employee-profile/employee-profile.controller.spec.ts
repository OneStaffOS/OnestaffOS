import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeProfileController } from './employee-profile.controller';
import { EmployeeProfileService } from './employee-profile.service';

describe('EmployeeProfileController', () => {
  let controller: EmployeeProfileController;
  let service: EmployeeProfileService;

  const mockService = {
    getMyProfile: jest.fn(),
    updateSelfService: jest.fn(),
    createChangeRequest: jest.fn(),
    getTeamProfiles: jest.fn(),
    getTeamSummary: jest.fn(),
    approveChangeRequest: jest.fn(),
    rejectChangeRequest: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmployeeProfileController],
      providers: [
        {
          provide: EmployeeProfileService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<EmployeeProfileController>(
      EmployeeProfileController,
    );
    service = module.get<EmployeeProfileService>(EmployeeProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyProfile calls service with user id', async () => {
    const req = { user: { sub: 'emp123' } };
    const result = { id: 'emp123' };
    mockService.getMyProfile.mockResolvedValue(result);

    await expect(controller.getMyProfile(req as any)).resolves.toBe(result);
    expect(service.getMyProfile).toHaveBeenCalledWith('emp123');
  });

  it('updateSelfService forwards user id and dto', async () => {
    const req = { user: { sub: 'emp123' } };
    const dto = { mobilePhone: '0100' };
    const result = { ok: true };
    mockService.updateSelfService.mockResolvedValue(result);

    await expect(controller.updateSelfService(req as any, dto as any)).resolves.toBe(result);
    expect(service.updateSelfService).toHaveBeenCalledWith('emp123', dto);
  });

  it('createChangeRequest forwards user id and dto', async () => {
    const req = { user: { sub: 'emp123' } };
    const dto = { requestDescription: 'Change request for First Name: from "A" to "B". Reason: typo' };
    const result = { id: 'cr1' };
    mockService.createChangeRequest.mockResolvedValue(result);

    await expect(controller.createChangeRequest(req as any, dto as any)).resolves.toBe(result);
    expect(service.createChangeRequest).toHaveBeenCalledWith('emp123', dto);
  });

  it('getTeamProfiles forwards supervisor position and manager id', async () => {
    const req = { user: { positionId: 'pos1', sub: 'manager1' } };
    const result = [{ id: 'emp1' }];
    mockService.getTeamProfiles.mockResolvedValue(result);

    await expect(controller.getTeamProfiles(req as any)).resolves.toBe(result);
    expect(service.getTeamProfiles).toHaveBeenCalledWith('pos1', 'manager1');
  });

  it('getTeamSummary forwards supervisor position', async () => {
    const req = { user: { positionId: 'pos1' } };
    const result = [{ departmentId: 'dep1', totalMembers: 3 }];
    mockService.getTeamSummary.mockResolvedValue(result);

    await expect(controller.getTeamSummary(req as any)).resolves.toBe(result);
    expect(service.getTeamSummary).toHaveBeenCalledWith('pos1');
  });

  it('approveChangeRequest forwards requestId and adminId', async () => {
    const req = { user: { sub: 'admin1' } };
    const result = { message: 'approved' };
    mockService.approveChangeRequest.mockResolvedValue(result);

    await expect(controller.approveChangeRequest('req1', req as any)).resolves.toBe(result);
    expect(service.approveChangeRequest).toHaveBeenCalledWith('req1', 'admin1');
  });

  it('rejectChangeRequest forwards requestId and adminId', async () => {
    const req = { user: { sub: 'admin1' } };
    const result = { message: 'rejected' };
    mockService.rejectChangeRequest.mockResolvedValue(result);

    await expect(controller.rejectChangeRequest('req1', req as any)).resolves.toBe(result);
    expect(service.rejectChangeRequest).toHaveBeenCalledWith('req1', 'admin1');
  });
});
