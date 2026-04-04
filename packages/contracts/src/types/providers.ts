export interface GlobalProviderConfig {
  telephony: string;
  stt: string;
  tts: string;
  llm: string;
}

export interface ProviderConfigResponse {
  data: GlobalProviderConfig;
}

export interface ProviderConfigSaveResponse {
  success: true;
  data: GlobalProviderConfig;
}
