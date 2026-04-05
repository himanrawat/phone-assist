export interface PlanEntitlements {
  maxAdminSeats: number;
  maxTeamMembers: number;
  maxPhoneNumbers: number;
  includedMinutesPerPeriod: number;
  maxConcurrentCalls: number;
  maxSelectableLanguages: number;
  planLanguagePool: string[];
  dataRetentionDays: number;
  apiAccess: boolean;
  advancedAnalytics: boolean;
  auditLogs: boolean;
  outboundEnabled: boolean;
  multilingualSupport: boolean;
}

export interface EffectiveEntitlements extends PlanEntitlements {
  tenantLanguageSubset: string[];
  overageEnabled: boolean;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  monthlyPriceCents: number;
  currency: string;
  trialDays: number;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  entitlements: PlanEntitlements;
}

export interface TenantSubscription {
  id: string;
  tenantId: string;
  status: "trial" | "active" | "suspended" | "cancelled";
  billingProvider: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  startedAt: string;
  trialEndsAt: string | null;
  plan: Plan;
}

export interface TenantUsageSummary {
  periodStart: string;
  periodEnd: string;
  totalCalls: number;
  totalDurationSec: number;
  usedMinutes: number;
  remainingMinutes: number;
}

export interface TenantBillingContext {
  subscription: TenantSubscription;
  entitlements: EffectiveEntitlements;
  usage: TenantUsageSummary;
  allowedLanguages: string[];
}

export interface UpgradeRequest {
  id: string;
  tenantId: string;
  tenantSubscriptionId: string | null;
  requestedPlanId: string | null;
  requestedBy: string;
  message: string | null;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponse {
  data: Plan[];
}

export interface PlanSaveResponse {
  success: true;
  data: Plan;
}

export interface TenantBillingResponse {
  data: TenantBillingContext;
}

export interface TenantUsageResponse {
  data: TenantUsageSummary;
  subscription: TenantSubscription;
  entitlements: EffectiveEntitlements;
}

export interface TenantSubscriptionResponse {
  success?: true;
  data: TenantBillingContext;
}

export interface TenantLanguageAccessResponse {
  data: {
    allowedLanguages: string[];
    planLanguagePool: string[];
    maxSelectableLanguages: number;
    multilingualAvailable: boolean;
  };
}

export interface UpgradeRequestResponse {
  success: true;
  data: UpgradeRequest;
}
