# Measuring contrast honestly

A note on how automated contrast checking failed on this site, seven distinct
ways, and what a reading has to survive before it is acted on.

This matters because it has already cost something real: a reading of 1.02:1 on
the kinetic ticker was believed, a light-edition colour block was written to
"fix" it, and brown text was shipped onto a brown band. The ticker's band is
dark espresso in *every* edition; there was nothing to fix. The revert and the
reason are still in `css/kinetic.css`, deliberately.

## The rule that came out of it

**No contrast finding is acted on until a screenshot of the settled element
agrees with it.** Not a computed style, not a sampled pixel — a picture of the
thing as a reader would see it. Every fix made on this branch was confirmed that
way first, and roughly two thirds of the tool's findings did not survive it.

## The seven faults of the tool, in the order they were found

1. **Stale rectangles.** The audit scrolled, measured and sampled inside one
   `evaluate()`. `scrollIntoView` honours smooth scrolling, so the rectangles
   were from before the scroll. Freeze the page, scroll, wait, *then* measure.

2. **Sampling through fixed chrome.** It cached each element's document-space
   top at scroll 0 and sampled at `top - scrollOffset`. Anything landing in the
   first ~64px of the viewport was sampled through the fixed topbar, which
   reported the topbar's dark gradient as the element's background — a cream
   footer came back at 1.01:1. Re-read rectangles live after each scroll.

3. **Accepting an ancestor as the hit.** The overlap guard allowed
   `hit.contains(e)` — "the topmost thing here is my element's parent, close
   enough". It is not: when the sample point misses the element's own line box,
   the pixel belongs to the ancestor, and if that ancestor carries a background
   image the reading is a pixel of photograph.

4. **Sampling a glyph instead of the ground.** One pixel at the element's centre
   lands on a letter as often as on the background, and the transparent-text
   stage cannot be relied on — some text survives it, and Chromium's subpixel
   antialiasing leaves blue and green fringes on glyph edges regardless. A
   cream-on-near-black ribbon was read as cream on `rgb(101,166,185)`, which is
   the colour of an antialiasing fringe and appears nowhere on the page. Take
   the modal colour over a grid instead: glyphs are a minority of the pixels.

5. **Sampling the corners of a circle.** A `border-radius:50%` element does not
   occupy its own bounding box. On a 27px disc the dark corners outvoted the
   gold. Inset the grid to the central 56%.

6. **Confusing hit-testing with painting.** A floating control with
   `pointer-events:none` is invisible to `elementFromPoint` and perfectly
   visible in a screenshot. Anything fixed or sticky that *overlaps* the box is
   disqualifying, whether or not it can be clicked.

7. **Measuring elements mid-reveal.** The bottom of the viewport is exactly
   where reveal-driven elements are caught part-way through their transition. A
   timeline disc 27px above the fold was sampled before its gold arrived and
   reported at 1.21:1 in two editions; settled, it measures about 11:1. Require
   candidates to be comfortably inside the viewport.

## What the tool is for

Screening, not judgement. It narrows 600 elements a page to a handful worth
looking at. Every one of this branch's real findings — the auth brand panel at
1.71:1, the at-a-glance eyebrow at 4.05:1 — was a candidate it raised and a
screenshot confirmed. So were all the ones that were wrong.

## The eighth fault, which the tool cannot have

**A ratio that passes is not a ground that was intended.**

Every colour in the portal's colophon measured correctly. Forty lines of
`css/portal-chrome.css` existed to make sure of it: the school's name had once
been `#FFF6DF` on `#F1E7D5` — 1.06:1, the same colour to within a rounding
error — and the fix restated every value of the colophon a second time, for
cream, honestly and against painted pixels. After it, the sweep was clean.

The cream was an accident. `html[data-pc-theme="light"] footer` in
`css/prestige.css` is a TAG selector written for the marketing footer, which
really does turn pearl in the Clear edition. It also caught `.pch-foot`, the
colophon built on all sixty-eight portal pages, whose masthead is espresso in
every edition. So a dashboard opened espresso at the top and ended cream at the
bottom — the page changing materials halfway down — and this file's answer had
been to make the second material legible rather than to ask why there were two.

Nothing about it read as broken. It looked cheap, and a contrast audit cannot
see cheap. What found it was building two new components on top of that ground
and watching them arrive pale-on-cream: the fault only became visible when
something arrived that had not been taught to compensate for it.

So, alongside "no contrast finding is acted on until a screenshot agrees with
it":

> **When a component needs its colours stated twice, ask which of the two
> grounds it was supposed to have.** Sometimes the answer is both — the
> marketing pages really do change edition. Sometimes a tag selector reached
> somewhere it was never meant to, and the second set of colours is forty lines
> of evidence that nobody asked.

The same session found four ordinary instances of the edition-blind pattern —
the wordmark's clipped gradient, the edition switch's `var(--portal-card)`, the
crest's `screen`-blended foil sweep, the footer watermark sized for a footer a
quarter as tall. Those are the usual kind: a value stated for the ground the
component was born on. This one is worse, because the compensation for it
passed every test that exists.
