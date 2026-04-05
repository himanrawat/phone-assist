"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMutation, useQuery } from "@tanstack/react-query";
import { platformPlans, platformTenants } from "@/lib/api";
import { useRouter } from "next/navigation";
import { cloneElement, isValidElement, useId, useState, type ReactNode } from "react";
import { ArrowLeftIcon } from "lucide-react";

const DEFAULT_PLAN_ITEM_VALUE = "__default_plan__";

export default function CreateTenantPage() {
  const router = useRouter();
  const { data: plansData } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => platformPlans.list(),
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    industry: "",
    timezone: "America/New_York",
    planId: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      platformTenants.create({
        name: form.name,
        slug: form.slug,
        industry: form.industry || undefined,
        timezone: form.timezone,
        planId: form.planId || undefined,
        admin: {
          name: form.adminName,
          email: form.adminEmail,
          password: form.adminPassword || undefined,
        },
      }),
    onSuccess: (data) => {
      router.push(`/platform/tenants/${data.data.id}`);
    },
  });

  const plans = plansData?.data ?? [];

  function handleSlugify(name: string) {
    setForm((current) => ({
      ...current,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/platform/tenants")} className="rounded-md p-1.5 hover:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Create Tenant</h1>
          <p className="text-sm text-muted-foreground">
            Create the tenant, assign its plan, and provision the first admin.
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="space-y-6"
      >
        <section className="max-w-3xl space-y-4 rounded-lg border p-6">
          <h2 className="font-heading text-lg font-semibold">Tenant</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant name">
              <input
                value={form.name}
                onChange={(e) => handleSlugify(e.target.value)}
                className="input-field"
                placeholder="Acme Corp"
                required
              />
            </Field>
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => setForm((current) => ({ ...current, slug: e.target.value }))}
                className="input-field font-mono"
                placeholder="acme-corp"
                required
              />
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                onChange={(e) => setForm((current) => ({ ...current, industry: e.target.value }))}
                className="input-field"
                placeholder="Healthcare, Real Estate, etc."
              />
            </Field>
            <Field label="Timezone">
              <input
                value={form.timezone}
                onChange={(e) => setForm((current) => ({ ...current, timezone: e.target.value }))}
                className="input-field"
                placeholder="America/New_York"
                required
              />
            </Field>
            <Field label="Plan">
              <Select
                value={form.planId || DEFAULT_PLAN_ITEM_VALUE}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    planId: value === DEFAULT_PLAN_ITEM_VALUE ? "" : value ?? "",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Default plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={DEFAULT_PLAN_ITEM_VALUE}>Default plan</SelectItem>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </section>

        <section className="max-w-3xl space-y-4 rounded-lg border p-6">
          <h2 className="font-heading text-lg font-semibold">First Admin</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input
                value={form.adminName}
                onChange={(e) => setForm((current) => ({ ...current, adminName: e.target.value }))}
                className="input-field"
                placeholder="Owner Name"
                required
              />
            </Field>
            <Field label="Email">
              <input
                value={form.adminEmail}
                onChange={(e) => setForm((current) => ({ ...current, adminEmail: e.target.value }))}
                type="email"
                className="input-field"
                placeholder="owner@example.com"
                required
              />
            </Field>
            <Field label="Temporary password">
              <input
                value={form.adminPassword}
                onChange={(e) => setForm((current) => ({ ...current, adminPassword: e.target.value }))}
                type="password"
                className="input-field"
                placeholder="Required for new users"
              />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">
            If the email already belongs to a tenant-only user, the password is ignored and the user is added as an admin.
          </p>
        </section>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Failed to create tenant"}
          </p>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/platform/tenants")} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? "Creating..." : "Create tenant and admin"}
          </button>
        </div>
      </form>
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
