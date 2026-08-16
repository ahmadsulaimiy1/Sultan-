# Account Creation Journey

Closes a real, correctly-identified usability gap: the site had Sign In
everywhere and no visible Sign Up. This is the answer — a real
self-service registration workflow, built as an extension of the
existing Identity & Access Platform (the same guardian identity, same
session cookie, same audit log), not a second, disconnected
authentication system.

## The one deliberate design decision this document defends

The brief's own example listed "Parent/Guardian Account" and
"Admissions Applicant Account" as if they might be two different
things. **They are the same account.** The brief's own Admissions
Integration section says why not to split them: *"The account should
become the foundation for enquiries, admissions applications,
application tracking, future student onboarding — this is far more
valuable than creating a disconnected login system."* A visitor
registers once, as a guardian; that identity can immediately submit an
admissions enquiry, and — once a child is admitted and enrolled by
staff — the exact same login becomes real Parent Portal access. No
second identity type, no second session cookie, no reconciling two
accounts later.

## What self-registers and what doesn't — unchanged governance rule

| Account type | Self-service? | Why |
|---|---|---|
| Parent/Guardian | **Yes** — this phase | Low institutional risk; the account only carries what the registrant themselves typed in until staff link a real child to it. |
| Admissions Applicant | **Yes — same account as above** | Not a separate identity; see above. |
| Student | **No** | Unchanged. `/portal/student/login/` now states plainly: *"Student accounts are activated by the school after admission — there is no self-service sign-up here."* |
| Staff | **No** | Unchanged. `/portal/staff/login/` already stated this before this phase; nothing here alters it. |

Nothing in this phase touches student or staff account creation. Every
governance boundary from `docs/staff-identity-architecture.md` (least
privilege, institution-issued credentials for roles the school must
control) stands exactly as before.

## The journey

1. **`/portal/register/`** — Full Name, Email, Phone, Password. A
   3-step progress rail (Create Account → Verify Email → Your
   Dashboard) sets expectations up front. Submitting **signs the
   registrant in immediately** — verification is not a login gate (see
   below) — and shows a real success state, never a "coming soon" page.
2. **Email verification** — a real verification link is generated and,
   if a transactional email provider is configured, actually emailed
   (see "Email sending" below). The dashboard shows a persistent banner
   until verified, with a one-click resend.
3. **`/portal/apply/`** — once signed in, submit a real admissions
   enquiry (child's name, institution, desired class, notes). Requires
   a verified email — the one place verification actually gates
   something, because this is the point an account starts carrying
   real institutional weight (a staff member will act on it).
4. **Dashboard — "My Enquiries & Applications"** — every submitted
   application and its current status (Submitted → Under Review →
   Waitlisted/Offered → Admitted, or Declined/Withdrawn), visible
   alongside any enrolled children.
5. **Forgot / Reset password** — `/portal/forgot-password/` requests a
   reset link; `/portal/set-password/` (already existed) completes it —
   no new completion flow needed, the existing activation mechanism
   already handles this correctly.

## Why verification doesn't block login

Only the actual registrant knows the password they just chose — nobody
else can sign in to a freshly self-registered account regardless of
whether its email is verified. Verification protects against a
*different* risk: someone registering with an email address they don't
own (accidentally or otherwise). That risk is closed by gating the one
action that actually matters — submitting an admissions application —
behind `email_verified_at`, not by locking a legitimate registrant out
of their own new account while they wait for an email that, in a
sandbox with no email provider configured, may never arrive.

## Email sending — configured for real, not exercised here

`functions/_lib/email.js` calls Resend's REST API
(`RESEND_API_KEY` + `EMAIL_FROM_ADDRESS`). **Neither is set in this
project's sandbox** — no real account exists to configure. The system
is built to be genuinely functional once a school administrator adds
real credentials, and gracefully degrades when they aren't set:

- **Registration & resend-verification**: if email isn't configured,
  the verification link is returned directly in the API response and
  shown on-screen ("Email delivery is not yet configured — here is your
  link"). This is safe specifically because both endpoints only ever
  return that link to the same browser session that is either
  registering the account or already signed into it — never to an
  unauthenticated third party.
- **Forgot password**: deliberately **never** does this. Returning a
  reset link to whoever merely typed in an email address — with no
  proof they own it — is exactly the account-takeover vector
  `admin/reset-password.js`'s original design explicitly avoided
  (see that file's header comment, predating this phase). Without a
  real email provider configured, self-service password reset
  genuinely does not work end-to-end yet — the login and
  forgot-password pages both say so and point to the existing
  staff-mediated fallback (contact the school; staff hold
  `PORTAL_ADMIN_TOKEN` and can issue a reset link directly, unchanged
  from before this phase).

## Staff-side integration — a real Permission Engine consumer

`POST /api/portal/staff/admissions-applications` (list + update-status)
is session-authenticated against a staff member's own login and checks
`admissions` area permissions via `functions/_lib/permissions.js` —
**not** a bearer token. This is the first real, non-bearer-token
consumer of the Permission Engine built in the Staff Identity phase,
directly closing part of the gap the Institutional Readiness Review's
§3 named: *"most of the system doesn't call the Permission Engine
yet."* A Registrar (REG role) sees every application; a Principal
(PRIN role) sees only their own institution's — exactly as
`role-permission-matrix.md` §4.11 already specifies, enforced in code
for the first time here.

## Institutional Identity Profile (Phase 1A)

Registration collects an Identity Type and a WhatsApp number alongside
the original four fields (with Confirm Email/Confirm Password), and a
signed-in guardian can now complete a much fuller optional profile —
Personal, Contact, Residential, Professional, Family, Emergency
Contacts, Educational Interests — at `/portal/profile/`, tracked by a
computed Profile Completion %. See
`docs/institutional-identity-phase1a.md` for the full account.

## Explicitly deferred, named rather than faked

- **Document upload** — no file storage backend (R2/S3/etc.) exists
  anywhere in this project. `/portal/apply/` says so plainly rather
  than showing an upload button that goes nowhere.
- **A staff-facing Registrar's Office UI** for reviewing applications —
  the endpoint is real and callable (curl examples below); a proper
  review screen is Registrar's Office module work, per the
  Institutional Readiness Review's own recommended sequencing.
- **A merged/unified session model** across guardian/student/staff —
  deliberately NOT built. The three parallel session cookies established
  earlier in this engagement stay parallel (lower blast radius on a live
  system); "one identity architecture" is achieved through shared
  primitives (`session.js`, `auth_audit_log`, the Permission Engine) and
  real cross-references (`reviewed_by_staff_id`), not by merging
  independent trust boundaries that were deliberately kept separate.

## Curl examples

Reviewing applications (staff, session cookie required):
```
curl https://<your-domain>/api/portal/staff/admissions-applications \
  -b "shr_staff_session=<a signed-in Registrar's session cookie>"

curl -X POST https://<your-domain>/api/portal/staff/admissions-applications \
  -b "shr_staff_session=<cookie>" -H "content-type: application/json" \
  -d '{"action": "update-status", "applicationId": 1, "status": "offered", "decisionNote": "Offer extended for JSS 1, 2026/2027 session."}'
```

## Testing note

**Updated — actually run end-to-end, not just mocked.** This sandbox
still has no egress to Neon or to shroyalschools.com (confirmed directly:
both return a blocked-proxy error), so the real production database was
not reachable. But `@neondatabase/serverless`'s `neon()` is an HTTP
client with no Neon-specific behaviour beyond the transport — the exact
same SQL and application code was run against a real local PostgreSQL
16 instance, with `wrangler pages dev --compatibility-flags
nodejs_compat` executing the actual, unmodified Cloudflare Pages
Functions (a throwaway `pg`-backed shim stood in for `getSql()` only for
the duration of this test, then was reverted — no application code was
touched). Playwright drove real Chromium through the real HTML/CSS/JS
against that live backend: register (real form submit) → a real
`guardians` row created, session cookie set, immediately signed in →
verify (using the link the API returns directly, since `RESEND_API_KEY`
is genuinely unset — confirmed by inspection, not assumed) → `guardians.email_verified_at`
confirmed set via direct SQL, and `GET /api/portal/me` confirmed
returning `emailVerified: true` → dashboard reached, session survives a
refresh → sign out → dashboard redirects to `/portal/login/` → wrong
password rejected (401) → correct password signs in (200), repeatable
across multiple logout/login cycles → forgot-password request writes a
real `reset_token` (confirmed via SQL) but, exactly as designed, never
exposes it to the caller — self-service reset genuinely cannot complete
without a configured email provider, matching this doc's own claim
above rather than contradicting it.

**Two real bugs were found this way and fixed, not just described:**
1. `/api/portal/setup`'s "safe to run again" claim was false — the two
   `DO $$ ... EXCEPTION WHEN duplicate_object` blocks guarding
   `classes_institution_name_key` and
   `adhkar_completions_guardian_period_date_key` didn't catch
   `duplicate_table` (42P07), which is what a repeat `ADD CONSTRAINT
   UNIQUE` actually raises for its auto-generated backing index. Fixed
   by also catching `duplicate_table`; verified by calling `/api/portal/setup`
   three times in a row against an already-set-up database.
2. `.account-status-banner{display:flex}` in `css/portal.css` had the
   same CSS specificity as the `[hidden]` attribute's UA-stylesheet
   default and was declared later, so it silently overrode `hidden`
   regardless of its value — **the "please verify your email" banner
   never actually disappeared for any real guardian, ever, even after
   genuinely verifying**, since this class was introduced. `js/portal-dashboard.js`'s
   `verifyBanner.hidden = !!data.emailVerified` was correct the whole
   time; the CSS silently discarded it. Fixed with a `:not([hidden])`
   guard; confirmed both directions (shows unverified, hides verified)
   with `page.isVisible()` and the element's `.hidden` property, not
   `textContent` (which doesn't reflect visibility at all — the wrong
   assertion this bug would evade if you check by reading page text
   instead of actual visibility).

Neither finding would have surfaced from code review or from
route-mocked testing (which supplies whatever `emailVerified` value the
mock is told to) — only running the real code against a real database
and reading the real DOM state caught them. Also added
`Cache-Control: no-store` to every portal API response, since none of
them are ever safe to serve stale — a defensible hardening independent
of the two bugs above, not itself the fix for either.

---

## Re-issuing an activation link — Staff Access

`create-login` was reachable from exactly one screen: the New Staff form,
as the final step of creating somebody. For a staff member who already
existed there was **no screen at all**, so the only way to give them a
fresh link was a hand-written `curl` carrying the sysadmin token.

That is the case that arises most — a link used, a link expired, a link
replaced — and it was the case with no button. It cost the Registrar her
first week of access.

**Admin Centre → Staff Access** now does it: search by name or Staff ID,
read the account's state, and issue a fresh link that is shown as a
complete address with a Copy button.

### It checks before it issues

"The link does not work" has several causes and only some are answered by
issuing another link. The panel calls `login-status` first and says which
it is:

| State | What it means |
|---|---|
| `active` | Password already set. **Sign in — a new link is not needed.** |
| `active-with-open-reset` | Password set, and a reset link is also open. |
| `awaiting-activation` | A live link is outstanding; it is the only one that works. |
| `link-expired` | Past its expiry. Issue a fresh one. |
| `link-used-or-superseded` | No password, no live link. Issue a fresh one. |
| `no-account` | No login has ever been created. |

`login-status` never returns the token or the password hash.

### Issuing cancels every earlier link

`create-login` is `ON CONFLICT DO UPDATE` and the account row holds a
single token, so the moment a new link is issued every earlier one stops
working. The panel says so before it acts and asks for confirmation,
because that is not what "issue another link" sounds like it does. An
older link still sitting in somebody's inbox reports itself only as
unusable, with no explanation of why — which is exactly how this looked
from the outside.

### The address is assembled here

The endpoint returns a path. What gets sent to a person has to be the
whole address or they cannot open it, so the panel joins it to the site
origin rather than leaving that to whoever is copying it.

### Authentication

The Admin Centre unlocks automatically for a signed-in staff account
holding **MU on `staff_records`** — per `docs/role-permission-matrix.md`
§4.20, SYSADMIN and EXE. The token box is a bootstrap and
disaster-recovery fallback only. Note the header: it is
**`x-sysadmin-token`** carrying **`PORTAL_SYSADMIN_TOKEN`** — *not*
`x-admin-token` / `PORTAL_ADMIN_TOKEN`, which belong to other endpoints
and are rejected here with a 403.
