"use client";

import { useQuery } from "@tanstack/react-query";
import { platformTenants } from "@/lib/api";
import Link from "next/link";
import {
  BuildingIcon,
  UsersIcon,
  ServerIcon,
  ActivityIcon,
  ArrowRightIcon,
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
      {/* Header */}
      <div>
        <p className="label-tech mb-2">Super Admin</p>
        <h1 className="font-heading text-2xl font-bold">Platform Dashboard</h1>
        <p className="mt-1 text-sm font-light text-muted-foreground">
          Overview of the entire platform
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Tenants" value={tenants.length} icon={BuildingIcon} />
        <StatCard title="Active Tenants" value={activeTenants} icon={UsersIcon} />
        <StatCard title="Providers" value="Configured" icon={ServerIcon} />
        <StatCard title="System Status" value="Healthy" icon={ActivityIcon} accent />
      </div>

      {/* Recent Tenants table */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Recent Tenants</h2>
          <Link
            href="/platform/tenants"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-green transition-colors hover:text-brand-dark-green"
          >
            View all <ArrowRightIcon className="size-3" />
          </Link>
        </div>

        <div
          className="overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: "var(--shadow-subtle)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slug</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Industry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody>
              {tenants.slice(0, 5).map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/platform/tenants/${t.id}`} className="transition-colors hover:text-brand-green">
                      {t.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{t.slug}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.industry ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      t.isActive
                        ? "bg-brand-green/10 text-brand-green"
                        : "bg-destructive/10 text-destructive"
                    }`}>
                      <span className={`size-1.5 rounded-full ${t.isActive ? "bg-brand-green" : "bg-destructive"}`} />
                      {t.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No tenants yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  accent,
}: Readonly<{
  title: string;
  value: string | number;
  icon: React.ElementType;
  accent?: boolean;
}>) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand-green/10">
          <Icon className="size-5 text-brand-green" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="font-heading text-2xl font-bold">{value}</p>
        </div>
      </div>
      {accent && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full bg-brand-green animate-pulse" />
          <span className="text-xs text-muted-foreground">All systems operational</span>
        </div>
      )}
    </div>
  );
}
