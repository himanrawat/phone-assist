export const platformRoleValues = ['platform_super_admin', 'platform_support'] as const;
export type PlatformRole = (typeof platformRoleValues)[number];

export const tenantRoleValues = ['tenant_admin', 'tenant_manager', 'tenant_viewer'] as const;
export type TenantRole = (typeof tenantRoleValues)[number];

export const invitationStatusValues = ['pending', 'accepted', 'expired', 'revoked'] as const;
export type InvitationStatus = (typeof invitationStatusValues)[number];

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole | null;
  activeTenantId: string | null;
  sessionId: string;
}

export interface AuthenticatedTenant {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

export interface TenantMembershipSummary extends AuthenticatedTenant {}
