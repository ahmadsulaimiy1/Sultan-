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

No charting library exists in this codebase yet (it's a dependency-
free static site + Cloudflare Pages Functions — no bundler pushing
back on adding one, but also no precedent for one). Recommendation for
whoever builds the first real chart module: hand-rolled inline SVG bar/
line charts (a handful of `<rect>`/`<path>` elements driven by the same
data the `.exec-stat` cards already fetch) over a JS charting library —
consistent with this codebase's "no build step, no new dependencies
unless truly needed" architecture. Use the new `--chart-1` through
`--chart-6` tokens for series colour, in that order, so every chart
across every dashboard shares one palette instead of each page picking
its own.

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

## What's still open

This pass establishes tokens and documents existing conventions. It
does **not** yet:
- Migrate the ~30 pages with hardcoded heading sizes onto `--h2-size`/
  `--h3-size` (tracked since the Executive Refinement audit).
- Build the first chart component (no real trend data existed to chart
  until this session's Marketplace/Qur'an work — Founder Dashboard
  stats are real counts, not yet time-series).
- Define standards for content types the site doesn't have yet
  (a governance/board portal, a course/lesson player, an ID card
  template) — those get their own addenda once each module is actually
  scoped and built, so this document doesn't get ahead of real
  decisions the way the rest of the site's copy deliberately doesn't.
