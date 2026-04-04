# Admin Panel vs Super Admin Panel Gap Analysis

## Goal

Split the current shared dashboard into:

1. `Admin Panel`
   Used by the customer account holder for one tenant: an individual, business owner, or enterprise team.
2. `Super Admin Panel`
   Used by the platform operator or application developer who sells and supports the product across all tenants.

## Recommended Boundary

### Admin Panel

This panel should manage one tenant only.

Core ownership:

- business profile and assistant behavior
- call logs, recordings, transcripts, summaries
- team members and tenant roles
- phone numbers, working hours, routing, escalation rules
- knowledge base and business data
- plan usage visibility, invoices, payment method, upgrade requests
- integrations used by that tenant

This panel must never manage:

- other tenants
- global providers
- plan catalog or pricing rules
- platform-wide analytics
- platform billing operations

### Super Admin Panel

This panel should manage the SaaS platform itself.

Core ownership:

- tenant lifecycle: create, activate, suspend, delete
- plan catalog: starter, business, enterprise, custom entitlements
- subscription operations: trials, upgrades, downgrades, credits, manual adjustments
- usage policy and plan enforcement
- global telephony, STT, TTS, LLM defaults
- tenant-level provider overrides
- platform analytics: tenants, revenue, churn, support load, failures
- admin support tools: impersonation, audit logs, billing exceptions, webhook diagnostics
- security controls for privileged admins

This panel must never become the place where day-to-day tenant business work happens.

## Research Summary

The split above matches common B2B SaaS patterns:

- Auth0 Organizations recommends modeling business customers as separate organizations, managing membership per organization, and building administration capabilities so those businesses can manage their own organization.
- Auth0 organization login flows explicitly support `Individuals`, `Business Users`, or `Both`, which fits your requirement to sell to individual users as well as businesses.
- Atlassian’s organization admin model centralizes management of users, apps, and audit activity at the organization level instead of mixing it with product-level work.
- Stripe Billing treats subscriptions, customer self-service billing, usage tracking, trials, invoices, and webhooks as first-class recurring billing concerns, which means your super admin panel should own the plan catalog while tenant admins should get a billing self-service view.
- Microsoft’s privileged account guidance treats global admin style accounts as highly privileged and suitable only for tightly controlled use, which is a strong argument for strict role separation, MFA, audit logs, and limited impersonation for super admins.

## Feature Split

### Admin Panel Features

Must-have:

- tenant dashboard with tenant-scoped KPIs
- call logs and call detail
- recordings and transcripts
- brand profile and AI persona settings
- language, voice, prompts, after-hours behavior
- working hours and holiday hours
- phone number routing and forwarding
- contacts and CRM-style notes
- team management inside the tenant
- billing page with current plan, usage, invoices, payment method
- upgrade and downgrade request flow

Business and enterprise additions:

- multiple locations or departments
- role-based staff access
- advanced analytics exports
- campaign and appointment features
- integrations and webhooks
- API keys for enterprise
- audit log for tenant actions

### Super Admin Panel Features

Must-have:

- tenant list with status, industry, plan, created date, health
- create tenant and seed onboarding
- assign plan, free trial, custom limits, coupons, credits
- plan catalog editor with entitlements
- plan enforcement rules for call minutes, users, numbers, KB documents, integrations
- billing operations dashboard
- global provider settings
- per-tenant provider overrides
- platform analytics dashboard
- audit log of privileged actions
- support tooling with safe impersonation or session handoff

Security and operations:

- super admin MFA
- break-glass emergency account policy
- webhook delivery logs
- failed job and queue monitoring
- storage and recording usage visibility
- environment and secrets status pages

## What Is Already Developed

### Backend foundations

- Multi-role schema exists: `super_admin`, `tenant_admin`, `tenant_manager`, `tenant_viewer`.
- Tenant membership table exists.
- Tenant-scoped tables already exist for calls, contacts, phone numbers, AI assistant config, working hours, and brand profiles.
- Global provider config exists through `provider_config`.
- There is a tenant-aware voice path already using tenant phone number ownership and tenant provider overrides.
- The seed script creates both a `super_admin` and a `tenant_admin`.

### Dashboard pages already present

- shared dashboard homepage
- call logs page
- call detail page
- brand profile page
- assistant language settings embedded into brand page
- global AI and provider configuration page

### Super-admin-like behavior already present

- global provider config API
- global provider config dashboard page
- tenant-specific provider override API

### Admin-like behavior already present

- tenant brand profile read and update
- tenant assistant language settings read and update
- tenant call browsing UI

## What Is Only Partial

- The database knows about roles, but the app does not enforce them yet.
- The code is tenant-aware in the backend data model, but the frontend is still one shared shell.
- The brand page is tenant-scoped, but it currently relies on a manual `Tenant ID` input instead of session-based tenant context.
- Provider configuration exists, but it is exposed through the same general dashboard instead of an isolated super admin experience.
- The roadmap mentions multi-tenant isolation, billing, and analytics, but the codebase does not implement most of those features yet.

## What Is Missing

### Missing for Admin Panel

- authentication
- session handling
- tenant-aware login and tenant picker
- role-based frontend route guards
- tenant-scoped API authorization
- member invitation and removal
- working hours settings UI
- phone number management UI
- billing page
- usage dashboard
- invoice history
- payment method management
- plan comparison and upgrade flow
- contacts CRUD UI
- knowledge base or RAG management
- tenant analytics with date filters
- notification center

### Missing for Super Admin Panel

- separate super admin layout and route group
- tenant CRUD API and UI
- tenant suspension and reactivation
- plan and entitlement tables
- subscription tables
- billing provider integration
- trial lifecycle
- usage metering and overage logic
- invoice generation
- platform analytics
- audit logs
- impersonation tooling
- support operations views
- privileged admin security controls

## Important Gaps Found In The Current Code

1. The server only registers calls, provider config, brand, and assistant routes. There is no auth, no tenant CRUD API, no billing API, and no member management API yet.
2. The call listing endpoint still returns all calls and is not tenant-filtered.
3. The current sidebar is static and hardcoded, so it cannot switch between admin and super admin navigation.
4. The brand profile page asks for a raw tenant ID manually and falls back to the first tenant, which is useful for local development but not safe for production.
5. The current AI settings page is effectively a super admin page because it updates global provider config.
6. The schema already includes `tenant_working_hours`, but there is no admin UI for it yet.
7. The schema has no plan, subscription, invoice, usage meter, entitlement, or audit log tables yet.
8. The roadmap document marks later phase deliverables as complete, but the code currently reflects an earlier implementation stage, so future planning should rely on code first.

## Recommended Route Split

Use separate app sections instead of a single mixed dashboard:

- `/app/...`
  Tenant admin panel
- `/platform/...`
  Super admin panel

Suggested tenant routes:

- `/app/dashboard`
- `/app/calls`
- `/app/contacts`
- `/app/settings/brand`
- `/app/settings/assistant`
- `/app/settings/hours`
- `/app/settings/phone-numbers`
- `/app/team`
- `/app/billing`
- `/app/usage`

Suggested super admin routes:

- `/platform/dashboard`
- `/platform/tenants`
- `/platform/tenants/[id]`
- `/platform/plans`
- `/platform/billing`
- `/platform/providers`
- `/platform/analytics`
- `/platform/audit`
- `/platform/support`

## Recommended Build Order

### Phase 1

- add auth and session handling
- add role-aware route guards
- introduce a current tenant context
- split dashboard shell into tenant admin and super admin layouts

### Phase 2

- build tenant CRUD for super admin
- build tenant member management for admin panel
- remove manual tenant ID entry from the dashboard

### Phase 3

- add plans, subscriptions, entitlements, usage meters, invoices
- build super admin plans and billing operations pages
- build tenant billing and usage pages

### Phase 4

- add platform analytics and audit logs
- add support tooling and impersonation
- add tenant analytics, exports, and notifications

## Sources

- Auth0 Organizations: https://auth0.com/docs/organizations
- Auth0 Login Flows for Organizations: https://auth0.com/docs/manage-users/organizations/login-flows-for-organizations
- Atlassian organization administration: https://support.atlassian.com/organization-administration/docs/how-do-organizations-work-for-atlassian-government/
- Atlassian audit logs: https://support.atlassian.com/security-and-access-policies/docs/audit-log-activities-database/
- Stripe subscriptions: https://docs.stripe.com/subscriptions
- Stripe usage-based billing: https://docs.stripe.com/billing/subscriptions/usage-based
- Stripe customer portal: https://docs.stripe.com/customer-management
- Stripe trials: https://docs.stripe.com/billing/subscriptions/trials
- Microsoft privileged admin guidance: https://learn.microsoft.com/en-us/entra/architecture/security-operations-privileged-accounts
