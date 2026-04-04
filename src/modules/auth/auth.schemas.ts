import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(8),
  name: z.string().trim().min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  password: z.string().min(1),
});

export const switchTenantSchema = z.object({
  tenantId: z.string().trim().pipe(z.uuid()),
});
