import type { PlatformRole, TenantRole } from "../enums";

export interface User {
  id: string;
  email: string;
  name: string;
  platformRole: PlatformRole | null;
  activeTenantId: string | null;
  sessionId: string;
}

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

export interface Membership {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
}

export interface AuthMeResponse {
  data: {
    user: User;
    tenant: TenantContext | null;
    memberships: Membership[];
  };
}

export interface AuthLoginResponse {
  success: true;
  data: {
    user: User;
    memberships: Membership[];
    tenant: TenantContext | null;
  };
}

export interface AuthRegisterResponse extends AuthLoginResponse {}
