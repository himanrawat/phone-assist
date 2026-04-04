export interface PaginationParams {
  limit: number;
  offset: number;
}

export function parsePagination(input: { limit?: string | number; offset?: string | number }) {
  const rawLimit = typeof input.limit === 'number' ? input.limit : Number.parseInt(input.limit ?? '50', 10);
  const rawOffset = typeof input.offset === 'number' ? input.offset : Number.parseInt(input.offset ?? '0', 10);

  return {
    limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50,
    offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0,
  } satisfies PaginationParams;
}
