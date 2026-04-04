import { z } from "zod/v4";

export const contactUpsertSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.email().optional(),
  company: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isVip: z.boolean().default(false),
  isBlocked: z.boolean().default(false),
  notes: z.string().optional(),
});
