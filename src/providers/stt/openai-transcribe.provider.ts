import type {
  STTProvider,
  STTStream,
  STTStreamOptions,
} from '../../types/providers.js';
import { env } from '../../config/env.js';
import { ChunkedUploadSTTStream } from './chunked-upload-stream.js';

const DEFAULT_OPENAI_STT_MODEL = 'gpt-4o-mini-transcribe';

export class OpenAITranscribeProvider implements STTProvider {
  readonly name = 'openai' as const;

  createStream(options: STTStreamOptions = {}): STTStream {
    return new ChunkedUploadSTTStream(options, {
      placeholderInterimText: '[speech]',
      upload: async (audioWaveFile, streamOptions) => {
        const formData = new FormData();

        formData.append('file', new Blob([audioWaveFile], { type: 'audio/wav' }), 'audio.wav');
        formData.append('model', streamOptions.model || DEFAULT_OPENAI_STT_MODEL);
        formData.append('response_format', 'text');

        if (streamOptions.language) {
          formData.append('language', streamOptions.language);
        }

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`OpenAI STT failed: ${response.status} ${await response.text()}`);
        }

        return {
          text: await response.text(),
          confidence: 0.9,
          language: streamOptions.language,
        };
      },
    });
  }
}
