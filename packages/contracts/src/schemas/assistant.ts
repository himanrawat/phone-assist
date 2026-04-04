import { z } from "zod/v4";

export const assistantUpdateSchema = z.object({
  primaryLanguage: z.string().min(1),
  multilingualEnabled: z.boolean(),
});
