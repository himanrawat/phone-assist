/**
 * Provider abstraction interfaces.
 * All external voice/telephony services implement these interfaces.
 */

export interface TelephonyProvider {
  readonly name: 'twilio';
  generateCallResponse(options: CallResponseOptions): string;
  makeCall(options: OutboundCallOptions): Promise<string>;
  sendSms(options: SmsOptions): Promise<void>;
  validateWebhook(request: WebhookValidationRequest): boolean;
  getMediaStreamConfig(): MediaStreamConfig;
}

export interface CallResponseOptions {
  greeting?: string;
  streamUrl: string;
  record?: boolean;
  recordingStatusCallback?: string;
}

export interface OutboundCallOptions {
  to: string;
  from: string;
  streamUrl: string;
  statusCallback?: string;
}

export interface SmsOptions {
  to: string;
  from: string;
  body: string;
}

export interface WebhookValidationRequest {
  url: string;
  params: Record<string, string>;
  signature: string;
}

export interface MediaStreamConfig {
  audioEvent: string;
  encoding: 'mulaw' | 'linear16';
  sampleRate: number;
}

export interface STTProvider {
  readonly name: 'deepgram' | 'groq' | 'openai';
  createStream(options: STTStreamOptions): STTStream;
}

export interface STTStreamOptions {
  language?: string;
  model?: string;
  sampleRate?: number;
  encoding?: string;
  endpointingMs?: number;
}

export interface STTStream {
  send(audio: Buffer): void;
  onTranscript(callback: (result: TranscriptResult) => void): void;
  onError(callback: (error: Error) => void): void;
  close(): void;
}

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  language?: string;
}

export interface TTSProvider {
  readonly name: 'groq' | 'openai';
  synthesize(options: TTSOptions): Promise<Buffer>;
  synthesizeStream(options: TTSOptions): AsyncGenerator<Buffer>;
}

export interface TTSOptions {
  text: string;
  voice?: string;
  language?: string;
  speed?: number;
  responseFormat?: 'wav' | 'mulaw';
  sampleRate?: number;
}

export interface LLMProvider {
  readonly name: 'groq';
  chat(options: LLMChatOptions): Promise<LLMResponse>;
  chatStream(options: LLMChatOptions): AsyncGenerator<LLMChunk>;
}

export interface LLMChatOptions {
  messages: LLMMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed: { prompt: number; completion: number };
}

export interface LLMChunk {
  content: string;
  done: boolean;
}
