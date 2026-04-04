import { z } from 'zod';

export const phoneNumberUpsertSchema = z.object({
  number: z.string().trim().min(1),
  provider: z.literal('twilio').default('twilio'),
  providerSid: z.string().trim().min(1).optional(),
  forwardingNumber: z.string().trim().min(1).optional(),
  isActive: z.boolean().default(true),
});
