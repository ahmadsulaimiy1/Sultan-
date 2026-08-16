# SHRS Institutional Identity — Strategy, and twenty directions

Stage one of the staged process. **No final design is proposed here.**
This document sets the strategy, the colour and typographic rationale,
the grid, and twenty *fundamentally different* structural directions —
not variations of one idea. A direction is selected before any flagship
system is built.

---

## 1. Strategy

### What is actually being designed

Not a letterhead. A **document system** that must hold across
correspondence, certificates, transcripts, report cards, admission
letters, ID cards, prospectuses, policy documents, signage and screens —
and still look correct in 2056.

That constraint kills most "premium" devices immediately. Anything that
depends on a large ornament, a photograph, a texture or a fashionable
gradient cannot survive being reduced to an ID card or enlarged to a
sign. **Only structure, proportion, typography and one seal survive
every size.** That is the whole strategy.

### The positioning gap

Academic identity worldwide converges on navy-and-gold. It is safe,
it is British-colonial by inheritance, and it makes every institution
resemble every other. SHRS's coffee-brown anchor is genuinely
differentiating — warm where the field is cold, and closer to ink,
leather, wood and manuscript than to naval uniform.

The risk of brown is that it goes *rustic* — café, artisanal, warm-and-
friendly. The defence is not to abandon it (the earlier error) but to
hold it **dark, desaturated and architectural**, and to let ivory carry
the light. Coffee at `#2E1C10` is not a brown anyone associates with a
café. It is nearly black with warmth in it.

### The three-second test

A reader who has not yet read a word must receive: *authority,
scholarship, permanence*. That is delivered by, in order of power:

1. **Proportion** — where things sit, and how much air surrounds them.
2. **Typography** — the faces, and the discipline of their alignment.
3. **The seal** — one mark, perfectly placed.
4. **Colour** — last, and least. Colour is the cheapest signal and the
   first to date.

### What must never happen

The document must never look *assembled*. Assembly shows as: centred
everything, ornament used to fill space, more than one idea competing
for the same job, decorative Arabic, and any element whose presence
cannot be justified in one sentence.

---

## 2. Colour rationale

Settled in `docs/letterhead-editorial-bible.md` §II-b. In summary:

**Deep Coffee Brown `#2E1C10 → #1A0F07`** — the anchor. Used for solid
masses only: bands, plinths, the rail. Never for body text (too warm at
small sizes; body ink is Dark Cocoa or Graphite).

**Royal Gold `#C6A15B`** — accent only, and never flat. Foil is a
gradient through the letterform because real foil catches light along
its length: `#F6E3B4 → #E0C489 → #B08D4F → #8A6A2E → #F2DFAF`.

**Warm Ivory `#FBF7EF → #F2EADC`** — the paper. Graded, never one flat
value, because paper lightens where light falls.

**Supporting** — Antique Gold, Champagne, Soft Sand, Warm Stone, Deep
Bronze, Rich Walnut, Dark Cocoa, Graphite. All on the warm axis.

**Why no supporting hue outside the axis:** a single off-axis colour on
a document with a warm anchor reads as an accident or a sub-brand. If
five schools must be distinguished, they are distinguished *tonally* —
a graded ramp from Champagne to Dark Cocoa. One family, five members.

**Print reality:** every value above is chosen to survive CMYK. Royal
Gold prints as a warm ochre in four-colour, and as genuine metallic in
Pantone 871/872 or foil. The system is specified so that it looks
correct in both, rather than correct in one and disappointing in the
other.

---

## 3. Typography rationale

**Typography is the luxury.** Everything else is subordinate.

| Role | Face | Why |
|---|---|---|
| Institutional display | **Cinzel** | Roman inscriptional capitals. It descends from carved letterforms on monuments — the oldest available signal of permanence in the Latin alphabet |
| Editorial voice | **Cormorant Garamond** | A Garamond in the Claude Garamont tradition: the face of European scholarship since the sixteenth century |
| Document text | **Inter** | Neutral, engineered, screen-native. It carries the *modern technology* half of the brief without shouting |
| Arabic | **Amiri** | A revival of the Bulaq Press naskh — the Amiri Press, Cairo, 1900s. It is to Arabic scholarly printing what Garamond is to Latin |

All four are already in the repository as woff2 and already used by the
website. **Nothing new is introduced**, which is itself the point: a
system that requires a font purchase to remain consistent will not
remain consistent.

### Arabic and English as equals

The brief requires neither language visually secondary. That is a real
technical problem, not a sentiment:

- **Optical size, not point size.** Amiri at the same point size as
  Cinzel reads smaller because naskh has a lower effective x-height
  relative to its em. Arabic is set at **1.15×** the Latin point size to
  achieve equal *presence*. Matching the numbers would make the Arabic
  subordinate.
- **Baseline is shared, alignment is not.** Latin aligns to baseline;
  Arabic sits on it but its optical centre is higher. Where the two are
  set side by side they are aligned on **optical centre**, not baseline.
- **Equal measure.** Where both appear, each gets an equal column. No
  arrangement where Arabic is a caption to English.
- **Never decorative.** Arabic appears because it says something. There
  is no ornamental calligraphy anywhere in the system.

### The scale

A single modular scale, ratio **1.25** (major third), from a 9.8pt body:
9.8 · 12.25 · 15.3 · 19.1 · 23.9. Small caps and labels step *down* the
same scale: 7.8 · 6.3 · 5.0. **No size exists outside the scale.**

---

## 4. Grid

- **Sheet** 210 × 297 mm.
- **Rail** 7 mm off the left edge, reserved. Nothing else may enter it.
- **Field** 12 columns × 11.2 mm with 4 mm gutters, from 16.6 mm to
  196 mm. Body text occupies columns 1–12; the reference block and
  place-of-issue occupy 9–12.
- **Vertical unit** 3.2 mm. Every vertical dimension is a whole
  multiple: 1, 2, 3, 5, 8, 13. A dimension that needs 4.7 mm indicates
  the composition is wrong, not the number.
- **Masthead** ≤ 15% of sheet height (44.5 mm), measured.
- **Optical corrections** applied and expected: the crest is positioned
  on its optical centre (the shield's mass), not its bounding box;
  small-cap tracking is compensated at the line's right edge; hanging
  punctuation on the justified measure.

---

## 5. Twenty directions

Structurally different, not variations. Each names its *organising
idea*, what it delivers, what it risks, and where else in the system it
would be strong or weak.

| # | Direction | Organising idea | Strength | Risk |
|---|---|---|---|---|
| 1 | **Rule & Record** | No band at all. One gold hairline, a small seal, and space. All authority from proportion | The most timeless; scales to every format; cheapest to print | Under-claims on first impression; needs perfect typography or it is simply plain |
| 2 | **The Plinth** | Crest stands on a solid coffee plinth, top-left; wordmark ranged beside it | Architectural, stable, obviously engineered | Can read as corporate letterhead if the plinth is too regular |
| 3 | **Coffee Crown** | Full-bleed coffee band across the top 26 mm; gold wordmark centred | Immediate authority; strong at a distance (signage) | Ink-heavy; the most common institutional solution, so least original |
| 4 | **Split Column** | A 38 mm coffee column down the left edge carrying seal and name rotated; text right | Genuinely distinctive; excellent on portrait formats | Wastes measure on dense documents; awkward on landscape |
| 5 | **The Charter** | Double gold rule frame; the seal breaks the top rule | Ceremonial, unmistakably a document of record | Ceremonial density is wrong for routine correspondence |
| 6 | **Ledger** | A visible ruled grid, as an accounts book; seal in the top-left cell | Scholarly, precise, references archives honestly | Can read as a form rather than a letter |
| 7 | **Colonnade** | Five thin gold verticals under the masthead — one per institution | Carries the five-school structure into the architecture | Meaning is invisible without explanation |
| 8 | **Seal Corner** | Large embossed seal top-right; wordmark bottom-left of the header block | Dynamic asymmetry; the seal gets real presence | Top-right is where the eye leaves; risks fighting the reference block |
| 9 | **Manuscript Margin** | Wide left margin with marginal rules, as an illuminated manuscript; text ranged right | Deeply appropriate to Islamic and European scholarly tradition alike | Expensive in measure; may look precious |
| 10 | **Bilingual Mirror** | English left, Arabic right, mirrored on a central gold axis; seal on the axis | Solves the equal-languages brief structurally rather than by adjustment | Only works where both languages are present; fails on English-only documents |
| 11 | **Tessellation** | An eight-fold girih tile band as the masthead ground at 4% | Islamic identity through geometry, not cliché; rewards magnification | Very easy to overdo; must be nearly invisible |
| 12 | **Engraved Plate** | The whole masthead is a guilloche plate with the wordmark reversed out | Security-document authority; hardest to counterfeit | Can read as a banknote rather than a school |
| 13 | **Modernist Bar** | One 3 mm gold bar, full width. Seal above, name below. Nothing else | Extreme restraint; ages extremely well; superb on screen | Requires flawless typography; no margin for error |
| 14 | **Cartouche** | Wordmark set inside a gold cartouche; seal above | Ceremonial and distinctly non-Western | Dates faster than any other option here |
| 15 | **Broadsheet** | Newspaper masthead: name across the full measure at 30pt, hairlines above and below, standfirst beneath | Immediate editorial authority; excellent for prospectuses and reports | Overwhelming on a short letter |
| 16 | **Diagonal Panel** | Asymmetric coffee panel cut on a shallow diagonal; seal straddling its edge | Contemporary, dynamic, already prototyped | The diagonal is a style signature — it will date faster than orthogonal work |
| 17 | **Ghost Seal** | No masthead band. A very large seal watermark bleeding off the top-right; type is tiny and precise | Confident, unusual, extremely quiet luxury | Reproduces badly on poor printers; risks looking unfinished |
| 18 | **Two-Tone Ivory** | No dark mass anywhere. Soft Sand panel against Warm Ivory field, gold rules only | The most economical to print; genuinely refined | May read as insufficiently formal for certificates |
| 19 | **The Registry** | A designed reference block (Ref / Date / Office / Verification) as a bordered table, top-right; seal top-left | Puts the document's *provenance* into the design itself — most honest to what the identity claims | Bureaucratic if the block is not beautifully set |
| 20 | **Foil Line** | A single hairline gold rule that turns the corner and runs down the left edge; seal sits at the turn | One idea, perfectly executed; unmistakable at any size; trivially cheap to print | Depends entirely on the seal being right |

### Which four I would shortlist, and why

**1 · Rule & Record** and **13 · Modernist Bar** score highest on
*timelessness* and *digital adaptability*, and they are what Oxford
University Press and the great museum presses actually do. Their weakness
is the same: they need faultless typography and give nothing back if the
type is merely competent.

**19 · The Registry** is the most *honest* to what this identity claims.
The school's real differentiator is that every document it issues is
verifiable; a design that puts provenance into the structure says
something true rather than something decorative.

**20 · Foil Line** is the strongest single idea — one gesture, no
ornament, works from an ID card to a building sign, and costs one foil
pass to produce.

A combination of **19 and 20** is likely the flagship: the turned gold
line as the permanent structural signature, the registry block as the
document's own record, coffee mass used sparingly for hierarchy, and the
seal at the turn. That would be distinctive, timeless, cheap to produce,
and unmistakably about an institution that stands behind its documents.

**But the selection is yours.** Say a number, or say "combine 19 and 20",
and stage two builds the flagship system against it.

---

## 6. Quality gate

No design is presented until each scores 10:

Institutional authority · Luxury · Editorial quality · Typography ·
Brand consistency · Psychological impact · Originality · Print
excellence · Digital adaptability · Islamic identity · Arabic–English
harmony · Timelessness · Executive presence · Global prestige · No AI
appearance.

**The one I cannot score for you:** *originality* is judged against what
you have seen. Tell me if a direction reminds you of another institution
and it is withdrawn.
