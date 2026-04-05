import Link from "next/link";
import { PhoneIcon } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-brand-green">
                <PhoneIcon className="size-4 text-brand-forest" />
              </div>
              <span className="font-heading text-lg font-semibold">
                Phone Assistant
              </span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              AI-powered phone assistant for businesses. Handle calls, delight
              customers, grow revenue.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-brand-green"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="transition-colors hover:text-brand-green"
                >
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Use Cases */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Use Cases
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>Healthcare</li>
              <li>Legal</li>
              <li>Real Estate</li>
              <li>Hospitality</li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
              Account
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li>
                <Link
                  href="/login"
                  className="transition-colors hover:text-brand-green"
                >
                  Log in
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="transition-colors hover:text-brand-green"
                >
                  Sign up
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Phone Assistant. All rights
            reserved.
          </p>
          <div className="flex items-center gap-1.5">
            <span className="inline-block size-2 rounded-full bg-brand-green animate-pulse" />
            <span className="text-xs text-muted-foreground">
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
