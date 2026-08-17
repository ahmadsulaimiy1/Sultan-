#!/usr/bin/env python3
"""
=============================================================================
IMAGE BUILD — the payload a Lagos parent actually downloads
=============================================================================

MEASURED, NOT ASSUMED. Ten public pages were loaded in a mobile viewport
(412x915, DPR 2) and scrolled to the foot so lazy images resolved:

    50 distinct images        10.5 MB total
    100% JPEG/PNG             0 bytes of WebP or AVIF
    36 of 50 oversized        up to 7.5x more pixels than were rendered
    2248 px served where 344 px were needed

68.7% of Nigerian web traffic is mobile and overwhelmingly GSM (DataReportal,
Digital 2026: Nigeria). Ten megabytes of photographs is not a Core Web Vitals
abstraction there, it is somebody's data bundle.

WHY IN PLACE, AND NOT <picture> + WebP. WebP would save more. It also means
wrapping several hundred <img> elements in <picture> across 223 pages, and
this site's CSS repeatedly targets images by their position in the DOM
(`.card > img` and similar), so a wrapper element can silently break the
layout of a design that has been worked over very carefully. Re-encoding the
files at their existing paths and formats changes no markup, no selector and
no layout, and it still returns most of the bytes. The WebP/AVIF pass belongs
after a visual QA sweep, not before one.

WHAT THE FIRST ATTEMPT GOT WRONG, AND WHAT IT TAUGHT. Re-encoding everything
at quality 82 and capping the long edge at 1920 px returned 4%. On the worst
offender it returned less than nothing: games-recreation.jpg is 355 KB at
2248 px, and the same photograph resampled to 1920 px and re-encoded came back
at 381 KB. These JPEGs are already efficiently encoded for the pixels they
carry. The waste is not the encoder. The waste is the pixels.

    2248 px wide, rendered in a 344 px CSS box.

So the cap is set by what the page actually renders, per directory, rather
than by one number that flatters the total:

    gallery/   1400 px   grid renders at <=700 CSS px; the lightbox at <=1200
    else       1920 px   full-bleed heroes, up to 960 CSS px at DPR 2

RULES.
  - Never upscale. If the source is smaller than its cap it keeps its size.
  - Quality 82, progressive, 4:2:0. Above ~85 JPEG spends bytes on detail no
    eye recovers from a photograph of a classroom.
  - Strip EXIF. It is camera serial numbers and, on phone photographs, GPS
    coordinates of a school full of children. It has no business being served.
  - Keep a file only if it got smaller. A re-encode that grows the file is a
    re-encode that lost, and the original survives untouched.

STILL ON THE TABLE, DELIBERATELY NOT DONE HERE: srcset/sizes and WebP. Both
are worth more than this pass. Both also mean editing several hundred <img>
elements across 223 pages, and this site's CSS targets images structurally
(`.card > img` and similar), so a <picture> wrapper can silently break a
layout that has been worked over very carefully. That pass needs a visual QA
sweep beside it, not a script run before one.

    python3 scripts/images-build.py [--dry]
=============================================================================
"""
import sys, os
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
DRY = "--dry" in sys.argv

QUALITY = 82
CAPS = {"gallery": 1400}      # by immediate parent directory
CAP_DEFAULT = 1920

# The certificate plates are print masters rendered into PDFs by brand/ and by
# the certificate pipeline; their pixel dimensions are load-bearing for a
# printed artefact and they are never served to a visitor.
EXCLUDE_DIRS = {"certificates"}

targets = [
    p for p in (ROOT / "assets/images").rglob("*")
    if p.suffix.lower() in {".jpg", ".jpeg", ".png"}
    and not (set(p.relative_to(ROOT).parts) & EXCLUDE_DIRS)
]

before_total = after_total = 0
resized = recompressed = skipped = grew = 0
rows = []

for path in sorted(targets):
    before = path.stat().st_size
    before_total += before
    try:
        im = Image.open(path)
        im = ImageOps.exif_transpose(im)          # honour rotation, then drop EXIF
        w, h = im.size
        cap = CAPS.get(path.parent.name, CAP_DEFAULT)
        did_resize = False
        if max(w, h) > cap:
            im.thumbnail((cap, cap), Image.LANCZOS)
            did_resize = True

        tmp = path.with_suffix(path.suffix + ".tmp")
        if path.suffix.lower() == ".png":
            # Palette images (crests, marks) stay palette; photographs in PNG
            # keep RGBA so transparency survives.
            im.save(tmp, "PNG", optimize=True)
        else:
            if im.mode not in ("RGB", "L"):
                im = im.convert("RGB")
            im.save(tmp, "JPEG", quality=QUALITY, optimize=True,
                    progressive=True, subsampling=2)

        after = tmp.stat().st_size
        if after >= before:
            tmp.unlink()
            after = before
            grew += 1
        else:
            if DRY:
                tmp.unlink()
            else:
                tmp.replace(path)
            resized += did_resize
            recompressed += 1
            if before - after > 60 * 1024:
                rows.append((before, after, w, h, im.size[0], im.size[1],
                             str(path.relative_to(ROOT))))
        after_total += after
    except Exception as e:                        # a broken file must not fail the build
        print(f"  SKIP {path.relative_to(ROOT)}: {str(e)[:60]}")
        after_total += before
        skipped += 1

print(f"{'DRY RUN — ' if DRY else ''}files considered : {len(targets)}")
print(f"rewritten        : {recompressed}   (of which resized: {resized})")
print(f"left alone       : {grew} already smaller than a re-encode, {skipped} unreadable")
print(f"before           : {before_total/1024/1024:.2f} MB")
print(f"after            : {after_total/1024/1024:.2f} MB")
if before_total:
    print(f"saved            : {(before_total-after_total)/1024/1024:.2f} MB "
          f"({100*(before_total-after_total)/before_total:.0f}%)")
if rows:
    print("\nbiggest savings:")
    for b, a, w, h, nw, nh, name in sorted(rows, key=lambda r: r[0] - r[1], reverse=True)[:12]:
        dim = f"{w}x{h}" + (f" -> {nw}x{nh}" if (w, h) != (nw, nh) else "")
        print(f"  {b/1024:6.0f} -> {a/1024:5.0f} KB  {dim:<22} {name}")
