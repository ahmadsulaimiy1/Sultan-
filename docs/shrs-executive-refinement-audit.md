# SHRS Executive Refinement Audit v1.0

**Scope.** The public-facing marketing website, reviewed against the
client's "Executive Refinement Directive" (institution presentation,
CTA hierarchy, Digital Campus visibility, admissions clarity, typography,
faculty presentation, prestige benchmark against Harrow/Eton/Qatar
Foundation-tier sites). This document has two parts: **Part 1** records
what this session actually shipped in response to that directive; **Part
2** is the ranked, page-by-page list of what's still open, in the
Critical/High/Medium/Future format the directive asked for — continuing
the numbering convention of `docs/shrs-website-excellence-roadmap.md`
rather than restarting it.

**Standing discipline, unchanged from every other document in this
project:** no invented staff names, fees, dates, photography, or
credentials appear anywhere below. Where a finding says a school-supplied
input is missing, that is stated plainly rather than filled in.

---

## Part 1 — What Shipped This Session

1. **Naming corrections (sitewide, EN+AR).** Reversed "Arabic & Islamic
   Studies" back to "Islamic and Arabic Studies" (client wrote it this way
   unprompted in two consecutive directives — confirmed with the client
   before executing), and added the "Sultan Hanafi" prefix to each
   school's primary display title (academics page H2s, Faculty Directory
   section headers, footer academic links). Header mega-menu items and
   the footer icon-strip keep short/unprefixed labels — a deliberate
   space-constrained-UI scoping call, not an oversight.
2. **Chapter-label removal (33 pages, EN+AR).** Deleted the `Chapter N —
   Section` folio line from every content page; each page's own existing
   eyebrow label now carries the section name, with no page left without
   one.
3. **CTA hierarchy overhaul.** Reordered primary CTAs sitewide to
   Register/Login first, Start Admission second — header, mobile
   quick-row, the floating action button, the homepage hero, and the
   footer quick-actions row. Real trade-off, noted plainly: most homepage
   visitors are prospective parents without an account yet, so leading
   with Register/Login over admissions risks under-serving that majority.
   Implemented exactly as directed since the hierarchy was given
   explicitly.
4. **Premium button system.** Added a shared `--btn-radius` token and
   applied real border-radius plus a refined hover lift/shadow to
   `.btn`/`.btn-gold`/`.btn-outline`/`.nav-cta`/`.nav-mark`/`.apply-float`/
   `.foot-quick-actions` — a genuine visual departure from the site's
   previous sharp/heraldic 0–2px corners.
   - **Regression caught and fixed in the same pass:** the longer
     "Register / Login" label overflowed the desktop header at common
     laptop widths (1280–1440px). Fixed by dropping the redundant
     standalone "Student Portal" header link (still reachable via two
     mega-menus, mobile quick-row, and the footer) and raising the
     mobile-nav breakpoint from 1200px to 1440px so those widths get the
     already-polished mobile ribbon instead of an overflowing desktop row.
5. **Institution showcase cards.** Replaced the homepage's plain ledger
   table with four cards (full prefixed name, description, age range,
   curriculum, learning model, strengths, tiered CTAs). Royal College and
   Qur'an College carry a real hand-built carousel (auto-rotate, pause on
   hover/focus/touch, swipe, dot navigation) over their 2 existing real
   photos each. Nursery and Primary and Islamic and Arabic Studies have zero
   dedicated photography today, so their visual slot is a scoped-accent
   identity panel (mini foundations diagram / mini weekday timetable)
   rather than fabricated stock imagery — the same precedent already set
   on their own academics pages.
6. **Digital Campus homepage teaser.** New 4-tile section (Parent Portal,
   Student Portal, Founder Dashboard, Adhkār Centre) closing the
   previously-confirmed gap where the homepage never mentioned the
   Digital Campus at all.
7. **Admissions reframed to 7 steps.** Register Account → Complete
   Profile → Admission Application → Verification → Review → Offer →
   Enrolment, worded to match what's actually real (email verification
   exists; "Review" reflects the real staff-side `submitted` →
   `under_review` transition; "Enrolment" points to the real Registrar's
   Office). The phone/WhatsApp/email enquiry block moved from "Stage 1"
   to a secondary "prefer to talk first?" option. The existing 12-stage
   detailed list stays underneath as supporting operational detail.
8. **Type-scale variables.** `--h2-size`/`--h3-sub-size` custom
   properties replace ~36 identical hardcoded inline `font-size`
   overrides sitewide with one point of control — same rendered size,
   scoped polish rather than a full typographic rebuild.
9. **Faculty Directory cross-link** added directly from the homepage
   institution cards section.

All of the above is mirrored in full to the Arabic site (RTL-correct
layout, translated copy, `dir="ltr"` kept only on the handful of labels
whose destination page is English-only, matching the site's existing
convention).

---

## Part 2 — Ranked Findings

### Critical

**C1. Tuition fees are still the single highest-value content gap.**
Unchanged from the prior roadmap — every institution card now shows
curriculum and learning model, but not price. A parent comparing schools
still needs a phone call to budget. *Needs a real fee schedule from
the school; nothing to build until then.*

**C2. Two of four schools still have zero real photography.**
The Executive Refinement directive's literal "3–7 image carousel per
school" ask cannot be honestly filled for Nursery and Primary and Islamic &
Arabic Studies today. This session shipped an honest interim (scoped-
accent identity panels), but it is a content gap, not a finished feature
— the carousel component is generic enough to accept real photos the
moment they exist. *Needs photography of both campuses/classes.*

### High

**H1. The Register/Login-first CTA hierarchy needs a first-touch
metrics check once traffic exists.** This was implemented exactly as
directed, but it is a real conversion-funnel bet: it assumes visitors
already know they want an account, when most first-time visitors are
still in the "should I even consider this school" phase. Recommend
watching Parent Portal registration-start vs. admissions-page-view
ratios once there's traffic to look at, and revisiting the hierarchy if
registrations lag admissions interest.
**H2. "Meet Our Educators" (Faculty Directory) is real but thin.** It
already satisfies the directive's literal ask — named staff, roles,
qualifications, initials/monograms, no fabricated photos — for the three
schools with named subject teachers on record. Royal College's directory
entry is still principal-only; the site has no subject-teacher roster for
it the way Qur'an College and Islamic and Arabic Studies do. *Needs the
Royal College subject-teacher list from the school.*
**H3. The homepage's dark-section rhythm now has two dark bands in a
row** (the new Digital Campus teaser, then Governance) where the rest of
the page alternates light/dark. Minor, and not requested by the
directive, but worth a follow-up pass if a future visual-rhythm phase
is scheduled.

### Medium

**M1. The 12-stage detailed admissions list below the new 7-step visual
now describes a partly paper-based process (physical admission letter,
class acceptance ticket) that duplicates ground the digital 7-step flow
already covers more currently.** Kept deliberately per the directive
("keep the existing 12-stage detailed list... it covers real ground the
7-step portal view doesn't" — entrance exam, fee payment, physical
documents), but the overlap reads slightly redundant on a close read.
Worth a rewrite pass once the school confirms whether the paper-process
stages (admission letter number, physical access ticket) are still
followed in practice now that the portal exists.
**M2. Nav-mark items in the header dropped from three to two** (Start
Admission + Register/Login) to fix the width-overflow regression found
this session. Parent Portal and Student Portal remain fully reachable
(mega-menus, mobile quick-row, footer) but are one click further from
the top-level header than before on desktop. Acceptable trade-off for
fixing a real overflow bug; flagged here for visibility rather than
silently absorbed.
**M3. `.mqr-item` (mobile quick-row) segments were deliberately left
un-rounded** while every other button on the site gained the new
`--btn-radius`. They're continuous ribbon segments, not standalone
buttons, and rounding one segment inside a straight-edged row would look
inconsistent — a scoping decision, not an inconsistency to fix later.

### Future

**F1. Full typographic rebuild.** This session's `--h2-size`/
`--h3-sub-size` variables cover the two most-repeated hardcoded sizes
(36 instances); dozens of smaller one-off inline `font-size` values
remain across individual pages. A complete type-scale system (display,
h1–h4, body, caption, all as variables) is a larger, separate pass.
**F2. Language selector beyond EN/AR**, motion-design audit, and
icon/imagery escalation — all carried forward unchanged from the prior
roadmap's Future section; still not requested or started.
**F3. Approval Workflow Architecture** (enforced staff approval chains,
not just recordable status) — carried forward from the identity/
migration roadmap, unrelated to this directive but still open.

---

*Written as the closing deliverable of the "SHRS Website Executive
Refinement Directive." Every claim above was verified against this
session's actual diffs and screenshots — nothing here is copied forward
unchecked from an earlier document.*
