import type { FastifyReply, FastifyRequest } from 'fastify';
import { forbidden, unauthorized } from '../errors/errors.js';
import type { PlatformRole, TenantRole } from '../types/common.js';

export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  if (!request.user) {
    throw unauthorized();
  }
}

export function requirePlatformRole(...roles: PlatformRole[]) {
  return async function platformRoleGuard(request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) {
      throw unauthorized();
    }

    if (!request.user.platformRole || !roles.includes(request.user.platformRole)) {
      throw forbidden();
    }
  };
}

export function requireTenantRole(...roles: TenantRole[]) {
  return async function tenantRoleGuard(request: FastifyRequest, _reply: FastifyReply) {
    if (!request.user) {
      throw unauthorized();
    }

    if (request.invalidActiveTenant) {
      throw forbidden('Your active tenant is no longer available for this session.');
    }

    if (!request.tenant || !roles.includes(request.tenant.role)) {
      throw forbidden();
    }
  };
}
