import type WebSocket from 'ws';
import { logger } from '../../shared/logging/logger.js';
import type { STTStream, TranscriptResult } from '../../shared/types/providers.js';
import { env } from '../../shared/config/env.js';
import { providerRegistry } from '../providers/registry.js';
import { providerConfigService } from '../providers/providers.service.js';
import {
  createTwilioClearMessage,
  createTwilioMarkMessage,
  createTwilioMediaMessages,
  createTwilioPlaybackMarkName,
  TWILIO_TTS_OPTIONS,
} from '../providers/telephony/twilio-media.js';
import { callService, type CallState } from './calls.service.js';
import {
  resolveActiveCallLanguage,
  resolveSttLanguage,
  shouldUseOpenAITts,
} from './call-language.js';

export class VoicePipeline {
  private sttStream: STTStream | null = null;
  private isProcessing = false;
  private pendingTranscript = '';
  private queuedTranscript: TranscriptResult | null = null;
  private readonly pendingPlaybackMarks = new Set<string>();
  private playbackMarkCounter = 0;
  private interactionVersion = 0;
  private activeSttProvider = 'deepgram';
  private suppressSttUntil = 0;

  constructor(
    private readonly ws: WebSocket,
    private readonly callState: CallState,
    private readonly streamSid: string,
    private readonly tenantOverrides?: { telephonyProvider?: string; sttProvider?: string }
  ) {}

  start() {
    const requestedSttProvider = this.tenantOverrides?.sttProvider || providerConfigService.getGlobalConfig().stt;
    this.activeSttProvider = requestedSttProvider;
    const sttProvider = providerRegistry.stt({
      ...this.tenantOverrides,
      sttProvider: requestedSttProvider,
    });
    const telephonyProvider = providerRegistry.telephony(this.tenantOverrides);
    const mediaConfig = telephonyProvider.getMediaStreamConfig();

    this.sttStream = sttProvider.createStream({
      encoding: mediaConfig.encoding,
      sampleRate: mediaConfig.sampleRate,
      endpointingMs: 250,
      language: resolveSttLanguage({
        primaryLanguage: this.callState.primaryLanguage,
        multilingualEnabled: this.callState.multilingualEnabled,
        providerName: requestedSttProvider,
      }),
    });

    this.sttStream.onTranscript((result) => {
      void this.handleTranscript(result);
    });

    this.sttStream.onError((error: Error) => {
      logger.error({ err: error, callId: this.callState.callId }, 'STT error');
    });

    logger.info({ callId: this.callState.callId }, 'Voice pipeline started');
  }

  handleAudio(audioPayload: string) {
    if (!this.sttStream) {
      return;
    }

    const audioBuffer = Buffer.from(audioPayload, 'base64');
    this.callState.recordingChunks.push(audioPayload);

    if (this.shouldSuppressSttInput()) {
      return;
    }

    this.sttStream.send(audioBuffer);
  }

  private async handleTranscript(result: TranscriptResult) {
    if (!result.isFinal) {
      this.pendingTranscript = result.text;
      if (result.text.trim()) {
        this.interruptAssistantTurn('caller started speaking');
      }
      return;
    }

    const text = result.text.trim();
    if (!text) {
      return;
    }

    if (this.isProcessing) {
      this.queuedTranscript = { ...result, text };
      this.interruptAssistantTurn('caller interrupted while response was being generated');
      return;
    }

    this.isProcessing = true;
    this.pendingTranscript = '';
    const turnVersion = this.interactionVersion;
    const turnStartedAt = Date.now();

    try {
      logger.info({ callId: this.callState.callId, text }, 'Caller transcript received');

      const llmStartedAt = Date.now();
      const aiResponse = await callService.processConversationTurn(this.callState.callId, text, {
        detectedLanguage: result.language,
      });
      const llmDurationMs = Date.now() - llmStartedAt;
      this.callState.activeLanguage = aiResponse.responseLanguage;

      logger.info(
        {
          callId: this.callState.callId,
          content: aiResponse.content,
          llmDurationMs,
        },
        'Assistant response generated'
      );

      await this.playAssistantText(aiResponse.content, turnVersion, this.callState.voiceId || 'hannah', {
        turnStartedAt,
        llmDurationMs,
      });
    } catch (err) {
      logger.error({ err, callId: this.callState.callId }, 'Pipeline error');
    } finally {
      this.isProcessing = false;
      const queuedTranscript = this.queuedTranscript;
      this.queuedTranscript = null;

      if (queuedTranscript) {
        void this.handleTranscript(queuedTranscript);
      }
    }
  }

  async handleDtmf(digit: string) {
    const trimmedDigit = digit.trim();
    if (!trimmedDigit) {
      return;
    }

    this.interruptAssistantTurn('caller pressed a key');
    this.isProcessing = true;
    const turnVersion = this.interactionVersion;

    try {
      logger.info({ callId: this.callState.callId, digit: trimmedDigit }, 'DTMF input received');
      await this.playAssistantText(buildDtmfDiagnosticMessage(trimmedDigit), turnVersion);
    } catch (err) {
      logger.error({ err, callId: this.callState.callId }, 'DTMF diagnostic failed');
    } finally {
      this.isProcessing = false;
    }
  }

  async playGreeting(text: string, voice = 'hannah') {
    await this.playAssistantText(text, this.interactionVersion, voice);
  }

  handlePlaybackMark(markName: string) {
    if (!markName) {
      return;
    }

    this.pendingPlaybackMarks.delete(markName);
    if (this.pendingPlaybackMarks.size === 0) {
      this.suppressSttUntil = Date.now() + 500;
    }
  }

  private interruptAssistantTurn(reason: string) {
    const shouldInterrupt = this.isProcessing || this.pendingPlaybackMarks.size > 0;
    if (!shouldInterrupt) {
      return;
    }

    this.interactionVersion += 1;

    if (this.pendingPlaybackMarks.size > 0 && this.ws.readyState === this.ws.OPEN) {
      this.ws.send(createTwilioClearMessage(this.streamSid));
      this.pendingPlaybackMarks.clear();
      this.suppressSttUntil = Date.now() + 250;
      logger.info({ callId: this.callState.callId, reason }, 'Cleared assistant playback');
    }
  }

  private async playAssistantText(
    text: string,
    turnVersion: number,
    voice = 'hannah',
    timings?: { turnStartedAt: number; llmDurationMs?: number }
  ) {
    const language = resolveActiveCallLanguage(this.callState);
    const configuredTtsProvider = providerConfigService.getGlobalConfig().tts;
    const shouldFallbackToOpenAI = configuredTtsProvider !== 'openai'
      && shouldUseOpenAITts(this.callState)
      && Boolean(env.OPENAI_API_KEY);
    const ttsProviderName = shouldFallbackToOpenAI ? 'openai' : configuredTtsProvider;
    const tts = providerRegistry.tts(ttsProviderName);
    const ttsStartedAt = Date.now();
    const audioBuffer = await tts.synthesize({
      text,
      voice,
      language,
      ...TWILIO_TTS_OPTIONS,
    });
    const ttsDurationMs = Date.now() - ttsStartedAt;

    if (turnVersion !== this.interactionVersion) {
      logger.info({ callId: this.callState.callId }, 'Dropped stale assistant audio after interruption');
      return;
    }

    this.sendAudioToWebSocket(audioBuffer);

    if (timings) {
      logger.info(
        {
          callId: this.callState.callId,
          totalDurationMs: Date.now() - timings.turnStartedAt,
          llmDurationMs: timings.llmDurationMs,
          ttsDurationMs,
          ttsProviderName,
          language,
        },
        'Outbound audio queued'
      );
    }
  }

  private sendAudioToWebSocket(audioBuffer: Buffer) {
    if (this.ws.readyState !== this.ws.OPEN) {
      return;
    }

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

  stop() {
    if (this.sttStream) {
      this.sttStream.close();
      this.sttStream = null;
    }

    logger.info({ callId: this.callState.callId }, 'Voice pipeline stopped');
  }

  private shouldSuppressSttInput() {
    if (this.activeSttProvider === 'deepgram') {
      return false;
    }

    return this.pendingPlaybackMarks.size > 0 || Date.now() < this.suppressSttUntil;
  }
}

function buildDtmfDiagnosticMessage(digit: string) {
  if (digit === '1') {
    return 'I heard your key press. If you can hear this reply, the outbound audio path is working and speech to text is the next thing to check.';
  }

  return `I heard the ${digit} key. If you can hear this reply, the outbound audio path is working and speech to text is the next thing to check.`;
}
