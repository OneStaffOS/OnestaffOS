import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { BiometricsService } from './biometrics.service';
import { CreateChallengeDto } from './dto/create-challenge.dto';
import { EnrollBiometricsDto } from './dto/enroll-biometrics.dto';
import { VerifyBiometricsDto } from './dto/verify-biometrics.dto';
import { BiometricsChallengeAction } from './models/verification-challenge.schema';

@Controller('biometrics')
@UseGuards(AuthGuard, authorizationGaurd)
export class BiometricsController {
  constructor(private readonly biometricsService: BiometricsService) {}

  @Post('challenge')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_EMPLOYEE,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async createChallenge(@Req() req: Request, @Body() dto: CreateChallengeDto) {
    const action = dto.action || BiometricsChallengeAction.VERIFY;
    const employeeId = (req as any).user?.employeeId || (req as any).user?.sub;
    return this.biometricsService.createChallenge(
      employeeId,
      action,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('enroll')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_EMPLOYEE,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async enroll(@Req() req: Request, @Body() dto: EnrollBiometricsDto) {
    const employeeId = (req as any).user?.employeeId || (req as any).user?.sub;
    return this.biometricsService.enroll(
      employeeId,
      dto.challengeId,
      dto.nonce,
      dto.payload,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('verify')
  @Roles(
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.HR_EMPLOYEE,
    Role.HR_MANAGER,
    Role.HR_ADMIN,
    Role.SYSTEM_ADMIN,
  )
  async verify(@Req() req: Request, @Body() dto: VerifyBiometricsDto) {
    const employeeId = (req as any).user?.employeeId || (req as any).user?.sub;
    return this.biometricsService.verify(
      employeeId,
      dto.challengeId,
      dto.nonce,
      dto.payload,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
