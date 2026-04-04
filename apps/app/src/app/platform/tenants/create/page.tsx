"use client";

import { useMutation } from "@tanstack/react-query";
import { platformTenants } from "@/lib/api";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";

export default function CreateTenantPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    slug: "",
    industry: "",
    timezone: "America/New_York",
  });

  const mutation = useMutation({
    mutationFn: () => platformTenants.create(form),
    onSuccess: (data) => {
      router.push(`/platform/tenants/${data.data.id}`);
    },
  });

  function handleSlugify(name: string) {
    setForm({
      ...form,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.push("/platform/tenants")} className="rounded-md p-1.5 hover:bg-muted">
          <ArrowLeftIcon className="size-5" />
        </button>
        <div>
          <h1 className="font-heading text-2xl font-bold">Create Tenant</h1>
          <p className="text-sm text-muted-foreground">Add a new tenant to the platform</p>
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="max-w-lg space-y-4 rounded-lg border p-6"
      >
        <div className="space-y-1">
          <label className="text-sm font-medium">Tenant Name <span className="text-destructive">*</span></label>
          <input
            value={form.name}
            onChange={(e) => handleSlugify(e.target.value)}
            className="input-field"
            placeholder="Acme Corp"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Slug <span className="text-destructive">*</span></label>
          <input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="input-field font-mono"
            placeholder="acme-corp"
            required
          />
          <p className="text-xs text-muted-foreground">URL-safe identifier (auto-generated from name)</p>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Industry</label>
          <input
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="input-field"
            placeholder="Healthcare, Real Estate, etc."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Timezone <span className="text-destructive">*</span></label>
          <input
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="input-field"
            placeholder="America/New_York"
            required
          />
        </div>

        {mutation.isError && (
          <p className="text-sm text-destructive">
            {mutation.error instanceof Error ? mutation.error.message : "Failed to create tenant"}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push("/platform/tenants")} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? "Creating..." : "Create Tenant"}
          </button>
        </div>
      </form>
    </div>
  );
}
