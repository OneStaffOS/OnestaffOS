import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';
import { PasskeysService } from '../passkeys/passkeys.service';

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
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly employeeService: EmployeeProfileService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => PasskeysService))
    private readonly passkeysService: PasskeysService,
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

    const isPasswordValid = await bcrypt.compare(password, String(hash));
    if (!isPasswordValid) {
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

    this.logger.log(`[${correlationId}] Sign-in successful for ${email}, MFA required: ${mfaRequired}`);

    return {
      accessToken,
      payload,
      mfaRequired,
    };
  }
}