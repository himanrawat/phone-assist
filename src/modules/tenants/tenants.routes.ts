import type { FastifyInstance } from 'fastify';
import { requireAuth, requirePlatformRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import {
  addTenantAdminSchema,
  tenantCreateWithAdminSchema,
  tenantUpsertSchema,
} from './tenants.schemas.js';
import {
  addTenantAdmin,
  createTenantWithAdmin,
  getTenantById,
  listTenants,
  updateTenant,
} from './tenants.service.js';

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
    const body = tenantCreateWithAdminSchema.parse(request.body);
    const result = await createTenantWithAdmin({
      tenant: body,
      admin: body.admin,
      planId: body.planId,
      createdBy: request.user!.id,
    });

    reply.send({
      success: true,
      data: result.tenant,
      admin: {
        id: result.admin.id,
        email: result.admin.email,
        name: result.admin.name,
      },
    });
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

  fastify.post('/api/v1/platform/tenants/:id/admins', {
    preHandler: [requireAuth, requirePlatformRole('platform_super_admin')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = addTenantAdminSchema.parse(request.body);
    const user = await addTenantAdmin(id, body);

    reply.send({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  });
}
