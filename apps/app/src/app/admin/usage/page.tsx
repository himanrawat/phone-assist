"use client";

import { BarChart3Icon } from "lucide-react";

export default function UsagePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Usage</h1>
        <p className="text-sm text-muted-foreground">
          Monitor your call minutes, AI tokens, and resource consumption
        </p>
      </div>

      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <BarChart3Icon className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Usage analytics and reporting is under development. You&apos;ll be able
          to track call minutes, AI token usage, and storage consumption here.
        </p>
      </div>
    </div>
  );
}
