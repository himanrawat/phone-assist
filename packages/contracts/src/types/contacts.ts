export interface Contact {
  id: string;
  tenantId: string;
  name: string | null;
  phone: string;
  email: string | null;
  company: string | null;
  tags: string[];
  isVip: boolean;
  isBlocked: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContactListResponse {
  data: Contact[];
}

export interface ContactDetailResponse {
  data: Contact;
}

export interface ContactCreateResponse {
  success: true;
  data: Contact;
}
