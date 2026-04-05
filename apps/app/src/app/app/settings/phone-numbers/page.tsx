"use client";

import { BoneyardCardGridSkeleton } from "@/components/boneyard-skeletons";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { phoneNumbers as numbersApi } from "@/lib/api";
import { useState } from "react";
import { PlusIcon, XIcon, PhoneIcon } from "lucide-react";

interface PhoneNumber {
  number: string;
  provider: string;
  providerSid: string;
  forwardingNumber: string;
  isActive: boolean;
}

export default function PhoneNumbersPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["phone-numbers"],
    queryFn: () => numbersApi.list(),
  });

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PhoneNumber>({
    number: "",
    provider: "twilio",
    providerSid: "",
    forwardingNumber: "",
    isActive: true,
  });

  const upsertMutation = useMutation({
    mutationFn: () => numbersApi.upsert({ ...form }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-numbers"] });
      setShowForm(false);
      setForm({ number: "", provider: "twilio", providerSid: "", forwardingNumber: "", isActive: true });
    },
  });

  const numbers = (data?.data ?? []) as Array<PhoneNumber & { id?: string }>;

  if (isLoading) {
    return <BoneyardCardGridSkeleton label="Numbers boneyard" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Phone Numbers</h1>
          <p className="text-sm text-muted-foreground">
            Manage your tenant&apos;s phone numbers
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" /> Add Number
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {numbers.map((num) => (
          <div key={num.id ?? num.number} className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PhoneIcon className="size-5" />
              </div>
              <div>
                <p className="font-mono text-sm font-medium">{num.number}</p>
                <p className="text-xs text-muted-foreground">{num.provider}</p>
              </div>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {num.providerSid && <p>SID: {num.providerSid}</p>}
              {num.forwardingNumber && <p>Forward to: {num.forwardingNumber}</p>}
            </div>
            <div className="mt-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  num.isActive
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {num.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        ))}
        {numbers.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            No phone numbers configured
          </div>
        )}
      </div>

      {/* Upsert Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-lg font-semibold">Add / Update Phone Number</h2>
              <button type="button" onClick={() => setShowForm(false)} className="rounded p-1 hover:bg-muted"><XIcon className="size-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); upsertMutation.mutate(); }} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="tenant-phone-number" className="text-sm font-medium">Phone Number <span className="text-destructive">*</span></label>
                <input id="tenant-phone-number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className="input-field" placeholder="+15555550100" required />
              </div>
              <div className="space-y-1">
                <label htmlFor="tenant-provider-sid" className="text-sm font-medium">Provider SID</label>
                <input id="tenant-provider-sid" value={form.providerSid} onChange={(e) => setForm({ ...form, providerSid: e.target.value })} className="input-field" placeholder="PNxxxxxxxx" />
              </div>
              <div className="space-y-1">
                <label htmlFor="tenant-forwarding-number" className="text-sm font-medium">Forwarding Number</label>
                <input id="tenant-forwarding-number" value={form.forwardingNumber} onChange={(e) => setForm({ ...form, forwardingNumber: e.target.value })} className="input-field" placeholder="+15555550999" />
              </div>
              <label htmlFor="tenant-number-active" className="flex items-center gap-2 text-sm">
                <Checkbox
                  id="tenant-number-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
                <span>Active</span>
              </label>
              {upsertMutation.isError && (
                <p className="text-sm text-destructive">
                  {upsertMutation.error instanceof Error ? upsertMutation.error.message : "Failed to save"}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancel</button>
                <button type="submit" disabled={upsertMutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {upsertMutation.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
