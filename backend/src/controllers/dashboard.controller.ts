import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { sendSuccess } from '../utils/response.util';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

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
    activeAgent,
  ] = await Promise.all([
    prisma.lead.count({ where: { workspaceId } }),
    prisma.call.count({ where: { workspaceId } }),
    prisma.call.count({ where: { workspaceId, createdAt: { gte: todayStart } } }),
    prisma.call.count({ where: { workspaceId, createdAt: { gte: weekStart } } }),
    prisma.callAnalysis.count({ where: { workspaceId, classification: 'HOT' } }),
    prisma.callAnalysis.count({ where: { workspaceId, classification: 'WARM' } }),
    prisma.callAnalysis.count({ where: { workspaceId, classification: 'COLD' } }),
    prisma.callAnalysis.aggregate({
      where: { workspaceId },
      _avg: { leadScore: true },
    }),
    prisma.booking.count({ where: { workspaceId } }),
    prisma.agentConfig.findFirst({
      where: { workspaceId, status: 'ACTIVE' },
      select: { version: true, activatedAt: true },
    }),
  ]);

  const completedCalls = await prisma.call.count({
    where: { workspaceId, status: 'COMPLETED' },
  });

  const successRate = completedCalls > 0 ? Math.round((hotLeads / completedCalls) * 100) : 0;

  sendSuccess(res, {
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
      activeAgentVersion: activeAgent?.version || null,
    },
  });
};

export const getDashboardCharts = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  // Call volume by day (last 14 days)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const recentCalls = await prisma.call.findMany({
    where: { workspaceId, createdAt: { gte: twoWeeksAgo } },
    select: { createdAt: true, status: true },
  });

  // Group by day
  const callsByDay: Record<string, { total: number; completed: number }> = {};
  recentCalls.forEach((call) => {
    const day = call.createdAt.toISOString().slice(0, 10);
    if (!callsByDay[day]) callsByDay[day] = { total: 0, completed: 0 };
    callsByDay[day].total++;
    if (call.status === 'COMPLETED') callsByDay[day].completed++;
  });

  // Lead score distribution
  const analyses = await prisma.callAnalysis.findMany({
    where: { workspaceId },
    select: { leadScore: true, classification: true, sentiment: true, objections: true },
  });

  // Top objections
  const objectionCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    const objs = (typeof a.objections === "string" ? JSON.parse(a.objections) : a.objections) as Array<{ text: string }>;
    if (Array.isArray(objs)) {
      objs.forEach((obj) => {
        const key = obj.text.toLowerCase().slice(0, 50);
        objectionCounts[key] = (objectionCounts[key] || 0) + 1;
      });
    }
  });

  const topObjections = Object.entries(objectionCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([text, count]) => ({ text, count }));

  // Score distribution buckets
  const scoreBuckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  analyses.forEach((a) => {
    if (a.leadScore <= 20) scoreBuckets['0-20']++;
    else if (a.leadScore <= 40) scoreBuckets['21-40']++;
    else if (a.leadScore <= 60) scoreBuckets['41-60']++;
    else if (a.leadScore <= 80) scoreBuckets['61-80']++;
    else scoreBuckets['81-100']++;
  });

  sendSuccess(res, {
    charts: {
      callVolume: callsByDay,
      scoreDistribution: scoreBuckets,
      topObjections,
      classificationBreakdown: {
        HOT: analyses.filter((a) => a.classification === 'HOT').length,
        WARM: analyses.filter((a) => a.classification === 'WARM').length,
        COLD: analyses.filter((a) => a.classification === 'COLD').length,
      },
    },
  });
};
