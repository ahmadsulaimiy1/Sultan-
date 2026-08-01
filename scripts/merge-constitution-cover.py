#!/usr/bin/env python3
"""Splice the header/footer-free page 1 (cover) from the .noheader render
into the fully-paginated flagship PDF, replacing its own page 1.

Run after scripts/render-constitution-pdf.js, which produces both source
files. Deletes the intermediate .noheader.pdf on success. See the note in
render-constitution-pdf.js for why this two-render-merge exists: Chromium's
print pipeline applies one header/footer template to every page of a single
render, so the cover otherwise carries the same running header and page
number as the body text.
"""
import os
from pypdf import PdfReader, PdfWriter

ROOT = os.path.join(os.path.dirname(__file__), "..")
EXPORTS = os.path.join(ROOT, "docs", "exports")
FULL = os.path.join(EXPORTS, "SHRS-Constitution-Flagship-v6.0.pdf")
NOHEADER = os.path.join(EXPORTS, ".SHRS-Constitution-Flagship-v6.0.noheader.pdf")

full = PdfReader(FULL)
noheader = PdfReader(NOHEADER)

if len(full.pages) != len(noheader.pages):
    raise SystemExit(
        f"Page count mismatch between renders ({len(full.pages)} vs "
        f"{len(noheader.pages)}) — both passes must render the same "
        f"document; re-run render-constitution-pdf.js."
    )

writer = PdfWriter()
writer.add_page(noheader.pages[0])
for p in full.pages[1:]:
    writer.add_page(p)

with open(FULL, "wb") as f:
    writer.write(f)

os.remove(NOHEADER)
print(f"Merged: page 1 (cover) from noheader render, pages 2-{len(full.pages)} unchanged. Wrote {FULL}")
