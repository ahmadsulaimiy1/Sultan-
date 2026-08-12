# Opening the portals

Everything in the staff portal was built and then locked, because of one
gap nobody had hit yet: **there was no way to create the first staff
account.**

`/api/portal/admin/staff` accepts either a staff session or an
`x-sysadmin-token` header. The Admin Centre only ever sends cookies. So
creating an account required an account that already held
`staff_records: MU` — and the only account the setup endpoint seeds is a
sample Teacher, which holds no such grant.

The result: the Registrar portal, the Newsroom, the Founder Dashboard,
Safeguarding, the Admin Centre and the Desk's system sections were
unreachable by anybody, permanently, without `curl`.

`/portal/staff/founding/` is the missing hand. Same endpoint, with the
header the Admin Centre never sent.

## Before it will work

Three secrets must exist in Cloudflare Pages → *Settings* → *Variables
and secrets*, all marked **Secret**:

| Name | Why |
|---|---|
| `DATABASE_URL` | The Neon connection string. Without it every portal route answers "no database is linked". |
| `SESSION_SECRET` | Signs the session cookies. Without it, sign-in returns "portal is not configured". Use a long random string — 32+ characters. |
| `PORTAL_SYSADMIN_TOKEN` | What the founding page authenticates with. Long, random, and treated as a master key. |

Then run the database setup once, if it has never been run:

```
POST /api/portal/setup      header: x-setup-token: <PORTAL_SETUP_TOKEN>
```

It is idempotent — every statement is `IF NOT EXISTS`, so running it
again on a live database changes nothing and drops nothing.

**`RESEND_API_KEY` is not required to open the portals**, but without it
no activation email, password reset or login code is ever delivered.
Activation links can be copied by hand from the founding page in the
meantime; everything else stays dark until it is set.

## Opening the seats

Go to **`/portal/staff/founding/`**, paste the System Administrator
token, and open the seats you need.

Two rules the page enforces rather than merely states:

**It will not invent a person.** Every name, staff number and email is
typed by the school. The page refuses to submit a seat with an empty
name. No officer of this institution is named by software.

**It will not set a password.** Each account is created without one and
issued a single-use activation link. Give the link to that person; they
choose their own password. Nobody — not the school, not the page —
ever sees it. The token you paste is held in memory only: never stored,
never written to the device, gone on reload.

### The seats, and what each one opens

| Role | Opens |
|---|---|
| **REG** — Registrar | Registrar portal, Newsroom, family escalations, examination readiness |
| **EXE** — Head of Schools & Administrator | Founder Dashboard, institution-wide oversight, every office view |
| **SYSADMIN** — System Administrator | Admin Centre, access logs, data-protection requests |
| **DSL** — Designated Safeguarding Lead | Safeguarding Intelligence Framework |
| **PRIN** ×4 — Head Teacher and the three Principals | Behaviour, teacher performance, Arabic fluency, Tajwīd compliance, and each institution's own office |
| **FIN** — Finance Officer | Fee records and the finance views |

You do not have to open all of them. **Start with the Registrar and the
Head of Schools** — between them they reach every portal built so far.

Role scope is left school-wide on a founding grant. That is deliberate:
a first appointment should not silently narrow itself to an institution
nobody has chosen yet. Narrow it in the Admin Centre once you have
settled which institutions each officer covers.

## After the first two accounts exist

**Stop using the founding page.** The Admin Centre
(`/portal/admin/centre/`) is the right place to appoint staff from then
on: it works from a signed-in session, it records who did what in the
staff audit log, and it enforces the permission matrix. The founding
page bypasses all three, because at the moment it runs there is nobody
to record and no matrix to enforce.

Keep `PORTAL_SYSADMIN_TOKEN` set. Several endpoints keep it as a
disaster-recovery fallback for exactly the situation this document
describes — the day every privileged account is locked out.

## What is still shut, and why

- **Parent and student portals** — these already accept self-service
  registration and admin-created accounts, but no verification email is
  delivered until `RESEND_API_KEY` is set. That is the blocker, not
  the accounts.
- **The assistant** — needs `ANTHROPIC_API_KEY`.
- **Web push** — needs the three `VAPID_*` values, which appear in no
  other documentation in this repository.

See `docs/build-audit-2026-08.md` for the full picture.
