import type { ZodType } from 'zod';

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown) {
  return schema.parse(input);
}
