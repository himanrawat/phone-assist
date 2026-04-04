"use client";

import { BoneyardTablePageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery } from "@tanstack/react-query";
import { calls as callsApi } from "@/lib/api";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";

const PAGE_SIZE = 20;

export default function CallsPage() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["calls", offset],
    queryFn: () => callsApi.list(PAGE_SIZE, offset),
  });

  const callsList = data?.data ?? [];

  if (isLoading) {
    return (
      <BoneyardTablePageSkeleton
        label="Calls boneyard"
        columns={8}
        rows={6}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Call Logs</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all incoming and outgoing calls
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Direction</th>
              <th className="px-4 py-3 text-left font-medium">Caller</th>
              <th className="px-4 py-3 text-left font-medium">Dialed</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Duration</th>
              <th className="px-4 py-3 text-left font-medium">Sentiment</th>
              <th className="px-4 py-3 text-left font-medium">AI Resolved</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {callsList.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No calls found
                </td>
              </tr>
            )}
            {callsList.map((call) => (
              <tr
                key={call.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  router.push(`/admin/calls/${call.id}`);
                }}
              >
                <td className="px-4 py-3">
                  <DirectionBadge direction={call.direction} />
                </td>
                <td className="px-4 py-3 font-mono text-xs">{call.callerNumber}</td>
                <td className="px-4 py-3 font-mono text-xs">{call.dialedNumber}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(call.status)}`}
                  >
                    {call.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">{formatDuration(call.durationSec)}</td>
                <td className="px-4 py-3">
                  <SentimentValue sentiment={call.sentiment} />
                </td>
                <td className="px-4 py-3">
                  <AiResolvedValue aiResolved={call.aiResolved} />
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(call.startedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {offset + 1}–{offset + callsList.length}
        </p>
        <div className="flex gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            <ChevronLeftIcon className="size-4" /> Previous
          </button>
          <button
            disabled={callsList.length < PAGE_SIZE}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm disabled:opacity-50"
          >
            Next <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    ringing: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    no_answer: "bg-gray-100 text-gray-700",
    busy: "bg-orange-100 text-orange-700",
    voicemail: "bg-purple-100 text-purple-700",
  };
  return map[status] ?? "bg-gray-100 text-gray-700";
}

function DirectionBadge({ direction }: Readonly<{ direction: string }>) {
  const isInbound = direction === "inbound";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isInbound ? "text-blue-600" : "text-green-600"
      }`}
    >
      {isInbound ? (
        <PhoneIncomingIcon className="size-3" />
      ) : (
        <PhoneOutgoingIcon className="size-3" />
      )}
      {direction}
    </span>
  );
}

function SentimentValue({
  sentiment,
}: Readonly<{ sentiment: string | null }>) {
  if (sentiment == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <span className={`text-xs font-medium ${sentimentTextColor(sentiment)}`}>
      {sentiment}
    </span>
  );
}

function AiResolvedValue({
  aiResolved,
}: Readonly<{ aiResolved: boolean | null }>) {
  if (aiResolved == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <span
      className={`text-xs font-medium ${aiResolved ? "text-green-600" : "text-orange-600"}`}
    >
      {aiResolved ? "Yes" : "No"}
    </span>
  );
}

function formatDuration(durationSec: number | null) {
  if (durationSec == null) {
    return "—";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = (durationSec % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function sentimentTextColor(sentiment: string) {
  const colors: Record<string, string> = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-muted-foreground",
  };

  return colors[sentiment] ?? "text-muted-foreground";
}
