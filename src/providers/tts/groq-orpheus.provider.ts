import type { TTSProvider, TTSOptions } from '../../types/providers.js';
import { env } from '../../config/env.js';

export class GroqOrpheusProvider implements TTSProvider {
  readonly name = 'groq' as const;

  private get apiKey() { return env.GROQ_API_KEY; }

  async synthesize(options: TTSOptions): Promise<Buffer> {
    const body = {
      model: 'playai-tts',
      input: options.text,
      voice: options.voice || 'Arista-PlayAI',
      response_format: 'wav',
      speed: options.speed || 1.0,
    };

    const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq TTS failed: ${error}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async *synthesizeStream(options: TTSOptions): AsyncGenerator<Buffer> {
    // Groq TTS doesn't support true streaming yet.
    // We fetch the full audio and yield it as a single chunk.
    // When streaming becomes available, this will yield incremental chunks.
    const audio = await this.synthesize(options);
    yield audio;
  }
}
