"use client";

import Link from "next/link";
import { PhoneIcon, MenuIcon, XIcon } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useState } from "react";

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex size-9 items-center justify-center rounded-lg bg-brand-green transition-transform group-hover:scale-110">
            <PhoneIcon className="size-4 text-brand-forest" />
          </div>
          <span className="font-heading text-lg font-semibold tracking-tight">
            Phone Assistant
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/login"
              className="text-sm font-medium text-foreground transition-colors hover:text-brand-green"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-pill-primary text-sm"
            >
              Start Free Trial
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="p-1 md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <XIcon className="size-5" />
            ) : (
              <MenuIcon className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(false)}
            >
              About
            </Link>
            <hr className="border-border" />
            <Link
              href="/login"
              className="text-sm font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-pill-primary text-center text-sm"
              onClick={() => setMobileOpen(false)}
            >
              Start Free Trial
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
