import { z } from "zod/v4";

export const globalProviderUpdateSchema = z.object({
  telephonyProvider: z.string().optional(),
  sttProvider: z.string().optional(),
  ttsProvider: z.string().optional(),
});

export const tenantProviderOverrideSchema = z.object({
  telephonyProvider: z.string().optional(),
  sttProvider: z.string().optional(),
});
