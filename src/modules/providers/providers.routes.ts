import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { tenants } from '../../shared/db/schema.js';
import { requireAuth, requirePlatformRole } from '../../shared/auth/guards.js';
import { updateGlobalProviderSchema, updateTenantProviderSchema } from './providers.schemas.js';
import { providerConfigService } from './providers.service.js';

export async function providerRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/platform/providers', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (_request, reply) => {
    reply.send({ data: providerConfigService.getGlobalConfig() });
  });

  fastify.put('/api/v1/platform/providers', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const body = updateGlobalProviderSchema.parse(request.body);
    const data = await providerConfigService.updateGlobalConfig(body);
    reply.send({ success: true, data });
  });

  fastify.put('/api/v1/platform/tenants/:tenantId/providers', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
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

  fastify.get('/api/v1/admin/providers', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (_request, reply) => {
    reply.send({ data: providerConfigService.getGlobalConfig() });
  });

  fastify.put('/api/v1/admin/providers', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const body = updateGlobalProviderSchema.parse(request.body);
    const data = await providerConfigService.updateGlobalConfig(body);
    reply.send({ success: true, data });
  });
}
