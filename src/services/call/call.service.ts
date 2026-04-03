import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { calls, callMessages, phoneNumbers, tenants, aiAssistants, contacts, brandProfiles } from '../../db/schema.js';
import { providerRegistry } from '../../providers/registry.js';
import type { LLMMessage } from '../../types/providers.js';
import { postCallQueue } from '../../queue/workers.js';

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
  contactId?: string;
  contactName?: string;
  isVip: boolean;
  recordingChunks: string[]; // base64 audio chunks for recording
  startedAt: number;
}

const CALL_STATE_TTL = 3600; // 1 hour
const END_CALL_LOCK_TTL = 3600; // 1 hour
const MAX_VOICE_HISTORY_MESSAGES = 8;
const VOICE_LLM_MAX_TOKENS = 96;
const VOICE_LLM_TEMPERATURE = 0.3;

export const callService = {
  /**
   * Look up which tenant owns a phone number.
   */
  async findTenantByNumber(dialedNumber: string) {
    const result = await db
      .select({
        phoneNumber: phoneNumbers,
        tenant: tenants,
      })
      .from(phoneNumbers)
      .innerJoin(tenants, eq(phoneNumbers.tenantId, tenants.id))
      .where(
        and(
          eq(phoneNumbers.number, dialedNumber),
          eq(phoneNumbers.isActive, true),
          eq(tenants.isActive, true)
        )
      )
      .limit(1);

    return result[0] || null;
  },

  /**
   * Get AI assistant config for a tenant.
   */
  async getAssistantConfig(tenantId: string) {
    const result = await db
      .select()
      .from(aiAssistants)
      .where(eq(aiAssistants.tenantId, tenantId))
      .limit(1);

    return result[0] || null;
  },

  /**
   * Get brand profile for a tenant.
   */
  async getBrandProfile(tenantId: string) {
    const result = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.tenantId, tenantId))
      .limit(1);

    return result[0] || null;
  },

  /**
   * Find or create a contact by phone number for a tenant.
   */
  async findOrCreateContact(tenantId: string, phone: string) {
    const existing = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.phone, phone)))
      .limit(1);

    if (existing[0]) return existing[0];

    const [newContact] = await db
      .insert(contacts)
      .values({ tenantId, phone })
      .returning();

    return newContact;
  },

  /**
   * Create a new call record in the database.
   */
  async createCallRecord(data: {
    tenantId: string;
    contactId?: string;
    direction: 'inbound' | 'outbound';
    callerNumber: string;
    dialedNumber: string;
    providerCallSid: string;
    provider: 'twilio';
  }) {
    const [call] = await db
      .insert(calls)
      .values({
        tenantId: data.tenantId,
        contactId: data.contactId,
        direction: data.direction,
        callerNumber: data.callerNumber,
        dialedNumber: data.dialedNumber,
        providerCallSid: data.providerCallSid,
        provider: data.provider,
        status: 'ringing',
      })
      .returning();

    return call;
  },

  /**
   * Build the system prompt for the AI assistant.
   */
  buildSystemPrompt(config: {
    personaName: string;
    personaTone: string;
    systemPrompt?: string | null;
    contactName?: string | null;
    isVip: boolean;
    brand?: {
      businessName: string;
      tagline?: string | null;
      industry?: string | null;
      description?: string | null;
      website?: string | null;
      email?: string | null;
      phone?: string | null;
      addresses?: { label: string; address: string; phone?: string }[] | null;
      services?: { name: string; description: string; price?: string; duration?: string }[] | null;
      policies?: { title: string; content: string }[] | null;
      faqs?: { question: string; answer: string }[] | null;
      staff?: { name: string; role: string; department?: string; specialty?: string }[] | null;
      brandVoice?: { toneKeywords: string[]; wordsToUse: string[]; wordsToAvoid: string[]; samplePhrases: string[] } | null;
      escalationRules?: { trigger: string; action: string }[] | null;
    } | null;
  }): string {
    const parts: string[] = [];

    parts.push(`You are ${config.personaName}, an AI phone assistant.`);
    parts.push(`Your tone is ${config.personaTone}.`);
    parts.push('You are having a real-time phone conversation. Reply quickly, naturally, and directly.');
    parts.push('Do not use markdown, emojis, or formatting — this is voice only.');
    parts.push('Use one short sentence when possible, and never exceed two short sentences.');
    parts.push('Ask at most one follow-up question, and do not repeat information the caller already heard.');

    // Brand context
    if (config.brand) {
      const b = config.brand;
      parts.push(`\n--- BUSINESS INFORMATION ---`);
      parts.push(`Business: ${b.businessName}`);
      if (b.tagline) parts.push(`Tagline: ${b.tagline}`);
      if (b.industry) parts.push(`Industry: ${b.industry}`);
      if (b.description) parts.push(`About: ${b.description}`);
      if (b.website) parts.push(`Website: ${b.website}`);
      if (b.email) parts.push(`Email: ${b.email}`);
      if (b.phone) parts.push(`Phone: ${b.phone}`);

      if (b.addresses && b.addresses.length > 0) {
        parts.push(`\nLocations:`);
        for (const addr of b.addresses) {
          parts.push(`- ${addr.label}: ${addr.address}${addr.phone ? ` (${addr.phone})` : ''}`);
        }
      }

      if (b.services && b.services.length > 0) {
        parts.push(`\nServices/Products:`);
        for (const svc of b.services) {
          let line = `- ${svc.name}: ${svc.description}`;
          if (svc.price) line += ` | Price: ${svc.price}`;
          if (svc.duration) line += ` | Duration: ${svc.duration}`;
          parts.push(line);
        }
      }

      if (b.policies && b.policies.length > 0) {
        parts.push(`\nPolicies:`);
        for (const pol of b.policies) {
          parts.push(`- ${pol.title}: ${pol.content}`);
        }
      }

      if (b.faqs && b.faqs.length > 0) {
        parts.push(`\nFrequently Asked Questions:`);
        for (const faq of b.faqs) {
          parts.push(`Q: ${faq.question}\nA: ${faq.answer}`);
        }
      }

      if (b.staff && b.staff.length > 0) {
        parts.push(`\nTeam:`);
        for (const person of b.staff) {
          let line = `- ${person.name} (${person.role})`;
          if (person.department) line += `, ${person.department}`;
          if (person.specialty) line += `, specializes in ${person.specialty}`;
          parts.push(line);
        }
      }

      if (b.brandVoice) {
        const v = b.brandVoice;
        if (v.toneKeywords.length > 0) parts.push(`\nTone: ${v.toneKeywords.join(', ')}`);
        if (v.wordsToUse.length > 0) parts.push(`Preferred words/phrases: ${v.wordsToUse.join(', ')}`);
        if (v.wordsToAvoid.length > 0) parts.push(`Avoid these words/phrases: ${v.wordsToAvoid.join(', ')}`);
        if (v.samplePhrases.length > 0) {
          parts.push(`Example phrases to match your style:`);
          for (const phrase of v.samplePhrases) parts.push(`  "${phrase}"`);
        }
      }

      if (b.escalationRules && b.escalationRules.length > 0) {
        parts.push(`\nEscalation Rules:`);
        for (const rule of b.escalationRules) {
          parts.push(`- When: ${rule.trigger} → Action: ${rule.action}`);
        }
      }
    }

    if (config.systemPrompt) {
      parts.push(`\nAdditional Business Instructions:\n${config.systemPrompt}`);
    }

    if (config.contactName) {
      parts.push(`\nThe caller's name is ${config.contactName}.`);
    }
    if (config.isVip) {
      parts.push('This is a VIP caller — prioritize their needs.');
    }

    parts.push('\nIf you cannot help with something, offer to take a message or transfer to a human.');
    parts.push('Keep responses brief for low latency unless the caller clearly asks for more detail.');

    return parts.join('\n');
  },

  /**
   * Store call state in Redis for real-time access during a call.
   */
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

  /**
   * Map a provider call SID to our internal call ID (for webhook lookups).
   */
  async mapProviderSid(providerSid: string, callId: string) {
    await redis.setex(`sid:${providerSid}`, CALL_STATE_TTL, callId);
  },

  async getCallIdByProviderSid(providerSid: string): Promise<string | null> {
    return redis.get(`sid:${providerSid}`);
  },

  /**
   * Process a conversation turn: send caller's text to LLM, get response.
   */
  async processConversationTurn(callId: string, callerText: string): Promise<string> {
    const state = await this.getCallState(callId);
    if (!state) throw new Error(`No call state for ${callId}`);

    // Add caller's message
    state.conversationHistory.push({ role: 'user', content: callerText });

    // Build messages for LLM
    const recentConversationHistory = state.conversationHistory.slice(-MAX_VOICE_HISTORY_MESSAGES);
    const messages: LLMMessage[] = [
      { role: 'system', content: state.systemPrompt },
      ...recentConversationHistory,
    ];

    // Get LLM response
    const llm = providerRegistry.llm();
    const response = await llm.chat({
      messages,
      maxTokens: VOICE_LLM_MAX_TOKENS,
      temperature: VOICE_LLM_TEMPERATURE,
    });

    // Add assistant response to history
    state.conversationHistory.push({ role: 'assistant', content: response.content });

    // Save updated state
    await this.setCallState(callId, state);

    // Persist messages to DB (fire and forget)
    db.insert(callMessages)
      .values([
        { callId, role: 'caller', content: callerText },
        { callId, role: 'assistant', content: response.content },
      ])
      .catch((err) => console.error('Failed to persist call messages:', err));

    return response.content;
  },

  /**
   * End a call — update DB record, clean up Redis state.
   */
  async endCall(callId: string) {
    const endLock = await redis.set(`call:end:${callId}`, '1', 'EX', END_CALL_LOCK_TTL, 'NX');
    if (!endLock) return;

    const state = await this.getCallState(callId);
    if (!state) return;

    const durationSec = Math.floor((Date.now() - state.startedAt) / 1000);

    // Build transcript from conversation history
    const transcript = state.conversationHistory
      .map((msg) => `${msg.role === 'user' ? 'Caller' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Update call record
    await db
      .update(calls)
      .set({
        status: 'completed',
        durationSec,
        transcript,
        endedAt: new Date(),
      })
      .where(eq(calls.id, callId));

    // Queue post-call processing (recording save, summary, sentiment)
    await postCallQueue.add('process', { callId }, {
      jobId: callId,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    // Clean up Redis state (post-call worker reads it before cleanup)
    // Delay cleanup so the worker can access the state
    setTimeout(() => this.deleteCallState(callId), 30000);

    return { callId, durationSec, transcript };
  },
};
