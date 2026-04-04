const DEFAULT_PRIMARY_LANGUAGE = 'en';
const LANGUAGE_PLACEHOLDERS = new Set(['', 'auto', 'multi', 'mul', 'und']);

export interface CallLanguageState {
  primaryLanguage?: string | null;
  multilingualEnabled?: boolean;
  activeLanguage?: string | null;
}

export function normalizeLanguageTag(value?: string | null): string {
  const trimmed = value?.trim().replace(/_/g, '-');

  if (!trimmed) {
    return DEFAULT_PRIMARY_LANGUAGE;
  }

  try {
    return Intl.getCanonicalLocales(trimmed)[0] || DEFAULT_PRIMARY_LANGUAGE;
  } catch {
    return trimmed.toLowerCase() || DEFAULT_PRIMARY_LANGUAGE;
  }
}

export function resolveSttLanguage(options: {
  primaryLanguage?: string | null;
  multilingualEnabled?: boolean;
  providerName?: string | null;
}): string | undefined {
  if (options.multilingualEnabled) {
    return options.providerName === 'deepgram' ? 'multi' : undefined;
  }

  return normalizeLanguageTag(options.primaryLanguage);
}

export function resolveActiveCallLanguage(
  state: CallLanguageState & { detectedLanguage?: string | null }
): string {
  const primaryLanguage = normalizeLanguageTag(state.primaryLanguage);

  if (!state.multilingualEnabled) {
    return primaryLanguage;
  }

  return normalizeDetectedLanguage(state.detectedLanguage)
    || normalizeDetectedLanguage(state.activeLanguage)
    || primaryLanguage;
}

export function buildTurnLanguagePrompt(
  state: CallLanguageState & { detectedLanguage?: string | null }
): string {
  const primaryLanguage = normalizeLanguageTag(state.primaryLanguage);

  if (!state.multilingualEnabled) {
    return `Always reply in ${primaryLanguage}. If the caller speaks another language, politely explain that you can continue in ${primaryLanguage}.`;
  }

  const detectedLanguage = normalizeDetectedLanguage(state.detectedLanguage);
  if (detectedLanguage) {
    return `The caller is currently speaking ${detectedLanguage}. Reply in ${detectedLanguage}. If they clearly switch languages or ask for another language, follow their lead and stay consistent.`;
  }

  const activeLanguage = normalizeDetectedLanguage(state.activeLanguage);
  if (activeLanguage && activeLanguage !== primaryLanguage) {
    return `The active language for this call is ${activeLanguage}. Reply in ${activeLanguage} unless the caller clearly switches languages.`;
  }

  return `The primary language for this call is ${primaryLanguage}. If the caller speaks or requests another language, reply in that same language and keep using it until they switch again.`;
}

export function shouldUseOpenAITts(state: CallLanguageState): boolean {
  const activeLanguage = resolveActiveCallLanguage(state);
  return Boolean(state.multilingualEnabled) || !isEnglishLanguage(activeLanguage);
}

function isEnglishLanguage(value?: string | null) {
  const normalized = normalizeLanguageTag(value).toLowerCase();
  return normalized === 'en' || normalized.startsWith('en-');
}

function normalizeDetectedLanguage(value?: string | null): string | null {
  const trimmed = value?.trim().replace(/_/g, '-').toLowerCase();

  if (!trimmed || LANGUAGE_PLACEHOLDERS.has(trimmed)) {
    return null;
  }

  return normalizeLanguageTag(trimmed);
}
