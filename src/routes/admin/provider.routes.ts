import type { FastifyInstance } from 'fastify';
import { db } from '../../config/database.js';
import { tenants } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { providerConfigService } from '../../services/provider/provider-config.service.js';

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
    reply.send({ data: providerConfigService.getGlobalConfig() });
  });

  /**
   * PUT /api/v1/admin/providers
   * Update global provider configuration (Super Admin)
   */
  fastify.put('/api/v1/admin/providers', async (request, reply) => {
    const body = updateGlobalProviderSchema.parse(request.body);

    if (body.sttProvider === 'groq') {
      reply.status(400).send({
        error: 'Groq Whisper is not supported for real-time Twilio calls yet. Use Deepgram.',
      });
      return;
    }

    const data = await providerConfigService.updateGlobalConfig(body);
    reply.send({ success: true, data });
  });

  /**
   * PUT /api/v1/admin/tenants/:tenantId/providers
   * Override provider for a specific tenant (Super Admin)
   * Pass null to reset to global default.
   */
  fastify.put('/api/v1/admin/tenants/:tenantId/providers', async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const body = updateTenantProviderSchema.parse(request.body);

    if (body.sttProvider === 'groq') {
      reply.status(400).send({
        error: 'Groq Whisper is not supported for real-time Twilio calls yet. Use Deepgram.',
      });
      return;
    }

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
