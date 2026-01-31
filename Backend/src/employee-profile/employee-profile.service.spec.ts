import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EmployeeProfileService } from './employee-profile.service';
import { NotificationService } from '../notifications/notification.service';
import { EmployeeProfile } from './models/employee-profile.schema';
import { EmployeeSystemRole } from './models/employee-system-role.schema';
import { EmployeeProfileChangeRequest } from './models/ep-change-request.schema';
import { EmployeeQualification } from './models/qualification.schema';
import { PositionAssignment } from '../organization-structure/models/position-assignment.schema';
import { Position } from '../organization-structure/models/position.schema';
import { Department } from '../organization-structure/models/department.schema';
import { AppraisalAssignment } from '../performance/models/appraisal-assignment.schema';
import { AppraisalRecord } from '../performance/models/appraisal-record.schema';
import { AppraisalDispute } from '../performance/models/appraisal-dispute.schema';
import { ShiftAssignment } from '../time-management/models/shift-assignment.schema';
import { payGrade } from '../payroll-configuration/models/payGrades.schema';
import { employeePayrollDetails } from '../payroll-execution/models/employeePayrollDetails.schema';
import { ProfileChangeStatus, EmployeeStatus } from './enums/employee-profile.enums';
import { NotFoundException } from '@nestjs/common';

describe('EmployeeProfileService', () => {
  let service: EmployeeProfileService;
  let employeeProfileModel: any;
  let changeRequestModel: any;
  let positionModel: any;
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
    employeeProfileModel = {
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
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

    positionModel = {
      findOne: jest.fn(),
    };

    notificationService = {
      createNotification: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeProfileService,
        { provide: getModelToken(EmployeeProfile.name), useValue: employeeProfileModel },
        { provide: getModelToken(EmployeeSystemRole.name), useValue: {} },
        { provide: getModelToken(EmployeeProfileChangeRequest.name), useValue: changeRequestModel },
        { provide: getModelToken(EmployeeQualification.name), useValue: {} },
        { provide: getModelToken(PositionAssignment.name), useValue: { updateMany: jest.fn(), updateOne: jest.fn() } },
        { provide: getModelToken(Position.name), useValue: positionModel },
        { provide: getModelToken(Department.name), useValue: { findOne: jest.fn() } },
        { provide: getModelToken(AppraisalAssignment.name), useValue: { find: jest.fn() } },
        { provide: getModelToken(AppraisalRecord.name), useValue: { find: jest.fn() } },
        { provide: getModelToken(AppraisalDispute.name), useValue: {} },
        { provide: getModelToken(ShiftAssignment.name), useValue: {} },
        { provide: getModelToken(payGrade.name), useValue: {} },
        { provide: getModelToken(employeePayrollDetails.name), useValue: {} },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get<EmployeeProfileService>(EmployeeProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('getMyProfile throws when profile missing', async () => {
    employeeProfileModel.findById.mockReturnValue(mockQuery(null));
    await expect(service.getMyProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updateSelfService updates allowed fields and sends notification', async () => {
    const profile = {
      personalEmail: 'old@mail.com',
      mobilePhone: '000',
      save: jest.fn().mockResolvedValue({ id: 'emp1' }),
    };
    employeeProfileModel.findById.mockResolvedValue(profile);

    await service.updateSelfService('emp1', {
      personalEmail: 'new@mail.com',
      mobilePhone: '111',
      biography: 'bio',
    } as any);

    expect(profile.personalEmail).toBe('new@mail.com');
    expect(profile.mobilePhone).toBe('111');
    expect(profile.biography).toBe('bio');
    expect(notificationService.createNotification).toHaveBeenCalled();
  });

  it('createChangeRequest stores pending request and notifies', async () => {
    employeeProfileModel.findById.mockResolvedValue({ firstName: 'A', lastName: 'B' });
    const saved = await service.createChangeRequest('emp1', {
      requestDescription: 'Change request for First Name: from "A" to "B". Reason: typo',
      reason: 'typo',
    } as any);

    expect(saved.status).toBe(ProfileChangeStatus.PENDING);
    expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
  });

  it('getTeamProfiles falls back to department members when no direct reports', async () => {
    employeeProfileModel.find.mockReturnValueOnce(mockQuery([]));
    employeeProfileModel.findById.mockReturnValueOnce({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({ primaryDepartmentId: 'dep1' }),
    });
    employeeProfileModel.find.mockReturnValueOnce(mockQuery([{ _id: 'emp2' }]));

    const result = await service.getTeamProfiles('pos1', 'manager1');
    expect(result).toHaveLength(1);
  });

  it('approveChangeRequest updates status and notifies employee', async () => {
    const requestDoc: any = {
      status: ProfileChangeStatus.PENDING,
      requestDescription: 'Change request for First Name: from "A" to "B". Reason: typo',
      employeeProfileId: { _id: 'emp1' },
      save: jest.fn().mockResolvedValue(true),
    };
    changeRequestModel.findById.mockReturnValue(mockQuery(requestDoc));
    employeeProfileModel.findByIdAndUpdate.mockResolvedValue({});

    const res = await service.approveChangeRequest('req1', 'admin1');
    expect(requestDoc.status).toBe(ProfileChangeStatus.APPROVED);
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(res.message).toMatch(/approved/i);
  });

  it('rejectChangeRequest updates status and notifies employee', async () => {
    const requestDoc: any = {
      status: ProfileChangeStatus.PENDING,
      requestDescription: 'Change request for First Name: from "A" to "B". Reason: typo',
      employeeProfileId: { _id: 'emp1' },
      save: jest.fn().mockResolvedValue(true),
    };
    changeRequestModel.findById.mockReturnValue(mockQuery(requestDoc));

    const res = await service.rejectChangeRequest('req1', 'admin1');
    expect(requestDoc.status).toBe(ProfileChangeStatus.REJECTED);
    expect(notificationService.createNotification).toHaveBeenCalled();
    expect(res.message).toMatch(/rejected/i);
  });

  it('updateEmployeeStatus syncs when status changes', async () => {
    const profile: any = {
      status: EmployeeStatus.ACTIVE,
      save: jest.fn().mockResolvedValue(true),
    };
    employeeProfileModel.findById.mockResolvedValue(profile);
    const syncSpy = jest.spyOn(service as any, 'syncStatusChangeToPayrollAndTimeManagement').mockResolvedValue(true);

    await service.updateEmployeeStatus('emp1', EmployeeStatus.SUSPENDED);
    expect(syncSpy).toHaveBeenCalled();
  });
});
