#!/usr/bin/env python3
"""Turn a photographed signature into a clean, resolution-free vector asset.

    python3 scripts/trace-signature.py <source-image> <output.svg> [--label "…"]

WHY THIS EXISTS AS A COMMITTED SCRIPT
An asset produced by an ad-hoc command nobody wrote down cannot be regenerated
when the source is re-shot at a better resolution, and this repository has been
bitten by exactly that before. Every constant below is a decision with a reason
attached; re-running this on a better photograph is meant to be one command.

WHAT IT DOES, AND WHY IN THIS ORDER

  1. UPSAMPLE FIRST, THRESHOLD SECOND. Thresholding the source directly gives a
     staircase edge that the tracer then reproduces faithfully as jagged vector.
     Upsampling 10x with Lanczos and a small Gaussian first puts the edge
     between pixels, so the traced curve follows the stroke rather than the
     sampling grid.

  2. THE INK IS THE BRIGHT PIXELS. The supplied capture is light-on-dark — a
     signature written on a dark canvas — so the mask is `> threshold`, not
     `<`. The dark ground is discarded entirely: the output has no background
     at all, which is what lets it sit on the certificate's paper.

  3. EROSION, NOT A HIGHER THRESHOLD, CONTROLS WEIGHT. Raising the threshold
     thins the strokes AND breaks them, because the faintest parts of a stroke
     are its ends and its fast sections. Eroding a generous mask thins evenly
     and leaves the topology intact. Measured on the 2026-08-06 capture:
     threshold alone at 0.26 broke the left loop; erosion to the same ink
     coverage did not.

  4. POTRACE, not a hand-rolled contour tracer. It fits Béziers with corner
     detection, which is what makes the result look like a pen rather than a
     polygon at 600 DPI.

  5. CROP TO THE INK. The output viewBox is the ink's own bounding box plus a
     small margin, so the caller can size it by width and get predictable
     optical weight.

HONEST LIMIT: tracing does not add information. It makes the edges crisp at any
resolution, which is real and worth having, but the stroke SHAPE can only be as
faithful as the source. A 120x86 px photograph traced to vector is a crisp
rendering of a 120x86 px photograph.
"""
import argparse
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

# Measured on the 2026-08-06 Principal's signature capture (120 x 86 px).
UPSAMPLE = 10
BLUR = 1.4          # in upsampled pixels — 0.14 source pixels
THRESHOLD = 0.19    # of the normalised range; the ink is the BRIGHT side
ERODE = 7           # MinFilter kernel, in upsampled pixels
# potrace: -a corner threshold, -O curve optimisation, -t despeckle (px^2).
POTRACE = ['-a', '1.3', '-O', '0.4', '-t', '45']
INK = '#101010'     # fresh black; deliberately not #000 so it separates as
                    # rich black rather than 100% K alone on a warm stock
MARGIN = 30         # in output user units (= bitmap pixels, see below)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('source')
    ap.add_argument('output')
    ap.add_argument('--label', default='Specimen signature')
    ap.add_argument('--threshold', type=float, default=THRESHOLD)
    ap.add_argument('--erode', type=int, default=ERODE)
    args = ap.parse_args()

    im = Image.open(args.source).convert('L')
    src_w, src_h = im.size
    big = im.resize((src_w * UPSAMPLE, src_h * UPSAMPLE), Image.LANCZOS)
    big = big.filter(ImageFilter.GaussianBlur(BLUR))

    a = np.asarray(big).astype(np.float32)
    span = float(a.max() - a.min())
    if span < 8:
        sys.exit(f'{args.source}: the image has almost no contrast '
                 f'(range {span:.1f} of 255) — nothing to separate ink from ground')
    a = (a - a.min()) / span

    mask = Image.fromarray(((a > args.threshold) * 255).astype(np.uint8))
    if args.erode:
        mask = mask.filter(ImageFilter.MinFilter(args.erode))
    coverage = float(np.asarray(mask).mean()) / 255
    if not 0.02 <= coverage <= 0.25:
        sys.exit(f'ink coverage came out at {coverage * 100:.1f}% of the frame. '
                 'Under 2% means the threshold ate the signature; over 25% means '
                 'it kept the background. Adjust --threshold and look at the result.')

    with tempfile.TemporaryDirectory() as td:
        pbm = Path(td) / 'sig.pbm'
        svg = Path(td) / 'sig.svg'
        Image.fromarray(255 - np.asarray(mask)).convert('1').save(pbm)
        subprocess.run(['potrace', str(pbm), '--svg', *POTRACE, '-o', str(svg)],
                       check=True, capture_output=True)
        traced = svg.read_text()

    m = re.search(r'(<g transform="[^"]*"[\s\S]*?</g>)', traced)
    if not m:
        sys.exit('potrace produced no traceable group')
    group = m.group(1).replace('fill="#000000"', f'fill="{INK}"')

    # POTRACE'S USER SPACE IS THE BITMAP'S OWN PIXEL GRID — one user unit per
    # PBM pixel — with the 10x/y-flip living entirely inside the group's
    # transform. So the ink bounds are the mask's pixel bounds, unscaled.
    #
    # The first cut divided them by UPSAMPLE, reasoning from the "scale(0.1)" in
    # that transform. The result was a viewBox a tenth of the size, positioned
    # in the top-left corner, and the asset rendered as an empty frame — which
    # is how this comment came to be written.
    ink = np.argwhere(np.asarray(mask) > 127)
    if not len(ink):
        sys.exit('the mask is empty')
    y0, x0 = ink.min(axis=0)
    y1, x1 = ink.max(axis=0) + 1
    vb = (x0 - MARGIN, y0 - MARGIN, (x1 - x0) + 2 * MARGIN, (y1 - y0) + 2 * MARGIN)

    out = (f'<svg xmlns="http://www.w3.org/2000/svg" '
           f'viewBox="{vb[0]:.2f} {vb[1]:.2f} {vb[2]:.2f} {vb[3]:.2f}" '
           f'role="img" aria-label="{args.label}">\n'
           f'<title>{args.label}</title>\n{group}\n</svg>\n')
    Path(args.output).write_text(out)
    print(f'{args.output}\n'
          f'  source      {src_w} x {src_h} px\n'
          f'  ink         {coverage * 100:.1f}% coverage after erode {args.erode}\n'
          f'  viewBox     {vb[0]:.1f} {vb[1]:.1f} {vb[2]:.1f} {vb[3]:.1f}  '
          f'(aspect {vb[2] / vb[3]:.3f})')


if __name__ == '__main__':
    main()
