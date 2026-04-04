import { eq } from 'drizzle-orm';
import { db } from '../../shared/config/database.js';
import { logger } from '../../shared/logging/logger.js';
import type { LLMMessage } from '../../shared/types/providers.js';
import { calls } from '../../shared/db/schema.js';
import { providerRegistry } from '../providers/registry.js';
import { recordingService } from '../recordings/recording.service.js';
import { callService } from './calls.service.js';

export const postCallService = {
  async process(callId: string) {
    logger.info({ callId }, 'Post-call processing started');

    const state = await callService.getCallState(callId);

    if (state && state.recordingChunks.length > 0) {
      try {
        await recordingService.saveRecording(callId, state.tenantId, state.recordingChunks);
      } catch (err) {
        logger.error({ err, callId }, 'Failed to save recording');
      }
    }

    const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
    if (!call?.transcript) {
      logger.info({ callId }, 'No transcript for call, skipping summary');
      return;
    }

    try {
      const { summary, sentiment, aiResolved } = await this.generateSummary(call.transcript);

      await db
        .update(calls)
        .set({ summary, sentiment, aiResolved })
        .where(eq(calls.id, callId));

      logger.info({ callId }, 'Post-call processing complete');
    } catch (err) {
      logger.error({ err, callId }, 'Failed to generate summary');
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
1. "summary": A 2-3 sentence summary of the call
2. "sentiment": "positive", "neutral", or "negative"
3. "aiResolved": true if the AI handled the request, false otherwise

Respond only with valid JSON.`,
      },
      { role: 'user', content: transcript },
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
