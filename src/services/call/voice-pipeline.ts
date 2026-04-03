import type WebSocket from 'ws';
import { callService, type CallState } from './call.service.js';
import { providerRegistry } from '../../providers/registry.js';
import type { STTStream, TranscriptResult } from '../../types/providers.js';
import { providerConfigService } from '../provider/provider-config.service.js';
import {
  createTwilioClearMessage,
  createTwilioMarkMessage,
  createTwilioMediaMessages,
  createTwilioPlaybackMarkName,
  TWILIO_TTS_OPTIONS,
} from '../../providers/telephony/twilio-media.js';

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
  private queuedTranscript: TranscriptResult | null = null;
  private pendingPlaybackMarks = new Set<string>();
  private playbackMarkCounter = 0;
  private interactionVersion = 0;

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
    const requestedSttProvider = this.tenantOverrides?.sttProvider
      || providerConfigService.getGlobalConfig().stt;
    const effectiveSttProvider = requestedSttProvider === 'groq'
      ? 'deepgram'
      : requestedSttProvider;
    const sttProvider = providerRegistry.stt({
      ...this.tenantOverrides,
      sttProvider: effectiveSttProvider,
    });
    const telephonyProvider = providerRegistry.telephony(this.tenantOverrides);
    const mediaConfig = telephonyProvider.getMediaStreamConfig();

    if (requestedSttProvider !== effectiveSttProvider) {
      console.warn(
        `[Call ${this.callState.callId}] STT provider "${requestedSttProvider}" is not supported for real-time Twilio media streams yet; falling back to "${effectiveSttProvider}".`
      );
    }

    this.sttStream = sttProvider.createStream({
      encoding: mediaConfig.encoding,
      sampleRate: mediaConfig.sampleRate,
      endpointingMs: 250,
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
      if (result.text.trim()) {
        this.interruptAssistantTurn('caller started speaking');
      }
      return;
    }

    const text = result.text.trim();
    if (!text) return;

    if (this.isProcessing) {
      this.queuedTranscript = {
        ...result,
        text,
      };
      this.interruptAssistantTurn('caller interrupted while response was being generated');
      return;
    }

    this.isProcessing = true;
    this.pendingTranscript = '';
    const turnVersion = this.interactionVersion;
    const turnStartedAt = Date.now();

    try {
      console.log(`[Call ${this.callState.callId}] Caller: ${text}`);

      // Get AI response
      const llmStartedAt = Date.now();
      const aiResponse = await callService.processConversationTurn(
        this.callState.callId,
        text
      );
      const llmDurationMs = Date.now() - llmStartedAt;

      console.log(`[Call ${this.callState.callId}] Assistant: ${aiResponse}`);
      console.log(`[Call ${this.callState.callId}] LLM completed in ${llmDurationMs}ms`);

      await this.playAssistantText(aiResponse, turnVersion, 'hannah', {
        turnStartedAt,
        llmDurationMs,
      });
    } catch (err) {
      console.error(`Pipeline error for call ${this.callState.callId}:`, err);
    } finally {
      this.isProcessing = false;
      const queuedTranscript = this.queuedTranscript;
      this.queuedTranscript = null;

      if (queuedTranscript) {
        void this.handleTranscript(queuedTranscript);
      }
    }
  }

  /**
   * Handle DTMF input as a speech-bypass diagnostic.
   */
  async handleDtmf(digit: string) {
    const trimmedDigit = digit.trim();
    if (!trimmedDigit) return;

    this.interruptAssistantTurn('caller pressed a key');
    this.isProcessing = true;
    const turnVersion = this.interactionVersion;

    try {
      console.log(`[Call ${this.callState.callId}] DTMF: ${trimmedDigit}`);
      await this.playAssistantText(buildDtmfDiagnosticMessage(trimmedDigit), turnVersion);
    } catch (err) {
      console.error(`DTMF diagnostic failed for call ${this.callState.callId}:`, err);
    } finally {
      this.isProcessing = false;
    }
  }

  async playGreeting(text: string, voice = 'hannah') {
    await this.playAssistantText(text, this.interactionVersion, voice);
  }

  handlePlaybackMark(markName: string) {
    if (!markName) return;
    this.pendingPlaybackMarks.delete(markName);
  }

  private interruptAssistantTurn(reason: string) {
    const shouldInterrupt = this.isProcessing || this.pendingPlaybackMarks.size > 0;
    if (!shouldInterrupt) return;

    this.interactionVersion += 1;

    if (this.pendingPlaybackMarks.size > 0 && this.ws.readyState === this.ws.OPEN) {
      this.ws.send(createTwilioClearMessage(this.streamSid));
      this.pendingPlaybackMarks.clear();
      console.log(`[Call ${this.callState.callId}] Cleared assistant playback: ${reason}`);
    }
  }

  private async playAssistantText(
    text: string,
    turnVersion: number,
    voice = 'hannah',
    timings?: { turnStartedAt: number; llmDurationMs?: number }
  ) {
    const tts = providerRegistry.tts();
    const ttsStartedAt = Date.now();
    const audioBuffer = await tts.synthesize({
      text,
      voice,
      ...TWILIO_TTS_OPTIONS,
    });
    const ttsDurationMs = Date.now() - ttsStartedAt;

    if (turnVersion !== this.interactionVersion) {
      console.log(`[Call ${this.callState.callId}] Dropped stale assistant audio after interruption`);
      return;
    }

    this.sendAudioToWebSocket(audioBuffer);

    if (timings) {
      const totalDurationMs = Date.now() - timings.turnStartedAt;
      const llmPart = timings.llmDurationMs !== undefined
        ? `, llm=${timings.llmDurationMs}ms`
        : '';
      console.log(
        `[Call ${this.callState.callId}] Outbound audio queued in ${totalDurationMs}ms${llmPart}, tts=${ttsDurationMs}ms`
      );
    }
  }

  /**
   * Send TTS audio back to the caller via the telephony WebSocket.
   */
  private sendAudioToWebSocket(audioBuffer: Buffer) {
    if (this.ws.readyState !== this.ws.OPEN) return;

    const playbackMarkName = createTwilioPlaybackMarkName(
      this.callState.callId,
      ++this.playbackMarkCounter
    );

    for (const message of createTwilioMediaMessages(this.streamSid, audioBuffer)) {
      this.ws.send(message);
    }

    this.pendingPlaybackMarks.add(playbackMarkName);
    this.ws.send(createTwilioMarkMessage(this.streamSid, playbackMarkName));
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

function buildDtmfDiagnosticMessage(digit: string): string {
  if (digit === '1') {
    return 'I heard your key press. If you can hear this reply, the outbound audio path is working and speech to text is the next thing to check.';
  }

  return `I heard the ${digit} key. If you can hear this reply, the outbound audio path is working and speech to text is the next thing to check.`;
}
