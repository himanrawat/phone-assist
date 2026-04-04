export interface Tenant {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  isActive: boolean;
  timezone: string;
  telephonyProvider: string | null;
  sttProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TenantListResponse {
  data: Tenant[];
}

export interface TenantDetailResponse {
  data: Tenant;
}

export interface TenantCreateResponse {
  success: true;
  data: Tenant;
}
