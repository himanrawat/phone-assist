"use client";

import { BoneyardDetailPageSkeleton } from "@/components/boneyard-skeletons";
import { adminBilling } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import type { ElementType } from "react";
import { Clock3Icon, PhoneCallIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";

export default function UsagePage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-usage"],
    queryFn: () => adminBilling.usage(),
  });

  if (isLoading) {
    return <BoneyardDetailPageSkeleton label="Usage boneyard" />;
  }

  if (!data) {
    return <div className="py-12 text-sm text-muted-foreground">No usage data available.</div>;
  }

  const { data: usage, subscription, entitlements } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Usage</h1>
        <p className="text-sm text-muted-foreground">
          Current-period usage for your active subscription.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <UsageCard title="Completed calls" value={`${usage.totalCalls}`} icon={PhoneCallIcon} />
        <UsageCard title="Used minutes" value={`${usage.usedMinutes}`} icon={Clock3Icon} />
        <UsageCard title="Remaining minutes" value={`${usage.remainingMinutes}`} icon={ZapIcon} />
        <UsageCard title="Concurrent limit" value={`${entitlements.maxConcurrentCalls}`} icon={ShieldCheckIcon} />
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Plan enforcement summary</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SummaryRow label="Plan" value={subscription.plan.name} />
          <SummaryRow label="Status" value={subscription.status} />
          <SummaryRow
            label="Period"
            value={`${new Date(usage.periodStart).toLocaleDateString()} - ${new Date(
              usage.periodEnd
            ).toLocaleDateString()}`}
          />
          <SummaryRow label="Phone number limit" value={`${entitlements.maxPhoneNumbers}`} />
          <SummaryRow label="Admin seat limit" value={`${entitlements.maxAdminSeats}`} />
          <SummaryRow label="Overages" value={entitlements.overageEnabled ? "Enabled" : "Blocked"} />
          <SummaryRow label="Outbound calling" value={entitlements.outboundEnabled ? "Enabled" : "Blocked"} />
          <SummaryRow label="Audit logs" value={entitlements.auditLogs ? "Included" : "Not included"} />
          <SummaryRow
            label="Advanced analytics"
            value={entitlements.advancedAnalytics ? "Included" : "Not included"}
          />
        </div>
      </section>
    </div>
  );
}

function UsageCard({
  title,
  value,
  icon: Icon,
}: Readonly<{
  title: string;
  value: string;
  icon: ElementType;
}>) {
  return (
    <div className="rounded-lg border bg-card p-5">
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

function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
