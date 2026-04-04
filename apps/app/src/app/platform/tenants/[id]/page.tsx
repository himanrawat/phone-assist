"use client";

import { BoneyardDetailPageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { platformTenants } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeftIcon, SaveIcon } from "lucide-react";

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = params.id as string;

  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenant", id],
    queryFn: () => platformTenants.detail(id),
  });

  const { data: brandData } = useQuery({
    queryKey: ["platform-tenant-brand", id],
    queryFn: () => platformTenants.brand(id),
  });

  const { data: assistantData } = useQuery({
    queryKey: ["platform-tenant-assistant", id],
    queryFn: () => platformTenants.assistant(id),
  });

  const [form, setForm] = useState({
    name: "",
    slug: "",
    industry: "",
    timezone: "America/New_York",
  });

  useEffect(() => {
    if (data?.data) {
      setForm({
        name: data.data.name,
        slug: data.data.slug,
        industry: data.data.industry ?? "",
        timezone: data.data.timezone,
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: () => platformTenants.update(id, form),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform-tenant", id] }),
  });

  if (isLoading) {
    return <BoneyardDetailPageSkeleton label="Tenant boneyard" />;
  }

  if (!data?.data) {
    return <div className="py-12 text-center text-destructive">Tenant not found</div>;
  }

  const tenant = data.data;
  const brand = brandData?.data;
  const assistantRaw = assistantData?.data as { primaryLanguage?: string; multilingualEnabled?: boolean } | null;

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
        <span className={`ml-auto inline-flex rounded-full px-3 py-1 text-xs font-medium ${tenant.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
          {tenant.isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Edit Form */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 font-heading text-lg font-semibold">Tenant Details</h2>
        <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Slug</label>
              <input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="input-field" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Industry</label>
              <input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className="input-field" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Timezone</label>
              <input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button type="submit" disabled={updateMutation.isPending} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              <SaveIcon className="size-4" /> {updateMutation.isPending ? "Saving..." : "Save"}
            </button>
            {updateMutation.isSuccess && <span className="text-sm text-green-600">Saved</span>}
          </div>
        </form>
      </div>

      {/* Provider Overrides */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-2 font-heading text-lg font-semibold">Provider Overrides</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Telephony Provider</p>
            <p className="text-sm font-medium">{tenant.telephonyProvider ?? "Platform default"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">STT Provider</p>
            <p className="text-sm font-medium">{tenant.sttProvider ?? "Platform default"}</p>
          </div>
        </div>
      </div>

      {/* Brand Profile Summary */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-2 font-heading text-lg font-semibold">Brand Profile</h2>
        {brand ? (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Business:</span> {brand.businessName}</div>
            <div><span className="text-muted-foreground">Industry:</span> {brand.industry ?? "—"}</div>
            <div><span className="text-muted-foreground">Website:</span> {brand.website ?? "—"}</div>
            <div><span className="text-muted-foreground">Email:</span> {brand.email ?? "—"}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No brand profile configured</p>
        )}
      </div>

      {/* Assistant Summary */}
      <div className="rounded-lg border p-6">
        <h2 className="mb-2 font-heading text-lg font-semibold">Assistant Settings</h2>
        {assistantRaw ? (
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><span className="text-muted-foreground">Language:</span> {assistantRaw.primaryLanguage ?? "en"}</div>
            <div><span className="text-muted-foreground">Multilingual:</span> {assistantRaw.multilingualEnabled ? "Enabled" : "Disabled"}</div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No assistant settings configured</p>
        )}
      </div>

      {/* Metadata */}
      <div className="rounded-lg border p-6 text-sm text-muted-foreground">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>Created: {new Date(tenant.createdAt).toLocaleString()}</div>
          <div>Updated: {new Date(tenant.updatedAt).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
