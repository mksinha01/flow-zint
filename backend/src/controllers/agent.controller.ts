import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import {
  generateAndSaveAgentConfig,
  activateAgentConfig,
  getActiveAgentConfig,
} from '../services/persona.service';
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
} from '../utils/response.util';

export const parseConfig = (config: any) => {
  if (!config) return config;
  return {
    ...config,
    qualifyingQuestions: typeof config.qualifyingQuestions === 'string' ? JSON.parse(config.qualifyingQuestions) : config.qualifyingQuestions,
    objectionHandlers: typeof config.objectionHandlers === 'string' ? JSON.parse(config.objectionHandlers) : config.objectionHandlers,
    generatedFromInsights: typeof config.generatedFromInsights === 'string' ? JSON.parse(config.generatedFromInsights) : config.generatedFromInsights,
  };
};

export const generateAgent = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  try {
    const context = await prisma.businessContext.findUnique({ where: { workspaceId } });
    if (!context) {
      sendError(res, 'Complete the business onboarding form before generating an agent', 400);
      return;
    }

    const config = await generateAndSaveAgentConfig(workspaceId);
    const message =
      config.version === 1
        ? 'Agent generated and activated! Ready to make calls.'
        : `Agent v${config.version} generated. Review and approve to activate.`;

    sendCreated(res, { config: parseConfig(config) }, message);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate agent';
    sendError(res, msg, 500);
  }
};

export const listAgentConfigs = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const configs = await prisma.agentConfig.findMany({
    where: { workspaceId },
    orderBy: { version: 'desc' },
    select: {
      id: true,
      version: true,
      status: true,
      generatedAt: true,
      activatedAt: true,
      generatedFromInsights: true,
    },
  });

  sendSuccess(res, { configs: configs.map(parseConfig) });
};

export const getAgentConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { configId } = req.params;

  const config = await prisma.agentConfig.findFirst({
    where: { id: configId, workspaceId },
  });

  if (!config) {
    sendNotFound(res, 'Agent config');
    return;
  }

  sendSuccess(res, { config: parseConfig(config) });
};

export const getActiveConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const config = await getActiveAgentConfig(workspaceId);

  if (!config) {
    sendNotFound(res, 'Active agent config');
    return;
  }

  sendSuccess(res, { config: parseConfig(config) });
};

export const activateConfig = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { configId } = req.params;

  const config = await prisma.agentConfig.findFirst({
    where: { id: configId, workspaceId },
  });

  if (!config) {
    sendNotFound(res, 'Agent config');
    return;
  }

  const activated = await activateAgentConfig(workspaceId, configId);
  sendSuccess(res, { config: parseConfig(activated) }, `Agent v${activated.version} is now active`);
};
