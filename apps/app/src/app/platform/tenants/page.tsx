"use client";

import { BoneyardTablePageSkeleton } from "@/components/boneyard-skeletons";
import { useQuery } from "@tanstack/react-query";
import { platformTenants } from "@/lib/api";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TenantsPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: () => platformTenants.list(),
  });

  const [search, setSearch] = useState("");
  const tenants = data?.data ?? [];
  const filtered = tenants.filter(
    (t) =>
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <BoneyardTablePageSkeleton
        label="Tenants boneyard"
        showAction
        showSearch
        columns={8}
        rows={6}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            Manage all tenants on the platform
          </p>
        </div>
        <Link
          href="/platform/tenants/create"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon className="size-4" /> Create Tenant
        </Link>
      </div>

      <div className="relative max-w-sm">
        <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Search tenants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
        />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Slug</th>
              <th className="px-4 py-3 text-left font-medium">Industry</th>
              <th className="px-4 py-3 text-left font-medium">Timezone</th>
              <th className="px-4 py-3 text-left font-medium">Telephony</th>
              <th className="px-4 py-3 text-left font-medium">STT</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No tenants found</td></tr>
            )}
            {filtered.map((t) => (
              <tr
                key={t.id}
                className="border-b last:border-0 hover:bg-muted/30 cursor-pointer"
                onClick={() => {
                  router.push(`/platform/tenants/${t.id}`);
                }}
              >
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3 text-xs">{t.industry ?? "—"}</td>
                <td className="px-4 py-3 text-xs">{t.timezone}</td>
                <td className="px-4 py-3 text-xs">{t.telephonyProvider ?? "default"}</td>
                <td className="px-4 py-3 text-xs">{t.sttProvider ?? "default"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${t.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
