import { eq, and } from 'drizzle-orm';
import { db } from '../../config/database.js';
import { redis } from '../../config/redis.js';
import { calls, callMessages, phoneNumbers, tenants, aiAssistants, contacts } from '../../db/schema.js';
import { providerRegistry } from '../../providers/registry.js';
import type { LLMMessage } from '../../types/providers.js';
import { v4 as uuidv4 } from 'uuid';
import { postCallQueue } from '../../queue/workers.js';

export interface CallState {
  callId: string;
  tenantId: string;
  callerNumber: string;
  dialedNumber: string;
  provider: 'twilio';
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
  }): string {
    const parts: string[] = [];

    parts.push(`You are ${config.personaName}, an AI phone assistant.`);
    parts.push(`Your tone is ${config.personaTone}.`);
    parts.push('You are having a real-time phone conversation. Keep responses concise and natural.');
    parts.push('Do not use markdown, emojis, or formatting — this is voice only.');

    if (config.systemPrompt) {
      parts.push(`\nBusiness Instructions:\n${config.systemPrompt}`);
    }

    if (config.contactName) {
      parts.push(`\nThe caller's name is ${config.contactName}.`);
    }
    if (config.isVip) {
      parts.push('This is a VIP caller — prioritize their needs.');
    }

    parts.push('\nIf you cannot help with something, offer to take a message or transfer to a human.');
    parts.push('Keep your responses under 2-3 sentences unless the caller asks for detailed information.');

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
    const messages: LLMMessage[] = [
      { role: 'system', content: state.systemPrompt },
      ...state.conversationHistory,
    ];

    // Get LLM response
    const llm = providerRegistry.llm();
    const response = await llm.chat({
      messages,
      maxTokens: 256,
      temperature: 0.7,
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
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });

    // Clean up Redis state (post-call worker reads it before cleanup)
    // Delay cleanup so the worker can access the state
    setTimeout(() => this.deleteCallState(callId), 30000);

    return { callId, durationSec, transcript };
  },
};
