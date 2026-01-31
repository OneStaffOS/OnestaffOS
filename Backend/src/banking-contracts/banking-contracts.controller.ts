import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { BankingContractsService } from './banking-contracts.service';
import { CreateContractSignedDto } from './dto/create-contract-signed.dto';
import { SubmitCompletionSignedDto } from './dto/submit-completion-signed.dto';
import { SignedActionDto } from './dto/signed-action.dto';
import { ListContractsDto } from './dto/list-contracts.dto';
import { ListTransactionsDto } from './dto/list-transactions.dto';
import { RegisterActorKeyDto } from './dto/register-actor-key.dto';

@Controller('banking-contracts')
@UseGuards(AuthGuard, authorizationGaurd)
export class BankingContractsController {
  constructor(private readonly bankingContractsService: BankingContractsService) {}

  @Post('contracts')
  @Roles(Role.CLIENT, Role.SYSTEM_ADMIN)
  async createContract(@Req() req: Request, @Body() dto: CreateContractSignedDto) {
    return this.bankingContractsService.createContract(
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Get('contracts/my')
  @Roles(Role.CLIENT, Role.SYSTEM_ADMIN)
  async getMyContracts(@Req() req: Request) {
    return this.bankingContractsService.getClientContracts(this.getEmployeeId(req));
  }

  @Post('keys/register')
  @Roles(
    Role.CLIENT,
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.FINANCE_STAFF,
    Role.SYSTEM_ADMIN,
  )
  async registerActorKey(@Req() req: Request, @Body() dto: RegisterActorKeyDto) {
    return this.bankingContractsService.registerActorKey(
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Get('contracts/active')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async getActiveContracts(@Req() req: Request) {
    return this.bankingContractsService.getActiveContractsForEmployee(this.getEmployeeId(req));
  }

  @Get('contracts/department')
  @Roles(Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async getDepartmentContracts(@Req() req: Request, @Query() query: ListContractsDto) {
    return this.bankingContractsService.getDepartmentContracts(
      this.getEmployeeId(req),
      this.getUserRoles(req),
      query,
    );
  }

  @Post('contracts/:id/activate')
  @Roles(Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async activateContract(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SignedActionDto,
  ) {
    return this.bankingContractsService.activateContract(
      id,
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Post('contracts/:id/submit-completion')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async submitCompletion(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SubmitCompletionSignedDto,
  ) {
    return this.bankingContractsService.submitCompletionRequest(
      id,
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Post('contracts/:id/complete')
  @Roles(Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async completeContract(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SignedActionDto,
  ) {
    return this.bankingContractsService.completeContract(
      id,
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Post('contracts/:id/approve')
  @Roles(Role.CLIENT, Role.SYSTEM_ADMIN)
  async approveContract(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: SignedActionDto,
  ) {
    return this.bankingContractsService.approveContract(
      id,
      this.getEmployeeId(req),
      this.getUserRoles(req),
      dto,
    );
  }

  @Get('banking/overview')
  @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
  async getCompanyOverview() {
    return this.bankingContractsService.getCompanyOverview();
  }

  @Get('banking/transactions')
  @Roles(Role.FINANCE_STAFF, Role.SYSTEM_ADMIN)
  async listTransactions(@Query() query: ListTransactionsDto) {
    return this.bankingContractsService.listTransactions(query);
  }

  @Get('employee/balance')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async getEmployeeBalance(@Req() req: Request) {
    return this.bankingContractsService.getEmployeeBalance(this.getEmployeeId(req));
  }

  private getEmployeeId(req: Request) {
    const user = (req as any).user || {};
    return String(user.employeeId || user.sub || user.userId);
  }

  private getUserRoles(req: Request) {
    const user = (req as any).user || {};
    if (Array.isArray(user.roles)) {
      return user.roles;
    }
    if (user.role) {
      return [String(user.role)];
    }
    return [];
  }
}
