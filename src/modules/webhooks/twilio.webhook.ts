import type { FastifyInstance } from 'fastify';
import { env } from '../../shared/config/env.js';
import { logger } from '../../shared/logging/logger.js';
import { createAssistantDefaultsForBrand } from '../../lib/brand-profile.js';
import { providerRegistry } from '../providers/registry.js';
import { callService } from '../calls/calls.service.js';
import { normalizeLanguageTag } from '../calls/call-language.js';

export async function twilioWebhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/twilio/voice', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const callerNumber = body.From || '';
    const dialedNumber = body.To || body.ForwardedFrom || body.Called || '';
    const providerCallSid = body.CallSid || '';

    logger.info({ callerNumber, dialedNumber, providerCallSid }, 'Inbound call received');

    const result = await callService.findTenantByNumber(dialedNumber);
    if (!result) {
      logger.warn({ dialedNumber }, 'No tenant found for number');
      reply.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>'
      );
      return;
    }

    const { tenant } = result;
    const assistantConfig = await callService.getAssistantConfig(tenant.id);
    const contact = await callService.findOrCreateContact(tenant.id, callerNumber);
    if (!contact) {
      reply.status(500).send({ error: 'Failed to create contact' });
      return;
    }

    const call = await callService.createCallRecord({
      tenantId: tenant.id,
      contactId: contact.id,
      direction: 'inbound',
      callerNumber,
      dialedNumber,
      providerCallSid,
      provider: 'twilio',
    });
    if (!call) {
      reply.status(500).send({ error: 'Failed to create call record' });
      return;
    }

    const brandProfile = await callService.getBrandProfile(tenant.id);
    const brandAssistantDefaults = brandProfile ? createAssistantDefaultsForBrand(brandProfile) : null;
    const primaryLanguage = normalizeLanguageTag(assistantConfig?.primaryLanguage);
    const multilingualEnabled = assistantConfig?.multilingualEnabled ?? false;
    const voiceId = assistantConfig?.voiceId || 'hannah';
    const greetingMessage = assistantConfig?.greetingMessage || brandAssistantDefaults?.greetingMessage;
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

    await callService.setCallState(call.id, {
      callId: call.id,
      tenantId: tenant.id,
      callerNumber,
      dialedNumber,
      provider: 'twilio',
      telephonyProviderOverride: tenant.telephonyProvider,
      sttProviderOverride: tenant.sttProvider,
      status: 'in_progress',
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

    const host = getForwardedValue(request.headers['x-forwarded-host'])
      || request.headers.host
      || `localhost:${env.PORT}`;
    const forwardedProto = getForwardedValue(request.headers['x-forwarded-proto']);
    const wsProtocol = forwardedProto === 'http' ? 'ws' : 'wss';
    const streamUrl = `${wsProtocol}://${host}/ws/call-stream`;

    const telephony = providerRegistry.telephony({ telephonyProvider: tenant.telephonyProvider });
    const twiml = telephony.generateCallResponse({
      streamUrl,
      record: assistantConfig?.recordingEnabled ?? true,
    });

    reply.type('text/xml').send(twiml);
  });

  fastify.post('/webhooks/twilio/status', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const providerCallSid = body.CallSid || '';
    const callStatus = body.CallStatus || '';

    logger.info({ providerCallSid, callStatus }, 'Call status update received');

    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'no-answer') {
      const callId = await callService.getCallIdByProviderSid(providerCallSid);
      if (callId) {
        await callService.endCall(callId);
      }
    }

    reply.send({ received: true });
  });
}

function getForwardedValue(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  return value?.split(',')[0]?.trim();
}
