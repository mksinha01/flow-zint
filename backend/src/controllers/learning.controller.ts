import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { runLearningLoop } from '../services/learning.service';
import { sendSuccess, sendError, sendNotFound } from '../utils/response.util';

export const triggerLearning = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const result = await runLearningLoop(workspaceId);

  if (result.insightsGenerated === 0) {
    sendSuccess(
      res,
      result,
      result.newAgentVersion === null
        ? 'Not enough calls yet for learning analysis. Keep calling!'
        : 'Calls are performing well — no issues detected'
    );
    return;
  }

  sendSuccess(
    res,
    result,
    `Learning complete: ${result.insightsGenerated} insights found. Agent v${result.newAgentVersion} created for review.`
  );
};

export const listInsights = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const insights = await prisma.learningInsight.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, { insights });
};

export const getLearningHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const configs = await prisma.agentConfig.findMany({
    where: { workspaceId },
    orderBy: { version: 'asc' },
    select: {
      id: true,
      version: true,
      status: true,
      generatedAt: true,
      activatedAt: true,
      generatedFromInsights: true,
    },
  });

  const insights = await prisma.learningInsight.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'asc' },
  });

  sendSuccess(res, { configs, insights });
};
