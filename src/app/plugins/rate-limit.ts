import type { FastifyInstance } from 'fastify';
import { env } from '../../shared/config/env.js';
import { rateLimited } from '../../shared/errors/errors.js';

const buckets = new Map<string, { count: number; resetAt: number }>();

export async function registerRateLimitPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request) => {
    if (request.method !== 'POST' || !request.url.startsWith('/api/v1/auth/')) {
      return;
    }

    const key = `${request.ip}:${request.url}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + env.RATE_LIMIT_WINDOW_MS,
      });
      return;
    }

    existing.count += 1;
    if (existing.count > env.AUTH_RATE_LIMIT_MAX) {
      throw rateLimited();
    }
  });
}
