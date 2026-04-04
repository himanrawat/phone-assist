import type { FastifyInstance } from 'fastify';
import { db } from '../../config/database.js';
import { calls, callMessages } from '../../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { recordingService } from '../../services/recording/recording.service.js';
import { callService } from '../../services/call/call.service.js';
import { providerRegistry } from '../../providers/registry.js';
import { env } from '../../config/env.js';
import { createAssistantDefaultsForBrand } from '../../lib/brand-profile.js';
import { normalizeLanguageTag } from '../../services/call/call-language.js';

const createOutboundCallSchema = z.object({
  to: z.string().min(1),
  from: z.string().optional(),
  publicBaseUrl: z.string().url().optional(),
});

export async function callRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/calls
   * List calls (for now, all calls — tenant filtering added in Phase 2)
   */
  fastify.get('/api/v1/calls', async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = Math.min(parseInt(query.limit || '50'), 100);
    const offset = parseInt(query.offset || '0');

    const result = await db
      .select()
      .from(calls)
      .orderBy(desc(calls.startedAt))
      .limit(limit)
      .offset(offset);

    reply.send({ data: result, limit, offset });
  });

  /**
   * GET /api/v1/calls/:id
   * Get a single call with its messages
   */
  fastify.get('/api/v1/calls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [call] = await db
      .select()
      .from(calls)
      .where(eq(calls.id, id))
      .limit(1);

    if (!call) {
      reply.status(404).send({ error: 'Call not found' });
      return;
    }

    const messages = await db
      .select()
      .from(callMessages)
      .where(eq(callMessages.callId, id))
      .orderBy(callMessages.timestamp);

    reply.send({ data: { ...call, messages } });
  });

  /**
   * GET /api/v1/calls/:id/recording
   * Stream the saved call recording from local storage or R2.
   */
  fastify.get('/api/v1/calls/:id/recording', async (request, reply) => {
    const { id } = request.params as { id: string };

    const [call] = await db
      .select({ recordingKey: calls.recordingKey })
      .from(calls)
      .where(eq(calls.id, id))
      .limit(1);

    if (!call?.recordingKey) {
      reply.status(404).send({ error: 'Recording not found' });
      return;
    }

    const recordingData = await recordingService.getRecordingData(call.recordingKey);
    if (!recordingData) {
      reply.status(404).send({ error: 'Recording file missing' });
      return;
    }

    reply
      .type('audio/wav')
      .header('Cache-Control', 'private, max-age=3600')
      .send(recordingData);
  });

  /**
   * POST /api/v1/calls/outbound
   * Initiate an outbound call through Twilio and attach it to the same AI voice pipeline.
   */
  fastify.post('/api/v1/calls/outbound', async (request, reply) => {
    const body = createOutboundCallSchema.parse(request.body);
    const to = normalizePhoneNumber(body.to);
    const from = normalizePhoneNumber(body.from || env.TWILIO_PHONE_NUMBER);

    if (!from) {
      reply.status(400).send({ error: 'A Twilio source number is required.' });
      return;
    }

    const tenantResult = await callService.findTenantByNumber(from);
    if (!tenantResult) {
      reply.status(404).send({
        error: `No tenant is configured for the Twilio number ${from}.`,
      });
      return;
    }

    const publicBaseUrl = resolvePublicBaseUrl(request, body.publicBaseUrl);
    if (!publicBaseUrl) {
      reply.status(400).send({
        error: 'A publicBaseUrl is required when the request does not come through your public ngrok URL.',
      });
      return;
    }

    const { tenant } = tenantResult;
    const assistantConfig = await callService.getAssistantConfig(tenant.id);
    const brandProfile = await callService.getBrandProfile(tenant.id);
    const brandAssistantDefaults = brandProfile
      ? createAssistantDefaultsForBrand(brandProfile)
      : null;
    const contact = await callService.findOrCreateContact(tenant.id, to);
    const primaryLanguage = normalizeLanguageTag(assistantConfig?.primaryLanguage);
    const multilingualEnabled = assistantConfig?.multilingualEnabled ?? false;
    const voiceId = assistantConfig?.voiceId || 'hannah';
    const greetingMessage = assistantConfig?.greetingMessage || brandAssistantDefaults?.greetingMessage;

    if (!contact) {
      reply.status(500).send({ error: 'Failed to find or create the destination contact.' });
      return;
    }

    const systemPrompt = callService.buildSystemPrompt({
      personaName: assistantConfig?.personaName || brandAssistantDefaults?.personaName || 'Assistant',
      personaTone: assistantConfig?.personaTone || brandAssistantDefaults?.personaTone || 'professional',
      systemPrompt: assistantConfig?.systemPrompt,
      primaryLanguage,
      multilingualEnabled,
      contactName: contact.name,
      isVip: contact.isVip,
      brand: brandProfile,
    });

    const telephony = providerRegistry.telephony({ telephonyProvider: tenant.telephonyProvider });
    const streamUrl = buildPublicUrl(publicBaseUrl, '/ws/call-stream', true);
    const statusCallback = buildPublicUrl(publicBaseUrl, '/webhooks/twilio/status');
    const providerCallSid = await telephony.makeCall({
      to,
      from,
      streamUrl,
      statusCallback,
    });

    const call = await callService.createCallRecord({
      tenantId: tenant.id,
      contactId: contact.id,
      direction: 'outbound',
      callerNumber: from,
      dialedNumber: to,
      providerCallSid,
      provider: 'twilio',
    });

    if (!call) {
      reply.status(500).send({ error: 'Failed to create outbound call record.' });
      return;
    }

    await callService.setCallState(call.id, {
      callId: call.id,
      tenantId: tenant.id,
      callerNumber: to,
      dialedNumber: from,
      provider: 'twilio',
      telephonyProviderOverride: tenant.telephonyProvider,
      sttProviderOverride: tenant.sttProvider,
      status: 'ringing',
      conversationHistory: [],
      systemPrompt,
      primaryLanguage,
      multilingualEnabled,
      activeLanguage: primaryLanguage,
      voiceId,
      greetingMessage,
      contactId: contact.id,
      contactName: contact.name || undefined,
      isVip: contact.isVip,
      recordingChunks: [],
      startedAt: Date.now(),
    });

    await callService.mapProviderSid(providerCallSid, call.id);

    reply.send({
      success: true,
      data: {
        callId: call.id,
        providerCallSid,
        to,
        from,
        publicBaseUrl,
      },
    });
  });
}

function normalizePhoneNumber(value: string) {
  return value.trim();
}

function resolvePublicBaseUrl(
  request: { headers: Record<string, string | string[] | undefined> },
  override?: string
) {
  if (override) {
    return normalizeBaseUrl(override);
  }

  const host = getForwardedValue(request.headers['x-forwarded-host'])
    || getForwardedValue(request.headers.host);
  if (!host || host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return null;
  }

  const forwardedProto = getForwardedValue(request.headers['x-forwarded-proto']) || 'https';
  return normalizeBaseUrl(`${forwardedProto}://${host}`);
}

function buildPublicUrl(baseUrl: string, path: string, websocket = false) {
  const url = new URL(path, ensureTrailingSlash(baseUrl));

  if (websocket) {
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  }

  return url.toString();
}

function normalizeBaseUrl(value: string) {
  const url = new URL(value);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString();
}

function ensureTrailingSlash(value: string) {
  return value.endsWith('/') ? value : `${value}/`;
}

function getForwardedValue(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0]?.trim();
}
