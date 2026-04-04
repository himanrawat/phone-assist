import type { FastifyInstance } from 'fastify';
import type { TenantMembershipSummary } from '../../shared/types/common.js';

export async function registerRequestContextPlugin(fastify: FastifyInstance) {
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('tenant', null);
  fastify.decorateRequest('tenantMemberships', null as unknown as TenantMembershipSummary[]);
  fastify.decorateRequest('sessionId', null);
  fastify.decorateRequest('invalidActiveTenant', false);

  fastify.addHook('onRequest', async (request, reply) => {
    request.user = null;
    request.tenant = null;
    request.tenantMemberships = [];
    request.sessionId = null;
    request.invalidActiveTenant = false;
    reply.header('x-request-id', request.id);
  });
}
