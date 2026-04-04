# Brand Profile Business Intake Template

Use this document to collect the information needed to complete the Brand Profile section for the AI phone assistant.

## Machine-Readable Templates

If you want to load the same information through JSON instead of filling the dashboard form field by field, use:

- `templates/brand-profile.template.json` for `/settings/brand`
- `templates/tenant-seed.template.json` for `SEED_CONFIG_PATH=... bun run db:seed`
- `templates/tenant-seed.melp.json` for the current Melp demo example

## Why we need this

The AI uses this information to:

- introduce the business correctly
- answer caller questions about services, policies, staff, and FAQs
- sound like the business, not a generic assistant
- know when to transfer, escalate, or stop handling a conversation

## What is required

System-required before save:

- Business Name

Strongly recommended before go-live:

- business description
- primary phone number
- at least one location if the business has a physical presence
- core services or products
- common FAQs
- escalation rules
- brand voice guidance

Validation notes:

- If email is provided, it must be a valid email address.
- In repeatable sections, fields marked with `*` are required for that row.
- Any section without a `*` can be left blank if it does not apply.

## Completion guidance

- Use final approved business wording where possible.
- Write answers exactly how you would want the AI to describe the business on a live call.
- Do not include confidential or internal-only notes unless the AI is allowed to say them aloud.
- If something does not apply, write `N/A`.
- If the business has multiple locations, services, FAQs, or escalation scenarios, add as many rows as needed.

## Business Details

Prepared by:

Date:

Business owner / approver:

Primary contact for follow-up:

## 1. Business Identity

Business Name *:

Industry:

Tagline:

Business Description:
Write 2-4 sentences describing what the business does, who it serves, and any important differentiator.

Website:

Email:

Primary Phone:

## 2. Locations

Fill this section only if the business has one or more physical locations.

| Location Label * | Full Address * | Phone |
| --- | --- | --- |
| Main Branch |  |  |
|  |  |  |
|  |  |  |

## 3. Services / Products

List the main services or products callers are most likely to ask about.

| Service / Product Name * | Description * | Price | Duration |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## 4. Policies

Add any policy callers often ask about. Examples: cancellation, refund, rescheduling, insurance, walk-ins, payment terms.

| Policy Title * | Policy Content * |
| --- | --- |
|  |  |
|  |  |
|  |  |
|  |  |

## 5. FAQs

Provide approved answers the AI can use directly on calls.

| Question * | Approved Answer * |
| --- | --- |
|  |  |
|  |  |
|  |  |
|  |  |
|  |  |

## 6. Staff Directory

Include only staff the AI is allowed to mention, transfer to, or reference on calls.

| Staff Name * | Role * | Department | Specialty |
| --- | --- | --- | --- |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |
|  |  |  |  |

## 7. Brand Voice

These inputs shape how the AI sounds during calls.

Tone Keywords:
List 3-6 adjectives. Example: professional, warm, reassuring, concise.

Preferred Words / Phrases:
List words or phrases the AI should use. Example: "happy to help", "absolutely", "let me check that for you".

Words / Phrases To Avoid:
List words or phrases the AI should not use. Example: "unfortunately", "I can't", "that's not possible".

Sample Phrases:
Write 3-5 example sentences that reflect the brand's preferred tone.

## 8. Escalation Rules

Describe when the AI should stop handling the conversation alone and what action it should take.

| Trigger * | Action * |
| --- | --- |
|  |  |
|  |  |
|  |  |
|  |  |

## Recommended Minimum Submission

For a stronger first version of the assistant, try to provide at least:

- 1 business description
- 1 primary phone number
- 1 location, if applicable
- 5 services or products
- 3 policies
- 5 FAQs
- 3 staff entries, if applicable
- 3-6 tone keywords
- 3-5 sample phrases
- 3 escalation rules

## Important Note

The current Brand Profile section does not have dedicated fields for operating hours, holiday hours, or appointment workflows. If the business wants the AI to answer those today, include them in the Policies or FAQs section until dedicated fields are added.
