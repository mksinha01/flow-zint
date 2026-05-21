import { PutObjectCommand } from '@aws-sdk/client-s3';
import { r2Client, R2_BUCKET, R2_PUBLIC_URL } from '../config/r2';
import { logger } from '../config/logger';
import { extractTextFromFile, getFileType } from '../utils/pdf.util';
import prisma from '../config/database';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

export const uploadDocumentToR2 = async (
  workspaceId: string,
  file: Express.Multer.File
): Promise<{ fileUrl: string; extractedText: string; fileType: string }> => {
  const fileType = getFileType(file.mimetype, file.originalname);
  const key = `workspaces/${workspaceId}/docs/${randomUUID()}-${file.originalname}`;

  // Upload to R2
  let fileUrl = `${R2_PUBLIC_URL}/${key}`;
  try {
    if (env.R2_ACCOUNT_ID && env.R2_ACCOUNT_ID !== 'your-cloudflare-account-id') {
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        })
      );
      logger.info(`Uploaded document to R2: ${key}`);
    } else {
      logger.warn('Skipping R2 upload: Dummy R2 credentials detected.');
    }
  } catch (error) {
    logger.error(`Failed to upload to R2, proceeding with text extraction only: ${error}`);
  }

  // Extract text for AI processing
  const extractedText = await extractTextFromFile(file.buffer, fileType);
  logger.info(`Extracted ${extractedText.length} chars from ${file.originalname}`);

  return { fileUrl, extractedText, fileType };
};

export const uploadRecordingToR2 = async (
  workspaceId: string,
  callId: string,
  buffer: Buffer,
  mimetype = 'audio/mp4'
): Promise<string> => {
  const key = `workspaces/${workspaceId}/recordings/${callId}.mp4`;

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimetype,
    })
  );

  const url = `${R2_PUBLIC_URL}/${key}`;
  logger.info(`Uploaded recording to R2: ${key}`);
  return url;
};

export const saveBusinessDocument = async (
  workspaceId: string,
  file: Express.Multer.File
) => {
  const { fileUrl, extractedText, fileType } = await uploadDocumentToR2(workspaceId, file);

  return prisma.businessDocument.create({
    data: {
      workspaceId,
      fileName: file.originalname,
      fileType,
      fileUrl,
      extractedText,
    },
  });
};
