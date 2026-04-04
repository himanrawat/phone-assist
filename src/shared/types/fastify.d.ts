import 'fastify';
import type {
  AuthenticatedTenant,
  AuthenticatedUser,
  TenantMembershipSummary,
} from './common.js';

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser | null;
    tenant: AuthenticatedTenant | null;
    tenantMemberships: TenantMembershipSummary[];
    sessionId: string | null;
    invalidActiveTenant: boolean;
  }
}
