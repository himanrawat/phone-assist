import type {
  LLMProvider,
  STTProvider,
  TTSProvider,
  TelephonyProvider,
} from '../../shared/types/providers.js';
import { providerConfigService } from './providers.service.js';
import { TwilioProvider } from './telephony/twilio.provider.js';
import { DeepgramProvider } from './stt/deepgram.provider.js';
import { GroqWhisperProvider } from './stt/groq-whisper.provider.js';
import { OpenAITranscribeProvider } from './stt/openai-transcribe.provider.js';
import { GroqOrpheusProvider } from './tts/groq-orpheus.provider.js';
import { OpenAITTSProvider } from './tts/openai-tts.provider.js';
import { GroqLLMProvider } from './llm/groq.provider.js';

const instances = {
  telephony: new Map<string, TelephonyProvider>(),
  stt: new Map<string, STTProvider>(),
  tts: new Map<string, TTSProvider>(),
  llm: new Map<string, LLMProvider>(),
};

function getTelephonyInstance(name: string) {
  if (!instances.telephony.has(name)) {
    instances.telephony.set(name, new TwilioProvider());
  }

  return instances.telephony.get(name)!;
}

function getSttInstance(name: string) {
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

function getTtsInstance(name: string) {
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

function getLlmInstance(name: string) {
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
  telephony(overrides?: TenantProviderOverrides) {
    const { telephony } = providerConfigService.getGlobalConfig();
    return getTelephonyInstance(overrides?.telephonyProvider || telephony);
  },

  stt(overrides?: TenantProviderOverrides) {
    const { stt } = providerConfigService.getGlobalConfig();
    return getSttInstance(overrides?.sttProvider || stt);
  },

  tts(nameOverride?: string | null) {
    const { tts } = providerConfigService.getGlobalConfig();
    return getTtsInstance(nameOverride || tts);
  },

  llm() {
    const { llm } = providerConfigService.getGlobalConfig();
    return getLlmInstance(llm);
  },
};
