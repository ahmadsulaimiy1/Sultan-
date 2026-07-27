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
| Domain registration | Canonical institutional web address (`shroyalschools.ng`/`.com`, whichever is confirmed) | Critical | Starter (annual registrar fee) | CEO's Office | None | **Unconfirmed** — this session cannot verify whether the domain is already owned; someone with unrestricted network access must check directly, per `docs/digital-campus-master-deployment-directive.md`. |
| Domain strategy | Subdomain plan (`portal.`, `admissions.`, `lms.`, etc.) for scaling multiple services under one domain | Medium | Free (DNS records only) | ICT / CTO | Domain registration | Designed — see `docs/shrs-digital-infrastructure-blueprint.md` §1 |
| DNS | Resolves the domain to Cloudflare | Critical | Free | ICT | Domain confirmed + Cloudflare account | Not Started |
| SSL | HTTPS encryption for all traffic | Critical | Free (Cloudflare Universal SSL) | ICT | DNS pointed at Cloudflare | Not Started — auto-provisions once the domain is connected to a Cloudflare Pages project |

## Cloud Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Cloudflare (account) | Hosting platform for the whole Digital Campus | Critical | Free tier — verify at signup | ICT / CTO | None | **Completed** — account exists (`Ahmadbinibrohim@gmail.com`), verified 2026-07-27 |
| Hosting (Pages project) | Serves the static site + Pages Functions (the entire `functions/api/` backend) | Critical | Free tier | ICT | Cloudflare account | **Completed** — `shroyalschools-web` Pages project live at `shroyalschools-web.pages.dev`, first successful deploy 2026-07-27. A separate plain Worker named `shroyalschools` was created first by mistake (wrong project type — bare Workers don't support the `functions/` Pages Functions convention this codebase uses) and should be deleted or left unused; it is not part of the real deployment. `wrangler.toml` was added to the repo to set `pages_build_output_dir`, `compatibility_date`, and the `nodejs_compat` compatibility flag directly, working around a confirmed Cloudflare dashboard bug where the Compatibility Flags UI control does not reliably accept that flag. |
| Staging environment | Safe pre-production testing at a real, reachable URL | Critical | Free (Cloudflare Pages preview deployments) | ICT | Cloudflare Pages project | **Completed** — Preview deployments build automatically from the `claude/wec-institutional-design-kt3u0t` branch (confirmed working 2026-07-27); no environment variables (database, tokens) configured yet, so only the static site is verified, not any API-backed feature |
| Production environment | The real live site | Critical, sequenced *after* staging is verified | Free–Starter depending on usage | ICT / CEO's Office | Staging Verified | **In Progress** — `main` branch deploys automatically to `shroyalschools-web.pages.dev` and the static site is confirmed live (2026-07-27); no custom domain attached yet (still on the free `.pages.dev` subdomain — see Domain Infrastructure above) and no environment variables set, so every database-backed feature (portal, login, dashboards) is still inactive on this live URL |

## Database Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Neon (account) | Postgres database provider — HTTP-driver-compatible with Cloudflare Workers (the reason this stack uses Neon specifically, not any Postgres host — see the Blueprint's Cloud Architecture section) | Critical | Free tier likely sufficient initially — verify at signup | ICT | None | **Completed** — account exists (`Ahmadbinibrohim@gmail.com`), verified 2026-07-28 |
| Staging DB | Safe testing without touching real institutional data | Critical | Free | ICT | Neon account | **Completed** — `/api/portal/setup` run successfully against a real Neon project (via the Cloudflare Preview environment) 2026-07-28; tables created, sample data seeded. Two real code bugs were found and fixed live in the process: `sql.query()` doesn't exist on `@neondatabase/serverless`'s `neon()` client (fixed to `sql()`, 7 files), and the ~90-statement schema setup exceeded Cloudflare's per-invocation subrequest limit (fixed by batching via `sql.transaction()`). See `functions/api/portal/setup.js` and the two commits fixing this. |
| Production DB | Real institutional data store | Critical | Free–Starter | ICT | Neon account, Staging Verified first | Not Started — a **separate** Neon project from staging, per the Account Creation Playbook's non-negotiable separation |
| Backup DB / backup strategy | Disaster-recovery data protection | High | Neon paid tiers add point-in-time recovery | ICT | Production DB existing | Not Started |

## Email Infrastructure

| Name | Purpose | Priority | Cost | Owner | Dependencies | Status |
|---|---|---|---|---|---|---|
| Resend (account) | Transactional email (verification links, password resets) — the provider `functions/_lib/email.js` is already coded against | High | Free tier for modest volume — verify at signup | ICT | None to create the account; domain confirmed to verify sending | Not Started |
| SMTP | Alternate sending method | Low | N/A | ICT | Resend account | Not Applicable — current code uses Resend's REST API, not SMTP |
| SPF | Anti-spoofing DNS record authorising Resend to send as your domain | Critical (email deliverability) | Free | ICT | Domain DNS access | Not Started |
| DKIM | Cryptographic signing for email authenticity | Critical | Free | ICT | Domain DNS access, Resend account | Not Started |
| DMARC | Policy for handling SPF/DKIM failures, protects domain reputation | High | Free | ICT | SPF + DKIM configured | Not Started |

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

Most rows still read "Not Started" for account-existence, while the
*code* behind School Operations and Identity Infrastructure is already
Completed — this is the exact "design/code quality outpaces operational
existence" pattern the Maturity Report already documented, restated
here in registry form. As of 2026-07-27, two links in that chain moved
from Not Started to real: the Cloudflare account exists, and the
`shroyalschools-web` Pages project is live and deploying automatically
from both branches. The path through this register, in dependency
order, is: **GitHub (done) → Cloudflare account (done) → Cloudflare
Pages project (done) → Neon account → Staging DB → prove one real user
journey works at a staging URL → Resend account + domain email records
→ Production DB → environment variables on the live Pages project →
custom domain → MFA/monitoring/backup as hardening before real
institutional data goes live.**
