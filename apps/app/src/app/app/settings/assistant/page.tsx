"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assistant as assistantApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { AlertCircleIcon, SaveIcon } from "lucide-react";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  nl: "Dutch",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  hi: "Hindi",
};

export default function AssistantSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["assistant"],
    queryFn: () => assistantApi.get(),
  });

  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [multilingualEnabled, setMultilingualEnabled] = useState(false);
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(["en"]);
  const [planLanguagePool, setPlanLanguagePool] = useState<string[]>(["en"]);
  const [maxSelectableLanguages, setMaxSelectableLanguages] = useState(1);
  const [multilingualAvailable, setMultilingualAvailable] = useState(false);

  useEffect(() => {
    if (data) {
      const d = data.data as
        | { primaryLanguage: string; multilingualEnabled: boolean }
        | null;
      const languages = data.allowedLanguages?.length
        ? data.allowedLanguages
        : ["en"];
      const selectableLanguages = data.planLanguagePool?.length
        ? data.planLanguagePool
        : languages;
      setAllowedLanguages(languages);
      setPlanLanguagePool(selectableLanguages);
      setMaxSelectableLanguages(data.maxSelectableLanguages ?? 1);
      setPrimaryLanguage(d?.primaryLanguage ?? languages[0] ?? "en");
      setMultilingualAvailable(data.multilingualAvailable ?? false);
      setMultilingualEnabled(
        (data.multilingualAvailable ?? false) && (d?.multilingualEnabled ?? false)
      );
    }
  }, [data]);

  useEffect(() => {
    if (allowedLanguages.length === 0) {
      return;
    }

    if (!allowedLanguages.includes(primaryLanguage)) {
      setPrimaryLanguage(allowedLanguages[0] ?? "en");
    }
  }, [allowedLanguages, primaryLanguage]);

  useEffect(() => {
    if (!multilingualAvailable && multilingualEnabled) {
      setMultilingualEnabled(false);
    }
  }, [multilingualAvailable, multilingualEnabled]);

  const mutation = useMutation({
    mutationFn: () =>
      assistantApi.update({
        primaryLanguage,
        multilingualEnabled,
        allowedLanguages,
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["assistant"] }),
  });

  function toggleLanguageSelection(language: string, checked: boolean) {
    setAllowedLanguages((current) => {
      if (checked) {
        if (current.includes(language) || current.length >= maxSelectableLanguages) {
          return current;
        }

        return [...current, language];
      }

      return current.filter((value) => value !== language);
    });
  }

  if (isLoading) {
    return <BoneyardFormPageSkeleton label="Assistant boneyard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">AI Assistant Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure language settings for your AI phone assistant
        </p>
      </div>

      <div className="max-w-lg space-y-6 rounded-lg border p-6">
        <div className="space-y-2">
          <div>
            <h2 className="text-sm font-medium">Supported Languages</h2>
            <p className="text-xs text-muted-foreground">
              Choose up to {maxSelectableLanguages} language{maxSelectableLanguages === 1 ? "" : "s"} from your plan.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {planLanguagePool.map((language) => {
              const checked = allowedLanguages.includes(language);
              const selectionLimitReached =
                !checked && allowedLanguages.length >= maxSelectableLanguages;

              return (
                <label
                  key={language}
                  htmlFor={`assistant-language-${language}`}
                  className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                    selectionLimitReached ? "opacity-60" : ""
                  }`}
                >
                  <Checkbox
                    id={`assistant-language-${language}`}
                    checked={checked}
                    disabled={selectionLimitReached}
                    onCheckedChange={(nextChecked) => toggleLanguageSelection(language, nextChecked)}
                  />
                  <span className="font-medium">
                    {LANGUAGE_LABELS[language] ?? language}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            The assistant can only use the languages selected here.
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="assistant-primary-language" className="text-sm font-medium">Primary Language</label>
          <Select
            id="assistant-primary-language"
            value={primaryLanguage}
            onValueChange={(value) => setPrimaryLanguage(value ?? allowedLanguages[0] ?? "en")}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {allowedLanguages.map((language) => (
                  <SelectItem key={language} value={language}>
                    {LANGUAGE_LABELS[language] ?? language}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The assistant starts in this language before it switches to another selected language.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label htmlFor="assistant-multilingual-toggle" className="text-sm font-medium">Multilingual Support</label>
            <p className="text-xs text-muted-foreground">
              Allow the assistant to respond in the caller&apos;s language
            </p>
          </div>
          <Switch
            id="assistant-multilingual-toggle"
            checked={multilingualEnabled}
            disabled={!multilingualAvailable}
            onCheckedChange={setMultilingualEnabled}
          />
        </div>
        {!multilingualAvailable && (
          <Alert>
            <AlertCircleIcon />
            <AlertDescription>
              Your super admin has not enabled this feature for the current plan.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center gap-4 border-t pt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || allowedLanguages.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon className="size-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {mutation.isSuccess && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Save failed"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
