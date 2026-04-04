import type {
  STTStream,
  STTStreamOptions,
  TranscriptResult,
} from '../../types/providers.js';
import {
  detectSpeechActivity,
  wrapAudioInWave,
} from '../audio/audio-utils.js';

interface ChunkedTranscription {
  text: string;
  confidence?: number;
  language?: string;
}

interface ChunkedUploadStreamConfig {
  placeholderInterimText?: string;
  minSpeechMs?: number;
  interimSpeechMs?: number;
  maxUtteranceMs?: number;
  minEndpointingMs?: number;
  upload: (audioWaveFile: Buffer, options: STTStreamOptions) => Promise<ChunkedTranscription>;
}

export class ChunkedUploadSTTStream implements STTStream {
  private audioBuffer: Buffer[] = [];
  private transcriptCallbacks: Array<(result: TranscriptResult) => void> = [];
  private errorCallbacks: Array<(error: Error) => void> = [];
  private speechDetected = false;
  private speechDurationMs = 0;
  private silenceDurationMs = 0;
  private utteranceDurationMs = 0;
  private interimEmitted = false;
  private transcribing = false;
  private pendingFlush = false;
  private closed = false;

  constructor(
    private options: STTStreamOptions,
    private config: ChunkedUploadStreamConfig
  ) {}

  send(audio: Buffer): void {
    if (this.closed) {
      return;
    }

    const activity = detectSpeechActivity(audio, this.options);

    if (!this.speechDetected && !activity.isSpeech) {
      return;
    }

    this.audioBuffer.push(audio);
    this.utteranceDurationMs += activity.durationMs;

    if (activity.isSpeech) {
      this.silenceDurationMs = 0;
      this.speechDurationMs += activity.durationMs;

      if (!this.speechDetected) {
        this.speechDetected = true;
      }

      if (!this.interimEmitted && this.speechDurationMs >= this.interimSpeechMs) {
        this.interimEmitted = true;
        this.emitTranscript({
          text: this.config.placeholderInterimText || '[speech]',
          isFinal: false,
          confidence: 0,
          language: this.options.language,
        });
      }
    } else {
      this.silenceDurationMs += activity.durationMs;
    }

    if (this.shouldDropNoise()) {
      this.resetUtterance();
      return;
    }

    if (this.shouldFlushAfterSilence() || this.shouldFlushForDuration()) {
      void this.flush();
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  close(): void {
    this.closed = true;
    void this.flush(true);
  }

  private shouldDropNoise(): boolean {
    return this.speechDetected
      && this.speechDurationMs < this.minSpeechMs
      && this.silenceDurationMs >= this.endpointingMs;
  }

  private shouldFlushAfterSilence(): boolean {
    return this.speechDetected
      && this.speechDurationMs >= this.minSpeechMs
      && this.silenceDurationMs >= this.endpointingMs;
  }

  private shouldFlushForDuration(): boolean {
    return this.speechDetected
      && this.speechDurationMs >= this.minSpeechMs
      && this.utteranceDurationMs >= this.maxUtteranceMs;
  }

  private async flush(force = false) {
    if (this.transcribing) {
      this.pendingFlush = true;
      return;
    }

    if (this.audioBuffer.length === 0) {
      return;
    }

    if (!force && this.speechDurationMs < this.minSpeechMs) {
      return;
    }

    const audioBuffer = Buffer.concat(this.audioBuffer.splice(0));
    this.resetUtterance();

    if (audioBuffer.length === 0) {
      return;
    }

    this.transcribing = true;

    try {
      const waveFile = wrapAudioInWave(audioBuffer, this.options);
      const result = await this.config.upload(waveFile, this.options);
      const text = result.text.trim();

      if (text) {
        this.emitTranscript({
          text,
          isFinal: true,
          confidence: result.confidence ?? 0.85,
          language: result.language || this.options.language,
        });
      }
    } catch (error) {
      this.emitError(error as Error);
    } finally {
      this.transcribing = false;

      if (this.pendingFlush) {
        this.pendingFlush = false;

        if (this.audioBuffer.length > 0) {
          void this.flush(this.closed);
        }
      }
    }
  }

  private emitTranscript(result: TranscriptResult) {
    for (const callback of this.transcriptCallbacks) {
      callback(result);
    }
  }

  private emitError(error: Error) {
    for (const callback of this.errorCallbacks) {
      callback(error);
    }
  }

  private resetUtterance() {
    this.audioBuffer = [];
    this.speechDetected = false;
    this.speechDurationMs = 0;
    this.silenceDurationMs = 0;
    this.utteranceDurationMs = 0;
    this.interimEmitted = false;
  }

  private get minSpeechMs(): number {
    return this.config.minSpeechMs ?? 200;
  }

  private get interimSpeechMs(): number {
    return Math.max(this.config.interimSpeechMs ?? 260, this.minSpeechMs);
  }

  private get maxUtteranceMs(): number {
    return this.config.maxUtteranceMs ?? 12000;
  }

  private get endpointingMs(): number {
    const configured = this.options.endpointingMs ?? 700;
    return Math.max(configured, this.config.minEndpointingMs ?? 600);
  }
}
