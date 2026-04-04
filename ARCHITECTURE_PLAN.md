# Enterprise Architecture Plan

## Purpose

This document defines the architecture for restructuring the phone-assistant codebase into an enterprise-grade, multi-tenant SaaS platform. It covers backend restructuring, frontend portal separation, authentication, authorization, data modeling, observability, and phased rollout.

## Executive Summary

The phone-assistant project is an AI-powered phone assistant SaaS with a Fastify backend and a Next.js dashboard. The current codebase is a working MVP with no auth, a flat backend structure, and a single mixed dashboard.

This plan restructures the system into:

- one Fastify backend organized by business domain
- one marketing website (public)
- one authenticated product app with admin and super admin experiences
- shared packages for UI primitives and API contracts
- secure cookie-based session auth
- structured logging, centralized error handling, and audit trails

The rollout is phased so the system is deployable and testable after every phase.

---

## Architecture Decisions

### Decision 1: Fastify stays as the backend

Next.js API routes are not suitable for real-time WebSocket audio streaming, BullMQ workers, or the provider abstraction layer already built. Fastify handles all of these well. The frontend consumes the backend via REST.

### Decision 2: Two frontend apps, not three

Use:

- `apps/web` — public marketing site plus login and signup
- `apps/app` — authenticated product app with route groups for tenant admin (`/admin/...`) and super admin (`/platform/...`)

This avoids the operational cost of three separate authenticated apps. Auth cookies, session handling, and local dev are simpler with one authenticated app. The super admin experience can be split into its own app later if a separate team or deployment cadence requires it.

### Decision 3: Domain-oriented backend modules

Backend modules are organized by business capability (calls, tenants, brand-profiles, providers), not by which portal uses them. A single module can expose different route sets for public, admin, and platform consumers. This prevents duplicated logic and makes the codebase easier to navigate.

### Decision 4: Cookie-based session auth

Use secure `httpOnly` cookies for session management instead of JWT stored in client memory. This eliminates XSS token theft risk, simplifies token refresh, and works naturally across the authenticated app. Short-lived access state can be derived server-side from the session.

### Decision 5: Platform roles and tenant roles are separate

Platform-level roles live on the `users` table as `platform_role`. Tenant-level roles live on the `tenant_members` table as `role`. The existing `users.role` column (which mixes super_admin with tenant roles) will be migrated and deprecated. See the Role Model section for full details.

### Decision 6: Selective abstraction

Use the repository pattern only where queries are reused, transactions are coordinated, or persistence logic is non-trivial. For simpler domains, use `queries.ts` and `commands.ts` files directly. Do not introduce a DI framework; use Fastify plugins and decorators for composition.

### Decision 7: Tests and observability before large migration

Add integration tests for existing endpoints, structured logging, and centralized error handling before moving folders. This creates a safety net that catches regressions during restructuring.

---

## Repository Layout

```
phone-assistant/
├── turbo.json
├── package.json                       # bun workspace root
│
├── apps/
│   ├── web/                           # Marketing website (port 3003)
│   │   ├── src/app/
│   │   │   ├── layout.tsx             # Public layout: navbar + footer
│   │   │   ├── page.tsx               # Landing page
│   │   │   ├── pricing/page.tsx       # Plan comparison
│   │   │   ├── about/page.tsx         # About the product
│   │   │   ├── login/page.tsx         # Login form
│   │   │   └── signup/page.tsx        # Registration form
│   │   ├── src/components/
│   │   │   ├── navbar.tsx
│   │   │   └── footer.tsx
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── app/                           # Authenticated product app (port 3001)
│       ├── src/app/
│       │   ├── layout.tsx             # Root: SessionProvider wrapper
│       │   ├── page.tsx               # Post-auth redirect (admin or platform)
│       │   │
│       │   ├── admin/                 # Tenant admin experience
│       │   │   ├── layout.tsx         # TenantProvider + admin sidebar
│       │   │   ├── dashboard/page.tsx
│       │   │   ├── calls/
│       │   │   │   ├── page.tsx       # Call logs (tenant-filtered)
│       │   │   │   └── [id]/page.tsx  # Call detail
│       │   │   ├── contacts/page.tsx
│       │   │   ├── settings/
│       │   │   │   ├── brand/page.tsx
│       │   │   │   ├── assistant/page.tsx
│       │   │   │   ├── hours/page.tsx
│       │   │   │   └── phone-numbers/page.tsx
│       │   │   ├── team/page.tsx
│       │   │   ├── billing/page.tsx
│       │   │   └── usage/page.tsx
│       │   │
│       │   └── platform/             # Super admin experience
│       │       ├── layout.tsx         # Platform sidebar, platform role guard
│       │       ├── dashboard/page.tsx
│       │       ├── tenants/
│       │       │   ├── page.tsx
│       │       │   ├── [id]/page.tsx
│       │       │   └── create/page.tsx
│       │       ├── plans/page.tsx
│       │       ├── providers/page.tsx
│       │       ├── billing/page.tsx
│       │       ├── analytics/page.tsx
│       │       └── audit/page.tsx
│       │
│       ├── src/components/
│       │   ├── admin-sidebar.tsx
│       │   ├── platform-sidebar.tsx
│       │   └── session-provider.tsx
│       ├── middleware.ts              # Session cookie validation, role routing
│       ├── next.config.ts
│       └── package.json
│
├── packages/
│   ├── ui/                            # @phone-assistant/ui
│   │   ├── src/
│   │   │   ├── components/            # shadcn primitives (button, card, table, etc.)
│   │   │   ├── data-table.tsx         # Feature-rich data table
│   │   │   ├── section-cards.tsx      # Stat card grid
│   │   │   ├── chart-area-interactive.tsx
│   │   │   ├── nav-main.tsx
│   │   │   ├── nav-secondary.tsx
│   │   │   ├── nav-user.tsx
│   │   │   ├── site-header.tsx
│   │   │   ├── hooks/use-mobile.ts
│   │   │   ├── lib/utils.ts           # cn() helper
│   │   │   ├── styles.css             # Theme CSS variables
│   │   │   └── index.ts               # Barrel export
│   │   ├── components.json            # shadcn config for monorepo
│   │   └── package.json
│   │
│   ├── contracts/                     # @phone-assistant/contracts
│   │   ├── src/
│   │   │   ├── schemas/               # Zod request/response schemas
│   │   │   │   ├── auth.ts
│   │   │   │   ├── calls.ts
│   │   │   │   ├── brand.ts
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── plans.ts
│   │   │   │   └── contacts.ts
│   │   │   ├── types/                 # Inferred TypeScript types
│   │   │   │   ├── auth.ts
│   │   │   │   ├── calls.ts
│   │   │   │   ├── brand.ts
│   │   │   │   ├── tenants.ts
│   │   │   │   ├── plans.ts
│   │   │   │   └── contacts.ts
│   │   │   ├── enums.ts               # Shared enums
│   │   │   ├── api-paths.ts           # Route path constants
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── config/                        # @phone-assistant/config
│       ├── tsconfig/
│       │   ├── base.json
│       │   └── nextjs.json
│       └── package.json
│
├── src/                               # Fastify backend
│   ├── server.ts                      # Entry point: calls buildServer + listen
│   │
│   ├── app/                           # Application bootstrap
│   │   ├── build-server.ts            # Creates Fastify instance, registers all plugins and routes
│   │   └── plugins/
│   │       ├── cors.ts                # CORS with credentials
│   │       ├── helmet.ts              # Security headers
│   │       ├── logging.ts             # Request logging with request IDs
│   │       ├── errors.ts              # Centralized error handler
│   │       ├── auth.ts                # Session cookie verification decorator
│   │       ├── csrf.ts                # CSRF protection
│   │       ├── request-context.ts     # Attach requestId, user, tenant to request
│   │       └── rate-limit.ts          # Rate limiting
│   │
│   ├── shared/                        # Cross-cutting, no business ownership
│   │   ├── config/
│   │   │   ├── env.ts
│   │   │   ├── database.ts
│   │   │   └── redis.ts
│   │   ├── db/
│   │   │   ├── schema.ts
│   │   │   ├── seed.ts
│   │   │   ├── seed-config.ts
│   │   │   └── migrations/           # Drizzle Kit migration files
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   └── errors.ts
│   │   ├── logging/
│   │   │   └── logger.ts
│   │   ├── auth/
│   │   │   ├── session.ts
│   │   │   ├── password.ts
│   │   │   └── guards.ts
│   │   ├── types/
│   │   │   ├── fastify.d.ts
│   │   │   ├── providers.ts
│   │   │   └── common.ts
│   │   └── utils/
│   │       ├── pagination.ts
│   │       └── validation.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.schemas.ts
│   │   │   └── index.ts
│   │   ├── tenants/
│   │   │   ├── tenants.routes.ts
│   │   │   ├── tenants.service.ts
│   │   │   ├── tenants.queries.ts
│   │   │   ├── tenants.commands.ts
│   │   │   ├── tenants.schemas.ts
│   │   │   └── index.ts
│   │   ├── memberships/
│   │   │   ├── memberships.routes.ts
│   │   │   ├── memberships.service.ts
│   │   │   ├── memberships.queries.ts
│   │   │   ├── memberships.schemas.ts
│   │   │   └── index.ts
│   │   ├── calls/
│   │   │   ├── calls.routes.ts
│   │   │   ├── calls.service.ts
│   │   │   ├── calls.queries.ts
│   │   │   ├── calls.commands.ts
│   │   │   ├── calls.schemas.ts
│   │   │   ├── voice-pipeline.ts
│   │   │   ├── call-language.ts
│   │   │   ├── post-call.service.ts
│   │   │   └── index.ts
│   │   ├── contacts/
│   │   │   ├── contacts.routes.ts
│   │   │   ├── contacts.service.ts
│   │   │   ├── contacts.queries.ts
│   │   │   ├── contacts.schemas.ts
│   │   │   └── index.ts
│   │   ├── brand-profiles/
│   │   │   ├── brand.routes.ts
│   │   │   ├── brand.service.ts
│   │   │   ├── brand.schemas.ts
│   │   │   └── index.ts
│   │   ├── assistant-settings/
│   │   │   ├── assistant.routes.ts
│   │   │   ├── assistant.service.ts
│   │   │   ├── assistant.schemas.ts
│   │   │   └── index.ts
│   │   ├── working-hours/
│   │   │   ├── hours.routes.ts
│   │   │   ├── hours.queries.ts
│   │   │   ├── hours.commands.ts
│   │   │   ├── hours.schemas.ts
│   │   │   └── index.ts
│   │   ├── phone-numbers/
│   │   │   ├── numbers.routes.ts
│   │   │   ├── numbers.service.ts
│   │   │   ├── numbers.queries.ts
│   │   │   ├── numbers.schemas.ts
│   │   │   └── index.ts
│   │   ├── providers/
│   │   │   ├── providers.routes.ts
│   │   │   ├── providers.service.ts
│   │   │   ├── providers.schemas.ts
│   │   │   ├── registry.ts
│   │   │   ├── telephony/
│   │   │   ├── stt/
│   │   │   ├── tts/
│   │   │   ├── llm/
│   │   │   ├── audio/
│   │   │   └── index.ts
│   │   ├── plans/
│   │   │   ├── plans.routes.ts
│   │   │   ├── plans.service.ts
│   │   │   ├── plans.queries.ts
│   │   │   ├── plans.schemas.ts
│   │   │   └── index.ts
│   │   ├── billing/
│   │   │   ├── billing.routes.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.queries.ts
│   │   │   ├── billing.commands.ts
│   │   │   ├── billing.schemas.ts
│   │   │   └── index.ts
│   │   ├── audit/
│   │   │   ├── audit.routes.ts
│   │   │   ├── audit.service.ts
│   │   │   ├── audit.queries.ts
│   │   │   ├── audit.schemas.ts
│   │   │   └── index.ts
│   │   ├── recordings/
│   │   │   ├── recording.service.ts
│   │   │   └── index.ts
│   │   └── webhooks/
│   │       ├── twilio.webhook.ts
│   │       ├── call-stream.ws.ts
│   │       └── index.ts
│   │
│   └── jobs/
│       ├── workers.ts
│       └── post-call.job.ts
│
├── docs/
│   ├── admin-super-admin-gap-analysis.md
│   └── adr/
│       ├── 001-two-frontend-apps.md
│       ├── 002-domain-modules.md
│       ├── 003-cookie-session-auth.md
│       └── 004-selective-repositories.md
│
├── docker-compose.yml
├── drizzle.config.ts
├── DEVELOPMENT_PLAN.md
└── ARCHITECTURE_PLAN.md
```

---

## Role Model

### Source of truth

There are exactly two sources of role truth:

| Column | Table | Purpose |
|---|---|---|
| `platform_role` | `users` | Platform-level privilege (nullable — most users have none) |
| `role` | `tenant_members` | Tenant-level privilege within a specific tenant |

### Migration from current schema

The current `users.role` column mixes platform and tenant roles in a single enum (`super_admin`, `tenant_admin`, `tenant_manager`, `tenant_viewer`). This must be migrated:

1. Add `platform_role` column to `users` (nullable enum: `platform_super_admin`, `platform_support`).
2. For any user where `users.role = 'super_admin'`, set `users.platform_role = 'platform_super_admin'`.
3. For all other users, their tenant role already exists on `tenant_members.role`. No data change needed.
4. Drop the `users.role` column after migration is verified.
5. Rename `tenant_members.role` enum values to `tenant_admin`, `tenant_manager`, `tenant_viewer` (these already match, so no data change needed — just ensure the old `super_admin` value is removed from this enum).

After migration, the `userRoleEnum` is replaced by two enums:

```
platformRoleEnum: platform_super_admin, platform_support
tenantRoleEnum: tenant_admin, tenant_manager, tenant_viewer
```

### Platform roles

| Role | Description |
|---|---|
| `platform_super_admin` | Full platform access. Can manage all tenants, plans, providers, billing, audit. Can impersonate tenants. |
| `platform_support` | Read-only platform access. Can view tenant details, call logs, audit logs. Can initiate safe impersonation (read-only, time-limited). Cannot modify tenants, plans, or providers. |

### Tenant roles

| Role | Description |
|---|---|
| `tenant_admin` | Full tenant access. Can manage brand, assistant, team, billing, settings. Can invite and remove members. |
| `tenant_manager` | Operational access. Can view/manage calls, contacts, brand settings. Cannot manage team, billing, or sensitive settings. |
| `tenant_viewer` | Read-only access. Can view calls, contacts, dashboard. Cannot modify anything. |

### Permission matrix

| Route group | `platform_super_admin` | `platform_support` | `tenant_admin` | `tenant_manager` | `tenant_viewer` |
|---|---|---|---|---|---|
| `POST /auth/login` | yes | yes | yes | yes | yes |
| `GET /admin/dashboard` | no (redirect to /platform) | no | yes | yes | yes |
| `GET /admin/calls` | no | no | yes | yes | yes |
| `PUT /admin/brand` | no | no | yes | yes | no |
| `PUT /admin/assistant` | no | no | yes | no | no |
| `PUT /admin/working-hours` | no | no | yes | no | no |
| `GET /admin/team` | no | no | yes | no | no |
| `POST /admin/team/invite` | no | no | yes | no | no |
| `GET /admin/billing` | no | no | yes | no | no |
| `GET /admin/contacts` | no | no | yes | yes | yes |
| `POST /admin/contacts` | no | no | yes | yes | no |
| `GET /platform/dashboard` | yes | yes | no | no | no |
| `GET /platform/tenants` | yes | yes | no | no | no |
| `POST /platform/tenants` | yes | no | no | no | no |
| `PUT /platform/tenants/:id` | yes | no | no | no | no |
| `POST /platform/tenants/:id/suspend` | yes | no | no | no | no |
| `GET /platform/plans` | yes | yes | no | no | no |
| `POST /platform/plans` | yes | no | no | no | no |
| `GET /platform/providers` | yes | yes | no | no | no |
| `PUT /platform/providers` | yes | no | no | no | no |
| `GET /platform/audit` | yes | yes | no | no | no |
| `GET /platform/analytics` | yes | yes | no | no | no |
| `POST /platform/impersonate` | yes | yes (read-only) | no | no | no |

### Route-level enforcement

```typescript
// Platform routes — both super_admin and support can access reads
fastify.register(async (scoped) => {
  scoped.addHook('preHandler', requireAuth)
  scoped.addHook('preHandler', requirePlatformRole('platform_super_admin', 'platform_support'))

  // Read-only routes (both roles)
  scoped.register(tenantPlatformReadRoutes, { prefix: '/tenants' })
  scoped.register(auditPlatformRoutes, { prefix: '/audit' })
  scoped.register(analyticsPlatformRoutes, { prefix: '/analytics' })

  // Write routes (super_admin only)
  scoped.register(async (writeScoped) => {
    writeScoped.addHook('preHandler', requirePlatformRole('platform_super_admin'))
    writeScoped.register(tenantPlatformWriteRoutes, { prefix: '/tenants' })
    writeScoped.register(planPlatformWriteRoutes, { prefix: '/plans' })
    writeScoped.register(providerPlatformWriteRoutes, { prefix: '/providers' })
  })
}, { prefix: '/api/v1/platform' })
```

---

## Authentication

### Session flow

1. User posts credentials to `POST /api/v1/auth/login`.
2. Server validates password with `Bun.password.verify()` (argon2).
3. Server creates a session record in the `sessions` table with a cryptographically random token.
4. Server sets an `httpOnly`, `Secure` (in production), `SameSite=Lax` cookie containing the signed session ID.
5. On each request, the auth plugin reads the cookie, validates the signature, looks up the session in the database, and attaches `request.user` with `{ userId, email, name, platformRole, activeTenantId }`.
6. Logout deletes the session record and clears the cookie.

### Session configuration

| Setting | Value | Reason |
|---|---|---|
| Cookie `httpOnly` | true | Prevents JavaScript access (XSS protection) |
| Cookie `Secure` | true in production, false in dev | HTTPS only in production |
| Cookie `SameSite` | Lax | Allows same-site and top-level navigation requests |
| Cookie `Path` | / | Available on all routes |
| Cookie `Domain` | `.phoneassistant.ai` in prod, omitted in dev | Cross-subdomain in production |
| Session TTL | 7 days, sliding window | Extended on each authenticated request |
| Session rotation | On password change, role change, impersonation | Prevents session fixation |

### CSRF Protection

Cookie-based auth requires CSRF protection on all state-changing routes (POST, PUT, DELETE, PATCH).

Strategy: **Origin / Referer validation + custom header requirement**.

1. The CSRF plugin (`src/app/plugins/csrf.ts`) checks all non-GET/HEAD/OPTIONS requests.
2. It validates the `Origin` header (or `Referer` if Origin is absent) against the allowed origins list.
3. It requires a custom header `X-Requested-With: XMLHttpRequest` on all mutating API requests. This header cannot be sent by cross-origin forms or simple requests, which provides CSRF protection without tokens.
4. The frontend API client always includes this header.

This approach is simpler than double-submit tokens and equally effective because:

- Browsers enforce CORS preflight for requests with custom headers.
- An attacker's page cannot send `X-Requested-With` cross-origin without a preflight, which will be rejected by the CORS policy.

For extra-sensitive actions (password change, billing mutations, impersonation):

- Require re-authentication (password re-entry) within the last 5 minutes.
- Log the action to audit with full request context.

### CORS Configuration

```typescript
{
  origin: (origin, callback) => {
    const allowed = [
      process.env.APP_URL,   // http://localhost:3001 in dev
      process.env.WEB_URL,   // http://localhost:3003 in dev
    ]
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'), false)
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'X-Requested-With'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}
```

### Local Development Cookie Topology

In local development, the backend (port 3000), app (port 3001), and web (port 3003) all run on `localhost` but different ports.

**Strategy: Single-origin dev setup through Next.js rewrites.**

The `apps/app/next.config.ts` proxies API requests to the backend:

```typescript
{
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3000/api/:path*',
      },
    ]
  },
}
```

This means:

- In development, the frontend calls `/api/v1/auth/login` on its own origin (port 3001).
- Next.js proxies the request to the Fastify backend on port 3000.
- Cookies are set on `localhost:3001`, which is the same origin as the frontend. No cross-origin cookie issues.
- No `lvh.me` subdomains or reverse proxy needed.
- CORS is not involved for proxied requests (same origin).

The marketing site (`apps/web`, port 3003) also configures the same rewrite. Login on the marketing site sets cookies on `localhost:3003`. After login, the frontend redirects to `localhost:3001` where the user must log in again (or the session cookie can be shared via a token-in-URL handoff during redirect — a one-time-use token that the app exchanges for a session).

**Production** uses subdomain cookies (`.phoneassistant.ai`), which share cookies across `app.phoneassistant.ai` and `phoneassistant.ai` naturally.

---

## Active Tenant Semantics

### How active tenant is selected

1. On login, the auth service queries `tenant_members` for all tenants the user belongs to.
2. If the user belongs to exactly one tenant, that tenant is automatically set as the active tenant.
3. If the user belongs to multiple tenants, the most recently accessed tenant is set as active (stored in the session record as `active_tenant_id`).
4. If the user has no tenant memberships but has a `platform_role`, they proceed without an active tenant (platform-only experience).

### How tenant switching works

1. The frontend calls `POST /api/v1/auth/switch-tenant` with the target `tenantId`.
2. The backend validates that the user is a member of the target tenant via `tenant_members`.
3. If valid, the session record is updated with the new `active_tenant_id`.
4. The session token is rotated (new cookie set) to prevent session fixation.
5. The response includes the new tenant context. The frontend reloads with the new tenant data.

### Where active tenant is stored

The active tenant ID is stored in the `sessions` table as `active_tenant_id`. It is NOT stored in the cookie itself. The cookie contains only the session ID; the backend resolves the tenant from the session record on every request.

### Server-side validation

On every authenticated request:

1. The auth plugin reads the session and extracts `active_tenant_id`.
2. The tenant context plugin validates that the user still has a membership in that tenant (membership could have been revoked since the session was created).
3. If the membership no longer exists, the session is updated to clear `active_tenant_id` and a 403 is returned.
4. The `request.tenant` object is populated with `{ id, name, slug, role }` where `role` comes from `tenant_members`.

### Platform users viewing tenant data

When a `platform_super_admin` or `platform_support` user views a specific tenant (e.g. `/platform/tenants/:id`), the tenant context comes from the route parameter, not from session membership. The guard verifies the user has a platform role, not a tenant membership.

---

## Data Model

### Tables to keep (with modifications noted)

#### `users` — modified

Add:

- `platform_role` — nullable enum (`platform_super_admin`, `platform_support`)

Remove (after migration):

- `role` — the old mixed enum

All other columns unchanged.

#### `tenants` — unchanged

#### `tenant_members` — modified

Update `role` enum values to use only: `tenant_admin`, `tenant_manager`, `tenant_viewer`. Remove `super_admin` from this enum.

#### All other existing tables — unchanged

`tenant_working_hours`, `phone_numbers`, `ai_assistants`, `contacts`, `calls`, `call_messages`, `brand_profiles`, `provider_config` — keep as-is.

### New tables

#### `sessions`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users, cascade |
| token_hash | VARCHAR(64) | SHA-256 hash of session token, unique |
| active_tenant_id | UUID | FK → tenants, nullable |
| ip_address | VARCHAR(45) | Client IP (supports IPv6) |
| user_agent | TEXT | |
| last_active_at | TIMESTAMP | Updated on each request (sliding window) |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

Indexes: `token_hash` (unique), `user_id`, `expires_at` (for cleanup job)

#### `tenant_invitations`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, cascade |
| email | VARCHAR | Invitee email |
| role | ENUM | tenant_admin, tenant_manager, tenant_viewer |
| invited_by | UUID | FK → users |
| token | VARCHAR | Unique invitation token |
| status | ENUM | pending, accepted, expired, revoked |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

Indexes: `token` (unique), `tenant_id + email` (unique, prevents duplicate invites)

#### `plans`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| name | VARCHAR | Display name (Starter, Business, Enterprise) |
| slug | VARCHAR | URL-safe identifier, unique |
| description | TEXT | |
| is_active | BOOLEAN | Whether available for new signups |
| sort_order | INTEGER | Display order |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

No `features` JSONB column. Feature availability is derived solely from `entitlements`. This prevents drift between two sources of truth.

#### `plan_prices`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| plan_id | UUID | FK → plans, cascade |
| interval | ENUM | monthly, yearly |
| currency | VARCHAR(3) | ISO 4217 |
| amount_cents | INTEGER | Price in smallest currency unit |
| is_active | BOOLEAN | |
| created_at | TIMESTAMP | |

Index: `plan_id + interval + currency` (unique)

#### `entitlements`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| plan_id | UUID | FK → plans, cascade |
| feature_key | VARCHAR | e.g. call_minutes, team_members, phone_numbers, kb_documents |
| limit_value | INTEGER | NULL if unlimited |
| is_unlimited | BOOLEAN | |

Index: `plan_id + feature_key` (unique)

**Entitlements are the single source of truth for what a plan includes.** The frontend pricing page, the admin billing page, and the backend enforcement logic all read from this table. There is no separate `features` JSONB to maintain.

#### `billing_accounts`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, unique, cascade |
| stripe_customer_id | VARCHAR | Nullable until Stripe is integrated |
| billing_email | VARCHAR | |
| billing_name | VARCHAR | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

#### `subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, cascade |
| plan_id | UUID | FK → plans |
| status | ENUM | trialing, active, past_due, canceled, paused |
| current_period_start | TIMESTAMP | |
| current_period_end | TIMESTAMP | |
| trial_end | TIMESTAMP | Nullable |
| canceled_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Index: `tenant_id`, `status`

#### `subscription_events`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| subscription_id | UUID | FK → subscriptions, cascade |
| event_type | ENUM | created, activated, upgraded, downgraded, paused, resumed, canceled, expired, payment_failed |
| from_plan_id | UUID | Nullable |
| to_plan_id | UUID | Nullable |
| metadata | JSONB | |
| created_at | TIMESTAMP | |

Index: `subscription_id + created_at`

Append-only. Never update or delete rows.

#### `invoices`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, cascade |
| subscription_id | UUID | FK → subscriptions, nullable |
| amount_cents | INTEGER | |
| currency | VARCHAR(3) | |
| status | ENUM | draft, open, paid, void, uncollectible |
| due_date | DATE | |
| paid_at | TIMESTAMP | Nullable |
| created_at | TIMESTAMP | |

Index: `tenant_id + status`

#### `usage_events`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, cascade |
| metric_key | VARCHAR | call_minutes, ai_tokens, storage_bytes |
| quantity | NUMERIC | |
| event_time | TIMESTAMP | When the usage occurred |
| metadata | JSONB | Call ID, provider, etc. Max 4 KB |
| created_at | TIMESTAMP | |

Index: `tenant_id + metric_key + event_time`

Append-only. Never update or delete rows.

#### `usage_rollups`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants, cascade |
| metric_key | VARCHAR | |
| period_start | DATE | |
| period_end | DATE | |
| total_quantity | NUMERIC | Pre-aggregated sum |
| updated_at | TIMESTAMP | |

Index: `tenant_id + metric_key + period_start` (unique)

Computed periodically from `usage_events` by a scheduled job.

#### `audit_logs`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| tenant_id | UUID | Nullable (null for platform-level actions) |
| actor_id | UUID | FK → users |
| actor_role | VARCHAR | Role at the time of action |
| action | VARCHAR | e.g. tenant.created, brand.updated, member.invited |
| resource_type | VARCHAR | e.g. tenant, brand_profile, subscription |
| resource_id | VARCHAR | |
| before | JSONB | State before change, redacted (nullable). Max 8 KB |
| after | JSONB | State after change, redacted (nullable). Max 8 KB |
| request_id | VARCHAR | Correlation ID from request |
| ip_address | VARCHAR(45) | |
| user_agent | TEXT | |
| metadata | JSONB | Additional context. Max 4 KB |
| created_at | TIMESTAMP | |

Indexes: `tenant_id + created_at`, `actor_id`, `action`, `created_at`

Append-only. Never update or delete rows.

#### `idempotency_keys`

| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| key | VARCHAR | Client-provided idempotency key, unique |
| resource_type | VARCHAR | What was created |
| resource_id | VARCHAR | ID of created resource |
| response_code | INTEGER | HTTP status returned |
| response_body | JSONB | Redacted response. Max 4 KB |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | Auto-cleanup after 48 hours |

Index: `key` (unique), `expires_at` (for cleanup job)

Enforced at: webhook handlers (Twilio status callbacks), billing mutations (subscription changes, invoice payments), tenant creation.

---

## Audit and Data Redaction Policy

### Fields that must never appear in audit logs or idempotency responses

- `password_hash` or any password-derived value
- session tokens or session IDs
- API keys, secrets, or credentials (Twilio, Deepgram, Groq, OpenAI, R2)
- credit card numbers, CVVs, or full payment details
- invitation tokens
- any field from `provider_config.config` JSONB (contains API keys)

### Fields that must be masked

- email addresses: show first 3 characters + domain (`him***@example.com`)
- phone numbers: show last 4 digits (`***-***-1234`)
- IP addresses: store full in audit logs (needed for security), but mask in API responses to non-super-admin users

### Payload size limits

- `audit_logs.before` and `audit_logs.after`: max 8 KB each. If the original object exceeds this, store only the changed fields plus their immediate parent keys.
- `audit_logs.metadata`: max 4 KB.
- `usage_events.metadata`: max 4 KB.
- `idempotency_keys.response_body`: max 4 KB. Strip any nested objects that contain user data.

### Implementation

The audit service exposes a `redact(obj, sensitiveKeys)` utility that:

1. Deep-clones the object.
2. Removes keys in the forbidden list entirely.
3. Masks keys in the mask list.
4. Truncates the result to the max payload size.
5. Returns the redacted object.

All modules call `auditService.log()` with raw objects; the redaction happens inside the service, not at the call site.

---

## Error Handling

### AppError base class

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public isOperational: boolean = true,
    public details?: Record<string, unknown>
  ) {
    super(message)
  }
}
```

### Domain errors

| Error Class | Status | Code |
|---|---|---|
| NotFoundError | 404 | not_found |
| UnauthorizedError | 401 | unauthorized |
| ForbiddenError | 403 | forbidden |
| ValidationError | 400 | validation_error |
| ConflictError | 409 | conflict |
| RateLimitError | 429 | rate_limited |

### Error response shape

```json
{
  "error": {
    "code": "not_found",
    "message": "Tenant with ID abc-123 was not found.",
    "details": {}
  }
}
```

Non-operational errors (bugs, unhandled exceptions) return a generic 500 with `code: "internal_error"` and a generic message. The full stack trace is logged server-side but never exposed to the client.

---

## Logging and Observability

### Structured logging

- Pino as the logger (Fastify's built-in)
- JSON output in production, `pino-pretty` in development
- Child loggers per module: `logger.child({ module: 'calls' })`
- Request ID generated on every request via `crypto.randomUUID()`
- All log entries include: `requestId`, `module`, `level`, `timestamp`
- Sensitive fields (passwords, tokens, API keys) must never appear in logs

### Request logging

Every request logs:

```json
{
  "requestId": "abc-123",
  "method": "GET",
  "url": "/api/v1/admin/calls",
  "statusCode": 200,
  "responseTime": 42,
  "userId": "user-456",
  "tenantId": "tenant-789"
}
```

### Health endpoints

- `GET /health` — liveness check (responds 200 if the process is running)
- `GET /health/ready` — readiness check (validates DB connection, Redis connection, provider config loaded)

### Future observability (post-Phase 6)

- Prometheus-compatible metrics endpoint
- Job queue metrics (pending, active, completed, failed)
- Webhook delivery success/failure rates
- External error tracking (Sentry or equivalent)

---

## API Design

### Versioning

All API routes are prefixed with `/api/v1/`. When breaking changes are needed, introduce `/api/v2/` routes alongside v1 and deprecate v1 with a timeline. Do not version internally with feature flags in v1 routes.

### Pagination

List endpoints return:

```json
{
  "data": [],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

Query parameters: `?limit=20&offset=0&sort=createdAt&order=desc`

### Rate limiting

| Endpoint | Limit |
|---|---|
| POST /auth/login | 10 per minute per IP |
| POST /auth/register | 5 per minute per IP |
| All authenticated routes | 100 per minute per user |
| Webhook endpoints | 200 per minute per IP |

Rate limiting is implemented in Phase 1 (auth endpoints) and extended to all routes in Phase 6.

### Request validation

Every route validates its input with Zod schemas via a Fastify `preValidation` hook. Validation covers body, params, and query. Validation errors return 400 with field-level details.

---

## Database Migration Policy

### Rules

1. **Production is migration-only.** The `db:push` command must never be used outside disposable local development environments. All schema changes go through `drizzle-kit generate` → `drizzle-kit migrate`.
2. **Migrations are backward-compatible.** Use expand/contract changes: add the new column (expand), deploy the code that writes to both old and new, then remove the old column (contract) in a subsequent release. This ensures the previous app version continues to work during rollout.
3. **Migrations run before app deploy.** The CI/CD pipeline runs migrations as a separate step before deploying the new app version.
4. **Every migration is tested.** Migration tests verify that the migration applies cleanly on a fresh database and on a database with production-representative data.
5. **No data loss in migration.** Migrations that remove columns must first verify that no production code reads from those columns. Use a two-phase approach: deprecate in code first, remove the column in a later migration.

### Local development

- `db:push` is acceptable for rapid iteration on schema changes during development.
- Before committing, generate a proper migration with `db:generate` and test it with `db:migrate` on a fresh database.

---

## Testing Strategy

### Test infrastructure

- Use a real ephemeral PostgreSQL test database (not in-memory). Spin up a test container via Docker or use a dedicated test database.
- Use transaction rollback or a disposable database per test suite. Each test suite begins a transaction, runs its tests, and rolls back. This ensures isolation without the cost of recreating the database.
- Use a test Redis instance (or the same Redis with a test key prefix).
- Use Fastify's built-in `inject()` for route integration tests (no HTTP overhead).

### Test priority

#### Priority 1: Auth and access control

- Login with valid credentials returns session cookie
- Login with invalid credentials returns 401
- Accessing authenticated route without cookie returns 401
- Accessing admin route as `tenant_viewer` returns 403 for write operations
- Accessing platform route as `tenant_admin` returns 403
- Session expiry causes 401
- Tenant switching validates membership

#### Priority 2: Tenant scoping

- Call listing returns only the current tenant's calls
- Brand profile updates only affect the current tenant
- Contact CRUD is tenant-isolated
- Team management is tenant-isolated
- A user in tenant A cannot access tenant B's data

#### Priority 3: Business logic

- Call state machine transitions
- Post-call processing (summary, sentiment)
- Provider config resolution (global → tenant override)
- Working hours evaluation

#### Priority 4: Integration

- Webhook handling (Twilio inbound, status)
- WebSocket audio streaming
- Recording upload to R2
- BullMQ job processing

---

## Frontend Migration: Dashboard Deletion Criteria

The old `dashboard/` directory must NOT be deleted until all of the following are true:

### Route parity checklist

- [ ] `/` (home dashboard) → `apps/app/admin/dashboard` renders equivalent KPIs
- [ ] `/calls` → `apps/app/admin/calls` renders call list with all columns and filters
- [ ] `/calls/:id` → `apps/app/admin/calls/:id` renders call detail with transcript, audio player, metadata
- [ ] `/settings/brand` → `apps/app/admin/settings/brand` renders brand profile editor with JSON import/export, all dynamic list editors
- [ ] `/settings/ai` → `apps/app/platform/providers` renders provider selection with cost breakdowns

### Auth works end-to-end

- [ ] Login on `apps/web` sets session cookie
- [ ] Redirect to `apps/app` works
- [ ] All admin routes are session-protected
- [ ] All platform routes require platform role
- [ ] Logout clears session

### Key screens load data

- [ ] Dashboard loads tenant-scoped stats (not hardcoded)
- [ ] Call list loads from tenant-filtered API
- [ ] Brand profile loads from session tenant (no manual ID input)
- [ ] Provider config loads for super admin

### Smoke tests pass

- [ ] `turbo build` succeeds for all apps
- [ ] `turbo dev` starts all apps on correct ports
- [ ] Navigation between admin pages works
- [ ] Navigation between platform pages works
- [ ] API calls from frontend reach backend through proxy/CORS

Only after all checkboxes are confirmed does `dashboard/` get deleted.

---

## Marketing Website Pages

### Landing page (`/`)

1. **Hero**: Headline, subheadline, primary CTA (Start Free Trial), secondary CTA (See Pricing)
2. **Social proof bar**: Customer count, call volume, uptime
3. **Feature highlights**: AI Voice Assistant, Multi-Tenant, Provider Agnostic, Real-Time Analytics
4. **How it works**: Sign Up → Configure → Go Live
5. **Use cases**: Healthcare, Legal, Real Estate, Hospitality
6. **Pricing preview**: 3 plan cards with key features
7. **Testimonials**: 2-3 quotes
8. **Final CTA**: Sign up section

### Pricing page (`/pricing`)

| Feature | Starter ($29/mo) | Business ($79/mo) | Enterprise ($199/mo) | Custom |
|---|---|---|---|---|
| Phone numbers | 1 | 3 | 10 | Unlimited |
| Call minutes | 500 | 2,000 | 10,000 | Custom |
| Team members | 1 | 5 | 25 | Custom |
| AI voice options | 2 | All | All + custom | Custom |
| Knowledge base docs | 50 | 200 | Unlimited | Unlimited |
| Call recordings | 30 days | 90 days | 1 year | Custom |
| Analytics | Basic | Advanced | Advanced + export | Custom |
| API access | No | No | Yes | Yes |
| Priority support | No | Email | Phone + email | Dedicated |

Feature availability is driven by `entitlements` table. This page reads from the plans API.

### Login page (`/login`)

Email, password, submit. On success: session cookie set, redirect to `apps/app`.

### Signup page (`/signup`)

Business name, full name, email, password. Creates user + tenant + trial subscription. Sets session cookie. Redirects to `apps/app/admin/dashboard`.

---

## Port Assignments (Local Development)

| Service | Port |
|---|---|
| Fastify backend | 3000 |
| Authenticated app | 3001 |
| Marketing website | 3003 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Drizzle Studio | 4983 |

---

## Production Deployment

| Service | Platform | Domain |
|---|---|---|
| Fastify backend | Railway / Fly.io / AWS | `api.phoneassistant.ai` |
| Authenticated app | Vercel | `app.phoneassistant.ai` |
| Marketing website | Vercel (SSG/ISR) | `phoneassistant.ai` |
| PostgreSQL | Neon / Supabase / RDS | Internal |
| Redis | Upstash / ElastiCache | Internal |
| R2 storage | Cloudflare R2 | Internal |

Cookie domain: `.phoneassistant.ai`

---

## Architecture Guardrails

### Import boundaries

- Modules must not import from other modules' internal files.
- Modules can import from `@phone-assistant/contracts`, `src/shared/*`, or another module's `index.ts` barrel export.

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Module folder | kebab-case, plural | `brand-profiles/` |
| Route file | `<domain>.routes.ts` | `brand.routes.ts` |
| Service file | `<domain>.service.ts` | `brand.service.ts` |
| Schema file | `<domain>.schemas.ts` | `brand.schemas.ts` |
| Query file | `<domain>.queries.ts` | `brand.queries.ts` |
| Command file | `<domain>.commands.ts` | `brand.commands.ts` |
| DB table | snake_case, plural | `brand_profiles` |
| API route | kebab-case | `/api/v1/admin/brand-profiles` |
| Zod schema | camelCase + Schema | `createBrandSchema` |
| TypeScript type | PascalCase | `BrandProfile` |

### ADR (Architecture Decision Records)

Each significant decision gets a short ADR in `docs/adr/`. Format:

```
# ADR-NNN: Title
## Status: Accepted
## Context: Why this decision was needed.
## Decision: What we chose.
## Consequences: What changes as a result.
```

---

## Future Split Points

### When to separate platform into its own app

Split `apps/app/platform/` into `apps/platform/` only when:

- a separate team owns platform tooling
- independent deployment cadence is necessary
- security isolation requires separate infrastructure
- bundle size becomes a measurable problem

### When to add API gateway

Only when multiple backend services exist, rate limiting needs differ by customer tier, or geo-routing is needed.

### When to add microservices

Only when a module has a clearly different scaling profile, a team boundary aligns with a module boundary, or deployment independence would meaningfully reduce risk.

---

## Phased Rollout

### Phase 0: Stability Baseline

**Goal**: Make the current app safe to refactor.

1. Replace all `console.log/error/warn` with Pino structured logging
2. Add centralized error handler (`setErrorHandler` plugin)
3. Add request IDs to every request
4. Add route integration tests for all existing endpoints (calls, brand, assistant, providers)
5. Add tenant-scoping tests (verify call list filters by tenant)
6. Verify Drizzle Kit migration workflow (generate → migrate on fresh DB)
7. Add health/readiness endpoints

### Phase 1: Auth and Access Model

**Goal**: Secure the system.

1. Add `sessions` table, `platform_role` column on users
2. Migrate existing `users.role` data to `platform_role` and `tenant_members.role`
3. Create `src/shared/auth/` (session, password, guards)
4. Create auth plugin, CSRF plugin, rate-limit plugin
5. Create `src/modules/auth/` (register, login, logout, switch-tenant, me)
6. Add session cookie verification to all admin and platform routes
7. Add role guards matching the permission matrix
8. Remove manual tenant ID usage from brand/assistant routes
9. Add `tenant_invitations` table

### Phase 2: Backend Modularization

**Goal**: Clean architecture without changing product surface.

1. Create `src/shared/` — move config, db, errors, logging, auth, types, utils
2. Create `src/app/` — move server bootstrap, create plugin files
3. Create `src/modules/` — move each domain one at a time:
   - webhooks (lowest risk, move first)
   - recordings
   - calls (extract queries/commands from call.service.ts)
   - brand-profiles
   - assistant-settings
   - providers (move provider implementations + config service)
4. Create new modules with minimal initial implementation:
   - tenants, memberships, working-hours, phone-numbers, contacts
5. Move jobs to `src/jobs/`
6. Run all tests after each module move

### Phase 3: Frontend Restructure

**Goal**: Split product experiences.

1. Add Turborepo config
2. Create `packages/ui/` — move shadcn components and shared UI
3. Create `packages/contracts/` — move shared schemas and types
4. Create `packages/config/` — shared TypeScript configs
5. Create `apps/app/` with admin and platform route groups
6. Move existing dashboard pages to `apps/app/admin/`
7. Move provider config page to `apps/app/platform/`
8. Create admin-sidebar.tsx and platform-sidebar.tsx
9. Add session-provider.tsx and middleware.ts
10. Create `apps/web/` — scaffold marketing site
11. Wire login/signup pages to auth API
12. Run dashboard deletion checklist
13. Delete `dashboard/` only after all checklist items pass

### Phase 4: Tenant and Platform Foundations

**Goal**: Build missing management features.

1. Tenant CRUD routes (platform)
2. Team management routes (admin)
3. Working hours routes (admin)
4. Phone number management routes (admin)
5. Contacts CRUD routes (admin)
6. Frontend: tenant list, detail, create pages (platform)
7. Frontend: team, hours, phone numbers, contacts pages (admin)
8. Add `audit_logs` table and audit service
9. Write audit entries for all tenant and team mutations

### Phase 5: Billing Foundation

**Goal**: Plans and subscriptions production-ready.

1. Add plans, plan_prices, entitlements, billing_accounts, subscriptions, subscription_events, invoices, usage_events, usage_rollups, idempotency_keys tables
2. Plan catalog CRUD (platform)
3. Subscription lifecycle APIs
4. Usage event recording (call minutes, AI tokens)
5. Usage rollup computation (scheduled job)
6. Invoice generation
7. Frontend: plan editor (platform), billing ops (platform), plan/usage/invoices (admin)

### Phase 6: Audit, Analytics, and Hardening

**Goal**: Enterprise-grade operations.

1. Frontend: audit log viewer (platform)
2. Frontend: platform analytics dashboard
3. Frontend: tenant analytics with date filters (admin)
4. MFA for platform admins
5. Rate limiting on all endpoints
6. Webhook signature verification (Twilio)
7. Webhook replay protection (idempotency enforcement)
8. ADR documents for all key decisions
9. Import boundary lint rules
