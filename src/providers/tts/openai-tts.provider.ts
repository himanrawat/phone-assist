import type { TTSOptions, TTSProvider } from '../../types/providers.js';
import { env } from '../../config/env.js';

const DEFAULT_OPENAI_TTS_MODEL = 'gpt-4o-mini-tts';
const DEFAULT_OPENAI_VOICE = 'marin';
const OPENAI_VOICES = new Set([
  'alloy',
  'ash',
  'ballad',
  'cedar',
  'coral',
  'echo',
  'fable',
  'marin',
  'nova',
  'onyx',
  'sage',
  'shimmer',
  'verse',
]);

const OPENAI_VOICE_ALIASES: Record<string, string> = {
  'arista-playai': 'marin',
  autumn: 'coral',
  austin: 'ash',
  daniel: 'cedar',
  diana: 'sage',
  hannah: 'marin',
  tara: 'marin',
  troy: 'onyx',
};

export class OpenAITTSProvider implements TTSProvider {
  readonly name = 'openai' as const;

  async synthesize(options: TTSOptions): Promise<Buffer> {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_OPENAI_TTS_MODEL,
        input: options.text,
        voice: normalizeOpenAIVoice(options.voice),
        language: options.language,
        response_format: options.responseFormat || 'wav',
        instructions: buildSpeechInstructions(options),
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS failed: ${response.status} ${await response.text()}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }

  async *synthesizeStream(options: TTSOptions): AsyncGenerator<Buffer> {
    yield await this.synthesize(options);
  }
}

function normalizeOpenAIVoice(voice?: string): string {
  const normalizedVoice = voice?.trim().toLowerCase();

  if (!normalizedVoice) {
    return DEFAULT_OPENAI_VOICE;
  }

  if (OPENAI_VOICES.has(normalizedVoice)) {
    return normalizedVoice;
  }

  return OPENAI_VOICE_ALIASES[normalizedVoice] || DEFAULT_OPENAI_VOICE;
}

function buildSpeechInstructions(options: TTSOptions): string {
  const instructions = [
    'Speak clearly and naturally for a phone call.',
  ];

  if (options.language) {
    instructions.push(`Respond in ${options.language}.`);
  }

  if (typeof options.speed === 'number') {
    if (options.speed < 1) {
      instructions.push('Use a slightly slower speaking pace.');
    } else if (options.speed > 1) {
      instructions.push('Use a slightly faster speaking pace.');
    }
  }

  return instructions.join(' ');
}
