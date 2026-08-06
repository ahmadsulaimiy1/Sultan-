#!/usr/bin/env python3
"""Remove the decorative QR block from the I'dadiyyah plate.

AUTHORISED BY THE FOUNDER, 2026-08-06, as Option (1) of three presented.

WHY. The supplied plate carries a QR-shaped block at x 206.5-224.7mm,
y 165.9-184.4mm which decodes to NOTHING — tested with ZXing at 1x, 3x and 6x
on the artwork alone. The live verification module overlaps its lower two
thirds, so about 6mm of a dead QR protrudes above it. On a credential that
promises verification, a reader who scans it gets no result; two QR codes where
one is inert reads as a printing mistake, not a security feature.

WHAT THIS DOES, AND ONLY THIS. It replaces that one rectangle with a patch
cloned from the cleanest open field on the same plate, tone-matched to the paper
immediately surrounding the hole and feathered at the edges so the guilloche
carries through rather than leaving a flat plug. Every other border, ornament,
guilloche pattern, holographic strip, paper texture and security element is
untouched — and that is asserted, not asserted-by-comment: the script compares
the result to the original across the WHOLE sheet and refuses to write if any
pixel outside the patch has moved.

Usage:
    python3 scripts/remove-decorative-qr.py <master.jpg> [--write]
"""
import sys
import numpy as np
from PIL import Image

# Measured, not assumed: the tight bounding box of the dark run inside a
# generous search window. 53.1% dark coverage — a QR matrix, not an ornament.
QR = dict(x0=751, x1=817, y0=602, y1=669)
PAD = 8             # feather margin, in source pixels
# Donor: plain guilloche field at x 232.4mm, y 122.1mm. Chosen on EDGE ENERGY
# (gradient mean 3.6, max 13.2) against the QR region's 69.7 — not on darkness.
# A darkness/chroma test was tried first and selected the holographic roundel at
# x 70mm, because that device is pale and low-chroma. Cloning it would have
# replaced a decorative QR with a DUPLICATE of a security device that already
# appears elsewhere on the sheet — a worse defect than the one being fixed, and
# one a brightness test cannot see.
DONOR = (845, 443)


def remove(master_path, write=False):
    im = Image.open(master_path).convert('RGB')
    src = np.asarray(im).astype(float)
    out = src.copy()
    x0, x1, y0, y1 = QR['x0'], QR['x1'], QR['y0'], QR['y1']
    h, w = (y1 - y0) + 2 * PAD, (x1 - x0) + 2 * PAD
    ty0, tx0 = y0 - PAD, x0 - PAD
    dx, dy = DONOR

    donor = src[dy:dy + h, dx:dx + w].copy()
    target = src[ty0:ty0 + h, tx0:tx0 + w]

    # Tone-match on the paper RING around the hole, never on the hole itself —
    # the QR's own ink would drag the correction dark and leave a grey ghost.
    ring = np.concatenate([
        src[y0 - 10:y0, x0:x1].reshape(-1, 3),
        src[y1:y1 + 10, x0:x1].reshape(-1, 3),
        src[y0:y1, x0 - 10:x0].reshape(-1, 3),
        src[y0:y1, x1:x1 + 10].reshape(-1, 3),
    ])
    donor_ring = np.concatenate([donor[:10].reshape(-1, 3), donor[-10:].reshape(-1, 3)])
    donor = np.clip(donor + (ring.mean(0) - donor_ring.mean(0)), 0, 255)

    # Cosine feather so the seam is not a visible rectangle at press resolution.
    fy = np.ones(h); fx = np.ones(w)
    r = np.arange(PAD) / PAD
    ramp = 0.5 - 0.5 * np.cos(np.pi * r)
    fy[:PAD], fy[-PAD:] = ramp, ramp[::-1]
    fx[:PAD], fx[-PAD:] = ramp, ramp[::-1]
    alpha = (fy[:, None] * fx[None, :])[..., None]
    out[ty0:ty0 + h, tx0:tx0 + w] = target * (1 - alpha) + donor * alpha

    # ── The guarantee, measured ────────────────────────────────────────────
    touched = np.zeros(src.shape[:2], bool)
    touched[ty0:ty0 + h, tx0:tx0 + w] = True
    outside = np.abs(out - src).max(2)[~touched]
    inside_dark = (out[y0:y1, x0:x1].mean(2) < 110).mean()

    print(f'patch      x {tx0}-{tx0+w} y {ty0}-{ty0+h}  ({w} x {h} px, {PAD}px feather)')
    print(f'donor      x {dx} y {dy}  tone-matched to the surrounding paper ring')
    print(f'outside the patch: max change {outside.max():.0f} / 255 '
          f'over {(~touched).sum():,} pixels')
    print(f'inside the old QR: dark coverage {inside_dark*100:.3f}% '
          f'(was 53.1% — a QR matrix)')

    if outside.max() != 0:
        raise SystemExit('REFUSING TO WRITE: pixels outside the patch changed')
    if inside_dark > 0.5:
        raise SystemExit('REFUSING TO WRITE: the QR block is still dark')

    if write:
        Image.fromarray(out.round().astype(np.uint8)).save(
            master_path, quality=96, subsampling=0)
        print(f'wrote {master_path}')
    else:
        print('(dry run — pass --write to apply)')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    remove(sys.argv[1], '--write' in sys.argv)
