# Admin / Superadmin Market Analysis

Verified against live public sources on April 5, 2026.

Method:

- Official pricing pages, help centers, trust centers, and docs were used wherever possible.
- When an older official fact sheet conflicted with a newer official pricing page, the newer pricing page was treated as the source of truth.
- When a vendor exposed a public pricing page but the exact dollar amount was dynamically rendered and not extractable from the static crawl, that row is marked accordingly instead of guessing.

## Role Split

The clean split for this product is:

| Area | Superadmin portal (`/platform/*`) | Admin portal (`/app/*`) |
| --- | --- | --- |
| Primary job | Run the SaaS platform | Run one tenant's business operations |
| Account scope | Cross-tenant, platform-wide | Single tenant only |
| Portal visibility | Only platform staff | Only tenant users |
| Tenant creation | Yes | No |
| Admin creation | Yes, can create first admin or add admins to existing tenant | No, except team/invite flow inside their own tenant |
| Website signup | Not used for platform staff | Creates a tenant and its first `tenant_admin` |
| Billing ownership | Plan catalog, manual subscription assignment, overrides | Read-only plan/usage visibility, upgrade request |
| Languages | Defines plan language pool and tenant language subset | Can only use the allowed subset |
| Brand profile | No | Yes |
| Team / working hours / numbers | No | Yes |
| Global providers | Yes | No |
| Platform analytics / audit / support tools | Yes | No |

Decision for v1:

- `superadmin` is a platform operator.
- `admin` is the owner/operator of a single tenant.
- These are separate portals and should remain separate accounts in v1.
- `BrandProfile`, `Billing`, `Team`, and `Working Hours` belong to the admin portal, not the superadmin portal.

## Market Map

| Segment | Vendors | Why they matter for us |
| --- | --- | --- |
| Direct AI receptionist | Goodcall, My AI Front Desk, Dialzara, Smith.ai, PolyAI | Best benchmark for pricing packages, receptionist workflows, language support, onboarding, handoff, and SMB vs enterprise positioning |
| Adjacent phone / CX ops | Quo (formerly OpenPhone), Aircall | Best benchmark for workspace roles, billing ownership, team management, phone-number governance, analytics, and seat-based packaging |
| Voice-agent builders | Synthflow, Retell, Bland | Best benchmark for concurrency controls, usage metering, subaccounts, white-labeling, developer/admin role separation, and API-first limit enforcement |

What the market consistently does well:

- separates workspace owners from everyday users
- makes billing ownership explicit
- exposes plan and usage dashboards inside the product
- enforces phone, seat, minute, concurrency, and retention limits in-product
- gives enterprise customers SSO, audit logs, role mapping, and support tooling

## Competitor Matrix

| Competitor | Segment | Signup model | Org / workspace / subaccount model | Roles | Who owns billing | Publicly listed pricing | Enforced limits | Language model | Notable features | Where they are ahead of us | Source links |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Goodcall | Direct AI receptionist | Self-serve free trial | One account with agents / locations and team access controls | Admin, Editor, Performance Viewer | Account owner; team admins do not manage billing | Starter $79, Growth $129, Scale $249 per agent monthly; annual discounts | Team members 3 / 9 / 50, directory contacts 3 / 25 / 500, forms 1 / 3 / 25, logic flows 1 / 3 / 25, retention 7 / 30 / unlimited days, unique-customer caps with overage | Public site markets multilingual support, but not as an admin-assigned language entitlement model | Team management, agent-specific access, directory / departments, document-based knowledge | Stronger packaged SMB pricing, better agent/location scoping, clearer self-serve team-role model | [Pricing](https://www.goodcall.com/pricing); [Team roles](https://help.goodcall.com/en/articles/9730780-how-to-use-enhanced-team-management-in-goodcall-gen-3); [Locations](https://help.goodcall.com/en/articles/8007554-can-i-add-another-location) |
| My AI Front Desk | Direct AI receptionist | Self-serve Free / Basic / Growth; enterprise sales | Workspace-style account with enterprise governance overlay | Admin / IT Admin, Supervisor, Analyst, Agent | Admin / IT admin on account; enterprise governance supports central control | Free $0, Basic $99, Growth $149, Enterprise custom | Voice minutes 20 / 200 / 300 / unlimited, SMS caps, chatbot caps, overage on paid tiers, enterprise unlimited seats | Public site emphasizes channels and voice options more than plan-based language pools | AI CRM, smart tickets, AI calendar, dashboards, marketing automations, SSO / SCIM / audit trails | Stronger governance, free plan, multichannel packaging, richer security posture than current v1 | [Pricing](https://www.myaifrontdesk.com/pricing); [Admin governance](https://www.myaifrontdesk.com/trust-center/admin-governance); [RBAC / audit](https://www.myaifrontdesk.com/trust-center/rbac-access-controls) |
| Dialzara | Direct AI receptionist | Self-serve 7-day trial | Single business receptionist account; public RBAC is minimal | Public role model not emphasized | Account owner | Business Lite $29, Pro $99, Plus $199 monthly | Minutes 60 / 220 / 500, overage $0.48 / min, KB uploads 5 / 10 / unlimited, after-hours on Pro+, included number, unlimited concurrent calls | EN / ES bilingual on higher tiers; not admin-assigned pools | Calendar sync, call routing, after-hours rules, warm transfer, summaries, included number | Much lower entry price, explicit after-hours and appointment package, public concurrency story is clearer | [Pricing](https://dialzara.com/pricing); [Features](https://dialzara.com/how-it-works); [Homepage](https://dialzara.com/) |
| Smith.ai | Direct AI receptionist | Self-serve monthly or sales-led annual | Customer account with heavy vendor-managed setup; less public emphasis on self-serve workspace admin | Public role matrix is not a major product theme | Account owner; vendor-managed onboarding and billing | Monthly AI plans: $95 / 50 calls, $270 / 150, $800 / 500; annual done-for-you starts at $500 / month; enterprise custom | Per-call quotas, monthly overages, live-agent handoff billed separately, custom Q&A cap, dedicated number, annual plans remove overages | English and Spanish fluency | Hybrid AI + human handoff, white-glove setup, live agents on standby, custom integrations | Human escalation is a major differentiator; onboarding and conversion optimization are more mature than ours | [Pricing](https://smith.ai/pricing/ai-receptionist); [AI receptionist](https://smith.ai/ai-receptionist); [Hybrid AI + human](https://smith.ai/hybrid-ai-human-receptionists) |
| PolyAI | Direct enterprise voice AI | Sales-led only | Enterprise deployment / project model | Public role model not surfaced | Procurement / enterprise owner | Contact Sales | Custom deployment, enterprise limits, enterprise support | Public site markets any-language / multilingual enterprise assistants | Custom voices, enterprise deployment, APIs, CCaaS integration, SOC2 / ISO27001 / AWS FTR, GDPR | Stronger enterprise security, multilingual depth, and deployment capability than our current product | [Platform](https://poly.ai/platform); [Amazon Connect](https://poly.ai/amazon-connect/); [Languages](https://poly.ai/blog/how-voicebots-handle-languages-accents) |
| Quo (formerly OpenPhone) | Adjacent phone / CX ops | Self-serve trial + invite flow | Workspace with team members, shared numbers, number owners, domain-join flow | Owner, Admin, Member | Owner is the safest public interpretation; docs are strongest on owner-led billing authority | Starter $19, Business $33, Scale $47 monthly per user; annual $15 / $23 / $35 | One number per user, $5 per extra number, plan-gated analytics / AI summaries / AI tags, per-user billing | Not language-pool driven | Shared inboxes, business hours, call flows, AI summaries, API access for Owner / Admin | Stronger owner/admin/member model, number-scoped permissions, and seat-based billing clarity | [Plans](https://support.openphone.com/hc/en-us/articles/1500009885581); [Roles](https://support.openphone.com/core-concepts/administration/members); [Getting started](https://support.openphone.com/getting-started/introduction) |
| Aircall | Adjacent phone / CX ops | Self-serve plus sales-assisted growth | Company dashboard with users, teams, numbers, add-ons, and plan settings | Agent, Supervisor, Admin, plus Owner advanced permission | Owner only for billing and subscription actions | Public pricing page is live but exact seat cost is dynamically rendered; plan structure is Essentials / Professional / Custom | Minimum seats 3 / 3 / 25, 1 local or toll-free number included, 3-team cap on Essentials, 50 AI Voice Agent minutes per account per month, recordings and analytics retention gates | Not language-pool based; more AI assist / voice agent oriented | Mature contact-center controls, analytics, live monitoring, add-on marketplace, owner-only billing, Salesforce CTI | Stronger permission model, richer live monitoring, more mature add-ons, deeper support / sales tooling | [Pricing page](https://aircall.io/es/precios/); [Roles](https://support.aircall.io/hc/en-gb/articles/26013509732509); [Billing model](https://support.aircall.io/hc/en-gb/articles/26535858334749-How-are-Admin-users-billed) |
| Synthflow | Voice-agent builder | Self-serve PAYG or enterprise sales | Workspace model with optional agency subaccounts and white-label add-on | Super Admin, Admin, Member | Super Admin / Admin | PAYG starts at $0; typical effective rate $0.15-$0.24 / min; concurrency add-on $20 / unit / month; white-label $2,000 / month; enterprise custom | PAYG concurrency 5, API rate limit 30 req / min, log retention 1 month, numbers $1.50 / month, optional add-ons and enterprise unlimited concurrency | Model-driven multilingual capability, not tenant language pools | BYO telephony, white-label toolkit, subaccounts, concurrency controls, compliance, agency tooling | Much stronger subaccount model, reseller tooling, and operational limit controls than our v1 | [Pricing](https://synthflow.ai/pricing); [PAYG](https://docs.synthflow.ai/pay-as-you-go); [Roles](https://docs.synthflow.ai/role-management); [Concurrency](https://docs.synthflow.ai/cuncurrency-calling-limits/) |
| Retell | Voice-agent builder | Self-serve free / PAYG or enterprise sales | Account with multiple workspaces and team invites | Admin, Developer, Member | Admin | $0 start, $0.07+ / minute, 20 free concurrent calls, enterprise custom | 20 concurrent calls, burst mode with surcharge, 10 knowledge bases free, KB / phone / concurrency subscription items, max call duration 1 hour by default | Model / telephony configurable, not plan-language pools | Strong RBAC, detailed cost calculator, domain-scoped public keys, concurrency burst, API-first deployment | Better developer/admin split, clearer concurrency economics, and more complete self-serve operational controls | [Pricing](https://www.retellai.com/pricing); [Access control](https://docs.retellai.com/accounts/access-control); [Workspace](https://docs.retellai.com/accounts/workspace); [Concurrency](https://docs.retellai.com/deploy/concurrency) |
| Bland | Voice-agent builder | Self-serve plus enterprise sales | Organization with members; API-visible org membership; enterprise SSO and role mapping | Owner permission plus Admin / Operator / Prompter / Viewer style role mapping in SSO docs | Org owner / admin | Start free, Build $299, Scale $499, Enterprise contact sales | Daily caps, hourly caps, concurrency caps, plan-based connected-minute pricing, transfer pricing, outbound minimum charge, enterprise higher limits | Not plan-language-pool based; builder platform with role-mapped org controls | Org member APIs, usage caps, alarms, SSO, group-based role mapping, BYOT flexibility | Stronger org API surface, richer rate-limit controls, and more mature enterprise identity integration than our current v1 | [Billing](https://docs.bland.ai/platform); [Org members](https://docs.bland.ai/api-v1/get/org_members); [SSO / role mapping](https://docs.bland.ai/enterprise-features/SSO); [Enterprise limits](https://docs.bland.ai/enterprise-features/enterprise-rate-limits) |

## Pricing / Features Comparison

Important pricing note:

- My AI Front Desk has older official material that still references a lower overage rate. The current live pricing page was treated as source of truth.
- Aircall's public pricing page is live, but the static crawl did not expose fixed seat prices. Plan structure, seat minimums, and included features are still clear from official pages.

| Vendor | Pricing model | Starting price | Included usage | Overage model | Seat / user limits | Phone-number limits | Concurrency limits | Language coverage | Analytics / reporting | Integrations / API | Security / SSO / audit logs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Our product, current target v1 | Monthly plan + included minutes + manual overrides | Starter $99 | 250 mins, 1 admin seat, 3 team members, 1 number, 1 concurrent call | Block new calls after minute cap unless overage enabled by platform | `max_admin_seats`, `max_team_members` | `max_phone_numbers` | `max_concurrent_calls` | Plan language pool + platform-assigned tenant subset | Advanced analytics only on higher tiers; read-only billing / usage UI in v1 | Existing tenant APIs; plan catalog and language assignment APIs added | Audit-log entitlement modeled; SSO and enterprise identity still future work |
| Goodcall | Per-agent monthly subscription | $79 / agent / month | Unlimited minutes and tokens on all listed tiers | $0.50 per unique customer over plan allowance | 3 / 9 / 50 team members by tier | Indirect via locations / agents; number portability still limited | Not publicly packaged as a billing control | Multilingual marketed, but no public language-admin model | Retention packaged by tier | Calendar, CRM, docs, directory, workflows | No strong public enterprise identity story compared with builders / CCaaS |
| My AI Front Desk | Free + monthly SaaS tiers + enterprise | Free, then $99 / month | Free 20 voice mins; paid 200 / 300; enterprise unlimited | Public pricing page shows $0.25 / minute on paid tiers | Enterprise advertises unlimited seats | Not publicly emphasized as a major priced axis | Public messaging says unlimited simultaneous calls | Public site emphasizes many voices and channels, not admin-assigned language entitlements | Dashboards and reporting on all plans, richer on Growth / Enterprise | AI CRM, chatbot, SMS, automations, API on higher tiers | Enterprise trust-center story is very strong: SSO, SCIM, audit trail, SIEM |
| Dialzara | Monthly SaaS tiers | $29 / month | 60 / 220 / 500 talk minutes | $0.48 / minute | Public role / seat model is light | One included number; international on request | Unlimited concurrent calls marketed publicly | EN / ES bilingual on higher tiers | Call recordings, summaries, notifications | Zapier / Make and calendar sync | Public security / enterprise identity story is comparatively light |
| Smith.ai | Per-call packages, monthly or annual | $95 / month | 50 calls on entry monthly plan | Per-call overage, not per minute | Public seat model is not central | Dedicated number included; can port existing number | Capacity handled via Smith's human + AI ops | English and Spanish called out publicly | Summaries, transcripts, recordings | Native CRM plus 7,000+ Zapier integrations | More service-heavy than software-heavy; security story is less self-serve than enterprise builders |
| PolyAI | Enterprise contract | Contact Sales | Custom | Custom | Custom | Custom | Custom | Multilingual / any-language enterprise positioning | Enterprise analytics / integration layer | Enterprise APIs and CCaaS integrations | Strongest public enterprise compliance posture in this set |
| Quo | Per-user subscription | $19 / user / month | 1 number / user | Extra numbers $5 / month; usage-based items use credits | Per-user billing | 1 included per user | Not a major published limit axis | Not language-led | Analytics, AI summaries / transcripts on higher tiers | API requires active subscription and Owner / Admin | Solid workspace permissions; less enterprise security depth than Aircall / builders |
| Aircall | Per-seat telephony subscription plus add-ons | Public, but exact price is dynamic in crawl | 1 included number, 50 AI Voice Agent minutes / account / month | Add-ons and extra seats / numbers; bundles vary by region | 3-seat minimum on Essentials / Professional, 25 on Custom | 1 included; extra numbers billed | Unlimited simultaneous calls on public pricing page | Not language-pool based | Basic to advanced analytics; Analytics+ extends history | 100+ integrations, API, Salesforce CTI on higher tiers | Owner-only billing, SSO on Custom, more mature than ours today |
| Synthflow | PAYG usage billing plus add-ons | $0 base | 5 concurrency, free build/test, usage billed at call time | Per-minute usage; optional concurrency and white-label add-ons | Workspace roles, not seat-priced | $1.50 / month per number | 5 PAYG, expandable, enterprise unlimited | Builder platform; multilingual depends on stack selection | Logs and usage dashboards | API-first, BYO telephony, white-label | Strong compliance and reseller tooling; stronger enterprise hosting options than us |
| Retell | PAYG usage billing plus subscription items | $0 base | 20 free concurrent calls, 10 KBs, free credits | Per-minute plus optional add-ons and burst surcharge | Workspace roles, not seat-priced | Phone numbers $2 / month | 20 base, purchasable, burst available | Builder platform, model-controlled | Strong analytics / logs / exports | API-first, webhooks, public keys, custom telephony | Better self-serve operational controls and admin separation than us |
| Bland | Base plan + per-minute connected usage | Free | Daily / hourly / concurrency caps by tier | Per-minute connected time; transfer charges; outbound minimum | Org-based, not classic seat pricing | BYOT or Bland telephony | 10 / 50 / 100 / unlimited by tier | Builder platform, not admin language pools | Billing dashboard, usage visibility, alarms | APIs, tools, webhooks, BYOT | Strong SSO and role mapping; stronger rate-limit tooling than our current product |

## Admin / User Flow Comparison

### What direct receptionist vendors do

- Goodcall: self-serve signup, then owner/admin configures agents or locations, invites collaborators, and scopes access by agent. This is close to a single-customer admin portal with light RBAC.
- My AI Front Desk: self-serve for SMB, enterprise governance for larger teams. This is the clearest example of a receptionist vendor exposing a real admin model with roles, audit logs, and SCIM.
- Dialzara: owner-led setup flow with website ingestion, voice / number selection, KB upload, and forwarding. Public material focuses business setup more than internal user management.
- Smith.ai: onboarding is vendor-assisted. Their "admin" flow is less about team permissions and more about configuring call logic, integrations, and when to escalate to live agents.
- PolyAI: enterprise project model. Customer buying committee plus rollout team, not a self-serve SMB admin portal.

### What phone-system vendors do

- Quo: create workspace, choose number, invite team, assign roles, assign number access, manage shared numbers and business hours.
- Aircall: create company account, add users / teams / numbers, assign role plus owner permission, then manage plan, add-ons, analytics, and numbers in one dashboard.

### What builder platforms do

- Synthflow: create workspace, add payment method, build agents, then add users, subaccounts, concurrency, and white-label / reseller features.
- Retell: create account, get default workspace, invite members, assign Admin / Developer / Member, then manage API keys, billing, concurrency, and deployment settings per workspace.
- Bland: create org, buy credits / plan, manage org members and usage caps, then optionally add enterprise SSO and role mapping.

### Takeaway for our product

The market has three common patterns:

1. SMB receptionist tools optimize for owner-led setup and simple packaging.
2. Phone / CX tools optimize for workspace roles, billing ownership, and number governance.
3. Builder platforms optimize for concurrency, developer roles, usage metering, and subaccounts.

Our product needs a hybrid of all three:

- receptionist-style onboarding for website signup
- phone-system-style billing and team controls for the admin portal
- builder-style hard enforcement for minutes, concurrency, numbers, and language entitlements

## Competitor-Advantage Gap List

Competitors are ahead of us in these areas:

- Goodcall: more polished self-serve packaging around forms, logic flows, team members, and retention windows.
- My AI Front Desk: much stronger out-of-the-box governance, auditability, multichannel packaging, and enterprise identity controls.
- Dialzara: lower entry price, simpler "get live fast" receptionist story, explicit unlimited concurrency messaging.
- Smith.ai: human escalation is part of the product, not an afterthought. Their onboarding and live-agent safety net are materially ahead.
- PolyAI: enterprise readiness, security posture, multilingual depth, and deployment sophistication are well ahead of our current state.
- Quo: cleaner owner/admin/member separation, shared-number ownership, and self-serve seat billing.
- Aircall: richer contact-center permissions, live monitoring, analytics depth, add-on management, and owner-controlled billing.
- Synthflow: subaccounts, white-label / reseller tooling, explicit concurrency and API limits, agency-friendly commercial model.
- Retell: better developer/admin role separation, more transparent concurrency and burst controls, deeper self-serve deployment controls.
- Bland: stronger org-level API surface, role mapping through SSO, daily / hourly / concurrency caps, and usage alarms.

Areas where our current product is competitive after this implementation:

- We now have a real portal split between tenant admins and platform staff.
- We now have manual-first subscriptions, tenant language access, and entitlement enforcement in the backend.
- We now enforce plan limits at the point of action instead of relying on policy alone.
- We now support both public self-registration and superadmin-created tenant admins.

Areas where we still lag and should expect pressure:

- self-serve payments, invoices, and billing automation
- enterprise SSO / SCIM / audit log UI
- richer role granularity inside a tenant
- human handoff / contact-center supervision features
- white-label / reseller / subaccount tooling
- real-time limit dashboards and alerting

## Recommended Pricing / Packaging For Us

Recommended v1 packaging should stay close to the system we just implemented, because it already matches the strongest cross-market patterns:

| Plan | Monthly price | Target buyer | Included usage / limits | Languages | Extra notes |
| --- | --- | --- | --- | --- | --- |
| Starter | $99 | Solo / single-location SMB | 250 mins, 1 admin seat, 3 team members, 1 number, 1 concurrent call, 30-day retention | Plan pool: `en`, `es`; tenant subset assigned by platform | No outbound, no API, no advanced analytics |
| Growth | $299 | Small multi-user operator | 1,200 mins, 2 admin seats, 10 team members, 3 numbers, 3 concurrent calls, 90-day retention | Pool: `en`, `es`, `fr`, `de`, `hi`; platform assigns subset | Outbound enabled, API enabled, advanced analytics |
| Enterprise | $999 starting | Multi-location / enterprise | 10,000 mins, 10 admin seats, 100 team members, 25 numbers, 25 concurrent calls, 365-day retention | Broad pool; platform assigns subset | Audit logs enabled, custom overrides, future SSO / SCIM |

Recommended packaging rules:

- Keep billing manual-first in v1.
- Keep plan catalog platform-owned.
- Keep language pool plan-defined but tenant subset platform-assigned.
- Keep minutes, numbers, concurrency, and admin seats as hard product limits.
- Allow tenant-level overage only when explicitly enabled by superadmin.
- Make billing / usage read-only in the admin portal until automated billing is ready.

Why this pricing shape is defensible:

- It is closer to the transparent SMB packaging of Goodcall and Dialzara than to enterprise-only custom selling.
- It gives us a clearer operational story than Smith.ai's per-call model and a simpler business story than builder-platform per-minute calculators.
- It creates a natural upgrade path based on usage, team size, phone numbers, and languages.

## Implementation Implications

This section reflects the current repository state after implementation.

### Implemented now

- Tenant-facing portal routes are now under `/app/*`.
- Platform-facing routes are under `/platform/*`.
- Legacy `/admin/*` paths redirect to `/app/*` for compatibility.
- Tenant admins cannot access platform routes or platform APIs.
- Website registration now creates:
  - `user`
  - `tenant`
  - first `tenant_admin` membership
  - default manual subscription
  - initial tenant language subset
  - active tenant session
- Superadmin can:
  - create a tenant with its first admin
  - add admins to an existing tenant
  - assign a tenant subscription
  - assign a tenant's allowed language subset
- `BrandProfile`, `Billing`, `Team`, `Working Hours`, `Phone Numbers`, `Contacts`, and `Calls` are tenant-admin concerns.
- Superadmin portal now focuses on tenants, plans, subscriptions, provider config, and language assignment.

### Data model implemented

- `plans`
- `plan_entitlements`
- `tenant_subscriptions`
- `tenant_subscription_overrides`
- `tenant_language_access`
- `tenant_usage_rollups`
- `tenant_upgrade_requests`

### v1 entitlements implemented

- `max_admin_seats`
- `max_team_members`
- `max_phone_numbers`
- `included_minutes_per_period`
- `max_concurrent_calls`
- `plan_language_pool`
- `tenant_language_subset`
- `data_retention_days`
- `api_access`
- `advanced_analytics`
- `audit_logs`
- `outbound_enabled`
- `overage_enabled`

### Enforcement implemented

- team invite / admin creation paths check seat and team-member limits
- phone-number create / update checks number limits
- inbound and outbound call start checks concurrency and outbound entitlements
- assistant settings save checks the tenant's allowed language subset
- call completion updates usage rollups
- new calls are blocked after minute limits are exhausted unless overage is enabled

### Admin portal behavior implemented

- read-only billing overview
- usage summary
- allowed-language display
- upgrade-request submission
- assistant settings limited to allowed languages returned by backend

### Remaining work after this implementation

- automated checkout, invoicing, and payment collection
- invoice history and payment-method self-service
- SSO / SCIM / enterprise identity
- audit-log storage and UI
- richer tenant RBAC beyond current tenant roles
- self-serve plan upgrades and proration
- support tooling such as impersonation and billing exceptions

## Summary

The market says the same thing from three different angles:

- receptionist vendors win on fast onboarding and clear packages
- phone / CX vendors win on workspace roles and billing ownership
- builder vendors win on limits, concurrency, and operator controls

Our product now has the right core foundation:

- superadmin and admin are separate portals
- website signup and superadmin creation both produce tenant admins
- brand profile, billing, team, and working hours sit in the admin portal
- superadmin controls tenant language access
- plan entitlements and usage checks now exist in the backend and are enforced

The biggest remaining gaps are not the split itself anymore. The next gap is market maturity:

- automated billing
- enterprise identity and auditability
- richer tenant roles
- better live usage visibility and alerts
- stronger support / handoff tooling

In short: the product boundary is now correct, the entitlement model is now real, and the next phase should focus on billing automation, enterprise controls, and operational polish to catch the leaders in this market.
