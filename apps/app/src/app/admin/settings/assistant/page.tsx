"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { assistant as assistantApi } from "@/lib/api";
import { useState, useEffect } from "react";
import { SaveIcon } from "lucide-react";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "nl", label: "Dutch" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

export default function AssistantSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["assistant"],
    queryFn: () => assistantApi.get(),
  });

  const [primaryLanguage, setPrimaryLanguage] = useState("en");
  const [multilingualEnabled, setMultilingualEnabled] = useState(false);

  useEffect(() => {
    if (data?.data) {
      const d = data.data as { primaryLanguage: string; multilingualEnabled: boolean };
      setPrimaryLanguage(d.primaryLanguage ?? "en");
      setMultilingualEnabled(d.multilingualEnabled ?? false);
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () =>
      assistantApi.update({ primaryLanguage, multilingualEnabled }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["assistant"] }),
  });

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
          <label className="text-sm font-medium">Primary Language</label>
          <select
            value={primaryLanguage}
            onChange={(e) => setPrimaryLanguage(e.target.value)}
            className="input-field"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            The main language your assistant will communicate in
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium">Multilingual Support</label>
            <p className="text-xs text-muted-foreground">
              Allow the assistant to respond in the caller&apos;s language
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={multilingualEnabled}
            onClick={() => setMultilingualEnabled(!multilingualEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              multilingualEnabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`inline-block size-4 transform rounded-full bg-white transition-transform ${
                multilingualEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        <div className="flex items-center gap-4 border-t pt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon className="size-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {mutation.isSuccess && (
            <span className="text-sm text-green-600">Saved</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-destructive">Save failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
