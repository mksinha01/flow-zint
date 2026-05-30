import { Response, Request } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { dispatchOutboundCall } from '../services/livekit.service';
import { getActiveAgentConfig } from '../services/persona.service';
import { analyzeCallTranscript } from '../services/gemini.service';
import { sendCallSummaryEmail } from '../services/resend.service';
import { syncLeadToHubSpot } from '../services/crm.service';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response.util';
import { logger } from '../config/logger';

export const listCalls = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { page = 1, limit = 20, status } = req.query as any;
  const skip = (Number(page) - 1) * Number(limit);

  const where: any = { workspaceId };
  if (status) where.status = status;

  const [calls, total] = await Promise.all([
    prisma.call.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        lead: { select: { name: true, phone: true, company: true } },
        analysis: { select: { leadScore: true, classification: true, sentiment: true, objections: true } },
        agentConfig: { select: { version: true } },
      },
    }),
    prisma.call.count({ where }),
  ]);

  const callsWithParsedAnalysis = calls.map(call => {
    const c = call as any;
    if (c.analysis && typeof c.analysis.objections === 'string') {
      try {
        c.analysis.objections = JSON.parse(c.analysis.objections);
      } catch {
        c.analysis.objections = [];
      }
    }
    return c;
  });

  sendSuccess(res, { calls: callsWithParsedAnalysis }, 'Calls retrieved', 200, {
    page: Number(page),
    limit: Number(limit),
    total,
    totalPages: Math.ceil(total / Number(limit)),
  });
};

export const dispatchCall = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { leadId } = req.body;

  const lead = await prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!lead) {
    sendNotFound(res, 'Lead');
    return;
  }

  const agentConfig = await getActiveAgentConfig(workspaceId);
  if (!agentConfig) {
    sendError(res, 'No active agent config. Generate and activate one first.', 400);
    return;
  }

  // Create call record
  const call = await prisma.call.create({
    data: {
      workspaceId,
      leadId,
      agentConfigId: agentConfig.id,
      status: 'QUEUED',
    },
  });

  // Dispatch via LiveKit
  let roomName: string;
  try {
    roomName = await dispatchOutboundCall({
      phoneNumber: lead.phone,
      callId: call.id,
      leadName: lead.name,
      leadCompany: lead.company || undefined,
      leadNotes: lead.notes || undefined,
      agentConfigId: agentConfig.id,
      workspaceId,
    });
  } catch (err: any) {
    logger.error('Failed to dispatch call via LiveKit:', err);
    // Delete the queued call record to avoid stale entries
    await prisma.call.delete({ where: { id: call.id } });
    sendError(res, `LiveKit Dispatch Failure: ${err.message || err}`, 500);
    return;
  }

  // Update call with room
  await prisma.call.update({
    where: { id: call.id },
    data: { livekitRoomId: roomName, status: 'IN_PROGRESS', startedAt: new Date() },
  });

  // Update lead status
  await prisma.lead.update({ where: { id: leadId }, data: { status: 'CALLED' } });

  logger.info(`Call dispatched: ${call.id} → ${lead.phone} (Agent v${agentConfig.version})`);
  sendCreated(res, { call: { ...call, livekitRoomId: roomName } }, 'Call dispatched successfully');
};

export const getCall = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { callId } = req.params;

  const call = await prisma.call.findFirst({
    where: { id: callId, workspaceId },
    include: {
      lead: true,
      analysis: true,
      agentConfig: { select: { version: true, openingScript: true } },
      booking: true,
    },
  });

  if (!call) {
    sendNotFound(res, 'Call');
    return;
  }

  const parsedCall = call as any;
  if (parsedCall.analysis && typeof parsedCall.analysis.objections === 'string') {
    try {
      parsedCall.analysis.objections = JSON.parse(parsedCall.analysis.objections);
    } catch {
      parsedCall.analysis.objections = [];
    }
  }

  sendSuccess(res, { call: parsedCall });
};

/**
 * LiveKit webhook handler.
 * Called when call events happen: room_started, room_finished, participant_joined, etc.
 */
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
  // LiveKit sends webhook events as JSON
  const event = req.body;
  logger.info(`LiveKit webhook received: ${event.event}`, { room: event.room?.name });

  if (event.event === 'room_finished') {
    const roomName = event.room?.name as string;
    if (!roomName?.startsWith('call-')) {
      res.sendStatus(200);
      return;
    }

    const callId = roomName.replace('call-', '');

    // Get the call
    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        lead: true,
        agentConfig: true,
      },
    });

    if (!call) {
      logger.warn(`Webhook: call not found for room ${roomName}`);
      res.sendStatus(200);
      return;
    }

    const duration = call.startedAt
      ? Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
      : 0;

    // Mark call as completed
    await prisma.call.update({
      where: { id: callId },
      data: { status: 'COMPLETED', endedAt: new Date(), duration },
    });

    // Run analysis asynchronously
    runCallAnalysis(callId).catch((err) => {
      logger.error(`Error in runCallAnalysis from webhook:`, err);
    });
  }

  res.sendStatus(200);
};

export const runCallAnalysis = async (callId: string): Promise<void> => {
  try {
    // Check if analysis already exists to avoid duplicate work
    const existingAnalysis = await prisma.callAnalysis.findUnique({
      where: { callId },
    });
    if (existingAnalysis) {
      logger.info(`Call ${callId} already analyzed.`);
      return;
    }

    const call = await prisma.call.findUnique({
      where: { id: callId },
      include: {
        lead: true,
        agentConfig: true,
      },
    });

    if (!call || !call.transcript || !call.agentConfig) {
      logger.info(`Skipping analysis for call ${callId}: call found=${!!call}, transcript length=${call?.transcript?.length || 0}`);
      return;
    }

    const businessContext = await prisma.businessContext.findUnique({
      where: { workspaceId: call.workspaceId },
    });

    const analysisResult = await analyzeCallTranscript(call.transcript, {
      companyName: businessContext?.companyName || 'the company',
      productDescription: businessContext?.productDescription || '',
      callObjective: businessContext?.callObjective || 'qualify',
    });

    await prisma.callAnalysis.create({
      data: {
        callId,
        workspaceId: call.workspaceId,
        ...analysisResult,
        objections: JSON.stringify(analysisResult.objections),
      },
    });

    // Update lead status based on classification
    const newStatus =
      analysisResult.classification === 'HOT' ? 'QUALIFIED' :
      analysisResult.classification === 'COLD' ? 'DISQUALIFIED' : 'CALLED';

    await prisma.lead.update({
      where: { id: call.leadId },
      data: { status: newStatus },
    });

    // Send summary email + CRM sync (non-blocking)
    const workspace = await prisma.workspace.findUnique({
      where: { id: call.workspaceId },
      include: { owner: { select: { email: true, name: true } } },
    });

    if (workspace?.owner) {
      sendCallSummaryEmail({
        toEmail: workspace.owner.email,
        toName: workspace.owner.name,
        leadName: call.lead.name,
        leadPhone: call.lead.phone,
        summary: analysisResult.summary,
        leadScore: analysisResult.leadScore,
        classification: analysisResult.classification,
        sentiment: analysisResult.sentiment,
        buyingIntent: analysisResult.buyingIntent,
        callDuration: call.duration || 0,
      }).catch(() => {});

      syncLeadToHubSpot({
        name: call.lead.name,
        email: call.lead.email || undefined,
        phone: call.lead.phone,
        company: call.lead.company || undefined,
        leadScore: analysisResult.leadScore,
        classification: analysisResult.classification,
        notes: analysisResult.summary,
      }).catch(() => {});
    }

    logger.info(`Call ${callId} successfully analyzed: score=${analysisResult.leadScore} (${analysisResult.classification})`);
  } catch (err) {
    logger.error(`Failed to analyze call ${callId}:`, err);
  }
};
