import { z } from 'zod';

export const contactUpsertSchema = z.object({
  name: z.string().trim().optional(),
  phone: z.string().trim().min(1),
  email: z.union([z.literal(''), z.string().trim().pipe(z.email())]).optional(),
  company: z.string().trim().optional(),
  tags: z.array(z.string()).default([]),
  isVip: z.boolean().default(false),
  isBlocked: z.boolean().default(false),
  notes: z.string().optional(),
});
