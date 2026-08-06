# The Certificate Number Security Cartouche

**Directive:** Premium Certificate Number Security Panel, 2026-08-06
**Implements:** `certificateNumberCartoucheSvg()` in `functions/_lib/stage-certificate-template.js`
**Gate:** `scripts/verify-certificate-batch.mjs` (§ *The engraved certificate number*)

This document exists so nobody has to guess later which of these features is a
real control and which is a picture of one. The ledger in §4 is written to be
handed to a printer.

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
    printed   SHRS-CERT-IBT-000035

Shortening is safe **only** because `<seq6>` is one global sequence
(`stage_certificate_serial_seq`, `sql/schema.sql:1925`) — sequence 000035 is
issued once, ever, across every year and every programme.

That was a convention, not a constraint. It is now a constraint: the register SQL
creates a unique index on the derived printed number, so two certificates can no
longer differ only in year and hash suffix while printing the same number.

```sql
CREATE UNIQUE INDEX IF NOT EXISTS stage_certificates_printed_no_uniq
  ON stage_certificates ((split_part(serial_no,'-',3) || '-' || split_part(serial_no,'-',5)));
```

**What is given up:** a reader can no longer check the HMAC suffix by eye.
**What is not:** the suffix and the full hash are still recomputed server-side
from the stored row on every verification, the full serial is still the QR
payload, the panel's microtext still carries it, and the verification plate still
prints the 12-hex verify code whose first five characters *are* the suffix. The
integrity check never depended on what a person typed.

Verification accepts both forms — `resolveStageCertificateRef()` in
`functions/_lib/certificate-serial.js`. Two matches returns *ambiguous* and
refuses to guess.

---

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

At x-height, the zeros in `000035` read as lower-case o's: the printed number
resolves visually as **SHRS-CERT-IBT-oooo35**. This is the same finding already
recorded against `.bg-v-id` in the template, where lining figures were chosen for
identifiers for exactly this reason. On a number a registrar may transcribe from
print, this is a transcription risk, not only a matter of taste.

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
