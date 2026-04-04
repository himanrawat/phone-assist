import type { FastifyInstance } from 'fastify';
import { requireAuth, requireTenantRole } from '../../shared/auth/guards.js';
import { inviteMemberSchema } from './memberships.schemas.js';
import { createInvitation, listTenantMembers } from './memberships.service.js';

export async function membershipRoutes(fastify: FastifyInstance) {
  fastify.get('/api/v1/admin/team', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    reply.send({ data: await listTenantMembers(request.tenant!.id) });
  });

  fastify.post('/api/v1/admin/team/invite', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin')],
  }, async (request, reply) => {
    const body = inviteMemberSchema.parse(request.body);
    const invitation = await createInvitation({
      tenantId: request.tenant!.id,
      email: body.email,
      role: body.role,
      invitedBy: request.user!.id,
    });

    reply.send({ success: true, data: invitation });
  });
}
