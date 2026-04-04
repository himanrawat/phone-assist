import type { FastifyInstance } from 'fastify';
import { env } from '../../shared/config/env.js';
import { requireAuth, requireTenantRole } from '../../shared/auth/guards.js';
import { notFound } from '../../shared/errors/errors.js';
import { parsePagination } from '../../shared/utils/pagination.js';
import { recordingService } from '../recordings/recording.service.js';
import { providerRegistry } from '../providers/registry.js';
import { createAssistantDefaultsForBrand } from '../../lib/brand-profile.js';
import { createOutboundCallSchema } from './calls.schemas.js';
import { callService } from './calls.service.js';
import {
  getCallByIdForTenant,
  getCallMessages,
  getRecordingKeyForTenantCall,
  listCallsByTenant,
} from './calls.queries.js';
import { normalizeLanguageTag } from './call-language.js';

type ForwardedHeaderValue = string | string[] | undefined;
type ForwardedHeaders = Record<string, ForwardedHeaderValue>;

export async function callRoutes(fastify: FastifyInstance) {
  const listHandler = async (request: Parameters<FastifyInstance['get']>[1] extends never ? never : any, reply: any) => {
    const { limit, offset } = parsePagination(request.query as { limit?: string; offset?: string });
    const tenantId = request.tenant!.id;
    const result = await listCallsByTenant(tenantId, limit, offset);
    reply.send({ data: result, limit, offset });
  };

  fastify.get('/api/v1/calls', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, listHandler);

  fastify.get('/api/v1/admin/calls', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, listHandler);

  const detailHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const call = await getCallByIdForTenant(id, request.tenant!.id);

    if (!call) {
      throw notFound('Call not found.');
    }

    const messages = await getCallMessages(id);
    reply.send({ data: { ...call, messages } });
  };

  fastify.get('/api/v1/calls/:id', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, detailHandler);

  fastify.get('/api/v1/admin/calls/:id', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, detailHandler);

  const recordingHandler = async (request: any, reply: any) => {
    const { id } = request.params as { id: string };
    const recordingKey = await getRecordingKeyForTenantCall(id, request.tenant!.id);

    if (!recordingKey) {
      throw notFound('Recording not found.');
    }

    const recordingData = await recordingService.getRecordingData(recordingKey);
    if (!recordingData) {
      throw notFound('Recording file missing.');
    }

    reply
      .type('audio/wav')
      .header('Cache-Control', 'private, max-age=3600')
      .send(recordingData);
  };

  fastify.get('/api/v1/calls/:id/recording', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager', 'tenant_viewer')],
  }, recordingHandler);

  fastify.post('/api/v1/calls/outbound', {
    preHandler: [requireAuth, requireTenantRole('tenant_admin', 'tenant_manager')],
  }, async (request, reply) => {
    const body = createOutboundCallSchema.parse(request.body);
    const to = normalizePhoneNumber(body.to);
    const from = normalizePhoneNumber(body.from || env.TWILIO_PHONE_NUMBER);

    if (!from) {
      reply.status(400).send({ error: 'A Twilio source number is required.' });
      return;
    }

    const tenant = request.tenant!;
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

    const publicBaseUrl = resolvePublicBaseUrl(request.headers as ForwardedHeaders, body.publicBaseUrl);
    if (!publicBaseUrl) {
      reply.status(400).send({
        error: 'A publicBaseUrl is required when the request does not come through your public ngrok URL.',
      });
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

    const telephony = providerRegistry.telephony();
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
  headers: ForwardedHeaders,
  override?: string
) {
  if (override) {
    return normalizeBaseUrl(override);
  }

  const host = getForwardedValue(headers['x-forwarded-host']) || getForwardedValue(headers.host);
  if (!host || host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return null;
  }

  const forwardedProto = getForwardedValue(headers['x-forwarded-proto']) || 'https';
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

function getForwardedValue(header: ForwardedHeaderValue) {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0]?.trim();
}
