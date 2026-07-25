# SHRS Flagship Prospectus — Visual Design System v1.0

*Deliverable #4 of 5. Takes the Editorial Bible's Parts IV–VIII
(typography, colour, photography, iconography, layout — principles)
and the Spread-by-Spread Blueprint (per-spread content) and specifies
the exact, production-ready measurements a designer or a design tool
needs to build every spread consistently. Nothing here overrides the
Bible; every number below is a specific instance of a Bible principle,
cross-referenced.*

## 1. Page geometry

| Property | Value | Rationale |
|---|---|---|
| Trim size | 240mm × 300mm (portrait) | A recognised premium-prospectus format — larger than A4, closer to the proportions of the named benchmark publications (Bible Part IX), while remaining a standard commercial print size (no custom die-cut cost) |
| Bleed | 3mm all edges | Standard commercial print safety margin for full-bleed photography (Bible Part VIII's cover/feature-spread images) |
| Live/safety margin | 12mm from trim on all edges | Keeps text and critical crest/logo elements clear of trim variance |
| Gutter (spine safety) | 15mm from spine edge for text; images may bleed across the gutter on feature spreads only | Prevents Welcome Message and body-copy spreads from losing text into the binding |
| Binding | Perfect-bound (square spine) at 44 pages | Appropriate weight/page-count for perfect binding; saddle-stitch would look thin at this page count and undercut the "substantial publication" prestige signal (Bible Part IX) |

## 2. Grid system

- **Column grid**: 12-column grid within the live area, 4mm gutters
- **Body-copy measure**: text sets across 6–7 of the 12 columns on
  Editorial spreads (Bible Part VIII) — never full-width body text,
  preserving the "generous margins" requirement
- **Feature-template grid** (Four Institutions, Bible Part VIII): image
  fills columns 1–12 on page 1 of each two-page spread (full bleed);
  page 2 splits 7 columns narrative / 5 columns data panel + supporting
  image
- **Baseline grid**: 4.5mm baseline, all body text and captions locked
  to it for cross-spread vertical rhythm — the specific mechanism that
  makes "visual rhythm" (Bible Part VIII's closing requirement) actually
  measurable rather than a design intention

## 3. Typography scale

*Extends Bible Part IV's role table with exact print point sizes.
Ratios follow a 1.333 (perfect fourth) modular scale from a 10pt body
base, matching the restraint principle in Bible Part IX — a small,
deliberate type system, not an ad hoc one.*

| Role | Typeface | Size | Leading | Tracking |
|---|---|---|---|---|
| Cover display | Cinzel | 48pt | 52pt | +40 |
| Section head (H1) | Cinzel | 24pt | 28pt | +30 |
| Subhead (H2) | Cinzel | 15pt | 19pt | +20 |
| Eyebrow label | Cinzel, small caps | 8.5pt | 11pt | +180 |
| Pull quote / lede | Cormorant Garamond, italic | 17pt | 24pt | 0 |
| Body text | Inter | 10pt | 15pt (1.5×) | 0 |
| Caption | Inter | 7.5pt | 10pt | +10 |
| Statistic numeral | Cinzel | 36pt | 38pt | 0 |
| Arabic display (Amiri) | Amiri | matches paired Latin role at 1.1× size (Arabic scripts read smaller at equal point size) | per role | 0 |
| Arabic body (Cairo) | Cairo | 10.5pt | 16pt | 0 |

## 4. Colour usage ratios

*Extends Bible Part V's "which colour belongs where" into an
enforceable ratio, per spread type:*

| Spread type | Dominant (≥50% of coloured area) | Accent (10–20%) | Neutral ground (remainder) |
|---|---|---|---|
| Cover / chapter-opening | `--navy`/`--navy-deep` (coffee brown) | `--gold`/`--gold-bright` | — (image-filled) |
| Editorial (Heritage, Student Life, etc.) | `--ivory`/`--milk` (ground) | `--gold` (rules, labels) | `--ink`/`--ink-soft` (text) |
| Feature template (Four Institutions) | Photography | `--gold` (data-panel accents) | `--parchment` (data-panel ground) |
| Statistics/Infographic (Governance, Achievements) | `--charcoal`/`--charcoal-deep` or `--ivory` (alternating for visual separation per Bible Part VIII) | `--gold` + `--bronze` (never both as dominant, per Bible Part V) | — |
| Closing | `--navy-deep` | `--gold-bright` | — |

**Hard rule carried from Bible Part V**: no spread uses more than two
of {coffee-brown, gold, bronze, oxford-navy} as visually dominant
simultaneously — this table enforces that as a checkable ratio, not
just a stated preference.

## 5. Component specifications

- **"At-a-glance" data panel** (Four Institutions template): fixed
  180pt × 240pt panel, `--parchment` ground, `--navy` text, `--gold`
  top rule, three data rows (Ages / Format / Established or
  equivalent), Cinzel small-caps labels + Inter values
- **Diagram nodes** (Hifz Journey, Digital Campus Ecosystem, Admissions
  Process): 2pt gold rule connectors, Cinzel small-caps node labels,
  circular or hexagonal node containers no larger than 60pt diameter —
  consistent geometry across all four confirmed diagrams (Bible Part
  VII) so a reader recognises "this is a diagram" instantly regardless
  of subject
- **Icon grid**: 32pt bounding box, 2pt stroke weight, single accent
  colour (gold or bronze per context), never mixed within one spread
- **Statistic block**: numeral (36pt Cinzel) + label (8.5pt Cinzel
  small caps) stacked, minimum 24pt clear space around each block —
  the concrete mechanism behind Bible Part IX's "restraint" principle
  for data display
- **Pull quote block**: Cormorant Garamond italic, gold opening-quote
  mark glyph (matching the existing `.quote-panel .mark` treatment
  already live on the website), left-aligned, 60% column width maximum

## 6. Image production specifications

- **Minimum resolution**: 300 DPI at final placed size — the existing
  web-optimised gallery images (`assets/images/gallery/*.jpg`) were
  produced for screen use; **each must be checked against this
  requirement before placement**, and re-sourced from original
  camera files where the web-optimised version falls short. This is a
  real production dependency this Blueprint/System pair cannot resolve
  on its own.
- **Colour treatment**: warm-toned grading consistent with the
  documentary-authentic standard (Bible Part VI) — no cool corrective
  grading that would fight the coffee-brown/gold palette
- **Crop discipline**: full-bleed images crop to the page's aspect
  ratio (240:300, i.e. 4:5) at the source-selection stage, not
  stretched or distorted to fit

## 7. What Deliverable #5 (Final Production) needs from this System

A confirmed print production partner or digital-production tool
(this project's own toolset can produce a full HTML-based
digital/print-ready mockup using this exact grid/type/colour system,
matching how every other visual asset in this project has been
built); resolution of the two real dependencies the Blueprint already
named — `NEW PHOTOGRAPHY NEEDED` (spreads 6, 8, 15) and
`[FIGURE PENDING]` (spreads 14, 16) — and one delivery-format decision:
whether the finished prospectus should be produced as an Adobe Express
document, a standalone file (PDF/image), or both. That decision needs
to be made explicitly before Deliverable #5 begins, not assumed.
