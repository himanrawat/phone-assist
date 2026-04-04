import { z } from 'zod';

export const updateGlobalProviderSchema = z.object({
  telephonyProvider: z.literal('twilio').optional(),
  sttProvider: z.enum(['deepgram', 'groq', 'openai']).optional(),
  ttsProvider: z.enum(['groq', 'openai']).optional(),
});

export const updateTenantProviderSchema = z.object({
  telephonyProvider: z.literal('twilio').nullable().optional(),
  sttProvider: z.enum(['deepgram', 'groq', 'openai']).nullable().optional(),
});
