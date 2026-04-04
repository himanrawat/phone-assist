import { z } from "zod/v4";

export const teamInviteSchema = z.object({
  email: z.email(),
  role: z.enum(["tenant_admin", "tenant_manager", "tenant_viewer"]),
});
