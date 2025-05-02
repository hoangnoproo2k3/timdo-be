import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { envConfig } from '~/common/config/env.config';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;

  constructor() {
    this.s3Client = new S3Client({
      region: envConfig.AWS_REGION,
      credentials: {
        accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
        secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
      },
    });
  }

  async createPresignedUrl(
    fileType: string,
    folder: 'timdo' | 'nhatduoc',
  ): Promise<{
    uploadUrl: string;
    fileKey: string;
    fileUrl: string;
  }> {
    try {
      // Validate file type
      if (!fileType.match(/^(image\/(jpg|jpeg|png|webp)|text\/csv)$/)) {
        throw new Error(
          'Invalid file type. Only jpg, jpeg, png, webp, and csv files are allowed.',
        );
      }

      // Generate unique file name
      const fileExtension = fileType.split('/')[1];
      const fileName = `${randomUUID()}.${fileExtension}`;
      const fileKey = `${folder}/${fileName}`;

      // Create command with explicit type
      const commandInput: PutObjectCommandInput = {
        Bucket: envConfig.AWS_S3_BUCKET,
        Key: fileKey,
        ContentType: fileType,
      };
      const command = new PutObjectCommand(commandInput);

      // Generate presigned URL
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600,
      });

      // Generate the final file URL
      const fileUrl = `${envConfig.CLOUDFRONT_URL}/${fileKey}`;

      return {
        uploadUrl,
        fileKey,
        fileUrl,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message); // Safer: create a new Error
      }
      throw new Error('Unknown error occurred while generating presigned URL');
    }
  }
}
