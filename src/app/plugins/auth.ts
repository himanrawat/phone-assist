import type { FastifyInstance } from 'fastify';
import { resolveSessionFromRequest } from '../../shared/auth/session.js';

export async function registerAuthPlugin(fastify: FastifyInstance) {
  fastify.addHook('onRequest', async (request, reply) => {
    const context = await resolveSessionFromRequest({
      cookieHeader: request.headers.cookie,
    });

    if (!context) {
      return;
    }

    request.user = context.user;
    request.tenant = context.tenant;
    request.tenantMemberships = context.memberships;
    request.sessionId = context.sessionId;
    request.invalidActiveTenant = context.invalidActiveTenant;

    if (context.sessionCookie) {
      reply.header('Set-Cookie', context.sessionCookie);
    }
  });
}
