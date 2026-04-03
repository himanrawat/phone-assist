import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { providerConfig } from '../../db/schema.js';

type TelephonyProviderName = 'twilio';
type SttProviderName = 'deepgram' | 'groq';
type TtsProviderName = 'groq';
type LlmProviderName = 'groq';

export interface GlobalProviderConfig {
  telephony: TelephonyProviderName;
  stt: SttProviderName;
  tts: TtsProviderName;
  llm: LlmProviderName;
}

const DEFAULT_GLOBAL_PROVIDER_CONFIG: GlobalProviderConfig = {
  telephony: env.TELEPHONY_PROVIDER,
  stt: env.STT_PROVIDER,
  tts: env.TTS_PROVIDER,
  llm: env.LLM_PROVIDER,
};

function sanitizeTelephonyProvider(value: string | undefined): TelephonyProviderName {
  return value === 'twilio' ? value : DEFAULT_GLOBAL_PROVIDER_CONFIG.telephony;
}

function sanitizeSttProvider(value: string | undefined): SttProviderName {
  return value === 'groq' || value === 'deepgram'
    ? value
    : DEFAULT_GLOBAL_PROVIDER_CONFIG.stt;
}

function sanitizeTtsProvider(value: string | undefined): TtsProviderName {
  return value === 'groq' ? value : DEFAULT_GLOBAL_PROVIDER_CONFIG.tts;
}

function sanitizeLlmProvider(value: string | undefined): LlmProviderName {
  return value === 'groq' ? value : DEFAULT_GLOBAL_PROVIDER_CONFIG.llm;
}

function mapRowsToGlobalConfig(
  rows: Array<{ key: string; provider: string }>
): GlobalProviderConfig {
  const config = { ...DEFAULT_GLOBAL_PROVIDER_CONFIG };

  for (const row of rows) {
    switch (row.key) {
      case 'telephony':
        config.telephony = sanitizeTelephonyProvider(row.provider);
        break;
      case 'stt':
        config.stt = sanitizeSttProvider(row.provider);
        break;
      case 'tts':
        config.tts = sanitizeTtsProvider(row.provider);
        break;
      case 'llm':
        config.llm = sanitizeLlmProvider(row.provider);
        break;
      default:
        break;
    }
  }

  return config;
}

class ProviderConfigService {
  private cache: GlobalProviderConfig = { ...DEFAULT_GLOBAL_PROVIDER_CONFIG };

  async load() {
    const rows = await db.select().from(providerConfig);
    this.cache = mapRowsToGlobalConfig(rows);
    return this.getGlobalConfig();
  }

  getGlobalConfig(): GlobalProviderConfig {
    return { ...this.cache };
  }

  async updateGlobalConfig(update: {
    telephonyProvider?: TelephonyProviderName;
    sttProvider?: SttProviderName;
  }) {
    const writes: Promise<unknown>[] = [];

    if (update.telephonyProvider) {
      writes.push(
        db
          .insert(providerConfig)
          .values({ key: 'telephony', provider: update.telephonyProvider })
          .onConflictDoUpdate({
            target: providerConfig.key,
            set: { provider: update.telephonyProvider, updatedAt: new Date() },
          })
      );
    }

    if (update.sttProvider) {
      writes.push(
        db
          .insert(providerConfig)
          .values({ key: 'stt', provider: update.sttProvider })
          .onConflictDoUpdate({
            target: providerConfig.key,
            set: { provider: update.sttProvider, updatedAt: new Date() },
          })
      );
    }

    await Promise.all(writes);

    this.cache = {
      ...this.cache,
      telephony: update.telephonyProvider ?? this.cache.telephony,
      stt: update.sttProvider ?? this.cache.stt,
    };

    return this.getGlobalConfig();
  }
}

export const providerConfigService = new ProviderConfigService();
