import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  APP_URL: z.string().default('http://localhost:3001'),
  WEB_URL: z.string().default('http://localhost:3003'),
  SESSION_COOKIE_NAME: z.string().default('phone_assistant_session'),
  SESSION_COOKIE_SECRET: z.string().min(16).default('dev-session-secret-change-me'),
  SESSION_COOKIE_DOMAIN: z.string().optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(7),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_PHONE_NUMBER: z.string().default(''),

  GROQ_API_KEY: z.string().default(''),
  OPENAI_API_KEY: z.string().default(''),
  DEEPGRAM_API_KEY: z.string().default(''),

  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('phone-assistant-recordings'),
  R2_ENDPOINT: z.string().default(''),

  TELEPHONY_PROVIDER: z.enum(['twilio']).default('twilio'),
  STT_PROVIDER: z.enum(['deepgram', 'groq', 'openai']).default('deepgram'),
  TTS_PROVIDER: z.enum(['groq', 'openai']).default('groq'),
  LLM_PROVIDER: z.enum(['groq']).default('groq'),
});

export const env = envSchema.parse(process.env);
export type Env = z.infer<typeof envSchema>;

export const allowedOrigins = Array.from(
  new Set([env.APP_URL, env.WEB_URL].filter(Boolean))
);
