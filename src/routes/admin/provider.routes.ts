import type { FastifyInstance } from 'fastify';
import { db } from '../../config/database.js';
import { providerConfig, tenants } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const updateGlobalProviderSchema = z.object({
  telephonyProvider: z.literal('twilio').optional(),
  sttProvider: z.enum(['deepgram', 'groq']).optional(),
});

const updateTenantProviderSchema = z.object({
  telephonyProvider: z.literal('twilio').nullable().optional(),
  sttProvider: z.enum(['deepgram', 'groq']).nullable().optional(),
});

export async function providerRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/admin/providers
   * Get current global provider configuration
   */
  fastify.get('/api/v1/admin/providers', async (_request, reply) => {
    const configs = await db.select().from(providerConfig);

    const result: Record<string, string> = {};
    for (const c of configs) {
      result[c.key] = c.key === 'telephony' ? 'twilio' : c.provider;
    }

    result.telephony ??= 'twilio';

    reply.send({ data: result });
  });

  /**
   * PUT /api/v1/admin/providers
   * Update global provider configuration (Super Admin)
   */
  fastify.put('/api/v1/admin/providers', async (request, reply) => {
    const body = updateGlobalProviderSchema.parse(request.body);

    const updates: Promise<unknown>[] = [];

    if (body.telephonyProvider) {
      updates.push(
        db
          .insert(providerConfig)
          .values({ key: 'telephony', provider: body.telephonyProvider })
          .onConflictDoUpdate({
            target: providerConfig.key,
            set: { provider: body.telephonyProvider, updatedAt: new Date() },
          })
      );
    }

    if (body.sttProvider) {
      updates.push(
        db
          .insert(providerConfig)
          .values({ key: 'stt', provider: body.sttProvider })
          .onConflictDoUpdate({
            target: providerConfig.key,
            set: { provider: body.sttProvider, updatedAt: new Date() },
          })
      );
    }

    await Promise.all(updates);
    reply.send({ success: true });
  });

  /**
   * PUT /api/v1/admin/tenants/:tenantId/providers
   * Override provider for a specific tenant (Super Admin)
   * Pass null to reset to global default.
   */
  fastify.put('/api/v1/admin/tenants/:tenantId/providers', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = updateTenantProviderSchema.parse(request.body);

    const updates: Record<string, unknown> = {};
    if (body.telephonyProvider !== undefined) {
      updates.telephonyProvider = body.telephonyProvider;
    }
    if (body.sttProvider !== undefined) {
      updates.sttProvider = body.sttProvider;
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(tenants)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));
    }

    reply.send({ success: true });
  });
}
