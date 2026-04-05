"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneIcon, AlertCircleIcon } from "lucide-react";
import { API } from "@phone-assistant/contracts";
import { Alert, AlertDescription } from "@/components/ui/alert";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin() {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(API.auth.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Login failed");
      }

      globalThis.location.assign(APP_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
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
            <h1 className="font-heading text-2xl font-bold">Welcome back</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your Phone Assistant account
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submitLogin();
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
                htmlFor="login-email"
                className="text-sm font-medium"
              >
                Email
              </label>
              <input
                id="login-email"
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
                htmlFor="login-password"
                className="text-sm font-medium"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-pill-primary w-full justify-center"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        {/* Bottom link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-green transition-colors hover:text-brand-dark-green"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
