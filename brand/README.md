# Brand — the school's stationery

One design, four outputs. The full rationale is in
[`docs/shrs-identity-manual.md`](../docs/shrs-identity-manual.md).

| File | Use |
|---|---|
| `letter-registrar-activation.pdf` | The letter itself, beginning on sheet one. Four sheets. |
| `letterhead.pdf` | Blank stationery, one sheet. A separate artefact — never the cover of a letter. |
| `letterhead.docx` | Open in Word and type. The two masses are page-anchored images, so they bleed to the edge on every page. |
| `identity.py` | Builds both HTML sheets, from which the PDFs are printed. |
| `word.py` | Builds the `.docx` from bands rendered out of `letterhead.html`, so Word and PDF cannot drift. |
| `build-arms.py` | Re-renders the arms as a single-ink device. Run only when the artwork changes. |
| `assets/` | The arms (source and single-ink), the letter's text blocks, and the two Word bands. |

## Building

```
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
```

Omit either argument and that blank stays visible in the letter rather
than silently wrong. The activation link is generated per person in the
Admin Centre at the moment of sending; it is single-use and must never be
committed here.

The generator reads only from `brand/assets/` and `assets/fonts/`, so it
runs from any working directory on any machine. Fonts and images are
embedded as base64, which is why a rendered sheet needs no network and
prints identically anywhere.

To rebuild the Word file after a design change, re-render the bands out
of `letterhead.html` and then run the builder:

```
python3 brand/word.py
```

## What it carries, and where each fact came from

Nothing on this letterhead was invented:

- **Crest** — the school's own institutional arms.
- **Arabic name** — مدارس السلطان حنفي الملكية, plural and with the
  article, as the school's Arabic pages set it.
- **Motto** — "Forming Scholars, Leaders and Guardians of Excellence."
- **Five institutions**, **contacts**, **campus**, **founding year**,
  **governance** — from the site footer and the database seed.
- **Colour** — two inks. Coffee `#2E1A0D` and one flat gold, Pantone 872
  or a single CMYK build. No gradient, and no third colour.

## Verification

Every build is measured, not eyeballed. The render harness loads both
documents in Chromium and asserts the twenty tests listed in the manual —
ink coverage, the single left and right edge, the measure and characters
per line, the print floor for type both on paper and reversed, the arms
standing on the Axis unshadowed, the bilingual lock's shared centre line,
equal measure and unbroken names, the Arabic presence ratio, the absence
of any simulated texture, containment on every sheet, fonts loaded, links
live, and zero console errors. **All twenty pass on the current build.**

The thresholds are not taste. They come from `docs/letterhead-audit.md`,
which measured the previous revision at 51.2% ink coverage, eleven left
edges, twelve type sizes and four elements set below 6 pt reversed.

**The `.docx` is the exception, and this is worth stating plainly.**
LibreOffice is broken in the environment this was built in — it fails to
open even a one-word test document — so no rendering of the Word file
could be produced and it has **not** been visually verified. What was
checked instead: every XML part parses, every relationship ID referenced
by `document.xml` and `header1.xml` resolves in its `.rels`, both images
are valid JPEG, and the page and margin geometry match the PDF's. Please
open it once in Word before using it for a real letter.
