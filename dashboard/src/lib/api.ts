const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
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

export async function getProviders() {
  return fetchApi<{ data: Record<string, string> }>('/api/v1/admin/providers');
}

export async function updateProviders(data: {
  telephonyProvider?: string;
  sttProvider?: string;
}) {
  return fetchApi<{ success: boolean }>('/api/v1/admin/providers', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
