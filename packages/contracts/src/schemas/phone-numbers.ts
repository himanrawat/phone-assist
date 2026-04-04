import { z } from "zod/v4";

export const phoneNumberUpsertSchema = z.object({
  number: z.string().min(1),
  provider: z.string().default("twilio"),
  providerSid: z.string().optional(),
  forwardingNumber: z.string().optional(),
  isActive: z.boolean().default(true),
});
