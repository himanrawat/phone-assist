import type { FastifyInstance } from 'fastify';
import { callService } from '../../services/call/call.service.js';
import { VoicePipeline } from '../../services/call/voice-pipeline.js';

/**
 * WebSocket endpoint for real-time bidirectional audio streaming.
 * Twilio connects here after the initial webhook response.
 *
 * Protocol (Twilio Media Streams):
 * - 'connected': Stream is ready
 * - 'start': Stream metadata (callSid, streamSid, etc)
 * - 'dtmf': Keypad input from the caller
 * - 'mark': Playback completion marker for outbound audio
 * - 'media': Raw audio data (base64 encoded)
 * - 'stop': Stream ended
 */
export async function callStreamWebSocket(fastify: FastifyInstance) {
  fastify.get('/ws/call-stream', { websocket: true }, (socket, _request) => {
    let pipeline: VoicePipeline | null = null;
    let callId: string | null = null;
    let streamSid: string | null = null;

    console.log('WebSocket connected for call stream');

    socket.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.event) {
          case 'connected':
            console.log('Media stream connected');
            break;

          case 'start': {
            // Stream started — extract metadata
            const start = message.start;
            const currentStreamSid = String(start.streamSid);
            streamSid = currentStreamSid;
            const providerCallSid = start.callSid;

            console.log(`Stream started: streamSid=${streamSid}, callSid=${providerCallSid}`);

            // Look up our internal call ID
            callId = await callService.getCallIdByProviderSid(providerCallSid);
            if (!callId) {
              console.error(`No call found for provider SID: ${providerCallSid}`);
              return;
            }

            const callState = await callService.getCallState(callId);
            if (!callState) {
              console.error(`No call state for call: ${callId}`);
              return;
            }

            // Start voice pipeline
            pipeline = new VoicePipeline(socket, callState, currentStreamSid, {
              telephonyProvider: callState.telephonyProviderOverride ?? undefined,
              sttProvider: callState.sttProviderOverride ?? undefined,
            });
            pipeline.start();

            // Send initial greeting via TTS
            const greetingMessage = callState.greetingMessage;

            if (greetingMessage) {
              await pipeline.playGreeting(
                greetingMessage,
                callState.voiceId || 'hannah'
              );

              // Add greeting to conversation history
              callState.conversationHistory.push({
                role: 'assistant',
                content: greetingMessage,
              });
              await callService.setCallState(callId, callState);
            }
            break;
          }

          case 'mark': {
            if (pipeline && message.mark?.name) {
              pipeline.handlePlaybackMark(String(message.mark.name));
            }
            break;
          }

          case 'dtmf': {
            if (pipeline && message.dtmf?.digit) {
              await pipeline.handleDtmf(String(message.dtmf.digit));
            }
            break;
          }

          case 'media': {
            // Raw audio data from the caller
            if (pipeline && message.media?.payload) {
              pipeline.handleAudio(message.media.payload);
            }
            break;
          }

          case 'stop': {
            console.log(`Stream stopped for call ${callId}`);
            if (pipeline) {
              pipeline.stop();
              pipeline = null;
            }
            if (callId) {
              await callService.endCall(callId);
            }
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    socket.on('close', async () => {
      console.log(`WebSocket closed for call ${callId}`);
      if (pipeline) {
        pipeline.stop();
        pipeline = null;
      }
      if (callId) {
        await callService.endCall(callId);
      }
    });

    socket.on('error', (err) => {
      console.error(`WebSocket error for call ${callId}:`, err.message);
    });
  });
}
