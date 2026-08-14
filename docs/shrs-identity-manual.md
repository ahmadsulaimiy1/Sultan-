# Sultan Hanafi Royal Schools — the institutional identity

Built with `brand/identity.py` (the sheet), `brand/build-arms.py` (the
single-ink arms) and `brand/word.py` (the Word stationery, rendered from
the same sheet so the two cannot drift).

---

## The architecture

| Element | What it does |
|---|---|
| **Rail** | burgundy, down the left edge, **full height**, carrying the school's name turned on its side. The spine that ties masthead to foot, unbroken. |
| **Mass** | burgundy, across the head, **stopping two-thirds across** and cut back at its lower-right corner |
| **Place** | the place of issue — Ikorodu, Lagos State, Federal Republic of Nigeria — set on the cream beyond the mass |
| **Medallion** | a cream disc with a gold ring and the arms, **straddling the mass's right edge**: half on ink, half on paper |
| **Strip** | the five schools and the year of founding, over a gold rule and a line of **microtext** |
| **Field** | the letter |
| **Foot** | cut on a shallow diagonal — the creed on the cream above it, the record badged on the burgundy below, then the governance line |

The medallion straddling the edge is the piece that does the most work: it
is the only element that belongs to both the ink and the paper, and it is
what stops the head reading as a band with a logo on it.

## The metal

Flat gold is what made the earlier sheets look printed rather than made.
Real foil carries three things at once, and it is those — not the colour —
that read as metal:

1. a **specular band** running along its length, from bronze through gold
   to a near-white highlight and back;
2. a **lit edge** on top and a **shadowed edge** beneath, so the bar sits
   proud of what it lies on;
3. a **shadow cast** on the plate below it.

Every gold member on the sheet carries all three: the bar under the head
frame, the panel's leading edge, the rail's diamond markers, the bar at
the foot's lip, and the medallion's rim.

## The plates

The dark areas are not fills. Each is a **plate**: struck on an eight-fold
girih ground at 8.5% opacity, glazed with one raking reflection and one
corner bloom, lit along its upper lip, shadowed along its foot, and
casting a shadow on the cream beneath.

The ground is deliberately below the threshold of reading. At full
strength it competed with the contact detail set on it, and the measured
contrast fell to 4.35 : 1. **Every reversed run on this sheet is now
measured off painted pixels** — not computed styles — and the worst is
6.78 : 1.

| Run | Contrast |
|---|---|
| Panel contact lines | 10.25 : 1 |
| Footing labels | 6.78 : 1 |
| Footing values | 9.80 : 1 |
| Governance strip | 7.41 : 1 |
| Rail, on cream | 6.91 : 1 |

## The medallion

Struck, not printed: a metal rim with its own bevel, an inner cream field
with an inset shadow so it sits below the rim, the arms engraved into it,
and a single specular arc across the upper left. The arc is the one thing
that says struck rather than printed.

## What the school has not supplied does not appear

An earlier revision carried **"RC: 1402529"** in the governance strip.
That number was invented. It had no source, and a company registration
number on a school's letterhead is a statement of record, not an
ornament. It has been removed, and no identifier — registration, licence,
accreditation or examination-body number — will appear on this stationery
unless the school supplies it.

## A note on production

The metal treatment is specified for **screen and PDF**. In print the
gold members are a **foil pass** or a single flat Pantone; the specular
band is what the foil does by itself under a light, so it is not printed
as artwork. The girih ground prints as a 6% tint of the gold. The
`.docx` carries the rendered ground as an image, so it matches whatever
the PDF shows.

## The arms

Rendered as **single-ink devices** by `brand/build-arms.py`, in three
inks — gold for the medallion, burgundy for cream grounds, coffee for the
earlier palette. The stock artwork is light line-work drawn to sit on a
dark ground, so on cream it disappears; it is re-rendered in one colour at
the density it was drawn, which is also how arms are actually printed.

Flat. **No shadow, no bevel.** Arms are a heraldic device, not a button.

## Typography

| Role | Face |
|---|---|
| Institutional | Cinzel 800 — Roman inscriptional capitals |
| Arabic | Amiri — the Bulaq/Amiri Press naskh |
| Editorial | Cormorant Garamond italic, for the creed |
| Document | Inter |

Scale: 6.3 · 6.6 · 8.2 · 10.4 · 12.6, with the Arabic derived at 0.92× the
Latin name so the two match in presence. **Nothing below 6.3 pt anywhere,
nothing below 6.6 pt reversed** out of the burgundy — reversed type below
that fills in on any office laser and closes entirely under offset dot
gain.

## Measurements

- Sheet 210 × 297 mm; canvas 794 × 1123 px at 96 dpi, asserted.
- Rail 7.5 mm, full height, struck with a gold tick 14 mm from each trim.
- Mass 138 mm wide × 33 mm deep, cut back at the lower-right corner.
- Medallion 28 mm, centred on the mass's right edge.
- Furniture inset 16.5 mm; the field inset further, to 34 mm left and
  30 mm right.
- Foot 44 mm, its burgundy cut on a shallow diagonal.

## Where this sheet departs from the audit, and why

`docs/letterhead-audit.md` sets thresholds that were measured, not felt.
This architecture keeps all of them but one, and the exception is
recorded rather than hidden:

| | Audit | This sheet | |
|---|---|---|---|
| Ink coverage | ≤ 15% | **23%** | the rail, mass and foot together. The architecture's own cost. |
| Type below print floor | 0 | **0** | 6.3 pt on paper, 6.6 pt reversed |
| Type sizes | 5–6 | **6** | one scale, plus the derived Arabic |
| Characters per line | 45–75 | **72** | the field is inset further than the furniture to achieve this |
| Arms shadowed | never | **never** | |
| Simulated texture | none | **none** | |

## Acceptance tests — all asserted in the build

1. Canvas exactly 794 × 1123 px.
2. The rail runs unbroken from top trim to bottom trim.
3. The medallion straddles the mass's right edge — part on ink, part on paper.
4. The mass stops short of the right margin.
5. The place of issue clears the medallion.
6. No type below 6.3 pt; none below 6.6 pt reversed.
7. Six type sizes, all on the scale.
8. Measure 146 mm, 72 characters per line.
9. Wordmark, Arabic, the five schools, the record, the governance line,
   the creed and the place all fit their measures without truncation.
10. The field clears the strip above and the foot below, on every sheet.
11. No footing sits past the foot of its page.
12. No section lead-in is orphaned at the foot of a sheet.
13. All faces loaded.
14. Every URL a live hyperlink.
15. No console errors.

## Building

```
python3 brand/build-arms.py          # only when the arms artwork changes
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
python3 brand/word.py
```

Omit either argument and the blank stays visible rather than silently
wrong. Every asset lives in `brand/assets/` and `assets/fonts/`, so the
build is reproducible on any machine from any working directory.
