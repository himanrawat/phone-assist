import { z } from 'zod';

export const tenantUpsertSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  industry: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1),
});
