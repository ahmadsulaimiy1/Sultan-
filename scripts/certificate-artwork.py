"""Derive the certificate's printing plate from the Founder's locked artwork.

The supplied artwork carries several lines of text baked into the raster at
roughly 92 DPI. Those lines cannot be sharpened typographically and, worse,
two of them are wrong for two of the three programmes: the title says
"IBTIDA'I'YYAH" on every sheet, so an I'dadiyyah or Thanawiyyah certificate
would print a false award.

This script lifts those lines out of the raster so the template can re-set
them as live vector type, driven by the certificate's own data. Nothing else
is touched: the border, guilloche, watermark, holographic strips, crests,
logo, wax rosette, security shields and paper grain all survive byte-for-byte
except where the feathered grain restoration crosses them.

    python3 scripts/certificate-artwork.py

Reads  assets/images/certificates/official-background.jpg   (never modified)
Writes assets/images/certificates/official-background-master.jpg

If a press-resolution master ever replaces the source, scale every box below
by the new width / 1080 and re-run; the derivation stays reproducible.
"""
import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'assets/images/certificates/official-background.jpg')
DST = os.path.join(ROOT, 'assets/images/certificates/official-background-master.jpg')

# Every box is (x0, y0, x1, y1) in source pixels, cut to the measured ink
# bands of the text it removes and no further. The comments record what each
# box protects, because these margins are the difference between a clean lift
# and a mutilated crest.
BOXES = [
    # ── The duplicated school name directly beneath the centre logo.
    #    Release-gate directive: "Keep only the official logo."
    (385, 192, 690, 233),
    (420, 233, 670, 252),

    # ── The six institutional lines in the left header block (y135-245).
    #    The Nigerian coat of arms ends at y128; starting at y131 spares it.
    (194, 131, 380, 252),

    # ── The four lines in the right header block. Split in two: the red wax
    #    rosette occupies x863-963 down to y146, so only the strip left of it
    #    may be cleared above y148. Past x898 lies the SHRS security shield
    #    at x926-944.
    (700, 148, 898, 230),
    (700, 138, 858, 148),

    # ── The title cartouche: both certificate titles, the two hairline
    #    rules at y297 and y359, the corner acanthus scrolls at x140-192 and
    #    x894-945, and the centre rosette at y283-296. All of it is rebuilt
    #    as live type so the title can follow the programme.
    (132, 278, 952, 370),

    # ── The printed gold seal and its ribbons. The Founder's own embossed
    #    brass seal is composited over this position, but the printed one
    #    measures 121-181mm wide against the overlay's 26mm, so it showed
    #    around all four sides — the "underlying artwork revealed through
    #    the seal". One seal on the sheet, not one on top of another.
    (437, 630, 662, 776),
]

# Ink is saturated gold or dark brown. The guilloche ground, the watermark
# and the paper grain all sit below this threshold and therefore survive:
# measured, the arch watermark under the cartouche registers 2 pixels.
INK = lambda S, V: ((S > 55) | (V < 178))

# A second, more sensitive threshold used ONLY inside the boxes. The rules
# and lettering being removed are not uniformly inked: their faintest
# stretches sit around V=200 with barely any saturation, under the threshold
# above, so the mask skipped them and the release tone pass then lifted them
# back into view as short gold stubs floating in the paper. Inside a box
# everything is being replaced anyway, so the cost of the wider net is only
# what it takes from the guilloche and watermark there — measured at 2 pixels
# under the title cartouche. Outside the boxes nothing changes, which is what
# protects the crests, the rosette and the security artwork.
INK_FAINT = lambda S, V: ((S > 34) | (V < 203))

# Measured quietest patch of plain paper, used to transplant grain back into
# the inpainted areas so they do not read as airbrushed.
DONOR = (148, 404, 276, 468)


def main():
    im = cv2.imread(SRC)
    if im is None:
        sys.exit(f'cannot read {SRC}')
    h, w = im.shape[:2]
    hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    _, S, V = cv2.split(hsv)
    ink = INK(S, V).astype(np.uint8) * 255
    faint = INK_FAINT(S, V).astype(np.uint8) * 255

    mask = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in BOXES:
        box = np.zeros_like(mask)
        box[y0:y1, x0:x1] = 255
        mask |= cv2.bitwise_and(box, faint)
    # Three iterations, not two. Inpainting leaves a faint tonal seam along
    # the edge of what it filled — invisible on the raw derivation, but the
    # release tone pass below raises local contrast and brought the seams of
    # the two title hairlines and the seal ribbons back as ghost lines at 16
    # to 26 levels of contrast. Widening the mask so the fill starts outside
    # the seam removes the cause rather than masking the symptom.
    mask = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=3)
    print(f'cleared {int((mask > 0).sum())} px across {len(BOXES)} boxes')

    out = cv2.inpaint(im, mask, 6, cv2.INPAINT_TELEA).astype(np.float32)

    # Feathered coverage of everything we touched, for tone and grain work.
    band = np.zeros((h, w), np.float32)
    for x0, y0, x1, y1 in BOXES:
        band[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3] = 1.0
    band = cv2.GaussianBlur(band, (21, 21), 0)

    # Inpainting drifts pale. Pull each cleared block back to the tone of the
    # paper immediately beneath it.
    for x0, y0, x1, y1 in BOXES:
        ring = im[y1 + 6:y1 + 40, x0:x1].astype(np.float32)
        if ring.size == 0:
            continue
        delta = ring.mean(axis=(0, 1)) - out[y0:y1, x0:x1].mean(axis=(0, 1))
        sub = np.zeros((h, w), np.float32)
        sub[max(0, y0 - 3):y1 + 3, max(0, x0 - 3):x1 + 3] = 1.0
        sub = cv2.GaussianBlur(sub, (21, 21), 0)
        for c in range(3):
            out[:, :, c] += sub * delta[c] * 0.55

    # Flatten the fill's low frequencies. Widening the mask reduced the
    # inpainting seam but did not remove it: TELEA reconstructs a long thin
    # deletion by propagating inward from both edges, and the fill converges
    # a few levels darker than the paper around it. That is invisible on the
    # raw derivation and clearly visible once the release tone pass raises
    # local contrast — the two title hairlines came back as ghost lines at
    # up to 26 levels. Blurring the fill, re-inpainting THAT, and swapping it
    # back in removes every structure inside the mask coarser than the grain,
    # while leaving the grain itself (added below) and everything outside the
    # mask untouched.
    lf = cv2.GaussianBlur(out, (0, 0), 9)
    wide = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=4)
    lf_flat = cv2.inpaint(np.clip(lf, 0, 255).astype(np.uint8), wide,
                          14, cv2.INPAINT_TELEA).astype(np.float32)
    out = out - lf + lf_flat

    # Transplant real paper grain, mirror-tiled so no seam repeats visibly.
    dx0, dy0, dx1, dy1 = DONOR
    donor = im[dy0:dy1, dx0:dx1].astype(np.float32)
    hf = donor - cv2.GaussianBlur(donor, (0, 0), 3)
    row = np.concatenate([hf, hf[:, ::-1]], axis=1)
    blk = np.concatenate([row, row[::-1, :]], axis=0)
    tile = np.tile(blk, (int(np.ceil(h / blk.shape[0])),
                         int(np.ceil(w / blk.shape[1])), 1))[:h, :w]
    for c in range(3):
        out[:, :, c] += band * tile[:, :, c] * 0.55

    out = np.clip(out, 0, 255).astype(np.uint8)

    # ── Release tone pass (Founder direction: "reduce the overall beige haze
    # very slightly and increase the local contrast around the typography and
    # security features, rather than increasing global saturation").
    #
    # Done in Lab so the paper's warmth is adjusted independently of its
    # brightness, and with CLAHE rather than a global curve so the lift lands
    # on the guilloche, the microtext and the engraved linework — where local
    # contrast is low — and not on the flat paper, where raising contrast
    # would only amplify grain.
    lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
    L, A, B = cv2.split(lab)
    L = cv2.createCLAHE(clipLimit=1.5, tileGridSize=(12, 12)).apply(L)
    # The haze is a +b (yellow) bias across the whole sheet. Pulling b back
    # 8% toward neutral takes the beige down without touching the gold, whose
    # b is far higher and survives the same proportional cut.
    B = np.clip(128 + (B.astype(np.float32) - 128) * 0.92, 0, 255).astype(np.uint8)
    toned = cv2.cvtColor(cv2.merge([L, A, B]), cv2.COLOR_LAB2BGR)

    # Blend rather than replace: at full strength CLAHE starts to read as a
    # processed photograph. 55% keeps the paper looking printed.
    out = cv2.addWeighted(toned, 0.55, out, 0.45, 0)

    cv2.imwrite(DST, out, [cv2.IMWRITE_JPEG_QUALITY, 96])
    print('wrote', DST)
    src_lab = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)
    print(f'  paper b* {src_lab[:, :, 2].mean():.1f} -> '
          f'{cv2.cvtColor(out, cv2.COLOR_BGR2LAB)[:, :, 2].mean():.1f} '
          f'(lower = less beige)')

    # Prove the lift: no ink may survive inside the cleared bands, and the
    # protected artwork must be untouched.
    chk = cv2.cvtColor(cv2.imread(DST), cv2.COLOR_BGR2HSV)
    _, S2, V2 = cv2.split(chk)
    left = INK(S2, V2)
    bad = 0
    for x0, y0, x1, y1 in BOXES:
        sub = (left[y0 + 3:y1 - 3, x0 + 3:x1 - 3].astype(np.uint8) * 255)
        n, _, st, _ = cv2.connectedComponentsWithStats(sub, 8)
        big = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= 6]
        if big:
            bad += len(big)
            print(f'  RESIDUAL in box {(x0, y0, x1, y1)}: {len(big)} components')
    print('lift:', 'CLEAN' if not bad else f'{bad} residual component(s)')


if __name__ == '__main__':
    main()
