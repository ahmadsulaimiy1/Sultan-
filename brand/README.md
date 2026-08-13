# Brand — the school's stationery

One identity, three artefacts, all built from sources in this repository.
The reasoning is `docs/institutional-identity.md`; this file is how to run it.

| File | Use |
|---|---|
| `letter-registrar-activation.pdf` | The letter itself, **beginning on sheet one**. |
| `letterhead.pdf` | Blank stationery, one sheet. A separate artefact — never the cover of a letter. |
| `letterhead.docx` | Open in Word and type. The masthead, the record and the Quarter are pinned to the page, so they hold on every sheet whatever is written. |

## Building

```
python3 brand/render.py        # builds the HTML, prints both PDFs, cuts the
                               # art, and measures every acceptance test
python3 brand/build_docx.py    # builds the Word template from that same art
```

`render.py` drives the browser already in this environment
(`/opt/pw-browsers/chromium-1194`). `build.py` alone needs nothing but
Python and regenerates the HTML on its own. Nothing is fetched from the
network and nothing is read from `/tmp`.

## Where every part comes from

| Part | Source |
|---|---|
| Faces | `assets/fonts/eb-garamond-latin-variable-*.woff2`, `amiri-arabic-400-normal.woff2`, embedded as base64 |
| Crest | `assets/images/brand-mark.png` |
| Letter prose | `letter-registrar-activation.src.html` — edit this, not the built HTML |
| Geometry | computed in `build.py` from the sheet's own root-two proportion |
| Art for Word | cut from the rendered sheet by `render.py`, on a transparent ground |

## Editing the letter

Edit `letter-registrar-activation.src.html` and re-run. It is prose only —
the sheet around it is the build's job. A line reading exactly
`PAGE-BREAK` starts a new sheet, so pagination is stated rather than
implied by a paragraph count.

If the letter grows past its sheet, test 8 fails rather than the last
paragraph vanishing under the record. Add a `PAGE-BREAK`; never condense
to fit (Rule 4). Do not strand a section heading at the foot of a sheet
with one item under it.

## The Word file, honestly

Its masthead, record and Quarter are the *same* art the HTML sheet
renders, cut at 3x and anchored to the page — not a hand-rebuilt
approximation, because a hand-built Word file drifts from the sheet within
one revision. `build_docx.py` asserts that the typist's text block sits
exactly where the sheet's body sits.

Two limitations, stated rather than glossed:

- **Fonts.** A `.docx` cannot embed fonts the way the HTML does. The
  identity lives in the art, which is an image and therefore exact. Typed
  body text is set in **Georgia**, chosen because it is already on every
  Windows and Mac. Install **EB Garamond** (free, OFL) if you want the
  Subject Line style to match the sheet.
- **It has not been opened in Word.** LibreOffice cannot load *any*
  `.docx` in this environment — it fails on a one-word test document, so
  the failure is LibreOffice's, not this file's. What was checked instead:
  every XML part parses, every relationship resolves to a part that
  exists, the content types are complete, the page geometry is verified as
  arithmetic, and `python-docx` reads the file back reporting the intended
  A4 geometry exactly. Please still open it once in Word before sending a
  real letter.

The art is cut on a **transparent** ground. The HTML sheet paints its own
warm stock, but a Word page is whatever paper it is printed on, and a tint
is the stock's job rather than the printer's.

## Printing

`render.py` prints the PDFs with backgrounds on. If you print from a
browser instead, set margins to **None** and "Background graphics" **on** —
the page is already 210 x 297 mm, so nothing needs scaling.

For the real thing: the two rules are drawn at 0.3mm because that is the
least a brass foil die will hold, and no gold element is graduated,
because foil is binary. The artwork can be handed to a foil printer as it
stands.

## What was measured

`render.py` runs 31 checks across both documents — every test in
`docs/institutional-identity.md` §X. All 31 pass.
