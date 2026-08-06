#!/usr/bin/env python3
"""Decode every machine-readable code on every sheet, from the PRINT PDF.

    python3 scripts/verify-certificate-codes.py <batch.pdf> <register.json>

This exists because the browser lied. The QR rendered correctly on screen and
decoded from a screenshot, so every earlier check passed — while the PDF that
actually goes to the printer carried a QR no decoder could read at any
resolution. The encoder emitted stroked paths with no stroke-width, which a
browser resolves to one module and the print pipeline resolved to a hairline:
12.1% dark coverage at 300 DPI falling to 5.7% at 1200, against the 52% the
matrix contains.

So this gate rasterises the real PDF at the resolutions a real scan happens
at and reads the codes with an independent decoder (ZXing). Nothing about the
source is trusted; only what comes off the page.

It reads the WHOLE PAGE rather than cropping to where the codes are meant to
be. An earlier version cropped to hand-measured millimetre boxes and reported
all seven QR codes unreadable at 150 DPI — a false failure: the same symbol
decoded from a slightly tighter or slightly wider crop at the same resolution,
so what failed was the crop framing, not the document. Hand-drawn regions also
invite tuning the window until the page passes, which is the opposite of a
gate. A scanner is handed the sheet, not a region of it, so that is what this
does; it is the stricter test as well, since the decoder has to find the
symbols amid the guilloche, microtext and security ground rather than being
pointed at them.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import zxingcpp
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

PDF = sys.argv[1] if len(sys.argv) > 1 else 'dist/certificates/batch.pdf'
REG = sys.argv[2] if len(sys.argv) > 2 else 'dist/certificates/2026-08-08-IBT-000035/graduation-register.json'
# 150 dpi is a phone photograph of a held certificate; 300 is an office
# scanner; 600 is an archival scan. A code that only reads at 600 is not a
# code anyone can use.
DPIS = (150, 200, 300, 600)

register = json.load(open(REG, encoding='utf-8'))
entries = register['entries']


def symbols(im):
    """Every symbol the decoder finds on the page, as (format, payload).

    ZXing spells its format names with spaces ('QR Code', 'Code 128') in some
    builds and without in others, so the name is normalised rather than
    compared verbatim — a spelling difference silently failing every page is
    exactly the kind of false alarm this gate exists to avoid.
    """
    return {(''.join(str(r.format).split()).lower(), r.text)
            for r in zxingcpp.read_barcodes(im)}


failures = []
print(f'\nMachine-readable code gate — {PDF}\n')
print(f'{"page":>5} {"student":<26} {"QR":>22} {"Code128":>22}')

with tempfile.TemporaryDirectory() as td:
    rasters = {}
    for dpi in DPIS:
        subprocess.run(['pdftoppm', '-r', str(dpi), '-png', PDF, f'{td}/p{dpi}'],
                       check=True, capture_output=True)
        rasters[dpi] = sorted(Path(td).glob(f'p{dpi}-*.png'))

    for i, e in enumerate(entries):
        qr_ok, bc_ok = [], []
        # The archive number is the barcode payload: year + 6-digit run.
        want_bc = f'{e["archiveRef"].split("/")[2]}{e["archiveRef"].split("/")[3]}'
        for dpi in DPIS:
            if i >= len(rasters[dpi]):
                failures.append(f'{e["serialNo"]}: no page {i + 1} at {dpi} DPI')
                continue
            found = symbols(Image.open(rasters[dpi][i]))
            qr_ok.append(('qrcode', e['qrUrl']) in found)
            bc_ok.append(('code128', want_bc) in found)
        q = f'{sum(qr_ok)}/{len(DPIS)} DPI'
        b = f'{sum(bc_ok)}/{len(DPIS)} DPI'
        print(f'{i + 1:>5} {e["studentEn"]:<26} {q:>22} {b:>22}')
        if not all(qr_ok):
            failures.append(f'{e["serialNo"]}: QR unreadable at '
                            + ', '.join(str(d) for d, ok in zip(DPIS, qr_ok) if not ok) + ' DPI')
        if not all(bc_ok):
            failures.append(f'{e["serialNo"]}: barcode unreadable at '
                            + ', '.join(str(d) for d, ok in zip(DPIS, bc_ok) if not ok) + ' DPI')

print()
if failures:
    print(f'{len(failures)} FAILURES:')
    for f in failures:
        print('  ' + f)
    sys.exit(1)
print(f'all {len(entries)} QR codes and {len(entries)} barcodes decode from the full '
      f'page at every tested resolution ({", ".join(str(d) for d in DPIS)} DPI),')
print('each to its own register entry')
