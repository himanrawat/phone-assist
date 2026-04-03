import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Terminal,
  Database,
  Sprout,
  Play,
  Globe,
  Webhook,
  ExternalLink,
} from "lucide-react";

const steps = [
  {
    number: 1,
    title: "Start Docker Containers",
    description:
      "Spin up PostgreSQL and Redis containers required by the backend.",
    command: "bun run docker:up",
    icon: Terminal,
  },
  {
    number: 2,
    title: "Push Database Schema",
    description: "Apply the Drizzle schema to your local PostgreSQL instance.",
    command: "bun run db:push",
    icon: Database,
  },
  {
    number: 3,
    title: "Seed Demo Data",
    description:
      "Populate the database with sample tenants, calls, and brand profiles.",
    command: "bun run db:seed",
    icon: Sprout,
  },
  {
    number: 4,
    title: "Start the Backend",
    description: "Launch the Hono API server on port 3000.",
    command: "bun run dev",
    icon: Play,
  },
  {
    number: 5,
    title: "Start ngrok Tunnel",
    description:
      "Expose the local backend so Twilio can reach your webhooks.",
    command: "ngrok http 3000",
    icon: Globe,
  },
  {
    number: 6,
    title: "Configure Twilio Voice Webhook",
    description: "Set the 'A call comes in' webhook to your public URL.",
    command: "https://<ngrok-url>/webhooks/twilio/voice",
    isUrl: true,
    note: "HTTP POST",
    icon: Webhook,
  },
  {
    number: 7,
    title: "Configure Twilio Status Webhook",
    description: "Set the 'Call status changes' webhook to your public URL.",
    command: "https://<ngrok-url>/webhooks/twilio/status",
    isUrl: true,
    note: "HTTP POST",
    icon: Webhook,
  },
];

export default function GettingStartedPage() {
  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Getting Started</h1>
          <Badge variant="secondary" className="text-xs">
            Developer Guide
          </Badge>
        </div>
        <p className="text-muted-foreground mt-1">
          Follow these steps to set up your local development environment and
          connect to Twilio.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Card key={step.number}>
              <CardContent className="pt-1">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{step.title}</h3>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="inline-flex items-center rounded-md bg-muted px-3 py-1.5 text-xs font-mono text-foreground ring-1 ring-border">
                        {step.command}
                      </code>
                      {step.note && (
                        <Badge variant="outline" className="text-[10px]">
                          {step.note}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Helpful Links */}
      <Card>
        <CardHeader>
          <CardTitle>Helpful Links</CardTitle>
          <CardDescription>External resources for setup</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <HelpLink
              href="https://console.twilio.com"
              label="Twilio Console"
              description="Manage phone numbers & webhooks"
            />
            <HelpLink
              href="https://dashboard.ngrok.com"
              label="ngrok Dashboard"
              description="View tunnel status & URLs"
            />
            <HelpLink
              href="https://console.deepgram.com"
              label="Deepgram Console"
              description="Manage STT API keys"
            />
            <HelpLink
              href="https://console.groq.com"
              label="Groq Console"
              description="Manage LLM & TTS API keys"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HelpLink({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-3 rounded-lg p-3 -mx-1 transition-colors hover:bg-muted/60"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <ExternalLink className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium group-hover:text-primary transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </a>
  );
}
