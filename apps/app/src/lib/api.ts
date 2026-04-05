import type {
  AuthMeResponse,
  AuthLoginResponse,
  AuthRegisterResponse,
  CallListResponse,
  CallDetailResponse,
  BrandProfileResponse,
  BrandSaveResponse,
  ContactListResponse,
  ContactDetailResponse,
  ContactCreateResponse,
  TenantListResponse,
  TenantDetailResponse,
  TenantCreateResponse,
  AssistantResponse,
  AssistantSaveResponse,
  WorkingHoursResponse,
  WorkingHoursSaveResponse,
  PhoneNumberListResponse,
  PhoneNumberSaveResponse,
  TeamListResponse,
  TeamInviteResponse,
  ProviderConfigResponse,
  ProviderConfigSaveResponse,
  WorkingHour,
  PlanListResponse,
  PlanSaveResponse,
  TenantBillingResponse,
  TenantUsageResponse,
  TenantSubscriptionResponse,
  TenantLanguageAccessResponse,
  UpgradeRequestResponse,
} from "@phone-assistant/contracts";
import { API } from "@phone-assistant/contracts";

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const method = options?.method ?? "GET";
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  // CSRF header for mutating requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    headers["X-Requested-With"] = "XMLHttpRequest";
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    let message = `API error: ${res.status}`;
    let code = "unknown";
    let details: Record<string, unknown> | undefined;

    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      if (body) {
        message = body.error ?? message;
        code = body.code ?? code;
        details = body.details;
      }
    }

    throw new ApiError(message, res.status, code, details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// Auth
export const auth = {
  login: (data: { email: string; password: string }) =>
    request<AuthLoginResponse>(API.auth.login, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  register: (data: { email: string; password: string; name: string; businessName: string; timezone?: string }) =>
    request<AuthRegisterResponse>(API.auth.register, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  logout: () =>
    request<{ success: true }>(API.auth.logout, { method: "POST" }),
  me: () => request<AuthMeResponse>(API.auth.me),
  switchTenant: (tenantId: string) =>
    request<{ success: true; data: { tenant: unknown; subscription: unknown; entitlements: unknown; allowedLanguages: string[]; usage: unknown } }>(
      API.auth.switchTenant,
      { method: "POST", body: JSON.stringify({ tenantId }) }
    ),
};

// Calls
export const calls = {
  list: (limit = 50, offset = 0) =>
    request<CallListResponse>(
      `${API.calls.list}?limit=${limit}&offset=${offset}`
    ),
  detail: (id: string) =>
    request<CallDetailResponse>(API.calls.detail(id)),
  recordingUrl: (id: string) => API.calls.recording(id),
  outbound: (data: { to: string; from?: string; publicBaseUrl?: string }) =>
    request<{ success: true; data: { callId: string; providerCallSid: string; to: string; from: string } }>(API.calls.outbound, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Brand
export const brand = {
  get: () => request<BrandProfileResponse>(API.admin.brand),
  update: (data: Record<string, unknown>) =>
    request<BrandSaveResponse>(API.admin.brand, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Assistant
export const assistant = {
  get: () => request<AssistantResponse>(API.admin.assistant),
  update: (data: { primaryLanguage: string; multilingualEnabled: boolean; allowedLanguages?: string[] }) =>
    request<AssistantSaveResponse>(API.admin.assistant, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Contacts
export const contacts = {
  list: () => request<ContactListResponse>(API.admin.contacts),
  detail: (id: string) =>
    request<ContactDetailResponse>(API.admin.contactDetail(id)),
  create: (data: Record<string, unknown>) =>
    request<ContactCreateResponse>(API.admin.contacts, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<ContactCreateResponse>(API.admin.contactDetail(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Working Hours
export const workingHours = {
  get: () => request<WorkingHoursResponse>(API.admin.workingHours),
  update: (data: WorkingHour[]) =>
    request<WorkingHoursSaveResponse>(API.admin.workingHours, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

// Team
export const team = {
  list: () => request<TeamListResponse>(API.admin.team),
  invite: (data: { email: string; role: string }) =>
    request<TeamInviteResponse>(API.admin.teamInvite, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Phone Numbers
export const phoneNumbers = {
  list: () => request<PhoneNumberListResponse>(API.admin.phoneNumbers),
  upsert: (data: Record<string, unknown>) =>
    request<PhoneNumberSaveResponse>(API.admin.phoneNumbers, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const adminBilling = {
  get: () => request<TenantBillingResponse>(API.admin.billing),
  usage: () => request<TenantUsageResponse>(API.admin.usage),
  requestUpgrade: (data: { requestedPlanId?: string; message?: string }) =>
    request<UpgradeRequestResponse>(API.admin.upgradeRequest, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Platform - Tenants
export const platformTenants = {
  list: () => request<TenantListResponse>(API.platform.tenants),
  detail: (id: string) =>
    request<TenantDetailResponse>(API.platform.tenantDetail(id)),
  create: (data: Record<string, unknown>) =>
    request<TenantCreateResponse>(API.platform.tenants, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<TenantCreateResponse>(API.platform.tenantDetail(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  brand: (id: string) =>
    request<BrandProfileResponse>(API.platform.tenantBrand(id)),
  updateBrand: (id: string, data: Record<string, unknown>) =>
    request<BrandSaveResponse>(API.platform.tenantBrand(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  assistant: (id: string) =>
    request<AssistantResponse>(API.platform.tenantAssistant(id)),
  updateAssistant: (
    id: string,
    data: { primaryLanguage: string; multilingualEnabled: boolean; allowedLanguages?: string[] }
  ) =>
    request<AssistantSaveResponse>(API.platform.tenantAssistant(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  updateProviders: (id: string, data: Record<string, unknown>) =>
    request<{ success: true }>(API.platform.tenantProviders(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  subscription: (id: string) =>
    request<TenantBillingResponse>(API.platform.tenantSubscription(id)),
  updateSubscription: (
    id: string,
    data: { planId: string; status?: string; trialDays?: number }
  ) =>
    request<TenantSubscriptionResponse>(API.platform.tenantSubscription(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  languages: (id: string) =>
    request<TenantLanguageAccessResponse>(API.platform.tenantLanguages(id)),
  updateLanguages: (id: string, data: { languages: string[] }) =>
    request<TenantSubscriptionResponse>(API.platform.tenantLanguages(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  addAdmin: (
    id: string,
    data: { email: string; name: string; password?: string }
  ) =>
    request<{ success: true; data: { id: string; email: string; name: string } }>(
      API.platform.tenantAdmins(id),
      {
        method: "POST",
        body: JSON.stringify(data),
      }
    ),
};

// Platform - Providers
export const platformProviders = {
  get: () => request<ProviderConfigResponse>(API.platform.providers),
  update: (data: Record<string, unknown>) =>
    request<ProviderConfigSaveResponse>(API.platform.providers, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const platformPlans = {
  list: () => request<PlanListResponse>(API.platform.plans),
  create: (data: Record<string, unknown>) =>
    request<PlanSaveResponse>(API.platform.plans, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Record<string, unknown>) =>
    request<PlanSaveResponse>(API.platform.planDetail(id), {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export { ApiError };
