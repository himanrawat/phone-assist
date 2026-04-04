"use client";

import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { calls as callsApi } from "@/lib/api";
import Link from "next/link";
import {
  PhoneCallIcon,
  PhoneIncomingIcon,
  PhoneOutgoingIcon,
  ClockIcon,
  SmileIcon,
  CheckCircleIcon,
} from "lucide-react";

export default function AdminDashboard() {
  const { tenant } = useAuth();
  const { data: callsData } = useQuery({
    queryKey: ["calls", "recent"],
    queryFn: () => callsApi.list(10, 0),
  });

  const recentCalls = callsData?.data ?? [];
  const totalCalls = recentCalls.length;
  const inboundCalls = recentCalls.filter((c) => c.direction === "inbound").length;
  const outboundCalls = recentCalls.filter((c) => c.direction === "outbound").length;
  const avgDuration =
    recentCalls.length > 0
      ? Math.round(
          recentCalls.reduce((s, c) => s + (c.durationSec ?? 0), 0) /
            recentCalls.length
        )
      : 0;
  const positiveCount = recentCalls.filter((c) => c.sentiment === "positive").length;
  const resolvedCount = recentCalls.filter((c) => c.aiResolved === true).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        {tenant && (
          <p className="text-sm text-muted-foreground">
            Overview for {tenant.name}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Recent Calls"
          value={totalCalls}
          icon={PhoneCallIcon}
        />
        <StatCard
          title="Inbound"
          value={inboundCalls}
          icon={PhoneIncomingIcon}
        />
        <StatCard
          title="Outbound"
          value={outboundCalls}
          icon={PhoneOutgoingIcon}
        />
        <StatCard
          title="Avg Duration"
          value={formatDuration(avgDuration)}
          icon={ClockIcon}
        />
        <StatCard
          title="Positive Sentiment"
          value={positiveCount}
          icon={SmileIcon}
        />
        <StatCard
          title="AI Resolved"
          value={resolvedCount}
          icon={CheckCircleIcon}
        />
      </div>

      {/* Recent calls table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Calls</h2>
          <Link
            href="/admin/calls"
            className="text-sm text-primary hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Direction</th>
                <th className="px-4 py-3 text-left font-medium">From</th>
                <th className="px-4 py-3 text-left font-medium">To</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Sentiment</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => (
                <tr key={call.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        call.direction === "inbound"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    >
                      {call.direction === "inbound" ? (
                        <PhoneIncomingIcon className="size-3" />
                      ) : (
                        <PhoneOutgoingIcon className="size-3" />
                      )}
                      {call.direction}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {call.callerNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {call.dialedNumber}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={call.status} />
                  </td>
                  <td className="px-4 py-3 text-xs">{formatDuration(call.durationSec)}</td>
                  <td className="px-4 py-3">
                    <SentimentBadge sentiment={call.sentiment} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(call.startedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentCalls.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    No calls yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
}: Readonly<{
  title: string;
  value: string | number;
  icon: React.ElementType;
}>) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-heading text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: Readonly<{ status: string }>) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    in_progress: "bg-blue-100 text-blue-700",
    ringing: "bg-yellow-100 text-yellow-700",
    failed: "bg-red-100 text-red-700",
    no_answer: "bg-gray-100 text-gray-700",
    busy: "bg-orange-100 text-orange-700",
    voicemail: "bg-purple-100 text-purple-700",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function SentimentBadge({
  sentiment,
}: Readonly<{ sentiment: string | null }>) {
  if (sentiment == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const colors: Record<string, string> = {
    positive: "text-green-600",
    neutral: "text-muted-foreground",
    negative: "text-red-600",
  };
  return (
    <span className={`text-xs font-medium ${colors[sentiment] ?? ""}`}>
      {sentiment}
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
