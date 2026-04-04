import Link from "next/link";
import {
  BotIcon,
  BuildingIcon,
  ServerIcon,
  BarChart3Icon,
  ArrowRightIcon,
  CheckIcon
} from "lucide-react";

export default function LandingPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your AI Phone Assistant,{" "}
              <span className="text-[var(--primary)]">Always On</span>
            </h1>
            <p className="mt-6 text-lg text-[var(--muted-foreground)]">
              Never miss a call again. Our AI-powered phone assistant handles
              inbound and outbound calls, understands your brand, and resolves
              customer inquiries — 24/7.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-base font-medium text-white hover:opacity-90"
              >
                Start Free Trial <ArrowRightIcon className="size-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex h-12 items-center gap-2 rounded-lg border px-6 text-base font-medium hover:bg-[var(--muted)]"
              >
                See Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-y bg-[var(--muted)]">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-8 px-4 py-8 text-center sm:gap-16">
          <div>
            <p className="font-heading text-2xl font-bold">500+</p>
            <p className="text-sm text-[var(--muted-foreground)]">Businesses</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold">1M+</p>
            <p className="text-sm text-[var(--muted-foreground)]">Calls Handled</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold">99.9%</p>
            <p className="text-sm text-[var(--muted-foreground)]">Uptime</p>
          </div>
          <div>
            <p className="font-heading text-2xl font-bold">4.9/5</p>
            <p className="text-sm text-[var(--muted-foreground)]">Rating</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold">
              Everything You Need
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)]">
              A complete AI phone system built for modern businesses
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
              description="Switch between Twilio, Deepgram, OpenAI, and more without code changes. Choose the best providers for your needs."
            />
            <FeatureCard
              icon={BarChart3Icon}
              title="Real-Time Analytics"
              description="Track call volume, sentiment, resolution rates, and more. Make data-driven decisions about your phone operations."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-[var(--muted)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold">
              Get Started in Minutes
            </h2>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
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

      {/* Use Cases */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold">
              Built for Every Industry
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Healthcare", desc: "Patient scheduling, appointment reminders, triage support" },
              { title: "Legal", desc: "Client intake, appointment booking, case status updates" },
              { title: "Real Estate", desc: "Property inquiries, showing scheduling, lead qualification" },
              { title: "Hospitality", desc: "Reservations, concierge services, guest support" },
            ].map((uc) => (
              <div key={uc.title} className="rounded-lg border bg-[var(--card)] p-6">
                <h3 className="font-heading text-lg font-semibold">{uc.title}</h3>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{uc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="border-y bg-[var(--muted)] py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-3 text-[var(--muted-foreground)]">
              Start free, scale as you grow
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            <PricingCard name="Starter" price="$29" features={["1 phone number", "500 call minutes", "1 team member", "Basic analytics"]} />
            <PricingCard name="Business" price="$79" features={["3 phone numbers", "2,000 call minutes", "5 team members", "Advanced analytics"]} highlight />
            <PricingCard name="Enterprise" price="$199" features={["10 phone numbers", "10,000 call minutes", "25 team members", "API access"]} />
          </div>

          <div className="mt-8 text-center">
            <Link href="/pricing" className="text-sm font-medium text-[var(--primary)] hover:underline">
              View full pricing comparison <ArrowRightIcon className="inline size-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-heading text-3xl font-bold">
              Trusted by Businesses
            </h2>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
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

      {/* CTA */}
      <section className="bg-[var(--primary)] py-20 text-white">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-heading text-3xl font-bold">
            Ready to Transform Your Phone System?
          </h2>
          <p className="mt-4 text-lg text-white/80">
            Join 500+ businesses using AI to handle their calls. Start your free
            trial today — no credit card required.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-base font-medium text-[var(--primary)] hover:bg-white/90"
          >
            Get Started Free <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-[var(--card)] p-6">
      <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--primary)] text-lg font-bold text-white">
        {number}
      </div>
      <h3 className="mt-4 font-heading text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  features,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 ${
        highlight
          ? "border-[var(--primary)] bg-[var(--card)] shadow-lg ring-1 ring-[var(--primary)]"
          : "bg-[var(--card)]"
      }`}
    >
      {highlight && (
        <span className="mb-3 inline-flex rounded-full bg-[var(--primary)] px-3 py-0.5 text-xs font-medium text-white">
          Most Popular
        </span>
      )}
      <h3 className="font-heading text-xl font-bold">{name}</h3>
      <div className="mt-2">
        <span className="font-heading text-3xl font-bold">{price}</span>
        <span className="text-sm text-[var(--muted-foreground)]">/month</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm">
            <CheckIcon className="size-4 text-green-600" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href="/signup"
        className={`mt-6 block rounded-md py-2.5 text-center text-sm font-medium ${
          highlight
            ? "bg-[var(--primary)] text-white hover:opacity-90"
            : "border hover:bg-[var(--muted)]"
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
}: {
  quote: string;
  author: string;
  role: string;
}) {
  return (
    <div className="rounded-lg border bg-[var(--card)] p-6">
      <p className="text-sm italic text-[var(--muted-foreground)]">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-4">
        <p className="text-sm font-semibold">{author}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{role}</p>
      </div>
    </div>
  );
}
