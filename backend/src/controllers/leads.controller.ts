import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response.util';

export const listLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { page = 1, limit = 20, status, search } = req.query as any;

  const skip = (Number(page) - 1) * Number(limit);
  const where: any = { workspaceId };

  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { analysis: { select: { leadScore: true, classification: true, sentiment: true } } },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  sendSuccess(
    res,
    { leads },
    'Leads retrieved',
    200,
    { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) }
  );
};

export const createLead = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;

  const lead = await prisma.lead.create({
    data: { workspaceId, ...req.body },
  });

  sendCreated(res, { lead }, 'Lead created');
};

export const getLead = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { leadId } = req.params;

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, workspaceId },
    include: {
      calls: {
        orderBy: { createdAt: 'desc' },
        include: {
          analysis: true,
          agentConfig: { select: { version: true, status: true } },
        },
      },
      bookings: true,
    },
  });

  if (!lead) {
    sendNotFound(res, 'Lead');
    return;
  }

  sendSuccess(res, { lead });
};

export const updateLead = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { leadId } = req.params;

  const existing = await prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!existing) {
    sendNotFound(res, 'Lead');
    return;
  }

  const lead = await prisma.lead.update({ where: { id: leadId }, data: req.body });
  sendSuccess(res, { lead }, 'Lead updated');
};

export const deleteLead = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { leadId } = req.params;

  const existing = await prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
  if (!existing) {
    sendNotFound(res, 'Lead');
    return;
  }

  await prisma.lead.delete({ where: { id: leadId } });
  sendSuccess(res, null, 'Lead deleted');
};

export const bulkImportLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  const workspaceId = req.user!.workspaceId!;
  const { leads } = req.body as { leads: Array<{ name: string; phone: string; email?: string; company?: string }> };

  if (!Array.isArray(leads) || leads.length === 0) {
    sendError(res, 'Provide an array of leads');
    return;
  }

  const created = await prisma.lead.createMany({
    data: leads.map((l) => ({ workspaceId, ...l })),
    skipDuplicates: true,
  });

  sendCreated(res, { count: created.count }, `${created.count} leads imported`);
};
