import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PasswordService } from '../common/security/password.service';
import { EmployeeProfile, EmployeeProfileDocument } from '../employee-profile/models/employee-profile.schema';
import { EmployeeSystemRole, EmployeeSystemRoleDocument } from '../employee-profile/models/employee-system-role.schema';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { EmployeeStatus, SystemRole } from '../employee-profile/enums/employee-profile.enums';

@Injectable()
export class RegisterService {
  constructor(
    @InjectModel(EmployeeProfile.name) private employeeProfileModel: Model<EmployeeProfileDocument>,
    @InjectModel(EmployeeSystemRole.name) private employeeSystemRoleModel: Model<EmployeeSystemRoleDocument>,
    private readonly passwordService: PasswordService,
  ) {}

  async createRegistration(dto: CreateRegistrationDto): Promise<EmployeeProfile> {
    // Check if email already exists
    const existingByEmail = await this.employeeProfileModel.findOne({
      $or: [
        { workEmail: dto.email },
        { personalEmail: dto.email }
      ]
    }).exec();
    if (existingByEmail) {
      throw new BadRequestException('Email already registered');
    }

    // Check if nationalId already exists
    const existingByNationalId = await this.employeeProfileModel.findOne({ nationalId: dto.nationalId }).exec();
    if (existingByNationalId) {
      throw new BadRequestException('National ID already registered');
    }

    // Retry logic for handling duplicate employee number errors
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        // Auto-generate employee number
        const employeeNumber = await this.generateEmployeeNumber();

        const passwordResult = await this.passwordService.hashPassword(dto.password);

        const employeeProfile = new this.employeeProfileModel({
          firstName: dto.firstName,
          lastName: dto.lastName,
          fullName: `${dto.firstName} ${dto.lastName}`,
          nationalId: dto.nationalId,
          dateOfBirth: new Date(dto.dateOfBirth),
          personalEmail: dto.email,
          password: passwordResult.hash,
          passwordAlgo: passwordResult.algorithm,
          passwordUpdatedAt: passwordResult.updatedAt,
          employeeNumber: employeeNumber,
          dateOfHire: new Date(), // Set to current date
          status: EmployeeStatus.ACTIVE,
          statusEffectiveFrom: new Date(),
        });

        const savedProfile = await employeeProfile.save();

        // Create EmployeeSystemRole with 'JOB_CANDIDATE' role
        const systemRole = new this.employeeSystemRoleModel({
          employeeProfileId: savedProfile._id,
          roles: [SystemRole.JOB_CANDIDATE],
          permissions: [],
          isActive: true,
        });

        const savedSystemRole = await systemRole.save();

        // Update employee profile with accessProfileId
        savedProfile.accessProfileId = savedSystemRole._id;
        await savedProfile.save();

        return savedProfile;
      } catch (error: any) {
        // Check if it's a duplicate key error on employeeNumber
        if (error.code === 11000 && error.keyPattern?.employeeNumber) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw new BadRequestException('Failed to generate unique employee number. Please try again.');
          }
          // Wait a bit before retrying to avoid race conditions
          await new Promise(resolve => setTimeout(resolve, 100 * attempts));
          continue;
        }
        // If it's a different error, throw immediately
        throw error;
      }
    }
    
    throw new BadRequestException('Failed to create registration after multiple attempts');
  }

  /**
   * Generate unique employee number in format: EMP + zero-padded number (e.g., EMP00001, EMP00002)
   * Handles race conditions and retries if duplicate is detected
   */
  private async generateEmployeeNumber(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      try {
        // Find the highest employee number in the database
        const lastEmployee = await this.employeeProfileModel
          .findOne({ employeeNumber: { $exists: true } })
          .sort({ employeeNumber: -1 })
          .select('employeeNumber')
          .exec();

        let nextNumber = 1;
        
        if (lastEmployee?.employeeNumber) {
          // Extract number from format "EMP00001"
          const match = lastEmployee.employeeNumber.match(/\d+$/);
          if (match) {
            nextNumber = parseInt(match[0], 10) + 1;
          }
        }

        // Format as EMP + 5-digit zero-padded number
        const employeeNumber = `EMP${nextNumber.toString().padStart(5, '0')}`;
        
        // Verify this number doesn't already exist (race condition check)
        const existing = await this.employeeProfileModel.findOne({ employeeNumber }).exec();
        if (!existing) {
          return employeeNumber;
        }
        
        // If exists, increment and retry
        attempts++;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
      }
    }

    // Fallback: use timestamp-based unique number
    const timestamp = Date.now().toString().slice(-5);
    return `EMP${timestamp}`;
  }

  async getRegistrationById(id: string): Promise<EmployeeProfile> {
    const profile = await this.employeeProfileModel.findById(id).exec();
    if (!profile) throw new NotFoundException('Employee profile not found');
    return profile;
  }

  async getAllRegistrations(): Promise<EmployeeProfile[]> {
    return this.employeeProfileModel.find().exec();
  }

  async deleteRegistration(id: string): Promise<void> {
    const result = await this.employeeProfileModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Employee profile not found');
  }

  async findByEmail(email: string): Promise<EmployeeProfile | null> {
    return this.employeeProfileModel.findOne({
      $or: [
        { workEmail: email },
        { personalEmail: email }
      ]
    }).exec();
  }
}
