import { z } from 'zod';

export const inviteMemberSchema = z.object({
  email: z.string().trim().pipe(z.email()),
  role: z.enum(['tenant_admin', 'tenant_manager', 'tenant_viewer']),
});
