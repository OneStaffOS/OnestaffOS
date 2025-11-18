import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { EmployeeService } from '../employee/employee.service';

type SignInPayload = {
  sub: string;
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
    private readonly employeeService: EmployeeService,
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

    const roles: string[] = Array.isArray((user as any).roles)
      ? (user as any).roles
      : (user as any).roles
      ? [String((user as any).roles)]
      : [];

    const payload: SignInPayload = {
      sub: String((user as any)._id as Types.ObjectId),
      email: (user as any).email,
      roles,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      payload,
    };
  }
}