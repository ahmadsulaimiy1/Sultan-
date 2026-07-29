# SHRS Approval Workflow Architecture v1.0

*Roadmap item named in `docs/identity-migration-register.md` and
`docs/registrar-office.md`'s "what this phase honestly left open"
section: several areas of `role-permission-matrix.md` describe a joint,
two-role authority — "Registrar + Principal jointly," "Qur'an College
Officer jointly with Principal" — that, until this document and the code
behind it, no endpoint in this codebase actually enforced. This is that
gap's design and its first real implementation.*

---

## 1. The problem, precisely

Grep the codebase for `approvedByStaffNo` before this change and you find
the same pattern three times, in three different offices:

- **`admin/announcements.js`** (pre-migration) — an optional field, never
  persisted anywhere, discarded after the fact.
- **`staff/registrar/lifecycle-events.js`** (promotions, withdrawals,
  graduations) — resolved to a real `staff.id` and stored on
  `student_lifecycle_events.approved_by_staff_id`, but never checked
  against a role, a session, or a second real person. The requesting
  Registrar could type in any staff number, including their own, or
  leave it blank.
- **`staff/registrar/certificates.js`** (pre-migration) — the same
  pattern as announcements: an optional field, not even persisted on the
  `certificates` row itself, only mentioned in the audit log's metadata.

In every case, the Matrix's own text was more specific than the code
behind it. Role-permission-matrix.md §4.13 (Certificates) reads:

| Role | V | C | A |
|---|---|---|---|
| REG | ✓ | ✓ (once graduation approved) | |
| PRIN | own institution | | ✓ (jointly with REG) |

That table gives PRIN the **A (Approve)** permission — a real, distinct
grant, not a decoration on REG's row. But no code ever checked whether
the person typing a name into `approvedByStaffNo` actually held it, was
a real, currently active staff member, or was a different person from
the one making the request. A Registrar acting entirely alone could
"jointly" approve their own certificate, promotion, or withdrawal.

This is a real integrity gap, not a cosmetic one: several of these
actions are exactly the kind a Board or auditor would expect two-person
control over (issuing a credential, ending a student's enrolment,
publishing an institution-wide notice).

## 2. What "enforced, not just recordable" means here

Three properties, all missing before this document:

1. **A pending state exists.** The action does not take effect the
   moment the first person submits it. Something has to happen before
   the real side effect (the INSERT, the status change) runs.
2. **Separation of duties is a real code check.** The person who decides
   cannot be the person who requested — checked by comparing staff IDs,
   not names or staff numbers a human typed in.
3. **The approver's authority is checked against the SAME Permission
   Engine every other endpoint uses** (`hasPermissionFor()` in
   `functions/_lib/permissions.js`), not a role-name string comparison
   and not trust in whatever the requester claims.

## 3. The generic engine

### Schema — `staff_approvals` (`sql/schema.sql`, mirrored in
`functions/api/portal/setup.js`)

```sql
CREATE TABLE IF NOT EXISTS staff_approvals (
  id                    SERIAL PRIMARY KEY,
  area_code             TEXT NOT NULL,      -- a permission-matrix.js area key, e.g. 'certificates'
  target_type           TEXT NOT NULL,      -- e.g. 'certificate_issue'
  payload               JSONB NOT NULL,     -- the action's own parameters
  requested_by_staff_id INTEGER NOT NULL REFERENCES staff(id),
  approver_role_code    TEXT NOT NULL REFERENCES roles(code),
  institution_id        INTEGER REFERENCES institutions(id),
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  decided_by_staff_id   INTEGER REFERENCES staff(id),
  decision_note         TEXT,
  result_ref            TEXT,               -- e.g. the certificate's reference_no, once issued
  requested_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at            TIMESTAMPTZ
);
```

One row per request, one area at a time — a request for a certificate
and a request for a graduation are both rows here, distinguished by
`area_code`/`target_type`, not separate tables. `payload` carries
everything `performOnApprove` needs to actually execute the action, so
nothing has to be re-derived (or re-trusted) at decision time.

### Helper — `functions/_lib/approvals.js`

Three functions:

- **`createApprovalRequest(sql, {...})`** — inserts a pending row.
  Called by an endpoint instead of writing directly.
- **`listPendingApprovals(sql, {areaCode, institutionId})`** — a
  decision-maker's queue, optionally scoped to their own institution
  (school-wide requests with `institution_id IS NULL` always included).
- **`decideApproval(sql, {approvalId, decidingStaffId, decision, note,
  areaCode, permissionCode, performOnApprove})`** — the enforcement
  point. In order:
  1. Loads the pending row; 404s (as an error string) if it's gone or
     already decided.
  2. **Refuses if `decidingStaffId === requested_by_staff_id`** —
     separation of duties, checked before anything else, including
     before the permission check.
  3. Calls `hasPermissionFor(sql, decidingStaffId, areaCode,
     permissionCode, approval.institution_id)` — the real Permission
     Engine, scoped to the request's own institution when it has one.
  4. On `'approve'`, runs `performOnApprove({payload, approval,
     decidingStaffId})` — the caller's own side effect — and stores its
     return value as `result_ref`. On `'reject'`, nothing executes.

This file makes no assumption about what the underlying action *is* —
`performOnApprove` is supplied by each consuming endpoint. That's what
makes it reusable across certificates, lifecycle events, ijazah grants,
and anything else that needs the same shape, without a certificates-only
or lifecycle-only special case baked into the engine.

## 4. First real implementation — Certificates

`functions/api/portal/staff/registrar/certificates.js`'s `issue` action
now:

1. Resolves the student **and their institution** (the same
   class→institution join `admin/hifz-progress.js` and
   `lifecycle-events.js` already use), so PRIN's "own institution" scope
   can actually be checked — unlike the Announcements migration
   (Migration Phase D item #4b), where no such column exists on
   `announcements`. Certificates is the more complete implementation of
   the two.
2. Checks the requester holds `certificates` **C**, scoped to that
   institution.
3. Creates a pending `staff_approvals` row instead of writing to
   `certificates` — `referenceNo` is carried through if the requester
   supplied one, otherwise left `null` until approval time (see §5).
4. New `list_pending` action — requires `certificates` **A**, returns
   the requester's queue scoped to the decider's own institution.
5. New `approve`/`reject` actions — call `decideApproval()` with
   `permissionCode: 'A'`; on approve, `performOnApprove` runs the actual
   `INSERT INTO certificates`, now recording a real
   `approved_by_staff_id` (a new column — see §5) instead of the old,
   unpersisted `approvedByStaffNo`.

The frontend (`portal/staff/registrar/index.html`,
`js/portal-staff-registrar.js`) reflects this: the issue form is now a
*request*, its button reads "Request Certificate," and a new "Pending
Certificate Approvals" panel lets a signed-in PRIN see and decide
requests — visible to any staff member who reaches the page (this
codebase has never role-conditionally hidden UI; the server is what
actually enforces who can decide), with a note explaining that plainly.

### `revoke` was deliberately left alone

The Matrix's §4.13 table has no Ar/D cell for either REG or PRIN on
certificates — `revoke` isn't a documented joint action at all, just a
REG-held `C`-gated correction path, same as before this migration. Not
folding it into the approval queue is a scope decision, not an
oversight: extending Ar/A grants that don't exist in the Matrix, the way
Migration Phase D's Announcements work did for `communications`, was
judged out of scope here since revocation of a certificate is rare
enough, and reversible enough (never a hard delete), that it doesn't
carry the same integrity stakes as first issuing one.

## 4b. Second real implementation — Ijazah grant

`functions/api/portal/admin/hifz-progress.js`'s `ijazah.grant` action was
the specific case named in `docs/governance-master-register.md` Finding
#5 as the strictest version of this problem in the whole codebase: not
"recordable, not enforced" like certificates or lifecycle events, but
**not even recordable** — the request shape had no field at all for a
second signer, voluntary or otherwise. It is migrated the same way:

- QC-OFF's `ijazah.grant` (staff-session path only) checks `C` on
  `ijazah_records`, then calls `createApprovalRequest` instead of
  writing to `ijazah_register` directly.
- Two new top-level actions, `list_pending_ijazah` and `decide_ijazah`,
  sit outside the endpoint's existing per-`admissionNo` flow (a
  decision-maker's queue can span many students at once, so it can't be
  nested inside a single-student request the way `progress`/`stage`/
  `ijazah` already are). Both require a real staff session — the legacy
  `PORTAL_QURAN_TOKEN` bearer path has no `staff.id` to check separation
  of duties or a real PRIN grant against, so it is refused for these two
  actions specifically rather than silently exempted from the check.
- `ijazah.grant` submitted via the bearer token keeps its original,
  unchanged single-step behaviour — the same limitation every Migration
  Phase D dual-auth endpoint already carries: a shared secret has no
  individual identity to enforce a real approval workflow against, and
  removing that fallback would lock the endpoint out entirely while no
  real QC-OFF/PRIN account exists in any reachable environment.
- Ijazah revocation (`Ar`, PRIN-only) is untouched, same reasoning as
  certificates' `revoke`: the Matrix gives no role a *joint* grant over
  revocation, only over the original grant.

No admin UI exists for this endpoint (same "protected raw API, no admin
UI yet" convention as `admin/students.js` and, before this document,
`admin/announcements.js`) — `list_pending_ijazah`/`decide_ijazah` are
callable today the same curl-driven way `docs/student-portal.md`
already documents every other `ijazah.grant`/`revoke` action, not a new
UI gap this document introduces.

## 5. Schema change on `certificates`

```sql
ALTER TABLE certificates ADD COLUMN approved_by_staff_id INTEGER REFERENCES staff(id);
```
(Applied via the same `CREATE TABLE IF NOT EXISTS` + setup.js pattern
this project always uses — a fresh database gets the column already
present; nothing to migrate on an existing one until this ships to a
real environment, per the same "no live database reachable from this
sandbox" limitation noted throughout the project.)

`referenceNo` generation (`generateReferenceNo()`) now runs at **approval
time**, not request time — generating a public reference number for a
certificate a Principal then rejects would mean a number exists nowhere
in the register but could confuse a future audit of the sequence. If the
requester supplied their own reference number (e.g. to match a pre-2026
paper register), it's carried through untouched.

## 6. What this does NOT yet cover — named gaps, not silent ones

Following this project's own discipline (`admin/hifz-progress.js`'s MUH
refusal, the Announcements migration's PRIN scope gap): every other
"jointly" reference in the Matrix is a real, still-open gap, listed here
so it isn't assumed solved by this document:

| Area | Matrix language | Current state |
|---|---|---|
| **Student lifecycle events** (promotions, transfers, withdrawals, graduations, reinstatements) — `staff/registrar/lifecycle-events.js` | REG/AREG `E` on `student_records`; PRIN's joint sign-off is documented but not a separate Matrix grant beyond "own institution" | `approvedByStaffId` is resolved from a real `staff_no` but never verified as a PRIN, a real session, or a distinct person from the requester. **Not migrated to `staff_approvals` in this pass** — the natural next phase, using the exact same `createApprovalRequest`/`decideApproval` calls, once `student_lifecycle_events` gains a `staff_approvals`-backed pending state (today it writes directly, with no draft/pending status on the table itself — a schema change this document does not make). |
| **Hifz stage advancement** — `admin/hifz-progress.js`'s `body.stage` path | PRIN "A jointly with QC-OFF" on `hifz_records`, per §4's status update | A real session grant check exists (`hifz_records`/`A`), but it accepts EITHER QC-OFF or PRIN alone — no two-party requirement for stage advancement itself, only for the Ijazah grant that follows it (now fixed, see below). Surfaced while migrating Ijazah grant, not fixed in this pass. |
| **Admissions offer decision** — `staff/admissions-applications.js` | REG "A = verification, waiting-list"; PRIN "A = offer decision, jointly," own institution | Single-role `A` grant checked today; no second approver required. |
| **Results release** — `staff/registrar/assessments.js` (per role-permission-matrix.md §4.5's "Requires REG + PRIN joint approval before release") | Joint approval named directly in the Matrix's prose | Not yet checked at all in code — results release has no explicit "release" action distinct from entering scores. |
| **Refund/waiver/scholarship** — Finance Platform | EXE `A`, explicitly flagged in the Matrix itself: "no policy exists yet to route this through" | No policy, no approval step, no code path at all — the Matrix's own honest placeholder, unchanged by this document. |

**Ijazah grant** (`admin/hifz-progress.js`'s `ijazah.grant` action) has
since been migrated the same way certificates was — `ijazah_records` `C`
to request, `A` to decide, a distinct PRIN required for the
staff-session path. This closes `docs/governance-master-register.md`
Finding #5 ("Ijazah grants have no second-signatory field at all," a
stricter gap than every row above since there was previously nowhere to
even voluntarily record a second signer). The legacy `PORTAL_QURAN_TOKEN`
bearer path keeps its original single-step behaviour unchanged — no real
per-staff identity exists there to check separation of duties against.

None of the rows still open above were silently patched over or assumed
resolved by shipping certificates and Ijazah grants. The generic engine
in §3 is built specifically so each of them can be migrated as its own
small, scoped follow-up — add one `createApprovalRequest`/
`decideApproval` pair per endpoint, no new schema beyond what that
endpoint's own action needs.

## 7. Verification

- `node --check` on every touched file (`functions/_lib/approvals.js`,
  `functions/api/portal/staff/registrar/certificates.js`,
  `functions/api/portal/setup.js`, `js/portal-staff-registrar.js`) — clean.
- A mock-`sql` unit test confirmed `decideApproval()`'s separation-of-
  duties check refuses a self-approval and — critically — that
  `performOnApprove` (the real side effect) never runs when it does, i.e.
  the safeguard fires *before* any state changes, not just before the
  response is returned.
- `node scripts/build.js` — full site build, no errors.
- No live database in this sandbox (same limitation noted in
  `docs/announcements-system.md`, `docs/registrar-office.md`, and
  elsewhere) — the `issue → list_pending → approve` round trip has not
  been exercised against a real Neon instance. Whoever holds the
  production database should run that sequence once before relying on
  it for a real certificate.
