"""Prepare the two official signatures for print from the Founder's photographs.

Both were photographed on white paper under uneven room light — one in red
ink, one in blue — so a plain threshold either eats the light strokes or
keeps a grey cast of the paper. This does the job the way a repro house
would: estimate the paper illumination, divide it out, measure the ink in
the channel where that pen actually differs from paper, and carry the
resulting ink density straight into the alpha channel. Stroke weight,
pressure variation and pen skips all survive; nothing is redrawn, smoothed,
traced or converted to a font.

    python3 scripts/certificate-signatures.py

Reads  scripts/signature-sources/*.jpg   (the untouched photographs)
Writes assets/images/certificates/signature-principal.png
       assets/images/certificates/signature-chairman.png
       assets/images/certificates/security-emblem-shrs.png
"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'scripts/signature-sources')
OUT = os.path.join(ROOT, 'assets/images/certificates')

# Printing ink: a warm near-black rather than 0,0,0. A pure-black signature
# next to the certificate's brown-black engraved type reads as a paste-up.
INK = (26, 20, 14)          # BGR


def lift(path, gain, floor, inset):
    """Return an RGBA image of the ink alone, alpha = ink density."""
    im = cv2.imread(path)
    if im is None:
        sys.exit(f'cannot read {path}')

    # Crop off the photograph's own frame. One of the two was shot close
    # enough that the edge of the paper is in shot as a dark band, and a
    # dark band is exactly what an ink detector is built to find. Measured
    # per source: the chairman's left column carries 160 sub-120 pixels,
    # decaying to 4 by six pixels in, while neither signature's strokes
    # reach the outer columns at all.
    if inset:
        im = im[inset:-inset, inset:-inset]

    # Flat-field: a heavy blur of the photograph IS the paper illumination,
    # because the strokes are thin relative to the lighting gradient.
    # Dividing by it removes the shadow across the sheet without touching
    # stroke contrast.
    grey = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY).astype(np.float32)
    paper = cv2.GaussianBlur(grey, (0, 0), max(im.shape) / 22.0)
    flat = np.clip(grey / np.maximum(paper, 1e-3), 0, 2.0)

    # Ink density from the flat field, plus the pen's own chroma: coloured
    # ink separates from grey paper far more cleanly in saturation than in
    # luminance, and the faintest tail strokes only survive if both are used.
    dens = np.clip((1.0 - flat) * gain, 0, 1)
    S = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)[:, :, 1].astype(np.float32) / 255.0
    dens = np.maximum(dens, np.clip((S - 0.10) * 2.2, 0, 1))

    # Floor away the paper texture, then rescale so the darkest stroke is
    # fully opaque. Sub-floor values go to zero rather than to a grey haze.
    dens = np.clip((dens - floor) / (1.0 - floor), 0, 1)
    if dens.max() > 0:
        dens = np.clip(dens / np.percentile(dens[dens > 0.02], 99.5), 0, 1)

    # Drop dust and paper flecks without touching a single pen mark. Area
    # alone is not enough to tell them apart — this signature ends in a
    # deliberate 477px dot, larger than some flecks. What separates them is
    # that a pen mark sits inside the writing band while a fleck sits out in
    # the margin, so a component is discarded only when it is BOTH tiny
    # relative to the main stroke AND far outside it. Measured on the source:
    # the flecks are 41% of the frame height away, the real dots 3% and 18%.
    solid = (dens > 0.30).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(solid, 8)
    if n > 1:
        order = sorted(range(1, n), key=lambda i: -st[i, cv2.CC_STAT_AREA])
        main = (lab == order[0]).astype(np.uint8)
        away = cv2.distanceTransform(1 - main, cv2.DIST_L2, 5)
        limit = 0.25 * dens.shape[0]
        keep = np.zeros(dens.shape, bool)
        for i in order:
            tiny = st[i, cv2.CC_STAT_AREA] < 0.001 * st[order[0], cv2.CC_STAT_AREA]
            far = away[int(cen[i][1]), int(cen[i][0])] > limit
            if not (tiny and far):
                keep |= (lab == i)
        # What survives the inset crop of the photograph's frame is a chip
        # in a corner or a sliver along an edge. A frame remnant hugs the
        # border — it touches an edge and barely reaches inward. A real
        # stroke that runs off the edge drives deep into the frame: measured
        # here, the remnants reach 5px and 3px inward, the cropped strokes
        # 131px and 122px. That gap, not area, is what tells them apart.
        for i in order:
            x, y, bw, bh, _ = st[i]
            hugs = ((y == 0 and bh <= 5) or (y + bh >= dens.shape[0] and bh <= 5)
                    or (x == 0 and bw <= 5) or (x + bw >= dens.shape[1] and bw <= 5))
            if hugs:
                keep &= ~(lab == i)
        keep = cv2.dilate(keep.astype(np.uint8), np.ones((5, 5), np.uint8), 2) > 0
        dens = np.where(keep, dens, 0)

    ys, xs = np.nonzero(dens > 0.04)
    if not len(ys):
        sys.exit(f'no ink found in {path}')
    pad = 6
    y0, y1 = max(0, ys.min() - pad), min(dens.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(dens.shape[1], xs.max() + pad + 1)
    a = dens[y0:y1, x0:x1]

    rgba = np.zeros((a.shape[0], a.shape[1], 4), np.uint8)
    for c in range(3):
        rgba[:, :, c] = INK[c]
    rgba[:, :, 3] = (a * 255).astype(np.uint8)
    return rgba


def restore_emblem(path):
    """Restore the SHRS security shield: it was photographed off the sheet,
    so it carries the paper's cast and the camera's softness. Neutralise the
    cast, recover local contrast, and sharpen the edge — no redrawing."""
    im = cv2.imread(path).astype(np.float32)
    # Grey-world white balance against the paper corners, which are known
    # to be unprinted.
    h, w = im.shape[:2]
    corners = np.concatenate([im[:h // 8, :w // 8].reshape(-1, 3),
                              im[:h // 8, -w // 8:].reshape(-1, 3),
                              im[-h // 8:, :w // 8].reshape(-1, 3),
                              im[-h // 8:, -w // 8:].reshape(-1, 3)])
    ref = corners.mean(axis=0)
    im = np.clip(im * (ref.mean() / np.maximum(ref, 1e-3)), 0, 255)

    lab = cv2.cvtColor(im.astype(np.uint8), cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    L = cv2.createCLAHE(clipLimit=2.4, tileGridSize=(8, 8)).apply(L)
    im = cv2.cvtColor(cv2.merge([L, A, B]), cv2.COLOR_LAB2BGR).astype(np.float32)

    # Unsharp at two radii: the fine one recovers the shield's engraved
    # detail, the wide one restores the modelling the camera flattened.
    for r, amt in ((1.1, 0.55), (3.0, 0.30)):
        im = im + amt * (im - cv2.GaussianBlur(im, (0, 0), r))
    im = np.clip(im, 0, 255)

    up = cv2.resize(im, None, fx=3, fy=3, interpolation=cv2.INTER_LANCZOS4)
    rgba = cv2.cvtColor(up.astype(np.uint8), cv2.COLOR_BGR2BGRA)
    return rgba


def main():
    os.makedirs(OUT, exist_ok=True)
    jobs = [
        # gain, floor and inset are per-source: the red ballpoint was photographed
        # further from the lens and sits lighter on the page than the blue.
        ('signature-principal.png', 'principal.jpg', 3.4, 0.16, 0),
        ('signature-chairman.png', 'chairman.jpg', 3.0, 0.14, 6),
    ]
    for name, src, gain, floor, inset in jobs:
        rgba = lift(os.path.join(SRC, src), gain, floor, inset)
        cv2.imwrite(os.path.join(OUT, name), rgba)
        a = rgba[:, :, 3]
        print(f'{name}: {rgba.shape[1]}x{rgba.shape[0]}px, '
              f'{int((a > 0).sum())} ink px, {int((a == 255).sum())} fully opaque')

    em = restore_emblem(os.path.join(SRC, 'emblem.jpg'))
    cv2.imwrite(os.path.join(OUT, 'security-emblem-shrs.png'), em)
    print(f'security-emblem-shrs.png: {em.shape[1]}x{em.shape[0]}px')


if __name__ == '__main__':
    main()
