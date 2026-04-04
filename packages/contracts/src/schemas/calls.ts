import { z } from "zod/v4";

export const callsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const outboundCallSchema = z.object({
  to: z.string().min(1),
  from: z.string().optional(),
  publicBaseUrl: z.string().optional(),
});
