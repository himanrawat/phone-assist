import {
  PhoneIcon,
  ShieldCheckIcon,
  ZapIcon,
  GlobeIcon,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        {/* Hero */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-tech mb-4">About Us</p>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            About <span className="text-brand-green">Phone Assistant</span>
          </h1>
          <p className="mt-5 text-lg font-light leading-relaxed text-muted-foreground">
            We&apos;re building the future of business phone communication with
            AI that actually understands your brand.
          </p>
        </div>

        <div className="mt-20 space-y-16">
          {/* Mission */}
          <section>
            <p className="label-tech mb-3">Our Mission</p>
            <h2 className="font-heading text-2xl font-bold">
              Making Every Call Count
            </h2>
            <p className="mt-4 font-light leading-relaxed text-muted-foreground">
              Small and medium businesses lose thousands of calls every year.
              Missed calls mean missed revenue, frustrated customers, and lost
              opportunities. We believe every business deserves an AI phone
              assistant that knows their brand, speaks their language, and never
              takes a day off.
            </p>
          </section>

          {/* Differentiators */}
          <section>
            <p className="label-tech mb-3">Why Us</p>
            <h2 className="font-heading text-2xl font-bold">
              What Makes Us Different
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              <DiffCard
                icon={ShieldCheckIcon}
                title="Enterprise Security"
                description="Cookie-based session auth, CSRF protection, tenant isolation, and audit logging built from day one."
              />
              <DiffCard
                icon={ZapIcon}
                title="Provider Agnostic"
                description="Switch between Twilio, Deepgram, OpenAI, Groq, and more without code changes or downtime."
              />
              <DiffCard
                icon={GlobeIcon}
                title="Multilingual"
                description="Your assistant can detect and respond in the caller's language automatically."
              />
              <DiffCard
                icon={PhoneIcon}
                title="Real-Time Voice"
                description="WebSocket-based audio streaming for natural, low-latency conversations that feel human."
              />
            </div>
          </section>

          {/* Technology */}
          <section>
            <p className="label-tech mb-3">Stack</p>
            <h2 className="font-heading text-2xl font-bold">Technology</h2>
            <p className="mt-4 font-light leading-relaxed text-muted-foreground">
              Phone Assistant is built on a modern, scalable stack: Fastify for
              the backend, Next.js for the frontend, PostgreSQL for data,
              Redis for caching and job queues, and BullMQ for background
              processing. Our provider-agnostic architecture means you&apos;re
              never locked into a single vendor.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {[
                "Fastify",
                "Next.js",
                "PostgreSQL",
                "Redis",
                "BullMQ",
                "Drizzle ORM",
                "TypeScript",
                "Zod",
              ].map((tech) => (
                <span
                  key={tech}
                  className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function DiffCard({
  icon: Icon,
  title,
  description,
}: Readonly<{
  icon: React.ElementType;
  title: string;
  description: string;
}>) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <Icon className="size-7 text-brand-green" />
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm font-light text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
