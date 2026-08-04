# SHRS Institutional Data Readiness Framework v1.0

Every real-data category needed before deployment, classified
**Mandatory / Recommended / Optional**, grounded in what the schema
already enforces (Mandatory = a `NOT NULL`/`UNIQUE` constraint or a
required API field today) versus what Phase 1A added as genuinely
optional profile depth. This framework does not invent new required
fields beyond what the running code already requires — "Mandatory"
here means the system will not create the record without it, today.

## Parent / Guardian

| Field | Classification | Basis |
|---|---|---|
| Full name, email, phone, password | **Mandatory** | `register.js` rejects the request without these. |
| Identity Type | **Mandatory** (defaults to `parent_guardian`) | `guardians.identity_type` has a `NOT NULL` + `CHECK` constraint. |
| WhatsApp number | Recommended | Phase 1A optional field, improves parent-communication reliability. |
| Title, preferred name, gender, DOB, nationality, state of origin, LGA, country of residence | Recommended | Phase 1A Personal Profile — improves Profile Completion %, not required to use the portal. |
| Secondary phone/email | Recommended | Phase 1A Contact Profile. |
| Residential address/city/state/postal code | Recommended | Phase 1A Residential Profile. |
| Occupation, employer, position, business name, industry | Optional | Phase 1A Professional Profile — genuinely optional, no institutional process depends on it today. |
| Marital status, number of children | Optional | Phase 1A Family Profile. |
| ≥2 Emergency Contacts | **Mandatory for a "complete" profile** (not mandatory to register) | Explicitly required for Profile Completion's Emergency Contacts section to flip true — a real institutional safety expectation, not enforced as a registration blocker. |
| Educational Interests | Recommended | Improves admissions targeting; not required. |

## Student

| Field | Classification | Basis |
|---|---|---|
| Full name, admission number | **Mandatory** | `students.full_name`/`admission_no` are `NOT NULL`/`UNIQUE`. |
| Class assignment (primary) | **Mandatory in practice** | `admin/students.js` requires an institution + class to create a student. |
| Status | **Mandatory** (defaults to `active`) | `students.status NOT NULL`, constrained to active/graduated/withdrawn/suspended. |
| At least one linked guardian | **Mandatory in practice** | The Parent Portal has no path to a student without a `guardian_student` row; a student with zero guardians is orphaned data. |
| Additional class enrolments (dual/multi-institution) | Recommended, where real | Only where the student genuinely attends more than one institution — do not force multi-enrolment as a default. |
| Attendance/results/fees history | Recommended (accumulates over time) | Not a creation-time requirement; builds up term by term. |

## Teacher

| Field | Classification | Basis |
|---|---|---|
| Full name, Staff ID (`staff_no`) | **Mandatory** | `staff.staff_no` is `NOT NULL UNIQUE`. |
| Institution assignment | **Mandatory in practice** | Teaching without an institution assignment is meaningless. |
| A working login (`staff_accounts`) | **Mandatory to use the Teacher Portal** | No portal access without it — but a `staff` row can exist before a login is issued (the two are separate steps by design). |
| `TCH` role grant | **Mandatory to use the Teacher Portal** | The Permission Engine denies access without it. |
| Institutional email | Recommended | Not enforced by any constraint today — no `email` column exists on `staff` at all; this is a real schema gap, not just a data gap (see the Identity Migration Register's note on Teacher Identity Phase 2 requiring this). |
| Department assignment | Recommended, blocked on Board adoption | `staff.department_id` exists, but the `departments` table is empty until the Board adopts a framework (see the Master Academic Structure Register §5). |
| Subject specialisation, teaching load, assigned classes | Recommended | Structurally supported via `teacher_class_assignments`; genuinely real for the Secular College JSS/SSS and Qur'an College/Islamic Studies faculty now named in the Master Academic Structure Register §4 — **not yet entered as real `staff`/`teacher_class_assignments` rows.** |
| Academic qualifications, employment status | Recommended | No dedicated column exists for qualifications today (`position_title` is the closest fit) — real data now exists (§4d of the Register) for six Qur'an College/Islamic Studies faculty and could be entered as free text now, or wait for a dedicated field. |

## Staff (all offices)

Same as Teacher above, generalized: `staff_no`, full name, and an
institution/office assignment are **Mandatory**; a working login +
role grant are **Mandatory to use any staff portal**; everything else
(department, reporting line, qualifications) is **Recommended**, not
enforced.

## Executive

Per `docs/executive-identity-design.md`: today, **no Mandatory fields
exist at all**, because no Executive-specific record exists — a
Founder/Head of Schools/Principal/Registrar is, or should be, a `staff` row like
any other, with `staff_roles.role_code` in (`EXE`, `PRIN`, `REG`).
Once the Identity Migration Register's #1 is executed, the Mandatory
set becomes identical to Staff above, plus the specific role grant.

## Admissions Applicant

| Field | Classification | Basis |
|---|---|---|
| Applicant's name, submitting guardian | **Mandatory** | `admissions_applications.applicant_child_name NOT NULL`, `guardian_id NOT NULL`. |
| Institution applied to, desired class | Recommended | `institution_id`/`desired_class` are nullable — real applications should include these, but the system doesn't block submission without them. |
| Document upload | Not applicable yet | No file storage exists (Not Started, per the Master Deployment Directive) — cannot be classified as Mandatory/Recommended/Optional until it exists at all. |

## Alumni

No dedicated schema exists — an alumni identity today is a guardian
account self-described via `identity_type = 'alumni'` (Phase 1A), which
is a **label, not a real alumni record** (no graduation date, no
programme completed, no Ijazah cross-reference beyond what
`ijazah_register` already independently holds). **Mandatory: none
defined, because no real alumni data model exists yet.** Recommended
future fields, once designed: graduation year, programme(s) completed,
Ijazah reference (where applicable), current pursuit (further
education/profession) — none built.

## Educational Partner

Same situation as Alumni: a label on a guardian account
(`identity_type = 'educational_partner'`), not a real partner-entity
record (no organisation name, no partnership type, no agreement
reference). **Mandatory: none defined.** This is the least-developed
identity category in the entire system and should not be treated as
more complete than it is.

## What this framework changes about "generic records"

The objective stated in the directive — eliminate generic records
permanently — is achieved by refusing to promote any field above
Optional unless a real constraint or a real institutional expectation
already justifies it. Every Recommended/Optional field left blank
today is an honest gap, not a placeholder pretending to be data; every
Mandatory field is already enforced by running code, not aspirational.
