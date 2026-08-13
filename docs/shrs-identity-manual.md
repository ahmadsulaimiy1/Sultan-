# Sultan Hanafi Royal Schools — the institutional identity

One identity. Not a concept, not an option, not an exploration.

Built with `brand/identity.py`. Rendered to `brand/letterhead.pdf` and
`brand/letter-registrar-activation.pdf`.

---

## The signature — the Counterweight

**Every SHRS document is held between two masses of the same coffee
material.**

A **cartouche** at the head, bleeding off the top and left edges,
bearing the seal and the bilingual lock. A **footing** at the base,
running the full measure, bearing the record. Between them, an ivory
field that is the document's own voice and is never encroached on.

The cartouche is taller and denser. The footing is shallower and wider,
so its **area is the greater** — 80,993 px² against 18,454 px², a ratio
of about 4.4 : 1, asserted in the build tests. The head therefore reads
as authority and the foot as weight.

That relation is not an aesthetic preference. It is a statement about
this institution specifically: SHRS's real distinction is that every
document it issues is verifiable, so **the record is what the document
rests on**. The identity says so structurally, before a word is read.

### Why this is the signature and not something else

- It is **a relationship, not a shape.** The crest could be redrawn in
  2050 and the identity would survive, because what identifies the
  school is where the masses sit and how they relate, not what is drawn
  inside them.
- It is **parametric.** One number — the depth of each mass — produces
  the whole family. Nothing is redesigned per artefact.
- It **degrades gracefully.** Where a format cannot hold two masses (ID
  card, favicon, signage plate, email signature) the two merge into one
  and the seal sits at the join. That is part of the grammar, not an
  exception to it.
- It passes the **fifteen-per-cent test.** A corner of any SHRS document
  shows either a coffee cartouche with a seal bleeding off two edges, or
  a coffee footing carrying gold microtext. Either identifies the school
  alone.

## The bilingual lock

Arabic and English are **one identity, not two languages set side by
side.** Three rules make that structural rather than sentimental:

1. **The gold rule between them is dimensioned by whichever language
   runs longer.** The lock therefore *cannot be constructed in English
   alone* — a true statement about this school turned into a
   construction rule. Asserted in the build: rule width matches
   `max(english, arabic)` within 2px.
2. **Arabic is set at 1.15× the Latin size.** Amiri at matched point
   size reads smaller, because naskh carries a lower effective x-height
   relative to its em. Matching the numbers would have made the Arabic
   subordinate; matching the *presence* is what parity actually
   requires. Asserted: presence ratio 1.15.
3. **The correct name is مدارس السلطان حنفي الملكية** — plural, with the
   article, as the school's own Arabic pages set it. The singular names
   one school; this house has five.

## The material

| | |
|---|---|
| Coffee | `#2B1A0E → #1C1006 → #150B03`, used as **mass**, never as text ink |
| Royal gold | `#C6A15B`; as foil, a five-stop gradient through the letterform |
| Antique gold | `#9C7A3C` for small caps on paper |
| Warm ivory | `#FBF7EF → #F5EEE1 → #EDE3D2`, graded — paper lightens where light falls |
| Ink | `#241A12`, secondary `#5A4632`. Never black; black is toner |

Coffee is a **material**, not a colour. Brown text on cream paper is a
colour choice; a solid coffee field the seal sits on is a material one.
That is the difference between a school that prints in brown and a
school whose documents are coffee-and-gold objects.

**Cotton rag** at 26% multiply, **vignette** at the extremes, and a
**ghost crest** at 3% off the right edge. All three below conscious
notice, above the threshold of feeling.

## Typography

| Role | Face | Reason |
|---|---|---|
| Institutional | Cinzel 800 | Roman inscriptional capitals — carved letterforms, the oldest signal of permanence in the Latin alphabet |
| Arabic | Amiri | The Bulaq/Amiri Press naskh, Cairo — to Arabic scholarly printing what Garamond is to Latin |
| Editorial | Cormorant Garamond italic | The one voice where the school speaks of itself |
| Document | Inter | Neutral, engineered, screen-native — carries the modern half without shouting |

All four already ship with the website. **Nothing new is introduced:** a
system that needs a font purchase to stay consistent will not stay
consistent.

## Grammar of the quadrant

The crest carries four quadrants. Abstracted to a **2×2 gold mark**, it
becomes the system's only punctuation — separating the five houses and
the three clauses of the creed. It is heraldically derived, so it is
defensible: it came from the school's own arms, not from a font.

## Measurements

- Sheet 210 × 297 mm; canvas 794 × 1123 px at 96 dpi, asserted.
- Cartouche 34 × 38 mm, bleeding to 0,0.
- Footing 27 mm deep, full measure.
- Body inset 34 mm left (the cartouche's own width, so the page has one
  left axis), 22 mm right.
- Vertical unit 3.2 mm; every gap a whole multiple.
- Continuation sheets: cartouche halves to 22 mm, lock reduces, the
  houses line and seat drop. **Same grammar, less ceremony.**

## Production

Designed for 350 gsm cotton, hot foil on the gold, blind deboss on the
cartouche edge, letterpress on the rules.

- Gold is specified so it prints correctly **both** ways: warm ochre in
  CMYK, true metallic in Pantone 871/872 or foil. A system that is right
  in one and disappointing in the other is not finished.
- The coffee masses are the only heavy coverage, and they are placed at
  the head and foot where a sheet is gripped — the areas least likely to
  show roller marks.
- Microtext in the footing is a genuine authenticity mark, not an
  ornament, and it is the element that most rewards 2400 dpi.

## Acceptance tests — all asserted in the build

1. Canvas exactly 794 × 1123 px.
2. Cartouche bleeds to the top-left corner.
3. Wordmark never wraps.
4. Gold rule matches the longer language within 2px.
5. Arabic presence ratio 1.15.
6. Footing area exceeds cartouche area.
7. Every footing sits inside its page, every sheet.
8. All faces loaded (7 on the letter).
9. Every URL a live hyperlink (15 anchors on the letter).
10. No console errors.

## Building

```
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
```

Omit both and the blanks stay visible rather than silently wrong.

## What is not yet built

The full artefact set — certificate, transcript, examination paper,
envelope, folder, business card, staff and student ID, email signature,
website and portal header, signage plate — extends this same grammar and
is stage four. The grammar is settled; applying it is mechanical.
