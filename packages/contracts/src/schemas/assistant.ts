import { z } from "zod/v4";

const languageCodeSchema = z.string().trim().min(1).max(16);

export const assistantUpdateSchema = z.object({
  primaryLanguage: z.string().min(1),
  multilingualEnabled: z.boolean(),
  allowedLanguages: z.array(languageCodeSchema).min(1).optional(),
});
