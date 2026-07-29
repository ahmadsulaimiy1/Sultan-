# SHRS Design System v1.0

**Phase 0 of the SHRS Imperial Digital Campus Transformation Directive.**
Status: foundation established. This document is descriptive as much as
prescriptive — most of it formalizes conventions that already existed
ad hoc across `css/brand.css` and `css/portal.css`; the gaps it closes
are the full type scale, a spacing/radius/shadow scale, and a chart
color convention, none of which existed as tokens before this pass.

Every subsequent module (Registrar, Teacher, Governance, LMS, Finance,
whatever gets built next) should draw from these tokens rather than
inventing new inline values, the same discipline that turned the old
mixed 0px/2px button-radius situation into the single `--btn-radius`
system during the Executive Refinement pass.

## Why this exists

The directive's own closing recommendation was correct: "the schools
that look truly world-class are usually not the ones with the most
pages — they are the ones with the most consistent design language."
Before this pass, that language existed in the developers' heads
(the .exec-card system, the SVG icon convention, the reveal-on-scroll
pattern) but nowhere written down, which is how inconsistency creeps
in as more people or more sessions touch the code.

## Colour

Defined in `css/brand.css` `:root`. Two tiers:

- **Brand colours** — `--navy`/`--navy-deep` (coffee-brown) and
  `--gold`/`--gold-bright` (royal gold) are the *only* colours that are
  actually SHRS's brand identity. Everything else below is supporting.
- **Prestige palette** — `--oxford-navy`, `--forest-green`,
  `--terracotta`, `--crimson`, `--bronze`/`--bronze-bright`, plus
  neutral surfaces `--cream`/`--milk`/`--parchment`/`--charcoal`. Used
  for section-rhythm variety (alternating light/dark bands) and for
  per-menu icon tinting (see `partials/header.html`'s `nth-of-type`
  rules) — never as a replacement for the two brand colours on
  primary actions.
- **Theme-aware aliases** — `--surface`/`--on-surface` and friends
  re-resolve under `:root[data-pc-theme="dark"|"light"]` (the
  Personalisation Centre's reading-mode toggle). Any new component that
  needs to respect light/dark mode should read from these, not from
  `--ivory`/`--ink` directly — those two stay fixed as the
  navy-band "light text on dark" pairing and must not re-theme.
- **Accent** — `--accent`/`--accent-bright` swap per the
  Personalisation Centre's four accent-colour options
  (`data-pc-accent`). Used for the user's personal customization layer,
  not for institutional branding.

## Typography

```
--h1-size: 2.8rem   /* page-level hero heading, one per page */
--h2-size: 2.2rem   /* section heading — existing token, unchanged */
--h3-size: 1.7rem   /* sub-section heading */
--h3-sub-size: 1.55rem /* existing narrower variant, kept for pages already using it */
--h4-size: 1.3rem   /* card/component title */
--body-size: 1rem
--small-size: 0.85rem  /* meta text, captions-in-context */
--caption-size: 0.72rem /* eyebrows, tags, timestamps */
```

Three-font system (unchanged, this was already consistent):
Cormorant Garamond for long-form headings, Cinzel for labels/buttons/
eyebrows, Inter (Cairo for Arabic) for body copy. Amiri layers in
automatically for Qur'anic Arabic passages.

**Migration note**: existing pages with hardcoded `style="font-size:
2.2rem"` etc. are not being mass-migrated in this pass (that's the
"further-refinement item" the Executive Refinement audit already
flagged) — new pages and new components should use the tokens from day
one.

## Spacing

```
--space-xs: 6px   /* icon-to-label gaps, tight inline spacing */
--space-sm: 12px  /* form field gaps, list-item padding */
--space-md: 20px  /* card padding, standard section gutter */
--space-lg: 32px  /* between distinct blocks within a section */
--space-xl: 48px  /* between major sections on light backgrounds */
--space-2xl: 72px /* between major sections on the homepage's dramatic bands */
```

## Radius

```
--radius-sm: 6px   /* chips, tags, small badges */
--radius-md: 8px   /* inputs, small cards */
--radius-lg: var(--btn-radius)  /* 10px — buttons, standard cards (alias, don't duplicate the value) */
--radius-xl: 16px  /* large feature panels, modal-like surfaces */
```

## Shadow

```
--shadow-sm: 0 6px 16px -6px rgba(20,13,4,0.25)   /* hover lift on small elements */
--shadow-md: 0 22px 48px -26px rgba(20,13,4,0.4)  /* .exec-card baseline — dashboard cards */
--shadow-lg: 0 28px 56px -24px rgba(0,0,0,0.55)   /* mega-menu panels, modals, anything overlaying content */
```

## Buttons

`.btn-gold` / `.btn-outline` / `.nav-cta` / `.nav-mark` / `.apply-float`
share `--btn-radius` and the established hover language (lift + shadow
bloom, no new libraries). No changes in this pass — already consistent
since the Executive Refinement phase.

## Cards — the `.exec-card` system

`css/portal.css`'s `.exec-card` / `.exec-stat` / `.exec-table` (built
for the Founder Dashboard, then applied to all four staff/parent/
student dashboards) is hereby the **canonical dashboard card system**.
Any new dashboard — Board of Governors, Teacher, Registrar, Finance —
should extend this system rather than invent a parallel one:

- `.exec-card` — the outer surface: ivory-on-navy gradient, gold
  hairline border, `--shadow-md`, `calc(var(--btn-radius) - 2px)`
  radius.
- `.exec-stat` — a single KPI number + label, for the "Students: 920"
  style figures the directive asks for. Already wired to pull from
  real counts (guardian/student/staff tables), never fabricated —
  that discipline continues for any new stat (admissions trend,
  attendance trend, Hifz completion rate, etc.): a chart with zero data
  points and an honest empty state beats a chart with invented numbers.
- `.exec-table` — tabular data inside a card (used for staff lists,
  fee tables).

## Charts

No charting library exists in this codebase (dependency-free static
site + Cloudflare Pages Functions — no bundler, no precedent for one),
and none is needed: hand-rolled inline SVG, built from the same data
the `.exec-stat` cards already fetch, is the established pattern.

The Founder Dashboard's revenue-by-month chart
(`revenueBarChart()` in `js/portal-founder-dashboard.js`) is the
canonical reference implementation — extend this shape rather than
inventing a new one:

- **Gridlines against a "nice" axis ceiling** — `niceCeil()` rounds the
  data max up to a clean 1/2/5/10-of-a-power-of-ten figure so gridlines
  land on round numbers, not the raw data's max.
- **A dashed average/benchmark line**, computed from the same rows the
  bars show — never a separately-fabricated target line.
- **A trend polyline** connecting each bar's top point, with point
  markers.
- **An inline legend** (small `<g>` of a dot + dashed swatch, top-right)
  naming the trend and benchmark lines.
- **Native `<title>` tooltips** on every bar and the benchmark line —
  zero-JS hover/long-press tooltips, real information (exact label +
  formatted amount) on demand without a JS tooltip layer.
- Series colour still comes from `--chart-1`–`--chart-6`, in order.

Two further patterns, added for the school-wide Hifz completion figure
and the fee collection funnel (also in `js/portal-founder-dashboard.js`):
`donutChart()` (a single-ring radial percentage, `stroke-dasharray`/
`stroke-dashoffset` driven, with a `<title>` tooltip and a centred
Cinzel percentage) and `collectionFunnel()` (a two-stage trapezoid
funnel with a taper connector, for any "top figure narrows to a
converted figure" story — invoiced→collected today, could be
admissions-funnel or enrolment-funnel stages later). Both render only
when their denominator is real and non-zero; an honest empty-state
message otherwise.

**v2 additions** (Imperial Design Authority Directive): `revenueBarChart()`
also paints a gradient area fill under the trend line (`<defs>`/
`linearGradient`, drawn before the bars so it sits behind them, not as
a wash on top). `collectionGauge()` is a semi-circular arc gauge — a
second read on the same collection-rate figure the funnel shows,
banded at the same Excellent/Good/Basic/Needs-Attention thresholds as
the onboarding wizard's completion score (reusing that convention
rather than inventing a new one). `sparkline()` and `trendArrow()` are
the two building blocks for "real short history, honestly labelled" —
**only** attach these to a figure that has an actual per-period series
behind it (e.g. `revenueByMonth`, which is *collected* revenue by
month); do not attach a sparkline from one series to a tile that
reports a different figure (a real bug caught in this pass: a
revenue-collected sparkline was briefly shown under the "Total
Invoiced" tile, which has no monthly breakdown in this schema — fixed
by removing the sparkline from that tile rather than fabricating an
"invoiced by month" series). `animateValue()` in the same file is a
generic count-up: it regex-parses a numeric core out of an already-
final, real string (`₦62,000,000`, `92%`, `320`) and animates only the
reveal, never the number itself; it no-ops to the plain string when
the shape isn't numeric or `prefers-reduced-motion` is set.

**Institutional Health Index**: a real, documented composite, not an
arbitrary label — the mean of average attendance % and collection
rate %, banded Excellent (≥85) / Strong (70–84) / Developing (50–69) /
Needs Attention (<50). If neither real input exists yet, the badge is
hidden entirely rather than shown with a fabricated score. See
`render()`'s health-index block in `js/portal-founder-dashboard.js` for
the exact computation.

**Ambient gold system**: existing low-opacity diagonal foil patterns
(`.exec-welcome::before`, `.id-card::before`) now drift slowly (18s,
`gold-foil-drift` keyframe) instead of sitting static, and the top
accent bar on `.exec-card`/`.pfd-section` sweeps a highlight across
itself over 20s (`gold-edge-sweep`) — both respect
`prefers-reduced-motion`. This is intentionally the *only* motion
added to gold; it should stay barely perceptible, never a flashing or
pulsing effect.

## Icons

Established convention (extend, don't replace): inline SVG,
`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`,
`stroke-width` 1.3–1.4, sized 17×17px inline (nav items) up to
38×38px for section intros (`.nmi-icon`). Never emoji, never an icon
font, never a raster image — this keeps icons crisp at any zoom level
and themeable via `currentColor` under both light and dark mode. When a
new module needs an icon with no existing precedent, draw it in this
same stroke-based line-icon style rather than sourcing a filled/
duotone icon from an external set — mixing styles is the fastest way
to make a site look assembled rather than designed.

## Animation

`.reveal` / `.is-visible` (IntersectionObserver-driven fade+rise on
scroll) is the one motion primitive in use sitewide. Respects
`html[data-pc-motion="reduced"]` (Personalisation Centre). New modules
should reuse this class rather than adding bespoke scroll-animation
JS — consistency here matters more than novelty.

## Portal light-shell + mobile pattern (Executive Design Directive)

The portal dashboards (`css/portal.css`) were re-balanced from a
navy-dominant page shell to a cream/white-dominant one, with navy/gold
reserved for framing (topbar border, card-header hairlines, table
headers) and for two deliberate "premium accent" surfaces that stay
solid navy on purpose: `.exec-welcome` (the per-page "Welcome Back"
banner) and `.id-card` (the Digital ID Card). Any new dashboard section
should default to the light card treatment (`.exec-card`/
`.portal-child-card`) and only go solid-navy if it's genuinely a
comparable "premium moment," not a routine data card.

`.exec-welcome` also carries the site's `.crest-watermark` asset at low
opacity via a dedicated `::after` (not the shared `.crest-watermark`
class — that class's own `::before` would collide with the one this
card already uses for its diagonal pattern). Reuse that `::after`
pattern, not the shared class, on any other solid-navy accent card.

A single `@media (max-width:640px)` block at the very end of
`css/portal.css` carries the mobile treatment for every dashboard
surface (reduced card padding, 2-column stat/ID-card-detail grids,
finance rows stacked instead of `flex-wrap`ped, 44px-minimum touch
targets on buttons). **It must stay the last rules in the file** —
CSS resolves equal-specificity rules by source order, so a media query
placed earlier than an unconditional rule of the same specificity
silently loses to it regardless of viewport width. (This was a real,
caught-in-verification bug during this pass: the mobile block was
briefly mid-file, before the `.finance-*` rules it targets, and every
mobile override was overridden right back by the unconditional rules
below it.) When adding a new mobile override, append it inside this
same block rather than opening a new `@media` earlier in the file.

## What's still open

This pass establishes tokens, documents existing conventions, and
(as of the Executive Design Directive pass) rebalances the portal
colour/typography/chart/mobile/watermark treatment described above. It
does **not** yet:
- Migrate the ~30 marketing pages with hardcoded heading sizes onto
  `--h2-size`/`--h3-size` (tracked since the Executive Refinement
  audit — the portal dashboards themselves now consistently use
  `--h3-size`/`--h4-size` for card and section titles).
- Build most of the 15 named infographic types a Chairman-level design
  review requested (Admissions Funnel, Attendance Heatmap, Academic
  Performance Heatmap, Scholarship Distribution Map, Teacher
  Performance Insights, Institutional Growth Timeline, etc.) — two were
  built as real, data-backed reference implementations (school-wide
  Hifz completion donut, fee collection funnel); the rest need their
  own real underlying data model before they can be built honestly
  rather than as decoration.
- Build interactive/expandable mobile card behaviour (swipe, expand/
  collapse) — the mobile pass so far is spacing, sizing, and touch
  targets, not new interaction patterns.
- Define standards for content types the site doesn't have yet
  (a governance/board portal, a course/lesson player) — those get
  their own addenda once each module is actually scoped and built, so
  this document doesn't get ahead of real decisions the way the rest
  of the site's copy deliberately doesn't.
- Use any commercial/proprietary display fonts (Canela, Recoleta,
  Editorial New, Neue Haas Grotesk, SF Pro, General Sans, etc.) that a
  later directive may request — these aren't legally embeddable on a
  public site without a license this project doesn't have. Cormorant
  Garamond (display serif) + Cinzel (labels) + Inter (data/body) stay
  the type system; a request to "upgrade typography" should be read as
  a request to use these tokens more confidently (size, weight,
  hierarchy), not as licence to add an unlicensed font file.
- Fabricate new campus photography, "holographic" security effects, or
  arbitrary composite scores. Real photography gets reused where it
  exists and left honestly absent where it doesn't (see Icons/Colour
  sections); "holographic" asks get built as a real CSS sheen/pattern
  effect and documented as such, not claimed as literal holography;
  and any new "health"/"score" figure must be a stated formula over
  real inputs (see the Institutional Health Index above), hidden
  entirely when its inputs don't exist yet, never invented.
