"use client";

import { BoneyardTablePageSkeleton } from "@/components/boneyard-skeletons";
import { Checkbox as CheckboxControl } from "@/components/ui/checkbox";
import { platformPlans } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { PlusIcon, SaveIcon } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  monthlyPriceCents: 0,
  currency: "USD",
  trialDays: 14,
  isActive: true,
  isDefault: false,
  sortOrder: 0,
  entitlements: {
    maxAdminSeats: 1,
    maxTeamMembers: 3,
    maxPhoneNumbers: 1,
    includedMinutesPerPeriod: 250,
    maxConcurrentCalls: 1,
    maxSelectableLanguages: 2,
    planLanguagePool: ["en"],
    dataRetentionDays: 30,
    apiAccess: false,
    advancedAnalytics: false,
    auditLogs: false,
    outboundEnabled: false,
    multilingualSupport: false,
  },
};

export default function PlansPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-plans"],
    queryFn: () => platformPlans.list(),
  });
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const plans = data?.data ?? [];
  const editingPlan = useMemo(
    () => plans.find((plan) => plan.id === editingId) ?? null,
    [plans, editingId]
  );

  const createMutation = useMutation({
    mutationFn: () =>
      platformPlans.create({
        ...form,
        entitlements: {
          ...form.entitlements,
          planLanguagePool: form.entitlements.planLanguagePool,
        },
      }),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      platformPlans.update(editingId!, {
        ...form,
        entitlements: {
          ...form.entitlements,
          planLanguagePool: form.entitlements.planLanguagePool,
        },
      }),
    onSuccess: () => {
      setEditingId(null);
      setForm(EMPTY_FORM);
      queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
    },
  });

  if (isLoading) {
    return (
      <BoneyardTablePageSkeleton
        label="Plans boneyard"
        showAction
        columns={6}
        rows={4}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Plans</h1>
          <p className="text-sm text-muted-foreground">
            Manage plan catalog pricing and entitlement bundles.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setIsCreating(true);
          }}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" /> New plan
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Plan</th>
              <th className="px-4 py-3 text-left font-medium">Price</th>
              <th className="px-4 py-3 text-left font-medium">Limits</th>
              <th className="px-4 py-3 text-left font-medium">Languages</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.slug}</p>
                </td>
                <td className="px-4 py-3">
                  ${(plan.monthlyPriceCents / 100).toFixed(0)}/{plan.currency}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {plan.entitlements.maxTeamMembers} team / {plan.entitlements.maxPhoneNumbers} numbers /{" "}
                  {plan.entitlements.includedMinutesPerPeriod} min / {plan.entitlements.maxSelectableLanguages} languages
                </td>
                <td className="px-4 py-3 text-xs">
                  {plan.entitlements.planLanguagePool.join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      plan.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {plan.isDefault ? "Default / " : ""}
                    {plan.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => {
                      setEditingId(plan.id);
                      setIsCreating(false);
                      setForm({
                        name: plan.name,
                        slug: plan.slug,
                        description: plan.description ?? "",
                        monthlyPriceCents: plan.monthlyPriceCents,
                        currency: plan.currency,
                        trialDays: plan.trialDays,
                        isActive: plan.isActive,
                        isDefault: plan.isDefault,
                        sortOrder: plan.sortOrder,
                        entitlements: { ...plan.entitlements },
                      });
                    }}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(isCreating || editingPlan) && (
        <PlanEditor
          title={editingPlan ? `Edit ${editingPlan.name}` : "Create plan"}
          form={form}
          setForm={setForm}
          onCancel={() => {
            setIsCreating(false);
            setEditingId(null);
            setForm(EMPTY_FORM);
          }}
          onSubmit={() => {
            if (editingPlan) {
              updateMutation.mutate();
            } else {
              createMutation.mutate();
            }
          }}
          isSaving={createMutation.isPending || updateMutation.isPending}
          error={
            createMutation.error instanceof Error
              ? createMutation.error.message
              : updateMutation.error instanceof Error
                ? updateMutation.error.message
                : null
          }
        />
      )}
    </div>
  );
}

function PlanEditor({
  title,
  form,
  setForm,
  onCancel,
  onSubmit,
  isSaving,
  error,
}: {
  title: string;
  form: typeof EMPTY_FORM;
  setForm: Dispatch<SetStateAction<typeof EMPTY_FORM>>;
  onCancel: () => void;
  onSubmit: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  return (
    <section className="rounded-lg border p-6">
      <h2 className="font-heading text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Input label="Plan name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} />
        <Input label="Slug" value={form.slug} onChange={(value) => setForm((current) => ({ ...current, slug: value }))} />
        <Input
          label="Monthly price (cents)"
          value={String(form.monthlyPriceCents)}
          onChange={(value) => setForm((current) => ({ ...current, monthlyPriceCents: Number(value) || 0 }))}
        />
        <Input
          label="Trial days"
          value={String(form.trialDays)}
          onChange={(value) => setForm((current) => ({ ...current, trialDays: Number(value) || 0 }))}
        />
        <Input
          label="Max admins"
          value={String(form.entitlements.maxAdminSeats)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, maxAdminSeats: Number(value) || 1 },
            }))
          }
        />
        <Input
          label="Max team members"
          value={String(form.entitlements.maxTeamMembers)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, maxTeamMembers: Number(value) || 1 },
            }))
          }
        />
        <Input
          label="Max phone numbers"
          value={String(form.entitlements.maxPhoneNumbers)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, maxPhoneNumbers: Number(value) || 1 },
            }))
          }
        />
        <Input
          label="Included minutes"
          value={String(form.entitlements.includedMinutesPerPeriod)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, includedMinutesPerPeriod: Number(value) || 0 },
            }))
          }
        />
        <Input
          label="Concurrent calls"
          value={String(form.entitlements.maxConcurrentCalls)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, maxConcurrentCalls: Number(value) || 1 },
            }))
          }
        />
        <Input
          label="Max selectable languages"
          value={String(form.entitlements.maxSelectableLanguages)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, maxSelectableLanguages: Number(value) || 1 },
            }))
          }
        />
        <Input
          label="Retention days"
          value={String(form.entitlements.dataRetentionDays)}
          onChange={(value) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, dataRetentionDays: Number(value) || 30 },
            }))
          }
        />
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="plan-language-pool" className="text-sm font-medium">Plan language pool</label>
        <input
          id="plan-language-pool"
          value={form.entitlements.planLanguagePool.join(", ")}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              entitlements: {
                ...current.entitlements,
                planLanguagePool: event.target.value
                  .split(",")
                  .map((value) => value.trim())
                  .filter(Boolean),
              },
            }))
          }
          className="input-field"
          placeholder="en, es, fr"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PlanCheckbox
          label="Active"
          checked={form.isActive}
          onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
        />
        <PlanCheckbox
          label="Default plan"
          checked={form.isDefault}
          onChange={(checked) => setForm((current) => ({ ...current, isDefault: checked }))}
        />
        <PlanCheckbox
          label="API access"
          checked={form.entitlements.apiAccess}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, apiAccess: checked },
            }))
          }
        />
        <PlanCheckbox
          label="Advanced analytics"
          checked={form.entitlements.advancedAnalytics}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, advancedAnalytics: checked },
            }))
          }
        />
        <PlanCheckbox
          label="Audit logs"
          checked={form.entitlements.auditLogs}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, auditLogs: checked },
            }))
          }
        />
        <PlanCheckbox
          label="Outbound calling"
          checked={form.entitlements.outboundEnabled}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, outboundEnabled: checked },
            }))
          }
        />
        <PlanCheckbox
          label="Multilingual support"
          checked={form.entitlements.multilingualSupport}
          onChange={(checked) =>
            setForm((current) => ({
              ...current,
              entitlements: { ...current.entitlements, multilingualSupport: checked },
            }))
          }
        />
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <SaveIcon className="size-4" />
          {isSaving ? "Saving..." : "Save plan"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  const inputId = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={inputId} className="text-sm font-medium">{label}</label>
      <input id={inputId} value={value} onChange={(event) => onChange(event.target.value)} className="input-field" />
    </div>
  );
}

function PlanCheckbox({
  label,
  checked,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}>) {
  const inputId = useId();
  return (
    <label htmlFor={inputId} className="flex items-center gap-2 text-sm">
      <CheckboxControl id={inputId} checked={checked} onCheckedChange={onChange} />
      {label}
    </label>
  );
}
