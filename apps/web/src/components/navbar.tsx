import Link from "next/link";
import { PhoneIcon } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--background)]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
            <PhoneIcon className="size-4" />
          </div>
          <span className="font-heading text-lg font-bold">Phone Assistant</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/pricing" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            Pricing
          </Link>
          <Link href="/about" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-[var(--foreground)] hover:text-[var(--primary)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="inline-flex h-9 items-center rounded-md bg-[var(--primary)] px-4 text-sm font-medium text-white hover:opacity-90"
          >
            Start Free Trial
          </Link>
        </div>
      </div>
    </header>
  );
}
