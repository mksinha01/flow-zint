import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { saveBusinessDocument } from '../services/document.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from '../utils/response.util';

export const upsertBusinessContext = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const data = req.body;

  const context = await prisma.businessContext.upsert({
    where: { workspaceId },
    update: data,
    create: { workspaceId, ...data },
  });

  sendSuccess(res, { context }, 'Business context saved');
};

export const getBusinessContext = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const context = await prisma.businessContext.findUnique({
    where: { workspaceId },
  });

  if (!context) {
    sendNotFound(res, 'Business context');
    return;
  }

  sendSuccess(res, { context });
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  if (!req.file) {
    sendError(res, 'No file uploaded');
    return;
  }

  const document = await saveBusinessDocument(workspaceId, req.file);
  sendCreated(res, { document }, 'Document uploaded and processed');
};

export const listDocuments = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const documents = await prisma.businessDocument.findMany({
    where: { workspaceId },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      fileUrl: true,
      uploadedAt: true,
    },
    orderBy: { uploadedAt: 'desc' },
  });

  sendSuccess(res, { documents });
};

export const deleteDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { documentId } = req.params;

  const doc = await prisma.businessDocument.findFirst({
    where: { id: documentId, workspaceId },
  });

  if (!doc) {
    sendNotFound(res, 'Document');
    return;
  }

  await prisma.businessDocument.delete({ where: { id: documentId } });
  sendSuccess(res, null, 'Document deleted');
};
