# SHRS Imperial Digital Identity & Onboarding — Reality Check

**Update:** the "Phase 1 — real today, no new infrastructure or vendor
decisions" scope recommended below has since shipped, as a staged
onboarding wizard with colour-banded completion and a celebration
screen. See `docs/onboarding-experience.md` for what was built and what
remains deferred (Stage 5 children's medical data, Stage 6 KYC, Stage 9
document storage, and Phase 2's SMS/WhatsApp OTP + CAPTCHA are all still
open, exactly as recommended here).

*Response to the "Imperial Digital Identity & Onboarding Directive."
Written the same way `digital-campus-roadmap.md` answered the original
LMS mandate: taking the ambition seriously by being straight about what
is real, what needs a vendor and a budget line, and what carries genuine
legal weight — before any code changes. Nothing in this document has
been built. It is the assessment the directive itself asked for.*

## What exists today vs. what's being asked for

Today, `/portal/register/` collects four fields — full name, email,
phone, password — creates one `guardians` row, and signs the registrant
in immediately (see `docs/account-creation-journey.md`, verified
end-to-end against a real database this session). That account can
submit an admissions enquiry once its email is verified. Nothing else.

The directive asks for a ten-stage institutional identity platform:
account type selection, OTP/CAPTCHA-gated credentials, a mandatory
multi-section profile (legal identity, contact, residential,
professional, family), government-ID-and-biometric-selfie KYC
verification, emergency contacts, educational-interest selection, a
document vault, and a computed Trust Score driving a rich post-login
dashboard.

Most of this is real, valuable, buildable data-model-and-UI work. Two
pieces are not simple UI work at all — they are vendor contracts and
legal decisions wearing a UI: **Stage 6 (KYC document + biometric selfie
verification)** and, to a lesser extent, **OTP delivery and CAPTCHA**.
Conflating "add more form fields" with "stand up a biometric identity-
verification pipeline" is exactly the trap this document exists to name
before it's built into the schedule as if both were the same size.

---

## Stage-by-stage reality check

### Stages 1–2 — Account Creation, Identity Type, Credentials, Security Verification, Profile Completion gating
**Mostly real and buildable now.** An `identity_type` field (Parent/
Guardian, Applicant, Sponsor, Alumni, Staff Member, Educational
Partner), confirm-email/confirm-password fields, a WhatsApp number
field alongside the existing phone field, and a computed
`profile_completion_pct` gate are all schema-and-form work against the
database that already exists. Two pieces are not:
- **Email OTP** — buildable today with the existing `Resend` integration
  (`functions/_lib/email.js`), once `RESEND_API_KEY` is actually
  configured — same infrastructure gap `account-creation-journey.md`
  already names, not a new one.
- **SMS OTP / WhatsApp Verification** — needs a real messaging provider.
  Twilio is reachable from this environment (an MCP connector already
  exists for it) and is the natural, concrete choice — but it needs an
  account, a budget line (per-SMS/WhatsApp-message cost, ongoing), and a
  decision on whether WhatsApp verification uses the WhatsApp Business
  API (a further Twilio/Meta approval step, not instant).
- **CAPTCHA** — Cloudflare Turnstile is the obvious fit (same platform
  this site already runs on, free, no separate vendor relationship) but
  is still a decision to make explicitly, not assume.

*Staff Member and Educational Partner as self-service identity types
need a second look regardless of infrastructure: `docs/staff-identity-architecture.md`
established institution-issued-only staff credentials as a deliberate
security boundary — "no self-service sign-up" is stated on
`/portal/staff/login/` today. Letting "Staff Member" be a self-selected
option on the same public registration form as Parent/Guardian would
quietly reopen that boundary unless it's explicitly scoped to mean
"apply to become a partner/vendor," not "create a working staff
account." Worth resolving as a naming/scope question, not a technical one.*

### Stage 3 — Personal Identity Profile (title, legal name, DOB, nationality, State/LGA, residential address)
**Fully buildable now**, no new infrastructure. Purely additive columns
on `guardians` (or a new `guardian_profile` table, cleaner for this much
new optional data — decouples "can this person log in" from "how
complete is their profile," matching the existing separation between
`students` and `student_classes`). The Title list as given (including
Alhaji/Alhaja/Shaykh/Ustadh) is appropriately localised to the school's
actual community — no changes needed there.

### Stage 4 — Professional Profile (occupation, employer, industry, work address)
**Fully buildable now**, same pattern as Stage 3. Worth deciding once,
explicitly: is this collected from every account type (an Alumni
account has no obvious reason to need "Business Name"), or only from
Parent/Guardian and Sponsor? A blanket mandatory field set across all
six identity types will produce a lot of "N/A" data entry friction for
the types it doesn't fit.

### Stage 5 — Family Profile (marital status, number of children, guardian status)
**Fully buildable now.** Overlaps meaningfully with data the
`guardian_student` table and admissions flow already imply (children
enrolled, prospective children) — worth designing so this doesn't
become a second, driftable source of truth for "how many children does
this guardian have" alongside the real enrolment records.

### Stage 6 — KYC Verification (ID documents, address proof, live selfie match)
**This is the stage that is not simple UI work, and should not be
scheduled as if it were.** Concretely, it requires:
- **File/object storage.** No file storage backend (R2, S3, or
  equivalent) exists anywhere in this project today —
  `account-creation-journey.md` and `docs/registrar-office.md` both
  already name this exact gap for far lower-stakes documents (a
  certificate PDF, an admissions attachment). Storing scanned national
  ID cards and passports raises that gap's stakes considerably.
- **A real identity-verification vendor for the selfie-to-ID biometric
  match** — this is not something to hand-roll with an image-comparison
  library. Concrete, real options given the school is in Nigeria:
  **Smile Identity** and **Youverify** (both built specifically for
  Nigerian/African ID types — NIN, voter's card, driver's licence —
  and both already NDPR-aware by design), or an international vendor
  like Onfido/Veriff if the school wants to also verify diaspora
  parents' foreign passports well. Each is a paid API with a per-
  verification cost and a real vendor contract, not a library import.
- **A live-selfie capture flow** — camera permission handling, liveness
  detection (to defeat a printed photo held up to the camera), and a
  clear UX for a task most users have never done outside a banking app.

**The legal weight here is real, not decorative.** Per `docs/policies/data-protection-privacy-policy.md`
(IT-02), SHRS operates under the **Nigeria Data Protection Act 2023
(NDPA)**. Today, IT-02 §5 explicitly states **no retention period is
defined yet** for the guardian data already collected, and §7.5's Data
Protection Impact Assessment procedure exists on paper but has not been
run for anything this project has built so far. Adding government ID
scans and biometric selfie data — both squarely "sensitive personal
data" under most data-protection frameworks including the NDPA — without
first running that DPIA and setting a real retention period specifically
for KYC artifacts would be building the exact gap IT-02 already
flags, deliberately, at a much higher stakes level. **A DPIA for this
specific feature, a named accountable person, and a written retention
decision must exist before this stage is built — not as documentation
written after the fact to describe what was already shipped.**

**A design question worth deciding before the vendor conversation, not
after:** does SHRS need to *retain* scanned ID images at all, or only a
verified/not-verified result? Most reputable KYC vendors support a
"verify and discard" mode — you receive a pass/fail (and optionally an
extracted name/DOB for cross-checking) without SHRS itself storing the
raw document image forever. That single decision changes both the
retention-policy question above and the file-storage requirement (a
discard-mode integration needs no object storage at all — only the
vendor's API response, which is a much smaller, much lower-risk build).

### Stage 7 — Emergency Contacts
**Fully buildable now.** Two required structured contacts (name,
relationship, phone, email) is a small, clean addition — genuinely
useful for safeguarding regardless of anything else in this document,
and worth prioritising on its own merits.

### Stage 8 — Educational Interests
**Fully buildable now**, and maps directly onto real, already-published
programmes: Nursery and Primary, Royal College, Qur'an College, School of
Islamic and Arabic Studies. "Online Learning," "Weekend Programmes," and
"Summer Programmes" should only appear as options once they're real,
named offerings — offering them as selectable "interests" when no such
programme currently exists risks collecting real parent demand for
something the school hasn't decided to run yet, which is either a
useful market-research signal (worth stating explicitly as such) or a
promise the options list accidentally implies.

### Stage 9 — Document Centre (passport photo, birth certificate, previous results, transfer records, medical information)
**Blocked on the same file-storage gap as Stage 6**, though at
meaningfully lower sensitivity than government ID + biometric data —
this is closer to what `docs/registrar-office.md` and
`account-creation-journey.md` already named as deferred ("document
upload — no file storage backend exists"). Once R2/S3 is stood up for
Stage 6 (or independently, if the school decides Stage 6's KYC vendor
handles verification without SHRS-side storage), this stage reuses the
same infrastructure. Medical information specifically should route
through the same safeguarding-data handling discipline as the rest of
this project's child-protection-relevant fields, not a generic file
upload.

### Stage 10 — Trust Score dashboard
**Buildable now for the parts that don't depend on Stage 6.** Identity
Completion % (a real computed value from Stages 1–5, 7–8), Children
Linked, Applications, and Outstanding Requirements are all derivable
from data this project already has or that Stages 1–5/7–8 add. **KYC
Status** (Pending/Approved) and "Profile Strength: Fully Verified" are
placeholders until Stage 6 exists — showing them before Stage 6 is
built would be exactly the "premium feel without the substance behind
it" this whole directive was written to reject. Build the dashboard
fields honestly staged alongside the data that actually backs them, not
all at once with some columns permanently reading "Pending."

---

## The honest recommendation on sequencing

Building all ten stages at once — or worse, building the *UI* for all
ten while only Stages 1–5/7–8/10(partial) have anything real behind
them — would reproduce exactly the failure mode `digital-campus-roadmap.md`
warned about for the LMS mandate: a system that *looks* institutional
but quietly has a KYC Status field that can never actually say
"Approved" because no verification vendor was ever wired up behind it.

**Phase 1 — real today, no new infrastructure or vendor decisions:**
Stages 1 (identity type + credentials, email OTP once Resend is
configured), 2 (completion gating), 3, 4, 5, 7, 8, and the honest part
of 10 (completion %, children linked, applications, outstanding
requirements — no KYC Status column yet). This alone is a substantial,
genuine upgrade from today's four-field form to a real institutional
profile, and ships nothing that overstates what's actually verified.

**Phase 2 — real, but needs one new vendor relationship each:**
SMS/WhatsApp OTP via Twilio; CAPTCHA via Cloudflare Turnstile. Both are
concrete, affordable, and don't carry Stage 6's legal weight — a
reasonable next step once Phase 1 is live.

**Phase 3 — the one that needs a Board-level decision, not a coding
decision:** KYC document + biometric selfie verification (Stage 6) and
the Document Centre (Stage 9). This needs, in order: a decision on
verify-and-discard vs. retain, a DPIA specific to this feature, an
updated IT-02 with a real KYC retention period, a chosen vendor and
budget, then the engineering work — which at that point is genuinely
straightforward (call the vendor's API, store only what the retention
decision says to store).

A further, separate point worth raising honestly: requiring full
KYC-grade verification (government ID + biometric selfie) just to
*create an account and start an enquiry* — before a family has even
decided to apply — is heavier friction than most premium institutions
apply at that stage. Banks and elite schools alike typically gate
KYC-grade verification at the point where it actually matters (funding a
transaction; confirming an admissions offer), not at first sign-up. It
is worth deciding deliberately whether Stage 6 gates *registration*,
*application submission*, or *admission confirmation* — the directive
as written implies the first; the strongest real-world comparison
points instead toward the third.

---

## What has to be decided before any Phase 3 code gets written

- Who is the accountable person / Data Protection Officer for this
  specific feature, and who signs off the DPIA?
- Verify-and-discard, or retain scanned documents? This decides both
  the retention period IT-02 needs to state and whether object storage
  is needed at all.
- Which KYC vendor, and at what per-verification cost, at what expected
  volume (a rough enquiries-per-term estimate makes this a real budget
  line, not a guess)?
- Which SMS/WhatsApp provider (Twilio is available and recommended) and
  what's the expected monthly OTP volume/cost?
- At which point in the journey does KYC actually gate progress —
  registration, application, or admission confirmation?

Phase 1 needs none of these decisions and can start as soon as you
confirm it's the right scope — see the companion request already
raised for that.
