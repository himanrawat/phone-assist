"use client";

import { CreditCardIcon } from "lucide-react";

export default function PlansPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Plans</h1>
        <p className="text-sm text-muted-foreground">
          Manage subscription plans and entitlements
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CreditCardIcon className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Plan management with pricing tiers, entitlements, and feature configuration will be available here.
        </p>
      </div>
    </div>
  );
}
