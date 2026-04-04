import type { CallDirection, CallStatus, Sentiment } from "../enums";

export interface Call {
  id: string;
  tenantId: string;
  contactId: string | null;
  direction: CallDirection;
  status: CallStatus;
  callerNumber: string;
  dialedNumber: string;
  providerCallSid: string | null;
  provider: string;
  durationSec: number | null;
  recordingUrl: string | null;
  recordingKey: string | null;
  transcript: string | null;
  summary: string | null;
  sentiment: Sentiment | null;
  aiResolved: boolean | null;
  metadata: Record<string, unknown>;
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

export interface CallListResponse {
  data: Call[];
  limit: number;
  offset: number;
}

export interface CallDetailResponse {
  data: CallDetail;
}
