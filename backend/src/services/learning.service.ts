import prisma from '../config/database';
import { logger } from '../config/logger';
import {
  extractLearningInsights,
  improvePersonaFromInsights,
  GeneratedPersona,
  LearningInsightResult,
} from './openai.service';
import { generateAndSaveAgentConfig } from './persona.service';
import { env } from '../config/env';

export interface LearningRunResult {
  insightsGenerated: number;
  newAgentVersion: number | null;
  insights: LearningInsightResult[];
}

/**
 * The learning loop engine.
 * 1. Pulls recent call analyses for the workspace
 * 2. Sends to GPT-4o to extract lessons
 * 3. Saves LearningInsight records
 * 4. Generates improved AgentConfig (PENDING_REVIEW)
 */
export const runLearningLoop = async (workspaceId: string): Promise<LearningRunResult> => {
  logger.info(`Starting learning loop for workspace: ${workspaceId}`);

  // Get the active agent config (for current prompt context)
  const activeConfig = await prisma.agentConfig.findFirst({
    where: { workspaceId, status: 'ACTIVE' },
    orderBy: { version: 'desc' },
  });

  if (!activeConfig) {
    throw new Error('No active agent config found. Generate one first.');
  }

  // Get recent call analyses (since last learning run)
  const lastInsight = await prisma.learningInsight.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
  });

  const recentAnalyses = await prisma.callAnalysis.findMany({
    where: {
      workspaceId,
      ...(lastInsight && { createdAt: { gt: lastInsight.createdAt } }),
    },
    include: { call: { select: { id: true } } },
    orderBy: { createdAt: 'asc' },
  });

  const minCalls = env.LEARNING_TRIGGER_AFTER_N_CALLS;
  if (recentAnalyses.length < minCalls) {
    logger.info(
      `Not enough calls for learning loop: ${recentAnalyses.length}/${minCalls} required`
    );
    return { insightsGenerated: 0, newAgentVersion: null, insights: [] };
  }

  // Prepare data for GPT-4o analysis
  const callData = recentAnalyses.map((a) => ({
    sentiment: a.sentiment,
    leadScore: a.leadScore,
    classification: a.classification,
    objections: a.objections,
    buyingIntent: a.buyingIntent,
    summary: a.summary,
  }));

  // Extract insights
  const insights = await extractLearningInsights(callData, activeConfig.systemPrompt);

  if (insights.length === 0) {
    logger.info('Learning loop: No actionable insights found. Calls are performing well!');
    return { insightsGenerated: 0, newAgentVersion: null, insights: [] };
  }

  const callIds = recentAnalyses.map((a) => a.call.id);

  // Save insight records
  await prisma.learningInsight.createMany({
    data: insights.map((insight) => ({
      workspaceId,
      sourceCallIds: callIds,
      insightType: insight.insightType as any,
      description: insight.description,
      suggestion: insight.suggestion,
    })),
  });

  logger.info(`Saved ${insights.length} learning insights for workspace: ${workspaceId}`);

  // Generate improved agent config
  const currentPersona: GeneratedPersona = {
    systemPrompt: activeConfig.systemPrompt,
    openingScript: activeConfig.openingScript,
    qualifyingQuestions: activeConfig.qualifyingQuestions as string[],
    objectionHandlers: activeConfig.objectionHandlers as {
      objection: string;
      response: string;
    }[],
  };

  const improvedPersona = await improvePersonaFromInsights(currentPersona, insights);

  // Save new version (PENDING_REVIEW — user must approve)
  const lastConfig = await prisma.agentConfig.findFirst({
    where: { workspaceId },
    orderBy: { version: 'desc' },
  });
  const nextVersion = (lastConfig?.version ?? 0) + 1;

  const savedInsights = await prisma.learningInsight.findMany({
    where: { workspaceId, appliedToVersion: null },
    select: { id: true },
  });

  const newConfig = await prisma.agentConfig.create({
    data: {
      workspaceId,
      version: nextVersion,
      status: 'PENDING_REVIEW',
      systemPrompt: improvedPersona.systemPrompt,
      openingScript: improvedPersona.openingScript,
      qualifyingQuestions: improvedPersona.qualifyingQuestions,
      objectionHandlers: improvedPersona.objectionHandlers,
      generatedFromInsights: savedInsights.map((i) => i.id),
    },
  });

  // Mark insights as applied to this version
  await prisma.learningInsight.updateMany({
    where: { id: { in: savedInsights.map((i) => i.id) } },
    data: { appliedToVersion: nextVersion },
  });

  logger.info(
    `Learning loop complete: v${nextVersion} created (PENDING_REVIEW) for workspace ${workspaceId}`
  );

  return {
    insightsGenerated: insights.length,
    newAgentVersion: nextVersion,
    insights,
  };
};
