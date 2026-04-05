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
  ArrowRightIcon,
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
      {/* Header */}
      <div>
        <p className="label-tech mb-2">Overview</p>
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        {tenant && (
          <p className="mt-1 text-sm font-light text-muted-foreground">
            Overview for {tenant.name}
          </p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Recent Calls" value={totalCalls} icon={PhoneCallIcon} />
        <StatCard title="Inbound" value={inboundCalls} icon={PhoneIncomingIcon} />
        <StatCard title="Outbound" value={outboundCalls} icon={PhoneOutgoingIcon} />
        <StatCard title="Avg Duration" value={formatDuration(avgDuration)} icon={ClockIcon} />
        <StatCard title="Positive Sentiment" value={positiveCount} icon={SmileIcon} />
        <StatCard title="AI Resolved" value={resolvedCount} icon={CheckCircleIcon} />
      </div>

      {/* Recent calls table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Calls</h2>
          <Link
            href="/app/calls"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-green transition-colors hover:text-brand-dark-green"
          >
            View all <ArrowRightIcon className="size-3" />
          </Link>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: "var(--shadow-subtle)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sentiment</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentCalls.map((call) => (
                <tr key={call.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                        call.direction === "inbound"
                          ? "text-info"
                          : "text-brand-green"
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
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {call.callerNumber}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
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
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
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
    <div
      className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-green/10">
          <Icon className="size-5 text-brand-green" />
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
  const styles: Record<string, string> = {
    completed: "bg-brand-green/10 text-brand-green",
    in_progress: "bg-info/10 text-info",
    ringing: "bg-warning/10 text-warning",
    failed: "bg-destructive/10 text-destructive",
    no_answer: "bg-muted text-muted-foreground",
    busy: "bg-warning/10 text-warning",
    voicemail: "bg-info/10 text-info",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}
    >
      <span className={`size-1.5 rounded-full ${
        status === "completed" ? "bg-brand-green" :
        status === "failed" ? "bg-destructive" :
        status === "ringing" || status === "busy" ? "bg-warning" :
        "bg-muted-foreground"
      }`} />
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

  const styles: Record<string, string> = {
    positive: "text-brand-green",
    neutral: "text-muted-foreground",
    negative: "text-destructive",
  };
  return (
    <span className={`text-xs font-medium ${styles[sentiment] ?? ""}`}>
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
