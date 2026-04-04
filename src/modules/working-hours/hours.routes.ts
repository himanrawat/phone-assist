import type { FastifyInstance } from 'fastify';
import { requireAuth, requireTenantRole } from '../../shared/auth/guards.js';
import { workingHoursSchema } from './hours.schemas.js';
import { getWorkingHours, replaceWorkingHours } from './hours.service.js';

export async function workingHoursRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/working-hours', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, async (request, reply) => {
    reply.send({ data: await getWorkingHours(request.tenant!.id) });
  });

  fastify.put('/api/v1/admin/working-hours', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    const body = workingHoursSchema.parse(request.body);
    reply.send({ success: true, data: await replaceWorkingHours(request.tenant!.id, body) });
  });
}
