import { z } from "zod/v4";

export const brandAddressSchema = z.object({
  label: z.string(),
  address: z.string(),
  phone: z.string().optional(),
});

export const brandServiceSchema = z.object({
  name: z.string(),
  description: z.string(),
  price: z.string().optional(),
  duration: z.string().optional(),
});

export const brandPolicySchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const brandFaqSchema = z.object({
  question: z.string(),
  answer: z.string(),
});

export const brandStaffSchema = z.object({
  name: z.string(),
  role: z.string(),
  department: z.string().optional(),
  specialty: z.string().optional(),
});

export const brandVoiceSchema = z.object({
  toneKeywords: z.array(z.string()),
  wordsToUse: z.array(z.string()),
  wordsToAvoid: z.array(z.string()),
  samplePhrases: z.array(z.string()),
});

export const brandEscalationRuleSchema = z.object({
  trigger: z.string(),
  action: z.string(),
});

export const brandProfileInputSchema = z.object({
  businessName: z.string().min(1),
  tagline: z.string().optional(),
  industry: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  addresses: z.array(brandAddressSchema).default([]),
  services: z.array(brandServiceSchema).default([]),
  policies: z.array(brandPolicySchema).default([]),
  faqs: z.array(brandFaqSchema).default([]),
  staff: z.array(brandStaffSchema).default([]),
  brandVoice: brandVoiceSchema.default({
    toneKeywords: [],
    wordsToUse: [],
    wordsToAvoid: [],
    samplePhrases: [],
  }),
  escalationRules: z.array(brandEscalationRuleSchema).default([]),
});
