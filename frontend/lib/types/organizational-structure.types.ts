/**
 * Organizational Structure Types and Interfaces
 * Defines all data structures for departments, positions, and hierarchy
 */

export enum PositionStatus {
  ACTIVE = 'ACTIVE',
  VACANT = 'VACANT',
  FROZEN = 'FROZEN',
  INACTIVE = 'INACTIVE',
  DELIMITED = 'DELIMITED',
}

export enum DepartmentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum StructureChangeStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum StructureChangeType {
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  DEACTIVATE_DEPARTMENT = 'DEACTIVATE_DEPARTMENT',
  CREATE_POSITION = 'CREATE_POSITION',
  UPDATE_POSITION = 'UPDATE_POSITION',
  DEACTIVATE_POSITION = 'DEACTIVATE_POSITION',
  CHANGE_REPORTING_LINE = 'CHANGE_REPORTING_LINE',
}

export interface Department {
  _id: string;
  code: string;
  name: string;
  description?: string;
  headPositionId?: {
    _id: string;
    code: string;
    title: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Position {
  _id: string;
  code: string;
  title: string;
  description?: string;
  departmentId: {
    _id: string;
    code: string;
    name: string;
  };
  reportsToPositionId?: {
    _id: string;
    code: string;
    title: string;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StructureChangeRequest {
  _id: string;
  requestId: string;
  requestType: StructureChangeType;
  requestedBy: {
    _id: string;
    name: string;
    position: string;
  };
  status: StructureChangeStatus;
  
  // Change details
  targetEntity?: string; // Department or Position ID
  changeDescription: string;
  justification: string;
  
  // Proposed changes
  proposedChanges?: {
    departmentData?: Partial<Department>;
    positionData?: Partial<Position>;
  };
  
  // Review information
  reviewedBy?: {
    _id: string;
    name: string;
  };
  reviewedAt?: string;
  reviewComments?: string;
  
  // Timestamps
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationalHierarchy {
  department: Department;
  positions: Position[];
  subDepartments?: OrganizationalHierarchy[];
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  description?: string;
  headPositionId?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  code?: string;
  name?: string;
  description?: string;
  headPositionId?: string;
  isActive?: boolean;
}

export interface CreatePositionDto {
  code: string;
  title: string;
  description?: string;
  departmentId: string;
  reportsToPositionId?: string;
  isActive?: boolean;
}

export interface UpdatePositionDto {
  code?: string;
  title?: string;
  description?: string;
  departmentId?: string;
  reportsToPositionId?: string;
  isActive?: boolean;
}

export interface SubmitStructureChangeDto {
  requestType: StructureChangeType;
  targetEntity?: string;
  changeDescription: string;
  justification: string;
  proposedChanges: {
    departmentData?: Partial<Department>;
    positionData?: Partial<Position>;
  };
}
