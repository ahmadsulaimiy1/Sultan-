# The Certificate Number Security Cartouche and Verification Station

**Directives:** Premium Certificate Number Security Panel · Zero-Compromise
Production Master, 2026-08-06
**Implements:** `certificateNumberCartoucheSvg()` and `verificationGroundSvg()` in
`functions/_lib/stage-certificate-template.js`; `qrSvgForPrint()` in
`functions/_lib/qrcode.js`
**Gates:** `scripts/verify-certificate-batch.mjs` · `verify-certificate-layout.mjs` ·
`verify-certificate-codes.py`

This document exists so nobody has to guess later which of these features is a
real control and which is a picture of one. The ledger in §4 is written to be
handed to a printer.

The two authentication devices bracket the printed seal: the engraved number
cartouche at lower left (§1–§5), the verification station at lower right (§7).
Neither is decorative framing around a value — both are constructed as security
print, and §4 says exactly how far that claim goes.

---

## 1. Where it sits, and why there

The panel is at **x 59–121 mm, y 172.2–197.5** — the Verification Module's exact
width and vertical band, mirrored across the seal.

That position was not chosen for symmetry. It was measured. A chroma scan of the
locked artwork finds an **optically-variable strip already printed in the lower
left**: a\*/b\* spread of 3.8–4.6 / 4.7–6.7 against a plain-paper baseline of
0.77 / 3.10, occupying **x 60–120 mm, y 185.6–196.2**, with the artwork's own
microtext rules immediately above (183.2–184.8) and below (196.2–197.5).

That strip is 60 mm wide — the same width as the verification plate opposite. The
original artwork plainly reserved a panel here.

So the cartouche is drawn **around** those devices rather than over them. The
paper's own hologram becomes the panel's integrated bottom edge; the paper's own
microtext becomes the panel's microtext bands. This is the only reading of *"part
of the paper itself, not pasted on top"* that is literally true, and it repeats a
lesson already recorded in this codebase: do not composite a second hologram over
a hologram the sheet already carries.

Everything newly drawn therefore lives in the clean field **y 0–11 mm** of the
panel (absolute 172.2–183.2), measured at 1–9 % ink coverage and plain-paper
chroma. Nothing is drawn below that line.

**Verified clear:** signature blocks end at y 171.2 (1 mm above); the seal starts
at x 131.5 (10.5 mm clear). The collision audit runs against the panel on every
sheet — `scripts/verify-certificate-layout.mjs`, 7/7 clean.

---

## 2. The printed number

    stored    SHRS-CERT-IBT-2026-000035-FB287
    printed   SHRS-CERT-IBT-000035-FB287

**Exactly one segment is removed — the issue year.** Everything else the
institutional numbering system carries is retained.

### Why the tail is never dropped

`FB287` is the first five hex characters of this certificate's own
HMAC-SHA256 over its canonical fields, keyed by `DOCUMENT_HASH_SECRET`. It is
what makes the **printed** number self-authenticating:

- a forger can invent a plausible sequence, but cannot compute a matching
  tail without the secret;
- a verifier holding the paper can compare the tail against the verification
  plate's printed code — whose first five characters *are* this tail —
  **without a database at all**;
- at lookup, a supplied tail is pinned into the query, so a wrong tail
  returns nothing rather than resolving to the real record.

An earlier revision printed `SHRS-CERT-IBT-000035`, dropping the tail along
with the year because the directive's worked example happened to omit it.
That mistook the example for the specification and removed the number's only
self-checking property — a downgrade in the security function of the number,
and the one thing the directive said to keep. The gate now refuses a batch
whose printed number has no valid tail, or whose tail is not derived from
that certificate's content hash. Both failures were exercised against
deliberately mutated batches before this was committed.

### Why dropping the YEAR is safe

`<seq6>` is one global sequence (`stage_certificate_serial_seq`,
`sql/schema.sql:1925`) — sequence 000035 is issued once, ever, across every
year and every programme.

That was a convention, not a constraint. It is now a constraint: the register
SQL creates a unique index on the derived printed number, so two certificates
can no longer differ only in year while printing the same number.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no,'-',3) || '-' || split_part(serial_no,'-',5)));
```

Verification accepts the full stored serial, the printed number with its
tail, or the printed number without it — `resolveStageCertificateRef()` in
`functions/_lib/certificate-serial.js`. Two matches returns *ambiguous* and
refuses to guess.

## 3. Typography

**Cormorant Garamond 600, oldstyle figures**, per the directive.

Oldstyle is the family's **default** — verified from the font binaries, not
assumed: cap height 625; 3/4/5/7/9 descend to −275; 6 rises to 661; 8 to 574;
0/1/2 sit at x-height. Cormorant exposes `lnum` to get lining figures, not `onum`
to get oldstyle, which is the signature of a text-figure font. No feature tag is
needed.

The number is set twice — a pale warm copy offset 0.17 mm down-and-right as the
incision wall, then the dark ink copy over it. That pairing is what reads as
letterpress rather than as flat type.

### A recorded reservation

At x-height, the zeros in `000035` read as lower-case o's: the number resolves
visually as **SHRS-CERT-IBT-oooo35-FB287**. This is the same finding already
recorded against `.bg-v-id` in the template, where lining figures were chosen for
identifiers for exactly this reason.

Restoring the check tail sharpens the objection rather than softening it. The
tail is not a label — it is a credential a verifier compares **character by
character** against the plate's `FB28-7085-AE77`. In oldstyle, `FB287` sets an
x-height 2, an ascending 8 and a descending 7, so the one segment on the
document that most needs to be unambiguous is the one the figure style unsettles
most.

Implemented as directed. `CN_FIGURE_STYLE` switches it to `'lining'` in one line,
same font, no other change.

---

## 4. Feature ledger — what is real

Written to be handed to the printer. "Achievable in artwork" means the vector file
delivers it. Anything else needs something the artwork cannot supply.

| Feature | Status | What is actually delivered |
|---|---|---|
| Microtext border | **Real** | `textPath` on the cartouche outline, 0.90 pt, carrying the full serial including the year and suffix the visible number drops. Verified: illegible at 300 DPI, fully resolved at 1200 DPI. |
| Microscopic serial repeats | **Real** | A second covert band at 0.75 pt on a different rhythm, so reproducing one still misses the other. |
| Anti-copy / anti-photocopy screen | **Real** | 0.48 mm pitch (~53 lpi) at 8°, off both 0° and 45° so it clashes with copier screen angles. Verified: a simulated copy degrades visibly into speckle. |
| Anti-copy guilloché | **Real** | Parametric epitrochoid, the same lathe geometry as the frame medallions. |
| Engraved rosette behind the number | **Real** | Three counter-phased epitrochoid layers, clipped to the clean field. |
| Engraved ornamental frame / cusped outline | **Real** | Ogee-arched ends and chamfered corners — a shaped cartouche, not a rounded rectangle. |
| Corner flourishes | **Real** | Constructed volutes, in the sheet's existing vocabulary. |
| Sharp at 300/600/1200 DPI | **Real** | Pure SVG, no filters, no blend modes. Verified by rasterising the PDF at all three. |
| Holographic strip on the bottom edge | **Real, but the paper's** | The artwork's existing optically-variable strip, measured and framed. **No new hologram was printed** — a simulated iridescent gradient over a real one would replace a security device with a picture of one. |
| Embossed appearance | **Simulation** | Offset light/dark duplicates. Real embossing is a die that deforms the sheet. |
| Letterpress effect | **Simulation** | The incision-wall pairing described above. Real letterpress is impression depth. |
| Metallic gold ornament | **Simulation unless foiled** | The khatam boss is drawn with a metallic gradient. For real metallic it must go on a `METALLIC-GOLD` spot separation at 100 %. |
| UV registration markers | **Marks only** | Four crosshairs showing a UV unit **where** to lay down. This is not fluorescent ink and does not glow. Fluorescence needs a dedicated press pass. |
| Rainbow security fibres | **Not delivered** | Fibres are embedded in the paper at the mill. Nothing in artwork can produce them. The honest deliverable is a substrate spec: 120–160 gsm security bond with visible and UV-fluorescent fibres. |
| **Latent image** | **Present but UNPROVEN** | See below. |

### The latent image — stated plainly

The geometry is there and coverage-matched: 0.07 mm on a 0.48 mm pitch against
0.14 mm on a 0.96 mm pitch, the same 0.147 ink fraction, so the two read as one
tone flat-on while a copier's threshold should treat a coarse ruling and a fine
one differently.

**I could not demonstrate that it separates.** Measured on the rendered panel: 4.4
grey levels flat-on (near-invisible, as intended) and 3.3–4.6 after a simulated
copy — i.e. it does not *increase* on copying, which is the whole point. An
angle-only change was tried first and measured 1.05× separation, which is none.

A simulation is a model, not a copier. This is the one feature here that software
cannot finish proving. **Settle it with a press proof run through a real
photocopier before anyone relies on it.** Until then it should be treated as
decoration, which is exactly what the directive said nothing should be.

---

## 5. Press limits baked into the file

- Structural strokes **≥ 0.10 mm**; screen strokes **≥ 0.07 mm**. The first pass
  used 0.045–0.05 mm, below what a commercial press holds. On **uncoated** stock
  the floor rises to ~0.15 mm — **tell the printer the stock before plating.**
- Microtext **0.90 pt** (ring) and **0.75 pt** (repeats). 0.6 pt is the absolute
  floor and only on coated at 300+ lpi; on uncoated it fills in and becomes a
  grey line carrying no information.
- Fine linework carries **solid light ink, never an opacity value**. An opacity on
  a hairline becomes a screen percentage at separation, and a screened hairline is
  the first thing to drop out on press.
- The panel viewBox is in **millimetres**. Every `font-size` is therefore in mm,
  written as `n * PT`. Passing a point value straight through set the number
  126.6 mm wide inside a 62 mm panel on the first run.

---

## 6. Defects this work found and fixed

1. **`graduation-register.sql` could not be imported.** It named a `status` column
   `stage_certificates` has never had, omitted two NOT NULL columns, and called
   `setval` on `stage_certificate_seq` — a sequence that does not exist. If the
   sequence is never advanced, the Registrar re-issues 000035 to a different
   student in a later year, and with the year no longer printed those two
   documents carry the **identical printed number**. Fixed, and the gate now
   checks every column and sequence against `sql/schema.sql`.
2. **SVG font-size unit error** — see §5.
3. **Hairlines and microtext below the press floor** — see §5.
4. **The Arabic label overflowed the frame**, because an RTL run with
   `text-anchor:end` measures from its own logical end, not the visual one.
5. **The printed number lost its anti-forgery tail** — see §2. Caught by the
   Founder, not by me. The gate that would have caught it now exists, and the
   advance model that sizes the number is now composition-aware, because a
   per-character mean calibrated on the 20-character form silently mis-sized
   the 26-character one.

---

## 7. The verification station (lower right)

The directive asked for the verification block to stop being a QR next to some
text and become "one integrated authentication station." It is now a single
engraved ground — `verificationGroundSvg()` — with the payload elements sitting
*in* it rather than on it: canted-corner double frame, microtext ring carrying
the live serial, anti-copy line screen, deterministic security fibres, an
iridescent wash, two guilloché medallions, corner volutes, UV registration
motifs, and a deboss pairing, all drawn in the same vocabulary as the number
cartouche so the two read as a matched pair either side of the seal.

What it carries, all of it live per student: the QR, the Code 128 archive
barcode, the Document ID, the verification code, the archive reference, a
microprint rail of the repeated serial, the public verification URL, and the
bilingual void clause.

### The QR

Rebuilt against ISO/IEC 18004 after the defect in §8.1:

- **Filled rectangles, no strokes.** Horizontally adjacent modules merge into one
  rect, so module edges are continuous rather than butt-jointed, and there is no
  renderer-dependent stroke width to be resolved differently on screen and on
  press.
- **Quiet zone 4 modules** (§6.3.8). The previous call site used 2.
- **Pure `#000000`.** The symbol separates as 100 % K on a single plate. The warm
  near-black it used before builds from four plates, and any misregistration
  softens every module edge.
- **Error correction H** (~30 % recovery), 49 modules across 16.7 mm — a
  **0.341 mm module pitch**, 4.0 px at 300 DPI.

### The barcode

Code 128-C over the archive number, pure black, bar height raised from 2.7 mm to
**5.4 mm** (~15 % of symbol length, the acquisition floor for a hand scanner) by
reclaiming ~3 mm from the text column. Side quiet zones are 3.4 mm — the full
10× narrow-module width the symbology requires, which is why the barcode's width
and not the QR's size is what constrains this panel's layout.

### What was measured, not assumed

`scripts/verify-certificate-codes.py` rasterises the **real print PDF** at 150,
200, 300 and 600 DPI and decodes it with ZXing, an independent decoder. All 7 QR
codes and all 7 barcodes decode at all four resolutions, each to its own register
entry. The QR additionally decodes at 120 DPI; the barcode does not, which is why
150 is the stated floor rather than a rounder number.

The gate reads the **whole page**, not a crop. See §8.3.

---

## 8. Defects this work found and fixed (production-critical)

### 8.1 The QR in the print PDF was unreadable — by anything, at any resolution

The most serious defect in this document's history, and every earlier check
passed it.

The `qrcode` package's SVG renderer draws the symbol as **stroked paths with no
`stroke-width`**, relying on the consumer's default. A browser resolves that to
1 user unit and the code looks perfect on screen — but through Chromium's print
pipeline the modules came out as hairlines. Measured on the production PDF:
**12.1 % dark coverage at 300 DPI falling to 5.7 % at 1200 DPI**, against the
52 % the matrix actually contains. Coverage that *drops* as resolution rises is
the signature of a hairline. Neither ZXing nor OpenCV could read it at any
resolution.

Nothing caught it because the screen render decoded fine. The lesson is now
structural: **the gate decodes the PDF, not the DOM.**

### 8.2 The barcode read only at 600 DPI

2.7 mm bars. A code that needs an archival scanner is not a code anyone can use.
Fixed by the height increase above; it now reads from 150 DPI.

### 8.3 The code gate reported seven false failures

The first version of `verify-certificate-codes.py` cropped to hand-measured
millimetre boxes and reported **all seven QR codes unreadable at 150 DPI**. They
were not. The same symbol decoded at the same resolution from a slightly tighter
crop and from a slightly wider one — what failed was the crop framing.

Hand-drawn regions are also an invitation to widen the window until the page
passes, which is the opposite of a gate. It now decodes the whole page: a scanner
is handed the sheet, not a region of it, and finding the symbols amid the
guilloché, microtext and security ground is the harder test.

A second bug in the same file: ZXing spells its format names `QR Code`/`Code 128`
in some builds and `QRCode`/`Code128` in others. Comparing verbatim silently
failed every page. The name is now normalised.

### 8.4 Proving the gate can still fail

A green gate is worth nothing until it has been shown to go red. Three controls
were run against a single rebuilt page:

| Control | Result |
|---|---|
| Page 1 carrying **page 2's** verification URL — a real, scannable code pointing at the wrong student | **Fails** at all four resolutions. This is the catastrophic failure mode for a batch, and the gate catches it. |
| Modules redrawn as **hairlines**, reproducing §8.1 | **Fails** at all four resolutions. |
| SVG quiet zone dropped to **zero** | **Still decodes.** Reported honestly: it is not a defect in this composition, because the white QR field supplies the quiet zone whatever the SVG's own margin is. The gate does not cover this and is not claimed to. |

An earlier, weaker control — the original hairline renderer on a blank white page
— *decoded*, and so proved nothing. It was discarded rather than reported.
