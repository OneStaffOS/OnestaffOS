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

    // Enforce active status
    const status = (user as any).employment?.status;
    if (status && status !== 'Active') {
      throw new UnauthorizedException('Account is not active');
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