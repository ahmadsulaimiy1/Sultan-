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
| `build-arms.py` | Re-renders the arms as a single-ink gold device. Run only when the artwork changes. |
| `measure.js` | Measures the letter's blocks in Chromium so the pagination standard can be applied automatically. Called by `identity.py`. |
| `assets/` | The arms (source and single-ink), the letter's text blocks, and the two Word bands. |
| `../docs/letters/registrar-portal-activation.md` | The record of what the letter says. **Generated** — never edit it by hand. |

## The letter's text lives in one place

`assets/letter-blocks.html` is the only source. The PDF, the sheets and
the record copy in `docs/letters/` are all written from it on every
build, so they cannot disagree. The record copy used to be kept by hand
and it drifted — it named the wrong signatory and was missing whole
sections that had been added to the letter. A record of what was sent
that disagrees with what was sent is worse than no record.

The record is written from the blocks **before** the Staff ID and the
activation link are substituted, so it carries the placeholders and
neither secret can reach the repository through it. The build checks
this.

## Building

```
python3 brand/identity.py \
  --staff-id "SHRS-HQ-REG-130826-000004" \
  --activation-url "https://shroyalschools.com/portal/staff/set-password/?token=..."
```

**The activation link must be a real one.** The build refuses an obvious
placeholder — `DEMO`, `test`, `example` and the like — because a letter
built with one cannot be activated, and its reader is told the link is no
longer usable. This is not hypothetical: it happened. Issue a live link
first:

```
curl -sS -X POST https://shroyalschools.com/api/portal/admin/staff \
  -H "x-admin-token: $PORTAL_ADMIN_TOKEN" -H "content-type: application/json" \
  -d '{"action":"create-login","staffNo":"<the Staff ID>"}'
```

Pass `--draft` when you only want to proof the design.

**A newly issued link cancels every earlier one** — the account row holds
exactly one token. Always send the newest, and rebuild the letter from
it in the same sitting.

A third argument places the signatory's own signature:

```
python3 brand/identity.py --signature assets/images/certificates/signature-chairman.png ...
```

It is dropped onto the cream with `mix-blend-mode:multiply`, so a scan on
white paper needs no cutting out. **Nothing is drawn or imitated** — with
no `--signature` the space above the rule stays blank, which is the only
honest default. Signatures already on file live in
`assets/images/certificates/`; a new one is a scan of the signatory's own
hand, supplied by them.

Omit any argument and that blank stays visible in the letter rather
than silently wrong. The activation link is generated per person in the
Admin Centre at the moment of sending; it is single-use and must never be
committed here.

The generator reads only from `brand/assets/` and `assets/fonts/`, so it
runs from any working directory on any machine. Fonts and images are
embedded as base64, which is why a rendered sheet needs no network and
prints identically anywhere.

**Pagination is automatic.** `identity.py` measures the letter's blocks in
Chromium and applies the correspondence standard — header on the opening
sheet, footer on the closing sheet, every sheet between them clean. See
[`docs/shrs-correspondence-standard.md`](../docs/shrs-correspondence-standard.md).
It prints what it decided:

```
letter: 3 sheets — head, clean, foot
```

If Chromium is not on the machine the build says so and falls back to the
last stored measurement rather than guessing silently. `PLAYWRIGHT_PATH`
can point at the `node_modules` holding `playwright-core` if it is not
resolvable from `brand/`.

To rebuild the Word file after a design change, re-render the ground out
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
