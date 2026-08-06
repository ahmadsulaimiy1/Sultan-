#!/usr/bin/env python3
"""Build the marks layer for a certificate plate.

The plate (functions/_lib/certificate-plate.js) is a flat vector PAPER rect with
this layer composited over it. This script produces that layer so the composite
reproduces the supplied artwork EXACTLY — it is a reconstruction, not a key
tuned by eye.

    source-over:   out = PAPER*(1-a) + C*a
    solve for C:   C   = (S - PAPER*(1-a)) / a

Alpha comes from an ink key (how far a pixel departs from its LOCAL paper tone),
but that alone is not enough: where alpha is small and the mark is strong, the
solved C lands outside 0..255, clips, and the mark comes back wrong. The
constraint has a closed form, so alpha is floored at the value that keeps C in
gamut instead of leaving it to chance:

    C >= 0    =>  a >= 1 - S/PAPER
    C <= 255  =>  a >= (S - PAPER) / (255 - PAPER)

Take the worst channel. With that floor, nothing is ever clipped and the only
residual is 8-bit rounding — measured at 0.05 of 255 mean, 0.47 worst case.

Two things this script learned the hard way, both worth keeping:
  * Solve against the SAVED master, not the in-memory buffer it came from. The
    JPEG's own quantisation is part of what the gate reads back; solving against
    the pre-save pixels left a 1.56/255 residual that had nothing to do with the
    plate.
  * Solve against the ROUNDED 8-bit alpha that will actually be stored. The
    colour solve divides by alpha, so using a higher-precision alpha than the
    file carries bakes in the error of a divisor that never existed.

Usage:
    python3 scripts/build-certificate-marks.py <master.jpg> <out-marks.png> <#RRGGBB>
"""
import sys
import numpy as np
from PIL import Image, ImageFilter


def build(master_path, out_path, paper_hex):
    S = np.asarray(Image.open(master_path).convert('RGB')).astype(float)
    P = np.array([int(paper_hex[i:i + 2], 16) for i in (1, 3, 5)], float)

    lum = S.mean(2)
    sat = S.max(2) - S.min(2)
    # Local paper tone, so the key survives the sheet's own vignette instead of
    # fighting it.
    local = np.asarray(Image.fromarray(lum.astype(np.uint8))
                       .filter(ImageFilter.GaussianBlur(26))).astype(float)

    # Three ways a pixel can be a mark rather than paper. The third matters:
    # without it every specular highlight on the gold and the holographic strips
    # is BRIGHTER than paper, needs a colour above 255, and comes back dull.
    key = np.maximum.reduce([
        np.clip((local - lum) / 26.0, 0, 1),   # darker than paper
        np.clip((lum - local) / 26.0, 0, 1),   # brighter than paper
        np.clip((sat - 20) / 45.0, 0, 1),      # more chromatic than paper
    ])

    a_min = np.clip(np.maximum(
        np.max(1.0 - S / P[None, None, :], axis=2),
        np.max((S - P[None, None, :]) / (255.0 - P[None, None, :]), axis=2),
    ), 0, 1)

    A8 = np.round(np.clip(np.maximum(key * 1.5, a_min), 0.02, 1.0) * 255).astype(np.uint8)
    # Rounding must never land below a_min, or that pixel clips after all.
    A8 = np.maximum(A8, np.ceil(a_min * 255).astype(np.uint8))
    A = A8.astype(float) / 255.0

    C = (S - P[None, None, :] * (1 - A[..., None])) / A[..., None]
    out_of_gamut = ((C < -0.5) | (C > 255.5)).any(2).mean()
    C8 = np.round(np.clip(C, 0, 255)).astype(np.uint8)

    comp = P[None, None, :] * (1 - A[..., None]) + C8.astype(float) * A[..., None]
    d = np.abs(comp - S).mean(2)

    Image.merge('RGBA', (*[Image.fromarray(C8[..., i]) for i in range(3)],
                         Image.fromarray(A8))).save(out_path, optimize=True)

    print(f'{out_path}')
    print(f'  paper                 {paper_hex}')
    print(f'  out of gamut          {out_of_gamut * 100:.4f} %')
    print(f'  mean abs difference   {d.mean():.4f} / 255')
    print(f'  worst pixel           {d.max():.2f} / 255')
    if out_of_gamut > 0 or d.max() > 2.0:
        raise SystemExit('marks layer does not reconstruct the source — refusing to ship it')


if __name__ == '__main__':
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    build(sys.argv[1], sys.argv[2], sys.argv[3].upper())
