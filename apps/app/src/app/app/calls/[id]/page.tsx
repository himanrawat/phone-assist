"use client";

import { BoneyardDetailPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery } from "@tanstack/react-query";
import { calls as callsApi } from "@/lib/api";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  UserIcon,
  BotIcon,
} from "lucide-react";

const EMPTY_CAPTIONS_TRACK = "data:text/vtt;charset=utf-8,WEBVTT%0A%0A";

export default function CallDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["call", id],
    queryFn: () => callsApi.detail(id),
  });

  if (isLoading) {
    return <BoneyardDetailPageSkeleton label="Call boneyard" />;
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center">
        <p className="text-destructive">Failed to load call details</p>
        <Link href="/app/calls" className="mt-2 text-sm text-primary hover:underline">
          Back to calls
        </Link>
      </div>
    );
  }

  const call = data.data;
  const hasSummary = Boolean(call.summary);
  const hasMessages = (call.messages?.length ?? 0) > 0;
  const showSummaryPlaceholder = call.status === "completed" && !hasSummary;
  const showRawTranscript = Boolean(call.transcript) && !hasMessages;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/app/calls"
          className="rounded-md p-1.5 hover:bg-muted"
        >
          <ArrowLeftIcon className="size-5" />
        </Link>
        <div>
          <h1 className="font-heading text-2xl font-bold">Call Detail</h1>
          <p className="text-sm text-muted-foreground">
            {formatDirectionLabel(call.direction)} call on{" "}
            {new Date(call.startedAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Call metadata */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetaCard label="Direction">
          <DirectionBadge direction={call.direction} iconSize="size-4" />
        </MetaCard>
        <MetaCard label="Status">
          <span className="capitalize">{call.status.replace("_", " ")}</span>
        </MetaCard>
        <MetaCard label="Duration">{formatDuration(call.durationSec)}</MetaCard>
        <MetaCard label="Sentiment">
          <SentimentStatus sentiment={call.sentiment} />
        </MetaCard>
        <MetaCard label="Caller">{call.callerNumber}</MetaCard>
        <MetaCard label="Dialed">{call.dialedNumber}</MetaCard>
        <MetaCard label="AI Resolved">{formatAiResolved(call.aiResolved)}</MetaCard>
        <MetaCard label="Provider">{call.provider}</MetaCard>
      </div>

      {/* Recording */}
      {call.recordingUrl && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-3 font-heading text-lg font-semibold">Recording</h2>
          <audio controls className="w-full" src={`/api/v1/calls/${call.id}/recording`}>
            <track
              kind="captions"
              src={EMPTY_CAPTIONS_TRACK}
              srcLang="en"
              label="English captions"
              default
            />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Summary */}
      {hasSummary && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-heading text-lg font-semibold">Summary</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {call.summary}
          </p>
        </div>
      )}
      {showSummaryPlaceholder && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          Summary is being processed...
        </div>
      )}

      {/* Transcript */}
      {hasMessages && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 font-heading text-lg font-semibold">Conversation</h2>
          <div className="space-y-3">
            {call.messages?.map((msg) => <ConversationMessage key={msg.id} message={msg} />)}
          </div>
        </div>
      )}

      {/* Raw transcript */}
      {showRawTranscript && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-heading text-lg font-semibold">Transcript</h2>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
            {call.transcript}
          </pre>
        </div>
      )}
    </div>
  );
}

function MetaCard({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}

function DirectionBadge({
  direction,
  iconSize,
}: Readonly<{ direction: string; iconSize: string }>) {
  const isInbound = direction === "inbound";

  return (
    <span
      className={`inline-flex items-center gap-1 ${isInbound ? "text-blue-600" : "text-green-600"}`}
    >
      {isInbound ? (
        <PhoneIncomingIcon className={iconSize} />
      ) : (
        <PhoneOutgoingIcon className={iconSize} />
      )}
      {direction}
    </span>
  );
}

function SentimentStatus({
  sentiment,
}: Readonly<{ sentiment: string | null }>) {
  if (sentiment == null) {
    return <span className="text-muted-foreground">Processing...</span>;
  }

  return (
    <span className={`capitalize ${sentimentTextColor(sentiment)}`}>
      {sentiment}
    </span>
  );
}

function ConversationMessage({
  message,
}: Readonly<{
  message: {
    id: string;
    role: string;
    content: string;
  };
}>) {
  const isAssistant = message.role === "assistant";

  return (
    <div className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}>
      <div
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          isAssistant
            ? "bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {isAssistant ? (
          <BotIcon className="size-4" />
        ) : (
          <UserIcon className="size-4" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2.5 text-sm ${
          isAssistant ? "bg-muted" : "bg-primary text-primary-foreground"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function formatDirectionLabel(direction: string) {
  return direction === "inbound" ? "Inbound" : "Outbound";
}

function formatDuration(durationSec: number | null) {
  if (durationSec == null) {
    return "—";
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = (durationSec % 60).toString().padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatAiResolved(aiResolved: boolean | null) {
  if (aiResolved === true) {
    return "Yes";
  }

  if (aiResolved === false) {
    return "No";
  }

  return "Processing...";
}

function sentimentTextColor(sentiment: string) {
  const colors: Record<string, string> = {
    positive: "text-green-600",
    negative: "text-red-600",
  };

  return colors[sentiment] ?? "";
}
