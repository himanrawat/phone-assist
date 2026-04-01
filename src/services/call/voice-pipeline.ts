import type WebSocket from 'ws';
import { callService, type CallState } from './call.service.js';
import { providerRegistry } from '../../providers/registry.js';
import type { STTStream, TranscriptResult } from '../../types/providers.js';

/**
 * Voice Pipeline — handles real-time audio for a single call.
 *
 * Flow per conversation turn:
 * 1. Receive audio from telephony WebSocket
 * 2. Forward to STT provider for transcription
 * 3. On final transcript → send to LLM for response
 * 4. TTS converts response to audio
 * 5. Send audio back through telephony WebSocket
 */
export class VoicePipeline {
  private sttStream: STTStream | null = null;
  private isProcessing = false;
  private pendingTranscript = '';

  constructor(
    private ws: WebSocket,
    private callState: CallState,
    private streamSid: string,
    private tenantOverrides?: { telephonyProvider?: string; sttProvider?: string }
  ) {}

  /**
   * Start the voice pipeline — open STT stream and begin processing.
   */
  start() {
    const sttProvider = providerRegistry.stt(this.tenantOverrides);
    const telephonyProvider = providerRegistry.telephony(this.tenantOverrides);
    const mediaConfig = telephonyProvider.getMediaStreamConfig();

    this.sttStream = sttProvider.createStream({
      encoding: mediaConfig.encoding,
      sampleRate: mediaConfig.sampleRate,
    });

    this.sttStream.onTranscript((result: TranscriptResult) => {
      this.handleTranscript(result);
    });

    this.sttStream.onError((error: Error) => {
      console.error(`STT error for call ${this.callState.callId}:`, error.message);
    });

    console.log(`Voice pipeline started for call ${this.callState.callId}`);
  }

  /**
   * Feed raw audio from telephony WebSocket into STT.
   */
  handleAudio(audioPayload: string) {
    if (!this.sttStream) return;
    const audioBuffer = Buffer.from(audioPayload, 'base64');
    this.sttStream.send(audioBuffer);

    // Also store for recording
    this.callState.recordingChunks.push(audioPayload);
  }

  /**
   * Handle transcription result from STT.
   */
  private async handleTranscript(result: TranscriptResult) {
    if (!result.isFinal) {
      // Interim result — accumulate but don't process yet
      this.pendingTranscript = result.text;
      return;
    }

    const text = result.text.trim();
    if (!text || this.isProcessing) return;

    this.isProcessing = true;
    this.pendingTranscript = '';

    try {
      console.log(`[Call ${this.callState.callId}] Caller: ${text}`);

      // Get AI response
      const aiResponse = await callService.processConversationTurn(
        this.callState.callId,
        text
      );

      console.log(`[Call ${this.callState.callId}] Assistant: ${aiResponse}`);

      // Convert response to audio via TTS
      const tts = providerRegistry.tts();
      const audioBuffer = await tts.synthesize({
        text: aiResponse,
        voice: 'Arista-PlayAI',
      });

      // Send audio back through telephony WebSocket
      this.sendAudioToWebSocket(audioBuffer);
    } catch (err) {
      console.error(`Pipeline error for call ${this.callState.callId}:`, err);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send TTS audio back to the caller via the telephony WebSocket.
   */
  private sendAudioToWebSocket(audioBuffer: Buffer) {
    if (this.ws.readyState !== this.ws.OPEN) return;

    // Convert audio to base64 and send as media message
    const payload = audioBuffer.toString('base64');

    // Twilio media stream format
    const message = JSON.stringify({
      event: 'media',
      streamSid: this.streamSid,
      media: {
        payload,
      },
    });

    this.ws.send(message);
  }

  /**
   * Stop the pipeline — close STT stream.
   */
  stop() {
    if (this.sttStream) {
      this.sttStream.close();
      this.sttStream = null;
    }
    console.log(`Voice pipeline stopped for call ${this.callState.callId}`);
  }
}
