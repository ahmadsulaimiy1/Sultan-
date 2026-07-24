# Phase C Dependency Review

*Extends `phase-b-dependency-review.md` rather than replacing it — all
authority names, definitions, and appeal conventions established there
still apply. This note adds what Phase C specifically needs and scopes
what it deliberately does not attempt.*

## 1. Scope decision for this round

The register lists a long "remaining HR/Finance/Technology documents"
tail alongside the three items Phase C names explicitly (Constitution &
Governance Charter, AI Usage Policy, Staff Handbook). Drafting all of
it in one pass would mean 15 documents, several of them Tier 3/4
("recommended"/"advanced," not urgent) and one (Tuition & Fees Policy)
blocked on real fee figures the school hasn't provided — exactly the
kind of content this project has consistently refused to invent.

This round drafts **seven documents**: the three named explicitly, plus
the four Tier 2 items that are both genuinely ready to draft (no
missing external data blocks them) and close a gap repeatedly flagged
in Phase A/B — Information Security Policy, Acceptable Use Policy,
Records Retention Policy, and Financial Controls Policy.

**Explicitly deferred, not silently dropped:**
- Board Charter, Committee Charters, Delegation of Authority Policy,
  Conflict of Interest Policy, Whistleblowing Policy, Risk Management
  Framework (Governance, Tier 2–3 — companions to the Constitution but
  not named in the Phase C directive)
- Recruitment Policy, Performance Management Policy, Leave Policy
  (HR, Tier 3), Professional Development Policy (HR, Tier 4)
- Tuition & Fees Policy, Refund Policy (Finance, Tier 1–2 — blocked:
  drafting either honestly requires real fee figures the school has
  not provided, exactly the gap the live admission page and the Parent
  Handbook and Admissions Policy already disclose rather than invent),
  Procurement Policy (Tier 3)
- Cybersecurity Framework (Technology, Tier 3 — the technical substance
  already exists at implementation level in `parent-portal-audit.md`;
  this document would restate it as governance-level policy, lower
  urgency than the four Tier 2 items drafted now)

## 2. New authorities/facts needed for this round, not previously used

| Fact | Source | Used in |
|---|---|---|
| Board of Trustees membership: Zakariya Olanrewaju Anofi, Mr. Lukman Anofi, Mrs. Lasisi-Ahmed Olayinka Idayat, Dr. Ismail Seriki | `about-governance.html` | Constitution & Governance Charter |
| CEO and a Board member both hold FCA/FCCA (accounting) qualifications | `about-governance.html` | Financial Controls Policy |
| `docs/digital-assistant.md` — the AI assistant already self-discloses as AI, escalates to WhatsApp, does not currently authenticate users or persist conversation history server-side | existing docs | AI Usage Policy |
| Parent Portal's actual security implementation (scrypt hashing, timing-safe comparisons, login lockout, activation-token pattern, admin-token-gated endpoints, Vercel Deployment Protection) | `docs/parent-portal-audit.md` | Information Security Policy |

## 3. A real dependency gap, named rather than silently filled

The Staff Handbook's register-listed dependency is a **Staff Conduct
Policy** — itself still MISSING (Governance Master Register, Safeguarding,
Tier 1) and not drafted in Phase A or B. The Staff Handbook does not
invent that policy's content to fill the gap; it names the dependency
explicitly and points forward to the still-needed document, the same
way Phase B pointed forward to the not-yet-drafted Academic Integrity
Policy rather than improvising its content.

## 4. Records Retention Policy — the one document in this round that resolves an open item rather than deferring it again

Phase A and B both named "no retention period defined" as an open gap
(Data Protection & Privacy Policy §§5, 10; Academic Regulations §10;
Admissions Policy §13) without setting one, correctly, since that
wasn't those documents' job. The Records Retention Policy drafted in
this round is that job — it proposes concrete periods, explicitly
marked as proposals pending Board confirmation, not another deferral.
Once adopted, Data Protection & Privacy Policy §5/§10 should be updated
to point to it instead of restating "no period defined yet."
