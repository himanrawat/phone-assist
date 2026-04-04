import type { TenantRole, InvitationStatus } from "../enums";

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: TenantRole;
}

export interface TenantInvitation {
  id: string;
  tenantId: string;
  email: string;
  role: TenantRole;
  invitedBy: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface TeamListResponse {
  data: TeamMember[];
}

export interface TeamInviteResponse {
  success: true;
  data: TenantInvitation;
}
