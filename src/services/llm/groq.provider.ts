import type {
  LLMProvider,
  LLMChatOptions,
  LLMResponse,
  LLMChunk,
} from '../../types/providers.js';
import { env } from '../../config/env.js';

export class GroqLLMProvider implements LLMProvider {
  readonly name = 'groq' as const;

  private get apiKey() { return env.GROQ_API_KEY; }

  async chat(options: LLMChatOptions): Promise<LLMResponse> {
    const body = {
      model: options.model || 'llama-3.3-70b-versatile',
      messages: options.messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
      stream: false,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq LLM failed: ${error}`);
    }

    const data = (await response.json()) as {
      choices: [{ message: { content: string } }];
      usage: { prompt_tokens: number; completion_tokens: number };
    };

    return {
      content: data.choices[0].message.content,
      tokensUsed: {
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
      },
    };
  }

  async *chatStream(options: LLMChatOptions): AsyncGenerator<LLMChunk> {
    const body = {
      model: options.model || 'llama-3.3-70b-versatile',
      messages: options.messages,
      max_tokens: options.maxTokens || 512,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq LLM stream failed: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { content: '', done: true };
          return;
        }

        try {
          const parsed = JSON.parse(data) as {
            choices: [{ delta: { content?: string }; finish_reason: string | null }];
          };
          const delta = parsed.choices[0]?.delta?.content || '';
          const finished = parsed.choices[0]?.finish_reason !== null;

          if (delta) {
            yield { content: delta, done: finished };
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }
}
