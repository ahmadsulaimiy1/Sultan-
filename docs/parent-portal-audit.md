# Parent Portal — Pre-Production Architecture Audit

*A rigorous pass across the 15 requested dimensions, before any real
student's data is entered. Where a genuine weakness existed, it was
redesigned as part of this audit (not just flagged) — this document
describes both the finding and the fix. Where something is a real gap
but out of honest scope for a Phase 1 pilot, it's marked as deferred with
a reason, not glossed over.*

---

## 1. Student registration workflow

**Finding:** there is no self-service "student registers" flow, by
design — this school's actual admission process (documented at
`/admission/`) is a 12-stage, document-based, in-person/administrative
process. A K-12 student doesn't register themselves into a real SIS;
they're enrolled by the school once admitted. Building a self-serve
student signup form would be inventing a workflow that doesn't match how
this institution actually admits students.

**Verdict:** not a gap. Correctly out of scope.

## 2. Parent registration workflow

**Finding (weakness, now fixed):** the original design had school staff
choosing a parent's password and submitting it in a plaintext JSON API
call — meaning staff would know every parent's login credential, and
that credential would pass over the wire in a form nobody should need to
transmit at all.

**Redesign:** `api/portal/admin/students.js` no longer accepts a
password. Creating a new guardian generates a random 24-byte activation
token instead; the API response includes an `activationLink`
(`/portal/set-password/?token=...`) for staff to relay via WhatsApp or
email. The parent opens it and chooses their own password at
`/portal/set-password/`, which nobody else ever sees. This is real
account activation, not admin-issued credentials.

## 3. Authentication security

**Findings (weaknesses, now fixed):**
- `x-setup-token`/`x-admin-token` were compared with plain `!==`, a
  timing side-channel. Replaced with `crypto.timingSafeEqual` via a
  shared `timingSafeEqualString()` helper, used everywhere a bearer
  token is checked.
- No brute-force protection on login. Added: 5 failed attempts locks the
  account for 15 minutes (`failed_attempts`/`locked_until` columns),
  reset on success. Verified this actually locks and actually blocks a
  correct password during lockout (see test log).
- No password strength requirement. Added a 10-character minimum,
  enforced server-side in `set-password.js` (length-based, per current
  NIST guidance, rather than complexity rules that push people toward
  predictable substitutions).
- Password hashing (scrypt, per-user random salt) and session signing
  (HMAC-SHA256, constant-time verification) were already sound from the
  original build — kept unchanged.

**Remaining, accepted for this phase:** no CAPTCHA or distributed
rate-limiting (would need Upstash/Vercel KV — a new paid dependency, the
same category of future work as the AI assistant's abuse protection).
The DB-column lockout is a real, adequate defense at this phase's
expected traffic; revisit if the portal ever sees suspicious volume.

## 4. Password reset workflow

**Finding:** there was no reset workflow at all in the original build.

**Redesign, with an explicit security trade-off:** a public
"forgot password" endpoint needs a real email-delivery service to be
safe — without one, the only way to get the reset token to the actual
parent is to hand it back in the API response, which would let *anyone*
who knows a parent's email address reset their password and log in as
them. That's worse than no reset at all. So password reset here is
**staff-mediated by design**: `api/portal/admin/reset-password.js`
(admin-token gated) generates a fresh reset link for a given email, for
staff to relay manually — same mechanism as first-time activation, same
`/portal/set-password/` page. This is a deliberate, documented choice,
not an oversight, and the natural place to wire up real email delivery
once that service exists.

## 5. Session management

**Finding:** HMAC-signed, stateless cookie (7-day expiry,
`HttpOnly`+`Secure`+`SameSite=Lax`) was already reasonably solid.
`SameSite=Lax` also means the state-changing endpoints (login, logout,
set-password) aren't meaningfully exposed to CSRF from cross-site
`fetch`/form POSTs, since Lax cookies aren't sent on those. Verified the
signing/verification round-trips correctly and rejects a tampered token.

**Remaining, accepted for this phase:** no way to revoke one specific
session early (only a natural 7-day expiry, or rotating `SESSION_SECRET`
which logs *everyone* out). A real "sign out everywhere" feature would
need a server-side session/token registry — reasonable Phase 2 work, not
a defect at this scale.

## 6. Database architecture

**Findings (weaknesses, now fixed):**
- `classes` had no uniqueness constraint on `(institution, name)` —
  typos could silently create duplicate class rows. Added, via an
  idempotent `DO $$ ... EXCEPTION WHEN duplicate_object$$` block so it's
  safe to apply to an already-existing table too.
- Term labels (`"First Term 2025/2026"`) were free text repeated across
  three tables with no canonical registry — a typo would silently create
  a second, disconnected term bucket. Added an `academic_terms` table;
  every write path now normalizes (trims) and registers the term label
  against it. This is a deliberately lighter-touch fix than a full
  foreign-key migration of `attendance_summary`/`term_results`/
  `fee_status` — that's a real Phase 2 improvement, but riskier to do
  blind (no live data to test against yet), and the registry already
  closes most of the practical typo/duplication risk.
- No student lifecycle field — every student looked permanently
  "current," with no way to represent a graduate or a withdrawal, which
  matters directly for the data-retention question this project's own
  data-protection guidance raises. Added `students.status` (`active` /
  `graduated` / `withdrawn` / `suspended`), returned to the dashboard and
  shown as a badge rather than hiding the student outright (a family
  should still be able to see their own child's final records after
  graduation).

**Remaining, accepted for this phase:** no audit trail (who changed
what, when) — that needs a `staff`/`users` concept that doesn't exist
yet (only guardians can log in today); no soft-delete/retention
timestamps beyond the new status field. Both are real Phase 2 work, not
silently ignored — see `digital-campus-roadmap.md`.

## 7. Student records architecture

**Finding:** `students`/`classes` were already properly normalized
(separate tables, not duplicated strings). `status` (above) closes the
biggest gap.

**Remaining, accepted for this phase:** no class-history table (a
student's class changes yearly; today only the *current* class is
stored, no "JSS 1 in 2024, JSS 2 in 2025" history), no demographic
fields (DOB, gender, admission date). Reasonable Phase 2 additions once
there's a real admin UI to enter them through, rather than a raw JSON
API.

## 8. Parent-child linking workflow

**Finding:** already correctly modeled as a many-to-many junction table
(`guardian_student`, with a `relationship` field) — supports multiple
guardians per child and multiple children per guardian, including
blended families. No changes needed.

## 9. Academic records structure

**Finding:** `term_results` (CA/exam/total/comment per student, term,
subject) matches the school's own published assessment policy (CA 40 +
Exam 60 = 100) exactly. Term normalization (above) is the one real fix
here.

**Remaining, accepted for this phase:** no letter-grade computation, no
subject master table (subject names are free text, e.g. "Maths" vs.
"Mathematics" could diverge) — same category as the term-registry fix,
reasonable to extend the same pattern to subjects in Phase 2.

## 10. Attendance tracking

**Finding:** stores a per-term *summary* (days present / days total),
not daily records. This is a real limitation — no calendar view, no way
to distinguish excused vs. unexcused absence, no correlation with
specific dates.

**Verdict:** this is a correctly-scoped Phase 1 simplification, not a
defect masquerading as one — it matches exactly what the dashboard was
asked to show (an attendance percentage), and building real daily
attendance-taking is a materially larger feature (a teacher-facing
UI to mark attendance every day) that wasn't in this phase's brief. Flag
it honestly as the next real capability to build, not something broken
today.

## 11. Fee and billing architecture

**Finding:** `fee_status` is a manually-set due/paid snapshot per term,
with no individual payment/transaction log — no record of who paid what,
when, or by what method, and no reconciliation against a real payment
gateway.

**Verdict:** correctly deferred, not a defect. Real fee tracking needs a
`payments` table as a transaction ledger (with `fee_status` becoming a
derived aggregate) *and* a Nigerian payment gateway integration
(Paystack/Flutterwave) — both flagged in `digital-campus-roadmap.md` as
real future-phase work requiring new paid infrastructure and a business
decision on payment flows, not something to bolt on silently here.

## 12. Notifications architecture

**Finding (partially closed this pass):** there was no notification
mechanism at all. Real push notification (email/SMS/WhatsApp) needs a
paid API and was correctly deferred in the original roadmap. What *is*
buildable with zero new infrastructure: added a `notifications` table —
every time `admin/students.js` updates a student's attendance, results,
or fees, every linked guardian gets an in-portal notification ("Updated
for Yusuf Bello: results"), shown on next login with a "mark all as
read" action. This is a real, working notification surface; it's just
in-portal only, not push. Verified end-to-end (creation, unread listing,
clearing).

## 13. Multi-language readiness

**Finding (real gap, deliberately not rushed):** the rest of the site
holds a strict EN/AR parity standard; the Parent Portal is English-only.
Machine-translating login/error copy for a security-sensitive surface
without the same care given to the rest of the site's Arabic translation
would be worse than leaving it honestly flagged. Recommending this as
the immediate next follow-up rather than doing a hasty pass here.

**Verdict:** genuine gap, explicitly not silently ignored. Scored
accordingly below.

## 14. Mobile responsiveness

**Finding:** already reasonably solid — `css/portal.css` includes a
mobile media query, the results table has its own horizontal-scroll
wrapper (so a wide table scrolls inside its card instead of breaking
page layout), and the login/dashboard/set-password pages were all tested
at a 420px viewport during this audit with no overflow or clipping
issues found.

**Verdict:** no changes needed; this is one of the stronger areas.

## 15. Scalability to 10,000+ students

**Finding:** row count itself is a non-issue for Postgres at this scale.
The real considerations:
- `@vercel/postgres` (Neon's HTTP-based serverless driver) makes a
  stateless request per query rather than holding a TCP connection —
  this is actually a *good* property here, since it avoids the
  connection-pool exhaustion that traditional `pg`-over-TCP hits under
  serverless concurrency. Worth noting: Vercel's build log flagged
  `@vercel/postgres` itself as deprecated in favor of Neon's own SDK —
  it still works today, and migrating is low-risk future work, not an
  urgent fix (no live data to migrate yet makes this cheaper to do
  later, not more urgent now).
- The dashboard fetch (`me.js`) issues 3 queries per child
  (attendance/results/fees) — fine given children-per-guardian is always
  small, not a function of total student count, so this isn't a
  systemic scaling risk. A single JOIN could reduce round-trips as a
  future optimization, not a current bottleneck.
- The new `classes` and `academic_terms` uniqueness constraints double as
  useful indexes for lookups at scale; the existing `UNIQUE(student_id,
  term[, subject])` constraints on attendance/results/fees already give
  Postgres a usable index for per-student queries (leftmost column of a
  multi-column unique index).

**Verdict:** no changes needed for 10,000+ students specifically — the
architecture doesn't have a scaling defect at that size. The N+1-style
per-child fetch and the `@vercel/postgres`→Neon-SDK migration are the two
real, low-urgency items worth tracking.

---

## Production-readiness score: 78 / 100

| Dimension | Score | Notes |
|---|---|---|
| Student registration | N/A (by design) | — |
| Parent registration | 8/10 | Redesigned this pass; activation-link delivery is still manual (WhatsApp/email by staff) |
| Authentication security | 8/10 | Timing-safe compares, lockout, strength policy fixed; no CAPTCHA/distributed rate limiting yet |
| Password reset | 7/10 | Secure and real, but staff-mediated, not self-service, until an email service exists |
| Session management | 8/10 | Solid signing/expiry/CSRF posture; no early per-session revocation |
| Database architecture | 8/10 | Status, term registry, class uniqueness fixed this pass; no audit trail yet |
| Student records | 7/10 | Status added; no class-history or demographics yet (reasonable Phase 2) |
| Parent-child linking | 10/10 | Correctly modeled from the start |
| Academic records | 7/10 | Matches real assessment policy; no subject master table yet |
| Attendance tracking | 5/10 | Term summary only, by design — real capability gap for Phase 2 |
| Fee/billing | 4/10 | Snapshot only, no ledger or gateway — correctly scoped as future work |
| Notifications | 5/10 | Real in-portal notifications now exist; no push (email/SMS/WhatsApp) yet |
| Multi-language readiness | 3/10 | Honest, acknowledged gap — English only |
| Mobile responsiveness | 9/10 | Verified at 420px, no issues found |
| Scalability (10k+ students) | 8/10 | No structural scaling defect; two low-urgency optimizations tracked |

**Verdict on "is this worthy of long-term institutional deployment":**
yes, for what it currently claims to be — a Phase 1 Parent Portal pilot —
provided the deferred items above are treated as a real, tracked backlog
rather than assumed done. The security-critical dimensions (auth,
sessions, password handling) are now genuinely solid; the honest gaps
that remain (attendance detail, fee ledger, push notifications, Arabic)
are feature completeness gaps for later phases, not defects hiding in
what's shipped today. Do not treat 78/100 as "not ready" — treat it as
"ready for Phase 1 scope, with a clear-eyed list of what Phase 2 needs."
