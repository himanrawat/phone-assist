import WebSocket from 'ws';
import type {
  STTProvider,
  STTStream,
  STTStreamOptions,
  TranscriptResult,
} from '../../types/providers.js';
import { env } from '../../config/env.js';
import { logger } from '../../shared/logging/logger.js';

export class DeepgramProvider implements STTProvider {
  readonly name = 'deepgram' as const;

  createStream(options: STTStreamOptions = {}): STTStream {
    return new DeepgramStream(env.DEEPGRAM_API_KEY, options);
  }
}

class DeepgramStream implements STTStream {
  private ws: WebSocket | null = null;
  private transcriptCallbacks: ((result: TranscriptResult) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private finalizedSegments: string[] = [];
  private finalFlushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private apiKey: string,
    private options: STTStreamOptions
  ) {
    this.connect();
  }

  private connect() {
    const params = new URLSearchParams({
      model: this.options.model || 'nova-3',
      language: this.options.language || 'en',
      encoding: this.options.encoding || 'mulaw',
      sample_rate: String(this.options.sampleRate || 8000),
      channels: '1',
      punctuate: 'true',
      interim_results: 'true',
      endpointing: String(this.options.endpointingMs || 100),
      vad_events: 'true',
    });

    const url = `wss://api.deepgram.com/v1/listen?${params}`;

    this.ws = new WebSocket(url, {
      headers: { Authorization: `Token ${this.apiKey}` },
    });

    this.ws.on('open', () => {
      logger.info('Deepgram STT stream connected');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'Results' && msg.channel?.alternatives?.[0]) {
          this.handleResultsMessage(msg);
        }

        if (msg.type === 'UtteranceEnd') {
          this.flushFinalTranscript();
        }
      } catch (err) {
        for (const cb of this.errorCallbacks) cb(err as Error);
      }
    });

    this.ws.on('error', (err) => {
      for (const cb of this.errorCallbacks) cb(err);
    });

    this.ws.on('close', () => {
      logger.info('Deepgram STT stream closed');
    });
  }

  send(audio: Buffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(audio);
    }
  }

  onTranscript(callback: (result: TranscriptResult) => void): void {
    this.transcriptCallbacks.push(callback);
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallbacks.push(callback);
  }

  close(): void {
    this.clearFinalFlushTimer();

    if (this.ws) {
      // Send close frame to Deepgram
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'CloseStream' }));
      }
      this.ws.close();
      this.ws = null;
    }
  }

  private handleResultsMessage(msg: {
    is_final?: boolean;
    speech_final?: boolean;
    channel?: {
      detected_language?: string;
      alternatives?: Array<{ transcript?: string; confidence?: number }>;
    };
  }) {
    const alt = msg.channel?.alternatives?.[0];
    const text = alt?.transcript?.trim() || '';
    const confidence = typeof alt?.confidence === 'number' ? alt.confidence : 0;
    const language = msg.channel?.detected_language;

    if (!text && !msg.is_final) {
      return;
    }

    if (msg.is_final) {
      if (text) {
        this.finalizedSegments.push(text);
      }

      if (msg.speech_final) {
        this.flushFinalTranscript(confidence, language);
        return;
      }

      this.scheduleFinalTranscriptFlush(confidence, language);
      return;
    }

    if (text) {
      this.emitTranscript({
        text,
        isFinal: false,
        confidence,
        language,
      });
    }
  }

  private scheduleFinalTranscriptFlush(confidence: number, language?: string) {
    this.clearFinalFlushTimer();
    this.finalFlushTimer = setTimeout(() => {
      this.finalFlushTimer = null;
      this.flushFinalTranscript(confidence, language);
    }, 200);
  }

  private clearFinalFlushTimer() {
    if (this.finalFlushTimer) {
      clearTimeout(this.finalFlushTimer);
      this.finalFlushTimer = null;
    }
  }

  private flushFinalTranscript(confidence = 0, language?: string) {
    this.clearFinalFlushTimer();

    const text = this.finalizedSegments.join(' ').trim();
    this.finalizedSegments = [];

    if (!text) {
      return;
    }

    this.emitTranscript({
      text,
      isFinal: true,
      confidence,
      language,
    });
  }

  private emitTranscript(result: TranscriptResult) {
    for (const cb of this.transcriptCallbacks) cb(result);
  }
}
