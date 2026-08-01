#!/usr/bin/env python3
"""Draw genuinely dynamic per-page running headers/footers onto the
flagship PDF: current Part, current Chapter (or current Schedule once past
Chapter XXII), the Article range appearing on that physical page, and
"Page N of M" — none of which Chromium's print pipeline can produce on its
own (see the note in render-constitution-pdf.js: one headerTemplate/
footerTemplate applies to an entire render, with no per-page hook and no
access to page content).

Run after render-constitution-pdf.js + merge-constitution-cover.py, which
leave a reserved white margin (0.62in top / 0.55in bottom) with no text on
it. This script reads the rendered page text with pdftotext, works out
what belongs in the margin of each page, draws it with reportlab into a
same-size transparent overlay, and merges that overlay onto the real PDF
with pypdf.

Cover, Proclamation, Preamble, Part-divider, and Certificate/Execution
pages are deliberately skipped — those are full-bleed ceremonial pages
(see generate-constitution-html.js's `ceremony`/`dark`/`part-divider`
classes) that carry no Article content of their own and, in ordinary book
typesetting, conventionally carry no running head. Schedules and Drafting
Notes pages are body pages and do get one.
"""
import re
import subprocess
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, Color

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "docs" / "exports" / "SHRS-Governance-Charter-Flagship-Edition.pdf"

GOLD = HexColor("#8a7550")
GOLD_LIGHT = HexColor("#b79b5e")
PAGE_W, PAGE_H = 612, 792
TOP_MARGIN = 0.62 * 72
BOTTOM_MARGIN = 0.55 * 72
SIDE = 44  # left/right text inset, matching the body's own gutters

ROMAN_RE = r"[IVXLCDM]+"
PART_RE = re.compile(rf"^\s*PART\s+({ROMAN_RE})\s*$")
CHAPTER_RE = re.compile(rf"^CHAPTER\s+({ROMAN_RE})\s+—\s+(.+)$")
# Matches only where an Article actually STARTS (the bold heading pattern
# "Article 16 — Title." or "Article 1. Body text..."), anchored to the
# start of a line. An unanchored \bArticle\s+(\d+) would also match every
# inline cross-reference ("...removed for breach of Article 128, Article
# 130, or Article 131..."), which are far more numerous than real headings
# and would make the "range on this page" meaningless — first/last would
# usually be two cross-references, not the actual Articles printed there.
ARTICLE_HEADING_RE = re.compile(r"^Article\s+(\d{1,3}[A-Z]{0,3})(?:\s+—|\.)")
ARTICLE_RE = re.compile(r"\bArticle\s+(\d{1,3}[A-Z]{0,3})\b")
SCHEDULE_RE = re.compile(r"\bSchedule\s+([A-Z])\b")


def compact(s):
    # Ceremony headings (Proclamation, Preamble, Part dividers) are set in
    # heavily letter-spaced small caps in the flagship CSS; pdftotext
    # renders that spacing as a literal space between every glyph
    # ("C O N S T I T U T I O N A L"). Comparing on whitespace-stripped,
    # upper-cased text sidesteps that instead of trying to guess pdftotext's
    # spacing heuristics for each heading individually.
    return re.sub(r"\s+", "", s).upper()


def get_pages_text():
    out = subprocess.run(
        ["pdftotext", "-layout", str(PDF), "-"], capture_output=True, text=True, check=True
    ).stdout
    pages = out.split("\x0c")
    if pages and pages[-1] == "":
        pages.pop()  # trailing formfeed produces one empty split segment
    return pages


def classify_and_map(pages):
    """Returns (results, dark_pages, back_cover_page).

    results: one entry per page (1-indexed via list index), either None
    (no header text — a ceremony page, or preliminary matter) or a dict
    with header/footer text.

    dark_pages: the SUBSET of None-result pages that are genuinely
    full-bleed dark ceremony pages (Proclamation, Preamble, Part dividers,
    Certificate/Execution, back cover) — as opposed to light-background
    preliminary pages (Table of Contents, front matter) that also get no
    header text but are NOT dark, and so must NOT be treated the same way
    when masking the margin band (see draw_page).

    back_cover_page: the index of the back cover page (or None), so
    draw_page can suppress the footer there entirely — the directive is
    explicit that the back cover carries no page number and no other
    running-page furniture, only the page's own closing design."""
    n = len(pages)
    results = [None] * n
    dark_pages = set()
    back_cover_page = None

    cur_part = None
    cur_chapter = None
    cur_schedule = None
    past_chapters = False  # true once we've entered the Schedules section
    # True from the cover through the Table of Contents and front-matter
    # pages (half-title, title page, copyright page) — pages whose plain-
    # text listing of every Part and Chapter title (and the word
    # "Schedules") would otherwise be misread as the real headings,
    # corrupting the running state before the Charter's actual text even
    # begins. Cleared on reaching the Constitutional Proclamation, the
    # first real page.
    in_preliminaries = True

    for i, text in enumerate(pages):
        if i == 0:
            continue  # cover, always skip

        lines = [l.rstrip() for l in text.split("\n")]
        stripped_lines = [l.strip() for l in lines if l.strip()]
        compacted = compact(text)
        # Anchored to the page's literal FIRST line, where a real ceremony
        # HEADING always sits — not `compacted` (the whole page) and not
        # even "the first few lines," both of which are fragile: a page
        # that merely *mentions* "the Constitutional Proclamation" or "the
        # Preamble" in ordinary prose will contain the phrase too, and
        # that prose doesn't have to be the very first thing on the page.
        # Both looser versions produced real, confirmed false positives
        # here — first a whole Drafting Notes page (whole-page substring),
        # then a DIFFERENT Drafting Notes page whose first paragraph
        # happens to *describe* the Proclamation and Preamble by name
        # (four-line window) — each one silently misclassified as a dark
        # ceremony page and either skipped or white-masked incorrectly.
        # Only the exact first line is reliable.
        first_line_compacted = compact(stripped_lines[0]) if stripped_lines else ""

        if in_preliminaries:
            if "CONSTITUTIONALPROCLAMATION" in first_line_compacted:
                in_preliminaries = False
                # This page IS the Constitutional Proclamation itself — a
                # full-bleed dark ceremony page, not preliminary matter.
                # Missing this meant the Proclamation page fell through to
                # the "light preliminary" bucket and got white-masked over
                # its own dark background: a real, confirmed defect (found
                # by dumping dark_pages and checking it against the known
                # page structure), not a hypothetical one.
                results[i] = None
                dark_pages.add(i)
                continue
            results[i] = None
            continue

        if "CONSTITUTIONALPROCLAMATION" in first_line_compacted or "CERTIFICATEOFADOPTIONANDEXECUTION" in first_line_compacted:
            results[i] = None
            dark_pages.add(i)
            continue

        # Back cover: always the last physical page of the rendered PDF.
        # Earlier versions matched this page by a unique sentence in its
        # own closing note, but that note has since been removed from the
        # back cover's design (see the Editorial Record) — the page's
        # position, not its wording, is now the only thing this needs to
        # rely on, which is also more robust against future copy changes.
        if i == n - 1:
            results[i] = None
            dark_pages.add(i)
            back_cover_page = i
            continue

        has_article = bool(ARTICLE_RE.search(text))
        has_chapter_heading = any(CHAPTER_RE.match(l) for l in stripped_lines)

        # Anchored to the page's actual first line, not a line-count
        # threshold: the Preamble page turned out to run to 17 lines once
        # Drafting Note-driven repagination shifted things, which silently
        # missed this page under a "< 15 lines" guess and let it fall
        # through to the plain "no chapter yet" bucket — un-masked, on a
        # dark background it was never designed to sit on unmasked. The
        # heading is always the page's first substantial line; matching
        # that directly is robust to how long the page's body text runs.
        if stripped_lines and compact(stripped_lines[0]) == "PREAMBLE":
            results[i] = None
            dark_pages.add(i)
            continue

        # Part-divider page: short ceremony page whose content is just the
        # (heavily letter-spaced) PART heading and its title, no Article
        # text, no Chapter heading. Matched per-line (compacted, but
        # anchored at both ends) rather than against the whole compacted
        # page: compacting the WHOLE page first, without whitespace to mark
        # line boundaries, lets the regex run on past "PART V" into the
        # title's own first letters — "COMMITTEES" starts with a valid
        # Roman numeral character (C), so an unanchored match reads
        # "PART V" + "C" as "PART VC". Requiring the compacted LINE to be
        # nothing but "PART" + numeral avoids that entirely.
        part_compact_match = None
        for l in stripped_lines:
            m = re.match(rf"^PART({ROMAN_RE})$", compact(l))
            if m:
                part_compact_match = m
                break
        if part_compact_match and not has_chapter_heading and not has_article and len(stripped_lines) < 12:
            # Exclude the "PART <roman>" line itself (its letter-spacing
            # means it won't reliably start with the literal text "PART")
            # and the "Part N of 7" progress caption, keeping only the
            # actual title words (e.g. "FOUNDATIONS").
            title_words = [
                l
                for l in stripped_lines
                if l.isupper() and not compact(l).startswith("PART") and "PAGE" not in l.upper()
            ]
            cur_part = f"Part {part_compact_match.group(1)} — {' '.join(title_words[:3])}".rstrip(" —")
            results[i] = None
            dark_pages.add(i)
            continue

        # The real Schedules heading renders as title case ("Schedules"),
        # not the all-caps "SCHEDULES" the Table of Contents lists it as —
        # matching case-sensitively silently missed the real heading entirely,
        # leaving every Schedule page carrying the last Chapter's stale
        # context. The TOC's own all-caps listing is already excluded by
        # the in_preliminaries gate above, so a case-insensitive match here
        # is safe.
        is_schedules_heading = any(l.strip().upper() == "SCHEDULES" for l in stripped_lines)

        if is_schedules_heading:
            past_chapters = True

        # Chapter heading page: capture the (possibly wrapped) title.
        for j, l in enumerate(lines):
            m = CHAPTER_RE.match(l.strip())
            if m:
                title = m.group(2).strip()
                nxt = lines[j + 1].strip() if j + 1 < len(lines) else ""
                if nxt and nxt.isupper() and not nxt.startswith("ARTICLE") and "GOVERNANCE CHARTER" not in nxt.upper():
                    title = f"{title} {nxt}"
                cur_chapter = f"Chapter {m.group(1)} — {title}"
                break

        if past_chapters:
            sm = SCHEDULE_RE.search(text)
            if sm:
                cur_schedule = sm.group(1)

        # Article range appearing on this physical page.
        arts = [m.group(1) for l in stripped_lines for m in [ARTICLE_HEADING_RE.match(l)] if m]
        art_range = None
        if arts:
            first, last = arts[0], arts[-1]
            art_range = f"Article {first}" if first == last else f"Articles {first}–{last}"

        if past_chapters:
            left = "Schedules" + (f" — Schedule {cur_schedule}" if cur_schedule else "")
            results[i] = {"left": left, "right": ""}
            continue

        if cur_chapter is None:
            results[i] = None
            continue

        left = f"{cur_part} · {cur_chapter}" if cur_part else cur_chapter
        results[i] = {"left": left, "right": art_range or ""}

    return results, dark_pages, back_cover_page


def truncate(c, text, font, size, max_width):
    if c.stringWidth(text, font, size) <= max_width:
        return text
    ell = "…"
    while text and c.stringWidth(text + ell, font, size) > max_width:
        text = text[:-1]
    return text + ell


def draw_page(c, info, page_num, total_pages, is_dark, is_back_cover):
    c.setLineWidth(0.6)

    if not is_dark:
        # Mask the reserved margin band with an opaque white rectangle
        # before drawing anything else. This is a deliberate belt-and-
        # braces fix, not cosmetic: Chromium's print pagination was found,
        # on inspection, to occasionally let a widow line of body text
        # render inside the margin band that should have been reserved
        # (e.g. the last line of a paragraph carried over from the
        # previous page landing above where the header starts) — a real,
        # confirmed collision between body text and the running header,
        # not a hypothetical one. Painting over the margin band, which is
        # supposed to be blank on every light-background page, removes any
        # such stray content regardless of why Chromium placed it there.
        # Dark ceremony pages are full-bleed and must NOT be masked white.
        c.setFillColor(HexColor("#ffffff"))
        c.rect(0, PAGE_H - TOP_MARGIN, PAGE_W, TOP_MARGIN, stroke=0, fill=1)
        c.rect(0, 0, PAGE_W, BOTTOM_MARGIN, stroke=0, fill=1)

    if info is not None:
        # ---- Header ----
        # A single quiet wordmark line, plus the Part/Chapter/Article line
        # below — the earlier version also carried a parenthetical
        # "(DRAFT v7.0 — NOT YET EFFECTIVE)" on this same line, repeated on
        # every one of ~140 body pages in 6.2pt type. That crowded the one
        # header line the directive asks be kept clean, and repeating a
        # legal-status clause at illegible size on every page adds no real
        # protection over stating it clearly in the places a reader
        # actually looks (front cover, status notice, Certificate of
        # Adoption). The status disclosure itself has NOT been removed —
        # it now lives once, prominently, in those pages, and once more,
        # concisely, in the footer below — see Drafting Note 18.
        wordmark = "SULTAN HANAFI ROYAL SCHOOLS  ·  GOVERNANCE CHARTER"
        c.setFont("Helvetica", 6.4)
        c.setFillColor(GOLD_LIGHT)
        c.drawCentredString(PAGE_W / 2, PAGE_H - 16, wordmark)

        c.setStrokeColor(GOLD)
        c.line(SIDE, PAGE_H - 24, PAGE_W - SIDE, PAGE_H - 24)

        c.setFont("Helvetica-Bold", 7.6)
        c.setFillColor(GOLD)
        left_max = PAGE_W - 2 * SIDE - 110
        left_text = truncate(c, info["left"].upper(), "Helvetica-Bold", 7.6, left_max)
        c.drawString(SIDE, PAGE_H - 36, left_text)

        if info["right"]:
            c.setFont("Helvetica", 7.2)
            c.drawRightString(PAGE_W - SIDE, PAGE_H - 36, info["right"])

    # ---- Footer ----
    # The back cover is a premium closing page in its own right (crest,
    # institution name, schools, edition meta, closing note — see
    # generate-constitution-html.js's #back-cover block) and takes no page
    # number and no running-page furniture of any kind, per the directive's
    # explicit "NO page number on the Back Cover."
    if is_back_cover:
        return

    if info is not None:
        # Body/Schedules/Drafting-Notes pages carry the fuller three-zone
        # footer: institution + document identity on the left, the
        # concise status marker centred (the one place on these pages the
        # not-yet-effective status is restated — see the header comment
        # above), and page wayfinding on the right. Widths are measured,
        # not assumed, so the three zones cannot collide at any content
        # length.
        c.setStrokeColor(GOLD)
        c.line(SIDE, BOTTOM_MARGIN - 14, PAGE_W - SIDE, BOTTOM_MARGIN - 14)

        left_text = "SULTAN HANAFI ROYAL SCHOOLS  ·  GOVERNANCE CHARTER"
        center_text = "CONFIDENTIAL — FOR BOARD CONSIDERATION"
        right_text = f"Page {page_num} of {total_pages}"

        c.setFont("Helvetica", 6.1)
        c.setFillColor(GOLD_LIGHT)
        left_max = PAGE_W * 0.36 - SIDE
        c.drawString(SIDE, BOTTOM_MARGIN - 26, truncate(c, left_text, "Helvetica", 6.1, left_max))

        c.setFont("Helvetica-Bold", 6.1)
        c.setFillColor(GOLD)
        c.drawCentredString(PAGE_W / 2, BOTTOM_MARGIN - 26, center_text)

        c.setFont("Helvetica", 7)
        c.setFillColor(GOLD)
        c.drawRightString(PAGE_W - SIDE, BOTTOM_MARGIN - 26, right_text)
    else:
        # Ceremony/divider pages and light preliminary matter keep the
        # quieter single-element footer — deliberately, so the dramatic,
        # mostly-empty ceremony pages (Proclamation, Preamble, Part
        # dividers, Certificate) aren't cluttered with running institutional
        # text that belongs on working content pages, not full-bleed set
        # pieces.
        c.setStrokeColor(GOLD)
        c.line(SIDE, BOTTOM_MARGIN - 14, PAGE_W - SIDE, BOTTOM_MARGIN - 14)
        c.setFont("Helvetica", 7)
        c.setFillColor(GOLD)
        c.drawCentredString(PAGE_W / 2, BOTTOM_MARGIN - 26, f"Page {page_num} of {total_pages}")


def main():
    pages_text = get_pages_text()
    mapping, dark_pages, back_cover_page = classify_and_map(pages_text)

    reader = PdfReader(str(PDF))
    n = len(reader.pages)
    if len(mapping) != n:
        print(f"WARNING: pdftotext page count ({len(mapping)}) != pypdf page count ({n})", file=sys.stderr)

    overlay_path = PDF.with_suffix(".overlay.pdf")
    c = canvas.Canvas(str(overlay_path), pagesize=(PAGE_W, PAGE_H))
    for i in range(n):
        if i == 0:
            c.showPage()  # cover: fully blank overlay page, never masked (full bleed)
            continue
        draw_page(
            c,
            mapping[i] if i < len(mapping) else None,
            i + 1,
            n,
            is_dark=(i in dark_pages),
            is_back_cover=(i == back_cover_page),
        )
        c.showPage()
    c.save()

    overlay_reader = PdfReader(str(overlay_path))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        page.merge_page(overlay_reader.pages[i])
        writer.add_page(page)

    with open(PDF, "wb") as f:
        writer.write(f)
    overlay_path.unlink()

    skipped = sum(1 for i, m in enumerate(mapping) if m is None and i > 0)
    dynamic = sum(1 for i, m in enumerate(mapping) if m is not None)
    print(f"Wrote dynamic running headers/footers: {dynamic} body pages enriched, {skipped} ceremony pages left clean, {n} total.")


if __name__ == "__main__":
    main()
