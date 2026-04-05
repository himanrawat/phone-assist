import type { PlatformRole, TenantRole } from "../enums";
import type {
  EffectiveEntitlements,
  TenantSubscription,
  TenantUsageSummary,
} from "./plans";

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
    subscription: TenantSubscription | null;
    entitlements: EffectiveEntitlements | null;
    allowedLanguages: string[];
    usage: TenantUsageSummary | null;
  };
}

export interface AuthLoginResponse {
  success: true;
  data: {
    user: User;
    memberships: Membership[];
    tenant: TenantContext | null;
    subscription: TenantSubscription | null;
    entitlements: EffectiveEntitlements | null;
    allowedLanguages: string[];
    usage: TenantUsageSummary | null;
  };
}

export interface AuthRegisterResponse extends AuthLoginResponse {}
