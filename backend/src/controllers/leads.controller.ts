import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/database';
import { sendSuccess, sendCreated, sendError, sendNotFound } from '../utils/response.util';
import { logger } from '../config/logger';

export const listLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    logger.error('Error in listLeads:', error);
    sendError(res, 'Failed to retrieve leads', 500, error.message);
  }
};

export const createLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const { name, phone } = req.body;

    if (!name || !phone) {
      sendError(res, 'Name and phone number are required', 400);
      return;
    }

    const lead = await prisma.lead.create({
      data: { workspaceId, ...req.body },
    });

    sendCreated(res, { lead }, 'Lead created');
  } catch (error: any) {
    logger.error('Error in createLead:', error);
    sendError(res, 'Failed to create lead', 500, error.message);
  }
};

export const getLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
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
  } catch (error: any) {
    logger.error('Error in getLead:', error);
    sendError(res, 'Failed to retrieve lead', 500, error.message);
  }
};

export const updateLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const { leadId } = req.params;

    const existing = await prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
    if (!existing) {
      sendNotFound(res, 'Lead');
      return;
    }

    const lead = await prisma.lead.update({ where: { id: leadId }, data: req.body });
    sendSuccess(res, { lead }, 'Lead updated');
  } catch (error: any) {
    logger.error('Error in updateLead:', error);
    sendError(res, 'Failed to update lead', 500, error.message);
  }
};

export const deleteLead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const { leadId } = req.params;

    const existing = await prisma.lead.findFirst({ where: { id: leadId, workspaceId } });
    if (!existing) {
      sendNotFound(res, 'Lead');
      return;
    }

    // Transactionally delete all child references and then the lead itself to respect SQLite constraints
    await prisma.$transaction([
      prisma.booking.deleteMany({ where: { leadId } }),
      prisma.call.deleteMany({ where: { leadId } }),
      prisma.lead.delete({ where: { id: leadId } }),
    ]);

    sendSuccess(res, null, 'Lead deleted');
  } catch (error: any) {
    logger.error('Error in deleteLead:', error);
    sendError(res, 'Cannot delete lead due to database constraint.', 400, error.message);
  }
};

export const bulkImportLeads = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const workspaceId = req.user!.workspaceId!;
    const { leads } = req.body as { leads: Array<any> };

    if (!Array.isArray(leads) || leads.length === 0) {
      sendError(res, 'Provide an array of leads', 400);
      return;
    }

    const dataToInsert = leads
      .map((l) => {
        const extraDetails = Object.keys(l)
          .filter(k => !['name', 'phone', 'email', 'company'].includes(k))
          .map(k => `${k}: ${l[k]}`)
          .join('\\n');
          
        return {
          workspaceId,
          name: l.name || 'Unnamed',
          phone: l.phone || '',
          email: l.email || null,
          company: l.company || null,
          notes: extraDetails || null
        };
      })
      .filter((d) => d.phone && d.phone.trim() !== ''); // Defensive: filter out any rows with empty phones

    if (dataToInsert.length === 0) {
      sendError(res, 'No valid leads with phone numbers were provided', 400);
      return;
    }

    const created = await prisma.lead.createMany({
      data: dataToInsert,
    });

    sendCreated(res, { count: created.count }, `${created.count} leads imported successfully`);
  } catch (error: any) {
    logger.error('Error in bulkImportLeads:', error);
    sendError(res, 'Failed to import leads', 500, error.message);
  }
};
