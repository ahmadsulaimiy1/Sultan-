#!/usr/bin/env python3
"""Measure the traced crest against the raster it was traced from.

Axis 9 of the Graduation Programme Editorial Bible: a claim of completion is
backed by a stated check. This renders the SVG back to a bitmap at the source's
own resolution and reports how much of the mark agrees, so "the crest is now
vector" is a measurement rather than an assertion.

    python3 scripts/verify-crest-vector.py
"""

import io
import sys
from pathlib import Path

import cairosvg
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/images/crests/crest-trace-source.png"
VECTOR = ROOT / "assets/images/crests/shrs-institutional-crest.svg"

# A trace is a curve fit, not a copy: a sub-pixel band along every edge will
# always disagree. What matters is that disagreement stays on the edge and
# never becomes a lost limb of the drawing.
MIN_AGREEMENT = 0.985
MAX_EDGE_SHARE = 0.02


def main() -> int:
    source = Image.open(SOURCE).convert("L")
    width, height = source.size
    src = np.asarray(source).astype(np.float32) < 232

    png = cairosvg.svg2png(
        url=str(VECTOR), output_width=width, output_height=height,
        background_color="white",
    )
    out = np.asarray(Image.open(io.BytesIO(png)).convert("L")).astype(np.float32) < 232

    agree = float((src == out).mean())
    missing = float((src & ~out).sum()) / max(int(src.sum()), 1)
    added = float((~src & out).sum()) / max(int(src.sum()), 1)

    print(f"resolution        {width} x {height}")
    print(f"pixels agreeing   {agree * 100:.2f}%")
    print(f"ink dropped       {missing * 100:.2f}% of the mark")
    print(f"ink added         {added * 100:.2f}% of the mark")

    ok = agree >= MIN_AGREEMENT and missing <= MAX_EDGE_SHARE and added <= MAX_EDGE_SHARE
    print("\nRESULT            " + ("PASS" if ok else "FAIL"))
    if not ok:
        print(f"                  wanted >= {MIN_AGREEMENT * 100:.1f}% agreement "
              f"and <= {MAX_EDGE_SHARE * 100:.0f}% drift either way")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
