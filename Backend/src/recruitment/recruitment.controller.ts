import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecruitmentService } from './recruitment.service';
import { CreateJobTemplateDto } from './dto/create-job-template.dto';
import { CreateJobRequisitionDto } from './dto/create-job-requisition.dto';
import { PublishJobDto } from './dto/publish-job.dto';
import { UpdateApplicationStageDto } from './dto/update-application-stage.dto';
import { NotifyCandidateStatusDto } from './dto/notify-candidate-status.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { AuthGuard } from '../auth/middleware/authentication.middleware';
import { authorizationGaurd } from '../auth/middleware/authorization.middleware';
import { Roles, Role } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('recruitment')
@UseGuards(AuthGuard, authorizationGaurd)
export class RecruitmentController {
  constructor(
    private readonly recruitmentService: RecruitmentService,
  ) {}

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

  @Get('applications')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async getAllApplications() {
    return this.recruitmentService.getAllApplications();
  }

  @Post('applications')
  @Public()
  @UseInterceptors(
    FileInterceptor('cv', {
      fileFilter: (req, file, callback) => {
        const allowedMimeTypes = [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('Only PDF, DOC, and DOCX files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async createApplication(
    @UploadedFile() cvFile: Express.Multer.File,
    @Body('candidateId') candidateId: string,
    @Body('requisitionId') requisitionId: string,
    @Body('coverLetter') coverLetter?: string,
  ) {
    // Validate required fields
    if (!candidateId || !requisitionId || !cvFile) {
      throw new BadRequestException('candidateId, requisitionId, and cv file are required');
    }

    // Validate MongoDB IDs
    if (!candidateId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid candidateId');
    }
    if (!requisitionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid requisitionId');
    }

    return this.recruitmentService.createApplication(
      {
        candidateId,
        requisitionId,
        coverLetter,
      },
      cvFile,
    );
  }

  // ==================== APPLICATION STATUS MANAGEMENT ====================

  @Patch('applications/:id/status')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStageDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.updateApplicationStatus(id, dto, userId);
  }

  @Post('applications/:id/notify')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async notifyCandidate(
    @Param('id') id: string,
    @Body() dto: NotifyCandidateStatusDto,
  ) {
    await this.recruitmentService.sendCustomNotificationToCandidate(id, dto);
    return { success: true, message: 'Notification sent to candidate' };
  }

  @Get('applications/candidate/:candidateId')
  @Public()
  async getCandidateApplications(@Param('candidateId') candidateId: string) {
    return this.recruitmentService.getCandidateApplications(candidateId);
  }

  @Get('applications/my-applications')
  @Roles(Role.JOB_CANDIDATE)
  async getMyApplications(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.getMyApplications(userId);
  }

  @Get('applications/:id/history')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER, Role.JOB_CANDIDATE)
  async getApplicationHistory(@Param('id') id: string) {
    return this.recruitmentService.getApplicationHistory(id);
  }

  // ==================== APPLICATION REJECTION ====================

  @Post('applications/:id/reject')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async rejectApplication(
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.rejectApplication(id, dto, userId);
  }

  @Post('applications/bulk-reject')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async bulkRejectApplications(
    @Body() body: { applicationIds: string[]; rejection: RejectApplicationDto },
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.bulkRejectApplications(
      body.applicationIds,
      body.rejection,
      userId,
    );
  }

  // ==================== INTERVIEW SCHEDULING ====================

  @Post('applications/:id/schedule-interview')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async scheduleInterviewSlots(
    @Param('id') id: string,
    @Body() body: {
      stage: string;
      method: string;
      timeSlots: string[];
      panel?: string[];
      videoLink?: string;
    },
  ) {
    return this.recruitmentService.scheduleInterviewSlots(id, {
      stage: body.stage as any,
      method: body.method as any,
      timeSlots: body.timeSlots.map(slot => new Date(slot)),
      panel: body.panel,
      videoLink: body.videoLink,
    });
  }

  @Get('applications/:id/interviews')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER, Role.JOB_CANDIDATE)
  async getApplicationInterviews(@Param('id') id: string) {
    return this.recruitmentService.getApplicationInterviews(id);
  }

  @Post('interviews/:id/confirm')
  async confirmInterviewSlot(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const candidateId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.confirmInterviewSlot(id, candidateId);
  }

  @Post('interviews/:id/feedback')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async provideInterviewFeedback(
    @Param('id') id: string,
    @Body() body: { score: number; comments?: string },
    @Request() req: any,
  ) {
    const interviewerId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.provideInterviewFeedback(id, interviewerId, body);
  }

  @Get('interviews/:id/feedback')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async getInterviewFeedback(@Param('id') id: string) {
    return this.recruitmentService.getInterviewFeedback(id);
  }

  @Get('applications/:id/interviews-with-feedback')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.RECRUITER)
  async getApplicationInterviewsWithFeedback(@Param('id') id: string) {
    return this.recruitmentService.getApplicationInterviewsWithFeedback(id);
  }

  // ==================== REFERRAL MANAGEMENT ====================

  @Post('applications/:id/tag-referral')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async tagCandidateAsReferral(
    @Param('id') applicationId: string,
    @Body() body: { referringEmployeeId?: string; role?: string; level?: string },
    @Request() req: any,
  ) {
    const referringEmployeeId = body.referringEmployeeId || req.user?.userId || req.user?.sub;
    
    return this.recruitmentService.tagCandidateAsReferral(
      applicationId,
      referringEmployeeId,
      body.role,
      body.level
    );
  }

  @Delete('applications/:id/referral-tag')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async removeReferralTag(@Param('id') applicationId: string) {
    return this.recruitmentService.removeReferralTag(applicationId);
  }

  @Get('applications/:id/referral-info')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async getReferralInfo(@Param('id') applicationId: string) {
    return this.recruitmentService.getReferralInfo(applicationId);
  }

  // ==================== JOB OFFERS ====================

  @Post('offers')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async createOffer(
    @Body() dto: any,
    @Request() req: any,
  ) {
    const hrEmployeeId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.createOffer(dto, hrEmployeeId);
  }

  @Get('offers')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async getAllOffers() {
    return this.recruitmentService.getAllOffers();
  }

  @Get('offers/pending')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async getPendingOffers() {
    return this.recruitmentService.getPendingOffers();
  }

  @Get('offers/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async getOfferById(@Param('id') id: string) {
    return this.recruitmentService.getOfferById(id);
  }

  @Get('candidates/:candidateId/offers')
  async getOffersByCandidate(
    @Param('candidateId') candidateId: string,
    @Request() req: any,
  ) {
    // Verify candidate is the logged-in user or HR/Manager
    const userId = req.user?.userId || req.user?.sub;
    const userRoles = req.user?.roles || [];
    
    if (userId !== candidateId && !userRoles.some((r: string) => 
      [Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.SYSTEM_ADMIN].includes(r as Role)
    )) {
      throw new BadRequestException('Access denied');
    }

    return this.recruitmentService.getOffersByCandidate(candidateId);
  }

  @Post('offers/:id/approve')
  @Roles(Role.HR_MANAGER, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async approveOffer(
    @Param('id') offerId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    const employeeId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.processOfferApproval(offerId, employeeId, dto);
  }

  @Post('offers/:id/respond')
  async respondToOffer(
    @Param('id') offerId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    const candidateId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.respondToOffer(offerId, candidateId, dto);
  }

  @Put('offers/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async updateOffer(
    @Param('id') offerId: string,
    @Body() updates: any,
  ) {
    return this.recruitmentService.updateOffer(offerId, updates);
  }

  @Delete('offers/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async deleteOffer(@Param('id') offerId: string) {
    return this.recruitmentService.deleteOffer(offerId);
  }

  @Post('offers/:id/generate-letter')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async generateOfferLetter(
    @Param('id') offerId: string,
    @Request() req: any,
  ) {
    const hrEmployeeId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.generateOfferLetter(offerId, hrEmployeeId);
  }

  @Post('offers/:id/send-for-signature')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async sendOfferForSignature(
    @Param('id') offerId: string,
    @Body('message') message: string,
    @Request() req: any,
  ) {
    const hrEmployeeId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.sendOfferForSignature(offerId, hrEmployeeId, message);
  }

  @Post('offers/:id/sign')
  async signOffer(
    @Param('id') offerId: string,
    @Body('signature') signature: string,
    @Body('signedDate') signedDate: Date,
    @Request() req: any,
  ) {
    const candidateId = req.user?.userId || req.user?.sub;
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    return this.recruitmentService.signOffer(offerId, candidateId, signature, signedDate, ipAddress);
  }

  @Get('offers/:id/letter')
  async getOfferLetter(@Param('id') offerId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.getOfferLetter(offerId, userId);
  }

  @Get('offers/:id/signature-status')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async getSignatureStatus(@Param('id') offerId: string) {
    return this.recruitmentService.getSignatureStatus(offerId);
  }

  // ==================== ONBOARDING CHECKLISTS ====================

  @Post('onboarding')
  @Roles(Role.HR_MANAGER)
  async createOnboardingChecklist(
    @Body() data: {
      employeeId: string;
      contractId: string;
      tasks: Array<{
        name: string;
        department: string;
        deadline?: Date;
        notes?: string;
      }>;
    }
  ) {
    return this.recruitmentService.createOnboardingChecklist(data);
  }

  @Get('onboarding')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE)
  async getAllOnboardingChecklists() {
    return this.recruitmentService.getAllOnboardingChecklists();
  }

  @Get('onboarding/employee/:employeeId')
  async getOnboardingChecklistByEmployee(@Param('employeeId') employeeId: string) {
    return this.recruitmentService.getOnboardingChecklistByEmployee(employeeId);
  }

  @Patch('onboarding/:id/tasks/:taskIndex')
  async updateOnboardingTask(
    @Param('id') checklistId: string,
    @Param('taskIndex') taskIndex: string,
    @Body() updates: {
      status?: string;
      completedAt?: Date;
      notes?: string;
    }
  ) {
    return this.recruitmentService.updateOnboardingTask(
      checklistId,
      parseInt(taskIndex),
      updates
    );
  }

  @Delete('onboarding/:id')
  @Roles(Role.HR_MANAGER)
  async deleteOnboardingChecklist(@Param('id') id: string) {
    return this.recruitmentService.deleteOnboardingChecklist(id);
  }

  @Post('onboarding/:id/tasks/:taskIndex/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTaskDocument(
    @Param('id') checklistId: string,
    @Param('taskIndex') taskIndex: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.recruitmentService.uploadTaskDocument(
      checklistId,
      parseInt(taskIndex),
      file,
      userId
    );
  }

  @Get('onboarding/:id/tasks/:taskIndex/document')
  async getTaskDocument(
    @Param('id') checklistId: string,
    @Param('taskIndex') taskIndex: string,
  ) {
    return this.recruitmentService.getTaskDocument(checklistId, parseInt(taskIndex));
  }

  // ==================== SIGNED CONTRACTS FOR HR ====================

  @Get('signed-contracts')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.HR_ADMIN)
  async getSignedContracts() {
    return this.recruitmentService.getSignedContracts();
  }

  @Get('contracts/:id')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.HR_ADMIN)
  async getContractById(@Param('id') id: string) {
    return this.recruitmentService.getContractById(id);
  }

  // ==================== DEADLINE REMINDERS ====================

  @Post('send-deadline-reminders')
  @Roles(Role.SYSTEM_ADMIN, Role.HR_MANAGER)
  async sendDeadlineReminders() {
    return this.recruitmentService.sendTaskDeadlineReminders();
  }

  // ==================== EQUIPMENT & ACCESS TRACKING ====================

  @Put('onboarding/:id/equipment')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD)
  async updateEquipmentTracking(
    @Param('id') onboardingId: string,
    @Body() body: { equipment: Array<{ name: string; issued: boolean; issuedDate?: Date; serialNumber?: string }> }
  ) {
    return this.recruitmentService.updateEquipmentTracking(onboardingId, body.equipment);
  }

  @Get('onboarding/:id/equipment')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.NEW_HIRE, Role.DEPARTMENT_EMPLOYEE)
  async getEquipmentTracking(@Param('id') onboardingId: string) {
    return this.recruitmentService.getEquipmentTracking(onboardingId);
  }

  @Put('onboarding/:id/desk')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD)
  async updateDeskAllocation(
    @Param('id') onboardingId: string,
    @Body() deskInfo: { building?: string; floor?: string; deskNumber?: string; allocatedDate?: Date }
  ) {
    return this.recruitmentService.updateDeskAllocation(onboardingId, deskInfo);
  }

  @Get('onboarding/:id/desk')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.NEW_HIRE, Role.DEPARTMENT_EMPLOYEE)
  async getDeskAllocation(@Param('id') onboardingId: string) {
    return this.recruitmentService.getDeskAllocation(onboardingId);
  }

  @Put('onboarding/:id/access-card')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD)
  async updateAccessCardInfo(
    @Param('id') onboardingId: string,
    @Body() cardInfo: { cardNumber?: string; issuedDate?: Date; expiryDate?: Date; status?: string }
  ) {
    return this.recruitmentService.updateAccessCardInfo(onboardingId, cardInfo);
  }

  @Get('onboarding/:id/access-card')
  @Roles(Role.HR_MANAGER, Role.HR_EMPLOYEE, Role.DEPARTMENT_HEAD, Role.NEW_HIRE, Role.DEPARTMENT_EMPLOYEE)
  async getAccessCardInfo(@Param('id') onboardingId: string) {
    return this.recruitmentService.getAccessCardInfo(onboardingId);
  }

  // ==================== EMPLOYEE RESIGNATION ====================

  @Post('termination/resignation')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.NEW_HIRE)
  async createResignation(@Req() req, @Body() dto: any) {
    const userId = req.user.sub;
    return this.recruitmentService.createResignation(userId, dto);
  }

  @Get('termination/my-resignations')
  @Roles(Role.DEPARTMENT_EMPLOYEE, Role.NEW_HIRE)
  async getMyResignations(@Req() req) {
    const userId = req.user.sub;
    return this.recruitmentService.getMyResignationStatus(userId);
  }

  // ==================== HR TERMINATION MANAGEMENT ====================

  @Post('termination')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN)
  async initiateTermination(@Req() req, @Body() dto: any) {
    const userId = req.user.sub;
    return this.recruitmentService.initiateTermination(userId, dto);
  }

  @Get('termination/statistics')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN)
  async getTerminationStatistics() {
    return this.recruitmentService.getTerminationStatistics();
  }

  @Get('termination')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE)
  async getAllTerminations(
    @Query('status') status?: string,
    @Query('initiator') initiator?: string,
  ) {
    return this.recruitmentService.getAllTerminations({ status, initiator });
  }

  @Get('termination/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.HR_EMPLOYEE, Role.DEPARTMENT_EMPLOYEE, Role.NEW_HIRE)
  async getTerminationById(@Param('id') id: string) {
    return this.recruitmentService.getTerminationById(id);
  }

  @Put('termination/:id')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN)
  async updateTermination(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: any,
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.updateTermination(id, userId, dto);
  }

  // ==================== CLEARANCE MANAGEMENT ====================

  @Post('termination/:id/clearance')
  @Roles(
    Role.HR_MANAGER, 
    Role.HR_ADMIN, 
    Role.SYSTEM_ADMIN
  )
  async createClearanceChecklist(
    @Param('id') terminationId: string,
    @Body() dto: any,
    @Req() req
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.createClearanceChecklist(terminationId, dto, userId);
  }

  @Get('termination/:id/clearance')
  @Roles(
    Role.HR_MANAGER, 
    Role.HR_ADMIN, 
    Role.DEPARTMENT_HEAD, 
    Role.SYSTEM_ADMIN
  )
  async getClearanceChecklist(@Param('id') terminationId: string) {
    return this.recruitmentService.getClearanceChecklist(terminationId);
  }

  @Put('termination/:id/clearance')
  @Roles(
    Role.HR_MANAGER, 
    Role.HR_ADMIN, 
    Role.SYSTEM_ADMIN
  )
  async updateClearanceChecklist(
    @Param('id') terminationId: string,
    @Body() dto: any,
    @Req() req
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.updateClearanceChecklist(terminationId, dto, userId);
  }

  @Put('termination/:id/clearance/sign-off')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.DEPARTMENT_HEAD, Role.SYSTEM_ADMIN)
  async updateClearanceItem(
    @Param('id') terminationId: string,
    @Req() req,
    @Body() dto: any,
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.updateClearanceItem(terminationId, userId, dto);
  }

  @Put('termination/:id/clearance/equipment')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.DEPARTMENT_HEAD)
  async updateEquipmentReturn(
    @Param('id') terminationId: string,
    @Req() req,
    @Body() dto: any[],
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.updateEquipmentReturn(terminationId, userId, dto);
  }

  @Put('termination/:id/clearance/card')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN, Role.DEPARTMENT_HEAD)
  async updateCardReturn(
    @Param('id') terminationId: string,
    @Body() body: { cardReturned: boolean },
  ) {
    return this.recruitmentService.updateCardReturn(terminationId, body.cardReturned);
  }

  @Post('termination/:id/finalize-clearance')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN)
  async finalizeClearance(
    @Param('id') terminationId: string,
    @Req() req,
  ) {
    const userId = req.user.sub;
    return this.recruitmentService.finalizeClearanceAndAssignBenefits(terminationId, userId);
  }

  // ==================== OFFBOARDING NOTIFICATIONS ====================

  @Post('termination/:id/trigger-offboarding')
  @Roles(Role.HR_MANAGER, Role.HR_ADMIN)
  async triggerOffboarding(@Param('id') terminationId: string, @Req() req) {
    const userId = req.user.sub;
    return this.recruitmentService.triggerOffboardingNotifications(terminationId, userId);
  }
}
