# SHRS Correspondence Pagination Standard

**Permanent institutional standard.** It applies to every document the
school issues — ICT Office, the Principal's Office, the Registrar,
Admissions, Finance, Academic Affairs, Human Resources, Legal, the
Governing Council, and every office created after this was written.

It is implemented in `brand/identity.py` and asserted in the build. It
does not have to be applied by hand to each document, and it must not be
overridden per document.

---

## The rule

**The institution introduces itself once, the document speaks for itself,
and the institution signs off once.**

| Sheets | Opening | Middle | Closing |
|---|---|---|---|
| **1** | header **and** footer | — | — |
| **2** | header only | — | footer only |
| **3** | header only | clean | footer only |
| **4+** | header only | all clean | footer only |

- The **header** appears on the opening sheet and nowhere else.
- The **footer** appears on the closing sheet and nowhere else.
- Every sheet between them is **clean**.
- A **single-sheet** letter carries both, which closes the frame.

## What a middle sheet may carry

Only what the reader needs to reassemble the document if the sheets are
separated, set quietly and out of the way:

- the reference, and *n* of *N*

Nothing else. No crest, no rule, no motto, no contact detail, no
decorative furniture of any kind. A middle sheet should read as a page of
a book, not as a page of a brochure.

## Why

The body of the letter is the most important thing on the sheet. Branding
exists to support it and never to compete with it, and writing space is
never surrendered to repeat a logo.

This is what Oxford, Cambridge, Harvard, the Royal Household, the FCDO,
the Bank of England and the International Court of Justice all do with
their correspondence. **Confidence is expressed by restraint.** An
institution that repeats its own name on every sheet is asking to be
believed; one that says it once is not.

## How the space is used

Each class of sheet gets a different writable depth, and the field
expands automatically into whatever the furniture does not need:

| Sheet | Reserved | Writable depth |
|---|---|---|
| Single (header + footer) | 52 mm head, 53 mm foot | 192 mm |
| Opening (header only) | 52 mm head, 30 mm foot margin | 215 mm |
| Middle (clean) | 32 mm top, 30 mm bottom | 235 mm |
| Closing (footer only) | 32 mm top, 53 mm foot | 212 mm |

A middle sheet therefore carries **22% more text** than the opening
sheet. That is the whole point of the standard.

**A 5 mm gutter is held back from every one of those depths.** The block
heights come from one rendering; a different rasteriser, a hinting
difference or a substituted font moves a long paragraph by a millimetre
or two. Without the reserve a sheet packed to the last hair collides with
its own footer on somebody else's machine. It costs about one line of
text per sheet and it removes a whole class of defect. A build measured
at 0.6 mm of clearance is what put it there.

## A heading travels with its text

A section lead-in is never the last thing on a sheet. A heading stranded
above a break announces a section the reader must then turn the page to
find, which is the one thing a heading exists not to do. The packer marks
every lead-in *keep-with-next*: if a break would fall immediately after
one, the break is pulled back so the heading crosses with the text it
introduces. This is asserted in the build (`noOrphanLead`).

## How it is applied — by measurement, not by hand

The build does this automatically and re-does it whenever the text
changes:

1. `identity.py` writes a probe containing every block of the letter, set
   at the letter's own measure.
2. `measure.js` renders it in Chromium and reads back the true height of
   each block in millimetres.
3. `paginate()` packs the blocks against the **real capacity of each
   class of sheet** — opening, middle, closing — and then applies the
   table above.

So the pagination follows the writer. Add three paragraphs and the letter
re-flows and re-decides how many sheets it needs and which of them carry
furniture. Nothing is hard-coded, and no document needs redesigning.

If Chromium is unavailable the build falls back to the last stored
measurement and says so on the console rather than guessing silently.

## Asserted in the build

1. The opening sheet has a header and, if the document continues, no footer.
2. The closing sheet has a footer and no header.
3. Every middle sheet has neither, and carries a folio.
4. A single-sheet document has both.
5. A middle sheet's field is larger than the opening sheet's.
6. No sheet's text runs past its own footer or its bottom margin.
7. No section lead-in is left orphaned at the foot of a sheet.
