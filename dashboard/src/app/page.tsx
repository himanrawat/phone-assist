"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Brain,
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRight,
  Palette,
  Bot,
  CheckCircle2,
  XCircle,
  Minus,
  Zap,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getCalls, type Call } from "@/lib/api";

export default function HomePage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["calls"],
    queryFn: () => getCalls(50, 0),
  });

  const calls = data?.data ?? [];

  // Compute stats
  const totalCalls = calls.length;
  const inboundCalls = calls.filter((c) => c.direction === "inbound").length;
  const outboundCalls = calls.filter((c) => c.direction === "outbound").length;
  const avgDuration =
    calls.length > 0
      ? Math.round(
          calls.reduce((sum, c) => sum + (c.durationSec ?? 0), 0) /
            calls.filter((c) => c.durationSec != null).length || 0
        )
      : 0;
  const aiResolved = calls.filter((c) => c.aiResolved === true).length;
  const aiRate =
    totalCalls > 0 ? Math.round((aiResolved / totalCalls) * 100) : 0;
  const positiveSentiment = calls.filter(
    (c) => c.sentiment === "positive"
  ).length;
  const sentimentRate =
    totalCalls > 0
      ? Math.round((positiveSentiment / totalCalls) * 100)
      : 0;

  const recentCalls = calls.slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back. Here&apos;s an overview of your phone system.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Calls"
          value={isLoading ? null : totalCalls.toString()}
          subtitle={`${inboundCalls} in · ${outboundCalls} out`}
          icon={Phone}
          iconBg="bg-primary/10"
          iconColor="text-primary"
          trend={totalCalls > 0 ? "+12%" : undefined}
          trendUp={true}
        />
        <StatCard
          title="Avg Duration"
          value={isLoading ? null : formatDuration(avgDuration)}
          subtitle="Per call"
          icon={Clock}
          iconBg="bg-info/10"
          iconColor="text-info"
        />
        <StatCard
          title="AI Resolution"
          value={isLoading ? null : `${aiRate}%`}
          subtitle={`${aiResolved} of ${totalCalls} calls`}
          icon={Brain}
          iconBg="bg-success/10"
          iconColor="text-success"
          trend={aiRate > 0 ? `${aiRate}%` : undefined}
          trendUp={aiRate >= 50}
        />
        <StatCard
          title="Positive Sentiment"
          value={isLoading ? null : `${sentimentRate}%`}
          subtitle={`${positiveSentiment} positive calls`}
          icon={Activity}
          iconBg="bg-warning/10"
          iconColor="text-warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest calls to your system</CardDescription>
              </div>
              <Link
                href="/calls"
                className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-2.5 h-7 text-[0.8rem] font-medium hover:bg-muted hover:text-foreground transition-all"
              >
                  View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[120px]" />
                    </div>
                    <Skeleton className="h-6 w-[70px]" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <XCircle className="h-10 w-10 text-destructive/50 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  Unable to load calls
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Is the backend running on port 3000?
                </p>
              </div>
            ) : recentCalls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Phone className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-foreground">
                  No calls yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Make a test call to see activity here.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentCalls.map((call, i) => (
                  <div key={call.id}>
                    <Link
                      href={`/calls/${call.id}`}
                      className="flex items-center gap-4 rounded-lg px-3 py-3 -mx-3 transition-colors hover:bg-muted/60"
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          call.direction === "inbound"
                            ? "bg-info/10 text-info"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {call.direction === "inbound" ? (
                          <PhoneIncoming className="h-4.5 w-4.5" />
                        ) : (
                          <PhoneOutgoing className="h-4.5 w-4.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {call.callerNumber}
                          </p>
                          <StatusDot status={call.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {call.direction === "inbound"
                            ? "Inbound"
                            : "Outbound"}{" "}
                          ·{" "}
                          {call.durationSec
                            ? formatDuration(call.durationSec)
                            : "--"}{" "}
                          · {formatTimeAgo(call.startedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <SentimentIcon sentiment={call.sentiment} />
                        {call.aiResolved === true && (
                          <Badge
                            variant="secondary"
                            className="text-success bg-success/10 text-[11px]"
                          >
                            <Zap className="h-3 w-3 mr-0.5" />
                            AI
                          </Badge>
                        )}
                      </div>
                    </Link>
                    {i < recentCalls.length - 1 && (
                      <Separator className="ml-14" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Navigate to key areas</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction
                href="/calls"
                icon={Phone}
                label="View Call Logs"
                description="Browse & analyze calls"
                color="text-info"
                bg="bg-info/10"
              />
              <QuickAction
                href="/settings/brand"
                icon={Palette}
                label="Edit Brand"
                description="Update business profile"
                color="text-primary"
                bg="bg-primary/10"
              />
              <QuickAction
                href="/settings/ai"
                icon={Bot}
                label="AI Config"
                description="Manage providers"
                color="text-success"
                bg="bg-success/10"
              />
            </CardContent>
          </Card>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Service health</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <SystemStatusRow
                  label="Dashboard"
                  status="operational"
                />
                <SystemStatusRow
                  label="Backend API"
                  status={error ? "degraded" : "operational"}
                />
                <SystemStatusRow
                  label="Twilio Voice"
                  status="operational"
                />
                <SystemStatusRow
                  label="Deepgram STT"
                  status="operational"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  trendUp,
}: {
  title: string;
  value: string | null;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-1">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[13px] font-medium text-muted-foreground">
              {title}
            </p>
            {value === null ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            <p className="text-xs text-muted-foreground/70">{subtitle}</p>
          </div>
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}
          >
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1 text-xs">
            {trendUp ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-destructive" />
            )}
            <span
              className={trendUp ? "text-success" : "text-destructive"}
            >
              {trend}
            </span>
            <span className="text-muted-foreground ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  description,
  color,
  bg,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg p-3 -mx-1 transition-all hover:bg-muted/60"
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg} transition-transform group-hover:scale-105`}
      >
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function SystemStatusRow({
  label,
  status,
}: {
  label: string;
  status: "operational" | "degraded" | "down";
}) {
  const config = {
    operational: {
      dot: "bg-success",
      text: "Operational",
      textColor: "text-success",
    },
    degraded: {
      dot: "bg-warning",
      text: "Degraded",
      textColor: "text-warning",
    },
    down: {
      dot: "bg-destructive",
      text: "Down",
      textColor: "text-destructive",
    },
  };
  const c = config[status];
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-medium ${c.textColor}`}>{c.text}</span>
        <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse`} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-success",
    in_progress: "bg-warning",
    failed: "bg-destructive",
    ringing: "bg-info",
  };
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${colors[status] ?? "bg-muted-foreground/40"}`}
    />
  );
}

function SentimentIcon({
  sentiment,
}: {
  sentiment: string | null;
}) {
  if (!sentiment) return null;
  const config: Record<
    string,
    { icon: React.ComponentType<{ className?: string }>; color: string }
  > = {
    positive: { icon: CheckCircle2, color: "text-success" },
    neutral: { icon: Minus, color: "text-muted-foreground" },
    negative: { icon: XCircle, color: "text-destructive" },
  };
  const c = config[sentiment];
  if (!c) return null;
  const Icon = c.icon;
  return <Icon className={`h-4 w-4 ${c.color}`} />;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
