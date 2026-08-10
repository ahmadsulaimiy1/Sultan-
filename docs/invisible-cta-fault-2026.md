# The invisible call-to-action fault — full record

Fixed in `css/prestige.css` (commit b4d91cb7). This file records the true blast
radius, which was measured after that commit was written and is larger than its
message states.

## The fault

    .pr-cta h2, .pr-cta p, .pr-cta-row { opacity:0; transform:translateY(14px) }

A comma ends a selector. The first two are scoped to a `.pr-cta` section; the
third was not, so it hid **every** `.pr-cta-row` on the site. The only rule that
restores one is `.pr-cta.pr-in .pr-cta-row`. Any row outside a `.pr-cta` section
was therefore set to `opacity:0` and never set back — holding its full height,
answering `getBoundingClientRect` with real numbers, and painting nothing.

## What was invisible, measured across all 220 pages

17 rows on 14 pages, in all four languages:

| Page | Buttons that never painted |
|---|---|
| `/admission/` · `/fr/` · `/yo/` | Register / Login · the application buttons |
| `/academics/` · `/fr/` · `/yo/` | Ask the Registrar's Office · Verify a Credential |
| `/contact/` · `/ar/` · `/fr/` · `/yo/` | Open the Campus in Maps · **Arrange a Visit** |
| `/digital-campus/` · `/ar/` · `/fr/` · `/yo/` | Verify a Document · The Institution's Direction · How Your Data Is Governed (two rows each) |

The Contact page's "Arrange a Visit" is the worst of them: booking a campus
visit is the single thing that page exists to do, and the button had not been
visible to anyone using ordinary motion settings.

## Why it survived

The `prefers-reduced-motion` block carries the same missing ancestor, where the
effect is `opacity:1 !important`. Anyone testing with reduced motion turned on
saw every button exactly as designed. Everyone else saw none of them.

## Verified after the fix

All 17 rows on all 14 pages paint at opacity 1 after a human-paced scroll,
checked in every language.
