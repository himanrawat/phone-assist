import type {
  TelephonyProvider,
  STTProvider,
  TTSProvider,
  LLMProvider,
} from '../types/providers.js';
import { providerConfigService } from '../services/provider/provider-config.service.js';

// Provider implementations
import { TwilioProvider } from './telephony/twilio.provider.js';
import { DeepgramProvider } from './stt/deepgram.provider.js';
import { GroqWhisperProvider } from './stt/groq-whisper.provider.js';
import { OpenAITranscribeProvider } from './stt/openai-transcribe.provider.js';
import { GroqOrpheusProvider } from './tts/groq-orpheus.provider.js';
import { OpenAITTSProvider } from './tts/openai-tts.provider.js';
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
      case 'openai':
        instances.stt.set(name, new OpenAITranscribeProvider());
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
      case 'openai':
        instances.tts.set(name, new OpenAITTSProvider());
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
  telephony(overrides?: TenantProviderOverrides): TelephonyProvider {
    const { telephony } = providerConfigService.getGlobalConfig();
    const name = overrides?.telephonyProvider || telephony;
    return getTelephonyInstance(name);
  },

  /** Get STT provider for a tenant */
  stt(overrides?: TenantProviderOverrides): STTProvider {
    const { stt } = providerConfigService.getGlobalConfig();
    const name = overrides?.sttProvider || stt;
    return getSTTInstance(name);
  },

  /** Get TTS provider */
  tts(nameOverride?: string | null): TTSProvider {
    const { tts } = providerConfigService.getGlobalConfig();
    return getTTSInstance(nameOverride || tts);
  },

  /** Get LLM provider (currently only Groq) */
  llm(): LLMProvider {
    const { llm } = providerConfigService.getGlobalConfig();
    return getLLMInstance(llm);
  },
};
