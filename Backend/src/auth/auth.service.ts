import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';
import type { StringValue } from 'ms';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { PasskeysService } from '../passkeys/passkeys.service';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { PasswordService } from '../common/security/password.service';

type SignInPayload = {
  sub: string;
  employeeId?: string;
  email: string;
  roles: string[];
};

type SignInResult = {
  accessToken: string;
  payload: SignInPayload;
  mfaRequired?: boolean;
  adminToken?: string;
  adminPinRequired?: boolean;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly employeeService: EmployeeProfileService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => PasskeysService))
    private readonly passkeysService: PasskeysService,
    private readonly passwordService: PasswordService,
  ) {}

  async signIn(email: string, password: string): Promise<SignInResult> {
    const correlationId = `auth_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(`[${correlationId}] Sign-in attempt for email: ${email}`);

    const user = await this.employeeService.findByEmailForAuth(email);
    if (!user) {
      this.logger.warn(`[${correlationId}] User not found: ${email}`);
      throw new NotFoundException('User not found');
    }

    // Check employee status - only ACTIVE employees can access the system
    const status = (user as any).status;
    if (status && status !== 'ACTIVE') {
      // Return detailed error message with the current status
      const statusMessage = {
        INACTIVE: 'Your account is currently inactive',
        ON_LEAVE: 'Your account is on leave',
        SUSPENDED: 'Your account has been suspended',
        TERMINATED: 'Your account has been terminated',
        RETIRED: 'Your account is marked as retired',
        PROBATION: 'Your account is in probation status'
      }[status] || 'Your account is not active';
      
      this.logger.warn(`[${correlationId}] Account status blocked: ${status}`);
      throw new UnauthorizedException(
        `${statusMessage}. You are not allowed to access the system. If you believe this is a mistake, please contact your line manager or IT department. (Status: ${status})`
      );
    }

    if (!password) {
      this.logger.warn(`[${correlationId}] Missing password`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash: string | undefined =
      (user as any).passwordHash || (user as any).password;

    if (!hash) {
      this.logger.warn(`[${correlationId}] No password hash found`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordAlgo = (user as any).passwordAlgo;
    const passwordVerify = await this.passwordService.verifyPassword(
      password,
      String(hash),
      passwordAlgo,
    );
    if (!passwordVerify.valid) {
      this.logger.warn(`[${correlationId}] Invalid password`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles from accessProfileId if populated
    let roles: string[] = [];
    const accessProfile = (user as any).accessProfileId;
    
    if (accessProfile && typeof accessProfile === 'object' && Array.isArray(accessProfile.roles)) {
      roles = accessProfile.roles.filter((role: any) => role); // Filter out null/undefined
    }

    const employeeId = String((user as any)._id as Types.ObjectId);

    if (passwordVerify.needsRehash) {
      try {
        const upgraded = await this.passwordService.hashPassword(password);
        await this.employeeService.updatePasswordHashForAuth(
          employeeId,
          upgraded.hash,
          upgraded.algorithm,
          upgraded.updatedAt,
        );
        this.logger.log(`[${correlationId}] Password hash upgraded to Argon2id`);
      } catch (error) {
        this.logger.warn(
          `[${correlationId}] Password upgrade failed, continuing login: ${(error as Error).message}`,
        );
      }
    }

    const isSystemAdmin = roles.includes(Role.SYSTEM_ADMIN);
    const pinHash = (user as any).adminPinHash;
    const adminPinRequired = isSystemAdmin;

    if (isSystemAdmin && !pinHash) {
      throw new UnauthorizedException('Admin PIN is not set. Please create one in the admin dashboard.');
    }

    // Check if user has MFA enabled (has registered passkeys)
    let mfaRequired = false;
    try {
      mfaRequired = await this.passkeysService.hasPasskeys(employeeId);
      this.logger.log(`[${correlationId}] MFA check - Employee ${employeeId} has passkeys: ${mfaRequired}`);
    } catch (error) {
      this.logger.warn(`[${correlationId}] MFA check failed, continuing without MFA: ${(error as Error).message}`);
    }

    const payload: SignInPayload = {
      sub: employeeId,
      employeeId: employeeId,
      email: (user as any).personalEmail || (user as any).workEmail || email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    let adminToken: string | undefined;

    this.logger.log(`[${correlationId}] Sign-in successful for ${email}, MFA required: ${mfaRequired}`);

    return {
      accessToken,
      payload,
      mfaRequired,
      ...(adminPinRequired ? { adminPinRequired: true } : {}),
    };
  }

  async signInWithGoogle(email: string): Promise<SignInResult> {
    const correlationId = `auth_google_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.logger.log(`[${correlationId}] Google sign-in attempt for email: ${email}`);

    const user = await this.employeeService.findByEmailForAuth(email);
    if (!user) {
      this.logger.warn(`[${correlationId}] User not found: ${email}`);
      throw new NotFoundException('User not found');
    }

    const status = (user as any).status;
    if (status && status !== 'ACTIVE') {
      const statusMessage = {
        INACTIVE: 'Your account is currently inactive',
        ON_LEAVE: 'Your account is on leave',
        SUSPENDED: 'Your account has been suspended',
        TERMINATED: 'Your account has been terminated',
        RETIRED: 'Your account is marked as retired',
        PROBATION: 'Your account is in probation status'
      }[status] || 'Your account is not active';
      
      this.logger.warn(`[${correlationId}] Account status blocked: ${status}`);
      throw new UnauthorizedException(
        `${statusMessage}. You are not allowed to access the system. If you believe this is a mistake, please contact your line manager or IT department. (Status: ${status})`
      );
    }

    const employeeId = String((user as any)._id as Types.ObjectId);

    if (!(user as any).googleAccountEmail || !(user as any).workEmail) {
      const updatePayload: Record<string, string> = {};
      if (!(user as any).googleAccountEmail) {
        updatePayload.googleAccountEmail = email;
      }
      if (!(user as any).workEmail) {
        updatePayload.workEmail = email;
      }
      if (Object.keys(updatePayload).length > 0) {
        await this.employeeService.patchEmployeeProfile(employeeId, updatePayload);
      }
    }

    let roles: string[] = [];
    const accessProfile = (user as any).accessProfileId;
    
    if (accessProfile && typeof accessProfile === 'object' && Array.isArray(accessProfile.roles)) {
      roles = accessProfile.roles.filter((role: any) => role);
    }

    const payload: SignInPayload = {
      sub: employeeId,
      employeeId: employeeId,
      email: (user as any).personalEmail || (user as any).workEmail || email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    const isSystemAdmin = roles.includes(Role.SYSTEM_ADMIN);
    const adminPinRequired = isSystemAdmin;

    this.logger.log(`[${correlationId}] Google sign-in successful for ${email}`);

    return {
      accessToken,
      payload,
      mfaRequired: false,
      ...(adminPinRequired ? { adminPinRequired: true } : {}),
    };
  }

  async verifyAdminPin(employeeId: string, adminPin: string): Promise<string> {
    const profile = await this.employeeService.getEmployeeProfileById(employeeId);
    const pinHash = (profile as any).adminPinHash;
    if (!pinHash) {
      throw new UnauthorizedException('Admin PIN is not set. Please create one in the admin dashboard.');
    }

    const pinVerify = await this.passwordService.verifyPassword(
      adminPin,
      String(pinHash),
      undefined,
    );
    const pinValid = pinVerify.valid;
    if (!pinValid) {
      throw new UnauthorizedException('Invalid Admin PIN');
    }

    if (pinVerify.needsRehash) {
      try {
        const upgraded = await this.passwordService.hashPassword(adminPin);
        await this.employeeService.updateAdminPinHashForAuth(
          employeeId,
          upgraded.hash,
        );
        this.logger.log(`[admin_pin] Admin PIN hash upgraded to Argon2id`);
      } catch (error) {
        this.logger.warn(
          `[admin_pin] Admin PIN upgrade failed, continuing: ${(error as Error).message}`,
        );
      }
    }

    const expiresIn = ('24h') as StringValue;
    const secret = process.env.ADMIN_JWT_SECRET;
    if (!secret) {
      throw new UnauthorizedException('Admin token secret not configured');
    }

    const adminToken = await this.jwtService.signAsync(
      { sub: employeeId, type: 'admin' },
      { secret, expiresIn },
    );
    return adminToken;
  }
}
