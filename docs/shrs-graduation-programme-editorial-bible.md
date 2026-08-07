# The Graduation Programme Editorial Bible

**Version:** 1.0 · 8 August 2026
**Governs:** `scripts/build-graduation-programme.mjs`,
`scripts/build-graduation-programme-docx.mjs`,
`scripts/render-graduation-programme.mjs`, and every artefact they produce.
**Read with:** `docs/shrs-publication-prestige-prompt.md` (the standard) and
`docs/shrs-royal-college-certificate-editorial-bible.md` (the certificate law
this inherits from).

---

## 0 · The lock

The format, the bilingual law, the security furniture and the honesty rules
below are **locked**. Every future pass may raise them and may never lower
them. Content stays flexible: names, times, guests and photographs change from
year to year. The standard does not.

---

## 1 · The rubric

Ten axes, one point each. A pass scores each axis honestly, publishes the
score, then works the lowest axis first. **Nine is a defect list.**

| # | Axis | What a 10 looks like |
|---|------|----------------------|
| 1 | **Truth** | Every fact traceable to an approved source. Zero invented content. Discrepancies reported, not smoothed. |
| 2 | **Format & production** | Real fold, real bleed, real crop marks, printer's own stock and finish specified, CMYK-safe, ink limit respected. |
| 3 | **Grid & rhythm** | One baseline grid. Every panel fills 88–96% of its live area. No wall of type, no hand's width of blank paper. |
| 4 | **Typography** | Deliberate scale, true hierarchy, controlled rag, no widows or orphans, kerned display lines, hyphenation tuned. |
| 5 | **Bilingual parity** | Arabic set to the same standard as English. Pairing law obeyed everywhere. Numerals never reverse. |
| 6 | **Photography** | Every image real, art-directed, correctly exposed, deliberately cropped, captioned with what is in the frame. |
| 7 | **Ornament & identity** | Drawn marks, consistent with the certificates. Crest reproduced at vector quality at every size. |
| 8 | **Voice** | One institutional voice. Every line survives being read aloud. No padding, no unearned superlatives. |
| 9 | **Verification** | Rendered, rastered, measured, gated. Claims of completion backed by a stated check. |
| 10 | **Ceremony** | The document feels like the occasion. A stranger knows this is a convocation, not a handout. |

### Current score — trifold v2, 8 August 2026

| Axis | Score | Why it is not a 10 |
|------|------:|--------------------|
| 1 Truth | **9** | Rolls read from the registers; nothing invented. Three unresolved discrepancies stand on the record (roll counts vs. the earlier trifold, `.ng` vs `.com`, 3 p.m. vs 2 p.m.). Not a 10 until ruled on. |
| 2 Format & production | **6** | Correct sheet, bleed, fold and crop marks. But: RGB only, no CMYK conversion, no ICC profile, no ink-limit check, no paper stock, weight, lamination or foil specified, no printer-supplied die-line. |
| 3 Grid & rhythm | **7** | Panels fill well after two retimings. No shared baseline grid — vertical rhythm is tuned by eye, panel to panel. Two panels still carry visible slack. |
| 4 Typography | **7** | Real scale and hierarchy. But no kerning pass on display lines, hyphenation left at browser default, rag unmanaged, no widow/orphan control, faux small caps rather than true ones. |
| 5 Bilingual parity | **7** | Pairing law obeyed; isolates correct. But the document is English-led — Arabic appears as labels and names, not as a second full reading. No Arabic edition. |
| 6 Photography | **4** | Every image real and cleared — the floor is met. Ceiling is low: these are phone snapshots, unevenly exposed and colour-cast, none shot for this piece. No shot list, no art direction, no ceremony photography at all. **This is the binding constraint.** |
| 7 Ornament & identity | **7** | Lathe, frame, brackets and rules are drawn and consistent. The crest is a 520 px raster — soft above ~25 mm. No vector master. |
| 8 Voice | **8** | One voice, unpadded, the Founder quoted verbatim. Not every line has been read aloud. |
| 9 Verification | **6** | Both sides rendered and read at 192 DPI; asset 404s are a hard failure. No automated release gate as the certificates have — no ink-box measurement, no panel-fill audit, no cross-edition diff. |
| 10 Ceremony | **7** | The cover carries it. The inside reads as a well-set document rather than an occasion. |

**Total: 68 / 100 — 6.8 / 10.**

I do not score it 0.5. I record your assessment as the client's and treat the
gap as real: the axes above name exactly where it falls short of ten, and the
plan below closes them in the order that moves the number most.

---

## 2 · Format and production law

- **Sheet:** 303 × 216 mm — A4 landscape (297 × 210) plus 3 mm bleed all round.
- **Fold:** letter-fold, three panels of 99 mm. Outside panels order
  *welcome flap · back · face*; inside *order · graduands I · graduands II*.
- **Live area:** 8 mm side margins, 9 mm head, 8 mm foot; outer panels take a
  further 3 mm inset so the trim does not eat type.
- **Registration:** crop marks in the bleed corners only; fold guides as 3 mm
  ticks at head and foot. **Nothing registration-related prints inside a panel.**
- **Colour:** RGB source, converted to the printer's CMYK profile at output.
  Total ink coverage ≤ 300%. Gold is a colour build, not a spot, unless a foil
  is specified.
- **Stock:** to be specified with the printer — target 250–300 gsm silk with a
  matt lamination outside, or 300 gsm uncoated for a letterpress feel. **Not
  yet decided; this is an open item.**
- **Never:** hairlines below 0.10 mm, type below 5 pt, reversed type below
  6 pt, or a photograph below 300 dpi at final size.

## 3 · Grid and rhythm law

- One baseline grid across all six panels. Body leading is the grid unit;
  every heading, rule and image height is a whole multiple of it.
- Panel fill: **88–96%** of live area. Below 88 the panel reads as unfinished;
  above 96 it reads as crowded.
- A photograph either bleeds to the panel edge or sits fully inside the live
  area. Never half-way.
- No element may cross a fold.

## 4 · Typographic law

- **Display:** Cinzel — titles, awards, section heads. Tracked, never below
  0.03 em.
- **Text:** Cormorant Garamond — body, names, quotations.
- **Label:** Inter — kickers, captions, roles, folios. Uppercase, tracked
  0.14–0.26 em.
- **Arabic:** Amiri, at matched optical size to its English partner.
- Justified text only where the measure exceeds 45 characters; ragged-right
  below that. Hyphenation on for justified English, off for names.
- No widows. No orphans. No name broken across a column or a fold.
- Numerals in English prose are lining; numerals inside Arabic prose are
  Arabic-Indic. Registers keep Western digits regardless of display.

## 5 · The bilingual law (inherited, unchanged)

1. English left, Arabic right, one baseline, matched optical size, wherever
   the two are paired.
2. Where they must stack: **Arabic above, English below. Never the reverse.**
3. A year range or date never reverses inside an RTL line. Protect it with
   Unicode isolates (`U+2066 … U+2069`), not CSS alone.
4. No Arabic name is ever transliterated, generated or guessed. Unapproved
   names hold the page.
5. Arabic gets correct shaping, ligatures, kashida behaviour, baseline and
   diacritics, or it does not print.

## 6 · Photography law

- Real photographs of this campus and community only. No stock, no
  generative fill, no borrowed interiors.
- Every image has a known subject, a known date and recorded consent under the
  image and media consent procedure.
- Captions name what is in the frame, in gold small caps, at 4.4–5.2 pt.
- Treatment is uniform: sepia 0.28–0.34, saturation 0.90, contrast 1.05. One
  look across the whole piece.
- Where no photograph exists: a struck monogram, a scoped accent panel or a
  real diagram — and the substitution is disclosed in the build log.
- **A blank frame is a failure. A fabricated one is a fraud.**

## 7 · Ornament and identity law

- The engine-turned band is drawn from the certificate lathe — interfering
  sine strands at 0.55–0.6 stroke. Never a pasted flourish, never restyled.
- The cover frame is a 0.4 mm gold rule with an inner 0.9 mm shadow and four
  corner brackets at 9 mm.
- Rules, lozenges and stars come from the shared fixtures. No one-off
  ornaments.
- The crest is the institutional crest, unmodified, never recoloured, never
  stretched.

## 8 · Content law

- The certificate registers are the authority on who graduated and how a name
  is spelled. The programme follows them and reports any disagreement.
- The Founder's documents are the authority on the running order, the guests,
  the lecture and the host.
- Times are printed as they will run. Where the supplied order overlaps
  itself, the conflict is resolved, the resolution is declared in the source,
  and reverting is a one-line change.
- No claim, statistic or accolade appears that the institution cannot evidence.

## 9 · Release gate

No artefact is delivered until all of these pass and the result is stated:

1. Both sides render with **zero** missing assets.
2. Both sides rastered at ≥ 192 DPI and read panel by panel by a human eye.
3. Panel fill measured against the 88–96% band.
4. No text within 3 mm of a fold or trim.
5. Every photograph ≥ 300 dpi at final size.
6. Word and PDF editions carry the same names, times, guests and officers —
   diffed, not assumed.
7. Every open question listed in the delivery note.

---

## 10 · The upgrade path — 6.8 to 10

Ranked by how much each move raises the number. Do them in this order.

### Phase 1 — Photography (axis 6: 4 → 9). The single biggest gain.
1. Write a **shot list** for the ceremony and the campus: the building at
   golden hour, the gate, the prayer hall in use, a Ḥifẓ class mid-recitation,
   each Principal in natural light, hands receiving a certificate, the
   graduands as a group, a parent's face in the audience.
2. Shoot on a real camera, or a recent phone in RAW, in daylight, with the
   subject lit from the front. One session, two hours, and the ceiling lifts
   permanently.
3. Record consent for every identifiable subject at the point of capture.
4. Re-treat the whole set to one look and re-crop for the panel shapes.
5. Retire every image that is dim, cluttered or shot at an angle.

### Phase 2 — Production (axis 2: 6 → 10).
1. Get the printer's die-line and profile. Build to their file, not to a
   guess.
2. Convert to their CMYK profile; check total ink coverage; check the gold
   builds cleanly.
3. Specify stock, weight, lamination and any foil or emboss in writing.
4. Order a **wet proof** before the run. A screen proof is not a proof.

### Phase 3 — Identity assets (axis 7: 7 → 10).
1. Redraw the crest as vector. Every size, every future artefact, forever.
2. Build the ornament set as a single shared module used by the programme,
   the certificates and the prospectus.

### Phase 4 — Typography and grid (axes 3–4: 7 → 10).
1. Impose one baseline grid on all six panels and snap every element to it.
2. Kern the display lines by hand. Manage the rag. Kill widows and orphans.
3. Licence a true small-caps cut, or draw the small caps properly.
4. Tune hyphenation; forbid breaking any personal name.

### Phase 5 — Bilingual parity (axis 5: 7 → 10).
1. Commission a full Arabic reading of the welcome, the CEO's word, the
   running order and the roll headings — approved, not translated by tool.
2. Consider a mirrored Arabic edition of the whole trifold, RTL fold.

### Phase 6 — Voice and ceremony (axes 8, 10: 7–8 → 10).
1. Read every line aloud. Cut what does not survive it.
2. Add the two ceremonial elements the piece still lacks: an opening Qur'anic
   verse with its reference, and a closing benediction.
3. Give the inside spread one moment of drama to answer the cover — a
   full-panel photograph or a single tinted plate behind the roll.

### Phase 7 — Gate (axis 9: 6 → 10).
1. Build the automated release gate the certificates already have: measured
   ink boxes, panel-fill audit, fold-clearance check, cross-edition diff.
2. Fail the build on any breach. No artefact ships un-gated.

### Phase 8 — Truth (axis 1: 9 → 10).
Resolve the three open rulings: the roll discrepancies, the domain, and the
closing time.

---

## 11 · Change control

- This bible is versioned. Every change is recorded with a date and a reason.
- The rubric score is republished on every pass.
- Anything that would lower a locked element is refused, and the refusal is
  reported rather than worked around.
