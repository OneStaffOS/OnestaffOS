/**
 * PasskeysController
 * REST API endpoints for WebAuthn/FIDO2 passkey management
 * 
 * Endpoints:
 * - GET  /passkeys           - List user's passkeys
 * - POST /passkeys/register/options - Start registration
 * - POST /passkeys/register/verify  - Complete registration
 * - POST /passkeys/authenticate/options - Start MFA authentication
 * - POST /passkeys/authenticate/verify  - Complete MFA authentication
 * - PATCH /passkeys/:id/rename - Rename a passkey
 * - DELETE /passkeys/:id - Delete a passkey
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PasskeysService } from './passkeys.service';
import {
  StartRegistrationDto,
  VerifyRegistrationDto,
  StartAuthenticationDto,
  VerifyAuthenticationDto,
  RenamePasskeyDto,
} from './dto/passkey.dto';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../common/guards/csrf.guard';
import { EmployeeProfileService } from '../employee-profile/employee-profile.service';

// Type for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    sub: string;
    employeeId?: string;
    email: string;
    roles: string[];
  };
}

@Controller('passkeys')
export class PasskeysController {
  private readonly logger = new Logger(PasskeysController.name);

  constructor(
    private readonly passkeysService: PasskeysService,
    private readonly employeeProfileService: EmployeeProfileService,
  ) {}

  /**
   * Get all passkeys for the authenticated user
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getPasskeys(@Req() req: AuthenticatedRequest) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`Getting passkeys for employee: ${employeeId}`);
    const passkeys = await this.passkeysService.getPasskeys(employeeId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Passkeys retrieved successfully',
      data: passkeys,
    };
  }

  /**
   * Check if user has any registered passkeys
   */
  @Get('status')
  @HttpCode(HttpStatus.OK)
  async getPasskeyStatus(@Req() req: AuthenticatedRequest) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User not authenticated');
    }

    const hasPasskeys = await this.passkeysService.hasPasskeys(employeeId);
    const passkeys = await this.passkeysService.getPasskeys(employeeId);

    return {
      statusCode: HttpStatus.OK,
      data: {
        mfaEnabled: hasPasskeys,
        passkeyCount: passkeys.filter(p => p.isActive).length,
      },
    };
  }

  /**
   * Start passkey registration - generate options
   */
  @Post('register/options')
  @HttpCode(HttpStatus.OK)
  async startRegistration(
    @Req() req: AuthenticatedRequest,
    @Body() dto: StartRegistrationDto,
  ) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    const email = req.user?.email;

    if (!employeeId || !email) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`Starting passkey registration for employee: ${employeeId}`);

    // Get employee display name
    let displayName = email;
    try {
      const employee = await this.employeeProfileService.getMyProfile(employeeId);
      if (employee) {
        displayName = `${(employee as any).firstName || ''} ${(employee as any).lastName || ''}`.trim() || email;
      }
    } catch {
      // Use email as fallback
    }

    const result = await this.passkeysService.generateRegistrationOptions(
      employeeId,
      email,
      displayName,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Registration options generated',
      ...result,
    };
  }

  /**
   * Complete passkey registration - verify attestation
   */
  @Post('register/verify')
  @HttpCode(HttpStatus.OK)
  async verifyRegistration(
    @Req() req: AuthenticatedRequest,
    @Body() dto: VerifyRegistrationDto,
  ) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`Verifying passkey registration for employee: ${employeeId}`);

    const result = await this.passkeysService.verifyRegistration(
      employeeId,
      dto,
      dto.deviceName,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Passkey registered successfully',
      ...result,
    };
  }

  /**
   * Start MFA authentication - generate options
   * This is PUBLIC because it's called during the login flow before full authentication
   */
  @Public()
  @SkipCsrf()
  @Post('authenticate/options')
  @HttpCode(HttpStatus.OK)
  async startAuthentication(@Body() dto: StartAuthenticationDto) {
    this.logger.log(`Starting passkey authentication for email: ${dto.email}`);

    // Find employee by email
    const employee = await this.employeeProfileService.findByEmailForAuth(dto.email);
    if (!employee) {
      // Don't reveal if user exists
      throw new BadRequestException('Unable to start authentication');
    }

    const employeeId = (employee as any)._id.toString();

    // Check if user has passkeys
    const hasPasskeys = await this.passkeysService.hasPasskeys(employeeId);
    if (!hasPasskeys) {
      return {
        statusCode: HttpStatus.OK,
        message: 'MFA not required',
        mfaRequired: false,
      };
    }

    const result = await this.passkeysService.generateAuthenticationOptions(employeeId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Authentication options generated',
      mfaRequired: true,
      ...result,
    };
  }

  /**
   * Complete MFA authentication - verify assertion
   * This is PUBLIC because it's called during the login flow
   */
  @Public()
  @SkipCsrf()
  @Post('authenticate/verify')
  @HttpCode(HttpStatus.OK)
  async verifyAuthentication(@Body() dto: VerifyAuthenticationDto) {
    this.logger.log(`Verifying passkey authentication for email: ${dto.email}`);

    // Find employee by email
    const employee = await this.employeeProfileService.findByEmailForAuth(dto.email);
    if (!employee) {
      throw new BadRequestException('Unable to verify authentication');
    }

    const employeeId = (employee as any)._id.toString();

    const result = await this.passkeysService.verifyAuthentication(employeeId, dto);

    return {
      statusCode: HttpStatus.OK,
      message: 'MFA verification successful',
      ...result,
    };
  }

  /**
   * Rename a passkey
   */
  @Patch(':id/rename')
  @HttpCode(HttpStatus.OK)
  async renamePasskey(
    @Req() req: AuthenticatedRequest,
    @Param('id') passkeyId: string,
    @Body() dto: RenamePasskeyDto,
  ) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`Renaming passkey ${passkeyId} for employee: ${employeeId}`);

    const passkey = await this.passkeysService.renamePasskey(
      employeeId,
      passkeyId,
      dto.deviceName,
    );

    return {
      statusCode: HttpStatus.OK,
      message: 'Passkey renamed successfully',
      data: passkey,
    };
  }

  /**
   * Delete a passkey
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async deletePasskey(
    @Req() req: AuthenticatedRequest,
    @Param('id') passkeyId: string,
  ) {
    const employeeId = req.user?.sub || req.user?.employeeId;
    if (!employeeId) {
      throw new BadRequestException('User not authenticated');
    }

    this.logger.log(`Deleting passkey ${passkeyId} for employee: ${employeeId}`);

    await this.passkeysService.deletePasskey(employeeId, passkeyId);

    return {
      statusCode: HttpStatus.OK,
      message: 'Passkey deleted successfully',
    };
  }
}
