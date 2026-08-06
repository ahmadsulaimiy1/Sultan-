#!/usr/bin/env python3
"""Assert the certificate plate carries no seal of its own.

    python3 scripts/verify-plate-single-seal.py

The I'dadiyyah artwork shipped with a blank gold rosette and ribbon mount in the
lower centre. The school's real embossed seal is a separate element placed over
it, and the two never registered, so the sheet showed one seal printed twice.
scripts/remove-plate-seal-mount.py clears the mount and the marks layer is
re-solved from the cleared plate.

This checks the artefact that actually ships — the marks layer composited over
its vector paper, which is exactly what the sheet renders — rather than the
intermediate JPEG. That matters: the failure this guards against is someone
re-running build-certificate-marks.py against the ORIGINAL plate, which would
silently restore the second seal while every other check still passed.

It measures the two quantities that identified the mount in the first place,
chroma and edge energy, and compares the seal region against clean paper
elsewhere on the same rows. A returned rosette lifts both well clear.
"""
import sys

import numpy as np
from PIL import Image, ImageFilter

MARKS = 'assets/images/certificates/official-background-idd-marks.png'
PAPER = (0xF4, 0xEC, 0xDF)
SEAL_REGION = (134.0, 163.0, 165.0, 206.0)   # x0, x1, y0, y1 in mm
CLEAN_REGION = (100.0, 129.0, 165.0, 206.0)  # same rows, known clear
TOLERANCE = 1.35                              # of the clean-paper reading


def main():
    rgba = np.asarray(Image.open(MARKS).convert('RGBA')).astype(float)
    a = rgba[..., 3:4] / 255.0
    comp = np.array(PAPER, float)[None, None, :] * (1 - a) + rgba[..., :3] * a
    h, w, _ = comp.shape
    sx, sy = w / 297.0, h / 210.0

    def score(region):
        x0, x1, y0, y1 = region
        r = comp[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)]
        lum = r.mean(2)
        loc = np.asarray(Image.fromarray(lum.astype(np.uint8))
                         .filter(ImageFilter.GaussianBlur(24))).astype(float)
        return np.abs(lum - loc).mean(), (r.max(2) - r.min(2)).mean()

    seal_edge, seal_chroma = score(SEAL_REGION)
    ref_edge, ref_chroma = score(CLEAN_REGION)

    # A gold rosette is not merely busy, it is RED-SHIFTED gold. Count it.
    x0, x1, y0, y1 = SEAL_REGION
    r = comp[int(y0 * sy):int(y1 * sy), int(x0 * sx):int(x1 * sx)]
    ribbon = ((r[..., 0] > 105) & (r[..., 1] < 95) & (r[..., 2] < 95)).sum()

    print('\nPlate seal-region check — the sheet must carry ONE seal\n')
    print(f'  region        x {x0}..{x1}mm  y {y0}..{y1}mm  of {MARKS}')
    print(f'  edge energy   {seal_edge:6.2f}   clean paper on the same rows reads {ref_edge:6.2f}')
    print(f'  chroma        {seal_chroma:6.2f}   clean paper on the same rows reads {ref_chroma:6.2f}')
    print(f'  ribbon pixels {ribbon}')

    fails = []
    if seal_edge > ref_edge * TOLERANCE:
        fails.append(f'edge energy {seal_edge:.2f} exceeds {ref_edge * TOLERANCE:.2f}')
    if seal_chroma > ref_chroma * TOLERANCE:
        fails.append(f'chroma {seal_chroma:.2f} exceeds {ref_chroma * TOLERANCE:.2f}')
    if ribbon:
        fails.append(f'{ribbon} ribbon-red pixels present')

    if fails:
        print('\nFAIL — the plate appears to carry a seal device again:')
        for f in fails:
            print(f'  {f}')
        print('  the marks layer was probably re-solved from the UNCLEARED plate;')
        print('  re-run scripts/remove-plate-seal-mount.py then build-certificate-marks.py')
        return 1
    print('\nPASS — the plate carries no seal of its own.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
