# Brand — the school's stationery

Three artefacts, one design, all built from sources in this repository.

| File | Use |
|---|---|
| `letter-registrar-activation.pdf` | The letter itself, **beginning on sheet one**. Four sheets. |
| `letterhead.pdf` | Blank stationery, one sheet. A separate artefact — never the cover of a letter. |
| `letterhead.docx` | Open in Word and type. Masthead, foot and rail are pinned to the page, so they hold on every sheet whatever is written. |

## Building

```
python3 brand/render.py        # builds the HTML, prints both PDFs, cuts the
                               # band art, and measures every acceptance test
python3 brand/build_docx.py    # builds the Word template from that same art
```

`render.py` needs a browser and uses the one already in this environment
(`/opt/pw-browsers/chromium-1194`); `build.py` alone needs nothing but
Python and regenerates the HTML on its own.

Nothing is fetched from the network and nothing is read from `/tmp`. An
earlier revision of `build.py` loaded its fonts, ornaments and letter
text from `/tmp/assets.json` and `/tmp/blocks.txt`, which meant that in a
fresh clone it regenerated nothing at all — the one thing its own commit
message promised it would do.

## Where every part comes from

| Part | Source |
|---|---|
| Faces | `assets/fonts/*.woff2`, embedded as base64 so a PDF needs no installed font |
| Crest | `assets/images/brand-mark.png` |
| Letter prose | `letter-registrar-activation.src.html` — edit this, not the built HTML |
| Guilloche, grain, microtext | computed in `build.py`; see §IV of the bible |
| Band art for Word | cut from the rendered sheet by `render.py` |

The ornaments are generated rather than stored because §IV requires it:
an ornament whose provenance cannot be stated is forbidden, and a 371 KB
blob of path data states nothing. The generator reproduces the previous
revision's guilloche byte for byte across all 26,265 points, so this is a
recovery of the rule, not a redrawing.

## Editing the letter

Edit `letter-registrar-activation.src.html` and re-run. It is prose only —
the sheet around it is the build's job. A line reading exactly
`PAGE-BREAK` starts a new sheet, so pagination is stated rather than
implied by a paragraph count, and editing a sentence cannot silently move
a page break. Class names are semantic and defined in `build.py`'s
stylesheet.

If the letter grows past its sheet, test 16 fails rather than the last
paragraph disappearing under the foot band. Add a `PAGE-BREAK`; never
condense to fit (rule 4).

## The Word file, honestly

The masthead, foot and rail in the `.docx` are the *same* art the HTML
sheet renders, cut from it at 3× and anchored to the page — not a
hand-rebuilt approximation. That matters because a hand-built Word file
drifts: the previous `letterhead.docx` was two revisions stale, still
carrying the coffee palette and the singular Arabic name that Rule 0
forbids, while the README beside it said all three files were one design.
`build_docx.py` now asserts both of those are gone.

Two honest limitations:

- **Fonts.** A `.docx` cannot embed fonts the way the HTML does. The
  ceremony lives in the art, which is an image and therefore exact. Typed
  body text is set in **Georgia**, chosen because it is already on every
  Windows and Mac. Install **Cinzel** (free, fonts.google.com) if you want
  the Subject Line style to match the sheet; without it Word substitutes.
- **It has not been opened in Word.** LibreOffice cannot load *any*
  `.docx` in this environment — it fails on a one-word test document, so
  the failure is LibreOffice's and not this file's. What was checked
  instead: every XML part parses, every relationship resolves to a part
  that exists, the content types are complete, and the page geometry is
  arithmetic that is verified rather than asserted. `python-docx` reads
  the file back and reports the intended A4 geometry exactly. Please still
  open it once in Word before sending a real letter.

The bands are cut on a **transparent** ground. The HTML sheet paints its
own warm stock, but a Word page is whatever paper it is printed on, and
§III holds that a tint is the stock's job rather than the printer's.
Baking the gradient in put a visible cream step across the page where the
foot band ended; transparency removes it.

## Colours

Garnet `#3B1420 → #14060A`, gold `#C9A45E`, garnet-on-paper `#7A2E3E`,
ink `#1A1116`. Chosen to print faithfully — deliberately not a saturated
RGB gold, which turns muddy or greenish on a laser printer. The full
reasoning is §II-b and §VII of `docs/letterhead-editorial-bible.md`.

The sheet is plain white. A tinted stock is the paper's job.

## Regenerating the PDFs by hand

`render.py` prints them with backgrounds on. If you print from a browser
instead, set margins to **None** and "Background graphics" **on** — the
page is already 210 × 297 mm, so nothing needs scaling. Without
backgrounds the garnet simply does not print, and the sheet comes out
blank where its masthead should be.

## What was measured

`render.py` runs 30 checks across both documents — the bible's §X, which
now includes the two it did not previously state. All 30 pass. The two
that failed on first run, and what they found, are recorded at the end of
§X of the bible rather than quietly fixed.
