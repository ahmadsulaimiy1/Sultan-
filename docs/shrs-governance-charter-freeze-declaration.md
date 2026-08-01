# GOVERNANCE CHARTER FREEZE DECLARATION

*Phase 1A of the Staged Drafting Directive: "Finalize the Governance Charter to an internationally publishable standard. Perform a rigorous legal, governance, editorial, and design audit. Freeze it as the governance reference document." This note records what was actually checked, what was found, and what was fixed, against the user's own nine-point checklist. It is a status record, not part of the Charter itself, and carries no legal effect.*

---

## 0. What Phase 1A did not need to redo

Two of the nine checks had already been performed rigorously in earlier rounds of this engagement, and this pass confirmed rather than repeated them:

- **Constitutional audit** and **Governance audit** — carried out in full in the prior Constitutional Review Commission round (`docs/shrs-governance-charter-constitutional-review.md`): 10 Critical and 4 Important findings fixed directly in the Charter's text (a real quorum deadlock, broken cross-references, an entrenchment workaround, a safeguarding-committee quorum gap, a missing permanent-succession mechanism at Article 141A, among others). Nothing in this pass reopened that work; it is treated as done.

The remaining seven checks were run fresh in this pass.

## 1. Legal drafting audit

Checked Article 4's 28-item defined-terms list, Article 9's interpretive principles, and every "Article N" / "Chapter N" / "Schedule X" cross-reference in the Charter's own text against a full extraction of the document (206 Article headings, 22 Chapters, 9 Schedules).

**Result: clean.** Zero duplicate Article numbers, zero orphaned cross-references (every Article/Chapter/Schedule the text cites is one the text actually defines), no gaps in the Article numbering sequence, no stray "Board of Trustees" language (the Charter's own terminology — "Board of Governors" — is used consistently throughout; "Trustees" survives only in older tracking documents outside the Charter itself, which is expected and unproblematic), no placeholder markers (TODO/TBD/[PLACEHOLDER]) anywhere in the text.

## 2. Internal consistency audit

Checked capitalisation and usage of "the Founder & CEO," "Chief Executive Officer," and the Charter's own declared position on "Educator"/"Teacher"/"Staff" being used interchangeably (Article 4(aa), which states this explicitly rather than leaving it to be inferred).

**Result: clean.** No case-mismatch variants found. The Charter's own Article 4 already flags, and declines, three terms some drafts might have been tempted to define ("campus," "school," "Talib"/"Talibah") — checked and confirmed that decision is still sound.

## 3. Cross-reference audit

Automated extraction of every Article, Chapter, and Schedule reference in the document, checked against the defined set.

**Result: clean.** 206 Article headings, no duplicates; every one of the 22 Chapters and 9 Schedules referenced in the body text is one the Charter itself defines; zero references to a non-existent Article, Chapter, or Schedule.

## 4. Typography audit

Visual spot-check of the regenerated flagship PDF across front matter, mid-document body pages, and back matter (cover, document-control page, institutional-information page, a body page mid-Chapter-XVI, the back cover).

**Result: clean**, with one real defect found and fixed — see Section 6 below (domain).

## 5. Publication design audit — real defect found and fixed

**The Charter's own official website, email address, and all three live QR codes (Website, Email, Contact Page) pointed to `shroyalschools.ng` — a domain the Institution's own live site stopped using some time ago in favour of `shroyalschools.com`** (confirmed by checking the actual live codebase: `functions/_lib/email.js`'s `SITE_ORIGIN` constant, and 439 separate `.com` references across every live page, against only 46 stray `.ng` references, all in generation scripts for documents this engagement doesn't currently own — this Charter's own `scripts/generate-constitution-html.js` was one of them).

This is not cosmetic: the QR codes are functional — decoding them with the actual current source images confirmed all three pointed to `https://shroyalschools.ng`, `mailto:info@shroyalschools.ng`, and `https://shroyalschools.ng/contact/`, none of which is the Institution's live domain. A reader scanning the Institution's own supreme governing instrument would have been sent to the wrong address.

**Fixed**: all five domain references in `scripts/generate-constitution-html.js` changed from `.ng` to `.com`; all three QR code PNGs (`assets/images/qr/qr-website.png`, `qr-email.png`, `qr-contact.png`) regenerated against the correct `.com` URLs, in the same brand colours (`#1D1108` on `#F7EEDF`) as before, and re-verified by decoding both the source PNGs and the actual rendered PDF page (the back-cover QR was decoded directly off a 200dpi render of the final PDF, not just the source image, to confirm the fix survived the full pipeline).

## 6. Page-by-page print audit — one defect found, one fix attempted and reverted

**Defect found.** The Table of Contents' final page-fragment and the Schedules section's own opening page are built as "flowing," auto-height boxes (`css/constitution-print.css`, `.toc-page`/`.schedules-page`), unlike the Charter's "curated" fixed-height pages (cover, imprint, dividers). Where either box's real content stops short of a full physical page — which the Table of Contents genuinely does — the leftover space fell through to the surrounding dark "matte surround" background instead of the page's own ivory, printing as a visible two-tone split before the running footer. Confirmed by rendering all 75 pages and visually inspecting the affected page.

**Fix attempted and reverted.** Two CSS fixes were tried:
1. `min-height: 9.83in` on the affected boxes — had no effect; a debug render (a loud `!important` background colour) confirmed Chromium's print pagination fragments a box that precedes a forced page-break at that box's own natural content height, ignoring `min-height` entirely.
2. `height: 9.83in`, matching the Charter's own working pattern for its fixed-height pages — this did force the box to fill the page, but because the Table of Contents' real content genuinely spans more than one physical page, the fixed height caused Chromium to paint the overflow directly on top of the following page's own content instead of continuing pagination normally. The result was **worse than the original defect**: garbled, literally overlapping text between the Table of Contents' second page and the following "Sources of Authority & Abbreviations" page. This was caught by re-running the same page-by-page visual and text-extraction check immediately after the change, before the edition was finalised, and **reverted** before it could reach the frozen edition.

**Disposition.** The original cosmetic void is left in place, undisturbed, rather than risk reintroducing the overlap defect. It affects the visual finish of one page-fragment (a flat colour transition, no missing or incorrect text) and does not affect the Charter's legal text, its accuracy, or its readability. The attempt and the reason it was reverted are recorded in `css/constitution-print.css` itself, at the relevant rule, so a future attempt at the same fix doesn't repeat the same two failed approaches without knowing why they failed.

## 7. Final executive publication audit

Full pipeline (`generate-constitution-html.js` → `render-constitution-pdf.js` → `merge-constitution-cover.py` → `add-dynamic-headers.py` → `generate-constitution-docx.js`) re-run end-to-end against the corrected source. Output: 75-page PDF, dynamic running headers/footers on all 54 body pages, cover and 20 ceremony pages left clean per the existing design decision. Certificate of Adoption and Execution, all 9 Schedules (A–I), and Article 178A (the Charter's final substantive Article) all confirmed present and intact in the rendered text. DOCX regenerated to match.

## 8. What Phase 1A did not do

No further amendment was made to the Charter's own Article text — that work is closed (Section 0). No attempt was made to fix the Section 6 cosmetic print defect a third time; a genuinely different technique (likely requiring either a build-time page-count/height calculation injected into the HTML before rendering, or accepting the limitation permanently) is future work, not blocking this freeze.

## 9. Freeze status

Subject to the one accepted cosmetic limitation in Section 6, the Governance Charter's flagship publication (`docs/exports/SHRS-Governance-Charter-Flagship-Edition.pdf`, `.html`, `.docx`) is internally audited against all nine points the user's directive specified, and is frozen as the governance reference document for the purpose of Phase 1B. It remains, as stated throughout this engagement, a Board submission draft — not yet legally effective until the Board adopts it under Chapter XVIII.
