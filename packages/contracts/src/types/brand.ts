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

export interface BrandFaq {
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
  faqs: BrandFaq[];
  staff: BrandStaff[];
  brandVoice: BrandVoice;
  escalationRules: BrandEscalationRule[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfileResponse {
  data: BrandProfile | null;
  tenant: { id: string; name: string; slug: string };
}

export interface BrandSaveResponse {
  success: true;
  data: BrandProfile;
  tenant: { id: string; name: string; slug: string };
}
