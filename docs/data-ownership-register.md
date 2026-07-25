# SHRS Data Ownership Register

*Companion document to `docs/role-permission-matrix.md`, required
before Staff Identity & Role System implementation begins. For every
major record type: who owns it, who's responsible for it day to day,
who governs how long it's kept, who can approve/export/delete it. Real
retention periods below are drawn from `docs/policies/records-retention-policy.md`
(IT-04) where it already covers a record type — its own header note
applies here too: **every period is proposed, pending Board
confirmation**, not yet a binding institutional decision.*

| Record type | Owner office | Responsible officer | Retention authority | Approval authority | Export authority | Deletion authority |
|---|---|---|---|---|---|---|
| **Student record** | Registrar | Registrar (Mrs. Anofi-Abdulkareem Mariam Tope) | Enrolment + 7 years after graduation/withdrawal (IT-04 §7.1) | Registrar + Principal (status changes) | Registrar | **None** — archived via `status`, never deleted, except a data-protection deletion request (below) |
| **Guardian record** | Registrar | Registrar | Duration of last linked child's enrolment + 2 years (IT-04 §7.1) | Registrar | Registrar | Data-protection deletion request only (IT-02/`privacy_requests`, actioned by Registrar) |
| **Staff record** *(personnel file, not portal login)* | **Ungoverned** — no HR office exists yet | Unassigned | Employment + 6 years (IT-04 §7.1 — proposed) | N/A — no HR policy exists to route this through (HR-04/05/06/07 Missing) | N/A | N/A — do not build this record type until HR governance exists |
| **Staff portal account** *(login credential only)* | ICT | System Administrator | Duration of employment; deactivated (Archived) on departure, not deleted, mirroring student/guardian accounts | Executive (new account creation) | System Administrator | System Administrator, on confirmed departure — Archive by default, Delete only via data-protection request |
| **Attendance record** | Registrar / Academic Office | Class Teacher (once Teacher Portal exists); Registrar today | Bundled with student academic records — enrolment + 7 years (IT-04 §7.1) | Principal (corrections) | Registrar | None — corrections are logged edits, not deletions |
| **Assessment record** *(raw CA/exam entry)* | Teacher (subject), overseen by Registrar | Subject Teacher | Bundled with student academic records | Registrar (correction) | Registrar | None — see §4.5 of the Role Matrix on why corrections stay visible |
| **Result record** *(finalised per-term)* | Registrar | Registrar | Enrolment + 7 years (IT-04 §7.1) | Registrar + Principal jointly (AC-02) | Registrar; student/guardian for their own (already built) | None |
| **Report card** | Registrar | Registrar | **Open question** — IT-04 doesn't name this separately; logically either the academic-record period or, arguably, permanent given families reference these for years. Needs explicit Board confirmation, not assumed here. | Principal | Registrar; student/guardian for their own | None |
| **Hifz record** | Qur'an College | Muhaffiz/Muhaffizah (assigned), Qur'an College Officer (institution-wide) | **Not yet named in IT-04 at all** — this register flags the gap rather than inventing an answer. Recommend Board treat it at least as long as academic records, likely longer given its credentialing weight. | Qur'an College Officer + Principal (stage advancement) | Registrar (snapshot), Qur'an College Officer (full) | None |
| **Muraja'ah record** | Qur'an College | Muhaffiz/Muhaffizah | Same open question as Hifz records — folded into the same records today (IQ-03 within IQ-01 §7.1) | Same as Hifz record | Same as Hifz record | None |
| **Ijazah record** | Qur'an College + Registrar | Qur'an College Officer | **Permanent — never deleted, only annotated** (IQ-02 §7.6). The one record type in this register with an already-settled, non-negotiable retention answer. | Principal + Qur'an College Officer (grant/revoke) | Registrar, Qur'an College Officer; student/guardian for their own | **None, ever** — enforced at the schema level (`ON DELETE SET NULL`, frozen `student_full_name`) |
| **Admissions / application record** | Proposed Admissions Officer, verified by Registrar | Admissions Officer (once appointed); Registrar today | 3 years from decision if not admitted; enrolment + 7 years if admitted (IT-04 §7.1) | Registrar (verification), Principal (offer decision) | Admissions Officer, Registrar | After the 3-year unsuccessful-applicant window, per IT-04 once Board-confirmed |
| **Disciplinary record** | Student Affairs (proposed) / Principal | Principal, pending Student Affairs Officer appointment | Enrolment + 3 years (IT-04 §7.1) | Principal | Registrar, DSL where safeguarding-relevant | After the retention window, per IT-04 once Board-confirmed |
| **Safeguarding record** | Designated Safeguarding Lead | DSL (role defined, not yet appointed — SW-02) | Until the student turns 25, or 7 years from creation, whichever is longer — flagged in IT-04 itself as needing child-protection-professional confirmation, not just Board judgement | DSL | DSL only | DSL only, after the retention window — the most tightly held deletion authority in this register |
| **Financial record** *(fee due/paid — a snapshot, not a ledger; see `founder-dashboard.md`)* | Proposed Finance Officer | Finance Officer (once appointed) | 7 years (IT-04 §7.1 — to be confirmed against real Nigerian tax/financial-record requirements once FN-03 exists) | Executive (refunds/waivers — no policy exists yet to route this through) | Finance Officer | After the retention window, per IT-04 once Board-confirmed; a real ledger doesn't exist yet to delete from |
| **Certificate** | Registrar | Registrar | **Open question**, same reasoning as Report Cards — arguably permanent, like Ijazah, since a certificate is a credential someone may need to prove decades later | Principal + Registrar | Registrar; student/guardian for their own | None recommended |
| **Transcript** | Registrar | Registrar | Same open question as Certificates | Registrar | Registrar; student/guardian for their own (partially built via Personalisation Centre data export) | None recommended |
| **Communication record** *(in-portal notifications, WhatsApp escalation logs)* | Varies by sender | Sender's office | **Ungoverned** — not named in IT-04 at all. Recommend a short default (1–2 years) as a placeholder pending Board decision, not asserted here as settled. | N/A | Registrar (for records concerning a specific student) | After a Board-set window |
| **Policy document** | Policy-owning office per `policy-code-index.md` | Varies per code (e.g. Registrar owns AC-02) | Permanent — version-controlled in git, superseded versions kept in history, not deleted | Board of Trustees (Tier 1), CEO (Tier 2–4) | Public, for Public-classified documents (already true — they're on the live site) | Never — git history is the retention mechanism |
| **Website content** | ICT / Communications function | Whoever holds repository access today | Permanent — version-controlled | CEO / EMT | Public (it's a public website) | Content can be removed from the live site; git history retains it |
| **Governance document** *(Board resolutions, registers, audits)* | Board of Trustees | Board Secretary role (not yet named) | Permanent — version-controlled | Board of Trustees | Internal by default (see `policy-code-index.md`'s classification principle) | Never |

## What this register deliberately leaves open

Four record types (**Report Card, Hifz Record, Muraja'ah Record,
Certificate/Transcript**) have a retention period this register could
not responsibly assert, because IT-04 doesn't name one and inventing a
number here would misrepresent it as a real institutional decision the
same way this project has avoided inventing policy numbers everywhere
else (the Adhkar Centre's counter thresholds, the Tajweed rubric that
doesn't exist yet, FN-03's blocked fee policy). These four are flagged
for the Board to confirm, not silently defaulted.

**Staff records** (the personnel file, not the portal login) should not
be built as a system in Phase 2 at all — there is no owning office,
policy, or appointed responsible officer for HR data today. Building a
staff *login* is Phase 2's job (see the Role & Permission Matrix §4.20);
building a staff *HR record system* is real future work gated on the
same missing HR policies (HR-04 through HR-09) that already block a
staff/HR portal in the module ranking table in
`digital-institution-blueprint.md`.
