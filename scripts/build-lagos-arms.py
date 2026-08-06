#!/usr/bin/env python3
"""Prepare the supplied Lagos State Coat of Arms for the certificate header.

SOURCE: supplied by the Founder, 2026-08-06. 230 x 243 px JPEG, no ICC profile.

WHAT THIS DOES, AND DELIBERATELY DOES NOT DO.

It removes the white background box and nothing else. The device's colours,
proportions and edges are the supplied file's own. There is no upscaling, no
sharpening, no tracing and no redrawing: at 15mm tall this artwork is 406 DPI,
which is above the 300 DPI press floor but below the Nigerian arms' 743 DPI,
and the honest fix for that gap is a larger original — not invented detail.

Two things make the background removal safe rather than approximate:

  * Only white CONNECTED TO THE IMAGE EDGE is removed. The device encloses
    white of its own — the shield field, the highlights on the palms, the
    lettering knockouts — measured at 3.4% of the image. A plain
    "white becomes transparent" key would punch holes straight through it.

  * The alpha ramps through the JPEG halo instead of stepping. Baseline JPEG
    rings around hard edges, and 5.2% of this image sits in the ambiguous
    200..243 luminance band. A hard threshold there leaves a bright fringe on
    a warm ivory certificate; ramping across the band lets the edge sit down
    on the paper.

The script refuses to write if the key would eat enclosed white.
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage

SRC, OUT = sys.argv[1], sys.argv[2]

rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
lum = rgb.mean(2)

# Flood the background in from the border, so enclosed white is never reached.
seed = lum > 240
lab, _ = ndimage.label(seed)
edge = set(lab[0]) | set(lab[-1]) | set(lab[:, 0]) | set(lab[:, -1])
edge.discard(0)
background = np.isin(lab, list(edge))

enclosed = (lum > 240) & ~background

# Dilate slightly so the halo immediately outside the ink counts as background
# too, then build alpha by ramping across the halo band rather than stepping.
#
# The dilation must NOT be allowed into enclosed white. Where a thin ink stroke
# separates the background from the shield's own white field, two iterations
# step straight over it, and the ramp then drives that interior white to alpha
# 0 — a hole punched through the device. The guard below caught exactly that on
# the first run; excluding `enclosed` is the fix, and the guard stays because it
# is what noticed.
halo = ndimage.binary_dilation(background, iterations=2) & ~background & ~enclosed
alpha = np.ones_like(lum)
alpha[background] = 0.0
ramp = np.clip((243.0 - lum) / (243.0 - 200.0), 0.0, 1.0)   # 243->0, 200->1
alpha[halo] = ramp[halo]

if alpha[enclosed].min() < 0.99:
    raise SystemExit('REFUSING TO WRITE: the key reaches white enclosed by the device')

# Trim the transparent margin so the emblem's own extent drives its placement,
# rather than the whitespace the supplied file happens to carry.
ys, xs = np.where(alpha > 0.02)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
rgb_t, a_t = rgb[y0:y1 + 1, x0:x1 + 1], alpha[y0:y1 + 1, x0:x1 + 1]

Image.merge('RGBA', (*[Image.fromarray(rgb_t[..., i].round().astype(np.uint8)) for i in range(3)],
                     Image.fromarray((a_t * 255).round().astype(np.uint8)))).save(OUT, optimize=True)

h, w = a_t.shape
print(f'{OUT}')
print(f'  source            {SRC.split("/")[-1]}  {rgb.shape[1]} x {rgb.shape[0]} px')
print(f'  trimmed to device {w} x {h} px  (aspect {w / h:.4f})')
print(f'  background keyed  {background.mean() * 100:.1f}%   halo ramped {halo.mean() * 100:.1f}%')
print(f'  enclosed white    {enclosed.mean() * 100:.1f}%  preserved, min alpha {alpha[enclosed].min():.3f}')
for mm in (13, 14, 15, 16):
    print(f'  at {mm}mm tall     {round(h / mm * 25.4)} DPI, {w / h * mm:.1f}mm wide')
