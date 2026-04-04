export const API = {
  auth: {
    login: "/api/v1/auth/login",
    register: "/api/v1/auth/register",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/auth/me",
    switchTenant: "/api/v1/auth/switch-tenant",
  },
  calls: {
    list: "/api/v1/calls",
    detail: (id: string) => `/api/v1/calls/${id}`,
    recording: (id: string) => `/api/v1/calls/${id}/recording`,
    outbound: "/api/v1/calls/outbound",
  },
  admin: {
    brand: "/api/v1/admin/brand",
    assistant: "/api/v1/admin/assistant",
    contacts: "/api/v1/admin/contacts",
    contactDetail: (id: string) => `/api/v1/admin/contacts/${id}`,
    workingHours: "/api/v1/admin/working-hours",
    team: "/api/v1/admin/team",
    teamInvite: "/api/v1/admin/team/invite",
    phoneNumbers: "/api/v1/admin/phone-numbers",
  },
  platform: {
    tenants: "/api/v1/platform/tenants",
    tenantDetail: (id: string) => `/api/v1/platform/tenants/${id}`,
    tenantBrand: (id: string) => `/api/v1/platform/tenants/${id}/brand`,
    tenantAssistant: (id: string) => `/api/v1/platform/tenants/${id}/assistant`,
    tenantProviders: (id: string) =>
      `/api/v1/platform/tenants/${id}/providers`,
    providers: "/api/v1/platform/providers",
  },
} as const;
