export const PlatformRole = {
  SUPER_ADMIN: "platform_super_admin",
  SUPPORT: "platform_support",
} as const;
export type PlatformRole = (typeof PlatformRole)[keyof typeof PlatformRole];

export const TenantRole = {
  ADMIN: "tenant_admin",
  MANAGER: "tenant_manager",
  VIEWER: "tenant_viewer",
} as const;
export type TenantRole = (typeof TenantRole)[keyof typeof TenantRole];

export const CallDirection = {
  INBOUND: "inbound",
  OUTBOUND: "outbound",
} as const;
export type CallDirection = (typeof CallDirection)[keyof typeof CallDirection];

export const CallStatus = {
  RINGING: "ringing",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  FAILED: "failed",
  NO_ANSWER: "no_answer",
  BUSY: "busy",
  VOICEMAIL: "voicemail",
} as const;
export type CallStatus = (typeof CallStatus)[keyof typeof CallStatus];

export const Sentiment = {
  POSITIVE: "positive",
  NEUTRAL: "neutral",
  NEGATIVE: "negative",
} as const;
export type Sentiment = (typeof Sentiment)[keyof typeof Sentiment];

export const InvitationStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  REVOKED: "revoked",
} as const;
export type InvitationStatus =
  (typeof InvitationStatus)[keyof typeof InvitationStatus];
