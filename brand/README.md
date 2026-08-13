# Brand — the school's letterhead

Three files, one design.

| File | Use |
|---|---|
| `letter-registrar-activation.pdf` | The letter itself, **beginning on sheet one**. Four sheets. |
| `letterhead.pdf` | Blank stationery, one sheet. A separate artefact — never the cover of a letter. |
| `letterhead.docx` | Open in Word and type. Crest and details sit in the page header and footer, so every page carries them. |
| `build.py` | Regenerates both from the embedded assets. Edit the letter blocks and re-run. |
| `*.html` | The sources both PDFs are printed from. |

## What it carries, and where each fact came from

Nothing on this letterhead was invented. Every line is drawn from the
site or the database seed:

- **Crest** — `assets/images/brand-mark.png`, the shield alone without the
  wordmark, so the name can be set in type rather than repeated twice.
- **Arabic name** — مدرسة سلطان حنفي الملكية, as it appears on the crest itself.
- **Motto** — "Forming Scholars, Leaders and Guardians of Excellence.",
  from the site footer.
- **Five institutions** — the public names as the site presents them.
- **Contacts, campus, founding year, governance** — from the site footer.

## Typography

The school's own three faces, embedded in the HTML as woff2 so the PDF
renders in them with no network and no font installation:

- **Cinzel** — the wordmark and subject lines. Roman capitals; it is the
  face the site already uses for institutional headings.
- **Cormorant Garamond** — the motto and the seal line. Italic, for the
  one voice on the page that is the school speaking about itself.
- **Inter** — body text and the small capitals. Quiet on purpose: a
  letterhead should be the most decorated thing on the page, and the
  letter the most readable.
- **Amiri** — the Arabic name.

**The Word file is the exception.** A `.docx` cannot embed fonts the way
the HTML does, so Word substitutes anything not installed on that
computer. For an exact match, install **Cinzel** and **Cormorant
Garamond** (both free, fonts.google.com) on any machine that writes
letters. Without them Word falls back to a default serif — still
correct, just not the school's own face. Body text is set in Georgia
precisely because it is present on every Windows and Mac already.

## Colours

Espresso ink `#241809`, secondary `#5A4630`, gold `#8E6A26`. Chosen to
print faithfully — deliberately not a saturated RGB gold, which turns
muddy or greenish on a laser printer.

The sheet is plain white. A tinted stock is the paper's job, not the
printer's: a full-bleed background costs ink on every page and rarely
reproduces the way it looks on screen.

## Regenerating the PDF

Open `letterhead.html` in a browser and print to PDF at A4 with margins
set to **None** and "Background graphics" **on**. The page is already
sized to 210 × 297 mm, so nothing needs scaling.

## One honest note on verification

The HTML and PDF were rendered and inspected — both pages measured to
794 × 1123 px (A4 at 96 dpi), all seven fonts confirmed loaded, and the
footer confirmed to sit inside the sheet on both pages.

The `.docx` was **not** visually verified: LibreOffice is broken in the
environment this was built in and fails to open even a one-word test
document, so no rendering could be produced. Its structure was checked
instead — every XML part well-formed, the image embedded and correctly
related, header and footer references present, and the header and footer
text confirmed to read correctly. Please open it once in Word before
using it for a real letter.
