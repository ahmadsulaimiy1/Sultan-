# SHRS Deployment Readiness Checklist v1.0

A Board-level checklist. Every item's current state is stated
honestly, per `docs/digital-campus-master-deployment-directive.md`'s
evidence — most items are unchecked today, and this document does not
soften that. Checking an item off should require the evidence named
next to it, not an assumption that work elsewhere implies it's done.

## Infrastructure

| Item | Status | Evidence required to check this off |
|---|---|---|
| Cloudflare Account | ☐ Not confirmed | A Cloudflare dashboard login exists and is held by a named, accountable person or role (e.g. ICT Office). |
| Pages Project | ☐ Not confirmed | The project exists in that Cloudflare account, connected to `ahmadsulaimiy1/Sultan-`, building from `main`. |
| Database (staging) | ☐ Not confirmed | A Neon project exists; `/api/portal/setup` has been run against it successfully. |
| Database (production) | ☐ Not confirmed | A **separate** Neon project exists (never the same one as staging); `/api/portal/setup` has been run against it. |
| Email | ☐ Not confirmed | A Resend account exists, a sending domain is verified (SPF/DKIM present), and one real transactional email has been received (not just sent-without-error) as proof. |
| Storage (R2) | ☐ Not started | Deliberately deferred until the KYC Document Centre is Board-approved — see the onboarding reality-check doc. Not a gap to close yet. |
| Domain ownership confirmed | ☐ Not confirmed | Whoever holds registrar access has personally verified `shroyalschools.ng` (or the intended domain) status — this session's own attempt to check was blocked by its own network policy and proves nothing either way. |

## Security

| Item | Status | Evidence required to check this off |
|---|---|---|
| Password Policies | ☑ Developed | `MIN_PASSWORD_LENGTH = 10` enforced server-side (`functions/_lib/session.js`) across guardian/student/staff. Real-world check still needed: confirm this minimum is one the Board actually wants published (it is currently a code default, not a Board-approved policy figure). |
| Session Security | ☑ Developed, with a known limitation | HMAC-SHA256-signed, stateless cookies; `SameSite=Lax`. **No CSRF token exists anywhere in this project** — documented, accepted-for-now limitation (see `docs/student-portal.md`). Should be closed before handling real payment or KYC data, not necessarily before basic staging use. |
| MFA | ☐ Not started | No provider evaluated or integrated. Twilio (SMS/WhatsApp OTP) named as a candidate in the onboarding reality-check doc — no decision made. |
| Audit Logs | ☑ Developed, partial | `auth_audit_log`/`staff_audit_log` cover login events only. **No audit trail exists for data changes** (who edited a result, who revoked a certificate) — a real gap for anything Board-sensitive. |
| Rate limiting / lockout | ☑ Developed | 5 failed attempts / 15-minute lockout, all three login surfaces (guardian/student/staff). |
| Executive accountability | ☐ Designed, not implemented | See `docs/executive-identity-design.md` — the Founder Dashboard is currently a shared bearer token, not an individually-accountable login. Concrete fix designed, not yet built. |
| Bearer-token surfaces reviewed | ☐ Not reviewed | Five separate shared secrets (`PORTAL_SETUP_TOKEN`, `PORTAL_ADMIN_TOKEN`, `PORTAL_SYSADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN`) exist by design for narrow admin/bootstrap actions — the Board should confirm who holds each, and that no one person holds all five, before production use. |

## Operations

| Item | Status | Evidence required to check this off |
|---|---|---|
| Backup Plan | ☐ Not started | No backup policy, schedule, or tooling exists. Neon offers point-in-time recovery on paid tiers — confirming and configuring this is the fastest real first step, once a production project exists. |
| Recovery Plan | ☐ Not started | No documented RTO/RPO targets, no tested restore procedure. |
| Monitoring | ☐ Not started | No uptime monitoring, error tracking, or log aggregation exists. Cloudflare's own dashboard provides basic request/error metrics once a Pages project exists — confirming that's actually watched by someone is the low-cost first step. |
| Data retention policy | ☑ Designed (governance), ☐ not enforced by code | IT-04 defines archival-vs-deletion and destruction authority — a real, Board-approved policy — but nothing in the running system currently auto-archives or auto-purges on a schedule. |
| Incident response owner | ☐ Not assigned | No named person/role is documented as owning "what happens when something breaks in production" — this should be assigned before real institutional data goes live, not after. |

## How to use this checklist

Review it at the point each Account Creation Playbook step completes,
not all at once at the end — e.g. check "Cloudflare Account" and "Pages
Project" as soon as Playbook Step 1 is done, rather than waiting for
every row to be ready before reviewing any of them. Nothing on this
list should move from ☐ to ☑ without the specific evidence named next
to it.
