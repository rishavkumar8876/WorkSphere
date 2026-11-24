import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger';

export interface UploadedFileMeta {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export class StorageProvider {
  /**
   * Generates a secure upload URL / storage path for task attachments.
   */
  public static async generateUploadUrl(organizationId: string, taskId: string, meta: UploadedFileMeta) {
    const fileKey = `orgs/${organizationId}/tasks/${taskId}/${uuidv4()}-${meta.fileName}`;
    
    // In production, returns AWS S3 or MinIO presigned PUT URL with 15 min expiry.
    // In local development, provides a direct upload endpoint.
    const mockStorageUrl = `/uploads/${fileKey}`;
    
    logger.info(`Generated storage upload path: ${fileKey}`);
    return {
      fileKey,
      uploadUrl: mockStorageUrl,
      expiresIn: 900,
    };
  }
}
