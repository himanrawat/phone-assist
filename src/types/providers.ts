/**
 * Provider abstraction interfaces.
 * All external voice/telephony services implement these interfaces.
 * Super Admin can swap providers per tenant or globally via config.
 */

// ─── Telephony Provider ───

export interface TelephonyProvider {
  readonly name: 'twilio';

  /** Generate TwiML/XML response for incoming call */
  generateCallResponse(options: CallResponseOptions): string;

  /** Initiate an outbound call */
  makeCall(options: OutboundCallOptions): Promise<string>; // returns call SID

  /** Send SMS */
  sendSms(options: SmsOptions): Promise<void>;

  /** Validate incoming webhook signature */
  validateWebhook(request: WebhookValidationRequest): boolean;

  /** Get the WebSocket stream URL for real-time audio */
  getMediaStreamConfig(): MediaStreamConfig;
}

export interface CallResponseOptions {
  greeting?: string;
  streamUrl: string; // WebSocket URL for audio streaming
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
  /** Event name for receiving audio data */
  audioEvent: string;
  /** Audio encoding format */
  encoding: 'mulaw' | 'linear16';
  /** Sample rate in Hz */
  sampleRate: number;
}

// ─── STT Provider ───

export interface STTProvider {
  readonly name: 'deepgram' | 'groq';

  /** Open a streaming STT session */
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
  /** Send raw audio chunk */
  send(audio: Buffer): void;

  /** Register callback for transcription results */
  onTranscript(callback: (result: TranscriptResult) => void): void;

  /** Register callback for errors */
  onError(callback: (error: Error) => void): void;

  /** Close the stream */
  close(): void;
}

export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
  language?: string;
}

// ─── TTS Provider ───

export interface TTSProvider {
  readonly name: 'groq';

  /** Convert text to audio */
  synthesize(options: TTSOptions): Promise<Buffer>;

  /** Stream text to audio (for lower latency) */
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

// ─── LLM Provider ───

export interface LLMProvider {
  readonly name: 'groq';

  /** Generate a response */
  chat(options: LLMChatOptions): Promise<LLMResponse>;

  /** Stream a response */
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
