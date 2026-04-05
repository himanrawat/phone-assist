import Link from "next/link";
import { CheckIcon, XIcon } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$29",
    description: "Perfect for solo practitioners",
    features: {
      "Phone numbers": "1",
      "Call minutes": "500",
      "Team members": "1",
      "AI voice options": "2",
      "Knowledge base docs": "50",
      "Call recordings": "30 days",
      Analytics: "Basic",
      "API access": false,
      "Priority support": false,
    },
  },
  {
    name: "Business",
    price: "$79",
    description: "For growing teams",
    highlight: true,
    features: {
      "Phone numbers": "3",
      "Call minutes": "2,000",
      "Team members": "5",
      "AI voice options": "All",
      "Knowledge base docs": "200",
      "Call recordings": "90 days",
      Analytics: "Advanced",
      "API access": false,
      "Priority support": "Email",
    },
  },
  {
    name: "Enterprise",
    price: "$199",
    description: "For large organizations",
    features: {
      "Phone numbers": "10",
      "Call minutes": "10,000",
      "Team members": "25",
      "AI voice options": "All + custom",
      "Knowledge base docs": "Unlimited",
      "Call recordings": "1 year",
      Analytics: "Advanced + export",
      "API access": true,
      "Priority support": "Phone + email",
    },
  },
  {
    name: "Custom",
    price: "Contact us",
    description: "Tailored to your needs",
    features: {
      "Phone numbers": "Unlimited",
      "Call minutes": "Custom",
      "Team members": "Custom",
      "AI voice options": "Custom",
      "Knowledge base docs": "Unlimited",
      "Call recordings": "Custom",
      Analytics: "Custom",
      "API access": true,
      "Priority support": "Dedicated",
    },
  },
];

export default function PricingPage() {
  return (
    <div className="py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-tech mb-4">Plans</p>
          <h1 className="font-heading text-4xl font-bold sm:text-5xl">
            Pricing
          </h1>
          <p className="mt-4 text-lg font-light text-muted-foreground">
            Choose the plan that fits your business. All plans include a 14-day
            free trial.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 ${
                plan.highlight
                  ? "border-brand-green ring-1 ring-brand-green bg-card"
                  : "border-border bg-card"
              }`}
              style={{
                boxShadow: plan.highlight
                  ? "var(--shadow-forest)"
                  : "var(--shadow-subtle)",
              }}
            >
              {plan.highlight && (
                <span className="label-tech mb-4 inline-block text-brand-green">
                  Most Popular
                </span>
              )}
              <h2 className="font-heading text-xl font-bold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {plan.description}
              </p>
              <div className="mt-4">
                <span className="font-heading text-3xl font-bold">
                  {plan.price}
                </span>
                {plan.price !== "Contact us" && (
                  <span className="text-sm text-muted-foreground">
                    /month
                  </span>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {Object.entries(plan.features).map(([feature, value]) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm"
                  >
                    {value === false ? (
                      <XIcon className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <CheckIcon className="size-4 shrink-0 text-brand-green" />
                    )}
                    <span className="text-muted-foreground">{feature}:</span>{" "}
                    <span className="font-medium">
                      {value === true
                        ? "Yes"
                        : value === false
                          ? "No"
                          : value}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-6 block rounded-full py-2.5 text-center text-sm font-medium transition-all ${
                  plan.highlight
                    ? "bg-brand-green text-brand-forest hover:opacity-90"
                    : "border border-border hover:bg-accent"
                }`}
              >
                {plan.price === "Contact us"
                  ? "Contact Sales"
                  : "Start Free Trial"}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-2xl">
          <div className="text-center">
            <p className="label-tech mb-4">FAQ</p>
            <h2 className="font-heading text-2xl font-bold sm:text-3xl">
              Frequently Asked Questions
            </h2>
          </div>
          <div className="mt-10 space-y-4">
            <FaqItem
              q="Can I switch plans later?"
              a="Yes, you can upgrade or downgrade at any time. Changes take effect at your next billing cycle."
            />
            <FaqItem
              q="What happens when I exceed my call minutes?"
              a="We'll notify you when you're at 80% usage. You can upgrade your plan or purchase additional minutes."
            />
            <FaqItem
              q="Is there a free trial?"
              a="All plans include a 14-day free trial. No credit card required to start."
            />
            <FaqItem
              q="Can I cancel anytime?"
              a="Yes, cancel any time from your account settings. No long-term contracts."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FaqItem({ q, a }: Readonly<{ q: string; a: string }>) {
  return (
    <div
      className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5"
      style={{ boxShadow: "var(--shadow-subtle)" }}
    >
      <h3 className="text-sm font-semibold">{q}</h3>
      <p className="mt-2 text-sm font-light text-muted-foreground">{a}</p>
    </div>
  );
}
