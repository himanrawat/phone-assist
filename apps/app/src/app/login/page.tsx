"use client";

import { BoneyardAuthSkeleton } from "@/components/boneyard-skeletons";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { PhoneIcon, AlertCircleIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submitLogin() {
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      router.replace(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      {/* Glow effect */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[500px] rounded-full bg-brand-green/8 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
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
            <h1 className="font-heading text-2xl font-bold">Phone Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to your account
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
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>
              <input
                id="email"
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
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>
              <input
                id="password"
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
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<BoneyardAuthSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
