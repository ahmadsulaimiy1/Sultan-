# The Certificate Ground — Vector Rebuild

> **Read §0 first.** Two modules exist and they do different jobs.
> `certificate-plate.js` is the **faithful** rebuild of the client's supplied
> I'dadiyyah plate and is the one to use. `certificate-ground.js` (§1–§6 below)
> is a *different* plate drawn from scratch, kept only as an alternative that
> was never approved.

---

## 0. The faithful plate — `functions/_lib/certificate-plate.js`

**Source:** the I'dadiyyah background supplied 2026-08-06, installed as
`assets/images/certificates/official-background-idd.jpg`.
**Gate:** `scripts/verify-certificate-plate.mjs` — 19 checks, `--render` for proofs.
**Generator:** `scripts/build-certificate-marks.py`.

### What was wrong with the upload, and was fixed

The file carried a **10 px black letterbox band along its top edge**. Left in,
it prints as a black bar across the head of every certificate. It is cropped;
the remaining content is 1080 × 762, aspect 1.4173 against A4 landscape's
1.4143 — a 0.2 % difference, placed without distortion worth measuring.

### The split

| | |
|---|---|
| **Preserved, pixel-exact** | Every mark: the four corner ribbon swags, the laurel badge, the red wax medallion, the gold wax seal, both holographic strips, the holographic roundel, the lock cartouche, the engraved gold frame and its mandala corners, the central mandala watermark, the vertical microtext columns, the shield emblem, the QR block. |
| **Rebuilt, resolution-free** | The paper the marks sit on — flat vector, exact at any DPI. |

### Why this is a reconstruction and not a key tuned by eye

Source-over compositing is `out = PAPER*(1-a) + C*a`. The marks layer's colour
channel is **solved** from that equation rather than sampled:

    C = (S - PAPER*(1-a)) / a

Alpha comes from an ink key, but the key alone is not enough — where alpha is
small and the mark strong, the solved `C` lands outside 0–255, clips, and the
mark comes back wrong. That constraint has a closed form, so alpha is floored at
the value that keeps `C` in gamut:

    C >= 0    =>  a >= 1 - S/PAPER
    C <= 255  =>  a >= (S - PAPER) / (255 - PAPER)

With that floor **nothing is ever clipped** and the only residual is 8-bit
rounding.

| Measure | Result |
|---|---|
| Out-of-gamut pixels | **0.0000 %** |
| Mean absolute difference vs the supplied artwork | **0.052 / 255** |
| 99.9th percentile | **0.4 / 255** |
| Worst single pixel | **0.47 / 255** |
| Pixels off by more than 12 levels | **0.0000 %** |

Sub-half-a-level everywhere. The composition is the client's, unchanged.

### Three defects this work found

1. **A key that only looked for *dark* marks.** Every specular highlight on the
   gold and the holographic strips is *brighter* than the paper; reproducing one
   needs a colour above 255, which clips, and the highlight comes back dull.
   Fixed by keying on brighter-than-paper as well.
2. **Solving against the wrong bytes.** The first solve ran against the
   in-memory buffer, not the saved JPEG the gate reads back, so the JPEG's own
   quantisation showed up as a 1.56/255 residual that had nothing to do with the
   plate. Solve against the saved master, and against the **rounded 8-bit
   alpha** that will actually be stored — the colour solve divides by alpha, so
   a higher-precision alpha than the file carries bakes in the error of a
   divisor that never existed.
3. **A gate that passed on a blank sheet.** The first render used a scheme-less
   filesystem `href`; under `setContent` that fires *no request at all*, so the
   "no failed requests" check passed on a plate with no artwork on it. This is
   the same class of defect already recorded in
   `docs/certificate-number-cartouche.md` §8. Absence of a failure is not
   evidence of presence. Fixed with a data URI **and** a positive ink-coverage
   assertion — a blank plate is one flat colour and reads ~0 luminance spread.
   (An `naturalWidth` check was tried first and false-negatived: SVGImageElement
   has no such property.)

### What is still 92 DPI, and what would fix it

The marks layer. The supplied file is 92.4 DPI over the sheet, which puts every
ornamental stroke at about three pixels wide. Redrawing a three-pixel curve as
vector does not recover the original curve — it invents a plausible one. **A
true 600 DPI vector reconstruction of this artwork cannot be derived from this
file**, not for want of effort but because the information is not in it.

The fix is one input: a higher-resolution export of the same artwork. If the
plate came from a generator or a stock vendor, a larger version almost certainly
exists, and dropping it in needs only a re-run of
`scripts/build-certificate-marks.py` — no code change.

### Additions are opt-in

`microtextRails` adds per-document microtext carrying the live serial, so a
copied sheet carries the wrong serial in its own border. It is **off by
default**: the brief was a faithful rebuild, so the default output is the
client's plate and nothing else. The gate asserts this
("default output adds nothing to the client plate").

### The institutional header

Restored on the Founder's mandatory layout correction of 2026-08-06, and
corrected again the same day: three emblems across the head of the sheet —
Federal Republic of Nigeria at the left, the SHRS crest centred, Lagos State /
Ministry of Basic and Secondary Education at the right.

The **full institutional identity sits beneath the Nigerian arms**, six lines
deep, on the Founder's explicit instruction:

    جمهورية نيجيريا الاتحادية        FEDERAL REPUBLIC OF NIGERIA
    مدارس السلطان حنفي الملكية       SULTAN HANAFI ROYAL SCHOOLS
    قسم الدراسات الإسلامية والعربية   SCHOOL OF ISLAMIC & ARABIC STUDIES

The four school lines were briefly placed under the centre crest instead; the
Founder corrected that. The crest now stands alone on the page's axis and
carries no text of its own. Arabic is Amiri, English is Cinzel — the same
faces, weights and case as the Lagos block opposite, inherited rather than
re-specified so the two blocks cannot drift apart.

The left block runs deeper than the Lagos block (63.00 mm against 53.06 mm)
because it carries six lines to the right's three. Both start from the same
emblem baseline and both are centred on their own emblem; the difference is
the content, not the alignment.

It is scoped to `.sheet[data-stage="IDD"]`; the earlier two-emblem `.hdr-l` /
`.hdr-r` header is untouched and still serves every other stage.

The directive asked for precise centring, symmetric placement, a shared
baseline and equal optical spacing, so those were **measured on the rendered
sheet**, not eyeballed:

| requirement | measured |
| --- | --- |
| SHRS crest centred on the page | 148.50 mm against a 148.50 mm centre — **0.00 mm off** |
| equal optical spacing | 82.00 mm / 82.00 mm |
| shared emblem baseline | Nigeria 41.60 / SHRS 41.60 — **0.00 mm spread** |
| clears the basmala | the left block's ink stops 24.23 mm short of the basmala's glyph horizontally — they never meet |

The baseline started **2.01 mm out**, because badge boxes of different heights
cannot align across a row: each emblem sat at the bottom of its own box, and
the boxes had different bottoms. The fix is one shared box for all three with
`align-items:flex-end`, and emblems sized by the `img`'s own `max-height` —
so the artwork's aspect ratio is never touched. Nothing is stretched, and
nothing is upscaled.

Resolution is asserted, not assumed: `verify-certificate-batch.mjs` reads each
emblem's intrinsic size **out of the PNG header** and divides by its rendered
height — 743 DPI for the Nigeria arms, 711 DPI for the SHRS crest, both above
the 600 DPI the directive prefers. (That gate used to carry transcribed pixel
counts, which would have kept reporting the old numbers after a file swap.)

### A CSS comment that deleted the header

Worth recording because nothing failed. A note added *below* a comment's
closing `*/` left a stray delimiter in the stylesheet. CSS does not throw on
that and does not warn: the parser discards until it resynchronises, which
here silently removed the badge rules. The emblem baseline went 1.8 mm out and
the reserved Lagos slot collapsed — and the batch gate still reported every
check passing, because it was reading the emitted HTML, where the text was all
present.

Two checks now cover it, catching different failures:

* **comment delimiters balance** — catches the stray `*/`;
* **the header's load-bearing declarations appear in the stylesheet with its
  comments stripped** — catches a rule commented out or deleted.

Neither replaces the other: comment stripping and a real CSS parser resolve an
odd `*/` differently, so the second check passes on the exact defect the first
one catches. Both were run against a deliberately reintroduced copy of the bug
before being trusted.

**The Lagos State slot is reserved and empty.** No Lagos emblem exists anywhere
in this repository. The old plate carries one at roughly 60 px, which over a
15 mm emblem is about 100 DPI — upscaling a state emblem to fill the gap is
exactly the invented detail the directive forbids, so the column holds its
approved bilingual wording and waits for real artwork.

---


**Directive:** I'dadiyyah Certificate Background & Border (Release Master)
**Implements:** `functions/_lib/certificate-ground.js`
**Gate:** `scripts/verify-certificate-ground.mjs` — 13 checks, `--render` for proofs
**Status:** **Not wired into the certificate.** Offered for approval. See §2.

---

## 1. The resolution finding

The directive asks for the supplied artwork rebuilt "at true print resolution,
minimum 300 DPI, preferably 600 DPI for the master source," with "perfectly
sharp vector edges."

The supplied file is `official-background-master.jpg`, **1080 × 783 px**. Over a
297 × 210 mm sheet that is **92.4 DPI**. Its JPEG density tag reads 72/72.

There is no higher-resolution content hiding inside it. Measured on the file:

| Measure | Result | Reading |
|---|---|---|
| Block-boundary vs interior gradient ratio | 0.96 | No visible JPEG blocking — it is not a crushed large original |
| Spectral energy within 12 % of Nyquist | 17.0 % | Almost nothing at the fine end |
| within 25 % | 27.8 % | |
| within 50 % | 48.4 % | |

A file with recoverable 300 DPI detail concentrates far more energy near
Nyquist. This one does not. **Upscaling it manufactures exactly the "AI
artifacts, blurry gradients, inconsistent textures" the directive rules out.**

So the only honest route to sharp edges at 600 DPI is to *redraw* the plate as
true vector — which is what a security printer does, and what
`certificate-ground.js` is.

---

## 2. What the rebuild is, and is not — read this before using it

**It is not a faithful reproduction of the supplied composition.** This is a
correction of an earlier claim in this file's own source comments.

The band positions in the module were derived by scanning a single mid-row and
mid-column of the artwork for edges and assuming the result described a
symmetric rectangular frame — outer rule 4.7 mm, engraved band 10.2–14.0,
security strip 21.7–28.1, inner double rule 32.7 / 36.3.

Rendered side by side against the source, that assumption is plainly wrong. The
supplied plate is **not** a set of nested rectangles. It carries:

- navy-and-gold ribbon swags across all four corners, with cloth folds
- a red wax medallion (upper right) on a gold ribbon
- a laurel-wreath badge (upper left)
- **vertical** holographic strips down the left and right edges only
- an **allover** guilloché mesh across the whole field, not a central rosette
- two Islamic mandala medallions, low left and low right
- scattered SHRS shield micro-marks
- the Nigerian coat of arms, the Lagos State coat of arms, the institutional crest
- a QR block baked into the background, lower right
- coloured security fibres, visibly multi-tint
- microtext bands top and bottom, plus a holographic panel lower left

The directive's instruction — *"Do not change the overall composition"* — is
therefore **not satisfied** by this module, and it must not be presented as
satisfying it.

What the module *does* deliver is a resolution-free, press-legal ground in the
same visual family. `functions/_lib/stage-certificate-template.js` is
deliberately **not** wired to it. Swapping it in would also disturb content
positions that were tuned against the raster — notably the number cartouche at
y 172.2–197.5 mm, which was deliberately placed over the *artwork's own*
optically-variable strip and microtext bands (see
`docs/certificate-number-cartouche.md` §1).

### Why a faithful rebuild is not simply more drawing

The ribbons, the wax medallion and the laurel badge are **photographic objects**
— cloth folds, specular highlights, cast shadow. They cannot be derived from a
92 DPI JPEG without inventing detail, and inventing detail is the failure mode
the directive names explicitly.

The Nigerian and Lagos State arms are **official state emblems**. Redrawing an
emblem approximately from a 39-pixel-wide source is not a thing to do quietly on
a document that will be presented as an academic credential.

A faithful rebuild needs one of: the layered/vector original, a higher-resolution
scan, or an explicit brief covering which elements may be re-illustrated.

---

## 3. What the vector plate actually contains

Every item below is constructed geometry with no resolution.

| Layer | Construction |
|---|---|
| Paper tone | Radial gradient, ivory with a warm centre falloff |
| Anti-copy field | Line screen, 0.42 mm pitch at 8°, full bleed |
| Second anti-copy screen | 0.44 mm pitch at 53°, on the security strip |
| Radial engraving | Epitrochoid rosette at sheet scale, three counter-phased passes |
| Central watermark | Concentric 16/12/12/8-fold star rings, blind-emboss pairing |
| Paper fibres | 150 deterministic curved fibres in five tints |
| Border architecture | Engraved rules at the insets in §2, three strokes each (lit edge / ink / shadow wall) |
| Ornamental band | Gold gradient under a 0.30 mm engraving screen at 68° |
| Iridescent strip | Seven-stop gradient, pale, non-saturated |
| Microtext rails | Two `textPath` rings, 0.90 pt and 0.80 pt, carrying the live serial |
| Corner engravings | One construction mirrored four ways by transform, so all four are provably identical |
| Security medallions | Four mid-edge rosettes |
| Registration ornaments | Four crosshairs, solid ink |

### Guilloché, and a bug worth recording

A rosette's lobe count is `R / gcd(R, r)`. The first draft used ratios like 7:3,
which close after ten loose loops and **render as scrawl across the sheet** — it
looked like scribble, not lathe work. A rose engine runs a large coprime `R`
against a small `r` to cut sixty-odd fine petals. The step count has to follow:
at a flat 1440 steps a 61-lobe figure gets 23 points per petal and comes out
faceted.

The second bug was the mirror of the first. Once the spec was fixed at 61 lobes
it was correct across a 96 mm sheet field and **collapsed into an illegible
smudge on the 5 mm mid-edge medallions.** `rosette()` now selects its spec by
scale, targeting a ~3 mm petal pitch at the outer radius, so every rosette on
the plate is cut at the same visual grain.

---

## 4. Press limits, enforced mechanically

The gate parses the emitted SVG. These are not assurances, they are assertions.

- **No `opacity` attribute anywhere on the plate.** On a hairline an opacity
  becomes a screen percentage at separation, and a screened hairline is the
  first thing to drop out on press. Every pale tone is pre-mixed against the
  paper and emitted as a flat hex — the ink is specified, not a tint of it.
  The first draft violated this in twelve places.
- **Every stroke ≥ 0.07 mm**, the screen floor. Measured range 0.07–6.40 mm
  across 250 strokes. On **uncoated** stock the floor rises to ~0.15 mm — tell
  the printer the stock before plating.
- **Microtext ≥ 0.75 pt.** Set at 0.90 and 0.80.
- **No raster, no filter, no blend mode** — the three things that would put a
  resolution ceiling back into a file that is supposed to have none.
- **Only approved wording.** The gate tokenises the microtext and rejects
  anything that is not the institution's own name, "OFFICIAL ACADEMIC RECORD",
  or a well-formed serial. No slogan or claim can reach the plate by accident.

### The bug this gate exists for

The first draft of the module shipped two paint values that were not colours:
`stop-color="#D8B css"` and `'#C6B punkt'`. An SVG with a bad paint **does not
throw** — the renderer silently drops it and draws nothing. The plate would have
gone to press missing a gold gradient and an entire security screen, with every
visual check still passing. Hence the paint-validity check, the dangling-`url()`
check, and the orphaned-paint-server check, all of which are mechanical.

---

## 5. Proofs

`node scripts/verify-certificate-ground.mjs --render` writes

    build/certificate-ground/ground.svg
    build/certificate-ground/ground-300dpi.png     3506 × 2478
    build/certificate-ground/ground-600dpi.png     7013 × 4956

rendered through the **same Chromium binary the certificate PDF is printed
from**, sized in CSS millimetres with `deviceScaleFactor` carrying the
resolution — so the vector is rasterised once at the target DPI. Nothing is
rendered small and enlarged.

At 600 DPI the microtext rails resolve as readable type, the engraving screen in
the ornamental band resolves as discrete lines, and the corner volutes hold a
clean edge. That is the deliverable the directive asked for; it is just a
deliverable for a **different plate**.

---

## 6. Open items

1. **Decision required:** approve this redrawn plate as the master, or supply
   the layered/vector original so the existing composition can be rebuilt
   faithfully. The two are different jobs.
2. If the redraw is approved, the ribbons / wax medallion / laurel badge / two
   coats of arms still need an explicit instruction: re-illustrate, source at
   higher resolution, or omit.
3. Content positions in `stage-certificate-template.js` are tuned to the raster
   and would need re-measuring against any new ground.
4. The latent image in the number cartouche remains **present but unproven** and
   needs a press proof through a real photocopier —
   `docs/certificate-number-cartouche.md` §4. Nothing in *this* file is a latent
   image; the two anti-copy screens here are anti-copy screens and should be
   described to the printer as such.
