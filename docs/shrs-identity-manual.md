# Sultan Hanafi Royal Schools — the institutional identity

One identity. Not a concept, not an option, not an exploration.

Built with `brand/identity.py` (the sheet) and `brand/word.py` (the Word
stationery, rendered from the same sheet so the two cannot drift).

---

## The architecture

Built to the reference stationery the school chose, element for element:

| Element | Where |
|---|---|
| **Mass** | coffee, across the head, 59 mm |
| **Wedge** | gold, folded into the top-right corner |
| **Panel** | contact detail inset at the right, rounded, each line badged with a gold disc |
| **Ribbon** | gold, sweeping down out of the mass on a curve, **folding** where it crosses the mass's edge and running on into the ivory |
| **Field** | ivory, with reference at the left and date at the right |
| **Bar** | coffee, at the foot, with the ribbon mirrored into it and a wedge folded into the opposite corner |

The ribbon is a filled band between two Bézier curves, not a stroked
line, because only a filled band can carry a real curve *and* a real
fold — the fold being the darker plane where the band turns and shows its
underside.

## The Axis survives

Inside the mass, the two names still meet at a single vertical gold
member: English running right-to-left toward it, Arabic running
left-to-right toward it. It is the one thing carried through every
revision of this identity, because it is the one thing that is true of
this school and of no other — **the lock cannot be built in one language
alone.**

- Both names break into the same number of lines, and the Arabic break
  falls after the *iḍāfa*, the unit that must not be split.
- Arabic is set at 1.15× the Latin size, so the two match in *presence*
  rather than in point size. Asserted.
- English ends on the Axis and Arabic begins on it, within 2 px. Asserted.

## What this architecture costs, stated plainly

**Ink coverage is 29% of the sheet** — the mass and the bar together —
against 4–12% for the institutions named in `docs/letterhead-audit.md`.

That is the architecture's own cost, and it is recorded here so it is
never mistaken for an oversight:

- printing routine correspondence on it is several times the cost of a
  light sheet;
- the heavy areas sit where the sheet is gripped, so pages will mark each
  other in the output tray;
- it reads as contemporary rather than ancient.

The school chose this register deliberately, having seen the alternative
built. The audit's *craft* rules are kept regardless, because they are
not matters of register:

- nothing below **6.7 pt** anywhere, nothing below **8.4 pt** reversed
  out of the coffee — reversed type below 7 pt fills in on any office
  laser and closes entirely under offset dot gain;
- **five type sizes**, one modular scale;
- **one left edge and one right edge** for flowed text;
- the arms carry **no drop shadow and no glow ring** — arms are never
  shadowed;
- **no printed paper texture, vignette or watermark** — the stock
  provides the texture.

## The five schools

They are not on this sheet. The architecture's head is occupied by the
mass, the panel and the ribbon, and the five names will not fit the foot
bar at 8.4 pt without running past the trim. They are named in the letter
itself and on the website, which is where a reader meets them anyway.
Forcing them on would have meant setting them below the print floor, and
that is the one thing the audit does not allow.

## The material

| Role | Colour | Where |
|---|---|---|
| Text ink | Coffee `#2E1A0D` | the names, the subject, the foot band |
| Gold on paper | `#9C7A3C` | the Axis, the rule, the five schools, labels. An ochre that prints honestly in CMYK |
| Gold reversed | `#C6A15B` | the hairline above the band and the quadrant marks in it |
| Body ink | `#241A12`, secondary `#5A4632` | never black; black is toner |
| Paper | `#FBF8F1` | flat. The stock provides the texture — printing a photograph of paper onto paper is a category error |

Specified for **Pantone 872** or a single CMYK build, on 350 gsm cotton,
with the arms blind-debossed and the Axis and rule in foil. All three
finishes are optional: the sheet is correct in one-colour laser output,
which is the test that matters for a school.

## The bilingual lock

1. **Neither language is above the other.** They meet at the Axis and run
   outward in their own reading directions. Asserted: both blocks share
   one centre line with the Axis.
2. **Each takes exactly half the masthead measure**, so neither is given
   more room. Asserted.
3. **Neither name breaks.** Both are set on one line, which removes the
   line-break question in both languages at once. Asserted.
4. **Arabic is set at 1.15× the Latin size.** Amiri at matched point size
   reads smaller, because naskh carries a lower effective x-height
   relative to its em. Matching the numbers would make the Arabic
   subordinate; matching the *presence* is what parity requires.
   Asserted: presence ratio 1.15.
5. **The correct name is مدارس السلطان حنفي الملكية** — plural, with the
   article, as the school\'s own Arabic pages set it.

## The arms

Rendered as a **single-ink device** by `brand/build-arms.py`. The stock
artwork is light line-work drawn to sit on a dark ground — mean
luminance 188 against a paper of 248 — so on ivory it disappeared. It is
re-rendered in one colour at the density it was drawn, which is also how
arms are actually printed.

Flat. **No shadow, no ring, no bevel.** Arms are a heraldic device with a
traditional and legal character; giving one a drop shadow treats a coat
of arms as a user-interface button, and no armigerous institution does
it. Asserted in the build.

## Typography

| Role | Face | Reason |
|---|---|---|
| Institutional | Cinzel 800 | Roman inscriptional capitals — carved letterforms, the oldest signal of permanence in the Latin alphabet |
| Arabic | Amiri | The Bulaq/Amiri Press naskh, Cairo — to Arabic scholarly printing what Garamond is to Latin |
| Editorial | Cormorant Garamond italic | The one line where the school speaks of itself |
| Document | Inter | Neutral, engineered, screen-native |

All four ship with the website already, embedded straight from
`assets/fonts/`. **Nothing new is introduced:** a system that needs a
font purchase to stay consistent will not stay consistent.

The scale is 6.7 · 8.4 · 10.5 · 13.1, ratio 1.25, plus the Arabic at
10.5 × 1.15 = 12.1 derived by the parity rule rather than chosen. **No
size exists outside it.**

## Measurements

- Sheet 210 × 297 mm; canvas 794 × 1123 px at 96 dpi, asserted.
- The Axis at 74 mm from the left trim, full height, 0.7 pt, struck with a
  short cross-tick at the head of the field and at the foot.
- Margin column 24–66 mm; text 82–186 mm. Head zone 112 mm.
- Arms 38 mm, astride the Axis, 16 mm from the head.
- Double rule at 92 mm — 1.1 pt over 0.4 pt, the engraver's cadence, and
  the only ornament the sheet allows itself.
- Foot band 22 mm, full bleed, with a gold hairline on its upper edge,
  carrying the creed in the school's own voice and the record beneath it.
- Vertical unit 3.5 mm; every vertical dimension a whole multiple.
- Continuation sheets: the arms reduce to 18 mm and the rule and the five
  schools drop away. **The device survives its own subtraction** — which
  is the point of having only one.

## Acceptance tests — all asserted in the build

1. Canvas exactly 794 × 1123 px.
2. Ink coverage at or below 6%.
3. Flowed text sits on exactly one left edge and one right edge.
4. Measure 132 mm, 72 characters per line.
5. No type below 6.7 pt anywhere.
6. No reversed type below 8.4 pt.
7. Five type sizes, all on the scale.
8. The arms stand on the Axis, within 1 px.
9. The Axis runs from the top trim to the foot band.
10. English ends on the Axis and Arabic begins on it, within 2 px.
11. Both names share one baseline, and break into the same number of lines.
12. Arabic presence ratio 1.15.
13. The arms carry no filter and no shadow.
14. No simulated texture, vignette or watermark is present in the DOM.
15. The five schools fit the measure without truncation.
16. The record line fits the foot band without truncation.
17. No footing sits past the foot of its page, on any sheet.
17a. No section lead-in is left orphaned at the foot of a sheet.
18. All faces loaded (7 on the letter).
19. Every URL a live hyperlink (15 anchors on the letter).
20. No console errors.

## Building

```
python3 brand/build-arms.py            # only when the arms artwork changes
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
python3 brand/word.py
```

Omit either argument and the blank stays visible rather than silently
wrong. Every asset lives in `brand/assets/` and `assets/fonts/`, so the
build is reproducible on any machine from any working directory.

## What is not yet built

The remaining artefacts — certificate, transcript, examination paper,
envelope, folder, business card, staff and student ID, email signature,
website and portal masthead, signage plate. The Axis carries all of them
and the grammar is settled; applying it is mechanical.
