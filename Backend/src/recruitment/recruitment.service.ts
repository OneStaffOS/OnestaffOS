import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JobTemplate, JobTemplateDocument } from './models/job-template.schema';
import { JobRequisition, JobRequisitionDocument } from './models/job-requisition.schema';
import { Application, ApplicationDocument } from './models/application.schema';
import { Document as CVDocument, DocumentDocument } from './models/document.schema';
import { CreateJobTemplateDto } from './dto/create-job-template.dto';
import { CreateJobRequisitionDto } from './dto/create-job-requisition.dto';
import { PublishJobDto } from './dto/publish-job.dto';
import { CreateApplicationDto } from './dto/create-application.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectModel(JobTemplate.name)
    private jobTemplateModel: Model<JobTemplateDocument>,
    @InjectModel(JobRequisition.name)
    private jobRequisitionModel: Model<JobRequisitionDocument>,
    @InjectModel(Application.name)
    private applicationModel: Model<ApplicationDocument>,
    @InjectModel(CVDocument.name)
    private documentModel: Model<DocumentDocument>,
  ) {}

  // ==================== JOB TEMPLATES ====================

  async createJobTemplate(dto: CreateJobTemplateDto): Promise<JobTemplate> {
    const template = new this.jobTemplateModel(dto);
    return template.save();
  }

  async findAllJobTemplates(): Promise<JobTemplate[]> {
    return this.jobTemplateModel.find().sort({ createdAt: -1 }).exec();
  }

  async findJobTemplateById(id: string): Promise<JobTemplate> {
    const template = await this.jobTemplateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return template;
  }

  async updateJobTemplate(id: string, dto: Partial<CreateJobTemplateDto>): Promise<JobTemplate> {
    const template = await this.jobTemplateModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!template) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return template;
  }

  async deleteJobTemplate(id: string): Promise<{ deleted: boolean }> {
    const result = await this.jobTemplateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Job template with ID ${id} not found`);
    }
    return { deleted: true };
  }

  // ==================== JOB REQUISITIONS ====================

  async createJobRequisition(dto: CreateJobRequisitionDto): Promise<JobRequisition> {
    // Generate unique requisitionId
    const count = await this.jobRequisitionModel.countDocuments().exec();
    const requisitionId = `JOB-${String(count + 1).padStart(3, '0')}`;
    
    // Convert expiryDate string to Date if provided
    const requisitionData: any = {
      ...dto,
      requisitionId,
    };
    
    if (dto.expiryDate) {
      requisitionData.expiryDate = new Date(dto.expiryDate);
    }
    
    const requisition = new this.jobRequisitionModel(requisitionData);
    return requisition.save();
  }

  async findAllJobRequisitions(): Promise<JobRequisition[]> {
    return this.jobRequisitionModel
      .find()
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findJobRequisitionById(id: string): Promise<JobRequisition> {
    const requisition = await this.jobRequisitionModel
      .findById(id)
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async updateJobRequisition(id: string, dto: Partial<CreateJobRequisitionDto>): Promise<JobRequisition> {
    const requisition = await this.jobRequisitionModel
      .findByIdAndUpdate(id, dto, { new: true })
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async publishJobRequisition(id: string, dto: PublishJobDto): Promise<JobRequisition> {
    const updateData: any = { publishStatus: dto.publishStatus };
    
    // Set posting date when publishing
    if (dto.publishStatus === 'published') {
      updateData.postingDate = new Date();
    }

    const requisition = await this.jobRequisitionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('templateId')
      .populate('hiringManagerId', 'firstName lastName email')
      .exec();
      
    if (!requisition) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return requisition;
  }

  async deleteJobRequisition(id: string): Promise<{ deleted: boolean }> {
    const result = await this.jobRequisitionModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Job requisition with ID ${id} not found`);
    }
    return { deleted: true };
  }

  // Get published jobs for careers page
  async getPublishedJobs(): Promise<JobRequisition[]> {
    return this.jobRequisitionModel
      .find({ publishStatus: 'published' })
      .populate('templateId')
      .sort({ postingDate: -1 })
      .exec();
  }

  // ==================== APPLICATIONS ====================

  async createApplication(
    dto: CreateApplicationDto,
    cvFile: Express.Multer.File,
  ): Promise<Application> {
    // Create the CV document record
    const cvDocument = new this.documentModel({
      ownerId: dto.candidateId,
      type: 'cv',
      filePath: cvFile.path,
      uploadedAt: new Date(),
    });
    await cvDocument.save();

    // Create the application record
    const application = new this.applicationModel({
      candidateId: dto.candidateId,
      requisitionId: dto.requisitionId,
      currentStage: 'SCREENING',
      status: 'SUBMITTED',
    });

    return application.save();
  }
}
