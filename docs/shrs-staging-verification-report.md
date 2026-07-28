# SHRS Staging Environment — Verification Report

**Date:** 2026-07-28
**Scope:** The Cloudflare Pages **Preview** environment of `shroyalschools-web`, wired to a Neon Postgres project, verified live and end-to-end this session. This is a narrower, evidence-specific companion to `docs/shrs-infrastructure-activation-register.md` — that register tracks account-level existence across every platform; this report is the detailed record of what was actually clicked, run, and observed against a real database tonight.

## What is now real

Per the Account Creation Playbook's "Order of operations," Steps 1–3 are done:

1. **Cloudflare account + Pages project** — already live before tonight (`shroyalschools-web`, auto-deploying from GitHub).
2. **Neon project connected** — a real Neon Postgres connection string is now set as `DATABASE_URL` in the Preview environment, alongside all other required variables (`SESSION_SECRET`, `PORTAL_SETUP_TOKEN`, `PORTAL_ADMIN_TOKEN`, `PORTAL_SYSADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN`, `PORTAL_DEMO_PASSWORD`).
3. **`/api/portal/setup` run successfully** against that real database — schema created, sample/demo data seeded, confirmed via the new `/portal/admin/setup/` page (see below).
4. **Four of the platform's real user journeys verified live**, signed in as the actual seeded accounts, reading actual database rows through the actual deployed Functions — not a local mock:
   - **Guardian** (`demo@shroyalschools.ng`) — Parent Portal dashboard loaded: welcome name, institutional profile, verification status, real child records.
   - **Student** (admission no. `SHR-2026-902`) — Student Portal loaded: dual-enrolment chips (Qur'an College + Islamic & Arabic Studies), attendance, Hifz stage 2 of 5 with per-Juz' progress.
   - **Teacher** (staff no. `SHR-STF-0901`) — Staff Identity page and Teacher Portal both loaded: real class-teacher assignment (JSS 1, Royal College), Mathematics subject assignment, 1-student roster.
   - **Founder Dashboard** (legacy bearer token, since no Executive-role staff account exists yet) — loaded correctly, and correctly reported **0 active students** — this is by design, not a bug: the dashboard deliberately excludes `is_sample_data = true` rows from every real count, so seeded demo students never masquerade as real institutional numbers.

## Real bugs found and fixed live, in the process

Getting to the result above surfaced two genuine defects that no amount of local testing had caught, because this sandbox has never had real Neon network access to exercise them:

1. **`sql.query()` does not exist.** `@neondatabase/serverless`'s `neon()` factory returns a callable tag function with a `.transaction()` method — not an object with `.query()` (that belongs to the package's separate `Pool`/`Client` classes, a different connection model this codebase doesn't use). Every one of the 18 call sites across 7 files (`setup.js`, `founder/dashboard.js`, `profile.js`, `staff/admissions-applications.js`, and three `staff/teacher/*.js` files) was calling a method that didn't exist, and would have failed with an uncaught, unhelpful Cloudflare-level 500 the first time any of them ever ran against a real database. Fixed: `sql.query(x)` → `sql(x)`, matching the driver's actual "ordinary function usage" signature.
2. **Schema setup exceeded Cloudflare's per-invocation subrequest limit.** `setup.js`'s `STATEMENTS` array runs ~90 DDL statements; one `sql()` call per statement means ~90 fetches (subrequests) in a single Worker invocation, over the platform's default limit. Fixed by batching via `sql.transaction()` in groups of 25 — each batch is one HTTP round-trip, and since every statement is transactional DDL (`CREATE TABLE`/`INDEX IF NOT EXISTS`), batching is strictly safer than the original one-by-one loop, not just faster.

Both fixes are committed (`4796294`, `856d4a2`) and now live in the verified Preview deployment.

## One naming inconsistency to resolve before this goes further

The Neon project connected tonight is named **`shrs-production`**, on its **`production`** branch — but it is wired into Cloudflare's **Preview** (staging/testing) environment, not Production. Functionally this causes no harm today (Cloudflare's Preview/Production split is what actually gates which secrets and which URL are in play), but the Account Creation Playbook is explicit that staging and production must be **two separate Neon projects**, never the same one reused. Recommended before any real institutional data enters this system: either rename this Neon project to something staging-specific (e.g. `shrs-staging`) and create a genuinely separate `shrs-production` project for later, or treat this project as the real production database from the start and create a distinct, additional Neon project for staging. Either is fine — what matters is that the two are never the same project, and that whoever holds Neon access makes this an explicit decision rather than an accidental default.

## What this does not yet cover

Named plainly, not silently assumed:

- **Registrar and Finance staff roles** — no demo `REG`/`FIN` account was seeded, so those two roles' live login has not been directly exercised tonight (their code was verified locally in earlier phases of this engagement, per `docs/identity-migration-plan.md`, but not against this real database).
- **Production database** — entirely separate work; see the naming note above and the Playbook's Step 2 order (staging proven first, deliberately).
- **Custom domain, Resend/email, MFA, monitoring, backups** — all still exactly as `docs/shrs-infrastructure-activation-register.md` describes; nothing about tonight's work changes their status.
- **Any endpoint not exercised above** — e.g. admissions application review, Registrar's Office lifecycle actions, fee entry, announcements admin. These have prior local verification (see their respective phase docs) but not tonight's live-database confirmation.

## Immediate recommendation

Rotate `PORTAL_SETUP_TOKEN` once satisfied no further `/api/portal/setup` calls are needed against this project for now — it was pasted into a browser-based tool multiple times this session while debugging the two bugs above, per the Playbook's own guidance to rotate setup tokens after initial use.
