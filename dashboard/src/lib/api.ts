export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    let errorMessage = `API error: ${response.status} ${response.statusText}`;

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null) as { error?: string; message?: string } | null;
      errorMessage = payload?.error || payload?.message || errorMessage;
    } else {
      const payload = await response.text().catch(() => '');
      if (payload) {
        errorMessage = payload;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// ─── Call Types ───

export interface Call {
  id: string;
  tenantId: string;
  contactId: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  callerNumber: string;
  dialedNumber: string;
  providerCallSid: string | null;
  provider: string;
  durationSec: number | null;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  aiResolved: boolean | null;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface CallMessage {
  id: string;
  callId: string;
  role: string;
  content: string;
  timestamp: string;
}

export interface CallDetail extends Call {
  messages: CallMessage[];
}

// ─── API Functions ───

export async function getCalls(limit = 50, offset = 0) {
  return fetchApi<{ data: Call[]; limit: number; offset: number }>(
    `/api/v1/calls?limit=${limit}&offset=${offset}`
  );
}

export async function getCall(id: string) {
  return fetchApi<{ data: CallDetail }>(`/api/v1/calls/${id}`);
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${API_BASE}${path}`;
}

// ─── Brand Types ───

export interface BrandAddress {
  label: string;
  address: string;
  phone?: string;
}

export interface BrandService {
  name: string;
  description: string;
  price?: string;
  duration?: string;
}

export interface BrandPolicy {
  title: string;
  content: string;
}

export interface BrandFAQ {
  question: string;
  answer: string;
}

export interface BrandStaff {
  name: string;
  role: string;
  department?: string;
  specialty?: string;
}

export interface BrandVoice {
  toneKeywords: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  samplePhrases: string[];
}

export interface BrandEscalationRule {
  trigger: string;
  action: string;
}

export interface BrandProfile {
  id: string;
  tenantId: string;
  businessName: string;
  tagline: string | null;
  industry: string | null;
  description: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  addresses: BrandAddress[];
  services: BrandService[];
  policies: BrandPolicy[];
  faqs: BrandFAQ[];
  staff: BrandStaff[];
  brandVoice: BrandVoice;
  escalationRules: BrandEscalationRule[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandTenantInfo {
  id: string;
  name: string;
  slug: string;
}

export interface BrandProfileResponse {
  data: BrandProfile | null;
  tenant: BrandTenantInfo;
}

export interface BrandSaveResponse {
  success: boolean;
  data: BrandProfile;
  tenant: BrandTenantInfo;
}

export interface AssistantSettings {
  id: string;
  tenantId: string;
  primaryLanguage: string;
  multilingualEnabled: boolean;
  updatedAt: string;
}

export interface AssistantSettingsResponse {
  data: AssistantSettings | null;
  tenant: BrandTenantInfo;
}

export interface AssistantSettingsSaveResponse {
  success: boolean;
  data: AssistantSettings;
  tenant: BrandTenantInfo;
}

export interface BrandProfilePayload {
  businessName: string;
  tagline?: string;
  industry?: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  addresses: BrandAddress[];
  services: BrandService[];
  policies: BrandPolicy[];
  faqs: BrandFAQ[];
  staff: BrandStaff[];
  brandVoice: BrandVoice;
  escalationRules: BrandEscalationRule[];
}

function buildBrandProfilePath(tenantId?: string) {
  const normalizedTenantId = tenantId?.trim();
  return normalizedTenantId
    ? `/api/v1/admin/tenants/${normalizedTenantId}/brand`
    : '/api/v1/admin/brand';
}

export async function getBrandProfile(tenantId?: string) {
  return fetchApi<BrandProfileResponse>(buildBrandProfilePath(tenantId));
}

export async function updateBrandProfile(tenantId: string | undefined, data: BrandProfilePayload) {
  return fetchApi<BrandSaveResponse>(buildBrandProfilePath(tenantId), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

function buildAssistantSettingsPath(tenantId?: string) {
  const normalizedTenantId = tenantId?.trim();
  return normalizedTenantId
    ? `/api/v1/admin/tenants/${normalizedTenantId}/assistant`
    : '/api/v1/admin/assistant';
}

export async function getAssistantSettings(tenantId?: string) {
  return fetchApi<AssistantSettingsResponse>(buildAssistantSettingsPath(tenantId));
}

export async function updateAssistantSettings(
  tenantId: string | undefined,
  data: {
    primaryLanguage: string;
    multilingualEnabled: boolean;
  }
) {
  return fetchApi<AssistantSettingsSaveResponse>(buildAssistantSettingsPath(tenantId), {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ─── Provider Functions ───

export async function getProviders() {
  return fetchApi<{ data: Record<string, string> }>('/api/v1/admin/providers');
}

export async function updateProviders(data: {
  telephonyProvider?: string;
  sttProvider?: string;
  ttsProvider?: string;
}) {
  return fetchApi<{ success: boolean }>('/api/v1/admin/providers', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
