#!/usr/bin/env python3
"""Remove the plate's BLANK seal rosette and ribbon mount.

AUTHORISED BY THE FOUNDER, 2026-08-06: "Remove the overlap entirely. Reposition
or redesign the surrounding elements so every security feature has proper
breathing room. The embossed seal must remain the dominant focal point."

WHY. The supplied plate carries its own gold rosette with red ribbons at
x 135.3-161.7mm, y 167.0-204.2mm. It is BLANK — no device, no text, no
institutional identity. It is the artwork's "affix your seal here" furniture.

The school's real embossed seal is placed over it, and the two do not register:
measured on the composite, the live seal is 34.00 x 33.37mm centred at
(148.50, 188.28) while the plate's disc is 25.30 x 26.73mm centred at
(148.50, 180.37). Horizontally they agree exactly; vertically the live seal
sits 7.91mm LOWER, and it is 8.70mm wider. So 4.59mm of the plate's disc crowns
above the real seal and the plate's ribbon tails emerge below it. That reads as
one seal printed twice out of register — which is what the Founder saw.

Registering the real seal onto the plate's mount was measured first and does not
fit: to clear the signature block (which ends at x 136.50mm) with a centre at
x 148.50mm the seal can be at most 24mm wide, and the plate's disc is 25.30mm.
It cannot be covered without either colliding with live content or shrinking
below the thing it must hide. Removing the blank furniture is the fix that
leaves every live element where it belongs.

HOW, AND WHAT IS ASSERTED. The region is replaced by a patch cloned from the
SAME ROWS, displaced horizontally. Sampling the same rows is what preserves the
structure the region crosses: the paper vignette, the guilloche, and the gold
border band the ribbon tails run over near the foot of the sheet. A donor taken
from different rows would have rebuilt that band out of phase.

Everything outside the patch is asserted unchanged across the whole sheet, and
the device is asserted gone by the two measures that identified it in the first
place — chroma and edge energy must fall into the donor's range, not merely
"look better".

The Founder's supplied file is never overwritten. The cleared plate is written
alongside it under its own name, so the original artwork stays byte-identical to
what was supplied — which is what provenance on a credential requires. The marks
layer is then re-solved from the cleared plate, and that is what the sheet
actually composites.

Usage:
    python3 scripts/remove-plate-seal-mount.py <plate.jpg> <cleared.jpg>
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

# Measured, not assumed. The rosette+ribbon bounding box with a working margin.
REGION_MM = dict(x0=134.0, x1=163.0, y0=165.0, y1=205.8)
DONOR_DX_MM = -34.0     # same rows, 34mm to the left: edge energy 11.1 vs 47.5
PAD_MM = 2.0            # cosine feather, in millimetres


def remove(plate_path, out_path):
    im = Image.open(plate_path).convert('RGB')
    src = np.asarray(im).astype(float)
    h, w, _ = src.shape
    sx, sy = w / 297.0, h / 210.0

    def px(mm):
        return int(round(mm * sx))

    def py(mm):
        return int(round(mm * sy))

    pad_x, pad_y = px(PAD_MM), py(PAD_MM)
    x0, x1 = px(REGION_MM['x0']) - pad_x, px(REGION_MM['x1']) + pad_x
    y0, y1 = py(REGION_MM['y0']) - pad_y, py(REGION_MM['y1']) + pad_y
    dx = px(DONOR_DX_MM)

    out = src.copy()
    tgt = src[y0:y1, x0:x1]
    donor = src[y0:y1, x0 + dx:x1 + dx].copy()

    # Tone-match on the paper RING around the region, never on the region
    # itself — the seal's own gold would drag the correction warm.
    ring = np.concatenate([
        src[y0 - py(6):y0, x0:x1].reshape(-1, 3),
        src[y1:y1 + py(2), x0:x1].reshape(-1, 3),
        src[y0:y1, x0 - px(5):x0].reshape(-1, 3),
        src[y0:y1, x1:x1 + px(5)].reshape(-1, 3),
    ])
    donor_ring = np.concatenate([
        src[y0 - py(6):y0, x0 + dx:x1 + dx].reshape(-1, 3),
        src[y1:y1 + py(2), x0 + dx:x1 + dx].reshape(-1, 3),
    ])
    donor = np.clip(donor + (ring.mean(0) - donor_ring.mean(0)), 0, 255)

    fy, fx = np.ones(y1 - y0), np.ones(x1 - x0)
    ry = 0.5 - 0.5 * np.cos(np.pi * np.arange(pad_y) / pad_y)
    rx = 0.5 - 0.5 * np.cos(np.pi * np.arange(pad_x) / pad_x)
    fy[:pad_y], fy[-pad_y:] = ry, ry[::-1]
    fx[:pad_x], fx[-pad_x:] = rx, rx[::-1]
    alpha = (fy[:, None] * fx[None, :])[..., None]
    out[y0:y1, x0:x1] = tgt * (1 - alpha) + donor * alpha

    # ── The guarantees, measured ───────────────────────────────────────────
    touched = np.zeros((h, w), bool)
    touched[y0:y1, x0:x1] = True
    outside = np.abs(out - src).max(2)[~touched]

    def score(img, xa, xb):
        reg = img[py(164):py(207), px(xa):px(xb)]
        lum = reg.mean(2)
        loc = np.asarray(Image.fromarray(lum.astype(np.uint8))
                         .filter(ImageFilter.GaussianBlur(24))).astype(float)
        return np.abs(lum - loc).mean(), (reg.max(2) - reg.min(2)).mean()

    before = score(src, 134.5, 162.5)
    after = score(out, 134.5, 162.5)
    donor_ref = score(src, 100.0, 128.0)
    red_left = ((out[py(165):py(206), px(134):px(163)][..., 0] > 105)
                & (out[py(165):py(206), px(134):px(163)][..., 1] < 95)
                & (out[py(165):py(206), px(134):px(163)][..., 2] < 95)).sum()

    print(f'patch        x {x0 / sx:.1f}..{x1 / sx:.1f}mm  y {y0 / sy:.1f}..{y1 / sy:.1f}mm  '
          f'({x1 - x0} x {y1 - y0} px, {PAD_MM}mm feather)')
    print(f'donor        same rows, {DONOR_DX_MM:+.0f}mm — preserves the border band phase')
    print(f'outside the patch: max change {outside.max():.0f} / 255 over {(~touched).sum():,} pixels')
    print(f'edge energy  {before[0]:6.2f} -> {after[0]:6.2f}   (clean paper reads {donor_ref[0]:.2f})')
    print(f'chroma       {before[1]:6.2f} -> {after[1]:6.2f}   (clean paper reads {donor_ref[1]:.2f})')
    print(f'red ribbon pixels remaining in the region: {red_left}')

    if outside.max() != 0:
        raise SystemExit('REFUSING TO WRITE: pixels outside the patch changed')
    if after[0] > donor_ref[0] * 1.35 or after[1] > donor_ref[1] * 1.35:
        raise SystemExit('REFUSING TO WRITE: the region is still busier than clean paper')
    if red_left > 0:
        raise SystemExit(f'REFUSING TO WRITE: {red_left} ribbon pixels survive')

    Image.fromarray(out.round().astype(np.uint8)).save(out_path, quality=96, subsampling=0)
    print(f'wrote {out_path}   (source left untouched)')


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    remove(sys.argv[1], sys.argv[2])
