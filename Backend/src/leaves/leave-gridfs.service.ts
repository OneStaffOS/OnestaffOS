import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';

@Injectable()
export class LeaveGridFSService {
  private gridFSBucket: GridFSBucket;

  constructor(@InjectConnection() private readonly connection: Connection) {
    if (!this.connection.db) {
      throw new Error('Database connection not established');
    }
    this.gridFSBucket = new GridFSBucket(this.connection.db, {
      bucketName: 'leave_attachments', // Collection name will be leave_attachments.files and leave_attachments.chunks
    });
  }

  /**
   * Upload a file to GridFS
   * @param fileBuffer - The file buffer to upload
   * @param filename - The name of the file
   * @param metadata - Optional metadata
   * @returns Promise with the file ID
   */
  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
    metadata?: any,
  ): Promise<ObjectId> {
    return new Promise((resolve, reject) => {
      const readableStream = Readable.from(fileBuffer);
      const uploadStream = this.gridFSBucket.openUploadStream(filename, {
        metadata,
      });

      uploadStream.on('finish', () => {
        resolve(uploadStream.id as ObjectId);
      });

      uploadStream.on('error', (error) => {
        reject(error);
      });

      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Download a file from GridFS
   * @param fileId - The ID of the file to download
   * @returns Promise with the file buffer
   */
  async downloadFile(fileId: ObjectId): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      const downloadStream = this.gridFSBucket.openDownloadStream(fileId);

      downloadStream.on('data', (chunk) => {
        chunks.push(chunk);
      });

      downloadStream.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      downloadStream.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Delete a file from GridFS
   * @param fileId - The ID of the file to delete
   */
  async deleteFile(fileId: ObjectId): Promise<void> {
    await this.gridFSBucket.delete(fileId);
  }

  /**
   * Get file metadata
   * @param fileId - The ID of the file
   * @returns Promise with file metadata
   */
  async getFileMetadata(fileId: ObjectId): Promise<any> {
    const files = await this.gridFSBucket.find({ _id: fileId }).toArray();
    if (files.length === 0) {
      throw new Error(`File with ID ${fileId} not found`);
    }
    return files[0];
  }

  /**
   * Create a download stream for streaming file to response
   * @param fileId - The ID of the file
   * @returns The download stream
   */
  getDownloadStream(fileId: ObjectId) {
    return this.gridFSBucket.openDownloadStream(fileId);
  }
}
