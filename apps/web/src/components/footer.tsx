import Link from "next/link";
import { PhoneIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t bg-[var(--muted)]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
                <PhoneIcon className="size-4" />
              </div>
              <span className="font-heading text-lg font-bold">Phone Assistant</span>
            </div>
            <p className="mt-3 text-sm text-[var(--muted-foreground)]">
              AI-powered phone assistant for businesses. Handle calls, delight customers, grow revenue.
            </p>
          </div>

          <div>
            <h3 className="font-heading text-sm font-semibold">Product</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
              <li><Link href="/pricing" className="hover:text-[var(--foreground)]">Pricing</Link></li>
              <li><Link href="/about" className="hover:text-[var(--foreground)]">About</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm font-semibold">Use Cases</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
              <li>Healthcare</li>
              <li>Legal</li>
              <li>Real Estate</li>
              <li>Hospitality</li>
            </ul>
          </div>

          <div>
            <h3 className="font-heading text-sm font-semibold">Account</h3>
            <ul className="mt-3 space-y-2 text-sm text-[var(--muted-foreground)]">
              <li><Link href="/login" className="hover:text-[var(--foreground)]">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-[var(--foreground)]">Sign up</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-8 text-center text-xs text-[var(--muted-foreground)]">
          &copy; {new Date().getFullYear()} Phone Assistant. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
