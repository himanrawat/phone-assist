"use client";

import { BoneyardDetailPageSkeleton } from "@/components/boneyard-skeletons";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformPlans, platformTenants } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { cloneElement, isValidElement, useEffect, useId, useState, type ReactNode } from "react";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data: tenantData, isLoading } = useQuery({
    queryKey: ["platform-tenant", id],
    queryFn: () => platformTenants.detail(id),
  });
  const { data: billingData } = useQuery({
    queryKey: ["platform-tenant-billing", id],
    queryFn: () => platformTenants.subscription(id),
  });
  const { data: languageData } = useQuery({
    queryKey: ["platform-tenant-languages", id],
    queryFn: () => platformTenants.languages(id),
  });
  const { data: plansData } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => platformPlans.list(),
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  const plans = plansData?.data ?? [];
  const tenant = tenantData?.data;
  const billing = billingData?.data;
  const availableLanguages = languageData?.data.planLanguagePool ?? [];
  const currentLanguages = languageData?.data.allowedLanguages ?? [];
  const maxSelectableLanguages =
    languageData?.data.maxSelectableLanguages
    ?? billing?.entitlements.maxSelectableLanguages
    ?? 1;
  const multilingualAvailable =
    languageData?.data.multilingualAvailable
    ?? billing?.entitlements.multilingualSupport
    ?? false;

  useEffect(() => {
    if (billing?.subscription.plan.id) {
      setSelectedPlanId(billing.subscription.plan.id);
    }
    if (currentLanguages.length > 0) {
      setSelectedLanguages(currentLanguages);
    }
  }, [billing?.subscription.plan.id, currentLanguages]);

  const subscriptionMutation = useMutation({
    mutationFn: () =>
      platformTenants.updateSubscription(id, {
        planId: selectedPlanId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-billing", id] });
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-languages", id] });
    },
  });

  const languageMutation = useMutation({
    mutationFn: () => platformTenants.updateLanguages(id, { languages: selectedLanguages }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-billing", id] });
      queryClient.invalidateQueries({ queryKey: ["platform-tenant-languages", id] });
    },
  });

  const adminMutation = useMutation({
    mutationFn: () => platformTenants.addAdmin(id, adminForm),
    onSuccess: () => {
      setAdminForm({ name: "", email: "", password: "" });
    },
  });

  if (isLoading) {
    return <BoneyardDetailPageSkeleton label="Tenant boneyard" />;
  }

  if (!tenant || !billing) {
    return <div className="py-12 text-center text-destructive">Tenant not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/platform/tenants")} className="rounded-md p-1.5 hover:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold">{tenant.name}</h1>
          <p className="text-sm text-muted-foreground">Tenant ID: {tenant.id}</p>
        </div>
      </div>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Subscription</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Plan" value={billing.subscription.plan.name} />
          <Stat label="Status" value={billing.subscription.status} />
          <Stat label="Used minutes" value={`${billing.usage.usedMinutes}`} />
          <Stat label="Remaining minutes" value={`${billing.usage.remainingMinutes}`} />
        </div>

        <div className="mt-6 flex flex-wrap items-end gap-4">
          <label htmlFor="tenant-assigned-plan" className="space-y-1">
            <span className="text-sm font-medium">Assigned plan</span>
            <Select
              id="tenant-assigned-plan"
              value={selectedPlanId || null}
              onValueChange={(value) => setSelectedPlanId(value ?? "")}
            >
              <SelectTrigger className="min-w-64">
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </label>
          <button
            onClick={() => subscriptionMutation.mutate()}
            disabled={subscriptionMutation.isPending || !selectedPlanId}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <SaveIcon className="size-4" />
            {subscriptionMutation.isPending ? "Updating..." : "Update plan"}
          </button>
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Language access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The plan defines the pool. Choose up to {maxSelectableLanguages} language{maxSelectableLanguages === 1 ? "" : "s"} for this tenant.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {availableLanguages.map((language) => (
            <label
              htmlFor={`tenant-language-${language}`}
              key={language}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                !selectedLanguages.includes(language) && selectedLanguages.length >= maxSelectableLanguages
                  ? "opacity-60"
                  : ""
              }`}
            >
              <Checkbox
                id={`tenant-language-${language}`}
                checked={selectedLanguages.includes(language)}
                disabled={
                  !selectedLanguages.includes(language)
                  && selectedLanguages.length >= maxSelectableLanguages
                }
                onCheckedChange={(checked) => {
                  setSelectedLanguages((current) => {
                    if (checked) {
                      return [...new Set([...current, language])];
                    }
                    return current.filter((value) => value !== language);
                  });
                }}
              />
              <span className="font-medium uppercase">{language}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => languageMutation.mutate()}
            disabled={languageMutation.isPending || selectedLanguages.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {languageMutation.isPending ? "Saving..." : "Save languages"}
          </button>
          {languageMutation.isError && (
            <span className="text-sm text-destructive">
              {languageMutation.error instanceof Error ? languageMutation.error.message : "Failed to save"}
            </span>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Tenant admins can use the selected languages in their assistant settings.
        </p>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Create Admin</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a tenant admin to this existing tenant. Separate platform accounts remain isolated from this portal.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              value={adminForm.name}
              onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))}
              className="input-field"
              placeholder="Admin name"
            />
          </Field>
          <Field label="Email">
            <input
              value={adminForm.email}
              onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
              className="input-field"
              type="email"
              placeholder="admin@example.com"
            />
          </Field>
          <Field label="Temporary password">
            <input
              value={adminForm.password}
              onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
              className="input-field"
              type="password"
              placeholder="Required for brand-new users"
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={() => adminMutation.mutate()}
            disabled={adminMutation.isPending || !adminForm.name || !adminForm.email}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {adminMutation.isPending ? "Creating..." : "Create admin"}
          </button>
          {adminMutation.isSuccess && <span className="text-sm text-green-600">Admin created.</span>}
          {adminMutation.isError && (
            <span className="text-sm text-destructive">
              {adminMutation.error instanceof Error ? adminMutation.error.message : "Failed to create admin"}
            </span>
          )}
        </div>
      </section>

      <section className="rounded-lg border p-6">
        <h2 className="font-heading text-lg font-semibold">Effective limits</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="Admin seats" value={`${billing.entitlements.maxAdminSeats}`} />
          <Stat label="Team members" value={`${billing.entitlements.maxTeamMembers}`} />
          <Stat label="Phone numbers" value={`${billing.entitlements.maxPhoneNumbers}`} />
          <Stat label="Concurrent calls" value={`${billing.entitlements.maxConcurrentCalls}`} />
          <Stat label="Selected languages" value={`${billing.entitlements.maxSelectableLanguages}`} />
          <Stat label="Outbound" value={billing.entitlements.outboundEnabled ? "Enabled" : "Blocked"} />
          <Stat label="Multilingual" value={multilingualAvailable ? "Enabled" : "Blocked"} />
          <Stat label="Overages" value={billing.entitlements.overageEnabled ? "Enabled" : "Blocked"} />
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  const fieldId = useId();
  const control = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id ?? fieldId })
    : children;

  return (
    <label htmlFor={fieldId} className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      {control}
    </label>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg bg-muted/40 p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium capitalize">{value}</p>
    </div>
  );
}
