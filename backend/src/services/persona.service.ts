import prisma from '../config/database';
import { generateAgentPersona, GeneratedPersona } from './openai.service';
import { logger } from '../config/logger';

/**
 * Generates a new AgentConfig from the workspace's business context + documents.
 * Saves it as a new version (auto-increments).
 */
export const generateAndSaveAgentConfig = async (workspaceId: string) => {
  const persona = await generateAgentPersona(workspaceId);

  // Get next version number
  const lastConfig = await prisma.agentConfig.findFirst({
    where: { workspaceId },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastConfig?.version ?? 0) + 1;

  const config = await prisma.agentConfig.create({
    data: {
      workspaceId,
      version: nextVersion,
      status: nextVersion === 1 ? 'ACTIVE' : 'PENDING_REVIEW', // v1 auto-activates
      systemPrompt: persona.systemPrompt,
      openingScript: persona.openingScript,
      qualifyingQuestions: persona.qualifyingQuestions,
      objectionHandlers: persona.objectionHandlers,
    },
  });

  // If this is the first version, mark it active immediately
  if (nextVersion === 1) {
    logger.info(`AgentConfig v1 created and auto-activated for workspace ${workspaceId}`);
  } else {
    logger.info(`AgentConfig v${nextVersion} created, awaiting review for workspace ${workspaceId}`);
  }

  return config;
};

/**
 * Activates a specific agent config version (deactivates all others).
 */
export const activateAgentConfig = async (workspaceId: string, configId: string) => {
  // Deactivate all current active configs
  await prisma.agentConfig.updateMany({
    where: { workspaceId, status: 'ACTIVE' },
    data: { status: 'ARCHIVED' },
  });

  // Activate the specified config
  const config = await prisma.agentConfig.update({
    where: { id: configId, workspaceId },
    data: { status: 'ACTIVE', activatedAt: new Date() },
  });

  logger.info(`AgentConfig ${configId} (v${config.version}) activated for workspace ${workspaceId}`);
  return config;
};

/**
 * Gets the currently active AgentConfig for a workspace.
 * Used by the Python AI agent at call time.
 */
export const getActiveAgentConfig = async (workspaceId: string) => {
  return prisma.agentConfig.findFirst({
    where: { workspaceId, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });
};
