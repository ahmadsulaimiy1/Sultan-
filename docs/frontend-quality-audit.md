# Front-end quality — how it is measured

Every claim in this document was measured in a real browser against the
built site. None of it is judgement, and none of it should be taken on
trust: the harnesses are described here precisely so anyone can re-run
them and disagree with a number rather than with an opinion.

## Why measurement, and not review

The letterhead audit (`docs/letterhead-audit.md`) established the habit:
a previous revision was described as "clean" and measured at 51.2% ink
coverage with eleven left edges. Looking is not measuring. The same rule
applies to the site.

## The one trap worth knowing about

**Do not compute contrast by walking the DOM for an ancestor background.**

The obvious method — read `color`, climb the tree for the first opaque
`background-color`, compute the ratio — reports **eighteen failures on
the homepage that do not exist**. Hero type sits on photography, on
gradients, and on `::before` overlays, none of which appear as a
`background-color` anywhere in the ancestor chain. The walk sails past
them, finds white on `body`, and declares white-on-white at 1:1.

Measure contrast over artwork from **painted pixels** instead:

1. Render the page and let `document.fonts.ready` settle.
2. Record each text element's bounding box and computed colour.
3. Set `visibility:hidden` on the text **only** — the ground beneath it
   stays exactly as painted.
4. Screenshot, and sample the pixels inside each recorded box.
5. Take the worst case: the ratio against both the lightest and the
   darkest pixel the glyphs actually sit on.

Measured this way, every hero element passes comfortably:

| Page | Element | Ratio | Required |
|---|---|---|---|
| `/` | masthead, 54.4 px | **14.86** | 3 |
| `/` | subline, 25 px | **9.31** | 3 |
| `/` | lede, 17 px | **13.66** | 4.5 |
| `/about/` | title, 73.6 px | **18.04** | 3 |
| `/about/` | subtitle, 25.6 px | **15.62** | 3 |
| `/ar/` | lede, 17 px | **9.82** | 4.5 |

The DOM walk is still useful for text on flat colour, where it has no
artwork to be fooled by. That is how the one genuine failure was found:
`.at-ref` at **1.22:1**, dark on dark, described below.

## What was found and fixed

| Finding | Measured | Now |
|---|---|---|
| `.at-ref` inherited its band's ink while carrying its own dark chip | 1.22:1 | 11.44:1 |
| Heading outline skipped a level (`h2` → `h4`) | 5 skips across 6 pages | 0 |
| Search and assistant fields had no accessible name | 2 controls | 0 unlabelled, in 4 languages |
| Search box hard-coded English despite existing translation keys | yo, fr | reads their own language |
| `fonts.gstatic.com` never preconnected | 224 pages | both hints on all 224 |

## The heading rule this establishes

**Semantics lead; presentation follows.** The outline broke because CSS
styled card titles by tag name — `.flow-stage h4`, `.dc-tile h4`,
`.pr-tl-item h4` — which silently fixed the markup at a level the
document did not want. Those selectors now read `:is(h3,h4)`, so a
component can carry whichever level its position requires and still look
like itself.

When adding a component, style its heading by class or accept both
levels. Never write a selector that forces an author to break the outline
to get the right size.

## Re-running the audits

The harnesses live outside the repository because they are diagnostic,
not shipped. Each takes a list of paths and needs the built site served
locally:

```
python3 -m http.server 8765     # from the repository root
```

- **Structure and naming** — images without `alt`, controls with no
  accessible name, heading skips, `h1` count, duplicate `id`s, horizontal
  overflow, console errors.
- **Contrast on flat colour** — grouped by the colour pair and the class
  that carries it, so a fix lands in one rule rather than on 200
  elements.
- **Contrast over artwork** — the painted-pixel method above.

## Known limits

- The sandbox this was measured in cannot reach `shroyalschools.com`
  (HTTP 000, the egress proxy refuses the host), so every figure comes
  from the built site served locally. The GitHub Actions runner can reach
  the live site and reports what it is serving on every deploy.
- 100–200 elements per page compute below 12 px. That is a deliberate
  label convention, not a defect, and it is not counted as one — but it
  is worth re-examining whenever the type scale is next revised.
- The Personalisation Centre is still untranslated for Yorùbá and French
  (36 pages each). It is 614 lines of hard-coded English with no
  translation tokens at all, so the work is to tokenise it first and then
  have a person translate it. Machine-translating it would be worse than
  leaving it: this school's Yorùbá is read by people who will notice.
