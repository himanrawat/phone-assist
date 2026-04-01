import type { FastifyInstance } from 'fastify';
import { db } from '../../config/database.js';
import { calls, callMessages } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

export async function callRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/calls
   * List calls (for now, all calls — tenant filtering added in Phase 2)
   */
  fastify.get('/api/v1/calls', async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await db
      .select()
      .from(calls)
      .orderBy(desc(calls.startedAt))
      .limit(limit)
      .offset(offset);

    reply.send({ data: result, limit, offset });
  });

  /**
   * GET /api/v1/calls/:id
   * Get a single call with its messages
   */
  fastify.get('/api/v1/calls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, id))
      .limit(1);

    if (!call) {
      reply.status(404).send({ error: 'Call not found' });
      return;
    }

    const messages = await db
      .select()
      .from(callMessages)
      .where(eq(callMessages.callId, id))
      .orderBy(callMessages.timestamp);

    reply.send({ data: { ...call, messages } });
  });
}
