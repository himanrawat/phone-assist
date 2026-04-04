"use client";

import { CreditCardIcon } from "lucide-react";

export default function PlatformBillingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Billing Operations</h1>
        <p className="text-sm text-muted-foreground">
          Platform-wide billing, subscriptions, and invoice management
        </p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CreditCardIcon className="size-8" />
        </div>
        <h2 className="mt-4 font-heading text-lg font-semibold">Coming Soon</h2>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Platform billing operations including subscription oversight, invoice generation, and revenue tracking will be available here.
        </p>
      </div>
    </div>
  );
}
