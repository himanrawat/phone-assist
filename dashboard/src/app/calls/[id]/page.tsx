"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCall, resolveApiUrl } from "@/lib/api";

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["call", id],
    queryFn: () => getCall(id),
  });

  if (isLoading) return <p className="text-gray-500">Loading call...</p>;
  if (error)
    return <p className="text-red-500">Failed to load call details.</p>;
  if (!data) return null;

  const call = data.data;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/calls"
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
        >
          Back to Call Logs
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Call Details</h1>
      </div>

      {/* Call metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <InfoCard label="Direction" value={call.direction} />
        <InfoCard label="Caller" value={call.callerNumber} />
        <InfoCard label="Status" value={call.status} />
        <InfoCard
          label="Duration"
          value={
            call.durationSec
              ? `${Math.floor(call.durationSec / 60)}:${(call.durationSec % 60).toString().padStart(2, "0")}`
              : "--"
          }
        />
        <InfoCard label="Provider" value={call.provider} />
        <InfoCard label="Sentiment" value={call.sentiment || "--"} />
        <InfoCard
          label="AI Resolved"
          value={call.aiResolved === null ? "--" : call.aiResolved ? "Yes" : "No"}
        />
        <InfoCard
          label="Time"
          value={new Date(call.startedAt).toLocaleString()}
        />
      </div>

      {/* Summary */}
      {call.summary && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
          <p className="text-gray-700">{call.summary}</p>
        </div>
      )}

      {/* Transcript / Messages */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Conversation
        </h2>
        {call.messages && call.messages.length > 0 ? (
          <div className="space-y-3">
            {call.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "assistant" ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.role === "assistant"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-blue-600 text-white"
                  }`}
                >
                  <p className="text-xs font-medium mb-1 opacity-70">
                    {msg.role === "assistant" ? "AI" : "Caller"}
                  </p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
          </div>
        ) : call.transcript ? (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
            {call.transcript}
          </pre>
        ) : (
          <p className="text-gray-400">No conversation data available.</p>
        )}
      </div>

      {/* Recording */}
      {call.recordingUrl && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Recording
          </h2>
          <audio controls className="w-full">
            <source src={resolveApiUrl(call.recordingUrl)} type="audio/wav" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
    </div>
  );
}

function InfoCard({
  label,
  value,
}: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-1">{value}</p>
    </div>
  );
}
