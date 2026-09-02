# Branding, Floating Buttons, Colour System, and Hero-Image Pattern — Audit

*Conducted 2026-09-02. Written because the original investigation that produced
findings "D1" through "D11" — three of which (D1, D2/D3, D4/D11) are already
implemented and recorded in the task list — was never itself written to a file.
It lived only in a conversation, and that conversation has since aged out of
context. The three completed items are re-verified below rather than re-derived
blind, so this document doesn't contradict work already done. Findings here are
numbered E1–E7 (Evidence-based) to avoid colliding with the lost D-numbering.*

---

## What was already done, re-verified as still correct

- **D1 — Header identity.** Confirmed: the "flagship dark chapter-open band"
  pattern (a `.ch-open`-style section with a large icon) is live on exactly
  **14** plain page-headers — matching the git history's own commit message
  ("Give the 14 plain page-headers the flagship dark chapter-open band")
  precisely. Consistent site-wide.
- **D2/D3 — Floating WhatsApp + message buttons.** Confirmed: a single shared
  partial (`partials/assistant.tpl.html`, mirrored `.ar.html`) injects both a
  chat-composer "assistant" widget and a WhatsApp launcher with a sub-menu of
  four pre-filled enquiry templates (admissions, programmes, boarding,
  general), each opening `wa.me` with real, non-fabricated pre-filled text.
  It's built into the build pipeline, not hand-copied per page — every public
  page gets it automatically, in every language.
- **D4/D11 — Surface colour shift.** Confirmed via `css/brand.css`'s token
  definitions: the default `--surface` resolves to Premium Cream/white rather
  than the deeper cream this replaced, with `--crimson:#7C1F2E` defined and in
  active use as the deliberate accent (visible in the ledger/ledger-role
  styling and elsewhere). No stale references to the pre-change palette found.

No regressions found in any of the three.

## E1 — Two deliberate hero patterns, correctly kept distinct

The site runs two header treatments, and they're consistently applied by page
*type*, not mixed at random:

1. **Icon-band header** (14 pages) — administrative/utility pages: academic
   calendar, faculty, policies, the verify-* family, announcements,
   marketplace, etc. A large line-icon on the dark band, no photo.
2. **Photo hero** (2 pages, `home.html` and `boarding.html`) — a real campus
   photograph in an `.as-photo`-classed block near the top of the page.

This is a real, working system, not an inconsistency — a verify-a-certificate
utility page doesn't want a campus photo competing with its actual job. Left
untouched.

## E2 — 23 real campus photos exist; 5 of them are used nowhere on the site

`assets/images/campus/` holds 23 genuine campus photographs (graduation
cohorts, laboratory sessions, competition medallists, the founder at
graduation, campus aerials, workshop/technology, sport). `assets/images/
gallery/` holds a further 30 (classrooms, laboratories, boarding facilities,
recitation assemblies, commissioning day). All are real, sourced photography —
no stock imagery, no placeholder blocks found anywhere in the public pages.

Five of the 23 in `campus/` are referenced **zero times** in any built page:

| File | What it shows |
|---|---|
| `campus-aerial-hero.jpg` | An aerial shot explicitly named as a hero candidate |
| `competition-medallists.jpg` | Students with competition medals |
| `graduation-stole.jpg` | A close shot of the graduation stole/regalia |
| `lab-biology.jpg` | The biology laboratory |
| `workshop-technology.jpg` | The technology workshop |

Real assets sitting idle isn't a design problem, but it is a missed
opportunity — especially `campus-aerial-hero.jpg`, whose own filename says
what it was shot for.

## E3 — Recommended placements for the 5 unused photos (not yet executed)

Deliberately left as a recommendation rather than something applied silently:
placing a photo into a page changes that page's visual weight and is a real
editorial call, the same kind of judgement this Standard reserves for a
proposal rather than a silent edit.

| Photo | Suggested page | Why |
|---|---|---|
| `campus-aerial-hero.jpg` | `strategic-plan.html` | The one page that's explicitly about the institution's whole scope and future — an aerial establishing shot fits its register, and it currently has zero real photos |
| `graduation-stole.jpg` | `graduate-profile.html` | Currently shows only the decorative crest; a graduation-detail photo would suit a graduate-facing page far more than an icon or crest alone |
| `competition-medallists.jpg` | `student-life.html` | Currently has zero campus photos despite being exactly the page an achievement photo belongs on |
| `lab-biology.jpg` | `curriculum-architecture.html` or `facilities.html` | `facilities.html` already carries chemistry/physics-adjacent content; biology is the visible gap |
| `workshop-technology.jpg` | `curriculum-architecture.html` | Zero photos currently; a hands-on workshop shot grounds a page that is otherwise all prose about what's taught |

## E4 — `faculty.html` and `foundation.html` stay icon-header, on purpose

Both were candidates for a photo (faculty has real leadership headshots in
`assets/images/leadership/`: founder-CEO, and two more). Left as icon-header
pages deliberately: they belong to the confirmed 14-page administrative-header
set (E1), and a photo insertion there would be a pattern break, not a fix.
`assets/images/leadership/` photos are already used correctly elsewhere (the
founder-spotlight pattern seen in `about.html`), which is the right home for
them.

## E5 — No branding inconsistency found beyond the above

Logo/wordmark usage, the Pearl (Theme VII) livery's proportion targets, and
the colour-token system in `css/brand.css` were spot-checked against the
`css/liveries.css` luminance-matching method this Standard's design section
(`SES §7.1`) already cites as the institutional method — found consistent,
no further action.

## E6 — Floating-button system: no gaps found

Confirmed injected on every one of the 36 public source pages via the shared
build-time partial (0 pages found missing it in the built output). No second,
undocumented floating-button implementation found elsewhere.

## E7 — Recommendation: record findings like this one going forward

The reason this document exists at all is that the original D1–D11 findings
were never written down anywhere durable. Per this Standard's own honesty and
documentation discipline (`SES §21`, `§9–§17` documentation row): a finding
that exists only in a conversation is invisible to the next person, or the
next session, who needs it. Recommend this file's pattern — a dated audit
document under `docs/`, findings numbered and reasoned — become the default
for any future site-wide investigation, rather than trusting a task list's own
short labels to carry the reasoning.

---

*Corresponds to task list items #47 (this investigation) and #48 (the
photography inventory in E2). Both closed by this document; E3's five
placements remain open recommendations, not yet executed.*
