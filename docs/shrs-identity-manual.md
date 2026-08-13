# Sultan Hanafi Royal Schools — the institutional identity

One identity. Not a concept, not an option, not an exploration.

Built with `brand/identity.py` (the sheet) and `brand/word.py` (the Word
stationery, rendered from the same sheet so the two cannot drift).

---

## The signature — the Crossing

**Every SHRS document is built from two elements at two different angles,
and it is their crossing that identifies the school.**

- **The mass** — full bleed at the top, its lower boundary a shallow curve
  that eases up to the right, so the sheet's weight sits under the seal
  where the seal needs a dark ground. Its slope is about 2°.
- **The ribbon** — a bolder diagonal at nearly four times that slope. It
  begins *inside* the mass at the right and slides out onto the ivory as
  it travels left.

Because the two slopes differ, the ribbon **crosses** the mass boundary
rather than tracing it, and appears to emerge from beneath the mass.
That crossing is the signature, and it is the reason the shape cannot be
mistaken for a rectangle with a corner cut off.

The foot is the same construction rotated by half a turn: the mass is
deep at the right, the ribbon emerges travelling the other way. Head and
foot therefore answer each other rather than repeat.

Both bands are drawn in **SVG**, not built from clip-paths. A curve that
has to meet a ribbon at a second angle is a drawing, and it needs
Bézier control, stroked bands that follow the curve at constant width,
and a real blur for the shadow. None of that survives a polygon.

### Why this is the signature and not something else

- It is **a relationship, not a shape.** The crest could be redrawn and
  the identity would survive, because what identifies the school is the
  crossing of two angles — not what is drawn inside the mass.
- It is **parametric.** Two slopes and two depths produce the whole
  family. Nothing is redesigned per artefact.
- It **degrades gracefully.** Where a format cannot hold two bands (an ID
  card, a favicon, a signage plate) the two merge into one and the seal
  sits at the join. That is part of the grammar, not an exception.
- It passes the **fifteen-per-cent test.** A corner of any SHRS document
  shows a coffee mass with a bevelled gold ribbon crossing its boundary
  at a steeper angle. That alone identifies the school.

## Depth is constructed, not filtered

A flat panel is what makes a sheet look printed rather than made. Four
constructions give the bands thickness, and none is an effect, so all
four survive CMYK:

1. **The mass is ramped**, cocoa through coffee to chestnut — tonal range
   inside one hue, never a second hue.
2. **The chamfer.** The mass's face is machined back before it meets its
   boundary, so there is a lit lip and a fall-away beneath it. This is
   what tells the eye there is thickness.
3. **The bevelled ribbon.** A lit edge above, a dark edge beneath, and a
   specular sweep along its length — the difference between folded metal
   and a painted stripe. The band darkens at both ends where it turns
   away under the sheet edge.
4. **One light, one shadow.** Everything is lit from above, and the
   ribbon assembly casts a single blurred shadow onto the paper.

## The material

A single flat coffee was one error; a crimson wash across the masses was
the opposite one. What the sheet actually needs is **tonal range inside
one hue**.

| Role | Colour | Where |
|---|---|---|
| Ground | Deep Cocoa `#140A03` | the cold edge of each mass |
| Body | Coffee `#2E1A0D` | the mass's centre |
| Warm | Chestnut `#43220F` | the mass's warm end |
| Close | Cocoa `#241509` | the far edge |
| Foil | Royal Gold `#C6A15B` → `#F6E9CE` | the ribbon, the axis, the small caps |
| Antique | `#9C7A3C` | the second band, and labels on paper |
| Field | Warm Ivory `#FBF7EF → #EDE3D2` | the paper, graded |
| Ink | `#241A12`, secondary `#5A4632` | never black; black is toner |

**No hue outside the warm axis.** A single off-axis colour on a document
with a warm anchor reads as an accident or a sub-brand. Where the five
schools must be distinguished, they are distinguished *tonally*.

**Cotton rag** at 26% multiply, **vignette** at the extremes, and a
**ghost crest** at 3% off the right edge. All three below conscious
notice, above the threshold of feeling.

## The bilingual lock

Arabic and English are **one identity, not two languages set side by
side.** Three rules make that structural rather than sentimental:

1. **Neither language is above the other.** They meet at a shared
   vertical gold member and each runs outward in its own reading
   direction — English flush right against the axis, Arabic flush left.
   The build asserts that both blocks share one centre line with the
   axis, and that the measure either side of the axis is equal.
2. **The name breaks at the same place in both languages** — two lines
   each — so the two blocks are of one build, and the lock cannot be
   assembled in one language alone.
3. **Arabic is set at 1.15× the Latin size.** Amiri at matched point size
   reads smaller, because naskh carries a lower effective x-height
   relative to its em. Matching the numbers would have made the Arabic
   subordinate; matching the *presence* is what parity actually requires.
   Asserted: presence ratio 1.15.
4. **The correct name is مدارس السلطان حنفي الملكية** — plural, with the
   article, as the school's own Arabic pages set it. The singular names
   one school; this house has five.

## Typography

| Role | Face | Reason |
|---|---|---|
| Institutional | Cinzel 800 | Roman inscriptional capitals — carved letterforms, the oldest signal of permanence in the Latin alphabet |
| Arabic | Amiri | The Bulaq/Amiri Press naskh, Cairo — to Arabic scholarly printing what Garamond is to Latin |
| Editorial | Cormorant Garamond italic | The one voice where the school speaks of itself |
| Document | Inter | Neutral, engineered, screen-native — carries the modern half without shouting |

All four already ship with the website, and `identity.py` embeds them
straight from `assets/fonts/`. **Nothing new is introduced:** a system
that needs a font purchase to stay consistent will not stay consistent.

## Grammar of the quadrant

The crest carries four quadrants. Abstracted to a **2×2 gold mark**, it
becomes the system's only punctuation — separating the five houses and
the three clauses of the creed. It is heraldically derived, so it is
defensible: it came from the school's own arms, not from a font.

## Measurements

- Sheet 210 × 297 mm; canvas 794 × 1123 px at 96 dpi, asserted.
- Head band 78 mm; its mass 48.6 mm deep at the left, 40 mm at the right.
- Foot band 70 mm; its mass deep at the right, on the mirrored curve.
- Mass slope ≈ 2°; ribbon slope ≈ 7.6°. The difference is the point.
- Body inset 24 mm each side; ivory field from 80 mm to 227 mm.
- Continuation sheets: the same drawing compressed to 52 mm, so the
  ribbon's slope eases with it. **Same construction, less ceremony.**

## Production

Designed for 350 gsm cotton, hot foil on the gold, blind deboss on the
mass's chamfer, letterpress on the rules.

- Gold is specified so it prints correctly **both** ways: warm ochre in
  CMYK, true metallic in Pantone 871/872 or foil. A system that is right
  in one and disappointing in the other is not finished.
- The masses are the only heavy coverage, and they sit at head and foot
  where a sheet is gripped — the areas least likely to show roller marks.
- Microtext in the footing is a genuine authenticity mark, not an
  ornament, and it is the element that most rewards 2400 dpi.

## Acceptance tests — all asserted in the build

1. Canvas exactly 794 × 1123 px.
2. The head mass bleeds to the top-left corner.
3. Neither wordmark block wraps, in either language.
4. Both language blocks share one centre line with the gold axis.
5. Equal measure either side of the axis.
6. Arabic presence ratio 1.15.
7. Both bands are drawn on every sheet.
8. The head band clears the body text on every sheet.
9. The bilingual lock sits on the mass, never past its boundary.
10. The footing's text clears the ribbon crossing above it.
11. The office line clears the registry block.
12. The five houses fit the footing measure without truncation.
13. Every footing sits inside its page, every sheet.
14. All faces loaded (7 on the letter).
15. Every URL a live hyperlink (15 anchors on the letter).
16. No console errors.

## Building

```
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
python3 brand/word.py          # after re-rendering the bands
```

Omit both arguments and the blanks stay visible rather than silently
wrong. Every asset the generator needs lives in `brand/assets/` and
`assets/fonts/`, so the build is reproducible on any machine.

## What is not yet built

Two things, in order:

- **The website.** Carrying the crossing — the mass, its curve and the
  ribbon at its second angle — into the masthead, the portal chrome and
  the section heads is the next piece of work.
- **The remaining artefacts** — certificate, transcript, examination
  paper, envelope, folder, business card, staff and student ID, email
  signature, signage plate. The grammar is settled; applying it is
  mechanical.
