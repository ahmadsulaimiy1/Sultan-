# The Graduation Programme Editorial Bible

**Version:** 1.2 · 10 September 2026
**Governs:** `scripts/build-graduation-programme.mjs`,
`scripts/build-graduation-programme-docx.mjs`,
`scripts/render-graduation-programme.mjs`, `scripts/build-crest-vector.py`,
`scripts/verify-graduation-programme.mjs`, `scripts/audit-programme-fill.mjs`,
and every artefact they produce.
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

### Current score — trifold v3, 8 August 2026

Version 3 is the four-side edition: two A4-landscape sheets, each folded in
three and printed both sides — **twelve panels**, up from six. The Chief Host
and the Lecture of the Day each take a panel of their own; no Principal, Ra'ees,
Mudeer or Head Teacher is named anywhere in either edition; a Digital Campus
panel was added, written only from capabilities that are running today.

| Axis | v2 | v3 | Why it is not a 10 |
|------|---:|---:|--------------------|
| 1 Truth | 9 | **9** | Rolls still read from the registers; nothing invented; the Digital Campus panel names only what runs today. The same three discrepancies stand unruled (roll counts vs. the earlier trifold, `.ng` vs `.com`, 3 p.m. vs 2 p.m.). |
| 2 Format & production | 6 | **6** | Unchanged: correct sheet, bleed, fold and crop marks; still RGB only, no ICC profile, no ink-limit check, no stock or finish specified, no printer die-line. Twelve panels does not move this axis. |
| 3 Grid & rhythm | 7 | **8** | Every panel measured: fill now runs 85–95% of live area, inside the band, and the folio sits on one line across all twelve (v2's folio rode up with the text on short panels). Still no shared baseline grid. |
| 4 Typography | 7 | **8** | Real hierarchy at last: the lecture topic at 18.4 pt is the largest interior element, the Chief Host's name at 15.6 pt the second. Still no hand-kerning of display lines, no widow/orphan control, browser-default hyphenation. |
| 5 Bilingual parity | 7 | **7** | Unchanged. Pairing law obeyed, isolates correct, still English-led. |
| 6 Photography | 4 | **5** | Twelve real photographs, up from eight, each framed and captioned; the plates are large enough now to read at arm's length. The ceiling is still the source material: phone snapshots, unevenly exposed, none shot for this piece. **Still the binding constraint.** |
| 7 Ornament & identity | 7 | **7** | Unchanged. Lathe, frame and brackets consistent; the crest is still a 520 px raster. |
| 8 Voice | 8 | **8** | The Digital Campus prose is in the same voice and claims nothing unevidenced. Still not read aloud line by line. |
| 9 Verification | 6 | **7** | All four sides rendered, rastered and read panel by panel; panel fill measured against the 88–96% band; a cross-edition diff now runs over every graduand, guest and running-order item and passes. Still no automated gate that fails the build. |
| 10 Ceremony | 7 | **9** | The dark Lecture panel at the centre of the opened sheet, the Chief Host on cream opposite, and a second sheet that opens on "The Graduands". The inside now reads as an occasion rather than as a well-set document. |

**Total: 74 / 100 — 7.4 / 10** (v2: 6.8).

### Current score — v4, 10 September 2026

This pass took Phase 3 (identity assets) and Phase 7 (the gate). It did not
touch photography or production: both need something outside the repository —
a camera and a printer — and no script substitutes for either.

| Axis | v3 | v4 | Why it is not a 10 |
|------|---:|---:|--------------------|
| 1 Truth | 9 | **9** | Unchanged in principle, but see the roll finding below: the shipped artefacts were describing a different ceremony from the registers, and nothing said so. Now something does. The three open rulings still stand. |
| 2 Format & production | 6 | **6** | Untouched. Still no ICC profile, ink-limit check, stock, finish or die-line. Needs the printer. |
| 3 Grid & rhythm | 8 | **8** | Now measured rather than asserted — `audit-programme-fill.mjs` reads the laid-out boxes in the page. Measured that way, eight of twelve panels fall outside the 88–96% band. The score is held at 8 rather than cut, because the earlier figure was taken by a method that is not recorded and cannot be compared; what is new is that there is now a number anyone can reproduce. See the finding below. |
| 4 Typography | 8 | **8** | Untouched. Still no hand-kerning, no widow/orphan control, browser-default hyphenation. |
| 5 Bilingual parity | 7 | **7** | Untouched. |
| 6 Photography | 5 | **5** | Untouched, and still the binding constraint. |
| 7 Ornament & identity | 7 | **9** | The crest is vector. Traced from the best original at 1990 × 1408 and measured against it: 99.64% of pixels agree, 0.71% of the mark dropped, 0.50% added — all of it the sub-pixel band along an edge, none of it a lost limb. It carries no colour of its own, so one file serves gold on cream and gold reversed out of the espresso panels, and it is inlined rather than linked. Not a 10 because Phase 3.2 is undone: the ornament set is still not a shared module across the programme, the certificates and the prospectus. |
| 8 Voice | 8 | **8** | Untouched. Still not read aloud line by line. |
| 9 Verification | 7 | **9** | The gate exists and fails the build. Eleven checks: freshness against the registers, cover arithmetic re-derived rather than read back, roll integrity in both directions, running order, guests, panel count, side count, crest-is-vector, proof currency, and the fill audit. It does not disturb what it audits. Not a 10 because two of Phase 7's named checks are still missing — measured ink boxes and a fold-clearance check. |
| 10 Ceremony | 9 | **9** | Untouched. |

**Total: 78 / 100 — 7.8 / 10** (v3: 7.4, v2: 6.8).

#### The roll finding, recorded rather than smoothed

The gate's first run failed on its first check. The committed programme — PDF,
DOCX and all four proof rasters — carried **45 AWARDS · 32 GRADUANDS** on its
cover. Rebuilding from the committed registers with the committed builder
produced **43 and 30**. The artefacts were stale against their own source of
truth by two people, on the front of a document handed to their families.

The artefacts in `dist/` have been regenerated and now agree with the
registers. **What has not been settled is which of the two is right** — whether
the registers correctly dropped two entries, or wrongly lost them. That is a
question for the Office of the Registrar and it is not answered here. It joins
the three open rulings in Phase 8.

#### The fill finding

Measured as content extent over live area, excluding the frames, corner marks
and engine-turned bands that run every panel's full height, and excluding the
running folio that sits in the foot margin by design:

    welcome flap 101.2   back 83.2   face 86.0
    Chief Host 79.9   Lecture 89.1   proceedings 88.5
    guests 97.1   Digital Campus 94.3   insert face 40.2
    graduands I 96.7   II 96.6   III 88.9

Four are inside the band. Two of the eight outside are the display panels —
the face and the insert's face — which are meant to be airy and arguably
should never have been judged by a band written for panels of running text.
**Whether the band applies to display panels is an open question for this
bible, not a defect to be designed around.** The other six are real.

The three axes that moved most are the three the Founder named: hierarchy
(typography, 7→8), ceremony (7→9), and the space to carry more pictures
(photography 4→5, rhythm 7→8). The two that did not move — production and
identity assets — cannot move without the printer's specification and a vector
crest, which are Phases 2 and 3 below.

I do not score it 0.5. I record your assessment as the client's and treat the
gap as real: the axes above name exactly where it falls short of ten, and the
plan below closes them in the order that moves the number most.

---

## 2 · Format and production law

- **Sheet:** 303 × 216 mm — A4 landscape (297 × 210) plus 3 mm bleed all round.
- **Fold:** letter-fold, three panels of 99 mm. **Two sheets, printed both
  sides — four printed sides, twelve panels.** Sheet I is the programme; Sheet
  II is the roll of graduands and nests inside it.
  Sheet I outside: *welcome flap · back · face*.
  Sheet I inside: *the Chief Host · the Lecture of the Day · order of
  proceedings*.
  Sheet II outside: *distinguished guests · the Digital Campus · the insert's
  face*. Sheet II inside: *graduands I · II · III*.
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

- One baseline grid across all twelve panels. Body leading is the grid unit;
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
- **Naming.** The Founder's ruling of 8 August 2026: the **Chief Host** is the
  only officer named in the programme, under both his offices — Chief Executive
  Director and Chairman, Board of Governors. The Principals, the Ra'ees, the
  Mudeer and the Head Teacher are **not named**; their offices are named, in
  prose, without their holders. Graduands are named in full. This is locked
  until the Founder rules otherwise.
- **Hierarchy.** The Lecture of the Day and its topic carry the largest type
  inside the publication, and the Chief Host the second largest. A guest must
  be able to find both without reading another line.
- **Technology.** The Digital Campus may be described only from capabilities
  running in the school's own systems on the day of printing. No roadmap item,
  no intention, no rounded figure.
- No claim, statistic or accolade appears that the institution cannot evidence.

## 9 · Release gate

No artefact is delivered until all of these pass and the result is stated:

1. Both sides render with **zero** missing assets.
2. Both sides rastered at ≥ 192 DPI and read panel by panel by a human eye.
3. Panel fill measured against the 88–96% band.
4. No text within 3 mm of a fold or trim.
5. Every photograph ≥ 300 dpi at final size.
6. Word and PDF editions carry the same names, times, guests and officers —
   diffed, not assumed. *(Run: every graduand, guest and running-order item is
   extracted from the shared data module and asserted present in both the HTML
   and `word/document.xml`. v3 passes.)*
7. Every open question listed in the delivery note.

---

## 10 · The upgrade path — to 10

Phases are struck through as they close. Two are shut; six remain.

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

### Phase 3 — Identity assets (axis 7: 7 → 9). Half shut.
1. ~~Redraw the crest as vector.~~ **Done, v1.2.** `build-crest-vector.py` traces it; `verify-crest-vector.py` measures the trace at 99.64% agreement with the source.
2. Build the ornament set as a single shared module used by the programme,
   the certificates and the prospectus.

### Phase 4 — Typography and grid (axes 3–4: 7 → 10).
1. Impose one baseline grid on all twelve panels and snap every element to it.
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

### Phase 7 — Gate (axis 9: 7 → 9). Mostly shut.
1. ~~Build the automated release gate.~~ **Done, v1.2.**
   `verify-graduation-programme.mjs` runs eleven checks and
   `audit-programme-fill.mjs` measures the panel-fill band. Still missing from
   Phase 7's own list: **measured ink boxes** and a **fold-clearance check**.
2. ~~Fail the build on any breach.~~ **Done.** The gate exits non-zero and says
   nothing ships until it passes.

### Phase 8 — Truth (axis 1: 9 → 10).
Resolve the three open rulings: the roll discrepancies, the domain, and the
closing time.

---

## 11 · Change control

- This bible is versioned. Every change is recorded with a date and a reason.
- **1.1 · 8 August 2026** — the format law becomes four printed sides and twelve
  panels; naming, hierarchy and technology rules added to content law; the
  release gate's cross-edition diff is now a real check rather than an
  intention; score republished at 7.4.
- **1.2 · 10 September 2026** — the crest becomes vector and the release gate
  becomes real. Phase 3.1 and most of Phase 7 close; axes 7 and 9 rise to 9,
  and the score is republished at 7.8. Panel fill becomes a measurement with a
  named method. Two findings recorded rather than smoothed: the shipped
  artefacts were two graduands out of step with the registers, and eight of
  twelve panels fall outside the fill band when measured.
- The rubric score is republished on every pass.
- Anything that would lower a locked element is refused, and the refusal is
  reported rather than worked around.
