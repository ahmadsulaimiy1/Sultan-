#!/usr/bin/env python3
"""Re-render the arms as a single-ink device.

The stock artwork is light line-work drawn to sit on a dark ground — mean
luminance 188 against a paper of 248 — so on ivory it disappears. This
re-renders it in one colour at the density it was drawn, which is also
how arms are actually printed: one ink, no shadow, no bevel.

Run only when the source artwork changes.
"""
import pathlib
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent
INKS = {'crest-coffee.png': ((0x2E, 0x1A, 0x0D), 1.12),
        'crest-gold.png': ((0xB8, 0x8E, 0x3C), 1.15),
        'crest-burgundy.png': ((0x4A, 0x12, 0x28), 1.12)}

src = Image.open(ROOT / 'assets' / 'crest.png').convert('RGBA')
W, H = src.size
sp = src.load()
for name, (rgb, boost) in INKS.items():
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    op = out.load()
    for y in range(H):
        for x in range(W):
            r, g, b, a = sp[x, y]
            if a < 6:
                continue
            lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
            op[x, y] = (*rgb, int(a * min(1.0, lum * boost)))
    out.save(ROOT / 'assets' / name)
    print('single-ink arms written:', name, out.size)
