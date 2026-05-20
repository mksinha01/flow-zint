import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import prisma from '../config/database';
import { sendForbidden, sendNotFound } from '../utils/response.util';
import { logger } from '../config/logger';

/**
 * Middleware that:
 * 1. Reads :workspaceId from route params OR x-workspace-id header
 * 2. Verifies the authenticated user is a member of that workspace
 * 3. Attaches workspaceId to req.user for downstream use
 */
export const requireWorkspaceAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const workspaceId =
      req.params.workspaceId ||
      req.headers['x-workspace-id'] as string ||
      req.body?.workspaceId;

    if (!workspaceId) {
      sendForbidden(res, 'Workspace ID is required');
      return;
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      sendNotFound(res, 'Workspace');
      return;
    }

    // Owner always has access
    if (workspace.ownerId === req.user!.userId) {
      req.user!.workspaceId = workspaceId;
      next();
      return;
    }

    // Check membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: req.user!.userId,
        },
      },
    });

    if (!membership) {
      sendForbidden(res, 'You do not have access to this workspace');
      return;
    }

    req.user!.workspaceId = workspaceId;
    req.user!.role = membership.role;
    next();
  } catch (error) {
    logger.error('Workspace middleware error:', error);
    sendForbidden(res, 'Could not verify workspace access');
  }
};
