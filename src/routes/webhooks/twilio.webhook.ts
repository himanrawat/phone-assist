import type { FastifyInstance } from 'fastify';
import { callService } from '../../services/call/call.service.js';
import { providerRegistry } from '../../providers/registry.js';
import { env } from '../../config/env.js';

export async function twilioWebhookRoutes(fastify: FastifyInstance) {
  /**
   * POST /webhooks/twilio/voice
   * Called by Twilio when an inbound call arrives.
   * Returns TwiML to connect the call to our WebSocket stream.
   */
  fastify.post('/webhooks/twilio/voice', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const callerNumber = body.From || '';
    const dialedNumber = body.To || body.ForwardedFrom || body.Called || '';
    const providerCallSid = body.CallSid || '';

    console.log(`Inbound call from ${callerNumber} to ${dialedNumber} (SID: ${providerCallSid})`);

    // Find tenant by dialed number
    const result = await callService.findTenantByNumber(dialedNumber);

    if (!result) {
      console.warn(`No tenant found for number: ${dialedNumber}`);
      reply.type('text/xml').send(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, this number is not configured.</Say><Hangup/></Response>'
      );
      return;
    }

    const { tenant } = result;

    // Get AI config
    const assistantConfig = await callService.getAssistantConfig(tenant.id);

    // Find or create contact
    const contact = await callService.findOrCreateContact(tenant.id, callerNumber);
    if (!contact) {
      reply.status(500).send({ error: 'Failed to create contact' });
      return;
    }

    // Create call record
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

    // Fetch brand profile for rich business context
    const brandProfile = await callService.getBrandProfile(tenant.id);

    // Build system prompt
    const systemPrompt = callService.buildSystemPrompt({
      personaName: assistantConfig?.personaName || 'Assistant',
      personaTone: assistantConfig?.personaTone || 'professional',
      systemPrompt: assistantConfig?.systemPrompt,
      contactName: contact.name,
      isVip: contact.isVip,
      brand: brandProfile,
    });

    // Store call state in Redis
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
      contactId: contact.id,
      contactName: contact.name || undefined,
      isVip: contact.isVip,
      recordingChunks: [],
      startedAt: Date.now(),
    });

    // Map provider SID to our call ID
    await callService.mapProviderSid(providerCallSid, call.id);

    // Generate TwiML response
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

  /**
   * POST /webhooks/twilio/status
   * Called by Twilio when call status changes (completed, failed, etc).
   */
  fastify.post('/webhooks/twilio/status', async (request, reply) => {
    const body = request.body as Record<string, string>;
    const providerCallSid = body.CallSid || '';
    const callStatus = body.CallStatus || '';

    console.log(`Call status update: ${providerCallSid} → ${callStatus}`);

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
