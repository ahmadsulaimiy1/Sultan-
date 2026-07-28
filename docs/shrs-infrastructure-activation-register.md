# SHRS Infrastructure Activation Register v1.0

Every item required before SHRS can become a live production institution
online, in one register. Status uses the four states requested for this
specific register (**Not Started / In Progress / Completed / Verified**)
— a coarser, account-existence-focused vocabulary than the
Designed/Developed/Tested-Locally/Merged/Staging-Verified/Production-
Verified scale used elsewhere in this project's docs (those two scales
answer different questions: this one asks "does the account/service
exist," the other asks "has the code been proven to work where"). One
item (Domain) gets a fifth, explicit **Unconfirmed** state rather than
being forced into "Not Started" — see its row for why.

**Cost figures are directional, not quoted current pricing** — every
vendor's real signup/pricing page returned a 403 when this session
tried to fetch it directly (their own bot-detection blocking an
automated fetch, not a claim their pricing is unusual or hidden).
Confirm exact current pricing at signup time, per platform, in the
step-by-step walkthroughs.

## Domain Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Domain registration | Canonical institutional web address | Critical | Starter (annual registrar fee) | CEO's Office | None | **Completed** — `shroyalschools.com` registered directly through Cloudflare Registrar 2026-07-28 (resolving the earlier "Unconfirmed" status: the school did not already own a domain, so a fresh `.com` was purchased rather than continuing to reference the previously-assumed `.ng`/`.com` pair). |
| Domain strategy | Subdomain plan (`portal.`, `admissions.`, `lms.`, etc.) for scaling multiple services under one domain | Medium | Free (DNS records only) | ICT / CTO | Domain registration | Designed — see `docs/shrs-digital-infrastructure-blueprint.md` §1; not yet implemented (single-domain setup only so far) |
| DNS | Resolves the domain to Cloudflare | Critical | Free | ICT | Domain confirmed + Cloudflare account | **Completed** — domain connected as a Custom Domain on `shroyalschools-web`, CNAME record auto-created by Cloudflare. Status moved from "Verifying" to **Active** within minutes (registrar + DNS + hosting all in one Cloudflare account meant no external nameserver propagation was needed), confirmed 2026-07-28. |
| SSL | HTTPS encryption for all traffic | Critical | Free (Cloudflare Universal SSL) | ICT | DNS pointed at Cloudflare | **Completed** — "SSL enabled" confirmed on the Custom Domains screen 2026-07-28. `https://shroyalschools.com` is now the real, live, secure address for the site. |

## Cloud Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Cloudflare (account) | Hosting platform for the whole Digital Campus | Critical | Free tier — verify at signup | ICT / CTO | None | **Completed** — account exists (`Ahmadbinibrohim@gmail.com`), verified 2026-07-27 |
| Hosting (Pages project) | Serves the static site + Pages Functions (the entire `functions/api/` backend) | Critical | Free tier | ICT | Cloudflare account | **Completed** — `shroyalschools-web` Pages project live at `shroyalschools-web.pages.dev`, first successful deploy 2026-07-27. A separate plain Worker named `shroyalschools` was created first by mistake (wrong project type — bare Workers don't support the `functions/` Pages Functions convention this codebase uses) and should be deleted or left unused; it is not part of the real deployment. `wrangler.toml` was added to the repo to set `pages_build_output_dir`, `compatibility_date`, and the `nodejs_compat` compatibility flag directly, working around a confirmed Cloudflare dashboard bug where the Compatibility Flags UI control does not reliably accept that flag. |
| Staging environment | Safe pre-production testing at a real, reachable URL | Critical | Free (Cloudflare Pages preview deployments) | ICT | Cloudflare Pages project | **Completed** — Preview deployments build automatically from the `claude/wec-institutional-design-kt3u0t` branch; environment variables set (database, all five tokens, plus `PORTAL_DEMO_PASSWORD`) and confirmed working end-to-end 2026-07-28 — see `docs/shrs-staging-verification-report.md` for the full evidence trail (all four seeded demo roles verified live). |
| Production environment | The real live site | Critical, sequenced *after* staging is verified | Free–Starter depending on usage | ICT / CEO's Office | Staging Verified | **Completed** (environment + database), **In Progress** (real usage) — `main` branch deploys automatically to `shroyalschools-web.pages.dev`; environment variables now set (database, all five tokens, deliberately **no** `PORTAL_DEMO_PASSWORD`) and `/api/portal/setup` run successfully 2026-07-28, confirmed empty of sample data. No custom domain attached yet (still on the free `.pages.dev` subdomain — see Domain Infrastructure above). Every portal module is now technically live and reachable; zero real institutional records exist yet — that's the next real milestone, not an infrastructure gap. |

## Database Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Neon (account) | Postgres database provider — HTTP-driver-compatible with Cloudflare Workers (the reason this stack uses Neon specifically, not any Postgres host — see the Blueprint's Cloud Architecture section) | Critical | Free tier likely sufficient initially — verify at signup | ICT | None | **Completed** — account exists (`Ahmadbinibrohim@gmail.com`), verified 2026-07-28 |
| Staging DB | Safe testing without touching real institutional data | Critical | Free | ICT | Neon account | **Completed** — `/api/portal/setup` run successfully against a real Neon project (via the Cloudflare Preview environment) 2026-07-28; tables created, sample data seeded. Two real code bugs were found and fixed live in the process: `sql.query()` doesn't exist on `@neondatabase/serverless`'s `neon()` client (fixed to `sql()`, 7 files), and the ~90-statement schema setup exceeded Cloudflare's per-invocation subrequest limit (fixed by batching via `sql.transaction()`). See `functions/api/portal/setup.js` and the two commits fixing this. |
| Production DB | Real institutional data store | Critical | Free–Starter | ICT | Neon account, Staging Verified first | **Completed** — a genuinely **separate** Neon project from staging (per the Playbook's non-negotiable separation), connected to Cloudflare's Production environment 2026-07-28. `/api/portal/setup` run successfully with no `PORTAL_DEMO_PASSWORD` set — confirmed empty of sample data ("Sample/demo data was not added"), correctly distinct from the staging project's seeded demo accounts. Ready for real institutional data entry; still has zero real records. |
| Backup DB / backup strategy | Disaster-recovery data protection | High | Neon paid tiers add point-in-time recovery | ICT | Production DB existing | Not Started |

## Email Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Resend (account) | Transactional email (verification links, password resets) — the provider `functions/_lib/email.js` is already coded against | High | Free tier for modest volume | ICT | None to create the account; domain confirmed to verify sending | **Completed** — account created, sending subdomain `mail.shroyalschools.com` verified 2026-07-28, `RESEND_API_KEY` + `EMAIL_FROM_ADDRESS` (`noreply@mail.shroyalschools.com`) added to both Cloudflare Preview and Production. A real email verification round-trip was proven on both environments: a real inbox received the message and the link correctly completed verification. Two real bugs were caught and fixed in the process — see the note below. |
| SMTP | Alternate sending method | Low | N/A | ICT | Resend account | Not Applicable — current code uses Resend's REST API, not SMTP |
| SPF | Anti-spoofing DNS record authorising Resend to send as your domain | Critical (email deliverability) | Free | ICT | Domain DNS access | **Completed** — `send.mail` TXT record (`v=spf1 include:amazonses.com ~all`) authorised via Cloudflare's one-click "Auto configure" for Resend, 2026-07-28 |
| DKIM | Cryptographic signing for email authenticity | Critical | Free | ICT | Domain DNS access, Resend account | **Completed** — `resend._domainkey.mail` TXT record authorised the same way |
| DMARC | Policy for handling SPF/DKIM failures, protects domain reputation | High | Free | ICT | SPF + DKIM configured | Not Started — Resend's auto-configure did not add a DMARC record; SPF+DKIM alone are enough for Resend to send, but a DMARC policy record is still a real gap worth closing |

**Email infrastructure note (2026-07-28):** wiring Resend up surfaced two genuine, previously-undetected bugs, only findable once a real domain and a real inbox existed to test against:
1. `functions/_lib/email.js`'s `SITE_ORIGIN` (and `scripts/build.js`'s copy, plus `sitemap.xml`/`robots.txt`/every public `info@` contact address) were still hardcoded to `shroyalschools.ng` — a domain that was never actually purchased. Fixed to `shroyalschools.com`, the real registered domain, and merged to `main`.
2. Even after that fix, `SITE_ORIGIN` was a single hardcoded constant shared by Preview and Production — two environments with two separate Neon databases. A verification token written by a Preview request only exists in Preview's database, so a hardcoded link always pointed to Production regardless of which environment issued it, and verification failed. Fixed by deriving the link's origin from the request that issued it (`siteOriginFromRequest()`), so each environment's emails always point back to itself.

## Identity Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Executive Identity | Individually-accountable EXE/PRIN/REG logins, replacing the shared bearer token | High | Free — no new infra | ICT / CEO's Office | Real staff data (Human Capital Register) + a reachable database | **In Progress** — Founder Dashboard code migrated and verified locally this engagement; no real account exists in any reachable environment yet |
| Staff Identity (Teacher/Registrar/Finance/etc.) | Real staff logins | High | Free | ICT | Real staff data + reachable DB | Completed (code), Not Started (population) |
| Parent Identity | Guardian self-service accounts | Critical — the most mature real user-facing flow | Free | Registrar's Office | Reachable DB, real parents | Completed (code), Not Started (real usage) |
| Student Identity | Student logins | Medium | Free | Registrar's Office | Reachable DB, real students, staff to issue logins | Completed (code), Not Started (real usage) |

## Security Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| MFA | Stronger login protection, especially for Executive/Finance accounts | High | Twilio (SMS OTP) usage-based, or a free TOTP-app-based option | ICT / Cybersecurity | A chosen provider decision | Not Started |
| Audit Logs | Accountability trail | High | Free — already built | ICT | None | Completed for auth events; data-change audit (who edited a result/certificate) Not Started |
| Monitoring | Uptime/error visibility | High | Free (Cloudflare dashboard basics) to paid (dedicated APM) | ICT | Cloudflare Pages project existing | Not Started |
| Backup Strategy | Data-loss prevention | Critical | Neon paid tier for point-in-time recovery | ICT | Production DB | Not Started |
| Disaster Recovery | Defined recovery process, RTO/RPO targets | High | Free (process, not infrastructure cost) | ICT / Board | Backup Strategy | Not Started |

## Deployment Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| GitHub | Source control | Critical | Free tier likely sufficient | ICT | None | **Completed** — `ahmadsulaimiy1/Sultan-` already exists and is in active use |
| CI/CD | Automated build/deploy on push | Medium | Free (Cloudflare Pages' native Git integration provides this without extra tooling) | ICT | Cloudflare Pages project connected to GitHub | Not Started |
| Cloudflare Pages | Hosting + Functions runtime | Critical | See Cloud Infrastructure above (same item, listed there in full) | ICT | Cloudflare account | Not Started |
| Release Pipeline | Process for promoting staging → production safely | Medium | Free | ICT | Staging Verified | Not Started — process not yet defined |

## School Operations Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Parent Portal | Guardian self-service (registration, profile, admissions, Adhkār) | Critical | Free — already built | Registrar's Office | DB + hosting live | Completed (code), Not Started (production use) |
| Student Portal | Student self-service | Critical | Free | Registrar's Office | DB + hosting live, real students | Completed (code), Not Started (production use) |
| Teacher Portal | Attendance/assessment entry | Critical | Free | Academic Leadership | DB + hosting live, real teachers | Completed (code), Not Started (production use) |
| Registrar Portal | Academic-records office | Critical | Free | Registrar's Office | DB + hosting live | Completed (code), Not Started (production use) |
| Founder Dashboard | Institution-wide read-only aggregate view | High | Free | CEO's Office | DB + hosting live | Completed (code, incl. Executive Identity migration), Not Started (production use) |
| Admissions Portal | Enquiry → application → decision (the honest subset already built, not a separate portal — lives inside the Parent Portal at `/portal/apply/`) | High | Free | Registrar's Office | DB + hosting live | Completed (code), Not Started (production use) |
| LMS | Courses/modules/lessons/assessments/content authoring | Low — explicitly deferred | Unknown/TBD — needs a real content-authoring and hosting budget decision before scoping | Board / CEO's Office | Everything above + a content strategy decision | Not Started |

## How to read this register

Several rows still read "Not Started" for account-existence, while the
*code* behind School Operations and Identity Infrastructure has been
Completed for longer — this is the exact "design/code quality outpaces
operational existence" pattern the Maturity Report already documented,
restated here in registry form, and as of 2026-07-28 the gap has
closed substantially. The path through this register, in dependency
order: **GitHub (done) → Cloudflare account (done) → Cloudflare Pages
project (done) → Neon account (done) → Staging DB (done, verified live
2026-07-28 — see `docs/shrs-staging-verification-report.md`) →
Production DB (done, verified live 2026-07-28, correctly empty of
sample data) → custom domain (done, `shroyalschools.com`, live with SSL
2026-07-28) → Resend account + domain email records (done, verified
live on both Preview and Production 2026-07-28, real inbox round-trip
proven) → MFA/monitoring/backup as hardening before real institutional
data goes live.** What remains is genuinely the last stretch:
`PORTAL_SETUP_TOKEN` rotation, security hardening (MFA/monitoring/
backups), and then real institutional data entry — not more plumbing.
