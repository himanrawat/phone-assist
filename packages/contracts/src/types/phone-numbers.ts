export interface PhoneNumber {
  id: string;
  tenantId: string | null;
  number: string;
  provider: string;
  providerSid: string | null;
  forwardingNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PhoneNumberListResponse {
  data: PhoneNumber[];
}

export interface PhoneNumberSaveResponse {
  success: true;
  data: PhoneNumber[];
}
