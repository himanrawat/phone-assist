import { z } from 'zod';

const timeValueSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const workingHoursSchema = z.array(z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeValueSchema,
  endTime: timeValueSchema,
  isActive: z.boolean().default(true),
}));
