"use client";

import { useQuery } from "@tanstack/react-query";
import { platformTenants } from "@/lib/api";
import Link from "next/link";
import {
  BuildingIcon,
  UsersIcon,
  ServerIcon,
  ActivityIcon,
} from "lucide-react";

export default function PlatformDashboard() {
  const { data: tenantsData } = useQuery({
    queryKey: ["platform-tenants"],
    queryFn: () => platformTenants.list(),
  });

  const tenants = tenantsData?.data ?? [];
  const activeTenants = tenants.filter((t) => t.isActive).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Platform Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of the entire platform
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={tenants.length} icon={BuildingIcon} />
        <StatCard title="Active Tenants" value={activeTenants} icon={UsersIcon} />
        <StatCard title="Providers" value="Configured" icon={ServerIcon} />
        <StatCard title="System Status" value="Healthy" icon={ActivityIcon} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Tenants</h2>
          <Link href="/platform/tenants" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Industry</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.slice(0, 5).map((t) => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/platform/tenants/${t.id}`} className="hover:text-primary hover:underline">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-xs">{t.industry ?? "—"}</td>
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
              {tenants.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No tenants</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="rounded-lg border bg-card p-6">
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
