# The Institution Registry

**Module:** `functions/_lib/institutions.js`
**Behaviour pin:** `scripts/test-institution-registry.mjs` (run via `npm run test:certificates`, enforced in CI by `.github/workflows/certificate-verification.yml`)

## Why this exists

Before the registry, an institution's identity was written in five
uncoordinated vocabularies across the codebase:

1. the `institutions` table's internal names (seeded by `functions/api/portal/setup.js`),
2. `classes.institution` free text (joined to institutions by string equality),
3. certificate display names (`INSTITUTIONS_BY_PROGRAMME` in the portal
   issuance route, `RC_PROGRAMMES[*].school` in the Royal College master),
4. the graduation register's `institution_name` strings,
5. two independent short-code maps in `functions/_lib/identity-no.js`
   (admission-number school codes and staff-number UNIT codes).

Adding or renaming an institution meant finding every one of them, and a miss
was silent: a certificate printing a stale school name, or an admission number
minted under the wrong code. The registry makes institution identity something
that is **written in one place and derived everywhere else**.

## The shape

`INSTITUTIONS` is a keyed object; each entry carries:

| Field | Meaning |
|---|---|
| `key` | Stable programmatic key (`islamic_arabic_studies`, `nursery_primary`, `royal_college`, `quran_college`). |
| `dbName` | `institutions.name` in the database, and the string `classes.institution` must match verbatim (that string-equality join is acknowledged schema debt — see below). |
| `displayName` | The certificate's formal display register — what a printed sheet names as the issuing school. |
| `displayNameAr` | Arabic display name, where one is rendered (currently the Qur'an College). |
| `admissionCode` | The `SHRS-<CODE>-YY` admission-number segment. |
| `staffUnitCode` | The staff identity number's UNIT segment. **NP vs NPS for Nursery and Primary is deliberate** — the admission-number family uses `NP` while the staff-number family uses `NPS`. The two numbering families are independent by design (`functions/_lib/identity-no.js` documents this); a registry must preserve both, never unify them. |
| `programmes` | Programme codes belonging to this institution. |
| `rcFamily` | Rendered by the Royal College certificate master (v1.1) rather than the frozen Islamic-stage master (v1.0). |
| `portalIssuable` | The Registrar's portal roster route may ISSUE these programmes. Reprints work for every code regardless; JSS/SS/QUR remain script-issued under their own Principal approval chain. |

`UMBRELLA` carries the umbrella name (`Sultan Hanafi Royal Schools` /
`مدارس السلطان حنفي الملكية`) used above the school name on certificate faces.

Two lookups: `institutionForProgramme(code)` and `institutionByDbName(name)`.

## Derived legacy shapes

The registry did not change any behaviour when it landed — the five legacy
shapes are **derived** from it, byte-identical to the literals they replaced:

| Export | Replaced literal in |
|---|---|
| `INSTITUTIONS_BY_PROGRAMME` | `functions/api/portal/staff/registrar/stage-certificates.js` (programme → `{ internalName, displayName }`) |
| `PORTAL_ROYAL_COLLEGE_CODES` | same file (RC-family codes the portal route may issue: NUR, PRY) |
| `SCHOOL_CODE_BY_INSTITUTION_NAME` | `functions/_lib/identity-no.js` (admission numbers) |
| `UNIT_BY_INSTITUTION_NAME` | `functions/_lib/identity-no.js` (staff numbers) |
| `INSTITUTION_SEED_NAMES` | `functions/api/portal/setup.js` (institutions-table seed rows) |

`functions/_lib/royal-college-certificate.js` also consumes the registry
directly: its `INSTITUTION` header line is `UMBRELLA.en`, and each RC-family
programme's `school` field is the registry `displayName` (including the
security-thread and open-security-field microtext, which derive from
`school`).

## The golden-test wall

`scripts/test-institution-registry.mjs` carries the **original replaced
literals as golden values**. It fails if any registry edit would change:

- issuance wording (programme → internal/display name pairs),
- the portal's issuable RC-family code set,
- admission or staff numbering codes (including the NP/NPS divergence),
- the institutions seed set,
- the school names printed by the Royal College master
  (`RC_PROGRAMMES[*].school` cross-check),
- programme coverage (every issuable/renderable code must resolve),
- seal-registry alignment (`document-seals.js` must carry a `PRIN:` key for
  every seed name).

It runs together with `scripts/test-verify-identifiers.mjs` as
`npm run test:certificates`, which CI executes on every trigger of
`certificate-verification.yml` — including pushes to any of the registry's
source or test files — before anything else in that workflow.

**If you edit the registry and this test fails, the test is right.** Changing
a golden value is a real institutional decision (it changes what certificates
print or how numbers are minted), and the change must update the golden test
in the same commit, deliberately, with the reason in the commit message.

## Known, deliberate gaps — the three open decisions

These are documented here so no future session mistakes them for oversights.
Each is a **real decision**, not a code cleanup; none should be "fixed"
casually.

### 1. The batch scripts' three inconsistent `institution_name` strings

The historical certificate-import scripts wrote three different
`institution_name` spellings into live graduation-register rows. The registry
cannot unify them retroactively without a data decision: which spelling do
the live rows converge on, and does anything (exported registers, printed
documents) depend on the old strings? Resolving this is a data migration on
production rows, taken with the Registrar, not a code edit.

### 2. `classes.institution` is a free-text string join

`classes.institution` matches `institutions.name` by string equality rather
than foreign key. The registry's `dbName` field documents the contract, and
`sql/schema.sql`'s institutions header acknowledges the debt. The fix is a
schema migration (`institution_id` FK + backfill + constraint) — safe only
with a migration plan for existing rows and every query that joins on the
string.

### 3. The Online & Distance Learning School

The public site names FIVE institutions; the Online & Distance Learning
School has an office but **no** `institutions` row, no admission/staff
numbering codes, and no certificate family. It is absent from the registry
because it is absent everywhere downstream. Adding it is a package decision —
a database row, an `admissionCode`/`staffUnitCode` allocation, a certificate
family (or an explicit "does not issue"), and permission wiring — not a
registry entry alone.

## How to add an institution (when the decision is made)

1. Add the entry to `INSTITUTIONS` with every field above.
2. Update the golden values in `scripts/test-institution-registry.mjs` in the
   same commit (seed set, numbering maps, coverage) — deliberately.
3. Add the institution's `PRIN:` seal key to `functions/_lib/document-seals.js`.
4. If it issues certificates: register its programmes in the serial module
   and a certificate master, and decide `portalIssuable`/`rcFamily`.
5. Run `npm run test:certificates` — green means every derived consumer
   (issuance wording, numbering, seeds, seals, masters) agrees.
