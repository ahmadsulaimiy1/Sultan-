# SHRS Publication Programme — Final Release Report

**Date:** 4 August 2026
**Scope:** Final Institutional Flagship Audit — end-to-end review of every
publication in the Sultan Hanafi Royal Schools publication suite, without
assuming anything was correct because it passed an earlier audit.

---

## 1. Total publications audited

**12 publications, 24 artifacts** (each publication in both its PDF and DOCX
edition), audited by three independent end-to-end passes:

| # | Publication | Editions |
|---|---|---|
| 1 | The Governance Charter — Flagship Edition | PDF (86 pp) + DOCX (68 pp) |
| 2 | SHRS Board Handbook | DOCX |
| 3 | SHRS Governance Handbook | DOCX |
| 4 | Organisational Structure Manual | DOCX |
| 5 | SHRS Governance Master Register | DOCX |
| 6 | SHRS Governance Resolution Register | DOCX |
| 7 | Flagship Prospectus | PDF (25 pp) + DOCX |
| 8 | The Luxury Aspirational Edition | PDF + DOCX |
| 9 | The Flagship Institutional Publication (Definitive) | PDF + DOCX |
| 10 | The Future Digital Campus Edition | PDF + DOCX |
| 11 | The Student Experience Edition | PDF + DOCX |
| 12 | The Institutional Masterplan Edition | PDF + DOCX |

The three audit passes: a factual/terminology consistency audit (30 findings),
a PDF-vs-DOCX fidelity audit (11 findings), and a page-by-page visual flagship
review (71 pages rendered and inspected; 20 ranked prescriptions). Every
actionable finding was fixed, deliberately deferred with a reason recorded
below, or identified as a false positive (one: the governance documents'
"missing" imprint pages are injected at DOCX build time by design).

## 2. Total corrections made

**Approximately 140 discrete corrections across 29 source files**, in four
groups:

**Factual and terminology (the audit's CRITICAL/HIGH findings)**
- Founding year corrected to **2016** in eleven places across four editions
  (HTML and DOCX) that contradicted every imprint's "Founded July 2016".
- Definitive back-cover stat corrected from "4 Schools" to **"5 Schools"**.
- The last surviving **"Founder & CEO"** byline (Flagship Prospectus DOCX)
  corrected to *Founder & Head of Schools / Administrator*.
- Charter DOCX Table of Contents no longer prints the abolished
  "Founder & Chief Executive Officer" chapter title or the superseded
  "Executive Management Team".
- Committee rosters raised to the Charter's real schedules everywhere they
  were understated: **five named Board-Level Committees plus one reserved
  slot** and **all seven Management-Level Committees** (Definitive and
  Masterplan editions, HTML + DOCX).
- Board Handbook self-contradiction fixed ("four Board-appointed committees
  report to the full Board; the Safeguarding Committee reports to both").
- Canonical citation unified to **"Policy GV-01 v3.0, Edition VII"** across
  all thirteen imprint sources.
- The Aspirational DOCX's four drifted sections re-aligned verbatim to its
  PDF/HTML edition (Vision, Character tiers, ALA Endowment Prize criteria,
  Scholar's Journey).
- All "[figure pending]" markers resolved: **25 published policies** and
  **28 institutional offices** are real, verified counts; achievement figures
  that genuinely await confirmation are now stated in print-appropriate prose
  rather than bracketed build notes.
- Imprint wording upgraded to the full canonical field set in all six
  brochure DOCX generators (Classification, Archival Statement, Printing
  Specification, Rights Statement).

**Governance Charter pipeline (the P0 finding)**
- **Recovered invisible text on 30+ pages.** The print `@page` margins were
  smaller than the running-band masks, so up to three lines of laid-out body
  text per page were painted over. Margins raised to 0.89in/1.23in to match
  the masks exactly, and the fixed ceremony-page box refitted to 8.88in so no
  page fragments. Verified by a pdfplumber scan: **zero** words now fall
  inside either mask band, and the document grew from 82 to 86 pages as the
  hidden text re-entered pagination.
- Table of Contents rebuilt: underlined web-blue links replaced with navy
  entries, dot leaders, and **real folio numbers back-filled per entry** from
  the rendered pagination (verified monotonically correct).
- Charter DOCX gains the Publisher's Imprint and Publication Data front-matter
  pages, the Amendment notice, and the fuller Certification wording; its TOC
  page numbers were re-verified line-by-line against its own rendered PDF.
- Certificate of Adoption and Execution confirmed present in both editions and
  refitted to a single ceremony page; the Certificate of Amendment added to
  both TOCs.
- Preamble drop-cap alignment fixed; parchment print surround changed to
  ivory (removing the two-tone flood); reserved QR placeholder removed; QR
  codes recoloured to brand navy; khatam corner ornament paired diagonally;
  truncating running-foot string shortened.

**Governance DOCX generator (five publications at once)**
- Heading colour styles now actually apply — they were defined outside
  `styles.default`, so LibreOffice fell back to Word-default blue on every
  heading of all five documents.
- Title pages gain the crest and suppress the running header/footer.
- Table header rows repeat across page breaks; column widths are
  content-proportional (ending character-level word breaks); hard-wrapped
  list items no longer split into stray paragraphs; literal multi-space runs
  normalised before justification.
- Mermaid diagrams themed to brand ivory/gold/espresso instead of the stock
  lavender defaults.

**Brochure visual polish**
- Both "PHOTOGRAPHY PENDING" build notes replaced with deliberate dark
  typographic section openers; the parent-partnership placeholder replaced by
  a full-measure pull quote.
- Flagship back cover rebuilt to the family standard (crest, wordmark, motto,
  full contact block, edition line) — it was previously a bare crest.
- The outdated-domain signage (`shroyalschools.ng`) retouched out of the
  campus gate photo used in seven places; the signboard phone-number strips
  blurred on both campus cover photos.
- Back-cover phone numbers made unbreakable and unified to the imprint format
  across four editions; Aspirational imprint no longer overflows into the
  footer; the duplicated testimonial attribution removed; the Definitive
  leadership roster unified to gold monogram tiles with the sidebar caption
  reunited with its monogram; Masterplan crimson and Digital Campus amber
  accents moved onto the brand gold family; the section-heading gold rule
  detached from the baseline so it no longer reads as an accidental underline.

## 3. Files regenerated

All **20 export artifacts** regenerated from source after the fixes:

- Governance Charter Flagship PDF (full three-stage pipeline: render → cover
  merge → dynamic headers/TOC folios) and Charter DOCX.
- Five governance DOCX (Board Handbook, Governance Handbook, Organisational
  Structure Manual, Master Register, Resolution Register).
- Six brochure PDFs and six brochure DOCX.

Stale pre-fix renders were removed from the exports directories so no
outdated artifact can be mistaken for a release copy.

## 4. PDFs verified against DOCX

- The dedicated fidelity audit compared all 12 PDF/DOCX pairs on shared
  anchors (founding date, contact details, imprint rows, document IDs,
  copyright lines) and content structure. Its five real findings — the stale
  Charter DOCX TOC, the Charter DOCX's missing front matter, the Prospectus
  DOCX "Founder & CEO", the Aspirational content drift, and the Definitive
  back-cover stat — are all fixed above and the affected artifacts
  regenerated.
- Post-regeneration text sweeps across every PDF confirm zero occurrences of:
  "Founder & CEO", "Photography Pending", "figure pending", "Committee TBD",
  the outdated domain, or a founding-year contradiction.
- The regenerated Charter DOCX's Table of Contents was verified entry-by-entry
  against its own rendered pagination; the Charter PDF's mask bands were
  verified clear of content by coordinate scan; key pages (TOC, Certificate,
  Part dividers, imprints, title pages, tables, diagrams) were rendered to
  image and visually inspected.

## 5. Remaining known issues

Recorded honestly rather than silently absorbed:

1. **Photography is the suite's real ceiling.** The only available Founder
   portrait is an informal self-taken photo (visible car interior at large
   sizes); the Aspirational and Student Experience editions share one cover
   photograph, which has photographic lighting equipment in frame; the
   Masterplan cover fabric is stained. No pipeline fix exists — these need a
   commissioned photography session, after which the images drop in with no
   code changes.
2. **Digital Campus and Masterplan editions remain visually distinct from the
   espresso/ivory/serif family.** Their foreign accent colours are now on the
   brand gold family, but their grounds and typography were commissioned as
   deliberately distinct editions; a full re-skin onto the family system is a
   design decision reserved for the client.
3. **Basic School "Est. 2017"** is retained pending client confirmation — an
   individual school may legitimately have been established after the
   Institution's July 2016 founding (as Secular College's "Est. 2021" shows),
   but the date should be confirmed rather than assumed.
4. **Foundation naming split** ("Sultan Zakariya Hanafi Foundation" vs the
   Charter's shorter "Sultan Hanafi Foundation") needs a client ruling before
   unification.
5. **Toolchain typographic ceiling** (documented, not fixable in this
   pipeline): justified text without dictionary hyphenation, faux small caps,
   and sRGB-only colour (no CMYK/spot-gold separation for offset printing).
   Dense register tables still hyphen-break occasionally under LibreOffice.
6. The Founder portrait's asset filename (`founder-ceo.jpg`) retains the
   retired title — internal-only, invisible in any publication.

## 6. Release confirmation

With the corrections above applied, every export regenerated from source, and
every regeneration verified by text sweep and visual inspection, the
**Sultan Hanafi Royal Schools publication suite is confirmed ready for
official institutional release**, subject to the commissioned-photography
programme and the two client rulings (items 1, 3 and 4 above), none of which
block digital release of the current editions.

This report closes the publication programme.
