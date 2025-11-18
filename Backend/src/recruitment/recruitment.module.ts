import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import {
  Candidate,
  CandidateSchema,
} from './models/candidate.schema';

import {
  CandidateApplication,
  CandidateApplicationSchema,
} from './models/candidate-application.schema';

import {
  HiringProcessTemplate,
  HiringProcessTemplateSchema,
} from './models/hiring-process-template.schema';

import {
  JobTemplate,
  JobTemplateSchema,
} from './models/job-template.schema';

import {
  JobRequisition,
  JobRequisitionSchema,
} from './models/job-requisition.schema';

import {
  Interview,
  InterviewSchema,
} from './models/interview.schema';

import {
  Offer,
  OfferSchema,
} from './models/offer.schema';

import {
  OnboardingChecklist,
  OnboardingChecklistSchema,
} from './models/onboarding-checklist.schema';

import {
  OffboardingChecklist,
  OffboardingChecklistSchema,
} from './models/offboarding-checklist.schema';

import {
  SeparationRequest,
  SeparationRequestSchema,
} from './models/resignation-request.schema';

// If you already created these, just adjust the paths:
import { RecruitmentService } from './recruitment.service';
import { RecruitmentController } from './recruitment.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Candidate.name, schema: CandidateSchema },
      {
        name: CandidateApplication.name,
        schema: CandidateApplicationSchema,
      },
      {
        name: HiringProcessTemplate.name,
        schema: HiringProcessTemplateSchema,
      },
      { name: JobTemplate.name, schema: JobTemplateSchema },
      { name: JobRequisition.name, schema: JobRequisitionSchema },
      { name: Interview.name, schema: InterviewSchema },
      { name: Offer.name, schema: OfferSchema },
      {
        name: OnboardingChecklist.name,
        schema: OnboardingChecklistSchema,
      },
      {
        name: OffboardingChecklist.name,
        schema: OffboardingChecklistSchema,
      },
      {
        name: SeparationRequest.name,
        schema: SeparationRequestSchema,
      },
    ]),
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}