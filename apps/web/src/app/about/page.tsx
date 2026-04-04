import { PhoneIcon, ShieldCheckIcon, ZapIcon, GlobeIcon } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="font-heading text-4xl font-bold">
            About Phone Assistant
          </h1>
          <p className="mt-4 text-lg text-(--muted-foreground)">
            We&apos;re building the future of business phone communication with
            AI that actually understands your brand.
          </p>
        </div>

        <div className="mt-16 space-y-12">
          <section>
            <h2 className="font-heading text-2xl font-bold">Our Mission</h2>
            <p className="mt-3 leading-relaxed text-(--muted-foreground)">
              Small and medium businesses lose thousands of calls every year.
              Missed calls mean missed revenue, frustrated customers, and lost
              opportunities. We believe every business deserves an AI phone
              assistant that knows their brand, speaks their language, and never
              takes a day off.
            </p>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">What Makes Us Different</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div className="rounded-lg border p-6">
                <ShieldCheckIcon className="size-8 text-(--primary)" />
                <h3 className="mt-3 font-heading text-lg font-semibold">Enterprise Security</h3>
                <p className="mt-2 text-sm text-(--muted-foreground)">
                  Cookie-based session auth, CSRF protection, tenant isolation, and audit logging built from day one.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <ZapIcon className="size-8 text-(--primary)" />
                <h3 className="mt-3 font-heading text-lg font-semibold">Provider Agnostic</h3>
                <p className="mt-2 text-sm text-(--muted-foreground)">
                  Switch between Twilio, Deepgram, OpenAI, Groq, and more without code changes or downtime.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <GlobeIcon className="size-8 text-(--primary)" />
                <h3 className="mt-3 font-heading text-lg font-semibold">Multilingual</h3>
                <p className="mt-2 text-sm text-(--muted-foreground)">
                  Your assistant can detect and respond in the caller&apos;s language automatically.
                </p>
              </div>
              <div className="rounded-lg border p-6">
                <PhoneIcon className="size-8 text-(--primary)" />
                <h3 className="mt-3 font-heading text-lg font-semibold">Real-Time Voice</h3>
                <p className="mt-2 text-sm text-(--muted-foreground)">
                  WebSocket-based audio streaming for natural, low-latency conversations that feel human.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-heading text-2xl font-bold">Technology</h2>
            <p className="mt-3 leading-relaxed text-(--muted-foreground)">
              Phone Assistant is built on a modern, scalable stack: Fastify for
              the backend, Next.js for the frontend, PostgreSQL for data,
              Redis for caching and job queues, and BullMQ for background
              processing. Our provider-agnostic architecture means you&apos;re
              never locked into a single vendor.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
