#!/usr/bin/env python3
"""Builds the Yoruba text face: assets/fonts/charis-sil-yoruba-*.woff2

Why this exists
---------------
None of the site's four families (Cormorant Garamond, Cinzel, Inter, Amiri)
contains U+1EB9 ẹ, U+1ECD ọ or U+1E63 ṣ. Without a face that does, every
Yoruba page falls back to a system font for exactly those letters, so a word
breaks into two typefaces mid-stroke. Charis SIL is drawn by SIL
International for African orthographies and has both the glyphs and the
mark/mkmk positioning that stacks tone marks above an underdot.

Fontsource ships Charis SIL only as Google-style subsets, and the characters
Yoruba needs are split across three of them (latin, latin-ext for ṣ,
vietnamese for ẹ/ọ). This script merges those three and subsets the result
to the exact Yoruba repertoire, turning 3 x ~100 KB into one ~15 KB file per
weight.

Prerequisites
-------------
    pip install fonttools brotli
    npm pack @fontsource/charis-sil && tar xzf fontsource-charis-sil-*.tgz

Run from a directory containing the extracted `package/` folder:
    python3 scripts/build-yoruba-font.py

Re-run only when changing the repertoire or upgrading Charis SIL; the built
woff2 files are committed, so a normal site build never needs this.
"""

from fontTools.ttLib import TTFont
from fontTools.merge import Merger
from fontTools import subset
import os, sys

# The exact repertoire a Yoruba page needs: ASCII (names, numerals, URLs and
# the Latin brand devices the editorial bible keeps unlocalised), the seven
# Yoruba vowels/consonants that carry underdots, the three combining marks
# that stack tone over them, and the typographic punctuation the site uses.
YORUBA = set()
YORUBA |= set(range(0x20, 0x7F))                      # ASCII
YORUBA |= {0x1EB8,0x1EB9,0x1ECC,0x1ECD,0x1E62,0x1E63} # Ẹẹ Ọọ Ṣṣ
YORUBA |= {0x0300,0x0301,0x0304,0x0323,0x0331}        # grave, acute, macron, dot below, line below
YORUBA |= {0x00C0,0x00C1,0x00C8,0x00C9,0x00CC,0x00CD, # precomposed À Á È É Ì Í
           0x00D2,0x00D3,0x00D9,0x00DA,               # Ò Ó Ù Ú
           0x00E0,0x00E1,0x00E8,0x00E9,0x00EC,0x00ED, # à á è é ì í
           0x00F2,0x00F3,0x00F9,0x00FA}               # ò ó ù ú
YORUBA |= {0x2018,0x2019,0x201C,0x201D,0x2013,0x2014, # ‘ ’ “ ” – —
           0x2026,0x00A0,0x202F,0x00B7,0x00AB,0x00BB} # … nbsp nnbsp · « »

def build(weight, style, out):
    parts = []
    for sub in ('latin', 'latin-ext', 'vietnamese'):
        p = f'package/files/charis-sil-{sub}-{weight}-{style}.woff2'
        if not os.path.exists(p):
            continue
        f = TTFont(p)
        f.flavor = None                 # merge needs uncompressed input
        tmp = f'/tmp/fontgrab/_{sub}-{weight}-{style}.ttf'
        f.save(tmp)
        parts.append(tmp)
    merged = Merger().merge(parts)
    opts = subset.Options()
    opts.layout_features = ['*']        # keep mark/mkmk so tone stacks correctly
    opts.notdef_outline = True
    opts.recalc_bounds = True
    opts.drop_tables = []
    s = subset.Subsetter(options=opts)
    s.populate(unicodes=YORUBA)
    s.subset(merged)
    merged.flavor = 'woff2'
    merged.save(out)
    return os.path.getsize(out)

for weight, style, name in [('400','normal','charis-sil-yoruba-400-normal.woff2'),
                            ('700','normal','charis-sil-yoruba-700-normal.woff2'),
                            ('400','italic','charis-sil-yoruba-400-italic.woff2')]:
    out = '/workspace/sultan-/assets/fonts/' + name
    try:
        size = build(weight, style, out)
        print(f'{name:42} {size//1024} KB')
    except Exception as e:
        print(f'{name} FAILED: {e}', file=sys.stderr)
