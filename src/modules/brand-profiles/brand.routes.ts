import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePlatformRole, requireTenantRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import { brandProfileInputSchema } from './brand.schemas.js';
import {
  getBrandProfileByTenantId,
  getTenantSummary,
  upsertBrandProfile,
} from './brand.service.js';

export async function brandRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/brand', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    const tenant = request.tenant!;
    const data = await getBrandProfileByTenantId(tenant.id);
    reply.send({ data, tenant });
  });

  fastify.put('/api/v1/admin/brand', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager')],
  }, async (request, reply) => {
    const tenant = request.tenant!;
    const body = brandProfileInputSchema.parse(request.body);
    const data = await upsertBrandProfile(tenant.id, body);
    reply.send({ success: true, data, tenant });
  });

  fastify.get('/api/v1/platform/tenants/:tenantId/brand', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const tenant = await getTenantSummary(tenantId);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    const data = await getBrandProfileByTenantId(tenantId);
    reply.send({ data, tenant });
  });

  fastify.put('/api/v1/platform/tenants/:tenantId/brand', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const tenant = await getTenantSummary(tenantId);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    const body = brandProfileInputSchema.parse(request.body);
    const data = await upsertBrandProfile(tenantId, body);
    reply.send({ success: true, data, tenant });
  });
}
