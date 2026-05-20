import { z } from 'zod';

export const businessContextSchema = z.object({
  body: z.object({
    companyName: z.string().min(1).max(200),
    productDescription: z.string().min(10),
    targetCustomer: z.string().min(10),
    keyPainPoints: z.string().min(10),
    pricing: z.string().optional(),
    competitorNames: z.string().optional(),
    callObjective: z.enum(['book_demo', 'qualify', 'sell_direct']),
    voiceStyle: z.enum(['FORMAL', 'CASUAL', 'AGGRESSIVE', 'EMPATHETIC']).default('FORMAL'),
    additionalNotes: z.string().optional(),
  }),
});
