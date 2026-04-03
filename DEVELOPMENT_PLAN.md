# AI Phone Assistant SaaS — Phase-Wise Development Plan

> **Version:** 1.0  
> **Date:** April 1, 2026  
> **Total Timeline:** 23–31 weeks (~6–8 months)  
> **Total Dev Cost:** ~$337  
> **Architecture:** Twilio-first telephony with swappable AI providers (Deepgram/Groq Whisper) from the Super Admin panel per tenant or globally.

---

## Tech Stack (Application Layer)

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js (Bun) | Fastest Node runtime, native WebSocket support for audio streaming |
| Backend Framework | Fastify | 2-3x faster than Express, low overhead for real-time voice workloads |
| Language | TypeScript (strict) | Type safety for complex call state machines, zero cost |
| ORM | Drizzle ORM | Lighter & faster than Prisma, better for real-time hot paths |
| Validation | Zod | Runtime type validation for API inputs |
| Job Queue | BullMQ + Redis | Campaign scheduling, reminders, post-call processing |
| WebSocket | ws + @fastify/websocket | Raw audio streaming from Twilio Media Streams, lowest latency |
| Frontend | Next.js 15 (App Router) | SSR dashboards, free Vercel hosting |
| UI | shadcn/ui + Tailwind CSS | Production-quality components, fast to build |
| State | TanStack Query + Zustand | Server state + client state management |
| Charts | Recharts | Free, covers all analytics needs |
| Auth | Lucia Auth | Lightweight, full control over JWT/sessions, works with any DB |
| CI/CD | GitHub Actions | Free tier: 2,000 min/mo |

### External Services (Provider-Agnostic — Configurable from Super Admin)

| Component | Provider A (Quality) | Provider B (Budget) |
|---|---|---|
| Telephony | Twilio | - |
| STT | Deepgram Nova-3 | Groq Whisper v3 Turbo |
| TTS | Groq Orpheus | Groq Orpheus |
| LLM | Groq LLaMA 3.3 70B | Groq LLaMA 3.3 70B |

### Infrastructure (Same for Both Stacks)

| Component | Choice |
|---|---|
| Database | PostgreSQL (self-hosted) + pgvector |
| Cache | Redis (self-hosted) |
| Object Storage | Cloudflare R2 |
| Compute | DigitalOcean Droplet |
| Email | Resend (free tier) / AWS SES (budget) |
| Payments | Razorpay (India) / Stripe (global) |
| Monitoring | Sentry free + Betterstack free |
| Frontend Hosting | Vercel (free) |

---

## Architecture Principle: Provider Abstraction

Every external voice/telephony service is accessed through an **interface/adapter pattern**:

```
┌─────────────────────────────────────────────┐
│              Super Admin Panel              │
│   Telephony: Twilio (global default)        │
│   Toggle: Deepgram ↔ Groq Whisper           │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────▼──────────┐
        │  Provider Registry  │
        │  (config-driven)    │
        └──────────┬──────────┘
                   │
     ┌─────────────┼─────────────┐
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Telephony│  │   STT   │  │   TTS   │
│Interface│  │Interface│  │Interface│
└────┬────┘  └────┬────┘  └────┬────┘
     │            │            │
  ┌──┴───┐    ┌───┴──┐     ┌──┴────┐
  │Twilio│    │Deep- │     │Groq   │
  └──────┘    │gram  │     │Orpheus│
              │Groq W│     └───────┘
              └──────┘
```

This is built in **Phase 1** and used by every subsequent phase.

---

## Phase 1: MVP — Single-Tenant Inbound Calls

**Duration:** 6–8 weeks  
**Dev Cost:** ~$72  
**Goal:** One business can receive AI-handled inbound calls end-to-end

### Week 1–2: Project Foundation + Telephony

- [ ] Project scaffolding — Fastify + TypeScript + Drizzle + Bun
- [ ] PostgreSQL schema: `users`, `tenants`, `phone_numbers`, `calls` tables
- [ ] Redis setup for call state management
- [ ] **Provider abstraction layer** — interfaces for Telephony, STT, TTS
- [ ] Twilio adapter — webhook handling, media streams WebSocket
- [ ] Inbound call reception — route incoming call to correct tenant by forwarded number
- [ ] Working hours check — if outside hours, play after-hours message

### Week 3–4: Voice Pipeline (STT → LLM → TTS)

- [ ] Deepgram adapter — real-time streaming STT via WebSocket
- [ ] Groq Whisper adapter — chunk-based STT
- [ ] Groq LLM integration — system prompt construction, multi-turn conversation
- [ ] Groq Orpheus TTS integration — text to audio streaming
- [ ] **Full voice loop:** caller speaks → STT → LLM → TTS → caller hears response
- [ ] Call state machine — track call lifecycle (ringing → active → ended)
- [ ] Caller identification — match incoming number against contacts
- [ ] Greeting logic — different greetings for known/unknown/VIP/blocked callers

### Week 5–6: Recording + Post-Call Processing

- [ ] Server-side call recording capture from audio stream
- [ ] Recording storage to Cloudflare R2 (encrypted, per-tenant isolated)
- [ ] Call transcript generation from STT output
- [ ] AI-powered call summary via Groq (identity, intent, outcome, actions)
- [ ] Sentiment detection (positive/neutral/negative)
- [ ] Call record persistence — full call data in PostgreSQL
- [ ] BullMQ setup for async post-call processing jobs

### Week 7–8: Basic Dashboard

- [ ] Next.js 15 project setup + shadcn/ui + Tailwind
- [ ] Auth pages — login, register (single tenant for now)
- [ ] Call logs page — list all calls with filters (date, status, duration)
- [ ] Call detail page — summary, transcript, recording playback, download
- [ ] AI assistant config page — persona name, tone, greeting messages, system prompt
- [ ] Basic settings page — working hours, phone number config
- [ ] **Super Admin: Provider settings page** — Twilio telephony, Deepgram↔Groq Whisper

### Phase 1 Deliverables
- ✅ End-to-end inbound call handling with AI
- ✅ Provider-agnostic voice pipeline (swappable from admin)
- ✅ Call recording, transcription, summary
- ✅ Basic tenant dashboard
- ✅ Super Admin provider configuration

---

## Phase 2: Multi-Tenant + Knowledge Base (RAG)

**Duration:** 4–6 weeks  
**Dev Cost:** ~$65  
**Goal:** Multiple businesses with isolated data, AI config, and RAG-powered knowledge

### Week 1–2: Multi-Tenancy

- [ ] Tenant CRUD API — create, read, update, suspend, delete
- [ ] Row-Level Security (RLS) policies in PostgreSQL for all tenant-scoped tables
- [ ] Phone number → tenant mapping (multiple numbers per tenant)
- [ ] Tenant member management — invite, roles, remove
- [ ] Per-tenant AI assistant configuration — persona, instructions, voice preference
- [ ] Tenant working hours configuration
- [ ] Tenant-scoped call routing — concurrent calls across tenants without interference

### Week 3–4: Auth + RBAC

- [ ] Lucia Auth integration — JWT with short-lived access + refresh tokens
- [ ] 4 roles: Super Admin, Tenant Admin, Tenant Manager, Tenant Viewer
- [ ] Role-based route guards on API + frontend
- [ ] Team management UI — invite members, assign roles, remove
- [ ] MFA support (TOTP)
- [ ] Password reset flow
- [ ] Session management — list active sessions, revoke

### Week 5–6: Knowledge Base (RAG)

- [ ] Document upload API — PDF, TXT, DOCX, CSV
- [ ] Text extraction pipeline (per file type)
- [ ] Chunking strategy — split documents into overlapping chunks
- [ ] Embedding generation via Groq or open-source model
- [ ] pgvector storage — chunks with embeddings, tenant-scoped
- [ ] RAG retrieval — top-K relevant chunks during call via cosine similarity
- [ ] Inject retrieved context into LLM system prompt during calls
- [ ] KB management UI — upload, list, delete documents
- [ ] KB test query UI — test "ask a question" against uploaded docs

### Phase 2 Deliverables
- ✅ Full multi-tenant isolation with RLS
- ✅ Auth with 4 roles + MFA
- ✅ Knowledge base with RAG — AI answers from business documents
- ✅ Per-tenant AI configuration

---

## Phase 3: Appointment Booking

**Duration:** 3–4 weeks  
**Dev Cost:** ~$43  
**Goal:** AI books appointments during calls, calendar sync, automated reminders

### Week 1–2: Booking Engine

- [ ] Appointment model — `appointments`, `appointment_rules` tables
- [ ] Booking rules config — available days, time windows, slot duration, buffer time, max/day, advance limit, blackout dates
- [ ] Availability engine — query open slots respecting all rules
- [ ] Google Calendar OAuth integration — read/write sync
- [ ] Outlook Calendar integration (Microsoft Graph API)
- [ ] Appointment CRUD API — create, reschedule, cancel
- [ ] Calendar view UI — appointments displayed on calendar

### Week 3–4: AI Booking Flow + Reminders

- [ ] Intent detection — recognize "I want to book an appointment" during call
- [ ] AI queries available slots, presents 2–3 options to caller
- [ ] Caller selects → AI confirms → appointment created
- [ ] SMS confirmation sent to both caller and tenant (via Twilio SMS)
- [ ] BullMQ scheduled job — 15-minute reminder before each appointment
- [ ] Reminder SMS to both parties (time, name, purpose, contact)
- [ ] SMS reply "C" to cancel — webhook handler for cancellation
- [ ] Rescheduling flow — AI checks new availability, updates booking
- [ ] Booking management UI — list, filter, cancel, reschedule from dashboard

### Phase 3 Deliverables
- ✅ AI books appointments during live calls
- ✅ Google + Outlook calendar sync
- ✅ Automated 15-min SMS reminders
- ✅ Full booking rules engine
- ✅ Calendar UI in dashboard

---

## Phase 4: Outbound Calls + Campaigns

**Duration:** 4–5 weeks  
**Dev Cost:** ~$60  
**Goal:** AI makes outbound calls, runs batch campaigns with retry logic

### Week 1–2: Single Outbound Calls

- [ ] Outbound call API — tenant triggers call with purpose/script
- [ ] AI greets callee with configured script when they pick up
- [ ] Conversation flow same as inbound (STT → LLM → TTS loop)
- [ ] Outcome logging — qualified, not interested, no answer, callback requested
- [ ] Caller ID — outbound calls use tenant's assigned number
- [ ] Outbound call UI — trigger call from dashboard with script input

### Week 3–4: Campaign Engine

- [ ] Campaign model — `outbound_campaigns`, `campaign_contacts` tables
- [ ] Campaign builder API — name, purpose, AI script, contact list, schedule, calling window
- [ ] Campaign execution engine — BullMQ workers call each contact in window
- [ ] TCPA compliance — time-of-day restrictions, DNC list support
- [ ] Retry logic — configurable max retries and interval per campaign
- [ ] Campaign state management — pause, resume, cancel
- [ ] Per-contact outcome tracking — status, duration, outcome, notes

### Week 4–5: Campaign Dashboard

- [ ] Campaign list UI — all campaigns with status badges
- [ ] Campaign detail — real-time progress (called/remaining/success/failed)
- [ ] Campaign results — per-contact outcomes, exportable
- [ ] Contact list management — upload CSV, select from existing contacts
- [ ] Campaign scheduling UI — set start date, calling window, retry rules

### Phase 4 Deliverables
- ✅ Single outbound calls with AI script
- ✅ Batch campaign execution with retry
- ✅ TCPA-compliant calling windows
- ✅ Real-time campaign monitoring dashboard

---

## Phase 5: Billing & Subscriptions

**Duration:** 3–4 weeks  
**Dev Cost:** ~$43  
**Goal:** Paid plans, usage metering, invoicing, trial

### Week 1–2: Subscription Management

- [ ] Plans table — Starter ($29), Professional ($79), Business ($199), Enterprise (custom)
- [ ] Razorpay integration — subscription creation, plan changes, cancellation
- [ ] Stripe integration — for global payments (configurable from admin)
- [ ] Subscription lifecycle — subscribe, upgrade, downgrade, cancel with proration
- [ ] 14-day free trial implementation
- [ ] Plan feature enforcement — call limits, phone numbers, KB docs, team size
- [ ] Billing settings UI — current plan, payment method, plan comparison

### Week 3–4: Usage Metering + Invoicing

- [ ] Usage tracking — calls, minutes, SMS, recordings per tenant per billing cycle
- [ ] Usage counters — atomic increment, no double-counting
- [ ] Overage detection — notify tenant when approaching/exceeding limits
- [ ] Overage fee calculation per plan
- [ ] Invoice generation — PDF with line items, usage breakdown
- [ ] Invoice history UI — list, download, payment status
- [ ] Usage dashboard — current period usage vs limits, visual indicators
- [ ] Webhook handlers — Razorpay/Stripe payment events (success, failure, dispute)

### Phase 5 Deliverables
- ✅ 4-tier subscription system with Razorpay + Stripe
- ✅ Usage metering with overage fees
- ✅ Auto-generated PDF invoices
- ✅ 14-day free trial
- ✅ Plan enforcement across all features

---

## Phase 6: Analytics, Templates & Polish

**Duration:** 3–4 weeks  
**Dev Cost:** ~$54  
**Goal:** Production-ready dashboards, industry templates, onboarding wizard

### Week 1–2: Analytics + Reporting

- [ ] Call analytics — volume trends, duration distribution, peak hours, resolution rate
- [ ] AI performance — resolution rate, escalation rate, sentiment breakdown
- [ ] Appointment analytics — bookings/day, no-show rate, popular time slots
- [ ] Campaign analytics — success rate, avg call duration, conversion rate
- [ ] Charts with Recharts — line, bar, pie charts with date range filters
- [ ] Export — CSV and PDF report generation
- [ ] Super Admin analytics — platform-wide: total tenants, calls, revenue, churn

### Week 3–4: Templates + Onboarding + Polish

- [ ] 5 industry templates with pre-configured AI persona + instructions:
  - Hospital/Clinic — empathetic receptionist, emergency detection, HIPAA-aware
  - Sales Team — SDR persona, BANT qualification
  - Restaurant — friendly host, reservations, menu/allergen info
  - School — administrator, admissions, fee queries
  - E-commerce — support agent, order tracking, returns
- [ ] Onboarding wizard — step-by-step: create account → select template → configure AI → setup call forwarding → test call
- [ ] Call forwarding setup guide — carrier-specific instructions with screenshots
- [ ] Contacts management — CRUD, bulk CSV import, tags, VIP/blocked, call history per contact
- [ ] Notification system — post-call alerts, appointment reminders, usage warnings
- [ ] Notification templates — configurable per event type
- [ ] UI polish — loading states, error handling, empty states, responsive design
- [ ] Consent announcement — configurable recording disclosure per tenant jurisdiction

### Phase 6 Deliverables
- ✅ Full analytics dashboards (tenant + super admin)
- ✅ 5 industry templates
- ✅ Guided onboarding wizard
- ✅ Contact management with CSV import
- ✅ Notification system
- ✅ Production-ready UI

---

## Phase 7: Advanced (Ongoing)

**Duration:** Ongoing post-launch  
**Priority order based on revenue impact:**

### 7a: Integrations
- [ ] CRM sync — HubSpot (Business plan), Salesforce (Enterprise)
- [ ] Google Contacts / Outlook Contacts sync
- [ ] Zapier integration — trigger workflows on call events
- [ ] Tenant webhook system — push call events to tenant's endpoints

### 7b: Public API
- [ ] RESTful API for Enterprise tenants
- [ ] API key management
- [ ] OpenAPI 3.0 documentation
- [ ] Rate limiting per API key

### 7c: White Labeling (Enterprise)
- [ ] Custom branding — logo, colors, domain
- [ ] White-label dashboard theming
- [ ] Custom email templates with tenant branding

### 7d: Advanced Voice
- [ ] ElevenLabs TTS adapter — premium voice option for select tenants
- [ ] Voice cloning integration for enterprise
- [ ] Advanced language detection improvements

### 7e: Scale Infrastructure
- [ ] Managed PostgreSQL migration (Supabase/RDS) at 50+ tenants
- [ ] Kubernetes (EKS/GKE) at 100k calls/month
- [ ] ClickHouse for analytics at scale
- [ ] Read replicas for dashboard query load

---

## Cost Summary

### Development Phase (Phases 1–6)

| Phase | Duration | Monthly Cost | Phase Total |
|---|---|---|---|
| Phase 1: MVP | 6–8 weeks | $36 | $72 |
| Phase 2: Multi-Tenant + RAG | 4–6 weeks | $43 | $65 |
| Phase 3: Appointments | 3–4 weeks | $43 | $43 |
| Phase 4: Outbound + Campaigns | 4–5 weeks | $48 | $60 |
| Phase 5: Billing | 3–4 weeks | $43 | $43 |
| Phase 6: Analytics + Polish | 3–4 weeks | $54 | $54 |
| **Total** | **23–31 weeks** | | **~$337** |

### Production Monthly Cost (10k calls)

| Configuration | Monthly | Per Call |
|---|---|---|
| Full Quality (Stack 1) | $1,411 | $0.14 |
| Best Value Mix | $1,358 | $0.14 |
| Full Budget (Stack 2) | $811 | $0.08 |

### Scale Triggers

| Trigger | Action | Added Cost |
|---|---|---|
| 50+ tenants | Managed PostgreSQL | +$25–150/mo |
| 25k calls/mo | Second server, split API + DB | +$48/mo |
| $5k+ MRR | Negotiate Twilio volume pricing | Saves ~$200/mo |
| 100k calls/mo | Kubernetes auto-scaling | +$200–400/mo |
| Healthcare tenants | HIPAA-compliant infra | +$100–300/mo |
| Global expansion | Add Stripe alongside Razorpay | +2.9%/txn |

---

## Key Architecture Decisions

1. **Provider abstraction from Day 1** — External services stay behind interfaces, with Twilio fixed for telephony and AI providers configurable per tenant or globally.
2. **Monolith-first** — All services in one Fastify server initially. Extract microservices only at scale triggers.
3. **PostgreSQL for everything** — Relational data + pgvector for RAG + RLS for tenant isolation. No separate vector DB needed.
4. **BullMQ for all async work** — Reminders, campaigns, post-call processing, notifications. One queue system.
5. **Streaming-first voice pipeline** — WebSocket audio streaming, not REST. Critical for <1.5s round-trip.
6. **RLS over application-level filtering** — Database enforces tenant isolation, not just application code.

---

*AI Phone Assistant SaaS Platform — Development Plan v1.0 — April 2026*
