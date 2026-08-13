# Audit — SHRS letterhead, August 2026

An adversarial review of `brand/letterhead.pdf` and
`brand/letter-registrar-activation.pdf` at commit `40f8ae9e`.

Every claim below is measured off the rendered sheet, not judged by eye.
The measuring scripts are the same ones the build uses.

---

## Verdict

**The craft is not zero. The register is.**

The sheet is competently *made* — the geometry is consistent, the
bilingual lock is genuinely engineered, nothing wraps, nothing overflows,
sixteen structural tests pass. That work is real.

But it is competent work in the **wrong register**. This is a document
system for an institution that issues certificates and holds children's
records, and it currently reads as a corporate services brochure. On the
brief as stated — *Oxford, Cambridge, Aramco* — it is not a near miss.
It is the wrong category of object.

A rating of **0.5–1.5 / 10 against that brief is defensible.** Against
"attractive modern business letterhead" it would score perhaps 6. The gap
between those two numbers *is* the finding.

---

## The measurements

| Measured | This sheet | Institutional norm | |
|---|---|---|---|
| Sheet area in solid ink | **51.2%** | 4–10% | ✗✗✗ |
| Head band as % of sheet | 26.9% | 8–14% | ✗✗ |
| Foot band as % of sheet | 24.2% | 4–8% | ✗✗✗ |
| Distinct left edges of text | **11** | 2–3 | ✗✗✗ |
| Distinct right edges of text | **15** | 2–3 | ✗✗✗ |
| Distinct type sizes on one sheet | **12** | 5–6 | ✗✗ |
| Type families | 4 | 2, occasionally 3 | ✗ |
| Body measure | 162 mm | 95–115 mm | ✗✗ |
| Characters per line | **90** | 45–75 (optimum 66) | ✗✗ |
| Text set below 6 pt, reversed out | **4 elements** | 0 | ✗✗✗ |
| Lowest contrast ratio | 3.75 : 1 (registry label) | ≥ 4.5 : 1 | ✗ |

---

## Critical — these make the sheet unusable, not merely imperfect

### 1. Half the sheet is solid ink

51.2% coverage. Head 26.9% plus foot 24.2%.

This is not an aesthetic objection. It is three separate practical
failures:

- **Cost.** At 50% coverage a school cannot afford to print routine
  correspondence on it. Toner or ink per sheet is roughly five to eight
  times a conventional letterhead. A letterhead that is too expensive for
  daily letters is not a letterhead; it is a certificate blank.
- **Offsetting and curl.** Heavy coverage at both the gripper and tail
  edges is exactly where a sheet is handled. Pages will mark each other
  in the output tray.
- **Register.** Oxford and Cambridge college letterheads run under 8%
  coverage. Aramco's runs around 12%. The reason is not thrift: **a
  serious institution does not need to fill the page to be believed.**
  Filling it signals the opposite.

**Remedy:** head to 14% of the sheet or less; foot to a rule and one line
of type. That alone changes the object's category.

### 2. Four elements are set below 6 pt and reversed out of a dark ground

| Element | Size | Contrast |
|---|---|---|
| Registry labels | 4.7 pt | 3.75 : 1 — **fails WCAG AA** |
| The five houses | 5.0 pt | 10.18 : 1 |
| Footing labels | 5.2 pt | 7.56 : 1 |
| Office seat line | 5.4 pt | 9.91 : 1 |

Contrast is mostly fine *on screen*. That is not the test. Reversed type
below 6 pt **fills in** — ink spreads into the counters of the letterforms
on any office laser printer, and on offset it closes up entirely at the
first sign of dot gain. Three of these are also tracked at 0.24–0.3 em,
which thins the strokes further.

This is the single most common tell of a designer who has never had work
come back from a printer.

**Remedy:** nothing reversed below 7 pt. Nothing on paper below 6.5 pt.
Where that does not fit, the content does not belong on the sheet.

### 3. Eleven left edges and fifteen right edges

A disciplined institutional sheet has **two** left edges — the margin,
and one indent — and one right edge. This sheet has eleven and fifteen.

Left edges, in millimetres: 24, 30, 30.5, 56, 60.5, 76, 81, 85.5, 121,
131, 155.5.

Note **30 and 30.5** — a half-millimetre apart. And **24 / 25.5 / 30** on
the right. Those are not decisions; they are accidents, and the eye reads
accumulated accidents as carelessness even when it cannot name why.

**Remedy:** one vertical grid, three permitted left edges, two permitted
right. Every element snaps or is removed.

### 4. The line is 90 characters long

162 mm measure at 10.4 pt. The evidence on comfortable measure is
consistent and old: 45–75 characters, optimum near 66. At 90 the reader
loses the line-return, and legibility research puts the reading-speed
penalty in double digits.

For a letter telling a Registrar how to activate an account — a document
whose entire purpose is to be *followed correctly* — this is a functional
defect, not a stylistic one.

**Remedy:** measure to 105–115 mm. On A4 that means a wider right margin,
which is also where a formal letter's reference block belongs.

---

## Serious — professional errors

### 5. The heraldic achievement has a drop shadow and a glow ring

`filter:drop-shadow(...)` on the crest, and a ringed `box-shadow` around
it. **Arms are never shadowed.** They are a flat heraldic device with a
legal and traditional character; giving them a bevel treats a coat of
arms as a UI button. No armigerous institution in the world does this.

### 6. Printed texture on textured stock

The sheet carries a cotton-rag simulation at 17% multiply, a vignette,
and a ghost crest at 3%. The stationery is specified for 350 gsm cotton.

So the design **prints a photograph of paper texture onto actual paper
texture**, and prints a vignette — a lens artefact — onto a flat sheet
that has no lens. On screen these read as richness. In the hand they read
as a print defect, and they add a fourth ink to what should be a
two-colour job.

### 7. The gold is a five-stop gradient across the full width

A ribbon running `#6E5121 → #F6E9CE → #9C7A3C → #F2DFAF` across 210 mm
cannot be printed as designed. In four-colour it bands, and the light
stops go green as soon as there is any dot gain. As foil it is a separate
pass at real cost per sheet, on a shape that runs off both edges — so it
needs bleed and trim on every sheet.

The design therefore has no economical production route. That is a
specification failure, not a taste question.

### 8. The Arabic breaks badly

`مدارس السلطان حنفي` / `الملكية` orphans the adjective onto a line of its
own, one word, ragged. The construct is broken from the word that
qualifies it. This is the Arabic equivalent of setting

> SULTAN HANAFI ROYAL
> SCHOOLS

which we correctly refused to do in English. The rule was applied in one
language and not the other — precisely the asymmetry the bilingual lock
was designed to prevent.

### 9. Watermarking outgoing correspondence

A ghost crest behind the body is a security-document device. On
correspondence it reduces legibility, adds nothing verifiable, and reads
as insecurity. The school's actual verification mechanism is
`shroyalschools.com/verify` — a real one. It does not need a decorative
imitation of one.

### 10. Twelve type sizes, four of them indistinguishable

4.7 / 5.0 / 5.2 / 5.4 pt — four sizes inside a 0.7 pt band. No reader can
tell them apart, so they create no hierarchy; they only prove that no
scale was enforced. Same with 8.2 / 8.6 / 9.0, and 10.4 / 10.6.

A modular scale exists in the strategy document. It was not applied.

---

## Craft — smaller, still real

11. **The folio "01" appears on page one.** Convention omits it there,
    and folios belong at the foot.
12. **The notch at the top-right corner** is on the corner most likely to
    be knocked or trimmed; damage there will read as the design.
13. **The foot carries four information layers** — houses, contacts,
    creed, microtext — in 72 mm. Any one of them would do more alone.
14. **Microtext as ornament.** It is presented as an authenticity mark
    but nothing verifies against it, so it is decoration dressed as
    security.
15. **The lock's vertical gold bar** has no typographic or heraldic
    precedent. It reads as an interface divider.

---

## The register problem, stated plainly

The nine adjustments in the last revision were taken from three
letterhead templates. Those templates are **mass-market marketplace
stock** — the swoosh, the gradient ribbon, the circular contact icons,
the mirrored corner flourish. That vocabulary is designed to look
impressive in a thumbnail grid next to a hundred competitors.

An institutional letterhead has the opposite job. It is seen alone, in
the hand, by someone who already knows who sent it. It has to survive
thirty years, a photocopier, and a magistrate reading it in evidence.

What Oxford, Cambridge and Aramco actually do:

| | Coverage | Devices | Type sizes |
|---|---|---|---|
| Oxford college | ~5% | arms, one rule | 3 |
| Cambridge college | ~6% | arms, no rule | 3 |
| Saudi Aramco | ~12% | one flat mark, one band | 4 |
| **SHRS, current** | **51%** | mass, ribbon, fold, streaks, chamfer, notch, badges, panel, watermark, texture, vignette, microtext | **12** |

Twelve devices where the exemplars use two. That is the finding in one
line.

**This is your call, not mine.** If the intent is a modern, energetic
sheet that reads as contemporary rather than ancient, the current
direction is coherent and can be made excellent — the critical faults
above are all fixable without abandoning it. But it will not read as
Oxford, and no amount of refinement inside this vocabulary will make it.

---

## Remediation, in order of return

1. **Cut coverage from 51% to under 15%.** Head to ~14% of sheet; foot to
   a rule and one line. Everything else follows from this.
2. **Nothing below 7 pt reversed, 6.5 pt on paper.** Cut content until it
   fits.
3. **Impose the grid.** Three left edges, two right. Snap or delete.
4. **Measure to 105–115 mm**, 66 characters.
5. **Remove the drop shadow and glow from the arms.**
6. **Remove the rag, the vignette and the ghost crest.** Let the stock be
   the texture.
7. **Reduce the gold to one flat specified ink** — Pantone 872 or a
   single CMYK build — with the gradient reserved for the screen version
   only.
8. **Re-break the Arabic** so the adjective stays with its noun.
9. **Collapse to six type sizes** on the existing modular scale.
10. **Then** decide the register question above, deliberately, once.

Items 1–4 are worth roughly eight of the ten points. Items 5–9 are the
difference between competent and finished.
