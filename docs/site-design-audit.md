# SHRS Site Design Audit — against the "Imperial Digital Campus Directive"

**Status: all four priority findings below have been fixed** (home page
contact icons, Nursery and Primary / Islamic and Arabic Studies visual
identity, and the three policy-page gaps — cross-links, print stylesheet,
revision history), across both English and Arabic. See the "Priority
order" section at the end for what changed in each case.

Page-by-page review of every live page, evaluated against the directive's
own checklist (header/nav, iconography, visual storytelling, imagery,
Islamic design language, typography, colour, footer, governance/policy
experience, animation). No code changed in this pass — this is a findings
document, written so specific items can be picked for a real
implementation pass rather than triggering another unscoped rewrite.

**Headline finding: most of the directive's checklist is already built.**
Seven prior "Flagship Experience Redesign" phases (header, footer, button
system, icon system, real photography + honest placeholders, motion
design, distinct school identities, mega-menu, floating CTA, footer map,
visual-intelligence diagrams, colour system, facilities rebuild) already
cover the large majority of what's being asked for again here. The real,
concrete gaps are narrower and listed below.

## 1. The one real inconsistency worth fixing first

**`pages/home.html`, Contact section (lines ~163-169): still uses "◆"
unicode-diamond bullets instead of real SVG icons.** The standalone
`/contact/` page was fixed to use proper SVG icons earlier in this
project (the "Contact Page" design-review pass) — but that fix was never
propagated to the *embedded* contact section on the homepage, which
duplicates the same content with the old placeholder bullets. This is the
single most visible, easily-fixable "looks unfinished" spot on the whole
site, because it sits on the homepage and visitors will see the properly-
iconed version on `/contact/` moments later, making the inconsistency
obvious. **Recommended fix: swap the 5 `<div class="ico">◆</div>` spots in
`pages/home.html` for the same SVG icon set already used in
`pages/contact.html`.** Small, mechanical, high-visibility.

## 2. Asymmetric school-identity treatment

Phase 2/6 gave **Qur'an College** a distinct manuscript/geometric styling
treatment and a real Hifz-journey diagram, and gave **Governance** an
Oxford Navy accent treatment. **Nursery and Primary** and **School of
Islamic and Arabic Studies** never received an equivalent distinct visual
identity — both are the shortest, plainest of the four school pages, each
ending on a bare `.image-slot` placeholder with no other visual device.
Since the site's own framing is "one board, one CLEVER standard, four
distinct paths," two of the four currently read as visually second-class.
**Recommended: give Nursery and Primary and Islamic and Arabic Studies each
one real, honest visual device** — e.g., Nursery and Primary could get a
simple "A Day in Early Years" flow (arrival → circle time → mixed
Islamic/secular instruction → play → dismissal, drawn from what's already
described in the curriculum text, not invented), and Islamic & Arabic
Studies could get its weekday/weekend schedule turned into a visual
timetable strip instead of the current plain two-column text row.

## 3. Governance & Policy experience — partially built, three real gaps

Already real and working: policy codes (GV-01, AC-02, etc.), a full
"Policy Information" metadata table (code/version/owner/approval
authority/review cycle) on every entry, a sign-off row (prepared/
reviewed/approved by, next review date), and an accordion so 25+ full
policies don't read as one long PDF dump.

Genuinely missing, per the directive's own list:
- **Related documents** — policies that reference each other in prose
  (e.g., Academic Regulations mentions the Hifz Regulations) have no
  clickable cross-link inside the accordion; a reader has to scroll and
  find the other entry manually.
- **Download / print-friendly** — there's no per-policy "Download as
  PDF" or a `@media print` stylesheet tuned for the accordion (currently
  printing a collapsed accordion would only capture the closed headers,
  not the body text).
- **Revision history** — each entry shows its *current* version and
  "next review," but not what changed since v1.0. The Master Register
  (an internal doc, not published) tracks this; the public policy page
  doesn't surface it.

"Reading progress" (a scroll-progress indicator) was on the directive's
list too — evaluated and **not recommended**: on an accordion page where
most content is collapsed by default, a reading-progress bar would be
tracking scroll position through mostly-empty space, not actual reading
progress. Not a real gap, a pattern that doesn't fit this page's structure.

## 4. Content gaps already honestly disclosed (not new findings, confirmed still open)

- `academics.html`: real term dates for an Academic Calendar — flagged
  in-page as "Content Needed From SULTAN," not fabricated.
- `admission.html`: tuition fees, scholarship criteria, international-
  student arrangements — same honest placeholder pattern.
- Four `.image-slot` placeholders still open: Nursery and Primary campus,
  Islamic and Arabic Studies classrooms, Foundation programme photography,
  (and now, per finding #2, two schools' pages would benefit from a
  diagram in the meantime, not just a placeholder).

These aren't design failures — they're the site correctly refusing to
publish invented numbers or stock photography. Listed here only so
they're not mistaken for something this audit missed.

## 5. Footer, header, colour, typography, animation — no material gaps found

Checked against the directive's checklist line by line:
- Footer: contact, quick actions, governance links, parent resources,
  admissions, publications (policies), social, real embedded map,
  institutional identity block — all present (Phase 4).
- Header: 7-category mega-menu, large icons, descriptions, featured
  links per category — present (Phase 3).
- Colour: coffee-brown/gold/cream primary identity, with Oxford Navy and
  Forest Green as scoped supporting accents — present (Phase 6), and now
  extended into 5 user-selectable accent options in the Personalisation
  Centre (Phase 2 of that feature).
- Typography: Cinzel/Amiri for display and institutional labels,
  Cormorant Garamond/Amiri for editorial serif body, Inter/Cairo for UI —
  a real, consistent three-tier system, not a single default font.
- Animation: hero word-reveal, crest breathing, foil-sweep shimmer,
  card-elevation hovers, stat-band count-up, reveal-on-scroll — all
  respect `prefers-reduced-motion` and the Personalisation Centre's
  manual Reduced Motion toggle.

## Priority order, if building from this audit

1. Home page contact-icon fix (#1) — small, mechanical, highest visual
   payoff for the effort.
2. Nursery and Primary / Islamic and Arabic Studies visual-identity parity
   (#2) — moderate effort, fixes a real asymmetry between the four
   "equal" schools.
3. Policy related-document cross-links + print stylesheet (#3) — moderate
   effort, genuinely improves the governance experience the directive
   asked about.
4. Policy revision history — larger effort (needs deciding how much
   internal Master Register detail becomes public), lowest priority of
   the four.
