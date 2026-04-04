import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import {
  brandProfileInputSchema,
  createAssistantDefaultsForBrand,
  type BrandProfileInput,
} from './brand-profile.js';

const timeValueSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM time');

const tenantSeedSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  industry: z.string().trim().optional(),
  timezone: z.string().trim().min(1),
});

const tenantAdminSeedSchema = z.object({
  email: z.string().trim().email(),
  passwordHash: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const phoneNumberSeedSchema = z.object({
  number: z.string().trim().min(1),
  provider: z.literal('twilio').default('twilio'),
  providerSid: z.string().trim().min(1).optional(),
  forwardingNumber: z.string().trim().min(1).optional(),
  isActive: z.boolean().default(true),
});

const workingHourSeedSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: timeValueSchema,
  endTime: timeValueSchema,
  isActive: z.boolean().default(true),
});

const aiAssistantSeedSchema = z.object({
  personaName: z.string().trim().min(1).optional(),
  personaTone: z.string().trim().min(1).optional(),
  greetingMessage: z.string().trim().min(1).optional(),
  afterHoursMessage: z.string().trim().min(1).optional(),
  systemPrompt: z.string().trim().optional().nullable(),
  voiceId: z.string().trim().min(1).default('hannah'),
  maxCallDurationSec: z.number().int().positive().default(600),
  primaryLanguage: z.string().trim().min(1).default('en'),
  multilingualEnabled: z.boolean().default(false),
  recordingEnabled: z.boolean().default(true),
  consentAnnouncement: z.boolean().default(true),
});

export const tenantSeedConfigSchema = z.object({
  tenant: tenantSeedSchema,
  tenantAdmin: tenantAdminSeedSchema,
  phoneNumbers: z.array(phoneNumberSeedSchema).min(1),
  workingHours: z.array(workingHourSeedSchema).default([
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isActive: true },
  ]),
  brandProfile: brandProfileInputSchema,
  aiAssistant: aiAssistantSeedSchema.default({
    voiceId: 'hannah',
    maxCallDurationSec: 600,
    primaryLanguage: 'en',
    multilingualEnabled: false,
    recordingEnabled: true,
    consentAnnouncement: true,
  }),
});

export type TenantSeedConfig = z.infer<typeof tenantSeedConfigSchema>;

export const brandProfileTemplate: BrandProfileInput = {
  businessName: 'Your Business Name',
  tagline: 'Short promise or differentiator',
  industry: 'Your industry',
  description: 'Describe what your business does, who it serves, and what makes it different.',
  website: 'https://www.example.com',
  email: 'hello@example.com',
  phone: '+15555550100',
  addresses: [
    {
      label: 'Main Location',
      address: '123 Main Street, City, State, ZIP',
      phone: '+15555550100',
    },
  ],
  services: [
    {
      name: 'Primary Service',
      description: 'Describe the main service or product callers usually ask about.',
      price: 'Starting at $100',
      duration: '30 minutes',
    },
  ],
  policies: [
    {
      title: 'Cancellation Policy',
      content: 'Add a caller-safe summary of your cancellation or refund policy.',
    },
  ],
  faqs: [
    {
      question: 'What do you help customers with?',
      answer: 'Add an approved FAQ answer the assistant can say aloud on calls.',
    },
  ],
  staff: [
    {
      name: 'Team Member Name',
      role: 'Role or department',
      department: 'Department',
      specialty: 'Optional specialty',
    },
  ],
  brandVoice: {
    toneKeywords: ['professional', 'warm', 'clear'],
    wordsToUse: ['happy to help', 'let me check that for you'],
    wordsToAvoid: ['unfortunately'],
    samplePhrases: [
      'Thanks for calling. I can help with that.',
      'Let me walk you through the next step.',
    ],
  },
  escalationRules: [
    {
      trigger: 'Caller asks for a manager or sensitive account-specific information',
      action: 'Take a message or transfer to an approved human contact.',
    },
  ],
};

export const tenantSeedTemplate: TenantSeedConfig = {
  tenant: {
    name: 'Your Business Name',
    slug: 'your-business-name',
    industry: 'Your industry',
    timezone: 'America/New_York',
  },
  tenantAdmin: {
    email: 'owner@example.com',
    passwordHash: '$2b$10$placeholder',
    name: 'Business Owner',
  },
  phoneNumbers: [
    {
      number: '+15555550100',
      provider: 'twilio',
      isActive: true,
    },
  ],
  workingHours: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true },
  ],
  brandProfile: brandProfileTemplate,
  aiAssistant: {
    voiceId: 'hannah',
    primaryLanguage: 'en',
    multilingualEnabled: false,
    recordingEnabled: true,
    consentAnnouncement: true,
    maxCallDurationSec: 600,
  },
};

export const defaultMelpSeedConfig: TenantSeedConfig = {
  tenant: {
    name: 'MelpApp',
    slug: 'melp-app',
    industry: 'Enterprise SaaS / Collaboration Software / AI Workspace',
    timezone: 'Asia/Kolkata',
  },
  tenantAdmin: {
    email: 'support@melp.us',
    passwordHash: '$2b$10$placeholder',
    name: 'Venk Gorty',
  },
  phoneNumbers: [
    {
      number: '+1234567890',
      provider: 'twilio',
      isActive: true,
    },
  ],
  workingHours: [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isActive: true },
    { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isActive: true },
  ],
  brandProfile: {
    businessName: 'MelpApp',
    tagline: 'Work across organizations, without boundaries.',
    industry: 'Enterprise SaaS / Collaboration Software / AI Workspace',
    description:
      'MelpApp is a cross-organization collaboration platform that combines messaging, meetings, file management, and AI-powered workflows into a single intelligent workspace. It is designed for teams, enterprises, and organizations that need to collaborate beyond internal boundaries without relying on vendor-locked ecosystems like Microsoft or Google. Melp embeds AI directly into communication, helping users summarize meetings, translate files, generate content, and extract decisions in real time.',
    website: 'https://melp.us',
    email: 'support@melp.us',
    phone: 'N/A',
    addresses: [],
    services: [
      { name: 'Messaging', description: 'Real-time chat for individuals, teams, and cross-organization collaboration with topic-based conversations', price: 'Included in plan', duration: 'N/A' },
      { name: 'Meetings', description: 'Audio and video conferencing with integrated AI features like transcription and summaries', price: 'Included in plan', duration: 'N/A' },
      { name: 'Melp Drive', description: 'Unified file management system that integrates Google Drive and OneDrive into a single interface', price: 'Included in plan', duration: 'N/A' },
      { name: 'AI File Summary & Q&A', description: 'Automatically summarizes documents and allows users to ask questions based on file content', price: 'Plan-based', duration: 'N/A' },
      { name: 'AI File Translation', description: 'Translates documents into multiple languages and generates a new translated file', price: 'Plan-based', duration: 'N/A' },
      { name: 'Live Transcription', description: 'Converts speech into text in real time during meetings', price: 'Plan-based', duration: 'Real-time' },
      { name: 'Meeting Summary', description: 'Extracts key points, decisions, and action items from meetings', price: 'Plan-based', duration: 'Post-meeting' },
      { name: 'Draft for Me', description: 'AI-generated message drafting and rewriting based on tone and context', price: 'Plan-based', duration: 'Instant' },
      { name: 'Evaluation Mode', description: 'Monitors interview sessions with behavioral signals and generates interview questions from resumes and job descriptions', price: 'Enterprise', duration: 'Session-based' },
      { name: 'Speech-to-Speech Translation', description: 'Enables real-time multilingual voice communication', price: 'Plan-based', duration: 'Real-time' },
    ],
    policies: [
      { title: 'Data Privacy', content: 'Melp does not use customer data for training external models. All data remains private to the organization.' },
      { title: 'AI Output Accuracy', content: 'AI-generated outputs are assistive and should be reviewed before making critical decisions.' },
      { title: 'Third-Party Integrations', content: 'Users can connect Google Drive and Microsoft OneDrive, but these integrations are optional and not required to use Melp.' },
      { title: 'Account Usage', content: 'Each user account is tied to a valid identity. Organizations can manage access and permissions internally.' },
    ],
    faqs: [
      { question: 'What is Melp?', answer: 'Melp is an intelligent workspace that combines messaging, meetings, file management, and AI into a single platform designed for cross-organization collaboration.' },
      { question: 'How is Melp different from Microsoft Teams or Slack?', answer: 'Melp is built for collaboration across organizations and does not require Microsoft or Google identity. It also embeds AI directly into workflows instead of separating it into standalone tools.' },
      { question: 'Does Melp support file sharing?', answer: 'Yes, Melp Drive allows you to store, share, and access files in one place, including integrations with Google Drive and OneDrive.' },
      { question: 'Can Melp translate documents?', answer: 'Yes, Melp can translate documents into multiple languages and create a new translated version of the file.' },
      { question: 'Does Melp record or summarize meetings?', answer: 'Yes, Melp can transcribe meetings in real time and generate summaries including key points, decisions, and action items.' },
      { question: 'Is Melp suitable for enterprise use?', answer: 'Yes, Melp is designed for teams, enterprises, and organizations that need secure and scalable collaboration across boundaries.' },
    ],
    staff: [
      { name: 'Venk Gorty', role: 'Founder', department: 'Product', specialty: 'Product strategy, frontend architecture' },
      { name: 'Support Team', role: 'Customer Support', department: 'Support', specialty: 'Customer queries, onboarding' },
      { name: 'Engineering Team', role: 'Software Engineers', department: 'Engineering', specialty: 'Platform development, AI integration' },
    ],
    brandVoice: {
      toneKeywords: ['professional', 'clear', 'confident', 'practical', 'intelligent'],
      wordsToUse: ['happy to help', 'let me check that for you', 'here\'s how that works', 'you can do this directly in Melp', 'this is handled within the platform'],
      wordsToAvoid: ['unfortunately', 'I can\'t', 'not possible', 'best AI ever', 'revolutionary'],
      samplePhrases: [
        'Here\'s how that works inside Melp.',
        'You can handle this directly within the platform without switching tools.',
        'Melp is designed to make this process faster and more structured.',
        'Let me walk you through the steps.',
        'This is automatically handled using Melp\'s AI features.',
      ],
    },
    escalationRules: [
      { trigger: 'User asks for pricing details not publicly listed', action: 'Provide available information and offer to connect with sales' },
      { trigger: 'User reports technical issue or bug', action: 'Escalate to support team' },
      { trigger: 'User requests enterprise onboarding or custom setup', action: 'Transfer to sales or enterprise team' },
      { trigger: 'User asks for account-specific or sensitive data', action: 'Do not answer and escalate securely' },
      { trigger: 'AI is unsure or lacks sufficient context', action: 'Ask clarifying question or escalate' },
    ],
  },
  aiAssistant: {
    voiceId: 'hannah',
    primaryLanguage: 'en',
    multilingualEnabled: false,
    recordingEnabled: true,
    consentAnnouncement: true,
    maxCallDurationSec: 600,
  },
};

export function resolveAssistantSeedConfig(
  brandProfile: BrandProfileInput,
  overrides: TenantSeedConfig['aiAssistant']
) {
  return {
    ...createAssistantDefaultsForBrand(brandProfile),
    ...overrides,
  };
}

export async function loadTenantSeedConfig(seedConfigPath = process.env.SEED_CONFIG_PATH) {
  if (!seedConfigPath) {
    return defaultMelpSeedConfig;
  }

  const resolvedPath = path.isAbsolute(seedConfigPath)
    ? seedConfigPath
    : path.resolve(process.cwd(), seedConfigPath);
  const raw = await readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;

  return tenantSeedConfigSchema.parse(parsed);
}
