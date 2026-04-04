import { logger } from '../../shared/logging/logger.js';
import { redis } from '../../shared/config/redis.js';
import type { LLMMessage } from '../../shared/types/providers.js';
import { providerRegistry } from '../providers/registry.js';
import { postCallQueue } from '../../jobs/workers.js';
import {
  buildTurnLanguagePrompt,
  normalizeLanguageTag,
  resolveActiveCallLanguage,
} from './call-language.js';
import {
  createCallRecord,
  createContact,
  completeCallRecord,
  persistCallMessages,
} from './calls.commands.js';
import {
  findContactByPhone,
  findTenantByNumber,
  getAssistantConfig,
  getBrandProfile,
} from './calls.queries.js';

export interface CallState {
  callId: string;
  tenantId: string;
  callerNumber: string;
  dialedNumber: string;
  provider: 'twilio';
  telephonyProviderOverride?: string | null;
  sttProviderOverride?: string | null;
  status: 'ringing' | 'in_progress' | 'completed';
  conversationHistory: LLMMessage[];
  systemPrompt: string;
  primaryLanguage: string;
  multilingualEnabled: boolean;
  activeLanguage: string;
  voiceId: string;
  greetingMessage?: string;
  contactId?: string;
  contactName?: string;
  isVip: boolean;
  recordingChunks: string[];
  startedAt: number;
}

const CALL_STATE_TTL = 3600;
const END_CALL_LOCK_TTL = 3600;
const MAX_VOICE_HISTORY_MESSAGES = 8;
const VOICE_LLM_MAX_TOKENS = 96;
const VOICE_LLM_TEMPERATURE = 0.3;

type BrandAddress = { label: string; address: string; phone?: string };
type BrandService = { name: string; description: string; price?: string; duration?: string };
type BrandPolicy = { title: string; content: string };
type BrandFaq = { question: string; answer: string };
type BrandStaffMember = { name: string; role: string; department?: string; specialty?: string };
type BrandVoice = {
  toneKeywords: string[];
  wordsToUse: string[];
  wordsToAvoid: string[];
  samplePhrases: string[];
};
type EscalationRule = { trigger: string; action: string };

type CallBrandProfile = {
  businessName: string;
  tagline?: string | null;
  industry?: string | null;
  description?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  addresses?: BrandAddress[] | null;
  services?: BrandService[] | null;
  policies?: BrandPolicy[] | null;
  faqs?: BrandFaq[] | null;
  staff?: BrandStaffMember[] | null;
  brandVoice?: BrandVoice | null;
  escalationRules?: EscalationRule[] | null;
};

type SystemPromptConfig = {
  personaName: string;
  personaTone: string;
  systemPrompt?: string | null;
  primaryLanguage?: string | null;
  multilingualEnabled?: boolean;
  contactName?: string | null;
  isVip: boolean;
  brand?: CallBrandProfile | null;
};

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

function buildBasePrompt(config: SystemPromptConfig, primaryLanguage: string) {
  return [
    `You are ${config.personaName}, an AI phone assistant.`,
    `Your tone is ${config.personaTone}.`,
    'You are having a real-time phone conversation. Reply quickly, naturally, and directly.',
    'Do not use markdown, emojis, or formatting because this is voice only.',
    'Use one short sentence when possible, and never exceed two short sentences.',
    'Ask at most one follow-up question, and do not repeat information the caller already heard.',
    `The primary language for this call is ${primaryLanguage}.`,
    config.multilingualEnabled
      ? 'If the caller speaks or requests another language, reply in that same language and stay consistent until they switch again.'
      : `Always respond in ${primaryLanguage}. If needed, politely explain that you can continue in ${primaryLanguage}.`,
  ];
}

function buildLabeledSection(title: string, lines: string[]) {
  return lines.length > 0 ? [`\n${title}`, ...lines] : [];
}

function formatAddressLine(address: BrandAddress) {
  const phoneSuffix = address.phone ? ` (${address.phone})` : '';
  return `- ${address.label}: ${address.address}${phoneSuffix}`;
}

function formatServiceLine(service: BrandService) {
  const details = [
    `- ${service.name}: ${service.description}`,
    service.price ? `Price: ${service.price}` : null,
    service.duration ? `Duration: ${service.duration}` : null,
  ].filter(isDefined);

  return details.join(' | ');
}

function formatStaffLine(staffMember: BrandStaffMember) {
  return [
    `- ${staffMember.name} (${staffMember.role})`,
    staffMember.department ?? null,
    staffMember.specialty ? `specializes in ${staffMember.specialty}` : null,
  ].filter(isDefined).join(', ');
}

function buildVoiceSection(voice: BrandVoice) {
  return [
    voice.toneKeywords.length > 0 ? `\nTone: ${voice.toneKeywords.join(', ')}` : null,
    voice.wordsToUse.length > 0 ? `Preferred words/phrases: ${voice.wordsToUse.join(', ')}` : null,
    voice.wordsToAvoid.length > 0 ? `Avoid these words/phrases: ${voice.wordsToAvoid.join(', ')}` : null,
    ...(voice.samplePhrases.length > 0
      ? ['Example phrases to match your style:', ...voice.samplePhrases.map((phrase) => `  "${phrase}"`)]
      : []),
  ].filter(isDefined);
}

function buildBrandPromptSections(brand: CallBrandProfile) {
  const summaryLines = [
    `Business: ${brand.businessName}`,
    brand.tagline ? `Tagline: ${brand.tagline}` : null,
    brand.industry ? `Industry: ${brand.industry}` : null,
    brand.description ? `About: ${brand.description}` : null,
    brand.website ? `Website: ${brand.website}` : null,
    brand.email ? `Email: ${brand.email}` : null,
    brand.phone ? `Phone: ${brand.phone}` : null,
  ].filter(isDefined);

  return [
    '\n--- BUSINESS INFORMATION ---',
    ...summaryLines,
    ...buildLabeledSection('Locations:', (brand.addresses ?? []).map(formatAddressLine)),
    ...buildLabeledSection('Services/Products:', (brand.services ?? []).map(formatServiceLine)),
    ...buildLabeledSection('Policies:', (brand.policies ?? []).map((policy) => `- ${policy.title}: ${policy.content}`)),
    ...buildLabeledSection(
      'Frequently Asked Questions:',
      (brand.faqs ?? []).map((faq) => `Q: ${faq.question}\nA: ${faq.answer}`)
    ),
    ...buildLabeledSection('Team:', (brand.staff ?? []).map(formatStaffLine)),
    ...(brand.brandVoice ? buildVoiceSection(brand.brandVoice) : []),
    ...buildLabeledSection(
      'Escalation Rules:',
      (brand.escalationRules ?? []).map((rule) => `- When: ${rule.trigger} -> Action: ${rule.action}`)
    ),
  ];
}

function buildSystemPromptText(config: SystemPromptConfig) {
  const primaryLanguage = normalizeLanguageTag(config.primaryLanguage);

  return [
    ...buildBasePrompt(config, primaryLanguage),
    ...(config.brand ? buildBrandPromptSections(config.brand) : []),
    ...(config.systemPrompt ? [`\nAdditional Business Instructions:\n${config.systemPrompt}`] : []),
    ...(config.contactName ? [`\nThe caller's name is ${config.contactName}.`] : []),
    ...(config.isVip ? ['This is a VIP caller so prioritize their needs.'] : []),
    '\nIf you cannot help with something, offer to take a message or transfer to a human.',
    'Keep responses brief for low latency unless the caller clearly asks for more detail.',
  ].join('\n');
}

export const callService = {
  findTenantByNumber,
  getAssistantConfig,
  getBrandProfile,
  createCallRecord,

  async findOrCreateContact(tenantId: string, phone: string) {
    const existing = await findContactByPhone(tenantId, phone);
    if (existing) {
      return existing;
    }

    return createContact(tenantId, phone);
  },

  buildSystemPrompt(config: SystemPromptConfig) {
    return buildSystemPromptText(config);
  },

  async setCallState(callId: string, state: CallState) {
    await redis.setex(`call:${callId}`, CALL_STATE_TTL, JSON.stringify(state));
  },

  async getCallState(callId: string): Promise<CallState | null> {
    const data = await redis.get(`call:${callId}`);
    return data ? JSON.parse(data) : null;
  },

  async deleteCallState(callId: string) {
    await redis.del(`call:${callId}`);
  },

  async mapProviderSid(providerSid: string, callId: string) {
    await redis.setex(`sid:${providerSid}`, CALL_STATE_TTL, callId);
  },

  async getCallIdByProviderSid(providerSid: string) {
    return redis.get(`sid:${providerSid}`);
  },

  async processConversationTurn(callId: string, callerText: string, options?: { detectedLanguage?: string | null }) {
    const state = await this.getCallState(callId);
    if (!state) {
      throw new Error(`No call state for ${callId}`);
    }

    state.conversationHistory.push({ role: 'user', content: callerText });
    const responseLanguage = resolveActiveCallLanguage({
      primaryLanguage: state.primaryLanguage,
      multilingualEnabled: state.multilingualEnabled,
      activeLanguage: state.activeLanguage,
      detectedLanguage: options?.detectedLanguage,
    });
    state.activeLanguage = responseLanguage;

    const recentConversationHistory = state.conversationHistory.slice(-MAX_VOICE_HISTORY_MESSAGES);
    const messages: LLMMessage[] = [
      { role: 'system', content: state.systemPrompt },
      {
        role: 'system',
        content: buildTurnLanguagePrompt({
          primaryLanguage: state.primaryLanguage,
          multilingualEnabled: state.multilingualEnabled,
          activeLanguage: state.activeLanguage,
          detectedLanguage: options?.detectedLanguage,
        }),
      },
      ...recentConversationHistory,
    ];

    const llm = providerRegistry.llm();
    const response = await llm.chat({
      messages,
      maxTokens: VOICE_LLM_MAX_TOKENS,
      temperature: VOICE_LLM_TEMPERATURE,
    });

    state.conversationHistory.push({ role: 'assistant', content: response.content });
    state.activeLanguage = responseLanguage;
    await this.setCallState(callId, state);

    void persistCallMessages(callId, callerText, response.content).catch((err) => {
      logger.error({ err, callId }, 'Failed to persist call messages');
    });

    return {
      content: response.content,
      responseLanguage,
    };
  },

  async endCall(callId: string) {
    const endLock = await redis.set(`call:end:${callId}`, '1', 'EX', END_CALL_LOCK_TTL, 'NX');
    if (!endLock) {
      return;
    }

    const state = await this.getCallState(callId);
    if (!state) {
      return;
    }

    const durationSec = Math.floor((Date.now() - state.startedAt) / 1000);
    const transcript = state.conversationHistory
      .map((message) => `${message.role === 'user' ? 'Caller' : 'Assistant'}: ${message.content}`)
      .join('\n');

    await completeCallRecord(callId, { durationSec, transcript });

    await postCallQueue.add('process', { callId }, {
      jobId: callId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    setTimeout(() => {
      void this.deleteCallState(callId);
    }, 30000);

    return { callId, durationSec, transcript };
  },
};
