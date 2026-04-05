import { z } from 'zod';

export const tenantUpsertSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  industry: z.string().trim().min(1).optional(),
  timezone: z.string().trim().min(1),
});

export const tenantAdminInputSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  name: z.string().trim().min(1),
  password: z.string().min(8).optional(),
});

export const tenantCreateWithAdminSchema = tenantUpsertSchema.extend({
  planId: z.string().trim().pipe(z.uuid()).optional(),
  admin: tenantAdminInputSchema,
});

export const addTenantAdminSchema = tenantAdminInputSchema;
