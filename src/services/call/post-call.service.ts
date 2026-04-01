import { db } from '../../config/database.js';
import { calls } from '../../db/schema.js';
import { eq } from 'drizzle-orm';
import { providerRegistry } from '../../providers/registry.js';
import { recordingService } from '../recording/recording.service.js';
import { callService } from './call.service.js';
import type { LLMMessage } from '../../types/providers.js';

/**
 * Post-call processing — runs after a call ends.
 * 1. Save recording to R2/local
 * 2. Generate AI summary
 * 3. Detect sentiment
 */
export const postCallService = {
  async process(callId: string) {
    console.log(`Post-call processing started for call ${callId}`);

    const state = await callService.getCallState(callId);

    // Save recording if we have audio chunks
    if (state && state.recordingChunks.length > 0) {
      try {
        await recordingService.saveRecording(
          callId,
          state.tenantId,
          state.recordingChunks
        );
      } catch (err) {
        console.error(`Failed to save recording for call ${callId}:`, err);
      }
    }

    // Get the transcript from the call record
    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, callId))
      .limit(1);

    if (!call?.transcript) {
      console.log(`No transcript for call ${callId}, skipping summary`);
      return;
    }

    // Generate summary + sentiment via LLM
    try {
      const { summary, sentiment, aiResolved } = await this.generateSummary(call.transcript);

      await db
        .update(calls)
        .set({ summary, sentiment, aiResolved })
        .where(eq(calls.id, callId));

      console.log(`Post-call processing complete for call ${callId}`);
    } catch (err) {
      console.error(`Failed to generate summary for call ${callId}:`, err);
    }
  },

  async generateSummary(transcript: string): Promise<{
    summary: string;
    sentiment: 'positive' | 'neutral' | 'negative';
    aiResolved: boolean;
  }> {
    const llm = providerRegistry.llm();

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are a call analysis assistant. Analyze the following phone call transcript and respond with a JSON object containing:
1. "summary": A 2-3 sentence summary of the call (who called, what they wanted, what happened)
2. "sentiment": The caller's overall sentiment — one of "positive", "neutral", or "negative"
3. "aiResolved": true if the AI successfully handled the caller's request, false if it needed human escalation or failed

Respond ONLY with valid JSON, no other text.`,
      },
      {
        role: 'user',
        content: transcript,
      },
    ];

    const response = await llm.chat({
      messages,
      maxTokens: 256,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response.content) as {
        summary: string;
        sentiment: 'positive' | 'neutral' | 'negative';
        aiResolved: boolean;
      };

      return {
        summary: parsed.summary || 'No summary available.',
        sentiment: ['positive', 'neutral', 'negative'].includes(parsed.sentiment)
          ? parsed.sentiment
          : 'neutral',
        aiResolved: Boolean(parsed.aiResolved),
      };
    } catch {
      return {
        summary: response.content.slice(0, 500),
        sentiment: 'neutral',
        aiResolved: false,
      };
    }
  },
};
