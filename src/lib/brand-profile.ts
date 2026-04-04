import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().trim().min(1),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.string().trim().min(1).optional(),
  duration: z.string().trim().min(1).optional(),
});

export const policySchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

export const faqSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const staffSchema = z.object({
  name: z.string().trim().min(1),
  role: z.string().trim().min(1),
  department: z.string().trim().min(1).optional(),
  specialty: z.string().trim().min(1).optional(),
});

export const brandVoiceSchema = z.object({
  toneKeywords: z.array(z.string().trim().min(1)).default([]),
  wordsToUse: z.array(z.string().trim().min(1)).default([]),
  wordsToAvoid: z.array(z.string().trim().min(1)).default([]),
  samplePhrases: z.array(z.string().trim().min(1)).default([]),
});

export const escalationRuleSchema = z.object({
  trigger: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

export const brandProfileInputSchema = z.object({
  businessName: z.string().trim().min(1),
  tagline: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  description: z.string().trim().optional(),
  website: z.string().trim().optional(),
  email: z.string().trim().email().optional(),
  phone: z.string().trim().optional(),
  addresses: z.array(addressSchema).default([]),
  services: z.array(serviceSchema).default([]),
  policies: z.array(policySchema).default([]),
  faqs: z.array(faqSchema).default([]),
  staff: z.array(staffSchema).default([]),
  brandVoice: brandVoiceSchema.default({
    toneKeywords: [],
    wordsToUse: [],
    wordsToAvoid: [],
    samplePhrases: [],
  }),
  escalationRules: z.array(escalationRuleSchema).default([]),
});

export type BrandProfileInput = z.infer<typeof brandProfileInputSchema>;

export const emptyBrandProfileInput: BrandProfileInput = {
  businessName: '',
  tagline: '',
  industry: '',
  description: '',
  website: '',
  email: '',
  phone: '',
  addresses: [],
  services: [],
  policies: [],
  faqs: [],
  staff: [],
  brandVoice: {
    toneKeywords: [],
    wordsToUse: [],
    wordsToAvoid: [],
    samplePhrases: [],
  },
  escalationRules: [],
};

export function createAssistantDefaultsForBrand(brand: {
  businessName: string;
  email?: string | null;
  brandVoice?: {
    toneKeywords?: string[] | null;
  } | null;
}) {
  const businessName = brand.businessName.trim();
  const trimmedToneKeywords = (brand.brandVoice?.toneKeywords || [])
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const personaTone = trimmedToneKeywords.length > 0
    ? trimmedToneKeywords.slice(0, 4).join(', ').slice(0, 50)
    : 'professional';

  return {
    personaName: `${businessName} Assistant`.slice(0, 100),
    personaTone,
    greetingMessage: `Hello! Thank you for calling ${businessName}. How can I help you today?`,
    afterHoursMessage: brand.email
      ? `Thank you for calling ${businessName}. Our team is currently unavailable. Please leave a message or email ${brand.email} and we will follow up with you shortly.`
      : `Thank you for calling ${businessName}. Our team is currently unavailable. Please leave a message and we will follow up with you shortly.`,
  };
}
