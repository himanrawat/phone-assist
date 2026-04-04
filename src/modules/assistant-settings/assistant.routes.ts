import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePlatformRole, requireTenantRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import { assistantSettingsSchema } from './assistant.schemas.js';
import {
  getAssistantSettings,
  getTenantSummary,
  updateAssistantSettings,
} from './assistant.service.js';

export async function assistantRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/assistant', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    const tenant = request.tenant!;
    const data = await getAssistantSettings(tenant.id);
    reply.send({ data, tenant });
  });

  fastify.put('/api/v1/admin/assistant', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    const tenant = request.tenant!;
    const body = assistantSettingsSchema.parse(request.body);
    const data = await updateAssistantSettings(tenant.id, body);
    reply.send({ success: true, data, tenant });
  });

  fastify.get('/api/v1/platform/tenants/:tenantId/assistant', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const tenant = await getTenantSummary(tenantId);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    const data = await getAssistantSettings(tenantId);
    reply.send({ data, tenant });
  });

  fastify.put('/api/v1/platform/tenants/:tenantId/assistant', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const tenant = await getTenantSummary(tenantId);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    const body = assistantSettingsSchema.parse(request.body);
    const data = await updateAssistantSettings(tenantId, body);
    reply.send({ success: true, data, tenant });
  });
}
