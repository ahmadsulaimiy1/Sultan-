# Digital Admissions & Student Affairs Assistant — Design Document

*Design spec for the on-site assistant, its knowledge base, its lead
pipeline, and what a future WhatsApp extension would need. Companion to
`editorial-bible.md` (brand/voice) and `site-architecture.md` (site map).*

---

## Preface — What This Is and Isn't

The originating brief asked for an AI that never identifies as AI and
presents itself as a human "Office of Registration & Student Affairs."
This document deliberately does not do that. Two reasons, not just one:

1. **It's a compliance problem, not a style choice.** Bot-disclosure
   rules (California SB 1001; the EU AI Act's Article 50 transparency
   obligation) require telling a user they're talking to an automated
   system, in some cases whenever asked and in some cases by default.
   Building "never disclose unless legally forced" as the baseline
   means the default behaviour is the one the law treats as the
   exception.
2. **The people on the other end are prospective students and their
   parents** — for a school whose youngest learners are nursery-age.
   Collecting a family's name, nationality, and a child's age and
   education history through a persona built to be mistaken for a
   human isn't a acceptable foundation for that specific data, regardless
   of legality.

What follows instead: a **Digital Admissions Assistant**, honestly
labelled, warm, competent, and genuinely useful — representing the
Office of Registration & Student Affairs the way a well-designed web
form or a well-briefed junior admissions officer would, without
pretending to be either a person or a general-purpose chatbot.

**What this assistant is not:**
- Not a source of figures the school hasn't published (fees, term
  dates) — see `editorial-bible.md`'s placeholder policy. It says so
  and offers a human follow-up instead of guessing.
- Not a replacement for the admissions team — every path ends in either
  a real page on the site or a captured lead a human will contact.
- Not free-text conversational AI. There's no backend in this static
  site to run one. It's a decision-tree: fixed questions, button/chip
  answers, deterministic branching. Honest about that too, in the
  sense that it never claims to be smarter than it is.

---

## Part I — Persona & Voice

**Name shown to visitors:** "Admissions Assistant · Office of
Registration & Student Affairs" (English) / "المساعد الرقمي للقبول ·
مكتب التسجيل وشؤون الطلاب" (Arabic).

**Opening line (English):**
> "Welcome — I'm the digital assistant for our Office of Registration
> & Student Affairs. I can help you find the right programme, walk you
> through admissions, or connect you with our team directly."

**Opening line (Arabic):**
> "مرحباً بكم — أنا المساعد الرقمي لمكتب التسجيل وشؤون الطلاب. يسعدني
> مساعدتكم في اختيار البرنامج المناسب، أو شرح خطوات القبول، أو
> تحويلكم مباشرة إلى فريقنا."

**Voice qualities** (same register as the rest of the site — see
editorial-bible.md Part III): warm, specific, unhurried, never
superlative-stacked. Numbers over adjectives — "twelve admission
stages," not "our world-class admissions process."

**What it never does:** claim to be a person; claim certainty about
unpublished figures; pressure toward enrolment; collect information it
doesn't clearly explain the purpose of.

---

## Part II — Conversation Architecture (Website Widget)

A fixed launcher bubble (bottom-right in English, bottom-left in
Arabic per RTL mirroring) opens a chat-style panel. Every turn is
button/chip driven — no free-text input except the final contact-detail
step — since there is no live language model behind this to interpret
open text reliably or safely.

```
Greeting
  → "I'd like to explore programmes"
  → "I have a question about admissions"
  → "I'd like to know about fees"
  → "I'd like to speak with someone directly"
```

### Branch: Explore Programmes
```
"What age group is this for?"
  → Under 10          → recommend Nursery & Primary School
  → 10 to 17           → recommend Royal College (+ mention Qur'an
                          College if they want Qur'an memorisation
                          alongside)
  → 18 or older        → recommend School of Arabic & Islamic Studies
                          (the only real programme in the current
                          catalogue open to adults; Royal College and
                          Nursery & Primary are age-bounded, and Qur'an
                          College's boarding track is stated as ages
                          9–16 — the assistant must not recommend an
                          age-inappropriate programme just to have an
                          answer)
  → Not sure yet        → hand off to "speak with someone"

[if Qur'an memorisation interest flagged at any age]
  → also surface Qur'an College, note the 24–36 month day/boarding
    programme and Ijazaat outcome

"Which best describes what you're hoping for?" (multi-select)
  → Strong academic foundation (secular)
  → Islamic & Qur'anic education
  → Both, integrated
  → Not sure — happy to be guided

"Day or boarding?"
  → Day only
  → Open to boarding
  → Not applicable (e.g. Arabic & Islamic Studies weekday/weekend track)

→ Present the matched programme: one paragraph pulled from the real
  page content (not invented), a link to that programme's actual page
  (/academics/... or /ar/academics/...), and an offer to leave contact
  details for a follow-up call.
```

### Branch: Admissions Question
```
→ Show the 12-stage process as a condensed 4-step summary (matching
  the homepage teaser pattern already in use), link to the full
  /admission/ page, list documents required (birth certificate,
  passport photos, previous school report/testimonial — the three
  that are actually published).
→ Offer contact capture.
```

### Branch: Fees
```
→ "Our published fee schedule isn't available through this assistant
   yet. I can have our admissions team send you the current schedule
   directly — would you like to leave your details?"
→ This is the same placeholder-honesty rule as the rest of the site:
   never invent a number here under any circumstance.
```

### Branch: Speak With Someone
```
→ Surface the real, existing channels immediately, no further
  questions required: WhatsApp (wa.me link), phone numbers, email.
→ Still offer the contact-capture form for a scheduled callback.
```

### Contact Capture (shared final step of every branch)
Two free-text fields only — name and (email or phone) — plus whatever
structured context the branch already collected (age group, interest,
day/boarding preference, which question they asked). Submitted the same
way the site's existing contact form is: a POST to FormSubmit
(`info@shroyalschools.ng`), with the intake answers included as
structured fields in the email body, subject-lined
`"New admissions enquiry — Digital Assistant"` so it's visibly distinct
from direct contact-form submissions in the inbox.

**No separate CRM exists to integrate with.** Until the school adopts
one (Airtable, HubSpot, a simple spreadsheet-linked form, etc.), the
structured email *is* the record. The field names below are chosen so
that whichever CRM is adopted later, the same field labels can become
column headers with no redesign — see Part IV.

---

## Part III — Knowledge Base

The assistant may only state facts already published elsewhere on the
site. It does not have — and must not simulate having — independent
knowledge. Source of truth per topic:

| Topic | Source page(s) |
|---|---|
| Programme descriptions, ages, schedule | `/academics/*` (4 schools + hub) |
| Admission process, documents | `/admission/` |
| Boarding eligibility & arrangements | `/boarding/` |
| Policies (dress code, complaints, etc.) | `/policies/` |
| Facilities | `/facilities/` |
| Contact channels | `/contact/` |
| Fees, calendar, international pathway | **Not published** — always route to human follow-up, never answer directly |

When the school publishes the currently-missing data (fees, calendar,
international-student pathway — see editorial-bible.md Part V), the
Fees branch above should be updated to answer directly, the same way
the corresponding page sections will be.

---

## Part IV — Lead Record Schema

Every contact-capture submission carries these fields, whether the
destination is today's plain email or a future CRM:

| Field | Example | Notes |
|---|---|---|
| `full_name` | "Amina Yusuf" | free text |
| `contact` | phone or email | free text, at least one required |
| `language` | `en` / `ar` | which assistant instance was used |
| `intent` | `explore_programmes` / `admissions_question` / `fees` / `speak_to_someone` | which branch |
| `age_group` | `under_10` / `10_17` / `18_plus` | only present on the programmes branch |
| `interest` | `academic` / `islamic` / `both` / `unsure` | only present on the programmes branch |
| `study_mode` | `day` / `boarding` / `not_applicable` | only present on the programmes branch |
| `matched_programme` | "Royal College" | the recommendation shown, for admissions-team context |
| `question_topic` | free text | only present on the admissions-question branch, if they typed a follow-up |
| `submitted_at` | ISO timestamp | added client-side at submit time |

---

## Part V — Escalation Rules

The assistant hands off to a human (surfacing phone/WhatsApp/email
immediately, no further questions) whenever:
- The visitor explicitly asks for a person, at any point.
- The visitor's question falls outside the knowledge base above
  (anything about fees, calendar, international admission, medical/
  safeguarding concerns, complaints, or anything not covered by a
  published page).
- The visitor selects an option three times without reaching a
  recommendation or contact capture (a simple loop-guard — if the
  decision tree isn't converging, stop guessing and hand off).

No branch is designed to "close" or "convert" a visitor who wants a
human — every branch always contains a visible path to real contact
info, never gated behind the form.

---

## Part VI — Multilingual Scope

**Built now:** English and Arabic (RTL), matching the site's existing
two full language builds. The widget is a per-language partial
(`assistant.html` / `assistant.ar.html`) assembled by the same build
system as the rest of the site, so it's never a bolt-on translation
layer — it's built the same way the pages themselves are.

**Not built:** French. The brief asked for it, but there is currently
no French version of a single page on this site — adding a French
conversation layer with nothing behind it to link to would mean
answering programme questions the site itself can't back up in French.
French should get the same investment the Arabic mirror got (full page
translation first) before a French assistant layer makes sense.

---

## Part VII — WhatsApp Extension (Not Built — Requires Client-Side Setup)

The conversation architecture in Part II is written to be portable to
WhatsApp with no redesign — the branches and questions are the same;
only the transport changes (WhatsApp's interactive list/button messages
instead of in-page chips). Building the live integration requires,
from the school's side, before any of this can be wired up:

1. A WhatsApp Business Platform connection — either directly via Meta,
   or through a Business Solution Provider (e.g. Twilio, 360dialog).
   This requires the school's own business verification; it cannot be
   created on their behalf.
2. A phone number dedicated to the WhatsApp Business API (the existing
   `+234 807 374 7650` number could potentially be migrated, but that's
   a decision with real operational tradeoffs — that number is also the
   general enquiries line today).
3. A small server to receive WhatsApp webhook events and run the same
   decision-tree logic — this static site has nowhere to run that; it
   would need actual hosting (even a small one, e.g. a single Vercel
   serverless function).

Once those three exist, Part II's branches translate directly into
WhatsApp's message templates with minimal rework.

---

## Status

Design complete. The website widget (English + Arabic) implementing
Parts I–V is built alongside this document — see `partials/assistant.html`,
`partials/assistant.ar.html`, `js/assistant.js`, and the `[data-assistant]`
rules in `css/brand.css`. The WhatsApp extension (Part VII) remains a
future step pending the school's own WhatsApp Business setup.
