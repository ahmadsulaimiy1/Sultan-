# Sultan Hanafi Royal Schools — the institutional identity

One identity. Not a concept, not an option, not an exploration.

Built with `brand/identity.py` (the sheet) and `brand/word.py` (the Word
stationery, rendered from the same sheet so the two cannot drift).

---

## The signature — the Axis

The school teaches in two languages and it is **one school**. So the two
names are not stacked, and neither is a caption to the other: they meet
at a single vertical gold member, English running right-to-left toward
it, Arabic running left-to-right toward it. That member is the **Axis**.

The arms stand on it. Both measures — the 176 mm masthead and the 132 mm
text — are centred on it. Everything on the sheet is either on the Axis
or measured from it.

It is the only device the system has, and it is the only one it needs:

- It says something **true about this institution** that no other
  institution can say in the same way. It is not a shape borrowed from a
  template; it is the school's own bilingualism made structural.
- It **cannot be built in one language alone.** Remove either name and
  the Axis has nothing to hold.
- It is **one flat ink, one vertical rule.** It can be foiled, letter-
  pressed, engraved, embroidered, cast in brass, or typed — at any size,
  by anyone, anywhere, for almost nothing.
- **Fifteen-per-cent test:** a fragment showing two languages meeting at
  a gold vertical, with arms above it, is SHRS and nothing else.

## What this sheet deliberately does not do

No coffee masses. No ribbon. No gradient. No printed paper texture, no
vignette, no watermark, no microtext, no drop shadow on the arms, no
diagonal, no fold, no streaks, no icon badges.

Every one of those was present in an earlier revision, and every one was
removed against a **measured** fault. The audit that removed them is
`docs/letterhead-audit.md`, and it is kept in the repository precisely so
that nobody — including a future me — quietly puts them back.

## The governing numbers

| | This sheet | Why |
|---|---|---|
| Ink coverage | **5.4%** | Oxford ~5, Cambridge ~6, Aramco ~12. Above about 15% a school cannot afford to print ordinary correspondence on its own letterhead. It was 51.2%. |
| Left edges, flowed text | **1** | It was eleven, two of them half a millimetre apart. |
| Right edges, flowed text | **1** | It was fifteen. |
| Type sizes | **5** | One modular scale, ratio 1.25 from 10.5 pt. It was twelve, four of them inside a 0.7 pt band. |
| Smallest type anywhere | **6.7 pt** | Nothing below 6.5 pt on paper. |
| Smallest reversed type | **8.4 pt** | Reversed type below 7 pt fills in on any office laser and closes up entirely under offset dot gain. Four elements were below 6 pt. |
| Measure | **132 mm** | 72 characters. 45–75 is the readable range; it was 90. |
| Inks | **2** | Coffee `#2E1A0D` and one flat gold. A gradient gold bands in CMYK, goes green under dot gain, and as foil costs a separate pass on every sheet. |

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
- Masthead measure 176 mm, text measure 132 mm, both centred on the Axis.
- Arms 30 mm, on the Axis, 22 mm from the head.
- Foot band 16 mm, full bleed, with a gold hairline on its upper edge.
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
9. Both names share one centre line with the Axis.
10. Each language takes equal measure either side of the Axis.
11. Neither name breaks across lines.
12. Arabic presence ratio 1.15.
13. The arms carry no filter and no shadow.
14. No simulated texture, vignette or watermark is present in the DOM.
15. The five schools fit the masthead measure without truncation.
16. The foot band fits without truncation.
17. No footing sits past the foot of its page, on any sheet.
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
