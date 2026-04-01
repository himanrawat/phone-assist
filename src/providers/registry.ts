import type {
  TelephonyProvider,
  STTProvider,
  TTSProvider,
  LLMProvider,
} from '../types/providers.js';
import { env } from '../config/env.js';

// Provider implementations
import { TwilioProvider } from './telephony/twilio.provider.js';
import { DeepgramProvider } from './stt/deepgram.provider.js';
import { GroqWhisperProvider } from './stt/groq-whisper.provider.js';
import { GroqOrpheusProvider } from './tts/groq-orpheus.provider.js';
import { GroqLLMProvider } from '../services/llm/groq.provider.js';

/**
 * Provider Registry — the central place to get provider instances.
 *
 * Resolves which provider to use based on:
 * 1. Tenant-level override (if set)
 * 2. Global default from env/DB config
 *
 * Super Admin changes provider config → this registry returns the new provider.
 */

// Singleton instances (lazy-initialized)
const instances = {
  telephony: new Map<string, TelephonyProvider>(),
  stt: new Map<string, STTProvider>(),
  tts: new Map<string, TTSProvider>(),
  llm: new Map<string, LLMProvider>(),
};

function getTelephonyInstance(name: string): TelephonyProvider {
  if (!instances.telephony.has(name)) {
    instances.telephony.set(name, new TwilioProvider());
  }
  return instances.telephony.get(name)!;
}

function getSTTInstance(name: string): STTProvider {
  if (!instances.stt.has(name)) {
    switch (name) {
      case 'deepgram':
        instances.stt.set(name, new DeepgramProvider());
        break;
      case 'groq':
        instances.stt.set(name, new GroqWhisperProvider());
        break;
      default:
        throw new Error(`Unknown STT provider: ${name}`);
    }
  }
  return instances.stt.get(name)!;
}

function getTTSInstance(name: string): TTSProvider {
  if (!instances.tts.has(name)) {
    switch (name) {
      case 'groq':
        instances.tts.set(name, new GroqOrpheusProvider());
        break;
      default:
        throw new Error(`Unknown TTS provider: ${name}`);
    }
  }
  return instances.tts.get(name)!;
}

function getLLMInstance(name: string): LLMProvider {
  if (!instances.llm.has(name)) {
    switch (name) {
      case 'groq':
        instances.llm.set(name, new GroqLLMProvider());
        break;
      default:
        throw new Error(`Unknown LLM provider: ${name}`);
    }
  }
  return instances.llm.get(name)!;
}

export interface TenantProviderOverrides {
  telephonyProvider?: string | null;
  sttProvider?: string | null;
}

export const providerRegistry = {
  /** Get telephony provider for a tenant (falls back to global default) */
  telephony(_overrides?: TenantProviderOverrides): TelephonyProvider {
    return getTelephonyInstance(env.TELEPHONY_PROVIDER);
  },

  /** Get STT provider for a tenant */
  stt(overrides?: TenantProviderOverrides): STTProvider {
    const name = overrides?.sttProvider || env.STT_PROVIDER;
    return getSTTInstance(name);
  },

  /** Get TTS provider (currently only Groq Orpheus) */
  tts(): TTSProvider {
    return getTTSInstance(env.TTS_PROVIDER);
  },

  /** Get LLM provider (currently only Groq) */
  llm(): LLMProvider {
    return getLLMInstance(env.LLM_PROVIDER);
  },
};
