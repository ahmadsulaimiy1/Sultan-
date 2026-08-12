# Build audit — August 2026

What exists, what is switched off, what has no way in, and what was
never built. Produced by reading the code rather than the documentation:
every claim below was checked against `functions/`, `js/`, `sql/schema.sql`
and the page tree, and the method for each is stated so it can be re-run.

The organising finding is that this codebase's failures are almost never
*missing code*. They are **complete systems with no credential, no user
interface, or no reader.** That is a much better problem to have, and a
much cheaper one to fix — but only if it is named accurately.

---

## A. Built, correct, switched off

Complete, tested code that cannot run because a secret is absent. Each
one fails honestly — a clear message, never a silent pretence — which is
why none of these have been noticed as outages.

| Secret | What is dark without it | Cost to fix |
|---|---|---|
| `ANTHROPIC_API_KEY` | The assistant on **both** channels. Nothing answers. | ~$5 credit, needs a card that works internationally |
| `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` | **No email has ever been delivered.** Account verification, password reset, login OTP, and now escalation. Four systems, one secret. | Free tier, 3,000/month, **no card needed** |
| `TWILIO_AUTH_TOKEN` | The WhatsApp webhook returns 503 to everything. | Free, token already exists in the Twilio console |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push. Fully wired — subscribe, public-key endpoint, send-on-announcement — and **mentioned in zero documentation files**, so nobody knows it needs configuring. | Free, self-generated |

*Method: every `env.X` reference in `functions/` cross-checked against
mentions in `docs/`.*

`RESEND_API_KEY` is the highest-value single action available. It is
free, needs no international card, and lights four systems at once.

---

## B. Dead ends — the capability exists, nobody can reach it

### B1. Fixed in this pass

Four tables were written by real workflows and read by nothing. A record
nobody reads is not a record, it is a reassurance.

- `staff_notifications` — written by graduation approvals, teacher
  performance, and the assistant's escalations
- `assistant_escalations` — a family asking to speak to a person
- `privacy_requests` — a data-protection request carrying a duty to respond
- `auth_audit_log` — 12 write sites recording failed sign-ins and lockouts

All four now surface at **`/portal/staff/desk/`**, each section gated by
the permission area that genuinely owns it. Sections a role may not see
state the reason rather than showing an empty list — a staff member must
be able to tell "nothing has happened" from "this is not yours".

### B2. Still open — admin APIs with no user interface

Six endpoints exist, are permission-checked and work, and can only be
called with `curl`. No member of staff can use them.

| Endpoint | What is unreachable |
|---|---|
| `/api/portal/admin/announcements` | **The school cannot post an announcement.** This drives the site ribbon and homepage hero, and is also the only trigger for web push |
| `/api/portal/admin/students` | Student record administration |
| `/api/portal/admin/create-student-login` | Issuing a student account |
| `/api/portal/admin/reset-password` | Resetting an account for someone locked out |
| `/api/portal/admin/hifz-progress` | Recording Qur'ān memorisation progress |
| `/api/portal/admin/marketplace` | Marketplace administration |
| `/api/portal/staff/delegations`, `/staff/finance/fees` | Delegation and fee administration |

Announcements is the one to build first: it is the school's own voice on
its own homepage, and today that voice needs a developer.

*Method: every route under `functions/api/` matched against every
`fetch()` in `js/`, `pages/`, `portal/`, `partials/`. QR/barcode routes
and `/api/whatsapp` are excluded — they are called by `<img>` tags and by
Twilio respectively, not by page code.*

### B3. Two tables no code touches at all

`graduation_batches`, `transcript_snapshots` — 2 of 71.

---

## C. Never built — required for what was asked for

### C1. There is no scheduler. Anywhere.

Nothing in this project fires at a time. Cloudflare Pages Functions have
no cron trigger; that needs a companion Worker. Until it exists, "send
the reminder 24 hours before" is not possible at any price.

Needed: a `message_queue` table (`send_at`, channel, recipient, template,
variables, status, attempts), a Worker on a few-minute cron, and a
delivery log.

### C2. WhatsApp can receive but not send

`staff_notifications.channel` already accepts `'whatsapp'` and `'sms'`,
deliberately, with a schema comment saying a provider can be added later
"with zero changes to any calling code". That provider is still absent —
those values are recorded and never delivered.

### C3. OTP is email-only

`functions/_lib/otp.js` is properly built — 6 digits, SHA-256 hashed,
10-minute expiry, 5 attempts, timing-safe comparison. Delivery is email
only. In Nigeria that is the weakest possible channel: WhatsApp is read,
email is not.

### C4. No opt-in consent record

Meta requires demonstrable consent before a business messages anyone.
There is no consent checkbox on the admission or portal forms and no
column storing it. This blocks reminders and OTP over WhatsApp
regardless of how good the code is.

### C5. No Meta message templates

Appointment reminders and authentication codes both need pre-approved
templates, which need an approved WhatsApp Sender, which needs an
upgraded Twilio account and Meta business verification.

---

## D. Risk

### D1. No rate limiting exists anywhere in this codebase

Confirmed by search: zero matches for rate limiting of any spelling.

`/api/chat` and `/api/whatsapp` are open to the internet and every call
bills the school's Anthropic account. The existing caps bound the cost of
*one conversation*; they do nothing about the number of conversations.
Anyone who finds the WhatsApp number can run the bill up.

**Set a hard spend cap in the Anthropic console on day one.** It takes
thirty seconds and it is the only protection that exists today. Proper
per-sender limiting needs a KV namespace and is worth building before the
number is given to families.

### D2. WhatsApp sender number is a one-way door

A number registered on the WhatsApp Business Platform can no longer be
used in the WhatsApp app on a handset. **+234 807 374 7650** appears in 30
`wa.me` links across the site and is actively answered by a person today.
Registering it would take it off that person's phone permanently. Use a
dedicated new line for the assistant.

---

## E. Standing deferrals, previously documented

- 88 pages with heading-level skips — `docs/heading-outline-decision.md`
- Personalisation Centre untranslated for Yorùbá and French (36 pages each)
- Real parent attestations: exactly one exists (Dr. Ismail Akeem Seriki).
  None may be invented
- Six print prospectus drafts outstanding

---

## The order that gets the most for the least

1. **`RESEND_API_KEY`** — free, no card, unblocks verification, password
   reset, login codes and escalation together. Nothing else on this list
   has that ratio.
2. **Anthropic spend cap, then `ANTHROPIC_API_KEY`** — cap first, so the
   protection exists before the exposure.
3. **`TWILIO_AUTH_TOKEN` + the sandbox webhook** — ten minutes, and it
   proves the whole WhatsApp path.
4. **VAPID keys** — free, and the only reason web push is dark.
5. **The announcements admin UI** — gives the school back its own voice,
   and turns on web push as a side effect.
6. **Rate limiting** — before any WhatsApp number is advertised.
7. **The scheduler and message queue** — everything about reminders waits
   on this, and it waits on nothing itself.
8. **Consent capture, then Meta templates** — the last two, and the only
   two gated by an outside party.
