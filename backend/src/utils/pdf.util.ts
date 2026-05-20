import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { logger } from '../config/logger';

export type SupportedFileType = 'pdf' | 'docx' | 'txt';

export const extractTextFromFile = async (
  buffer: Buffer,
  fileType: SupportedFileType
): Promise<string> => {
  try {
    switch (fileType) {
      case 'pdf': {
        const data = await pdfParse(buffer);
        return data.text.trim();
      }
      case 'docx': {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
      }
      case 'txt': {
        return buffer.toString('utf-8').trim();
      }
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    logger.error(`Failed to extract text from ${fileType}:`, error);
    throw new Error(`Failed to parse ${fileType} file`);
  }
};

export const getFileType = (mimetype: string, originalName: string): SupportedFileType => {
  if (mimetype === 'application/pdf' || originalName.endsWith('.pdf')) return 'pdf';
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    originalName.endsWith('.docx')
  )
    return 'docx';
  if (mimetype === 'text/plain' || originalName.endsWith('.txt')) return 'txt';
  throw new Error(`Unsupported file type for: ${originalName}`);
};
