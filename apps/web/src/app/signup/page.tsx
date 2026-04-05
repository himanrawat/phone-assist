"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneIcon, AlertCircleIcon } from "lucide-react";
import { API } from "@phone-assistant/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export default function SignupPage() {
  const [businessName, setBusinessName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitSignup() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(API.auth.register, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify({ name, email, password, businessName }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Registration failed");
      }

      globalThis.location.assign(APP_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-12">
      <div className="w-full max-w-sm px-4">
        {/* Card */}
        <div
          className="rounded-2xl border border-border bg-card p-8"
          style={{ boxShadow: "var(--shadow-forest)" }}
        >
          {/* Logo & title */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-brand-green">
              <PhoneIcon className="size-6 text-brand-forest" />
            </div>
            <h1 className="font-heading text-2xl font-bold">Create Account</h1>
            <p className="text-sm text-muted-foreground">
              Start your 14-day free trial
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitSignup();
            }}
            className="mt-8 space-y-4"
          >
            {error && (
              <Alert variant="destructive">
                <AlertCircleIcon className="size-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <label
                htmlFor="signup-business"
                className="text-sm font-medium"
              >
                Business Name
              </label>
              <input
                id="signup-business"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="input-field"
                placeholder="Acme Inc"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-name"
                className="text-sm font-medium"
              >
                Full Name
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-email"
                className="text-sm font-medium"
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="signup-password"
                className="text-sm font-medium"
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pill-primary w-full justify-center"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Bottom link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-green transition-colors hover:text-brand-dark-green"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
