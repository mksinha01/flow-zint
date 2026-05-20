import { z } from 'zod';

export const createLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    phone: z.string().min(7).max(20),
    email: z.string().email().optional().or(z.literal('')),
    company: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    notes: z.string().optional(),
  }),
});

export const updateLeadSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    phone: z.string().min(7).max(20).optional(),
    email: z.string().email().optional(),
    company: z.string().max(200).optional(),
    jobTitle: z.string().max(200).optional(),
    status: z.enum(['NEW', 'CALLED', 'QUALIFIED', 'DISQUALIFIED', 'BOOKED']).optional(),
    notes: z.string().optional(),
  }),
  params: z.object({
    leadId: z.string().cuid(),
  }),
});

export const leadsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.enum(['NEW', 'CALLED', 'QUALIFIED', 'DISQUALIFIED', 'BOOKED']).optional(),
    classification: z.enum(['HOT', 'WARM', 'COLD']).optional(),
    search: z.string().optional(),
  }),
});

export const dispatchCallSchema = z.object({
  body: z.object({
    leadId: z.string().cuid(),
  }),
});
