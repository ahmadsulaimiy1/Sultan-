# The heading outline: what was fixed, and what was deliberately not

## Fixed

**The footer, on every page.** Its five column headings were `<h5>` with no
`h3` or `h4` above them anywhere, so on any page ending in an `h2` or `h3` the
outline jumped two or three levels into the footer and implied nesting that
does not exist. Now `<h2>` — which is what they are — with the styling moved to
follow the tag, so they render identically.

**The policy register.** The 25 policy names were bare `<button>`s inside an
accordion: not navigable by heading, and the outline fell from the category
`h3` straight to the `h5` sections inside each policy. Each is wrapped in an
`h4` now, the ARIA accordion convention, which both supplies the missing level
and makes every instrument jumpable.

Together these took the pages carrying a level skip from **145 to 88**.

## Deliberately not fixed

88 pages remain, and they reduce to **34 source pages with one shape**: an
`<h1>` page title followed by sections at `<h3>`, with no `<h2>` anywhere. The
obvious fix is to shift the subtree — h3→h2, h4→h3, h5→h4.

It was investigated properly and rejected. The reason is specific:

- **131 selectors across the stylesheets target `h3`, `h4` or `h5` by tag** —
  `.school-block h3`, `.ic-body h3`, `.mvv-card h3`, `.ap-rev-block h4`, and so
  on. Promoting the tag silently drops every one of them that is not also
  rewritten.
- The failure mode is a heading that quietly loses its styling. That is the
  same class of fault this review spent its time hunting: something that breaks
  without anything looking broken.
- The visual difference is not subtle. A bare `h3` on these pages renders at
  27.2px Cinzel; a bare `h2` renders at 35.2px Cormorant Garamond with
  different margins. Sixty-eight headings across thirty-four pages would move.

**The trade is bad.** A skipped heading level is a WCAG *advisory* technique
(H42), not a level-AA failure: the headings are all present, correctly ordered
and individually announced, and a screen-reader user can still navigate the
page by them. What is risked in exchange is visible damage to thirty-four
content pages — which is the opposite of what this work is for.

## What would make it worth doing

Rewriting the 131 tag-scoped selectors to be level-agnostic — targeting a
section-heading class rather than a tag — so that the level becomes a purely
structural choice and can be set correctly without touching appearance at all.
That is a stylesheet refactor with its own review, not a find-and-replace, and
it should be done as one deliberate piece of work rather than folded into
something else.

The method for doing it safely is already proven in this repository: snapshot
every heading's computed appearance across the affected pages, make the change,
re-snapshot, and require the diff to be empty.
