/**
 * Employee Profile Types and Interfaces
 * Defines all data structures for the Employee Profile subsystem
 */

export enum EmployeeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
  SUSPENDED = 'SUSPENDED',
  RETIRED = 'RETIRED',
  PROBATION = 'PROBATION',
  TERMINATED = 'TERMINATED',
}

export enum ContractType {
  FULL_TIME = 'FULL_TIME',
  PART_TIME = 'PART_TIME',
  CONTRACT = 'CONTRACT',
  INTERN = 'INTERN',
  TEMPORARY = 'TEMPORARY',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ChangeRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum ChangeRequestType {
  PERSONAL_INFO = 'PERSONAL_INFO',
  CONTACT_INFO = 'CONTACT_INFO',
  EMPLOYMENT_INFO = 'EMPLOYMENT_INFO',
  EMERGENCY_CONTACT = 'EMERGENCY_CONTACT',
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Education {
  degree: string;
  institution: string;
  fieldOfStudy: string;
  graduationYear: number;
  gpa?: number;
}

export interface Appraisal {
  _id: string;
  date: string;
  type: string;
  score: number;
  reviewer: string;
  comments?: string;
}

export interface EmployeeProfile {
  _id: string;
  employeeNumber: string;
  
  // Personal Information (BR 2a-r)
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  gender: Gender;
  nationalId: string;
  maritalStatus?: MaritalStatus;
  nationality?: string;
  
  // Contact Information
  personalEmail?: string;
  workEmail?: string;
  mobilePhone?: string;
  homePhone?: string;
  address?: Address;
  
  // Employment Information
  dateOfHire: string;
  contractType?: ContractType;
  status: EmployeeStatus;
  primaryPositionId?: {
    _id: string;
    title: string;
  };
  primaryDepartmentId?: {
    _id: string;
    name: string;
  };
  supervisor?: string;
  payGrade?: string;
  
  // Profile Details
  profilePicture?: string; // Legacy alias
  profilePictureUrl?: string; // Actual DB field
  biography?: string;
  
  // Emergency Contact
  emergencyContact?: EmergencyContact;
  
  // Education
  education?: Education[];
  
  // Performance History
  appraisals?: Appraisal[];
  
  // System Fields
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface ProfileChangeRequest {
  _id: string;
  employeeId: string;
  requestedBy: string;
  requestType: ChangeRequestType;
  status: ChangeRequestStatus;
  
  // Fields being changed
  fieldName: string;
  currentValue: any;
  requestedValue: any;
  
  // Justification
  reason: string;
  attachments?: string[];
  
  // Review Information
  reviewedBy?: string;
  reviewedAt?: string;
  reviewComments?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberSummary {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  position: string;
  department: string;
  dateOfHire: string;
  status: EmployeeStatus;
  profilePicture?: string;
}

export interface ProfileUpdateData {
  phone?: string;
  email?: string;
  address?: Address;
  profilePicture?: string;
  biography?: string;
  emergencyContact?: EmergencyContact;
}

export interface ChangeRequestSubmission {
  fieldName: string;
  currentValue: any;
  requestedValue: any;
  requestType: ChangeRequestType;
  reason: string;
  attachments?: File[];
}
