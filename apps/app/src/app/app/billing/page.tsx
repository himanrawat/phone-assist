"use client";

import { BoneyardDetailPageSkeleton } from "@/components/boneyard-skeletons";
import { adminBilling } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type ElementType } from "react";
import { CreditCardIcon, GlobeIcon, SparklesIcon } from "lucide-react";

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export default function BillingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-billing"],
    queryFn: () => adminBilling.get(),
  });
  const [message, setMessage] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminBilling.requestUpgrade({ message }),
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["admin-billing"] });
    },
  });

  if (isLoading) {
    return <BoneyardDetailPageSkeleton label="Billing boneyard" />;
  }

  const context = data?.data;
  if (!context) {
    return <div className="py-12 text-sm text-muted-foreground">No billing context available.</div>;
  }

  const usagePercent = context.entitlements.includedMinutesPerPeriod
    ? Math.min(
        (context.usage.usedMinutes / context.entitlements.includedMinutesPerPeriod) * 100,
        100
      )
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your current plan, purchased limits, and upgrade workflow.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-lg border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <h2 className="font-heading text-2xl font-bold">{context.subscription.plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {context.subscription.plan.description}
              </p>
            </div>
            <div className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              {formatCurrency(
                context.subscription.plan.monthlyPriceCents,
                context.subscription.plan.currency
              )}
              /mo
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              title="Admin seats"
              value={`${context.entitlements.maxAdminSeats}`}
              icon={CreditCardIcon}
            />
            <MetricCard
              title="Team members"
              value={`${context.entitlements.maxTeamMembers}`}
              icon={SparklesIcon}
            />
            <MetricCard
              title="Phone numbers"
              value={`${context.entitlements.maxPhoneNumbers}`}
              icon={CreditCardIcon}
            />
            <MetricCard
              title="Concurrent calls"
              value={`${context.entitlements.maxConcurrentCalls}`}
              icon={SparklesIcon}
            />
            <MetricCard
              title="Included minutes"
              value={`${context.entitlements.includedMinutesPerPeriod}`}
              icon={CreditCardIcon}
            />
            <MetricCard
              title="Selectable languages"
              value={`${context.entitlements.maxSelectableLanguages}`}
              icon={GlobeIcon}
            />
            <MetricCard
              title="Retention"
              value={`${context.entitlements.dataRetentionDays} days`}
              icon={SparklesIcon}
            />
            <MetricCard
              title="Multilingual support"
              value={context.entitlements.multilingualSupport ? "Enabled" : "Blocked"}
              icon={GlobeIcon}
            />
          </div>
        </section>

        <section className="rounded-lg border p-6">
          <p className="text-sm text-muted-foreground">Language Access</p>
          <h2 className="mt-1 font-heading text-lg font-semibold">Allowed languages</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {context.allowedLanguages.map((language) => (
              <span
                key={language}
                className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium uppercase tracking-wide"
              >
                <GlobeIcon className="mr-1 size-3" />
                {language}
              </span>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            You can choose up to {context.entitlements.maxSelectableLanguages} language{context.entitlements.maxSelectableLanguages === 1 ? "" : "s"} from your plan in Assistant Settings.
          </p>
        </section>
      </div>

      <section className="rounded-lg border p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Current period usage</h2>
            <p className="text-sm text-muted-foreground">
              {context.usage.usedMinutes} of {context.entitlements.includedMinutesPerPeriod} minutes used
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="font-medium">{context.usage.remainingMinutes} minutes remaining</p>
            <p className="text-muted-foreground">
              Ends {new Date(context.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Request an upgrade</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Billing is manual in this v1 release. Send the platform team the limits you want changed.
        </p>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className="mt-4 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Example: Need 2 more admin seats, 2 more phone numbers, and outbound calling."
        />
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? "Sending..." : "Send upgrade request"}
          </button>
          {mutation.isSuccess && (
            <span className="text-sm text-green-600">Upgrade request sent.</span>
          )}
          {mutation.isError && (
            <span className="text-sm text-destructive">
              {mutation.error instanceof Error ? mutation.error.message : "Request failed"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-background text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="text-sm font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}
