import { z } from "zod";

export const brandAddressSchema = z.object({
  label: z.string().trim().min(1),
  address: z.string().trim().min(1),
  phone: z.string().trim().min(1).optional(),
});

export const brandServiceSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().min(1),
  price: z.string().trim().min(1).optional(),
  duration: z.string().trim().min(1).optional(),
});

export const brandPolicySchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

export const brandFaqSchema = z.object({
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
});

export const brandStaffSchema = z.object({
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

export const brandEscalationRuleSchema = z.object({
  trigger: z.string().trim().min(1),
  action: z.string().trim().min(1),
});

export const brandProfileInputSchema = z.object({
  businessName: z.string().trim().min(1),
  tagline: z.string().trim().default(""),
  industry: z.string().trim().default(""),
  description: z.string().trim().default(""),
  website: z.string().trim().default(""),
  email: z.union([z.string().trim().email(), z.literal("")]).default(""),
  phone: z.string().trim().default(""),
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

export type BrandProfileInput = z.infer<typeof brandProfileInputSchema>;

export const emptyBrandProfileInput: BrandProfileInput = {
  businessName: "",
  tagline: "",
  industry: "",
  description: "",
  website: "",
  email: "",
  phone: "",
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

export const blankBrandProfileTemplate: BrandProfileInput = {
  businessName: "Your Business Name",
  tagline: "Short promise or differentiator",
  industry: "Your industry",
  description: "Describe what your business does, who it serves, and what makes it different.",
  website: "https://www.example.com",
  email: "hello@example.com",
  phone: "+15555550100",
  addresses: [
    {
      label: "Main Location",
      address: "123 Main Street, City, State, ZIP",
      phone: "+15555550100",
    },
  ],
  services: [
    {
      name: "Primary Service",
      description: "Describe the main service or product callers usually ask about.",
      price: "Starting at $100",
      duration: "30 minutes",
    },
  ],
  policies: [
    {
      title: "Cancellation Policy",
      content: "Add a caller-safe summary of your cancellation or refund policy.",
    },
  ],
  faqs: [
    {
      question: "What do you help customers with?",
      answer: "Add an approved FAQ answer the assistant can say aloud on calls.",
    },
  ],
  staff: [
    {
      name: "Team Member Name",
      role: "Role or department",
      department: "Department",
      specialty: "Optional specialty",
    },
  ],
  brandVoice: {
    toneKeywords: ["professional", "warm", "clear"],
    wordsToUse: ["happy to help", "let me check that for you"],
    wordsToAvoid: ["unfortunately"],
    samplePhrases: [
      "Thanks for calling. I can help with that.",
      "Let me walk you through the next step.",
    ],
  },
  escalationRules: [
    {
      trigger: "Caller asks for a manager or sensitive account-specific information",
      action: "Take a message or transfer to an approved human contact.",
    },
  ],
};

export function formatBrandProfileJsonError(error: unknown) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    if (!issue) {
      return "Invalid brand JSON.";
    }

    const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return `${path}${issue.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Invalid brand JSON.";
}
