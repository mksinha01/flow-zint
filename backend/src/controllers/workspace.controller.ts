import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from '../utils/response.util';
import { logger } from '../config/logger';

export const createWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, slug } = req.body;

  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    sendError(res, 'Workspace slug already taken', 409);
    return;
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      ownerId: req.user!.userId,
      members: {
        create: {
          userId: req.user!.userId,
          role: 'ADMIN',
        },
      },
    },
  });

  logger.info(`Workspace created: ${slug} by ${req.user!.email}`);
  sendCreated(res, { workspace }, 'Workspace created successfully');
};

export const getWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      businessContext: true,
      _count: {
        select: { leads: true, calls: true, agentConfigs: true },
      },
    },
  });

  if (!workspace) {
    sendNotFound(res, 'Workspace');
    return;
  }

  sendSuccess(res, { workspace });
};

export const getUserWorkspaces = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: req.user!.userId },
        { members: { some: { userId: req.user!.userId } } },
      ],
    },
    include: {
      _count: { select: { leads: true, calls: true } },
      businessContext: { select: { companyName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, { workspaces });
};

export const deleteWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    sendNotFound(res, 'Workspace');
    return;
  }

  // Only the owner can delete the workspace
  if (workspace.ownerId !== req.user!.userId) {
    res.status(403).json({ success: false, message: 'Only the workspace owner can delete it' });
    return;
  }

  await prisma.workspace.delete({
    where: { id: workspaceId },
  });

  logger.info(`Workspace deleted: ${workspace.slug} by ${req.user!.email}`);
  sendSuccess(res, null, 'Workspace deleted successfully');
};
