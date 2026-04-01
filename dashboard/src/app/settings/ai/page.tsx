"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getProviders, updateProviders } from "@/lib/api";
import { useState } from "react";

export default function AIConfigPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: getProviders,
  });

  const mutation = useMutation({
    mutationFn: updateProviders,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
  });

  const [stt, setStt] = useState<string>("");

  // Sync state when data loads
  const currentStt = stt || data?.data?.stt || "deepgram";

  function handleSave() {
    mutation.mutate({
      telephonyProvider: "twilio",
      sttProvider: currentStt,
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        AI & Provider Configuration
      </h1>

      {isLoading && <p className="text-gray-500">Loading config...</p>}

      <div className="space-y-6 max-w-xl">
        {/* Telephony Provider */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Telephony
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            The app is now wired for Twilio only. Use your public backend URL here,
            not the dashboard URL.
          </p>
          <div className="rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
            <p className="font-medium text-gray-900">Twilio Voice</p>
            <p className="text-xs text-gray-500 mt-1">
              A call comes in: <code>https://&lt;public-url&gt;/webhooks/twilio/voice</code> via HTTP POST
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Call status changes: <code>https://&lt;public-url&gt;/webhooks/twilio/status</code> via HTTP POST
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Messaging webhook is not implemented yet, so you can leave the SMS section alone for now.
            </p>
          </div>
        </div>

        {/* STT Provider */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Speech-to-Text Provider
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Converts caller speech to text. Affects latency and accuracy.
          </p>
          <div className="flex gap-4">
            <ProviderOption
              name="Deepgram Nova-3"
              description="True real-time streaming, 6.8% WER"
              cost="~$193/10k calls"
              selected={currentStt === "deepgram"}
              onSelect={() => setStt("deepgram")}
            />
            <ProviderOption
              name="Groq Whisper"
              description="Chunk-based, +200ms latency, 8.4% WER"
              cost="~$17/10k calls"
              selected={currentStt === "groq"}
              onSelect={() => setStt("groq")}
            />
          </div>
        </div>

        {/* TTS & LLM (fixed for now) */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            TTS & LLM
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Currently fixed to Groq for both. More options in future phases.
          </p>
          <div className="flex gap-4">
            <div className="flex-1 rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
              <p className="font-medium text-gray-900">Groq Orpheus TTS</p>
              <p className="text-xs text-gray-500 mt-1">~$70/10k calls</p>
            </div>
            <div className="flex-1 rounded-lg border-2 border-blue-500 bg-blue-50 p-4">
              <p className="font-medium text-gray-900">Groq LLaMA 70B</p>
              <p className="text-xs text-gray-500 mt-1">~$130/10k calls</p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "Saving..." : "Save Provider Configuration"}
        </button>

        {mutation.isSuccess && (
          <p className="text-green-600 text-sm">
            Configuration saved successfully.
          </p>
        )}
        {mutation.isError && (
          <p className="text-red-600 text-sm">
            Failed to save. Is the backend running?
          </p>
        )}
      </div>
    </div>
  );
}

function ProviderOption({
  name,
  description,
  cost,
  selected,
  onSelect,
}: Readonly<{
  name: string;
  description: string;
  cost: string;
  selected: boolean;
  onSelect: () => void;
}>) {
  return (
    <button
      onClick={onSelect}
      className={`flex-1 rounded-lg border-2 p-4 text-left transition-colors ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <p className="font-medium text-gray-900">{name}</p>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
      <p className="text-xs text-gray-400 mt-2">{cost}</p>
    </button>
  );
}
