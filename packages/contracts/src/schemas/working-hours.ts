import { z } from "zod/v4";

export const workingHourSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
});

export const workingHoursUpdateSchema = z.array(workingHourSchema);
