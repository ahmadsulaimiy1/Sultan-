# Sultan Hanafi Royal Schools — Information Architecture Blueprint

*Response to the Imperial Information Architecture & Digital Governance
Directive, grounded in the site's actual current content (audited fresh
for this document — see "Ground truth" note at the end) rather than
invented structure. Every recommendation below is marked **LIVE**
(exists today, or buildable now from real content already on the site)
or **PENDING CONTENT** (the structure is worth having, but needs real
material from the school before it can honestly go live — the same
placeholder-honesty discipline this entire project has held to for fees,
the academic calendar, and international admissions).

**Implementation update:** every item marked LIVE-buildable in this
document — the header mega-menu restructure, the new Student Life
grouping, a header Parent Portal CTA, the Policies page recategorized
into four groups, the six-zone footer, and a client-side site search —
has since been built and shipped in the same session this document was
written. PENDING CONTENT items remain exactly that: not built, because
they need real material from the school first.

Two real findings surfaced during this audit that belong in front of
everything else, because they affect trust in what's already published:

1. **Two different domains appear in published contact emails** —
   `info@shroyalschools.ng` (general enquiries) vs.
   `principal@shrschools.ng` (Principal's Office) — `shrschools.ng`
   vs. `shroyalschools.ng`. If the second domain isn't actually
   registered and monitored, that address silently fails. Worth
   confirming with the school before any IA work proceeds — it's a
   findable, fixable issue, not a new one this redesign created.
2. **A role-title conflict**: Mr. Oladele Abdulwasiu Adebayo is listed
   as "Head, Research & Development" on the Governance page but signs
   policies as "Principal." Fatimah Badmus, who signs every policy as
   "VP Administration," doesn't appear on the Governance page's roster
   at all. Worth reconciling before publishing any redesigned governance
   section — a mega-menu that surfaces leadership more prominently will
   make this inconsistency more visible, not less.

---

## 1. Header navigation — redesigned

**Current structure** (flat, 2 shallow dropdowns): Our Story (About,
Governance) · Academics (4 institutions) · Boarding · Admission ·
Facilities · Foundation · Policies · Contact · "Enrol Now" CTA.

This works, but scatters audience-specific content (a boarding parent, a
prospective family, an enrolled family) across flat top-level items
instead of grouping by who's looking for what — the core critique a
"world-class" IA review would make.

**Redesigned structure** (7 top-level entries, 4 as true mega-menus, 2
persistent CTAs):

| Position | Item | Type | Status |
|---|---|---|---|
| 1 | **About** | Mega menu | LIVE (restructures existing pages) |
| 2 | **Academics** | Mega menu | LIVE (restructures existing pages) |
| 3 | **Admissions** | Mega menu | LIVE + PENDING (fees/calendar items) |
| 4 | **Student Life** | Mega menu | LIVE (new grouping of Boarding + Facilities) |
| 5 | **Parents** | Mega menu | LIVE (Portal is real) + PENDING (handbook etc.) |
| 6 | **Foundation** | Simple link | LIVE (unchanged — distinct legal entity, deserves its own top-level presence, not folded into About) |
| 7 | **Contact** | Simple link | LIVE (unchanged) |
| CTA | **Enrol Now** | Button | LIVE (unchanged) |
| CTA | **Parent Portal** | Button | LIVE — currently only in the footer; promote to the header now that it's a real, working feature |

"Policies" disappears as a flat top-level item and is absorbed into
About's Governance column — a policies *library* belongs under
governance, not floating alone at the same level as "Contact."

---

## 2. Mega-menu architecture

For each mega menu: hierarchy, groupings, a featured callout, and an
icon direction (see §9 for the icon system itself).

### About
- **Column — Our Institution**: Our Story · Mission, Vision & Values ·
  Governance & Leadership *(LIVE — reconcile the two title conflicts
  above before launch)*
- **Column — Governance & Compliance**: Policies Centre (LIVE, existing
  9 policies, recategorized — see §3) · Safeguarding & Child Protection
  *(PENDING CONTENT)* · Privacy Policy *(PENDING CONTENT)*
- **Featured callout**: "Meet the Director" — portrait + pull-quote,
  linking to the existing Director's Message.
- **Icon**: an open-book/seal motif, echoing the crest's existing "Open
  Book" quadrant.

### Academics
- **Column — Our Institutions**: Nursery & Primary · Royal College ·
  School of Arabic & Islamic Studies · Qur'an College — each with a
  one-line descriptor pulled verbatim from existing content (age range +
  curriculum source), not new copy.
- **Column — Academic Framework**: Curriculum Overview (LIVE, the
  existing comparison table) · Assessment Policy (LIVE, cross-link into
  Policies Centre) · Academic Calendar *(PENDING CONTENT — flagged
  repeatedly across this project already; still the single most
  requested missing page)*
- **Featured callout**: "Compare all four institutions" → existing hub
  page.
- **Icon**: four small glyphs, one per institution (crescent for Arabic
  & Islamic Studies, a graduation-cap-adjacent mark for Royal College,
  a seedling for Nursery & Primary, an open Qur'an mark for Qur'an
  College) — distinct enough to scan quickly, consistent enough to read
  as one family.

### Admissions (renamed from "Admission")
- **Column — Apply**: Admissions Process (LIVE, the 12 stages) ·
  Documents Required (LIVE) · Entrance Assessment (LIVE, currently a
  sub-point, worth its own anchor).
- **Column — Prepare**: Fees & Scholarships *(PENDING CONTENT — same
  honest gap the Admission page's own placeholder note already states)*
  · International Admissions *(PENDING CONTENT)* · Boarding Options
  (LIVE, cross-link to Student Life).
- **Featured callout / CTA**: "Enrol Now" — kept as its own button, not
  buried inside the menu.
- **Icon**: a document/seal-and-ribbon mark (admission letter motif —
  the site already describes a real "unique admission number" concept,
  worth echoing visually).

### Student Life (new grouping)
- **Column — Campus & Boarding**: Boarding Facility (LIVE) · Facilities
  & Estate (LIVE, the existing 12-item index).
- **Column — Student Resources**: Student Code of Conduct *(PENDING
  CONTENT)* · Student Handbook *(PENDING CONTENT)*.
- **Featured callout**: a facilities photo strip (once real campus
  photography exists — still flagged as outstanding from earlier in
  this project).
- **Icon**: a simple architectural/building mark, distinct from the
  academic glyphs above.

### Parents (new grouping)
- **Column — Parent Portal**: Sign In / Dashboard (LIVE — links directly
  to `/portal/login/`) · About the Portal (LIVE, one short paragraph
  explaining what it does and its Pilot status honestly).
- **Column — Parent Resources**: Parent Handbook *(PENDING CONTENT)* ·
  Academic Calendar *(PENDING CONTENT, same page as Academics' version)*
  · Fee Information *(PENDING CONTENT)*.
- **Featured callout / CTA**: "Access the Parent Portal" — the primary
  action this whole menu exists to drive, since it's the one genuinely
  interactive, real feature parents have today.
- **Icon**: a simple key/access mark, distinguishing this as an
  authenticated-area entry point rather than a content page.

---

## 3. Governance architecture — audit and priority

What exists today: **9 real, signed-off policies** (Assessment,
Anti-Bullying & Disciplinary, Career, Dress Code, Equal Opportunity,
First Aid, Health & Safety, Visitors, Complaint) on one flat Policies
page. Solid content, weak presentation — no categorization, no
standalone governance framing.

| Requested document | Status | Priority | Note |
|---|---|---|---|
| Constitution | Not applicable in the usual sense | — | "Constitution" is the right instrument for a membership association or statutory board; SHRS is proprietor/board-led. A **Governance Charter** (below) is the honest equivalent. |
| Governance Charter | **GAP** | Important | Today's Governance page is a leadership *directory*, not a charter — no stated board terms, meeting cadence, or committee structure beyond the Complaints Committee mentioned inside the Complaint Policy. |
| Board Structure | Partially exists | Important | Names/titles exist; terms of reference don't. |
| Institutional Policies | **LIVE** | — | Recategorize into: *Academic* (Assessment), *Safety & Welfare* (First Aid, Health & Safety, Visitors), *Conduct & Discipline* (Anti-Bullying, Dress Code, Equal Opportunity), *Administrative* (Career, Complaint). |
| Child Protection / Safeguarding | **GAP** | **Critical** | The single highest-priority missing document, given the school enrolls children from age 2. This needs real institutional input (designated safeguarding lead, reporting procedure) — not something to draft speculatively. |
| Terms & Conditions | **GAP** | Important | Standard expectation for any institution collecting enrolment/payment commitments. |
| Privacy Policy | **GAP** | **Critical** | This is no longer optional — the Parent Portal now processes real guardians' and students' personal data. Ties directly to the Nigeria Data Protection Act 2023 obligations already raised in `parent-portal-audit.md`; a published Privacy Policy is part of discharging that obligation, not just an IA nicety. |
| Complaints Procedure | Substantively exists | Nice-to-have | Already covered inside the Complaint Policy (timelines, committee). Extracting it into its own page is cosmetic, not urgent. |
| Student Code of Conduct | **GAP** | Important | Anti-Bullying & Disciplinary Policy covers part of this; a comprehensive code of conduct is broader (attendance, uniform, academic honesty, digital conduct). |
| Parent Code of Conduct | **GAP** | Important | Increasingly standard at institutions with active parent portals/communication channels — expected conduct in parent-staff communication, WhatsApp/portal use, campus visits. |
| Academic Integrity Policy | **GAP** | Important | Not covered by the existing Assessment Policy, which is about grading mechanics, not honesty expectations. |
| Boarding Regulations | **GAP** | Important | The Boarding page is descriptive/marketing content; a real boarding population (ages 9–16) warrants a formal regulations document (house rules, curfews, discipline specific to boarders, visiting hours). |

**Risk-ordered priority: Safeguarding/Child Protection and Privacy
Policy first** (both carry real legal/reputational exposure now, not
hypothetically); Boarding Regulations, both Codes of Conduct, and
Academic Integrity next; Governance Charter and a standalone Complaints
Procedure last (institutional polish, not urgent risk).

---

## 4. Parent & Student ecosystem

| Resource | Status | Note |
|---|---|---|
| Parent Portal | **LIVE** | Real, working, Pilot-labeled — see `parent-portal-audit.md`. |
| Parent Handbook | **GAP** | Common expectation; can largely be assembled from content that already exists across Policies/Admission/Boarding once compiled into one document. |
| Student Handbook | **GAP** | Same opportunity — assemble from existing real content plus the new Code of Conduct once written. |
| Academic Calendar | **GAP** | Repeatedly the most-flagged missing item across this entire project. |
| Forms & Downloads | **GAP, structural** | Nothing on the site today is a downloadable file — everything is HTML. A "Forms & Downloads" library is worth building as a structure now (a real, findable place for the Admission Form, policy PDFs, etc.) even before every document exists — start it with what's real (e.g., a PDF version of the Admissions checklist) rather than waiting for all of it. |
| Support channels | **LIVE and strong** | WhatsApp float, AI assistant, contact form, phone/email all real and working — the redesign's job is to surface these consistently from the new Parents/Student Life hubs, not to add more channels. |
| Student-facing portal | **Future work** | Today's portal is guardian-only by design (see `digital-campus-roadmap.md`/Phase 2-3 roadmap) — a student-facing view is real future scope, not an oversight in this pass. |

---

## 5. Academic architecture

| Item | Status | Note |
|---|---|---|
| Curriculum Framework | Partially exists | Subject lists exist per institution; no single document framing the pedagogical approach across the conglomerate. Worth consolidating once written, not urgent to invent now. |
| Assessment Framework | **LIVE** | The Assessment Policy already covers this well — just needs better cross-linking from the Academics mega menu (§2). |
| Teaching Philosophy | **GAP** | The CLEVER values exist on the homepage; a dedicated pedagogy statement doesn't. |
| Learning Outcomes | **GAP** | No stated per-level outcomes exist yet. |
| Academic Regulations | **GAP** | Promotion criteria, repeat-year policy, etc. aren't documented. |
| Certification Pathways | Partially exists | Qur'an College's Ijazaat pathway is documented; Royal College's WAEC/NECO progression is implied, not stated. |
| Academic Calendar | **GAP** | (Same item as §4 — one page serves both the Academics and Parents mega menus.) |
| Progression Routes | **GAP** | What happens after Royal College (tertiary pathways) isn't documented anywhere. |

None of these should be fabricated to fill the menu — the honest move is
to build the *structure* (a clearly labeled place for each) and populate
each entry as the school provides real material, exactly as this
project has handled fees and the calendar throughout.

---

## 6. Institutional publications

| Publication | Recommendation | Priority |
|---|---|---|
| Prospectus | **Build now** | High — a downloadable PDF prospectus is one of the most commonly expected assets for a school at this level, and it requires no new facts: it's a well-designed repackaging of content that's already true and already published. |
| Student Handbook / Parent Handbook | Build once Code of Conduct exists | Important — see §4. |
| Policy Manuals | Package the existing 9 policies as one downloadable PDF | Nice-to-have, low effort, real value. |
| Publications Centre (a page that houses all of the above) | Build the structure now, populate as documents are ready | Worth doing early — an empty-looking "Publications" page with 1–2 real documents and clearly labeled "more coming" is more credible than adding pages ad hoc later. |
| Annual Reports | Aspirational — Phase 3 | More typical of larger accredited/international institutions; not urgent at this stage. |
| Strategic Plans (public-facing summary) | Aspirational — Phase 3 | Same. |
| Academic Reports | Aspirational, low priority | Not a near-term need for a school at this stage. |
| Research & Insights | Aspirational, low priority | A blog-style section is a nice-to-have, not core IA. |

---

## 7. Footer architecture — redesigned into six zones

| Zone | Contents | Status |
|---|---|---|
| **Institutional** | About, Governance & Leadership, Foundation, Careers *(gap — no careers page exists; flag as future, common at prestige institutions)* | LIVE + one gap |
| **Academic** | The four institutions (unchanged from today) | LIVE |
| **Parent Resources** | Parent Portal, Parent Handbook *(pending)*, Academic Calendar *(pending)*, Admissions | LIVE + pending |
| **Governance** | Policies Centre, Safeguarding *(pending)*, Privacy Policy *(pending)*, Terms & Conditions *(pending)*, Complaints Procedure | LIVE + pending |
| **Contact** | Address, both phone numbers, both emails (flag the domain question above before publishing), social links | LIVE, pending one verification |
| **Quick Action** (a distinct final strip, not just another link column) | "Enrol Now" button · "Parent Portal" button · WhatsApp button | LIVE — all three already exist as real features; this zone just gives them one more, more prominent, closing placement |

---

## 8. Premium user experience

| Feature | Status | Recommendation |
|---|---|---|
| Sticky navigation | **LIVE** | Correction to an earlier draft of this document — `header.nav` was already `position:sticky` before this audit; no gap here. |
| Utility navigation (topbar) | **LIVE** | Already solid — contacts, socials, language switch. |
| Quick-access portal CTA | **LIVE** (implemented as part of this pass) | Promoted from footer-only to a real header CTA button (§1). |
| WhatsApp integration | **LIVE** | Already built earlier this project — floating launcher with topic menu. |
| Search system | **LIVE** (implemented as part of this pass) | Built as a lightweight client-side search — a per-language JSON index generated at build time from `pages/manifest.json`, plus a small overlay UI (`js/search.js`). No backend, no external service, indexes all real pages. |
| Language switcher | **LIVE** | Already solid. |
| Accessibility tools | **GAP, but be careful here** | Recommend a real accessibility *audit* (alt-text coverage, color contrast, keyboard navigation, focus states) over bolting on an "accessibility widget" — those overlay tools are frequently more theater than help, and don't substitute for genuinely accessible markup. Honest recommendation: fix the underlying HTML/CSS, don't add a gimmick layer. |

---

## 9. Visual direction — icons

The site already has a bespoke visual vocabulary (per `editorial-bible.md`):
ledger rows, folio chapter markers, monogram letters, a crest with four
meaningful quadrants (Crescent & Star, Open Book, Three Stars, Tree).
**The icon system for this new mega-menu structure should extend that
vocabulary, not import a generic icon pack** (Font Awesome / Material
Icons would visibly clash with the bespoke "flagship royal" aesthetic
already established and paid for in design effort).

Recommended: a small set of custom line-drawn SVGs, same stroke weight
and gold/navy palette as the existing crest and corner ornaments —
one glyph per mega-menu column (open book for Academics, a crescent
mark for Islamic Studies content, a seal/ribbon for Admissions, a
key mark for the Parent Portal, a shield mark for Governance). Elegant,
consistent, and legible at 16–20px — not decorative for its own sake.

---

## What's buildable right now vs. what needs the school's input

**Buildable immediately, from real existing content** (header
restructure into mega menus, footer's six-zone redesign, Parent Portal
CTA promoted to the header, Policies recategorized into four groups,
client-side site search): this is real, scoped implementation work I
can start as soon as you'd like — say the word and I'll build it the
same way everything else in this project has been built: real code,
tested, then shipped.

**Needs the school's input before it can honestly go live** (Safeguarding
& Child Protection Policy, Privacy Policy, Terms & Conditions, both
Codes of Conduct, Academic Integrity Policy, Boarding Regulations,
Governance Charter, fees, academic calendar, international admissions,
the domain/title inconsistencies flagged above): I can draft structure
and placeholders for every one of these, but not their substantive
content — that has to come from the school, the same discipline this
project has held since the very first editorial bible.

---

*Ground truth for this document was gathered by directly reading the
current `partials/`, `pages/manifest.json`, `pages/policies.html`,
`pages/about-governance.html`, and every institution/admission/boarding/
foundation/contact content file, plus a repo-wide search for
safeguarding/child-protection/code-of-conduct/complaints/privacy-policy/
terms/academic-integrity/constitution/governance-charter/prospectus/
annual-report/strategic-plan/handbook content — confirming none of those
governance documents exist today outside of internal planning notes in
`docs/`, which are not published site content.*
