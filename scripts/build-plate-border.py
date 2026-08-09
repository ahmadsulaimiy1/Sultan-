#!/usr/bin/env python3
"""Build the Senior Secondary border plate from the Founder's own artwork.

WHY THIS EXISTS
---------------
The border on the Senior Secondary certificate is not a design decision. It is
a locked masterwork the Founder supplied, and his instruction is that it be
reproduced exactly — not interpreted, not redrawn "in the spirit of", not
approximated. Two earlier attempts drew it again as vector and both were
rejected, correctly: a redraw is by definition a different plate.

So this takes the other route he authorised from the start — upscale the
artwork itself — and solves the two problems that make a naive upscale wrong.

PROBLEM 1: THE SHEET IS THE WRONG SHAPE
The artwork is 1080 x 708 px, an aspect of 1.525. A4 landscape is 1.414.
Scaling the whole image to fit would stretch the border 8% in one axis, which
thickens the head and foot relative to the sides and distorts every ornament
in the corners. So the artwork is 9-SLICED instead: the four corner blocks are
placed at one uniform scale and never distorted, and only the straight runs
between them are extended. That is how a real border behaves when the sheet
changes size — the corner castings are fixed and the runs get longer. Band
thickness is identical on all four edges because every slice uses the same
scale factor across its thickness.

PROBLEM 2: THE ARTWORK CARRIES ANOTHER SCHOOL'S NAME
The microtext rails read "SCHOOL OF ISLAMIC & ARABIC STUDIES", and the sheet
also carries specimen numbers (SHRS-IBT-2025-0000001, 4X78-9K2M-P6QZ) and the
domain verify.shrschools.ng. This is a Royal College award with real numbers
and a different domain. The rails are a TEXT FIELD, not ornament, so they are
knocked back to bare paper here and re-lettered in vector by the certificate
itself. No ornament is altered: the plate's geometry is the Founder's, and
only the words inside the text field are the document's own.

WHAT IS DELIBERATELY LEFT OUT
The holographic patch on the left, and the "GENUINE VERIFIED AUTHENTIC" and
"SECURITY FIBER WINDOW" panels on the right, sit in the field rather than in
the border band, and the slicing geometry excludes them for free. That is the
right outcome on the merits too: they are PICTURES of security features. A
printed rectangle captioned "security fiber window" has no fibres in it, and a
verifier who has been taught to check one learns that this issuer's documents
show a picture where the feature should be. The certificate carries real
features in their place — QR, Code 128-C, microtext, guilloche, void
pantograph, UV motif — each of which does something when tested.

RESOLUTION, STATED HONESTLY
The source is 1080 px across a 297mm sheet, which is 92 DPI. This builds at
300 DPI, a 3.25x enlargement. Enlargement moves detail; it does not create it.
The plate is therefore genuinely 300 DPI in geometry and genuinely 92 DPI in
information, and the fine filigree inside the corner blocks is as sharp as the
supplied file allows and no sharper. A higher-resolution scan of the original
would improve it and nothing else will. That is the honest cost of reproducing
the artwork exactly rather than redrawing it, and it is the cost the Founder
chose when he ruled the border a locked masterwork.
"""
import sys
from PIL import Image, ImageFilter

SRC = ('/root/.claude/uploads/a0c3ea67-3a43-5c38-8e67-3201214e7482/'
       '84ceb826-1001093518.jpg')
OUT = 'assets/images/certificates/ss-border-plate.png'

DPI = 300
SHEET_W_MM, SHEET_H_MM = 297.0, 210.0
OUT_W = round(SHEET_W_MM / 25.4 * DPI)      # 3508
OUT_H = round(SHEET_H_MM / 25.4 * DPI)      # 2480

# Measured off the artwork by scanning for border ink (see the profiles in
# scripts/ commit history): the band is ~88px thick and the corner ornament
# runs ~180px along each arm within that thickness.
BAND = 90        # border band thickness, source px
CORNER = 180     # corner block reach along each arm, source px
# The microtext rail, knocked back to paper and re-lettered in vector.
RAIL_T, RAIL_B = 3, 17
PAPER = (246, 239, 225)


def sharpen(im):
    """Restore the edge acutance an enlargement costs, without haloing.

    A 3.25x LANCZOS enlargement is soft by construction. A light unsharp mask
    at a small radius puts the perceived edge back on the gold rules and the
    filigree. The amount is deliberately modest: pushed harder it rings on the
    navy/gold boundaries, and a ringing halo on a certificate border reads as
    a scan of a certificate rather than as a certificate.
    """
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=95, threshold=2))


def main():
    src = Image.open(SRC).convert('RGB')
    sw, sh = src.size
    scale = OUT_W / sw          # one scale for every slice — see PROBLEM 1

    # The rails are knocked back BEFORE slicing, so the fill lands in the same
    # place on every slice and no seam shows where a slice boundary crosses it.
    flat = src.copy()
    for box in [(0, RAIL_T, sw, RAIL_B), (0, sh - RAIL_B, sw, sh - RAIL_T),
                (RAIL_T, 0, RAIL_B, sh), (sw - RAIL_B, 0, sw - RAIL_T, sh)]:
        flat.paste(PAPER, box)

    band = round(BAND * scale)
    corner = round(CORNER * scale)

    plate = Image.new('RGBA', (OUT_W, OUT_H), (0, 0, 0, 0))

    def put(region, dest_box):
        w = dest_box[2] - dest_box[0]
        h = dest_box[3] - dest_box[1]
        if w <= 0 or h <= 0:
            return
        plate.paste(sharpen(region.resize((w, h), Image.LANCZOS)).convert('RGBA'),
                    (dest_box[0], dest_box[1]))

    # ── The four corner blocks, as L-shapes ─────────────────────────────────
    # Each corner is placed as two rectangles of pure border band. Taking the
    # L rather than a filled square is what keeps the field clear: a square
    # would drag in the EST-roundel and the holographic patch, which live in
    # the field and are not part of the border.
    for fx, fy in ((0, 0), (1, 0), (0, 1), (1, 1)):
        arm_h = flat.crop((0, 0, CORNER, BAND))          # horizontal arm
        arm_v = flat.crop((0, 0, BAND, CORNER))          # vertical arm
        if fx:
            arm_h = arm_h.transpose(Image.FLIP_LEFT_RIGHT)
            arm_v = arm_v.transpose(Image.FLIP_LEFT_RIGHT)
        if fy:
            arm_h = arm_h.transpose(Image.FLIP_TOP_BOTTOM)
            arm_v = arm_v.transpose(Image.FLIP_TOP_BOTTOM)
        x0 = (OUT_W - corner) if fx else 0
        y0 = (OUT_H - band) if fy else 0
        put(arm_h, (x0, y0, x0 + corner, y0 + band))
        x1 = (OUT_W - band) if fx else 0
        y1 = (OUT_H - corner) if fy else 0
        put(arm_v, (x1, y1, x1 + band, y1 + corner))

    # ── The four straight runs ──────────────────────────────────────────────
    # Each run is sourced from ITS OWN edge of the artwork, never from another
    # edge rotated into place. A first cut took the top run and rotated it for
    # the sides, on the reasoning that one cross-section everywhere must be
    # consistent. It was not: the artwork's side border is a different design
    # from its head border, so the rotated strip met the corner block — which
    # carries the real side border — at a visible tonal step. Four seams, one
    # per corner, and a seam in a border is exactly the "patched" look this
    # whole plate exists to avoid.
    #
    # The horizontal run lands at natural scale (the artwork is already the
    # right width), so the head and foot are a 1:1 enlargement of the original
    # with no stretch at all. Only the side runs extend, and only along their
    # length, because A4 is taller in proportion than the artwork.
    run_h_src = flat.crop((CORNER, 0, sw - CORNER, BAND))
    run_w = OUT_W - 2 * corner
    put(run_h_src, (corner, 0, corner + run_w, band))
    put(run_h_src.transpose(Image.FLIP_TOP_BOTTOM),
        (corner, OUT_H - band, corner + run_w, OUT_H))

    # The side runs cannot be taken wholesale the way the head and foot can,
    # because the artwork's left band carries the holographic patch — the
    # rainbow strip with the SHRS marks — across most of its length. Lifting
    # the band as one piece brings the patch with it, and the patch is one of
    # the things the Founder asked to be taken off: it is a PRINTED PICTURE of
    # a hologram. A verifier who tilts it sees nothing move, which is worse
    # than having no hologram at all, because it teaches them this issuer
    # prints imitation features.
    #
    # So the side run is built from the one stretch of that band the patch
    # does not touch (rows 218-271, found by scanning for pixels where blue
    # runs ahead of red), tiled down the run. Tiles alternate direction —
    # ping-pong rather than repeat — so consecutive tiles meet on identical
    # pixel rows and no join is visible anywhere along the run.
    CLEAN_T, CLEAN_B = 218, 271
    tile = flat.crop((0, CLEAN_T, BAND, CLEAN_B))
    # Even the cleanest window still catches the inner lip of the patch, which
    # prints as a lilac cast down the inside of the band. Those columns are
    # past the gold frame rule — they are field, not border — so they are
    # replaced with the field tone sampled just outside the patch.
    field_tone = tile.crop((66, 0, 67, tile.size[1])).resize((BAND - 68, tile.size[1]))
    tile.paste(field_tone, (68, 0))
    tile_h = round((CLEAN_B - CLEAN_T) * scale)
    run_h = OUT_H - 2 * corner
    strip = Image.new('RGB', (band, run_h + 2 * tile_h))
    flip = False
    for y in range(0, strip.size[1], tile_h):
        t = tile.transpose(Image.FLIP_TOP_BOTTOM) if flip else tile
        strip.paste(sharpen(t.resize((band, tile_h), Image.LANCZOS)), (0, y))
        flip = not flip
    strip = strip.crop((0, 0, band, run_h))
    plate.paste(strip.convert('RGBA'), (0, corner))
    plate.paste(strip.transpose(Image.FLIP_LEFT_RIGHT).convert('RGBA'),
                (OUT_W - band, corner))

    # ── The mid-run khatam medallions ───────────────────────────────────────
    # The artwork sets an eight-point medallion at the middle of every run.
    # The head and foot keep theirs automatically, because those runs are
    # lifted whole. The side runs lost theirs when the run became a tile, so
    # they are put back — taken from the artwork's own head medallion and
    # turned a quarter. The figure is eight-fold symmetric, so a quarter turn
    # of it is the same casting and not a substitute for it.
    MED_W = 96
    med = flat.crop((sw // 2 - MED_W // 2, 0, sw // 2 + MED_W // 2, BAND))
    med_w, med_h = round(MED_W * scale), band
    med_v = sharpen(med.resize((med_w, med_h), Image.LANCZOS)).transpose(Image.ROTATE_270)
    plate.paste(med_v.convert('RGBA'), (0, OUT_H // 2 - med_w // 2))
    plate.paste(med_v.transpose(Image.FLIP_LEFT_RIGHT).convert('RGBA'),
                (OUT_W - med_h, OUT_H // 2 - med_w // 2))

    plate.save(OUT, optimize=True)
    print(f'{OUT}  {plate.size[0]} x {plate.size[1]} px  '
          f'({DPI} DPI over {SHEET_W_MM:.0f} x {SHEET_H_MM:.0f}mm)')
    print(f'  band {band}px = {band / DPI * 25.4:.1f}mm   '
          f'corner {corner}px = {corner / DPI * 25.4:.1f}mm')
    print(f'  source {sw} x {sh} px = {sw / SHEET_W_MM * 25.4:.0f} DPI, '
          f'enlarged {scale:.2f}x')


if __name__ == '__main__':
    sys.exit(main())
