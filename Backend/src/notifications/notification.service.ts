import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationStatus } from './models/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { EmployeeProfile } from '../employee-profile/models/employee-profile.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class NotificationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationService.name);
  private intervalHandle: any;

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfile>,
    private readonly auditService: AuditService,
  ) {}

  async createNotification(createdByEmployeeId: string, dto: CreateNotificationDto) {
    // Handle system notifications - use the actual system user ID
    const createdBy = (createdByEmployeeId?.toLowerCase() === 'system') 
      ? new Types.ObjectId('692a056cfad7d194cd3f0992') 
      : new Types.ObjectId(createdByEmployeeId);
    
    const doc = new this.notificationModel({
      _id: new Types.ObjectId(),
      title: dto.title,
      message: dto.message,
      createdByEmployeeId: createdBy,
      targetRole: dto.targetRole || 'ALL',
      targetEmployeeIds: (dto.targetEmployeeIds || []).map(id => new Types.ObjectId(id)),
      targetDepartmentIds: (dto.targetDepartmentIds || []).map(id => new Types.ObjectId(id)),
      targetPositionIds: (dto.targetPositionIds || []).map(id => new Types.ObjectId(id)),
      sendAt: dto.sendAt ? new Date(dto.sendAt) : new Date(),
      // Mark as SENT immediately so newly created notifications appear in inbox
      status: NotificationStatus.SENT,
    });

    // If sendAt is now or in the past, mark ready to send
    if (!doc.sendAt || doc.sendAt <= new Date()) {
      doc.sendAt = new Date();
    }

    const saved = await doc.save();

    // If sendAt is immediate, attempt to send now via sendNotification
    if (saved.sendAt && saved.sendAt <= new Date()) {
      // fire-and-forget
      this.sendNotification(saved._id.toString()).catch(err =>
        this.logger.error('Failed to deliver notification immediately', err?.message || err),
      );
    }

    return saved;
  }

  async sendNotification(notificationId: string) {
    const n = await this.notificationModel.findById(notificationId).exec();
    if (!n) return;
    if (n.status === NotificationStatus.SENT) return;

    // Resolve recipients based on targets
    let recipients: Types.ObjectId[] = [];

    // explicit employee ids first
    let resolutionSource = '';
    if (n.targetEmployeeIds && n.targetEmployeeIds.length > 0) {
      recipients = n.targetEmployeeIds as Types.ObjectId[];
      resolutionSource = 'explicit-employee-ids';
    }

    // department targeting
    if ((!recipients || recipients.length === 0) && n.targetDepartmentIds && n.targetDepartmentIds.length > 0) {
      const emps = await this.employeeProfileModel.find({ primaryDepartmentId: { $in: n.targetDepartmentIds } }).select('_id').exec();
      recipients = emps.map(e => e._id as Types.ObjectId);
      if (recipients.length > 0) resolutionSource = 'department';
    }

    // position targeting
    if ((!recipients || recipients.length === 0) && n.targetPositionIds && n.targetPositionIds.length > 0) {
      const emps = await this.employeeProfileModel.find({ primaryPositionId: { $in: n.targetPositionIds } }).select('_id').exec();
      recipients = emps.map(e => e._id as Types.ObjectId);
      if (recipients.length > 0) resolutionSource = 'position';
    }

    // role targeting
    if ((!recipients || recipients.length === 0) && n.targetRole) {
      if (n.targetRole === 'ALL') {
        const emps = await this.employeeProfileModel.find({ status: 'ACTIVE' }).select('_id').exec();
        recipients = emps.map(e => e._id as Types.ObjectId);
        if (recipients.length > 0) resolutionSource = 'role-all';
      } else {
        // match role string in roles array if present
        const emps = await this.employeeProfileModel.find({ roles: n.targetRole }).select('_id').exec();
        recipients = emps.map(e => e._id as Types.ObjectId);
        if (recipients.length > 0) resolutionSource = 'role-specific';
      }
    }

    // Final fallback: if still no recipients but targetRole explicitly set to ALL, ensure we try to include all active employees
    if ((!recipients || recipients.length === 0) && n.targetRole === 'ALL') {
      this.logger.log(`Fallback: resolving ALL employees for notification ${n._id}`);
      const emps = await this.employeeProfileModel.find({ status: 'ACTIVE' }).select('_id').exec();
      recipients = emps.map(e => e._id as Types.ObjectId);
      if (recipients.length > 0) resolutionSource = 'role-all-fallback';
    }

    // Ensure uniqueness
    const uniqueStrs = Array.from(new Set((recipients || []).map(r => r.toString())));
    recipients = uniqueStrs.map(s => new Types.ObjectId(s));

    if (!recipients || recipients.length === 0) {
      this.logger.warn(`Notification ${n._id} resolved to 0 recipients (source=${resolutionSource || 'none'})`);
    } else {
      this.logger.log(`Notification ${n._id} resolved to ${recipients.length} recipients (source=${resolutionSource || 'unknown'})`);
    }

    n.recipients = recipients;
    n.status = NotificationStatus.SENT;
    (n as any).sentAt = new Date();
    await n.save();

    // In a real system we'd push to email/sms/push providers here.
    this.logger.log(`Notification ${n._id} sent to ${recipients.length} recipients`);

    // record delivery in audit logs
    try {
      const recIds = recipients.map(r => r.toString());
      await this.auditService.recordNotificationDelivery(n._id.toString(), recIds, (n.createdByEmployeeId || '').toString());
    } catch (err) {
      this.logger.error('Failed to record notification delivery audit', err?.message || err);
    }
  }

  async getMyNotifications(employeeId: string, departmentId?: string, positionId?: string) {
    const conds: any[] = [];

    // If departmentId or positionId not provided via token, try to load from employee profile
    if ((!departmentId || !positionId) && employeeId) {
      try {
        const profile = await this.employeeProfileModel.findById(new Types.ObjectId(employeeId)).select('primaryDepartmentId primaryPositionId').exec();
        if (profile) {
          if (!departmentId && profile.primaryDepartmentId) {
            departmentId = (profile.primaryDepartmentId as any).toString();
          }
          if (!positionId && profile.primaryPositionId) {
            positionId = (profile.primaryPositionId as any).toString();
          }
        } else {
        }
      } catch (err) {
      }
    }
    try {
      if (employeeId) {
        conds.push({ recipients: new Types.ObjectId(employeeId) });
        conds.push({ targetEmployeeIds: new Types.ObjectId(employeeId) });
      }
    } catch (err) {
      // invalid employee id; ignore
    }

    try {
      if (departmentId) {
        conds.push({ targetDepartmentIds: new Types.ObjectId(departmentId) });
      }
    } catch (err) {
      // ignore invalid department id
    }

    try {
      if (positionId) {
        conds.push({ targetPositionIds: new Types.ObjectId(positionId) });
      }
    } catch (err) {
      // ignore invalid position id
    }

    // If no conditions could be built, return nothing
    if (conds.length === 0) {
      return [];
    }

    const results = await this.notificationModel
      .find({ status: NotificationStatus.SENT, $or: conds })
      .sort({ createdAt: -1 })
      .exec();

    // do not emit debug/verbose logs here to avoid sensitive info in production

    return results;
  }

  /**
   * Manager inbox: include both SENT and pending announcements that target
   * the manager by recipient, employee, department or position. This allows
   * department heads to see scheduled/just-created announcements before the
   * scheduler has marked them SENT.
   */
  async getManagerNotifications(employeeId: string, departmentId?: string, positionId?: string) {
    const conds: any[] = [];

    // Try to load profile if missing identifiers
    if ((!departmentId || !positionId) && employeeId) {
      try {
        const profile = await this.employeeProfileModel.findById(new Types.ObjectId(employeeId)).select('primaryDepartmentId primaryPositionId').exec();
        if (profile) {
          if (!departmentId && profile.primaryDepartmentId) departmentId = (profile.primaryDepartmentId as any).toString();
          if (!positionId && profile.primaryPositionId) positionId = (profile.primaryPositionId as any).toString();
        }
      } catch (err) {
        // ignore
      }
    }

    try {
      if (employeeId) {
        conds.push({ recipients: new Types.ObjectId(employeeId) });
        conds.push({ targetEmployeeIds: new Types.ObjectId(employeeId) });
      }
    } catch (err) {}

    try {
      if (departmentId) conds.push({ targetDepartmentIds: new Types.ObjectId(departmentId) });
    } catch (err) {}

    try {
      if (positionId) conds.push({ targetPositionIds: new Types.ObjectId(positionId) });
    } catch (err) {}

    if (conds.length === 0) return [];

    const results = await this.notificationModel
      .find({ status: { $in: [NotificationStatus.SENT, NotificationStatus.PENDING] }, $or: conds })
      .sort({ createdAt: -1 })
      .exec();

    return results;
  }

  async markRead(notificationId: string, employeeId: string) {
    const n = await this.notificationModel.findById(notificationId).exec();
    if (!n) return null;

    const exists = (n.readBy || []).some(r => (r.employeeId as any).toString() === employeeId);
    if (!exists) {
      n.readBy.push({ employeeId: new Types.ObjectId(employeeId), readAt: new Date() } as any);
      await n.save();
    }

    return n;
  }

  async archiveForUser(notificationId: string, employeeId: string) {
    const n = await this.notificationModel.findById(notificationId).exec();
    if (!n) return null;
    if (!n.archivedBy) n.archivedBy = [];
    if (!n.archivedBy.map(id => id.toString()).includes(employeeId)) {
      n.archivedBy.push(new Types.ObjectId(employeeId));
      await n.save();
    }
    return n;
  }

  async listPending() {
    return await this.notificationModel.find({ status: NotificationStatus.PENDING }).sort({ sendAt: 1 }).exec();
  }

  // Simple scheduler: poll every 30s for due notifications and send them
  onModuleInit() {
    this.logger.log('NotificationService scheduler starting');
    this.intervalHandle = setInterval(async () => {
      try {
        const now = new Date();
        const due = await this.notificationModel.find({ status: NotificationStatus.PENDING, sendAt: { $lte: now } }).select('_id').exec();
        for (const d of due) {
          await this.sendNotification(d._id.toString());
        }
      } catch (err) {
        this.logger.error('Scheduler error', err?.message || err);
      }
    }, 30 * 1000);
  }

  onModuleDestroy() {
    if (this.intervalHandle) clearInterval(this.intervalHandle);
  }
}
