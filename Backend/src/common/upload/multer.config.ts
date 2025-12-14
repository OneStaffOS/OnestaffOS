// FILE: src/common/upload/multer.config.ts
import { diskStorage, Options } from 'multer';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// Base upload directory (relative to Backend folder)
const UPLOAD_BASE_DIR = path.join(process.cwd(), 'uploads');

// Feature-specific upload directories
export const UPLOAD_DIRS = {
  recruitment: {
    cvs: path.join(UPLOAD_BASE_DIR, 'recruitment', 'cvs'),
    documents: path.join(UPLOAD_BASE_DIR, 'recruitment', 'documents'),
    onboarding: path.join(UPLOAD_BASE_DIR, 'recruitment', 'onboarding'),
  },
  leaves: {
    attachments: path.join(UPLOAD_BASE_DIR, 'leaves', 'attachments'),
  },
  general: UPLOAD_BASE_DIR,
};

// Allowed MIME types for recruitment documents
export const ALLOWED_RECRUITMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

// Allowed MIME types for leave attachments (medical certificates, documents)
export const ALLOWED_LEAVE_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
  'image/jpg',
];

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  cv: 5 * 1024 * 1024,             // 5MB for CVs
  document: 10 * 1024 * 1024,      // 10MB for general documents
  image: 5 * 1024 * 1024,          // 5MB for images
  leaveAttachment: 10 * 1024 * 1024, // 10MB for leave attachments
};

/**
 * Ensures the upload directory exists, creating it recursively if needed
 */
export function ensureUploadDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generates a unique filename preserving the original extension
 */
export function generateUniqueFilename(originalname: string): string {
  const ext = path.extname(originalname);
  const uniqueId = crypto.randomUUID();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}${ext}`;
}

/**
 * File filter for recruitment documents (PDF, DOC, DOCX, PNG, JPG/JPEG)
 */
export function recruitmentFileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_RECRUITMENT_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Invalid file type. Allowed types: PDF, DOC, DOCX, PNG, JPG, JPEG',
      ),
      false,
    );
  }
}

/**
 * CV-specific file filter (PDF, DOC, DOCX only)
 */
export function cvFileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException('Only PDF, DOC, and DOCX files are allowed'),
      false,
    );
  }
}

/**
 * Leave attachment file filter (PDF, DOC, DOCX, PNG, JPG/JPEG)
 */
export function leaveAttachmentFileFilter(
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
): void {
  if (ALLOWED_LEAVE_MIME_TYPES.includes(file.mimetype)) {
    callback(null, true);
  } else {
    callback(
      new BadRequestException(
        'Invalid file type. Allowed types: PDF, DOC, DOCX, PNG, JPG, JPEG',
      ),
      false,
    );
  }
}

/**
 * Creates disk storage configuration for a specific upload directory
 */
export function createDiskStorage(uploadDir: string) {
  // Ensure directory exists
  ensureUploadDir(uploadDir);

  return diskStorage({
    destination: (req, file, cb) => {
      // Double-check directory exists at runtime
      ensureUploadDir(uploadDir);
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueFilename = generateUniqueFilename(file.originalname);
      cb(null, uniqueFilename);
    },
  });
}

/**
 * Multer options for CV uploads
 */
export function getCvUploadOptions(): Options {
  return {
    storage: createDiskStorage(UPLOAD_DIRS.recruitment.cvs),
    fileFilter: cvFileFilter,
    limits: {
      fileSize: FILE_SIZE_LIMITS.cv,
    },
  };
}

/**
 * Multer options for general recruitment document uploads
 */
export function getRecruitmentDocumentUploadOptions(): Options {
  return {
    storage: createDiskStorage(UPLOAD_DIRS.recruitment.documents),
    fileFilter: recruitmentFileFilter,
    limits: {
      fileSize: FILE_SIZE_LIMITS.document,
    },
  };
}

/**
 * Multer options for onboarding document uploads
 */
export function getOnboardingDocumentUploadOptions(): Options {
  return {
    storage: createDiskStorage(UPLOAD_DIRS.recruitment.onboarding),
    fileFilter: recruitmentFileFilter,
    limits: {
      fileSize: FILE_SIZE_LIMITS.document,
    },
  };
}

/**
 * Multer options for leave attachment uploads
 */
export function getLeaveAttachmentUploadOptions(): Options {
  return {
    storage: createDiskStorage(UPLOAD_DIRS.leaves.attachments),
    fileFilter: leaveAttachmentFileFilter,
    limits: {
      fileSize: FILE_SIZE_LIMITS.leaveAttachment,
    },
  };
}

/**
 * Gets the relative path from the uploads base directory
 * Used for storing in database
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(UPLOAD_BASE_DIR, absolutePath);
}

/**
 * Gets the absolute path from a relative path stored in database
 */
export function getAbsolutePath(relativePath: string): string {
  return path.join(UPLOAD_BASE_DIR, relativePath);
}

/**
 * Validates that a file path is within the allowed upload directory
 * Prevents path traversal attacks
 */
export function isPathSafe(filePath: string): boolean {
  const resolvedPath = path.resolve(UPLOAD_BASE_DIR, filePath);
  return resolvedPath.startsWith(UPLOAD_BASE_DIR);
}

/**
 * Deletes a file from disk safely
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  try {
    const absolutePath = filePath.startsWith(UPLOAD_BASE_DIR)
      ? filePath
      : getAbsolutePath(filePath);

    if (!isPathSafe(absolutePath)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Checks if a file exists on disk
 */
export function fileExists(filePath: string): boolean {
  const absolutePath = filePath.startsWith(UPLOAD_BASE_DIR)
    ? filePath
    : getAbsolutePath(filePath);
  
  if (!isPathSafe(absolutePath)) {
    return false;
  }
  
  return fs.existsSync(absolutePath);
}
