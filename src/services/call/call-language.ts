const DEFAULT_PRIMARY_LANGUAGE = 'en';
const LANGUAGE_PLACEHOLDERS = new Set(['', 'auto', 'multi', 'mul', 'und']);

export interface CallLanguageState {
  primaryLanguage?: string | null;
  multilingualEnabled?: boolean;
  allowedLanguages?: string[] | null;
  activeLanguage?: string | null;
}

function normalizeAllowedLanguages(
  languages: string[] | null | undefined,
  primaryLanguage: string
) {
  const normalized = Array.from(
    new Set(
      (languages ?? [])
        .map((language) => normalizeLanguageTag(language))
        .filter(Boolean)
    )
  );

  if (normalized.length === 0) {
    return [primaryLanguage];
  }

  return normalized;
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
  allowedLanguages?: string[] | null;
  providerName?: string | null;
}): string | undefined {
  const primaryLanguage = normalizeLanguageTag(options.primaryLanguage);
  const allowedLanguages = normalizeAllowedLanguages(options.allowedLanguages, primaryLanguage);

  if (options.multilingualEnabled && allowedLanguages.length > 1) {
    return options.providerName === 'deepgram' ? 'multi' : undefined;
  }

  return primaryLanguage;
}

export function resolveActiveCallLanguage(
  state: CallLanguageState & { detectedLanguage?: string | null }
): string {
  const primaryLanguage = normalizeLanguageTag(state.primaryLanguage);
  const allowedLanguages = normalizeAllowedLanguages(state.allowedLanguages, primaryLanguage);

  if (!state.multilingualEnabled) {
    return primaryLanguage;
  }

  const detectedLanguage = normalizeDetectedLanguage(state.detectedLanguage);
  if (detectedLanguage && allowedLanguages.includes(detectedLanguage)) {
    return detectedLanguage;
  }

  const activeLanguage = normalizeDetectedLanguage(state.activeLanguage);
  if (activeLanguage && allowedLanguages.includes(activeLanguage)) {
    return activeLanguage;
  }

  return primaryLanguage;
}

export function buildTurnLanguagePrompt(
  state: CallLanguageState & { detectedLanguage?: string | null }
): string {
  const primaryLanguage = normalizeLanguageTag(state.primaryLanguage);
  const allowedLanguages = normalizeAllowedLanguages(state.allowedLanguages, primaryLanguage);
  const supportedLanguageList = allowedLanguages.join(', ');

  if (!state.multilingualEnabled) {
    return `Always reply in ${primaryLanguage}. If the caller speaks another language, politely explain that you can continue in ${primaryLanguage}.`;
  }

  const detectedLanguage = normalizeDetectedLanguage(state.detectedLanguage);
  if (detectedLanguage && allowedLanguages.includes(detectedLanguage)) {
    return `The caller is currently speaking ${detectedLanguage}. Reply in ${detectedLanguage}. If they clearly switch languages or ask for another language, follow their lead and stay consistent.`;
  }

  if (detectedLanguage) {
    return `The caller is currently speaking ${detectedLanguage}, but this tenant supports only ${supportedLanguageList}. Reply in ${primaryLanguage} and politely explain the currently supported languages if needed.`;
  }

  const activeLanguage = normalizeDetectedLanguage(state.activeLanguage);
  if (activeLanguage && activeLanguage !== primaryLanguage && allowedLanguages.includes(activeLanguage)) {
    return `The active language for this call is ${activeLanguage}. Reply in ${activeLanguage} unless the caller clearly switches languages.`;
  }

  return `The primary language for this call is ${primaryLanguage}. Supported languages for this tenant are ${supportedLanguageList}. If the caller speaks or requests one of those supported languages, reply in it and keep using it until they switch again. Otherwise, continue in ${primaryLanguage}.`;
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
