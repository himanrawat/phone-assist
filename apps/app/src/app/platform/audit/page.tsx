"use client";

import { ShieldCheckIcon } from "lucide-react";

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          View platform and tenant-level audit trail
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ShieldCheckIcon className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          A searchable audit log showing all significant actions across the platform including tenant management, configuration changes, and access events.
        </p>
      </div>
    </div>
  );
}
