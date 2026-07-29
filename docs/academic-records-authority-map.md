# SHRS Academic Records Authority Map

*Required alongside Migration Phase B, per the post-Registrar's-Office
governance directive. Companion to `docs/data-lifecycle-register.md`
(which covers the full institutional record set — student records,
admissions, certificates, etc.) — this document goes one layer deeper
on the academic-specific records the directive named explicitly:
Creator, Reviewer, Approver, Publisher, Corrector, and Export Authority
for each. Every answer below is read directly from
`functions/_lib/permission-matrix.js` (the Matrix's canonical
data-driven form) and the actual endpoints in this repository, not
proposed fresh here — where the Matrix and the running code disagree,
or where a category isn't built at all, that is stated as a finding,
not smoothed into a clean-looking row.*

## How to read the columns

- **Creator** — who/what may bring the record into existence for the first time.
- **Reviewer** — who checks it before a decision is finalised (distinct from Approval — the Matrix rarely names this separately, and where it doesn't, this column says so rather than inventing a review step).
- **Approver** — who must sign off before the record is treated as final, per the Matrix — with a note on whether that sign-off is a real system gate or merely recordable.
- **Publisher** — who makes the record visible to its intended audience (student/guardian), and whether "publishing" is a distinct system action or just "written, therefore visible."
- **Corrector** — who may change the record after creation, and how (a new reasoned event vs. an in-place overwrite).
- **Export Authority** — who/what may extract the record (a query response, eventually a document) — noting where the Matrix grants no export permission at all.

## The map

| Record type | Creator | Reviewer | Approver | Publisher | Corrector | Export Authority |
|---|---|---|---|---|---|---|
| **Attendance Records** | Class Teacher (TCH, Matrix: 'own class, own period') — **not operational**, no Teacher account issued (Migration Phase A finding) | Not named in the Matrix | Not named in the Matrix — attendance has no Approve permission at all in the `attendance` area | N/A — no publish step; visible on guardian/student dashboards the instant it's written | Registrar/AREG (unscoped, 'correction'), Principal ('own institution / override') — `registrar/attendance.js`, session + Permission Engine, live | Registrar (`X` permission, Matrix) |
| **Continuous Assessment (CA)** | Subject Teacher / Muhaffiz / Arabic Instructor (TCH/MUH/ARB, 'own subject/class') — **not operational**, no such account issued (Migration Phase B finding) | Not named in the Matrix | Not named in the Matrix — `assessments` area has no Approve permission | N/A — same as Attendance, immediately visible on write | Registrar (unscoped, 'correction only, logged') — `registrar/assessments.js`, session + Permission Engine, live | **Gap**: the Matrix grants no Export permission anywhere in the `assessments` area — not REG, not anyone. Raw scores are only ever seen embedded in a student/guardian's own dashboard read, never as a distinct export. |
| **Examinations** | Same as Continuous Assessment — **there is no separate "Examinations" system area, table, or endpoint.** An exam score is the `exam_score` column on the exact same `term_results` row as CA — the Matrix's `assessments` area covers both under one grant set, and this project has never modelled them as distinct records. | — | — | — | — | — |
| **Results** *(finalised per-term aggregate — Matrix-distinct from CA/Exam entry, though both live in `term_results`)* | Not separately created — a "result" is whatever CA/Exam rows currently exist for a student/term; there is no finalisation action anywhere in this project | Not named in the Matrix | **Matrix says** REG + PRIN jointly ('own institution' for PRIN). **Code says**: no `approved_at` column exists on `term_results`; nothing has ever gated on this | **Matrix says** REG (`P` permission). **Code says**: no `published_at` column exists; a score is visible the instant it's written, with no distinct publish action, ever | Same mechanism as CA/Exam — editing the underlying `term_results` row | Registrar (`X` permission, Matrix — this one **is** granted, unlike raw Assessments above) |
| **Report Cards** | **Not built at all.** No `report_cards` table, no generation endpoint, no document output exists anywhere in this project. The Matrix's `report_cards` area only grants Principal Approve ('own institution') and Registrar Publish+Export — there has never been a Create/Edit grant for anyone, implying a report card was always meant to be *generated from* results, never entered directly. That generation step does not exist. | N/A | Principal (Matrix `A`, 'own institution') — **cannot be exercised**; there is nothing to approve | Registrar (Matrix `P`) — **cannot be exercised**, same reason | N/A | Registrar (Matrix `X`) — **cannot be exercised**; nothing exists to export |
| **Promotion Decisions** | Registrar/AssistantRegistrar (`student_records` `E`, unscoped), Principal ('own institution') — `registrar/lifecycle-events.js`, action `promote`, session + Permission Engine, live | Not named in the Matrix as distinct from Approval | **Recordable, not enforced** — an optional `approvedByStaffNo` field records a second signer; the endpoint does not require one. See `docs/registrar-office.md`'s honesty note and the Approval Workflow Architecture roadmap item. | N/A — a lifecycle event is visible to the family immediately via the guardian/student dashboard's read of `student_lifecycle_events` | **None** — lifecycle events are append-only by design (the entire point of the table, per `sql/schema.sql`'s comment, is an permanent trail); a mistaken promotion is corrected by recording a further event (e.g. a `reinstate`/`transfer`), never by editing the original row | Registrar (`student_records` `X`, Matrix) |
| **Graduation Decisions** | Same as Promotion — `registrar/lifecycle-events.js`, action `graduate` | Not named | Same recordable-not-enforced pattern | Same as Promotion | Same append-only pattern | Same as Promotion |
| **Student Discipline Records** | **Not built at all.** No table, no endpoint. Named only in governance prose (Student Code of Conduct, SD-03) and `docs/data-ownership-register.md`'s "Disciplinary record" row, which itself names Student Affairs Officer (proposed, unfilled) / Principal as owner. Nothing in `permission-matrix.js`'s `SYSTEM_AREAS` even names a `discipline` area — it does not exist as a system concept yet, only as a governance one. | N/A | N/A | N/A | N/A | N/A |
| **Co-Curricular Records** | **Not built at all.** No table, no endpoint, no Matrix system area. Not mentioned anywhere in this project's governance canon either — this is the one category on the directive's list with no prior institutional grounding at all, real or proposed. | N/A | N/A | N/A | N/A | N/A |
| **Certificates** | Registrar (`certificates` `C`, 'once graduation approved') — `registrar/certificates.js`, action `issue`, session + Permission Engine, live | Not named | **Now enforced** — `issue` creates a pending `staff_approvals` request; the certificate row is only written once a distinct Principal decides via `approve` (real Permission Engine check, separation of duties). See `docs/approval-workflow-architecture.md`, the roadmap item this row used to point to as not-yet-attempted. | N/A — issued, therefore visible to staff via `registrar/student.js`'s read; **no guardian/student-facing surface exists yet** (a real gap named in `docs/registrar-office.md`) | **None** — no edit path for issued fields exists, only `revoke` (mirrors the Ijazah pattern deliberately; `revoke` itself remains single-approver, since the Matrix never gave PRIN a joint grant over it) | **Gap**: the Matrix grants no Export permission in the `certificates` area at all — `docs/data-ownership-register.md` names "Registrar" as export authority for certificates, but `permission-matrix.js` doesn't encode it. A real drift between the two governance artefacts, surfaced here rather than silently resolved in either document's favour. |
| **Transcripts** | **Not a stored record.** No `transcripts` table; what every dashboard shows as a "transcript" is a live read of `term_results`. The Matrix's `transcripts` area grants Registrar `C`, which in this project's actual implementation means nothing — there is no document-generation system anywhere to "create." | N/A | Not named in the Matrix at all for transcripts — no Principal row exists in this area, unlike every other academic-records area | N/A — the "transcript" is whatever `term_results` currently holds, read live | Not a distinct action — editing the underlying `term_results` | Registrar (`X`, Matrix) — the only transcript action actually exercised in code today, via `registrar/student.js`'s and `me.js`'s reads |
| **Hifz Records** | Muhaffiz/Muhaffizah (`hifz_records` `C`, 'own assigned students') — `admin/hifz-progress.js`. **This row was stale**: the endpoint migrated to dual-auth (staff session + Permission Engine primary, `PORTAL_QURAN_TOKEN` fallback only) as Migration Phase D item #4, before this map's most recent update; corrected here rather than left to silently mislead. | Not named | Qur'an College Officer + Principal jointly for stage advancement (Matrix `A`) — a real session-based grant check exists per-action, but there is still no separate two-party approval step for stage advancement itself (unlike the Ijazah grant fix below) — recorded here as a real, still-open gap, not folded into the Approval Workflow Architecture in this pass. | N/A | Session-gated endpoint, in-place upsert — no history of prior notes kept | Registrar ('snapshot only', `V` not `X` — the Matrix never grants an explicit Export permission here either) |
| **Ijazah Records** | Qur'an College Officer (`ijazah_records` `C`) — same dual-auth endpoint, action `ijazah.grant` | Not named | **Now enforced, for staff-session requests** — `ijazah.grant` creates a pending `staff_approvals` request; the grant only becomes real once a distinct Principal decides via the new `decide_ijazah` action (real Permission Engine check). Closes `docs/governance-master-register.md` Finding #5 ("no second-signatory field at all"). The legacy `PORTAL_QURAN_TOKEN` bearer path is unchanged (single-step, same as before) — no real per-staff identity exists on that path to attribute a request to or decide it against. | N/A — granted, therefore it exists; a guardian/student sees it via their own dashboard's Ijazah panel (already built) | **Structurally impossible** — no update path exists for grant fields, only `revoke` (IQ-02 §7.6, enforced at the schema level: `ON DELETE SET NULL`, frozen `student_full_name`) | **Gap**: no Export (`X`) permission exists in the Matrix for Ijazah either — Registrar and QC-OFF hold `V` only |

## Findings this map surfaces, named plainly

1. **Two record types on the directive's list don't exist as system
   concepts at all**: Student Discipline Records and Co-Curricular
   Records have no table, no endpoint, and — for Co-Curricular
   specifically — no prior mention anywhere in this project's
   governance canon. Discipline at least has a named (unfilled)
   proposed owner in `data-ownership-register.md`; Co-Curricular has
   nothing to build against yet.
2. **Report Cards cannot be exercised despite having Matrix grants.**
   Principal/Registrar hold Approve/Publish/Export permissions over a
   record type this project has never built a Creation step for. The
   Matrix's own design implies report cards should be *generated* from
   results, not entered — that generation capability doesn't exist
   (consistent with the long-standing "no document-generation system"
   gap named since the original Digital Campus roadmap).
3. **Export authority is inconsistently modelled across areas.**
   `results`/`transcripts`/`student_records` all carry an explicit `X`
   permission; `assessments`, `certificates`, `hifz_records`, and
   `ijazah_records` do not — some of those omissions look intentional
   (raw CA scores arguably shouldn't be exported standalone), others
   (certificates, in particular, where `data-ownership-register.md`
   already names Registrar as export authority) look like the Matrix
   simply hasn't caught up to a decision made elsewhere. This is worth
   a Board-level pass at the next Matrix revision, not a silent code
   fix in either direction.
4. **"Recordable, not enforced" was a confirmed pattern across four
   record types** (Promotion, Graduation, Certificates, and — worse,
   not even recordable — Ijazah). The Approval Workflow Architecture
   (`docs/approval-workflow-architecture.md`) has now closed two of the
   four — **Certificates and Ijazah grants** are real, enforced,
   two-party approvals. **Promotion and Graduation Decisions
   (`registrar/lifecycle-events.js`) remain open** — migrating them
   needs `student_lifecycle_events` to gain a pending/draft state first
   (today it writes directly, with no such column), named as the next
   phase in that document's §6.
5. **Hifz Records and Ijazah Records are both already staff-session +
   Permission Engine, dual-auth** (Migration Phase D item #4,
   `docs/identity-migration-plan.md`) — this row previously said
   otherwise and has been corrected. `PORTAL_QURAN_TOKEN` remains a
   fallback only, same reason as every other Migration Phase D item:
   no real QC-OFF/PRIN account is confirmed to exist in any reachable
   environment yet.
