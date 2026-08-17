#!/usr/bin/env python3
"""
=============================================================================
ISLAMIC PATTERN BUILD — the eight-point star, constructed, not drawn
=============================================================================

The motif is the khātam / najma pattern found across Islamic architecture:
an eight-pointed star whose outline is the union of two squares of equal
size, sharing a centre, one rotated 45 degrees against the other — the
actual compass-and-straightedge construction, not a freehand approximation
of one.

A FIRST VERSION OF THIS SCRIPT GOT THIS WRONG. It stroked both complete
square outlines on top of each other. That is two squares, not a star — the
overlap reads as a diamond-and-grid lattice, not the pointed star silhouette
the construction actually produces. Rendered and inspected before being
trusted (screenshot of the tile at full opacity), and the fault was visible
immediately.

The fix computes the star's actual outline: the 8 corners the two squares
contribute (all at the shared circumradius R, at every 45 degrees) as the
star's OUTER points, and the 8 points where each pair of adjacent edges
crosses as the INNER valley points — found by real line-line intersection,
not a memorised ratio. The 16 points alternate outer/inner around one closed
path: that path is the star, and only that path is stroked.

    python3 scripts/islamic-pattern-build.py
=============================================================================
"""
import base64
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

R = 30.0  # star circumradius (centre to outer point), tile-local units


def square_corners(rotation_deg):
    return [(R * math.cos(math.radians(45 + 90 * k + rotation_deg)),
             R * math.sin(math.radians(45 + 90 * k + rotation_deg)))
            for k in range(4)]


def edge_line(rotation_deg, theta_deg):
    """The line carrying the edge of a radius-R, rotation `rotation_deg`
    square whose outward normal points at `theta_deg`. A square's edges are
    each a fixed perpendicular distance R*cos(45deg) from the centre — a
    corner is `radius R, 45deg off the normal`, so the foot of that corner
    onto the normal is exactly R*cos(45deg), and it is the SAME distance for
    every edge of a square. Returned as (cos theta, sin theta, distance) so
    a point (x,y) lies on the line iff x*cos+y*sin == distance."""
    t = math.radians(theta_deg)
    return (math.cos(t), math.sin(t), R * math.cos(math.radians(45)))


def line_intersect(l1, l2):
    c1, s1, d1 = l1
    c2, s2, d2 = l2
    den = c1 * s2 - s1 * c2
    return ((d1 * s2 - s1 * d2) / den, (c1 * d2 - d1 * c2) / den)


square_a = square_corners(0)    # corners at 45,135,225,315
square_b = square_corners(45)   # corners at 0,90,180,270

# Every 45 degrees, going around: alternately a corner of A or B (both at
# radius R — verified below). Between each adjacent pair of outer points,
# at angles `a` and `nxt=a+45`, the star's inner waist is where the OWNING
# square of each point's edge — specifically each square's edge whose
# outward normal points at the OTHER point's angle — cross. That rule
# (not a guess: derived and checked against a manual example before being
# generalised here) is what a "next matching edge" search got wrong the
# first time, by picking either candidate edge at a corner indiscriminately.
outer_by_angle = {}
for x, y in square_a + square_b:
    outer_by_angle[round(math.degrees(math.atan2(y, x))) % 360] = (
        (0, x, y) if (x, y) in square_a else (45, x, y))
assert len(outer_by_angle) == 8, "expected 8 distinct outer corners"
for rot, x, y in outer_by_angle.values():
    assert abs(math.hypot(x, y) - R) < 1e-9, "an outer point is not on the circumradius"

angles = sorted(outer_by_angle)
star = []
for i, a in enumerate(angles):
    rot_a, xa, ya = outer_by_angle[a]
    star.append((xa, ya))
    nxt = angles[(i + 1) % 8]
    rot_n, _, _ = outer_by_angle[nxt]
    valley = line_intersect(edge_line(rot_a, nxt), edge_line(rot_n, a))
    star.append(valley)

assert len(star) == 16, f"expected a 16-point alternating star, got {len(star)}"
inner_r = math.hypot(*star[1])
for i in range(1, 16, 2):
    assert abs(math.hypot(*star[i]) - inner_r) < 1e-6, "valley points are not equidistant — not a regular star"
# Independent check: the closed form for this exact construction is
# R * cos(45deg) / cos(22.5deg) (the valley sits on the edge-normal-distance
# circle, foreshortened by the 22.5 degree angle to the valley itself).
closed_form = R * math.cos(math.radians(45)) / math.cos(math.radians(22.5))
assert abs(inner_r - closed_form) < 1e-6, f"{inner_r} vs closed form {closed_form}"
print(f"star verified: 8 outer points at r={R}, 8 inner points at r={inner_r:.4f} "
      f"(ratio {inner_r/R:.4f}, matches closed form)")


def star_path(cx, cy, scale=1.0):
    d = f"M {cx + star[0][0]*scale:.3f} {cy + star[0][1]*scale:.3f} "
    for x, y in star[1:]:
        d += f"L {cx + x*scale:.3f} {cy + y*scale:.3f} "
    return d + "Z"


# Tile spacing: touching star-to-star (outer point to outer point) would be
# 2R; a light gap between motifs reads as a deliberate repeat rather than a
# packed lattice, so the tile is wider than the star it holds.
TILE = R * 2.5
CX, CY = TILE / 2, TILE / 2
STAR_D = star_path(CX, CY)
# A quarter-scale star centred on each tile corner completes the visual
# rhythm where four tiles meet, the way a real repeat has motifs at both
# the centre and the corners rather than empty corner space.
CORNER_D = star_path(0, 0, scale=0.42)


def svg_tile(stroke, stroke_width, opacity):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{TILE:.3f}" '
        f'height="{TILE:.3f}" viewBox="0 0 {TILE:.3f} {TILE:.3f}">'
        f'<g fill="none" stroke="{stroke}" stroke-width="{stroke_width}" '
        f'stroke-opacity="{opacity}" stroke-linejoin="round">'
        f'<path d="{STAR_D}"/>'
        f'<use href="#c" x="0" y="0"/><use href="#c" x="{TILE:.3f}" y="0"/>'
        f'<use href="#c" x="0" y="{TILE:.3f}"/><use href="#c" x="{TILE:.3f}" y="{TILE:.3f}"/>'
        f'</g>'
        f'<defs><path id="c" d="{CORNER_D}" fill="none" stroke="{stroke}" '
        f'stroke-width="{stroke_width}" stroke-opacity="{opacity}" '
        f'stroke-linejoin="round"/></defs>'
        f'</svg>'
    )


LIGHT = svg_tile("#8A6A2E", 1.1, 1)   # deep gold ink, for the ivory header
DARK = svg_tile("#E9CE8A", 1.2, 1)    # bright foil gold, for the coffee footer

OUT = ROOT / "assets/patterns"
OUT.mkdir(parents=True, exist_ok=True)
(OUT / "khatam-light.svg").write_text(LIGHT)
(OUT / "khatam-dark.svg").write_text(DARK)


def data_uri(svg):
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()


css = f"""/* ===========================================================================
   THE KHĀTAM PATTERN — generated, do not hand-edit
   ===========================================================================
   An eight-point star, the classic two-squares construction, its actual
   outline computed (outer corners at r={R}, inner waist at r={inner_r:.2f} —
   both verified, not assumed) rather than two overlapping square outlines
   drawn on top of each other. Tiled at {TILE:.1f}px with a smaller star
   completing each corner, the ordinary repeat rhythm of this motif in
   architectural use.

   Laid onto ::after of the site's existing ambient overlay elements —
   .imperial-motion (header) and .foot-motion (footer) — deliberately NOT
   onto the elements themselves, which already carry the gold-dust
   background (brand.css) and the diagonal sweep (::before). A fresh ::after
   layer means nothing is overwritten, and because CSS opacity on a parent
   dims its pseudo-elements too, this inherits the existing
   html[data-pc-ornament="restrained"|"none"] opacity rules on
   .imperial-motion / .foot-motion for free.

   REVISED from the first pass: 0.6/0.65 stroke and 0.24/0.18 opacity at a
   2x tile were correct geometry rendered too faintly to register at a
   glance, on the same complaint pattern as the running-light rework —
   technically present, practically invisible. This pass nearly doubles the
   stroke weight, raises opacity meaningfully, and tightens the repeat to
   1.6x tile so more stars sit in view at once.

       python3 scripts/islamic-pattern-build.py
   =========================================================================== */
.imperial-motion::after{{
  content:"";
  position:absolute; inset:0;
  background-image:url("{data_uri(LIGHT)}");
  background-size:{TILE*1.6:.1f}px {TILE*1.6:.1f}px;
  background-repeat:repeat;
  opacity:.4;
  pointer-events:none;
}}

.foot-motion::after{{
  content:"";
  position:absolute; inset:0;
  background-image:url("{data_uri(DARK)}");
  background-size:{TILE*1.6:.1f}px {TILE*1.6:.1f}px;
  background-repeat:repeat;
  opacity:.32;
  pointer-events:none;
}}
"""

CSS_OUT = ROOT / "css" / "islamic-pattern.css"
CSS_OUT.write_text(css)

print(f"tile: {TILE:.2f}px, star outer r={R}, inner r={inner_r:.3f}")
print(f"wrote assets/patterns/khatam-light.svg, khatam-dark.svg")
print(f"wrote {CSS_OUT.relative_to(ROOT)} ({len(css)} bytes)")
