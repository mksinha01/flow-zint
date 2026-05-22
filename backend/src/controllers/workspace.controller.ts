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
  try {
    const workspaces = await prisma.workspace.findMany({
      where: {
        OR: [
          { ownerId: req.user!.userId },
          { members: { some: { userId: req.user!.userId } } },
        ],
      },
      include: {
        _count: { select: { leads: true, calls: true } },
        businessContext: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const workspacesWithStats = await Promise.all(
      workspaces.map(async (w) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const [
          totalLeads,
          totalCalls,
          callsToday,
          callsThisWeek,
          hotLeads,
          warmLeads,
          coldLeads,
          avgLeadScore,
          bookings,
        ] = await Promise.all([
          prisma.lead.count({ where: { workspaceId: w.id } }),
          prisma.call.count({ where: { workspaceId: w.id } }),
          prisma.call.count({ where: { workspaceId: w.id, createdAt: { gte: todayStart } } }),
          prisma.call.count({ where: { workspaceId: w.id, createdAt: { gte: weekStart } } }),
          prisma.callAnalysis.count({ where: { workspaceId: w.id, classification: 'HOT' } }),
          prisma.callAnalysis.count({ where: { workspaceId: w.id, classification: 'WARM' } }),
          prisma.callAnalysis.count({ where: { workspaceId: w.id, classification: 'COLD' } }),
          prisma.callAnalysis.aggregate({
            where: { workspaceId: w.id },
            _avg: { leadScore: true },
          }),
          prisma.booking.count({ where: { workspaceId: w.id } }),
        ]);

        const completedCalls = await prisma.call.count({
          where: { workspaceId: w.id, status: 'COMPLETED' },
        });

        const successRate = completedCalls > 0 ? Math.round((hotLeads / completedCalls) * 100) : 0;

        return {
          ...w,
          stats: {
            totalLeads,
            totalCalls,
            callsToday,
            callsThisWeek,
            hotLeads,
            warmLeads,
            coldLeads,
            avgLeadScore: Math.round(avgLeadScore._avg.leadScore || 0),
            bookings,
            successRate,
          },
        };
      })
    );

    sendSuccess(res, { workspaces: workspacesWithStats });
  } catch (error: any) {
    logger.error('Error in getUserWorkspaces:', error);
    sendError(res, 'Failed to retrieve workspaces', 500, error.message);
  }
};

export const updateWorkspace = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.params.workspaceId || req.user!.workspaceId!;
    const { name } = req.body;

    const workspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });

    logger.info(`Workspace updated: ${workspace.slug} by ${req.user!.email}`);
    sendSuccess(res, { workspace }, 'Workspace updated successfully');
  } catch (error: any) {
    logger.error('Error in updateWorkspace:', error);
    sendError(res, 'Failed to update workspace', 500, error.message);
  }
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
