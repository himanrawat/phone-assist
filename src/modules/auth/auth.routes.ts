import type { FastifyInstance } from 'fastify';
import { clearSessionCookie } from '../../shared/auth/session.js';
import { requireAuth } from '../../shared/auth/guards.js';
import { authService } from './auth.service.js';
import { loginSchema, registerSchema, switchTenantSchema } from './auth.schemas.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/api/v1/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const result = await authService.register(body, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    reply
      .header('Set-Cookie', result.cookie)
      .send({
        success: true,
        data: {
          user: result.user,
          memberships: result.memberships,
          tenant: result.tenant,
        },
      });
  });

  fastify.post('/api/v1/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const result = await authService.login(body, {
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    reply
      .header('Set-Cookie', result.cookie)
      .send({
        success: true,
        data: {
          user: result.user,
          memberships: result.memberships,
          tenant: result.tenant,
        },
      });
  });

  fastify.post('/api/v1/auth/logout', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    if (request.sessionId) {
      await authService.logout(request.sessionId);
    }

    reply
      .header('Set-Cookie', clearSessionCookie())
      .send({ success: true });
  });

  fastify.post('/api/v1/auth/switch-tenant', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    const body = switchTenantSchema.parse(request.body);
    const result = await authService.switchTenant({
      sessionId: request.sessionId!,
      userId: request.user!.id,
      tenantId: body.tenantId,
    });

    reply
      .header('Set-Cookie', result.cookie)
      .send({
        success: true,
        data: {
          tenant: result.tenant,
        },
      });
  });

  fastify.get('/api/v1/auth/me', {
    preHandler: [requireAuth],
  }, async (request, reply) => {
    reply.send({
      data: {
        user: request.user,
        tenant: request.tenant,
        memberships: request.tenantMemberships,
      },
    });
  });
}
