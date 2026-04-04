import type { FastifyInstance } from 'fastify';
import { requireAuth, requireTenantRole } from '../../shared/auth/guards.js';
import { phoneNumberUpsertSchema } from './numbers.schemas.js';
import { listPhoneNumbers, upsertPhoneNumber } from './numbers.service.js';

export async function phoneNumberRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/phone-numbers', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    reply.send({ data: await listPhoneNumbers(request.tenant!.id) });
  });

  fastify.put('/api/v1/admin/phone-numbers', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    const body = phoneNumberUpsertSchema.parse(request.body);
    reply.send({ success: true, data: await upsertPhoneNumber(request.tenant!.id, body) });
  });
}
