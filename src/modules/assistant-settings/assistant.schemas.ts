import { z } from 'zod';

export const assistantSettingsSchema = z.object({
  primaryLanguage: z.string().trim().min(1).max(16),
  multilingualEnabled: z.boolean(),
});
