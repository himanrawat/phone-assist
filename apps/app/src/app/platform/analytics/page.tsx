"use client";

import { BarChart3Icon } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide analytics and reporting
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BarChart3Icon className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Platform analytics with call volume trends, tenant growth, provider usage, and revenue metrics will be available here.
        </p>
      </div>
    </div>
  );
}
