import type {
  STTProvider,
  STTStream,
  STTStreamOptions,
  TranscriptResult,
} from '../../types/providers.js';
import { env } from '../../config/env.js';

export class GroqWhisperProvider implements STTProvider {
  readonly name = 'groq' as const;

  createStream(options: STTStreamOptions = {}): STTStream {
    return new GroqWhisperStream(env.GROQ_API_KEY, options);
  }
}

/**
 * Groq Whisper is chunk-based (not true streaming).
 * We buffer audio and send chunks every ~500ms for transcription.
 */
class GroqWhisperStream implements STTStream {
  private audioBuffer: Buffer[] = [];
  private transcriptCallbacks: ((result: TranscriptResult) => void)[] = [];
  private errorCallbacks: ((error: Error) => void)[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private closed = false;

  constructor(
    private apiKey: string,
    private options: STTStreamOptions
  ) {
    // Process buffered audio every 500ms
    this.timer = setInterval(() => this.processBuffer(), 500);
  }

  send(audio: Buffer): void {
    if (!this.closed) {
      this.audioBuffer.push(audio);
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
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    // Process any remaining audio
    this.processBuffer();
  }

  private async processBuffer() {
    if (this.audioBuffer.length === 0) return;

    const chunks = this.audioBuffer.splice(0);
    const audioData = Buffer.concat(chunks);

    // Skip tiny buffers (less than 0.1s of audio at 8kHz mulaw)
    if (audioData.length < 800) return;

    try {
      const formData = new FormData();

      const blob = new Blob([audioData], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', this.options.language || 'en');
      formData.append('response_format', 'json');

      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Groq Whisper STT failed: ${response.status}`);
      }

      const data = (await response.json()) as { text: string };

      if (data.text?.trim()) {
        const result: TranscriptResult = {
          text: data.text.trim(),
          isFinal: true, // Groq Whisper always returns final results
          confidence: 0.85, // Groq doesn't return confidence, estimate
        };
        for (const cb of this.transcriptCallbacks) cb(result);
      }
    } catch (err) {
      for (const cb of this.errorCallbacks) cb(err as Error);
    }
  }
}
