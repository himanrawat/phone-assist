import { z } from 'zod';

export const createOutboundCallSchema = z.object({
  to: z.string().trim().min(1),
  from: z.string().trim().min(1).optional(),
  publicBaseUrl: z.url().optional(),
});
