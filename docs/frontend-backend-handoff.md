# Frontend Developer Handoff

## Current Status

The backend restructuring for `ARCHITECTURE_PLAN.md` Phases 0, 1, and 2 is complete.

The frontend restructure in Phase 3 is not developed yet.

What exists today:

| Area | Current state |
|---|---|
| Backend | Fastify backend is live and modularized under `src/app`, `src/shared`, `src/modules`, and `src/jobs` |
| Public web app | Not created yet |
| Authenticated app | Not created yet |
| Shared packages (`packages/ui`, `packages/contracts`, `packages/config`) | Not created yet |
| Legacy frontend | A single `dashboard/` Next.js app still exists and runs on port `3001`, but it is legacy and is not the Phase 3 target architecture |

Important frontend conclusion:

1. There is no new `apps/web` marketing app yet.
2. There is no new `apps/app` authenticated product app yet.
3. The backend in this document is the source of truth for frontend implementation.
4. The existing `dashboard/` app should be treated as a legacy reference only.

## What Frontend Developers Should Build Against

Use the backend running on:

- `http://localhost:3000` for the API server

Reserved frontend origins in local development:

- `http://localhost:3001` for the authenticated app
- `http://localhost:3003` for the public web app

Current backend env defaults are defined in `.env.example`:

| Variable | Default |
|---|---|
| `PORT` | `3000` |
| `APP_URL` | `http://localhost:3001` |
| `WEB_URL` | `http://localhost:3003` |
| `SESSION_COOKIE_NAME` | `phone_assistant_session` |
| `SESSION_TTL_DAYS` | `7` |
| `RATE_LIMIT_WINDOW_MS` | `900000` |
| `AUTH_RATE_LIMIT_MAX` | `20` |

If frontend developers run the UI from a different origin, backend CORS and CSRF origin checks will block mutating requests until `APP_URL` or `WEB_URL` is updated.

## Local Development Setup

### Backend prerequisites

The backend expects:

- Postgres on `localhost:5432`
- Redis on `localhost:6379`

Local infra is provided by `docker-compose.yml`.

### Seeded users

The seed script creates:

| User type | Email | Password |
|---|---|---|
| Platform super admin | `admin@himanshurawat.in` | `test@123` by default |
| Tenant admin | Comes from the active seed config (default Melp config, or a custom `SEED_CONFIG_PATH`) | `test@123` by default unless the seed config provides `tenantAdmin.password` or `tenantAdmin.passwordHash` |

Default tenant seed currently uses the Melp tenant configuration.

### Current legacy dashboard

The existing legacy frontend is:

- Directory: `dashboard/`
- Framework: Next.js
- Dev port: `3001`

Important caveat:

The legacy dashboard still assumes some old endpoints that are no longer the correct contract for the new frontend. In particular, do not treat these old paths as authoritative:

- `/api/v1/admin/tenants/:tenantId/brand`
- `/api/v1/admin/tenants/:tenantId/assistant`

The new platform-scoped paths are:

- `/api/v1/platform/tenants/:tenantId/brand`
- `/api/v1/platform/tenants/:tenantId/assistant`

## Backend Structure

The backend is organized as follows:

| Path | Purpose |
|---|---|
| `src/app/` | Fastify bootstrap and cross-cutting plugins |
| `src/shared/` | Config, database, auth helpers, errors, types, logging, utilities |
| `src/modules/auth/` | Registration, login, logout, current user, tenant switching |
| `src/modules/calls/` | Call listing, call detail, call recording, outbound call initiation, voice pipeline |
| `src/modules/brand-profiles/` | Tenant brand profile CRUD |
| `src/modules/assistant-settings/` | Assistant language settings |
| `src/modules/providers/` | Global provider config and tenant provider overrides |
| `src/modules/tenants/` | Platform tenant CRUD |
| `src/modules/memberships/` | Tenant team listing and invite creation |
| `src/modules/working-hours/` | Tenant working hours |
| `src/modules/phone-numbers/` | Tenant phone number list and upsert |
| `src/modules/contacts/` | Tenant contact list, detail, create, update |
| `src/modules/webhooks/` | Twilio webhooks and media stream WebSocket |
| `src/modules/recordings/` | Recording retrieval and storage |
| `src/jobs/` | BullMQ background jobs |

## Runtime and Request Lifecycle

### Boot sequence

The Fastify app registers:

1. WebSocket support
2. CORS
3. Helmet
4. Request context decoration
5. Rate limiting
6. Session auth resolution
7. CSRF checks
8. Routes
9. Centralized error handler

### System endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness check |
| `GET` | `/ready` | Public | Readiness check for DB and Redis |

### Non-frontend endpoints

These are not browser-facing product APIs:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/webhooks/twilio/voice` | Twilio inbound voice webhook |
| `POST` | `/webhooks/twilio/status` | Twilio call status webhook |
| `GET` | `/ws/call-stream` | Twilio media stream WebSocket |

Frontend developers do not need to call these directly.

## Frontend Integration Contract

### Base URL

Current frontend should call:

- `http://localhost:3000`

In the future, the authenticated app should likely proxy or rewrite `/api/*` to the backend for same-origin development, but that is not implemented yet in this repository.

### Authentication model

Authentication uses a secure `httpOnly` cookie.

What that means for frontend:

1. Do not store tokens in localStorage.
2. Do not send `Authorization` headers.
3. Always use `credentials: 'include'` on API requests.
4. The browser manages the session cookie automatically.

### Headers required by mutating requests

For `POST`, `PUT`, `PATCH`, and `DELETE` requests to `/api/*`, frontend must send:

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `X-Requested-With` | `XMLHttpRequest` |

Why this matters:

- The backend uses `Origin` or `Referer` validation plus `X-Requested-With` for CSRF protection.
- If `X-Requested-With` is missing, mutating requests will fail.

### CORS

CORS allows:

- `APP_URL`
- `WEB_URL`

Current defaults:

- `http://localhost:3001`
- `http://localhost:3003`

Allowed methods:

- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`
- `OPTIONS`

Allowed headers:

- `Content-Type`
- `X-Requested-With`

### Error format

The backend returns errors in this shape:

```json
{
  "error": "Human readable message",
  "code": "machine_readable_code",
  "details": {}
}
```

Validation failures return:

```json
{
  "error": "Invalid request payload.",
  "code": "validation_error",
  "details": {
    "formErrors": [],
    "fieldErrors": {}
  }
}
```

`details` uses the backend's Zod flattened error shape, so frontend code can reliably read `formErrors` and `fieldErrors`.

Generic server failures return:

```json
{
  "error": "Internal server error.",
  "code": "internal_server_error"
}
```

### Response conventions

Common response envelopes:

| Shape | Meaning |
|---|---|
| `{ "data": ... }` | Read response |
| `{ "success": true, "data": ... }` | Mutating success response |
| `{ "data": [...], "limit": 50, "offset": 0 }` | Paginated list response for calls |

### Data conventions

| Field type | Convention |
|---|---|
| IDs | UUID strings |
| Timestamps | ISO strings when serialized to JSON |
| Time values | `HH:MM` strings |
| Phone numbers | Strings, usually E.164-style |
| Nullable DB fields | Usually serialize as `null` |

## Auth and Session Details

### Session cookie behavior

The cookie:

- name: `phone_assistant_session`
- is `httpOnly`
- uses `SameSite=Lax`
- uses `Secure` only in production
- is valid for 7 days by default

The cookie payload stores:

- session id
- random token
- HMAC signature

The backend stores:

- token hash
- active tenant id
- IP address
- user agent
- session timestamps

### Active tenant model

The current authenticated session always has an active tenant when the user has tenant membership.

Behavior:

1. On login, if the user belongs to one or more tenants, the first membership becomes the active tenant.
2. `GET /api/v1/auth/me` returns both `tenant` and `memberships`.
3. `POST /api/v1/auth/switch-tenant` changes the active tenant in the session.
4. All `/api/v1/admin/*` routes use `request.tenant` from the session. They do not accept tenant id in the request path anymore.

Frontend implication:

- Admin pages should always load against the active tenant from `/api/v1/auth/me`.
- Tenant switch UI should call `/api/v1/auth/switch-tenant` and then refresh page-level data.

### Role model

Platform roles:

| Role | Meaning |
|---|---|
| `platform_super_admin` | Full platform write access |
| `platform_support` | Read-only platform access |

Tenant roles:

| Role | Meaning |
|---|---|
| `tenant_admin` | Full tenant access |
| `tenant_manager` | Operational tenant access |
| `tenant_viewer` | Read-only tenant access |

### Auth object shapes

`user` from `/api/v1/auth/me`:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "User Name",
  "platformRole": "platform_super_admin",
  "activeTenantId": "uuid-or-null",
  "sessionId": "uuid"
}
```

`tenant` from `/api/v1/auth/me`:

```json
{
  "id": "uuid",
  "name": "Tenant Name",
  "slug": "tenant-slug",
  "role": "tenant_admin"
}
```

`memberships` from `/api/v1/auth/me`:

```json
[
  {
    "id": "uuid",
    "name": "Tenant Name",
    "slug": "tenant-slug",
    "role": "tenant_admin"
  }
]
```

## API Reference

## Auth APIs

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | `{ email, password, name }` | `{ success: true, data: { user, memberships, tenant } }` |
| `POST` | `/api/v1/auth/login` | Public | `{ email, password }` | `{ success: true, data: { user, memberships, tenant } }` |
| `POST` | `/api/v1/auth/logout` | Authenticated | none | `{ success: true }` |
| `POST` | `/api/v1/auth/switch-tenant` | Authenticated | `{ tenantId }` | `{ success: true, data: { tenant } }` |
| `GET` | `/api/v1/auth/me` | Authenticated | none | `{ data: { user, tenant, memberships } }` |

Important notes:

1. `register` creates a user but does not create tenant membership.
2. A newly registered user may have no tenant and no platform role.
3. Frontend should handle a no-access state after registration if no memberships exist.

## Calls APIs

Preferred frontend paths are the non-admin aliases:

| Method | Path | Auth and role | Request | Response | Notes |
|---|---|---|---|---|---|
| `GET` | `/api/v1/calls` | Authenticated tenant user: `tenant_admin`, `tenant_manager`, `tenant_viewer` | Query: `limit`, `offset` | `{ data, limit, offset }` | Tenant-scoped; sorted by `startedAt desc` |
| `GET` | `/api/v1/calls/:id` | Same as above | none | `{ data: callWithMessages }` | Tenant-scoped |
| `GET` | `/api/v1/calls/:id/recording` | Same as above | none | Binary `audio/wav` | Returns recording file, not JSON |
| `POST` | `/api/v1/calls/outbound` | `tenant_admin`, `tenant_manager` | `{ to, from?, publicBaseUrl? }` | `{ success: true, data: { callId, providerCallSid, to, from, publicBaseUrl } }` | `publicBaseUrl` is required in most local dev cases |

Backward compatibility aliases also exist:

- `GET /api/v1/admin/calls`
- `GET /api/v1/admin/calls/:id`

Call entity fields returned today:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | Call id |
| `tenantId` | UUID | Owning tenant |
| `contactId` | UUID or `null` | Linked contact |
| `direction` | `inbound` or `outbound` | |
| `status` | `ringing`, `in_progress`, `completed`, `failed`, `no_answer`, `busy`, `voicemail` | |
| `callerNumber` | string | |
| `dialedNumber` | string | |
| `providerCallSid` | string or `null` | Twilio SID |
| `provider` | `twilio` | |
| `durationSec` | number or `null` | |
| `recordingUrl` | string or `null` | |
| `recordingKey` | string or `null` | Not always needed by UI |
| `transcript` | string or `null` | |
| `summary` | string or `null` | Generated asynchronously after call |
| `sentiment` | `positive`, `neutral`, `negative`, or `null` | Generated asynchronously |
| `aiResolved` | boolean or `null` | Generated asynchronously |
| `metadata` | object | |
| `startedAt` | ISO timestamp | |
| `endedAt` | ISO timestamp or `null` | |
| `createdAt` | ISO timestamp | |

Call messages returned in `GET /api/v1/calls/:id`:

| Field | Type |
|---|---|
| `id` | UUID |
| `callId` | UUID |
| `role` | string, currently `caller` or `assistant` |
| `content` | string |
| `timestamp` | ISO timestamp |

Call lifecycle notes:

1. `summary`, `sentiment`, `aiResolved`, and `recordingUrl` may be null immediately after a call ends.
2. Post-call processing runs asynchronously in a BullMQ job.
3. Frontend should support eventual consistency for completed calls.

## Brand Profile APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/brand` | `tenant_admin`, `tenant_manager`, `tenant_viewer` | none | `{ data, tenant }` |
| `PUT` | `/api/v1/admin/brand` | `tenant_admin`, `tenant_manager` | `BrandProfileInput` | `{ success: true, data, tenant }` |
| `GET` | `/api/v1/platform/tenants/:tenantId/brand` | `platform_super_admin`, `platform_support` | none | `{ data, tenant }` |
| `PUT` | `/api/v1/platform/tenants/:tenantId/brand` | `platform_super_admin` | `BrandProfileInput` | `{ success: true, data, tenant }` |

`BrandProfileInput` shape:

```json
{
  "businessName": "string",
  "tagline": "string",
  "industry": "string",
  "description": "string",
  "website": "string",
  "email": "hello@example.com",
  "phone": "+15555550100",
  "addresses": [
    {
      "label": "Main Location",
      "address": "123 Main St",
      "phone": "+15555550100"
    }
  ],
  "services": [
    {
      "name": "Consultation",
      "description": "Description",
      "price": "Starting at $100",
      "duration": "30 minutes"
    }
  ],
  "policies": [
    {
      "title": "Cancellation Policy",
      "content": "Policy text"
    }
  ],
  "faqs": [
    {
      "question": "Question",
      "answer": "Answer"
    }
  ],
  "staff": [
    {
      "name": "Staff Name",
      "role": "Role",
      "department": "Department",
      "specialty": "Specialty"
    }
  ],
  "brandVoice": {
    "toneKeywords": [],
    "wordsToUse": [],
    "wordsToAvoid": [],
    "samplePhrases": []
  },
  "escalationRules": [
    {
      "trigger": "When X happens",
      "action": "Do Y"
    }
  ]
}
```

Brand notes:

1. `GET` may return `data: null` if the tenant has not configured a brand profile yet.
2. Saving a brand profile also updates default assistant persona fields behind the scenes.

## Assistant Settings APIs

Current assistant API is intentionally minimal.

It does not expose all columns from `ai_assistants`.

What it exposes today:

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/assistant` | `tenant_admin`, `tenant_manager`, `tenant_viewer` | none | `{ data, tenant }` |
| `PUT` | `/api/v1/admin/assistant` | `tenant_admin` | `{ primaryLanguage, multilingualEnabled }` | `{ success: true, data, tenant }` |
| `GET` | `/api/v1/platform/tenants/:tenantId/assistant` | `platform_super_admin`, `platform_support` | none | `{ data, tenant }` |
| `PUT` | `/api/v1/platform/tenants/:tenantId/assistant` | `platform_super_admin` | `{ primaryLanguage, multilingualEnabled }` | `{ success: true, data, tenant }` |

Current response fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `tenantId` | UUID |
| `primaryLanguage` | string |
| `multilingualEnabled` | boolean |
| `updatedAt` | ISO timestamp |

Assistant gap to note:

The table contains more fields such as `personaName`, `personaTone`, `greetingMessage`, `afterHoursMessage`, `systemPrompt`, `voiceId`, `recordingEnabled`, and `consentAnnouncement`, but these are not yet exposed by the API.

## Contacts APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/contacts` | `tenant_admin`, `tenant_manager`, `tenant_viewer` | none | `{ data: Contact[] }` |
| `GET` | `/api/v1/admin/contacts/:id` | same as above | none | `{ data: Contact }` |
| `POST` | `/api/v1/admin/contacts` | `tenant_admin`, `tenant_manager` | `ContactUpsertInput` | `{ success: true, data: Contact }` |
| `PUT` | `/api/v1/admin/contacts/:id` | `tenant_admin`, `tenant_manager` | `ContactUpsertInput` | `{ success: true, data: Contact }` |

`ContactUpsertInput`:

```json
{
  "name": "Jane Doe",
  "phone": "+15555550123",
  "email": "jane@example.com",
  "company": "Acme Inc",
  "tags": ["vip", "returning"],
  "isVip": true,
  "isBlocked": false,
  "notes": "Optional notes"
}
```

Current gaps:

1. No delete endpoint.
2. No search endpoint.
3. No pagination yet.

## Team APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/team` | `tenant_admin` | none | `{ data: TeamMember[] }` |
| `POST` | `/api/v1/admin/team/invite` | `tenant_admin` | `{ email, role }` | `{ success: true, data: TenantInvitation }` |

`TeamMember` fields returned today:

| Field | Type |
|---|---|
| `id` | UUID |
| `email` | string |
| `name` | string |
| `role` | `tenant_admin`, `tenant_manager`, or `tenant_viewer` |

`TenantInvitation` fields returned today:

| Field | Type |
|---|---|
| `id` | UUID |
| `tenantId` | UUID |
| `email` | string |
| `role` | tenant role |
| `invitedBy` | UUID |
| `token` | string |
| `status` | `pending`, `accepted`, `expired`, `revoked` |
| `expiresAt` | ISO timestamp |
| `createdAt` | ISO timestamp |

Important limitation:

This API creates invitation records only.

There is currently:

- no invitation acceptance endpoint
- no invitation revoke endpoint
- no invitation list endpoint
- no email delivery flow

Frontend implication:

The team page can create invites and show current members, but the full invite lifecycle is not finished yet.

## Working Hours APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/working-hours` | `tenant_admin`, `tenant_manager`, `tenant_viewer` | none | `{ data: WorkingHour[] }` |
| `PUT` | `/api/v1/admin/working-hours` | `tenant_admin` | `WorkingHour[]` | `{ success: true, data: WorkingHour[] }` |

`WorkingHour` shape:

```json
{
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "18:00",
  "isActive": true
}
```

Important behavior:

`PUT /api/v1/admin/working-hours` replaces the entire working-hours collection for the active tenant.

Frontend should send the full array, not a partial patch.

## Phone Number APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/admin/phone-numbers` | `tenant_admin` | none | `{ data: PhoneNumber[] }` |
| `PUT` | `/api/v1/admin/phone-numbers` | `tenant_admin` | `PhoneNumberUpsertInput` | `{ success: true, data: PhoneNumber[] }` |

`PhoneNumberUpsertInput`:

```json
{
  "number": "+15555550100",
  "provider": "twilio",
  "providerSid": "PNxxxxxxxx",
  "forwardingNumber": "+15555550999",
  "isActive": true
}
```

Important behavior:

1. The operation is an upsert by phone number.
2. The response returns the full list for the tenant.
3. There is no delete endpoint yet.

## Platform Tenant APIs

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/platform/tenants` | `platform_super_admin`, `platform_support` | none | `{ data: Tenant[] }` |
| `GET` | `/api/v1/platform/tenants/:id` | same as above | none | `{ data: Tenant }` |
| `POST` | `/api/v1/platform/tenants` | `platform_super_admin` | `{ name, slug, industry?, timezone }` | `{ success: true, data: Tenant }` |
| `PUT` | `/api/v1/platform/tenants/:id` | `platform_super_admin` | `{ name, slug, industry?, timezone }` | `{ success: true, data: Tenant }` |

Current `Tenant` fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `slug` | string |
| `industry` | string or `null` |
| `isActive` | boolean |
| `timezone` | string |
| `telephonyProvider` | `twilio` or `null` |
| `sttProvider` | `deepgram`, `groq`, `openai`, or `null` |
| `createdAt` | ISO timestamp |
| `updatedAt` | ISO timestamp |

Current gaps:

1. No suspend endpoint.
2. No delete endpoint.
3. No pagination or search endpoint.

## Platform Provider APIs

Use the platform routes for the future platform UI.

Admin aliases still exist for compatibility, but new platform UI should use `/platform/*`.

| Method | Path | Auth and role | Request | Response |
|---|---|---|---|---|
| `GET` | `/api/v1/platform/providers` | `platform_super_admin`, `platform_support` | none | `{ data: GlobalProviderConfig }` |
| `PUT` | `/api/v1/platform/providers` | `platform_super_admin` | `{ telephonyProvider?, sttProvider?, ttsProvider? }` | `{ success: true, data: GlobalProviderConfig }` |
| `PUT` | `/api/v1/platform/tenants/:tenantId/providers` | `platform_super_admin` | `{ telephonyProvider?, sttProvider? }` | `{ success: true }` |

`GlobalProviderConfig`:

```json
{
  "telephony": "twilio",
  "stt": "deepgram",
  "tts": "groq",
  "llm": "groq"
}
```

Provider notes:

1. Global provider config exposes `telephony`, `stt`, `tts`, and `llm`.
2. Tenant overrides currently support only `telephonyProvider` and `sttProvider`.
3. Tenant-level `tts` and `llm` overrides do not exist yet.

Compatibility aliases:

- `GET /api/v1/admin/providers`
- `PUT /api/v1/admin/providers`

These are useful only if the legacy dashboard still needs them.

## Role-to-Route Access Summary

| Area | Read access | Write access |
|---|---|---|
| Auth session | Any authenticated user for `/me`, `/logout`, `/switch-tenant` | Any authenticated user |
| Calls | `tenant_admin`, `tenant_manager`, `tenant_viewer` | Outbound calling: `tenant_admin`, `tenant_manager` |
| Brand | `tenant_admin`, `tenant_manager`, `tenant_viewer` | `tenant_admin`, `tenant_manager` |
| Assistant settings | `tenant_admin`, `tenant_manager`, `tenant_viewer` | `tenant_admin` |
| Contacts | `tenant_admin`, `tenant_manager`, `tenant_viewer` | `tenant_admin`, `tenant_manager` |
| Working hours | `tenant_admin`, `tenant_manager`, `tenant_viewer` | `tenant_admin` |
| Team | `tenant_admin` | `tenant_admin` |
| Phone numbers | `tenant_admin` | `tenant_admin` |
| Platform tenants | `platform_super_admin`, `platform_support` | `platform_super_admin` |
| Platform providers | `platform_super_admin`, `platform_support` | `platform_super_admin` |
| Platform tenant brand | `platform_super_admin`, `platform_support` | `platform_super_admin` |
| Platform tenant assistant | `platform_super_admin`, `platform_support` | `platform_super_admin` |

## Recommended Frontend Page Mapping

This is the practical page map the frontend team can implement now.

### Public/authenticated entry pages

| Frontend page | Backend dependency | Status |
|---|---|---|
| Login page | `POST /api/v1/auth/login` | Ready |
| Signup page | `POST /api/v1/auth/register` | Ready |
| Session bootstrap | `GET /api/v1/auth/me` | Ready |
| Logout action | `POST /api/v1/auth/logout` | Ready |
| Tenant switcher | `POST /api/v1/auth/switch-tenant` | Ready |

### Admin app pages

| Frontend page | Backend dependency | Status |
|---|---|---|
| Admin call list | `GET /api/v1/calls` | Ready |
| Admin call detail | `GET /api/v1/calls/:id` | Ready |
| Call recording player | `GET /api/v1/calls/:id/recording` | Ready |
| Outbound call form | `POST /api/v1/calls/outbound` | Ready |
| Brand settings | `GET/PUT /api/v1/admin/brand` | Ready |
| Assistant settings | `GET/PUT /api/v1/admin/assistant` | Ready |
| Contacts list/detail/edit | `GET/POST/PUT /api/v1/admin/contacts*` | Ready |
| Working hours settings | `GET/PUT /api/v1/admin/working-hours` | Ready |
| Team members and invite | `GET /api/v1/admin/team`, `POST /api/v1/admin/team/invite` | Partially ready |
| Phone number settings | `GET/PUT /api/v1/admin/phone-numbers` | Ready |
| Admin dashboard summary | No dedicated API | Not ready |
| Billing page | No API | Not ready |
| Usage page | No API | Not ready |

### Platform app pages

| Frontend page | Backend dependency | Status |
|---|---|---|
| Platform tenant list | `GET /api/v1/platform/tenants` | Ready |
| Platform tenant detail | `GET /api/v1/platform/tenants/:id` | Ready |
| Platform tenant create/edit | `POST/PUT /api/v1/platform/tenants*` | Ready |
| Platform provider settings | `GET/PUT /api/v1/platform/providers` | Ready |
| Platform tenant brand view/edit | `/api/v1/platform/tenants/:tenantId/brand` | Ready |
| Platform tenant assistant view/edit | `/api/v1/platform/tenants/:tenantId/assistant` | Ready |
| Platform tenant provider overrides | `PUT /api/v1/platform/tenants/:tenantId/providers` | Ready |
| Platform dashboard | No API | Not ready |
| Plans | No API | Not ready |
| Billing | No API | Not ready |
| Analytics | No API | Not ready |
| Audit log | No API | Not ready |

## End-to-End Flows Frontend Should Implement

## Flow 1: Login bootstrap

1. Submit `POST /api/v1/auth/login` with `credentials: 'include'`.
2. Browser stores the session cookie automatically.
3. Call `GET /api/v1/auth/me`.
4. Route based on the response:
   - if `user.platformRole` exists and the user should use platform tools, route to platform UI
   - if `tenant` exists, route to admin UI
   - if both are missing, show no-access or onboarding state

## Flow 2: Tenant switching

1. Load memberships from `/api/v1/auth/me`.
2. User selects a tenant.
3. Submit `POST /api/v1/auth/switch-tenant` with `{ tenantId }`.
4. The backend rotates or refreshes the session cookie.
5. Refetch `/api/v1/auth/me`.
6. Refetch tenant-scoped admin data.

## Flow 3: Admin brand settings

1. Call `GET /api/v1/admin/brand`.
2. If `data` is null, render an empty form.
3. Submit `PUT /api/v1/admin/brand`.
4. Update local state from the response.

## Flow 4: Assistant settings

1. Call `GET /api/v1/admin/assistant`.
2. Edit only the currently supported fields:
   - `primaryLanguage`
   - `multilingualEnabled`
3. Submit `PUT /api/v1/admin/assistant`.

## Flow 5: Calls and call detail

1. Load paginated calls from `/api/v1/calls`.
2. Open detail via `/api/v1/calls/:id`.
3. If `recordingUrl` exists, stream `/api/v1/calls/:id/recording`.
4. If `summary` is null for a completed call, show a placeholder such as "processing".

## Flow 6: Platform tenant management

1. Load tenants via `/api/v1/platform/tenants`.
2. Load detail via `/api/v1/platform/tenants/:id`.
3. Optionally load brand and assistant detail via the platform tenant sub-routes.
4. Create or edit tenants with the platform tenant CRUD routes.

## Flow 7: Team invitation

1. Load current members via `/api/v1/admin/team`.
2. Invite via `/api/v1/admin/team/invite`.
3. Show invite status from the returned invitation record.
4. Do not assume invite acceptance is implemented yet.

## Database Reference

This section is included so frontend developers understand what data exists, what APIs expose, and what is still hidden behind backend-only implementation.

## Core relationships

| Table | Related to | Relationship |
|---|---|---|
| `users` | `tenant_members`, `sessions`, `tenant_invitations` | One user can belong to many tenants and many sessions |
| `tenants` | `tenant_members`, `brand_profiles`, `ai_assistants`, `tenant_working_hours`, `phone_numbers`, `contacts`, `calls`, `tenant_invitations` | Central tenant owner |
| `tenant_members` | `users`, `tenants` | Membership join table |
| `sessions` | `users`, optionally `tenants` | Active auth sessions |
| `contacts` | `tenants`, `calls` | Caller/customer records |
| `calls` | `tenants`, optionally `contacts`, `call_messages` | Call log |
| `call_messages` | `calls` | Conversation turns |
| `brand_profiles` | `tenants` | One-to-one tenant brand profile |
| `ai_assistants` | `tenants` | One-to-one tenant assistant config |
| `provider_config` | global | Global provider defaults |

## Table-by-table summary

### `users`

Purpose:

- Login identity
- Holds platform role

Key fields:

| Field | Type | Notes |
|---|---|---|
| `id` | UUID | PK |
| `email` | string | Unique |
| `passwordHash` | string | Backend only |
| `name` | string | |
| `platformRole` | nullable enum | `platform_super_admin` or `platform_support` |
| `isActive` | boolean | |

Frontend relevance:

- Exposed partially through auth APIs

### `tenants`

Purpose:

- Customer workspace / account

Key fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `slug` | string |
| `industry` | string or `null` |
| `isActive` | boolean |
| `timezone` | string |
| `telephonyProvider` | nullable enum |
| `sttProvider` | nullable enum |

### `tenant_members`

Purpose:

- User-to-tenant membership plus tenant role

Key fields:

| Field | Type |
|---|---|
| `tenantId` | UUID |
| `userId` | UUID |
| `role` | `tenant_admin`, `tenant_manager`, `tenant_viewer` |

Frontend relevance:

- Returned as `memberships` and `tenant.role`

### `sessions`

Purpose:

- Cookie-backed session storage

Key fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `userId` | UUID |
| `tokenHash` | string |
| `activeTenantId` | UUID or `null` |
| `ipAddress` | string or `null` |
| `userAgent` | string or `null` |
| `lastActiveAt` | timestamp |
| `expiresAt` | timestamp |

Frontend relevance:

- Not directly exposed except as current auth state

### `tenant_invitations`

Purpose:

- Invitation tracking for team invites

Key fields:

| Field | Type |
|---|---|
| `tenantId` | UUID |
| `email` | string |
| `role` | tenant role |
| `invitedBy` | UUID |
| `token` | string |
| `status` | `pending`, `accepted`, `expired`, `revoked` |
| `expiresAt` | timestamp |

Frontend relevance:

- Team invite response currently exposes this directly

### `tenant_working_hours`

Purpose:

- Open/closed schedule for a tenant

Key fields:

| Field | Type |
|---|---|
| `tenantId` | UUID |
| `dayOfWeek` | integer `0-6` |
| `startTime` | `HH:MM` |
| `endTime` | `HH:MM` |
| `isActive` | boolean |

### `phone_numbers`

Purpose:

- Tenant-owned inbound or outbound numbers

Key fields:

| Field | Type |
|---|---|
| `tenantId` | UUID or `null` |
| `number` | string |
| `provider` | `twilio` |
| `providerSid` | string or `null` |
| `forwardingNumber` | string or `null` |
| `isActive` | boolean |

### `ai_assistants`

Purpose:

- Voice assistant configuration per tenant

Key fields in DB:

| Field | Type |
|---|---|
| `tenantId` | UUID |
| `personaName` | string |
| `personaTone` | string |
| `greetingMessage` | string |
| `afterHoursMessage` | string |
| `systemPrompt` | string or `null` |
| `voiceId` | string |
| `maxCallDurationSec` | integer |
| `primaryLanguage` | string |
| `multilingualEnabled` | boolean |
| `recordingEnabled` | boolean |
| `consentAnnouncement` | boolean |

Frontend note:

The current assistant API exposes only a subset of these fields.

### `contacts`

Purpose:

- Known callers/customers per tenant

Key fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `tenantId` | UUID |
| `name` | string or `null` |
| `phone` | string |
| `email` | string or `null` |
| `company` | string or `null` |
| `tags` | string array |
| `isVip` | boolean |
| `isBlocked` | boolean |
| `notes` | string or `null` |

### `calls`

Purpose:

- Canonical call log record

Key fields:

| Field | Type |
|---|---|
| `id` | UUID |
| `tenantId` | UUID |
| `contactId` | UUID or `null` |
| `direction` | enum |
| `status` | enum |
| `callerNumber` | string |
| `dialedNumber` | string |
| `providerCallSid` | string or `null` |
| `recordingUrl` | string or `null` |
| `recordingKey` | string or `null` |
| `transcript` | string or `null` |
| `summary` | string or `null` |
| `sentiment` | enum or `null` |
| `aiResolved` | boolean or `null` |

### `call_messages`

Purpose:

- Individual conversational turns for a call

Key fields:

| Field | Type |
|---|---|
| `callId` | UUID |
| `role` | string |
| `content` | string |
| `timestamp` | timestamp |

### `brand_profiles`

Purpose:

- Detailed tenant brand and business knowledge

Key fields:

| Field | Type |
|---|---|
| `businessName` | string |
| `tagline` | string or `null` |
| `industry` | string or `null` |
| `description` | string or `null` |
| `website` | string or `null` |
| `email` | string or `null` |
| `phone` | string or `null` |
| `addresses` | JSON array |
| `services` | JSON array |
| `policies` | JSON array |
| `faqs` | JSON array |
| `staff` | JSON array |
| `brandVoice` | JSON object |
| `escalationRules` | JSON array |

### `provider_config`

Purpose:

- Global provider defaults

Key fields:

| Field | Type |
|---|---|
| `key` | `telephony`, `stt`, `tts`, `llm` |
| `provider` | string |
| `config` | JSON object |

Frontend note:

The `config` JSON is not currently used by frontend-facing APIs.

## Known Gaps and Important Caveats

### Frontend architecture gaps

These planned frontend pieces do not exist yet:

- `apps/web`
- `apps/app`
- `packages/ui`
- `packages/contracts`
- `packages/config`

### Backend/API gaps

These planned product areas do not have APIs yet:

- platform dashboard
- plans
- billing
- analytics
- audit logs
- admin dashboard summary
- admin billing
- admin usage
- invitation acceptance
- invitation revoke
- contact delete
- phone number delete
- tenant suspend

### Legacy dashboard mismatch

The `dashboard/` app is useful as a visual reference, but it is not aligned with the new backend contract.

Known mismatch examples:

| Legacy assumption | Current backend truth |
|---|---|
| brand by `/api/v1/admin/tenants/:tenantId/brand` | now platform-scoped: `/api/v1/platform/tenants/:tenantId/brand` |
| assistant by `/api/v1/admin/tenants/:tenantId/assistant` | now platform-scoped: `/api/v1/platform/tenants/:tenantId/assistant` |
| no cookie-auth assumptions | backend now requires cookie auth and CSRF header rules |

## Recommended Frontend Build Order

1. Build auth bootstrap around `/api/v1/auth/login`, `/api/v1/auth/me`, `/api/v1/auth/logout`, and `/api/v1/auth/switch-tenant`.
2. Build tenant admin flows next:
   - calls
   - call detail
   - brand settings
   - assistant settings
   - contacts
   - working hours
   - team list and invite
   - phone numbers
3. Build platform flows after that:
   - tenant list
   - tenant detail
   - tenant create/edit
   - providers
   - tenant brand and assistant inspection
4. Stub or mark as unavailable the pages that do not have backend APIs yet.

## Final Guidance for Frontend Developers

Treat the backend as a cookie-session application, not a bearer-token API.

The minimum frontend request configuration for almost all product actions is:

- base URL: backend origin
- `credentials: 'include'`
- `Content-Type: application/json`
- `X-Requested-With: XMLHttpRequest` for mutating requests

The best initial app bootstrap sequence is:

1. call `/api/v1/auth/me`
2. determine whether the user has:
   - platform access
   - tenant access
   - both
   - neither
3. route accordingly
4. refetch page data using the active tenant in the session

This document should be used as the working integration contract until the dedicated frontend apps and shared contract package are created.
