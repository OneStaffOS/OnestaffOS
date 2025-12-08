import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';

type SignInPayload = {
  sub: string;
  employeeId?: string;
  email: string;
  roles: string[];
};

type SignInResult = {
  accessToken: string;
  payload: SignInPayload;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly employeeService: EmployeeProfileService,
    private readonly jwtService: JwtService,
  ) {}

  async signIn(email: string, password: string): Promise<SignInResult> {
    const user = await this.employeeService.findByEmailForAuth(email);
    if (!user) {
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
      
      throw new UnauthorizedException(
        `${statusMessage}. You are not allowed to access the system. If you believe this is a mistake, please contact your line manager or IT department. (Status: ${status})`
      );
    }

    if (!password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const hash: string | undefined =
      (user as any).passwordHash || (user as any).password;

    if (!hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, String(hash));
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles from accessProfileId if populated
    let roles: string[] = [];
    const accessProfile = (user as any).accessProfileId;
    
    if (accessProfile && typeof accessProfile === 'object' && Array.isArray(accessProfile.roles)) {
      roles = accessProfile.roles.filter((role: any) => role); // Filter out null/undefined
    }

    const payload: SignInPayload = {
      sub: String((user as any)._id as Types.ObjectId),
      employeeId: String((user as any)._id as Types.ObjectId),
      email: (user as any).personalEmail || (user as any).workEmail || email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      payload,
    };
  }
}