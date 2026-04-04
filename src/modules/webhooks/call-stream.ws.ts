import type { FastifyInstance } from 'fastify';
import { logger } from '../../shared/logging/logger.js';
import { callService } from '../calls/calls.service.js';
import { VoicePipeline } from '../calls/voice-pipeline.js';

export async function callStreamWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/call-stream', { websocket: true }, (socket) => {
    let pipeline: VoicePipeline | null = null;
    let callId: string | null = null;

    logger.info('WebSocket connected for call stream');

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case 'connected':
            logger.info('Media stream connected');
            break;
          case 'start': {
            const currentStreamSid = String(message.start.streamSid);
            const providerCallSid = message.start.callSid;

            logger.info({ streamSid: currentStreamSid, providerCallSid }, 'Stream started');

            callId = await callService.getCallIdByProviderSid(providerCallSid);
            if (!callId) {
              logger.error({ providerCallSid }, 'No call found for provider SID');
              return;
            }

            const callState = await callService.getCallState(callId);
            if (!callState) {
              logger.error({ callId }, 'No call state found');
              return;
            }

            pipeline = new VoicePipeline(socket, callState, currentStreamSid, {
              telephonyProvider: callState.telephonyProviderOverride ?? undefined,
              sttProvider: callState.sttProviderOverride ?? undefined,
            });
            pipeline.start();

            if (callState.greetingMessage) {
              await pipeline.playGreeting(callState.greetingMessage, callState.voiceId || 'hannah');
              callState.conversationHistory.push({
                role: 'assistant',
                content: callState.greetingMessage,
              });
              await callService.setCallState(callId, callState);
            }
            break;
          }
          case 'mark':
            if (pipeline && message.mark?.name) {
              pipeline.handlePlaybackMark(String(message.mark.name));
            }
            break;
          case 'dtmf':
            if (pipeline && message.dtmf?.digit) {
              await pipeline.handleDtmf(String(message.dtmf.digit));
            }
            break;
          case 'media':
            if (pipeline && message.media?.payload) {
              pipeline.handleAudio(message.media.payload);
            }
            break;
          case 'stop':
            logger.info({ callId }, 'Stream stopped');
            if (pipeline) {
              pipeline.stop();
              pipeline = null;
            }
            if (callId) {
              await callService.endCall(callId);
            }
            break;
          default:
            break;
        }
      } catch (err) {
        logger.error({ err, callId }, 'WebSocket message error');
      }
    });

    socket.on('close', async () => {
      logger.info({ callId }, 'WebSocket closed');
      if (pipeline) {
        pipeline.stop();
        pipeline = null;
      }
      if (callId) {
        await callService.endCall(callId);
      }
    });

    socket.on('error', (err) => {
      logger.error({ err, callId }, 'WebSocket error');
    });
  });
}
