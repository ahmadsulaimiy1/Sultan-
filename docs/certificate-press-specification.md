# Certificate Press Specification

> **For the printer.** Every number below was measured off the files that will
> be sent — not off the design intent, not off a stylesheet. Where a number
> came out of a raster rather than out of the source, the measurement is stated
> so it can be re-taken.
>
> **Three questions at §10 need answers in writing before the file can be
> finished.** Everything else here is settled and will not move.

Reference batch throughout: `dist/certificates/2026-08-08-IDD-000042/` —
I'dādiyyah (Intermediate Stage), six certificates, archive sequence
000042–000047, issued 2026-08-08.

---

## 0. The files

| File | What it is | Size |
|---|---|---|
| `SHRS-IDD-2026-000042-000047-press.pdf` | The press file. 6 pages, one certificate per page, in archive-sequence order. | 19,943,161 bytes |
| `000042-717455243759974-600dpi.png` … `000047-…-600dpi.png` | One 600 DPI proof raster per certificate, for approval and for the archive. Not for plate-making. | ~37 MB each |

Both are produced by `scripts/render-certificate-batch.mjs` from the HTML in the
same directory. Filenames carry the 6-digit archive sequence and the 15-digit
Student ID; neither is decorative and neither may be renamed.

**The PNGs currently in the archive were made before that script existed and
carry no `pHYs` chunk** — see §8. Re-render the batch before sending anything
to press.

---

## 1. Trim, page box, bleed

| | |
|---|---|
| **Trim size** | **297.0 × 209.5 mm**, landscape |
| PDF page box (MediaBox) | 841.92 × 594.96 pt = **297.01 × 209.89 mm** |
| Trim position on the page | flush to the **top** and **left** (the page is 0.01 mm wider than the trim — negligible, but it is on the right) |
| Surplus | **0.39 mm at the foot**, full width. Flat `#FDF6E3`. |
| **Bleed** | **none. 0 mm.** |
| TrimBox / BleedBox in the file today | absent (see §11) |

The trim is **not A4**. A4 landscape is 297 × 210 mm; this sheet is 0.5 mm
shallower. Nothing about the layout tolerates being treated as A4.

The page box is not the trim either. Chromium writes the page from the sheet's
own `@page` rule and the drawn sheet does not fill it, so every page carries a
0.39 mm band of flat paper colour along the bottom edge. Measured on the press
PDF rasterised at 600 DPI (7016 × 4958 px): the artwork's last row is 4949, and
rows 4950–4957 are a single uniform colour, `#FDF6E3`. That band is **not**
bleed — it is a different flat colour from the sheet's own edge tone
(`#F4ECE1`-ish), so trimming into it will show.

**There is no bleed and the artwork is edge-to-edge.** Measured on the same
raster: ink reaches the top, right and bottom trim edges at every luminance
threshold tested down to 80/255, and the left edge down to 140/255 (0.25 mm
inset at 100/255, 0.80 mm at 80/255). So any trim variance at all will show
white or wrong-coloured paper on three edges and the flat band on the fourth.
If bleed is required, say so and the artwork will be extended —
`scripts/make-pdfx.py` deliberately **refuses** to declare a bleed that has no
artwork behind it.

## 2. Safe area

Two layers, two answers.

**The security ground and the supplied plate marks run to the trim on all four
sides — 0 mm.** Corner ribbon swags, the engraved frame and the microtext rails
are all part of that layer.

**The editorial layer** — everything the certificate generator sets: the
institutional header, the names, the award text, the data grid, signatures,
seals, the verification panel, the barcode and the QR — sits well inside:

| Edge | Nearest editorial ink |
|---|---|
| Top | 25.0 mm |
| Left | 37.2 mm |
| Right | 42.2 mm |
| **Bottom** | **11.6 mm** — the tightest edge |

Measured by hiding `.official-bg`, `.official-paper`, `.o5-plate-paper` and
`.o5-plate-micro`, rendering the remaining layers on white at 288 DPI, and
taking the ink bounding box.

## 3. Colour

| | |
|---|---|
| Colour space in the file | **100 % DeviceRGB.** 170 `/DeviceRGB` declarations, **zero** `/DeviceCMYK`. |
| Output intent | **none.** No ICC profile is embedded. |
| Darkest tone in the artwork | `#221A10` (the house "espresso") |
| Paper ground | radial, `#F7F1E6` → `#F4ECDF` → `#EFE5D2`, over a flat `#F4ECDF` |
| Metallic gold range | `#6E5013` → `#8C6516` → `#B8860B` → `#D4AF37` → `#F1E3B2`, plus a 9-stop foil gradient on the name lines |
| **Pure `#000000`** | **the Code 128-C barcode and the QR symbol, and nothing else.** Confirmed by locating every pure-black pixel in the 600 DPI raster: two clusters, x 175.2–206.2 mm (barcode) and x 213.6–227.3 mm (QR). |

The RGB→CMYK separation has **not** been done, and doing it is not our call —
it depends on the profile, the rendering intent, the black generation and the
ink limit, all of which are §10 questions. See §11 for what happens after they
are answered.

## 4. Type

All type is **live text**, not outlines. Every face is embedded as a subset.

| Family | Role | Subsets in the file |
|---|---|---|
| Cinzel | English display — titles, the name line | Regular, Bold |
| Cormorant Garamond | English text | Medium, Medium Italic, SemiBold, Bold |
| Amiri | all Arabic | Regular, Bold |
| Inter | utility — serials, microtext, panel labels | Regular |

11 subset-embedded TrueType fonts (`/FontFile2` × 44, all `/Type0` /
`/CIDFontType2`).

**32 of the fonts are Type 3.** Chromium emits a Type 3 font when it must draw
glyphs as procedures rather than outlines, which is what the gold-foil gradient
on the two name lines forces. Their glyphs are embedded as `/CharProcs` content
streams — they are self-contained and correct, but they are the one thing in
this file most likely to trip an old RIP. **Please proof the name line
specifically.**

Smallest type sizes, measured:

| Element | Size |
|---|---|
| **Covert serial repeat in the certificate-number plate** | **0.265 mm em = 0.75 pt** — the smallest type on the sheet |
| Plate microtext rail B | 0.282 mm em = 0.80 pt |
| Plate microtext rail A | 0.318 mm em = 0.90 pt |
| Band microtext (`.band-micro`) | 2.3 pt = 0.81 mm em |
| Verification-panel microtext (`.vp-micro`) | 2.5 pt |
| Serial microtext under the name | 2.9 pt |

Measured ink on the 600 DPI press raster, rail A (x 40–257 mm at y 67.6 mm):
**0.21 mm tall**, 5 raster rows. The covert repeat at 0.265 mm is smaller again.
If your process cannot hold 0.21 mm legibly, say so — the microtext is a
security device, not decoration, and it needs to be reset rather than dropped.

## 5. Line work — stroke-width floors

All vector. Widths are in millimetres (the drawing viewBoxes are 1 unit = 1 mm).

| Stroke | Count | Where |
|---|---|---|
| **0.050 mm (0.14 pt)** | 2 | outline of the star in the certificate-number cartouche |
| **0.070 mm (0.20 pt)** | 58 | the cotton-laid paper screen and other fine screens |
| 0.075 mm | 3 | |
| 0.080 mm | 11 | |
| **0.090 mm (0.26 pt)** | 320 | the dominant hairline — guilloche and rules |
| 0.100–0.140 mm | 54 | frames, panel rules |
| 0.220 / 0.260 mm | 6 | heavy rules |

CSS borders run 0.080–0.300 mm; the finest is 0.080 mm.

**The floor is 0.05 mm = 0.14 pt.** That is below the 0.25 pt hairline most
litho specs quote. Nothing here is a "hairline" keyword — every stroke is an
explicit width — but confirm your reproduction floor and we will raise anything
underneath it rather than let it drop out or fill in.

## 6. Machine-readable marks

Both must survive. They are what makes the certificate verifiable.

### Code 128-C barcode

| | |
|---|---|
| Payload | `2026000042` (year + 6-digit archive sequence) |
| Placed size | 30.998 × 5.399 mm at x 175.2, y 186.7 mm |
| **X-dimension (narrow module)** | **0.3444 mm** (31 mm over 90 module units) |
| Bar height | 5.4 mm |
| Colour | pure `#000000`, vector rectangles |
| Frame | 0.09 mm rules top and bottom, 3.4 mm quiet zone left and right |

Drawn with `preserveAspectRatio="none"`, so the bars are scaled horizontally
only — do not re-scale the barcode non-uniformly again.

### QR

| | |
|---|---|
| Symbol | 41 × 41 modules (QR version 6) |
| Quiet zone | 4 modules on all sides, drawn (49 × 49 total) |
| Placed size | 16.47 mm square |
| **Module pitch** | **0.336 mm** |
| Colour | pure `#000000` on `#FFFFFF`, `shape-rendering="crispEdges"` |

Both are the reason for the pure-black question at §10.3.

## 7. What is vector and what is not

**Vector (resolution-free):** the paper ground and its laid texture, the
guilloche, all microtext rails, the engraved frame, the title cartouche, the
certificate-number plate, the verification panel, the barcode, the QR, and
**all type**.

**Placed raster:**

| Image | Pixels | Placed at | **Effective DPI** |
|---|---|---|---|
| `official-background-idd-marks.png` — the supplied plate marks | 1080 × 762 | 297.0 × 209.5 mm | **92** |
| `official-seal.png` | 1034 × 1015 | 26.00 × 25.52 mm | 1010 |
| `signature-principal.png` | 2336 × 753 | 26.67 × 8.60 mm | 2224 |
| `signature-chairman.png` | 391 × 243 | 13.83 × 8.60 mm | 718 |
| `nigeria-coat-of-arms.png` | 492 × 439 | 16.81 × 14.99 mm | 743 |
| `shrs-institutional-crest.png` | 520 × 476 | 18.57 × 17.00 mm | 711 |
| `lagos-state-arms.png` | 223 × 239 | 13.99 × 14.99 mm | 405 |
| `security-emblem-shrs.png` | 170 × 186 | 10.00 × 10.93 mm | 432 |

### The 92 DPI problem — read this one

The full-sheet marks layer is **92 DPI**. That is the client's supplied
artwork, it is the only copy that exists, and it covers the whole sheet. At
600 DPI output each of its source pixels becomes a 6.5 × 6.5 device-pixel
block — directly visible in the press raster as runs of 6–7 identical pixels
along any scanline through that layer.

Everything that could be lifted off it already has been: the paper it sits on
was rebuilt as flat vector, and the title cartouche was cleared from the raster
and re-set as live type. What remains on the raster is the ornament — corner
swags, wax medallions, holographic strips, the mandala watermark.

**We are not claiming this layer is press resolution.** Tell us what you need.
If 92 DPI will not hold, the ornament has to be re-drawn or re-supplied, and
that is a decision for the Founder, not a setting.

## 8. The 600 DPI proofs

| | |
|---|---|
| Pixels | **7019 × 4950** |
| Effective resolution | 600.3 × 600.1 DPI over the 297.0 × 209.5 mm trim |
| Colour | 8-bit RGB, no ICC profile |

The 0.3 DPI overshoot is Chromium snapping a millimetre-sized box onto whole
device pixels; it is reproducible and it is asserted by the renderer.

**The PNGs in the archive today declare no resolution at all.** Chromium does
not write a `pHYs` chunk, so a 7019 px file has no physical size and a placement
tool falls back to its own default — at the usual 72 or 96 DPI that puts the
certificate on the page 2.48 m or 1.86 m wide. The pixels were always 600 DPI;
the file never said so.
`scripts/render-certificate-batch.mjs` now writes `pHYs = 23622 × 23622 px/m`
(= 600 DPI) and refuses to emit a PNG without it. **Re-render before sending.**

## 9. Transparency — the reason §10.2 matters

The artwork uses **live transparency throughout**. In the press PDF:

| | |
|---|---|
| Transparency groups | 699 |
| Soft masks (`/SMask`) | 158 |
| `/ExtGState` objects | 845 |
| Constant alpha (`/CA`, `/ca`) | 15 / 40 |

In the source, per sheet: 54 elements at `opacity:0.5` and a further 33 at other
fractional opacities; `mix-blend-mode:multiply` on the security emblem and on
both signature images; `mask-image` gradients that fade out the two microtext
rails (`.band-micro`, `.vp-micro`); and `drop-shadow()` filters on the official
seal (a two-layer cast shadow) and on the security emblem.

This is not ornament that can be switched off. The foil name treatment, the
emboss depth, the seal shadow and the fading microtext rails are all built on
it, and flattening visibly degrades them — see §11 for the measurement.

---

## 10. THREE QUESTIONS — answers required in writing

Nothing further can be finished until these are answered. They are not
preferences; each one blocks a specific, identified step.

### 10.1 Which ICC output profile?

Send the `.icc` you want the file prepared for — a standard characterisation
(FOGRA, GRACoL, …) or your own press profile, whichever you actually proof and
print against.

*Why it blocks:* a PDF/X file **is** a PDF plus an output intent, and the output
intent is your characterisation of your press, your paper and your ink. There is
no safe default and we will not guess one — guessing would ship a file that
states, in machine-readable form, a printing condition nobody agreed to. It also
blocks the RGB→CMYK separation (§3), because the separation is *to* that profile.

### 10.2 Which PDF/X part — and specifically, will you accept PDF/X-4?

*Why it blocks, and why we are asking about X-4 by name:*

The artwork is built on live transparency (§9). **PDF/X-1a and PDF/X-3 forbid
live transparency** and force a flatten. **PDF/X-4 permits it.** So the choice
of part is not a metadata setting — it decides whether the certificate survives.

We measured the flatten. Ghostscript 10.02.1 with `-dPDFX
-dPDFXVersion=PDF/X-3` produced a file that identifies cleanly as PDF/X-3 and is,
as a certificate, destroyed:

| | Original press PDF | After `gs -dPDFX` |
|---|---|---|
| Pages | 6 | 6 |
| Embedded font subsets | 11 (44 `/FontFile2`) | **0. No `/FontFile` of any kind.** |
| Image XObjects | 144 | **6 — one per page** |
| That image | — | **3507 × 2479 DeviceCMYK = 300 DPI** |
| Soft masks | 158 | 0 |
| Measured ink in the foil name band | 19.16 % of area | **15.84 %** |

Every glyph, rule, guilloche line and microtext rail became a 300 DPI raster.
Re-running it at 600 DPI produces the same thing, larger. **`gs -dPDFX` is not a
route to a PDF/X certificate and will not be used.**

If you require X-1a or X-3, say so and the artwork will be rebuilt without
transparency by a designer. That is a redraw, not a conversion setting.

### 10.3 Maximum total area coverage — and must pure black stay 100 % K?

Two parts, both needed:

1. **Your TAC limit** (e.g. 300 %, 320 %). The darkest artwork tone is `#221A10`
   and the sheet carries large solid dark areas, so the separation has to be
   built to your limit rather than trimmed to it afterwards.

2. **Must pure black stay 100 % K?** The **Code 128-C barcode and the QR symbol
   are drawn in pure `#000000`** (§3, §6) and they are the only pure black in the
   file. Separated into a rich four-colour black they will pick up registration
   spread, the bars and modules will thicken unevenly, and the codes will stop
   scanning. If your workflow needs them explicitly protected, tell us and they
   will be tagged before separation.

---

## 11. Where the PDF/X file stands

The press PDF today has: **no output intent, no XMP packet, no TrimBox, no
BleedBox, no `/Trapped`, no file `/ID`.** It is a correct PDF and it is not a
PDF/X.

`scripts/make-pdfx.py` adds all six **losslessly**, by incremental update — it
appends new objects and rewrites only the page dictionaries, the catalogue and
the Info dictionary. It does not touch a single content stream, font or image.
Proved: all six pages of the labelled file rasterise **byte-identically** to the
original at 150 DPI, and the original bytes are verified unchanged at the head of
the output file.

It requires the ICC profile as an argument and refuses without one. It also
refuses to:

* emit an X-1a or X-3 label, because it cannot flatten and such a label would be
  a false claim of conformance — the failure in §10.2 with the honesty removed;
* label a DeviceRGB document with a CMYK output intent, because attaching an
  intent does not convert a file;
* declare a bleed that has no artwork behind it.

The day the profile arrives:

```sh
python3 scripts/make-pdfx.py --icc <printer-profile.icc> \
  dist/certificates/2026-08-08-IDD-000042/SHRS-IDD-2026-000042-000047-press.pdf \
  dist/certificates/2026-08-08-IDD-000042/SHRS-IDD-2026-000042-000047-pdfx.pdf
```

It writes `TrimBox`/`BleedBox` `[0 1.1017 841.8898 594.96]` on every page — the
297.0 × 209.5 mm trim anchored to the top of the page, per §1 — `/Trapped
/False`, an XMP packet carrying `pdfxid:GTS_PDFXVersion`, the output intent with
the profile embedded, `/Version /1.6` on the catalogue (PDF/X-4 is defined on
PDF 1.6; the file's header says 1.4), and a deterministic file `/ID` derived from
the input's SHA-256.

If the answer to §10.1 is a CMYK profile, the colour conversion happens **first**
and is a separate step; the script will tell you so and stop. Ghostscript can do
that conversion without destroying the artwork — measured on this document,
`-dColorConversionStrategy=CMYK` at PDF 1.4 kept all 44 embedded font streams,
117 image XObjects and 94 soft masks, unlike `-dPDFX` which kept none of them.

**Neither script issues a conformance certificate.** Run your own preflight
before release.

## 12. Regenerating the artefacts

```sh
node scripts/render-certificate-batch.mjs dist/certificates/2026-08-08-IDD-000042
```

Renders the press PDF and the six 600 DPI PNGs from the HTML in that directory,
serving the repository root over a temporary local HTTP server (the sheets link
their fonts and images root-absolutely and will not render from `file://`).

Everything in §1 and §8 is **asserted**, not assumed: page count against the
number of sheets, cross-checked three ways; every page's MediaBox against
841.92 × 594.96 pt to 0.05 pt; every PNG at 7019 × 4950 px, cross-checked as
600 ± 2 DPI over the trim; and `pHYs` present at 23622 px/m. Artefacts are
staged and only moved into place once they pass — a wrong-sized press file is
never left where someone could pick it up and mail it.

Rendering does not touch certificate numbers, Student IDs or content hashes.
Those are issued by `scripts/issue-certificate-batch.mjs` and are already fixed
for 000042–000047.
