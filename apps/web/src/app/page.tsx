import Link from "next/link";
import {
  BotIcon,
  BuildingIcon,
  ServerIcon,
  BarChart3Icon,
  ArrowRightIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* ═══ Hero ═══ */}
      <section className="relative overflow-hidden">
        {/* Glow effect */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-brand-green/10 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-28 sm:px-6 sm:py-36">
          <div className="mx-auto max-w-3xl text-center">
            <p className="label-tech mb-6">AI-Powered Phone Platform</p>

            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your AI Phone Assistant,{" "}
              <span className="text-brand-green">Always On</span>
            </h1>

            <p className="mt-6 text-lg font-light leading-relaxed text-muted-foreground">
              Never miss a call again. Our AI-powered phone assistant handles
              inbound and outbound calls, understands your brand, and resolves
              customer inquiries — 24/7.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/signup" className="btn-pill-primary">
                Start Free Trial <ArrowRightIcon className="size-4" />
              </Link>
              <Link href="/pricing" className="btn-pill-secondary">
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Social Proof ═══ */}
      <section className="border-y border-border bg-muted/50">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-10 px-4 py-10 text-center sm:gap-16">
          {[
            { value: "500+", label: "Businesses" },
            { value: "1M+", label: "Calls Handled" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9/5", label: "Rating" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-3xl font-bold text-brand-green">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features ═══ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-tech mb-4">Features</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Everything You Need
            </h2>
            <p className="mt-3 text-muted-foreground">
              A complete AI phone system built for modern businesses
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={BotIcon}
              title="AI Voice Assistant"
              description="Natural conversations powered by advanced AI. Your assistant knows your brand, services, and policies."
            />
            <FeatureCard
              icon={BuildingIcon}
              title="Multi-Tenant"
              description="Manage multiple businesses from one platform. Each tenant gets isolated data, branding, and settings."
            />
            <FeatureCard
              icon={ServerIcon}
              title="Provider Agnostic"
              description="Switch between Twilio, Deepgram, OpenAI, and more without code changes. Choose the best providers."
            />
            <FeatureCard
              icon={BarChart3Icon}
              title="Real-Time Analytics"
              description="Track call volume, sentiment, resolution rates, and more. Make data-driven decisions."
            />
          </div>
        </div>
      </section>

      {/* ═══ How it works ═══ */}
      <section className="border-y border-border bg-muted/50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-tech mb-4">Get Started</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Up and Running in Minutes
            </h2>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            <StepCard
              number="1"
              title="Sign Up"
              description="Create your account and set up your first tenant in under 2 minutes."
            />
            <StepCard
              number="2"
              title="Configure"
              description="Add your brand profile, services, working hours, and connect your phone number."
            />
            <StepCard
              number="3"
              title="Go Live"
              description="Your AI assistant starts handling calls immediately. Monitor everything from the dashboard."
            />
          </div>
        </div>
      </section>

      {/* ═══ Use Cases ═══ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-tech mb-4">Industries</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Built for Every Industry
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: SparklesIcon,
                title: "Healthcare",
                desc: "Patient scheduling, appointment reminders, triage support",
              },
              {
                icon: ShieldCheckIcon,
                title: "Legal",
                desc: "Client intake, appointment booking, case status updates",
              },
              {
                icon: BuildingIcon,
                title: "Real Estate",
                desc: "Property inquiries, showing scheduling, lead qualification",
              },
              {
                icon: ZapIcon,
                title: "Hospitality",
                desc: "Reservations, concierge services, guest support",
              },
            ].map((uc) => (
              <div
                key={uc.title}
                className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "var(--shadow-subtle)" }}
              >
                <uc.icon className="size-6 text-brand-green" />
                <h3 className="mt-4 font-heading text-lg font-semibold">
                  {uc.title}
                </h3>
                <p className="mt-2 text-sm font-light text-muted-foreground">
                  {uc.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Pricing Preview ═══ */}
      <section className="border-y border-border bg-muted/50 py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-tech mb-4">Pricing</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start free, scale as you grow
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <PricingCard
              name="Starter"
              price="$29"
              features={[
                "1 phone number",
                "500 call minutes",
                "1 team member",
                "Basic analytics",
              ]}
            />
            <PricingCard
              name="Business"
              price="$79"
              features={[
                "3 phone numbers",
                "2,000 call minutes",
                "5 team members",
                "Advanced analytics",
              ]}
              highlight
            />
            <PricingCard
              name="Enterprise"
              price="$199"
              features={[
                "10 phone numbers",
                "10,000 call minutes",
                "25 team members",
                "API access",
              ]}
            />
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="text-sm font-medium text-brand-green transition-colors hover:text-brand-dark-green"
            >
              View full pricing comparison{" "}
              <ArrowRightIcon className="inline size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Testimonials ═══ */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="label-tech mb-4">Testimonials</p>
            <h2 className="font-heading text-3xl font-bold sm:text-4xl">
              Trusted by Businesses
            </h2>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            <TestimonialCard
              quote="Phone Assistant cut our missed calls by 90%. Our patients love being able to reach us anytime."
              author="Dr. Sarah Chen"
              role="Medical Practice Owner"
            />
            <TestimonialCard
              quote="The multi-tenant setup is perfect. We manage 12 client businesses from a single dashboard."
              author="Michael Torres"
              role="Agency Director"
            />
            <TestimonialCard
              quote="Setup took 10 minutes. The AI understood our services immediately from the brand profile."
              author="Jessica Williams"
              role="Real Estate Broker"
            />
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative overflow-hidden border-t border-border bg-brand-dark-green py-24">
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-0 top-0 size-[500px] rounded-full bg-brand-green/20 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your Phone System?
          </h2>
          <p className="mt-4 text-lg font-light text-white/70">
            Join 500+ businesses using AI to handle their calls. Start your free
            trial today — no credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-brand-green px-8 text-base font-semibold text-brand-forest transition-transform hover:scale-105 active:scale-95"
          >
            Get Started Free <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

/* ─── Sub-components ─── */

function FeatureCard({
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
      className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-brand-green/10">
        <Icon className="size-5 text-brand-green" />
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm font-light text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: Readonly<{
  number: string;
  title: string;
  description: string;
}>) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-green text-xl font-bold text-brand-forest">
        {number}
      </div>
      <h3 className="mt-5 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm font-light text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  features,
  highlight,
}: Readonly<{
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}>) {
  return (
    <div
      className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
        highlight
          ? "border-brand-green bg-card ring-1 ring-brand-green"
          : "border-border bg-card"
      }`}
      style={{ boxShadow: highlight ? "var(--shadow-forest)" : "var(--shadow-subtle)" }}
    >
      {highlight && (
        <span className="label-tech mb-4 inline-block text-brand-green">
          Most Popular
        </span>
      )}
      <h3 className="font-heading text-xl font-bold">{name}</h3>
      <div className="mt-2">
        <span className="font-heading text-3xl font-bold">{price}</span>
        <span className="text-sm text-muted-foreground">/month</span>
      </div>
      <ul className="mt-5 space-y-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckIcon className="size-4 shrink-0 text-brand-green" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-6 block rounded-full py-2.5 text-center text-sm font-medium transition-all ${
          highlight
            ? "bg-brand-green text-brand-forest hover:opacity-90"
            : "border border-border hover:bg-accent"
        }`}
      >
        Get Started
      </Link>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
}: Readonly<{
  quote: string;
  author: string;
  role: string;
}>) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-6"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className="text-brand-green text-sm">
            ★
          </span>
        ))}
      </div>
      <p className="text-sm font-light italic leading-relaxed text-muted-foreground">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-semibold">{author}</p>
        <p className="text-xs text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
