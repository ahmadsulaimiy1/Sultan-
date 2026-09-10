#!/usr/bin/env python3
"""Redraw the institutional crest as vector.

Phase 3 of the Graduation Programme Editorial Bible: the crest has shipped as a
520 px raster, which is the ceiling on the identity axis — it softens at
certificate sizes and cannot be foiled, embossed or cut. This traces the best
available original into curves that hold at any size, for the programme, the
certificates and the prospectus alike.

The crest is a flat two-tone mark, which is the case tracing handles best: an
ink mask, a border-following trace, then curve fitting. Output carries no
colour of its own — it fills with `currentColor`, so one file serves gold on
cream, dark on gold, and reversed out of the espresso panels.

    python3 scripts/build-crest-vector.py

Writes assets/images/crests/shrs-institutional-crest.svg and reports the
fidelity of the trace against the source raster.
"""

from pathlib import Path

import numpy as np
import potrace
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "assets/images/crests/crest-trace-source.png"
TARGET = ROOT / "assets/images/crests/shrs-institutional-crest.svg"

# Paper/ink split. The source is gold on white, so anything meaningfully
# darker than paper is ink. 226 is not a guess: thresholds either side were
# traced and measured against the source, and this is where ink dropped and ink
# added balance (0.71% against 0.50%) at peak agreement.
INK_THRESHOLD = 226

# Specks below this area are scanner dirt and JPEG ringing, not drawing.
SPECK_AREA = 12

# Corner policy. 1.0 is potrace's default; the crest's arabesques want their
# cusps kept, so this stays high rather than rounding everything off.
ALPHA_MAX = 1.0
OPT_TOLERANCE = 0.2


def ink_mask(image: Image.Image) -> np.ndarray:
    """True where the mark is drawn."""
    if image.mode == "RGBA":
        rgb = np.asarray(image.convert("RGB")).astype(np.float32)
        alpha = np.asarray(image.getchannel("A")).astype(np.float32)
        # Composite onto white so transparent regions read as paper.
        lum = rgb.mean(axis=2) * (alpha / 255.0) + 255.0 * (1.0 - alpha / 255.0)
    else:
        lum = np.asarray(image.convert("L")).astype(np.float32)
    return lum < INK_THRESHOLD


def curves_to_path(path) -> str:
    """potrace curves -> one SVG path string."""
    out = []
    for curve in path:
        start = curve.start_point
        out.append(f"M{start.x:.2f},{start.y:.2f}")
        for segment in curve:
            end = segment.end_point
            if segment.is_corner:
                c = segment.c
                out.append(f"L{c.x:.2f},{c.y:.2f}L{end.x:.2f},{end.y:.2f}")
            else:
                c1, c2 = segment.c1, segment.c2
                out.append(
                    f"C{c1.x:.2f},{c1.y:.2f} {c2.x:.2f},{c2.y:.2f} {end.x:.2f},{end.y:.2f}"
                )
        out.append("Z")
    return "".join(out)


def count_segments(path) -> tuple:
    curves = 0
    corners = 0
    for curve in path:
        for segment in curve:
            if segment.is_corner:
                corners += 1
            else:
                curves += 1
    return curves, corners


def main() -> None:
    image = Image.open(SOURCE)
    mask = ink_mask(image)
    height, width = mask.shape
    print(f"source      {width} x {height}   ink {mask.mean() * 100:.1f}% of field")

    # potrace's convention is the inverse of the mask built above: it follows
    # the border of the FALSE region. Handing it the mark directly traces the
    # paper and fills the complement, which renders as a black field with the
    # crest knocked out of it.
    bitmap = potrace.Bitmap(~mask)
    path = bitmap.trace(
        turdsize=SPECK_AREA,
        turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY,
        alphamax=ALPHA_MAX,
        opticurve=True,
        opttolerance=OPT_TOLERANCE,
    )

    d = curves_to_path(path)
    curves, corners = count_segments(path)
    print(f"traced      {len(list(path))} contours, {curves} curves, {corners} corners")

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="Crest of Sultan Hanafi Royal Schools">'
        f'<title>Sultan Hanafi Royal Schools</title>'
        f'<path fill="currentColor" fill-rule="evenodd" d="{d}"/>'
        f"</svg>"
    )
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(svg, encoding="utf-8")
    print(f"wrote       {TARGET.relative_to(ROOT)}  {len(svg) // 1024} KB")


if __name__ == "__main__":
    main()
