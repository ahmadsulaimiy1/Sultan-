# Sultan Hanafi Royal Schools — the institutional identity

One identity. Not a concept, not an option, not an exploration.

Built with `brand/identity.py` (the sheet) and `brand/word.py` (the Word
stationery, rendered from the same sheet so the two cannot drift).

---

## The signature — the Sweep

**Every SHRS document is held between two masses of the same material,
each cut on the same angle, each with a gold ribbon riding the cut.**

The head mass carries the seal and the bilingual lock. The foot mass
carries the record. Between them lies an ivory field that is the
document's own voice and is never encroached on.

The two cuts are **parallel**: each rises 15.99 mm across the 210 mm
measure — 4.355° — and the build asserts they agree within 0.6 mm. The
head's ramp runs hot to the right; the foot's runs hot to the left. So
the two masses answer each other rather than repeat, and the sheet reads
as one object rather than a header and a footer that happen to share a
colour.

### Why this is the signature and not something else

- It is **a relationship, not a shape.** The crest could be redrawn and
  the identity would survive, because what identifies the school is the
  angle, the ramp and the ribbon — not what is drawn inside the mass.
- It is **parametric.** One angle and two depths produce the whole
  family. Nothing is redesigned per artefact.
- It **degrades gracefully.** Where a format cannot hold two masses (an
  ID card, a favicon, a signage plate) the two merge into one and the
  seal sits at the join. That is part of the grammar, not an exception.
- It passes the **fifteen-per-cent test.** A corner of any SHRS document
  shows a ramped mass cut on the house angle with a bevelled gold ribbon
  across it. That alone identifies the school.

## Depth is constructed, not filtered

A flat panel is what makes a sheet look printed rather than made. Five
constructions give the masses thickness, and every one of them survives
CMYK because none is an effect:

1. **The ramp.** Each mass is a gradient through four tones, not a fill.
2. **The chamfer.** The face is machined back before it meets the cut, so
   there is a lit lip and a fall-away beneath it. This is what tells the
   eye there is thickness.
3. **The bevelled ribbon.** Each ribbon is a real bar rotated to the cut
   angle — not a clipped polygon — so it carries a light edge on top, a
   dark edge underneath, and a specular sweep along its length. That is
   the difference between folded metal and a painted stripe.
4. **The fold.** The ribbon darkens where it turns behind the mass at the
   sheet edge.
5. **One light.** Everything is lit from the top left, and the assembly
   casts a single soft shadow onto the paper below it.

## The material — a ramp, not a colour

A single coffee brown was the earlier error: it flattened the hierarchy
and made every element equal.

| Role | Colour | Where |
|---|---|---|
| Ground | Deep Cocoa `#140A03` | the cold edge of every mass |
| Body | Coffee `#2E1A0D` | the mass's centre |
| Turn | Chestnut `#4E2116` | where the mass warms |
| Ember | Oxblood `#6E1F26` | approaching the hot end |
| Accent | Crimson `#7C1F2E` | the mass's hot end, the second ribbon, section lead-ins, the folio |
| Accent bright | `#A8455A` | the crimson ribbon's own highlight |
| Foil | Royal Gold `#C6A15B` → `#F6E9CE` | the ribbon and the axis |
| Field | Warm Ivory `#FBF7EF → #EDE3D2` | the paper, graded |
| Ink | `#241A12`, secondary `#5A4632` | never black; black is toner |

**The crimson is not invented for the stationery.** `#7C1F2E` and
`#A8455A` are `--crimson` and `--accent-bright` from `css/brand.css` —
already the site's accent livery. The sheet and the website are one
system, which is the only reason a second hue is admissible at all.

Hierarchy follows the ramp: the deepest tone carries weight, the hottest
carries attention, gold is reserved for the ribbon and the axis, and no
element takes a colour from outside it.

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
- Head mass 72 mm deep at the left edge falling to 34 mm at the right.
- Foot mass 56 mm, rising the other way on the same angle.
- Cut angle 4.355° on both, asserted parallel.
- Body inset 24 mm each side; ivory field from 78 mm to 241 mm.
- Continuation sheets: the head halves to 44 mm and the lock reduces, the
  ribbon assembly rises with it. **Same grammar, less ceremony.**

## Production

Designed for 350 gsm cotton, hot foil on the gold, blind deboss on the
chamfer, letterpress on the rules.

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
7. Head cut and foot cut parallel within 0.6 mm.
8. No ribbon touches the text on any sheet.
9. The office line clears the registry block.
10. The five houses fit the footing measure without truncation.
11. Every footing sits inside its page, every sheet.
12. All faces loaded (7 on the letter).
13. Every URL a live hyperlink (15 anchors on the letter).
14. No console errors.

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

- **The website.** The ramp is defined against `css/brand.css` tokens but
  the site still paints its surfaces flat. Carrying the ramp, the cut and
  the ribbon into the masthead, the portal chrome and the section heads
  is the next piece of work.
- **The remaining artefacts** — certificate, transcript, examination
  paper, envelope, folder, business card, staff and student ID, email
  signature, signage plate. The grammar is settled; applying it is
  mechanical.
