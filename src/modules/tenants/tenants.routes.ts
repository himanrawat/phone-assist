import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePlatformRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import { tenantUpsertSchema } from './tenants.schemas.js';
import { createTenant, getTenantById, listTenants, updateTenant } from './tenants.service.js';

export async function tenantRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/platform/tenants', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (_request, reply) => {
    reply.send({ data: await listTenants() });
  });

  fastify.get('/api/v1/platform/tenants/:id', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin', 'platform_support')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = await getTenantById(id);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    reply.send({ data: tenant });
  });

  fastify.post('/api/v1/platform/tenants', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const body = tenantUpsertSchema.parse(request.body);
    reply.send({ success: true, data: await createTenant(body) });
  });

  fastify.put('/api/v1/platform/tenants/:id', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = tenantUpsertSchema.parse(request.body);
    const tenant = await updateTenant(id, body);
    if (!tenant) {
      throw notFound('Tenant not found.');
    }
    reply.send({ success: true, data: tenant });
  });
}
