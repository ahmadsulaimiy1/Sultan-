# SHRS Account Creation Playbook v1.0

**Instructions only. No action in this playbook has been performed by
this session — none of it can be, from inside a coding environment with
no Cloudflare, Neon, or Resend account access.** This is written for
whoever (a school administrator, ICT lead, or the person holding
payment authority) actually creates these accounts.

Each step lists: what to do, what you'll end up holding, and exactly
where that value goes in this codebase.

## Step 1 — Cloudflare

1. **Create a Cloudflare account** (if one doesn't already exist) at
   `dash.cloudflare.com`, using an institutional email address you
   control long-term (e.g. `ict@shroyalschools.ng` once that mailbox
   exists — see Step 3 — or a real person's institutional address in
   the meantime).
2. **Create a Pages project**: Cloudflare Dashboard → Workers & Pages →
   Create → Pages → Connect to Git → select `ahmadsulaimiy1/Sultan-` →
   set the production branch to `main`.
   - Build command: `npm run build` (already defined in
     `package.json` — runs `node scripts/build.js`).
   - Build output directory: the directory `scripts/build.js` writes
     to (check that script's `OUTPUT_DIR`/equivalent constant at the
     time of setup — this playbook does not repeat build-script
     internals that could drift).
   - Cloudflare will assign a real `*.pages.dev` URL automatically at
     this step. **This playbook does not guess that URL** — read it
     directly from the Cloudflare dashboard once the project is
     created.
3. **Set environment variables** (Pages project → Settings →
   Environment variables), separately for **Preview** (staging) and
   **Production**, per `functions/_lib/db.js` and every function that
   reads `env.*`:
   - `SESSION_SECRET` — a long random string, different per environment, never reused from any local `.dev.vars` file.
   - `DATABASE_URL` — from Step 2, a **different** Neon project per environment.
   - `PORTAL_SETUP_TOKEN`, `PORTAL_ADMIN_TOKEN`, `PORTAL_SYSADMIN_TOKEN`, `PORTAL_QURAN_TOKEN`, `PORTAL_FOUNDER_TOKEN` — random values, held by named people per `docs/role-permission-matrix.md`'s trust boundaries (do not let one person hold all five).
   - `PORTAL_DEMO_PASSWORD` — set **only** in Preview/staging, never in Production (this seeds Sample Institutional Records — see Phase 1A docs).
   - `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS` — from Step 3.
   - `ANTHROPIC_API_KEY` — for the AI assistant (`functions/api/chat.js`); a real key from `console.anthropic.com`.
4. **Connect the domain** (once owned/confirmed — see Step 4): Pages
   project → Custom domains → add the domain and follow Cloudflare's
   DNS instructions (either transfer the domain's nameservers to
   Cloudflare, or add the CNAME/TXT records it specifies if DNS is
   hosted elsewhere).

## Step 2 — Neon

1. **Create a Neon account** at `neon.tech`, same institutional-email
   discipline as Step 1.
2. **Create two separate projects** — this is a deliberate,
   non-negotiable separation, not a cost-saving suggestion: one for
   **staging**, one for **production**. Reusing one project for both
   risks staging test data (including Sample Institutional Records)
   ever touching a real institutional database.
3. For each project: Neon dashboard → Connection Details → copy the
   connection string. This is what becomes `DATABASE_URL` in Step 1.3.
   Neon's connection string is Postgres-shaped
   (`postgres://user:pass@host/db`) — `@neondatabase/serverless`'s
   `neon()` call (in `functions/_lib/db.js`) parses it directly; no
   reformatting needed.
4. **Run the one-time setup call** against each project, once its
   `DATABASE_URL` is live in the matching Cloudflare Pages environment:
   ```
   curl -X POST https://<the-real-URL-for-that-environment>/api/portal/setup \
     -H "x-setup-token: <that environment's PORTAL_SETUP_TOKEN>"
   ```
   Safe to run more than once (confirmed idempotent — see
   `docs/institutional-identity-phase1a.md`'s testing note). Only set
   `PORTAL_DEMO_PASSWORD` before running this in staging, per Step 1.3.

## Step 3 — Resend

1. **Create a Resend account** at `resend.com`.
2. **Verify a sending domain** — Resend dashboard → Domains → Add
   Domain → enter the real domain from Step 4, then add the SPF/DKIM
   TXT records it provides wherever the domain's DNS is hosted (likely
   Cloudflare, once Step 1.4 is done, making this a same-dashboard
   action).
3. **Create an API key** — Resend dashboard → API Keys → Create. This
   becomes `RESEND_API_KEY` in Step 1.3.
4. **Decide the sending address** — e.g.
   `noreply@shroyalschools.ng` or similar. This becomes
   `EMAIL_FROM_ADDRESS`. This is a single transactional-sending
   address, **not** the same thing as the institutional mailboxes
   (`admissions@`, `registrar@`, etc.) described in the Deployment
   Readiness Checklist and the earlier Master Deployment Directive's
   Phase 4 — those are a separate mailbox-hosting decision (Google
   Workspace, Microsoft 365, or similar), unrelated to Resend and
   unrelated to any code in this repository.

## Step 4 — Domain

This playbook does not resolve whether `shroyalschools.ng` (or `.com`)
is already owned — the Master Deployment Directive confirmed this
session's outbound network check to that domain was blocked by its own
sandbox's gateway policy, so it genuinely could not check either way.
Whoever holds registrar access (or needs to register the domain fresh)
should confirm this **before** Step 1.4 — connecting a domain in
Cloudflare Pages requires either owning it already or registering it
through Cloudflare Registrar directly.

## Order of operations, summarized

1. Cloudflare account + Pages project (staging environment variables
   only, no domain yet).
2. Neon staging project → `DATABASE_URL` into Cloudflare staging →
   run `/api/portal/setup` against staging.
3. **Confirm every existing module actually works at the `*.pages.dev`
   staging URL** — registration, login, all five portals, the Founder
   Dashboard. This is the step that turns "Merged" into genuinely
   evidenced "Staging Verified," per the terminology policy.
4. Only after 3 is genuinely confirmed: Resend account + domain
   verification, Neon **production** project (separate from staging),
   Cloudflare **production** environment variables (separate secrets),
   domain connection, one production `/api/portal/setup` call.
5. Institutional mailboxes (a separate decision, Step 3's note above)
   can happen in parallel with 1–4, since they don't block any code
   path in this repository.
