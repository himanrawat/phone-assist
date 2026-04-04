import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Twilio
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),

  // Groq
  GROQ_API_KEY: z.string().default(''),

  // OpenAI
  OPENAI_API_KEY: z.string().default(''),

  // Deepgram
  DEEPGRAM_API_KEY: z.string().default(''),

  // Cloudflare R2
  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('phone-assistant-recordings'),
  R2_ENDPOINT: z.string().default(''),

  // Active providers
  TELEPHONY_PROVIDER: z.enum(['twilio']).default('twilio'),
  STT_PROVIDER: z.enum(['deepgram', 'groq', 'openai']).default('deepgram'),
  TTS_PROVIDER: z.enum(['groq', 'openai']).default('groq'),
  LLM_PROVIDER: z.enum(['groq']).default('groq'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;
