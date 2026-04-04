"use client";

import { BoneyardFormPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { platformProviders } from "@/lib/api";
import { useState, useEffect } from "react";
import { SaveIcon, ServerIcon } from "lucide-react";

const PROVIDER_OPTIONS = {
  telephony: ["twilio"],
  stt: ["deepgram", "groq", "openai"],
  tts: ["groq", "openai", "deepgram"],
  llm: ["groq", "openai"],
};

export default function ProvidersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-providers"],
    queryFn: () => platformProviders.get(),
  });

  const [form, setForm] = useState({
    telephonyProvider: "twilio",
    sttProvider: "deepgram",
    ttsProvider: "groq",
  });

  useEffect(() => {
    if (data?.data) {
      setForm({
        telephonyProvider: data.data.telephony ?? "twilio",
        sttProvider: data.data.stt ?? "deepgram",
        ttsProvider: data.data.tts ?? "groq",
      });
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => platformProviders.update(form),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform-providers"] }),
  });

  if (isLoading) {
    return <BoneyardFormPageSkeleton label="Providers boneyard" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Providers</h1>
        <p className="text-sm text-muted-foreground">
          Configure global provider defaults for the platform
        </p>
      </div>

      <div className="max-w-lg space-y-6 rounded-lg border p-6">
        <ProviderSelect
          label="Telephony Provider"
          value={form.telephonyProvider}
          options={PROVIDER_OPTIONS.telephony}
          onChange={(v) => setForm({ ...form, telephonyProvider: v })}
          icon={ServerIcon}
        />
        <ProviderSelect
          label="Speech-to-Text (STT) Provider"
          value={form.sttProvider}
          options={PROVIDER_OPTIONS.stt}
          onChange={(v) => setForm({ ...form, sttProvider: v })}
          icon={ServerIcon}
        />
        <ProviderSelect
          label="Text-to-Speech (TTS) Provider"
          value={form.ttsProvider}
          options={PROVIDER_OPTIONS.tts}
          onChange={(v) => setForm({ ...form, ttsProvider: v })}
          icon={ServerIcon}
        />

        {data?.data?.llm && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm font-medium">LLM Provider</p>
            <p className="text-sm text-muted-foreground">
              Current: <span className="font-mono">{data.data.llm}</span>
            </p>
          </div>
        )}

        <div className="flex items-center gap-4 border-t pt-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon className="size-4" />
            {mutation.isPending ? "Saving..." : "Save Changes"}
          </button>
          {mutation.isSuccess && <span className="text-sm text-green-600">Saved</span>}
          {mutation.isError && <span className="text-sm text-destructive">Save failed</span>}
        </div>
      </div>
    </div>
  );
}

function ProviderSelect({
  label,
  value,
  options,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-field">
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
