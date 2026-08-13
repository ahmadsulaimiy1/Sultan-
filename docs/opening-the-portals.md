# Opening the portals

**Correction, and the reason this document was rewritten.** An earlier
version claimed nothing in this project could create the first staff
account, and a separate page was built to fix it. That was wrong. The
**Admin Centre** at `/portal/admin/centre/` has always been able to do
it: it tries a signed-in staff session first, falls back to a
`PORTAL_SYSADMIN_TOKEN` gate, and can create staff, grant roles, issue
activation links, and record appointments. The redundant page has been
removed. Use the Admin Centre.

---

## What you need set in Cloudflare

Cloudflare Pages → *Settings* → *Variables and secrets*, all marked
**Secret**:

| Name | Why |
|---|---|
| `DATABASE_URL` | The Neon connection string. Without it every portal route answers "no database is linked". |
| `SESSION_SECRET` | Signs session cookies. Without it, sign-in returns "portal is not configured". 32+ random characters. |
| `PORTAL_SYSADMIN_TOKEN` | The Admin Centre's bootstrap gate, and the disaster-recovery path if every privileged account is ever locked out. Long, random, treated as a master key. |

Environment variables only take effect on a **new deployment** — after
adding any of them, use *Deployments* → **Retry deployment**.

If the database has never been initialised, run the setup once:

```
POST /api/portal/setup      header: x-setup-token: <PORTAL_SETUP_TOKEN>
```

It is idempotent — every statement is `IF NOT EXISTS`, so running it
again on a live database changes nothing and drops nothing.

## Opening the Registrar's Office, and onboarding staff

Go to **`/portal/admin/centre/`**. If no staff account exists yet it
will show a token gate — paste `PORTAL_SYSADMIN_TOKEN`. It is kept in
`sessionStorage` and cleared when the tab closes; there is a **Lock**
button to clear it sooner.

For each officer, three steps:

1. **Create the staff record** — name, Staff ID, office, position title.
2. **Grant the role** — the code from the table below.
3. **Create the login** — this returns a single-use activation link.
   Send it to that person; they choose their own password. No password
   is ever set for them, and nobody else ever sees it.

Once the Registrar and Head of Schools accounts exist and have signed
in, the Admin Centre works from their **session** and the token gate is
no longer needed for day-to-day work. Keep the token set anyway — it is
the way back in if every privileged account is ever locked out.

### Which seat opens what

Office names must match exactly; the endpoint resolves offices by name
and a near-miss silently leaves the person with no office.

| Role | Office (exact name) | Opens |
|---|---|---|
| `REG` | Registrar's Office | Registrar portal, Newsroom, family escalations, examination readiness |
| `EXE` | Head of Schools / Administrator | Founder Dashboard, institution-wide oversight, every office view |
| `SYSADMIN` | ICT Office | Admin Centre by session, access logs, data-protection requests |
| `DSL` | Student Affairs | Safeguarding Intelligence Framework |
| `PRIN` | Head Teacher — Sultan Hanafi Basic School | Behaviour, teacher performance, that institution's office |
| `PRIN` | Principal — Sultan Hanafi Secular College | Behaviour, teacher performance, that institution's office |
| `PRIN` | Office of the Principal, Sultan Hanafi Islamiyyah College | Arabic fluency, that institution's office |
| `PRIN` | Office of the Principal, Sultan Hanafi Qur'an College | Tajwīd compliance, ḥifẓ oversight, that institution's office |
| `FIN` | Finance Office | Fee records and the finance views |

**Start with `REG` and `EXE`.** Between them they reach every portal
built so far.

A founding role grant can be left school-wide. Narrowing a grant to one
institution is available in the Admin Centre and is better done once
you have settled which institutions each officer actually covers — a
first appointment should not silently narrow itself to an institution
nobody has chosen yet.

### Onboarding ordinary staff afterwards

Exactly the same three steps, done by the Registrar or Head of Schools
from their own session rather than the token. From a session, every
action is recorded in the staff audit log against the person who did
it — which is the real reason to stop using the token as soon as you
can. The token records nothing, because when it runs there may be
nobody to record.

Teachers additionally need a class assignment (`assign-class`) before
the Teacher Portal shows them a roster.

## What is still shut, and why

- **Activation and reset emails** are not delivered until
  `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are set. Until then the
  activation link must be copied from the Admin Centre by hand and given
  to the person directly.
- **The assistant** needs `ANTHROPIC_API_KEY`.
- **WhatsApp** needs `TWILIO_AUTH_TOKEN`.
- **Web push** needs the three `VAPID_*` values.

See `docs/build-audit-2026-08.md` for the full picture.
