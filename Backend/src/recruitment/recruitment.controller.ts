import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { RecruitmentService } from './recruitment.service';
import { CreateJobTemplateDto } from './dto/create-job-template.dto';
import { CreateJobRequisitionDto } from './dto/create-job-requisition.dto';
import { PublishJobDto } from './dto/publish-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';

@Controller('recruitment')
@UseGuards(AuthGuard, authorizationGaurd)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  // ==================== JOB TEMPLATES ====================

  @Post('job-templates')
  @Roles(Role.HR_MANAGER)
  async createJobTemplate(@Body() dto: CreateJobTemplateDto) {
    return this.recruitmentService.createJobTemplate(dto);
  }

  @Get('job-templates')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async findAllJobTemplates() {
    return this.recruitmentService.findAllJobTemplates();
  }

  @Get('job-templates/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async findJobTemplateById(@Param('id') id: string) {
    return this.recruitmentService.findJobTemplateById(id);
  }

  @Put('job-templates/:id')
  @Roles(Role.HR_MANAGER)
  async updateJobTemplate(
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobTemplateDto>,
  ) {
    return this.recruitmentService.updateJobTemplate(id, dto);
  }

  @Delete('job-templates/:id')
  @Roles(Role.HR_MANAGER)
  async deleteJobTemplate(@Param('id') id: string) {
    return this.recruitmentService.deleteJobTemplate(id);
  }

  // ==================== JOB REQUISITIONS ====================

  @Post('job-requisitions')
  @Roles(Role.HR_MANAGER)
  async createJobRequisition(@Body() dto: CreateJobRequisitionDto) {
    return this.recruitmentService.createJobRequisition(dto);
  }

  @Get('job-requisitions/published')
  @Roles(
    Role.HR_EMPLOYEE,
    Role.HR_MANAGER,
    Role.JOB_CANDIDATE,
    Role.DEPARTMENT_EMPLOYEE,
    Role.DEPARTMENT_HEAD,
    Role.PAYROLL_SPECIALIST,
    Role.PAYROLL_MANAGER,
    Role.SYSTEM_ADMIN,
    Role.LEGAL_POLICY_ADMIN,
    Role.RECRUITER,
    Role.FINANCE_STAFF,
    Role.HR_ADMIN
  )
  async getPublishedJobsPublic() {
    return this.recruitmentService.getPublishedJobs();
  }

  @Get('job-requisitions')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async findAllJobRequisitions() {
    return this.recruitmentService.findAllJobRequisitions();
  }

  @Get('job-requisitions/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async findJobRequisitionById(@Param('id') id: string) {
    return this.recruitmentService.findJobRequisitionById(id);
  }

  @Put('job-requisitions/:id')
  @Roles(Role.HR_MANAGER)
  async updateJobRequisition(
    @Param('id') id: string,
    @Body() dto: Partial<CreateJobRequisitionDto>,
  ) {
    return this.recruitmentService.updateJobRequisition(id, dto);
  }

  @Patch('job-requisitions/:id/publish')
  @Roles(Role.HR_EMPLOYEE, Role.HR_MANAGER)
  async publishJobRequisition(
    @Param('id') id: string,
    @Body() dto: PublishJobDto,
  ) {
    return this.recruitmentService.publishJobRequisition(id, dto);
  }

  @Delete('job-requisitions/:id')
  @Roles(Role.HR_MANAGER)
  async deleteJobRequisition(@Param('id') id: string) {
    return this.recruitmentService.deleteJobRequisition(id);
  }

  @Get('published-jobs')
  @Roles(Role.HR_EMPLOYEE, Role.HR_MANAGER)
  async getPublishedJobs() {
    return this.recruitmentService.getPublishedJobs();
  }

  // ==================== APPLICATIONS ====================

  @Post('applications')
  @Roles(Role.JOB_CANDIDATE)
  @UseInterceptors(
    FileInterceptor('cv', {
      storage: diskStorage({
        destination: './uploads/cvs',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `cv-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = /pdf|doc|docx/;
        const ext = extname(file.originalname).toLowerCase().substring(1);
        if (allowedExtensions.test(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
      },
    }),
  )
  async createApplication(
    @Body() dto: CreateApplicationDto,
    @UploadedFile() cvFile: Express.Multer.File,
  ) {
    if (!cvFile) {
      throw new BadRequestException('CV file is required');
    }
    return this.recruitmentService.createApplication(dto, cvFile);
  }
}
