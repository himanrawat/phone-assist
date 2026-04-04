import { z } from "zod/v4";

export const tenantCreateSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  industry: z.string().optional(),
  timezone: z.string().min(1),
});

export const tenantUpdateSchema = tenantCreateSchema;
