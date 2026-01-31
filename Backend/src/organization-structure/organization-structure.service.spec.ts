import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrganizationStructureService } from './organization-structure.service';
import { NotificationService } from '../notifications/notification.service';
import { Department } from './models/department.schema';
import { Position } from './models/position.schema';
import { PositionAssignment } from './models/position-assignment.schema';
import { StructureChangeRequest } from './models/structure-change-request.schema';
import { StructureApproval } from './models/structure-approval.schema';
import { StructureChangeLog } from './models/structure-change-log.schema';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, StructureRequestStatus, StructureRequestType } from './enums/organization-structure.enums';

describe('OrganizationStructureService', () => {
  let service: OrganizationStructureService;
  let departmentModel: any;
  let positionModel: any;
  let positionAssignmentModel: any;
  let changeRequestModel: any;
  let approvalModel: any;
  let employeeProfileModel: any;
  let notificationService: any;

  const mockQuery = (result: any) => ({
    populate: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    departmentModel = jest.fn();
    (departmentModel as any).findOne = jest.fn();
    (departmentModel as any).findById = jest.fn();
    (departmentModel as any).find = jest.fn();

    positionModel = jest.fn();
    (positionModel as any).findOne = jest.fn();
    (positionModel as any).findById = jest.fn();
    (positionModel as any).find = jest.fn();
    (positionModel as any).updateOne = jest.fn();
    positionAssignmentModel = {
      exists: jest.fn(),
      updateMany: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    changeRequestModel = Object.assign(
      jest.fn().mockImplementation((data: any) => ({
        ...data,
        save: jest.fn().mockResolvedValue(data),
      })),
      {
        findById: jest.fn(),
        find: jest.fn(),
      },
    );
    approvalModel = jest.fn();
    (approvalModel as any).findOne = jest.fn();
    (approvalModel as any).find = jest.fn();
    employeeProfileModel = {
      findByIdAndUpdate: jest.fn(),
    };
    notificationService = {
      createNotification: jest.fn(),
    };

    const changeLogModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue({}),
    }));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationStructureService,
        { provide: getModelToken(Department.name), useValue: departmentModel },
        { provide: getModelToken(Position.name), useValue: positionModel },
        { provide: getModelToken(PositionAssignment.name), useValue: positionAssignmentModel },
        { provide: getModelToken(StructureChangeRequest.name), useValue: changeRequestModel },
        { provide: getModelToken(StructureApproval.name), useValue: approvalModel },
        { provide: getModelToken(StructureChangeLog.name), useValue: changeLogModel },
        { provide: getModelToken(EmployeeProfile.name), useValue: employeeProfileModel },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<OrganizationStructureService>(
      OrganizationStructureService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createDepartment throws on duplicate code (BR 5)', async () => {
    departmentModel.findOne.mockResolvedValue({ id: 'dep1' });
    await expect(service.createDepartment({ code: 'D1', name: 'HR' } as any, 'admin1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('createDepartment saves and notifies', async () => {
    departmentModel.findOne.mockResolvedValue(null);
    const saved = { _id: 'dep1', name: 'HR', toObject: () => ({}) };
    (departmentModel as any).mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(saved),
      toObject: () => ({ id: 'dep1' }),
    }));

    const result = await service.createDepartment({ code: 'D1', name: 'HR' } as any, 'admin1');
    expect(result).toBe(saved);
    expect(notificationService.createNotification).toHaveBeenCalled();
  });

  it('updatePosition rejects circular reporting (REQ-OSM-09)', async () => {
    positionModel.findById.mockResolvedValueOnce({ _id: 'pos1', code: 'P1', toObject: () => ({}) });
    positionModel.findOne?.mockResolvedValue(null);
    positionModel.findById.mockResolvedValueOnce({ _id: 'pos2', reportsToPositionId: 'pos1' });

    await expect(service.updatePosition('pos1', { reportsToPositionId: 'pos1' } as any, 'admin1'))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('deactivatePosition delimits when assignments exist (BR 12/37)', async () => {
    const position = { _id: 'pos1', title: 'Engineer', isActive: true, departmentId: 'dep1', toObject: () => ({}) , save: jest.fn().mockResolvedValue({ _id: 'pos1', title: 'Engineer', departmentId: 'dep1', toObject: () => ({}) })};
    positionModel.findById.mockResolvedValue(position);
    positionAssignmentModel.exists.mockResolvedValue(true);

    await service.deactivatePosition('pos1', 'admin1');
    expect(positionAssignmentModel.updateMany).toHaveBeenCalled();
  });

  it('getEmployeeHierarchy returns empty when no assignment (BR 41)', async () => {
    positionAssignmentModel.findOne.mockReturnValue(mockQuery(null));
    const result = await service.getEmployeeHierarchy('emp1');
    expect(result).toEqual({ departments: [] });
  });

  it('createChangeRequest sets draft status (REQ-OSM-03)', async () => {
    const req = await service.createChangeRequest({ requestType: StructureRequestType.NEW_POSITION } as any, 'mgr1');
    expect(req.status).toBe(StructureRequestStatus.DRAFT);
  });

  it('submitChangeRequest only allows draft', async () => {
    changeRequestModel.findById.mockResolvedValue({ status: StructureRequestStatus.SUBMITTED, save: jest.fn() });
    await expect(service.submitChangeRequest('req1', 'mgr1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('createApproval approves and triggers implement', async () => {
    const changeReq = { _id: 'req1', status: StructureRequestStatus.SUBMITTED, save: jest.fn() };
    changeRequestModel.findById.mockResolvedValue(changeReq);
    (approvalModel as any).findOne.mockResolvedValue(null);
    (approvalModel as any).mockImplementation((data: any) => ({
      ...data,
      save: jest.fn().mockResolvedValue(data),
    }));
    const implementSpy = jest.spyOn(service, 'implementChangeRequest').mockResolvedValue({ ok: true } as any);

    await service.createApproval('req1', 'admin1', { decision: ApprovalDecision.APPROVED, comments: '' });
    expect(changeReq.status).toBe(StructureRequestStatus.APPROVED);
    expect(implementSpy).toHaveBeenCalled();
  });
});
