#!/usr/bin/env python3
"""SULTAN HANAFI ROYAL SCHOOLS — the institutional identity.

THE SIGNATURE — the Counterweight.

Every SHRS document is held between two masses of the same coffee
material: a CARTOUCHE at the head, bearing the seal and the bilingual
lock, and a FOOTING at the base, bearing the record. The ivory field
between them is the document's own voice, and it is never encroached on.

The cartouche is taller and denser; the footing is shallower and runs
full measure, so its area is the greater. The head therefore reads as
authority and the foot as weight — which is the true relation in an
institution whose documents are verifiable: the record is what the
document rests on.

At sizes too small to hold two masses (an ID card, a favicon, a signage
plate) the two merge into one and the seal sits at the join. That
degradation is part of the grammar, not an exception to it.

Fifteen-per-cent test: a corner of any SHRS document shows either a
coffee cartouche with a seal bleeding off two edges, or a coffee footing
carrying gold microtext. Either is sufficient to identify the school.

Run:  python3 brand/identity.py [--staff-id X --activation-url Y]
"""
import argparse, base64, pathlib

ap = argparse.ArgumentParser()
ap.add_argument('--staff-id')
ap.add_argument('--activation-url')
ARGS = ap.parse_args()

ROOT = pathlib.Path(__file__).resolve().parent
b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()

# Everything the sheet needs is embedded, so a rendered document carries no
# network dependency at all — it prints identically on a machine that has
# never seen this repository. The faces are the website's own; nothing new
# is introduced, because a system that needs a font purchase to stay
# consistent will not stay consistent.
FACES = [('Cinzel', 'normal', 400, 'cinzel-latin-400-normal'),
         ('Cinzel', 'normal', 700, 'cinzel-latin-700-normal'),
         ('Cinzel', 'normal', 800, 'cinzel-latin-800-normal'),
         ('Cormorant Garamond', 'italic', 500, 'cormorant-garamond-latin-500-italic'),
         ('Cormorant Garamond', 'normal', 600, 'cormorant-garamond-latin-600-normal'),
         ('Inter', 'normal', 400, 'inter-latin-400-normal'),
         ('Inter', 'normal', 600, 'inter-latin-600-normal'),
         ('Amiri', 'normal', 400, 'amiri-arabic-400-normal')]
FONTS = ''.join(
    "@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:block;"
    "src:url(data:font/woff2;base64,%s) format('woff2')}" %
    (fam, style, wt, b64(ROOT.parent / 'assets' / 'fonts' / (f + '.woff2')))
    for fam, style, wt, f in FACES)
CREST = b64(ROOT / 'assets' / 'crest.png')
RAG = b64(ROOT / 'assets' / 'rag.svg')
MT  = b64(ROOT / 'assets' / 'microtext.svg')
GL  = b64(ROOT / 'assets' / 'guilloche.svg')

# ── palette. The coffee family, with tonal range inside it — cocoa at the
# cold edge, chestnut at the warm end — so a mass has depth without ever
# leaving the one hue. No second colour: an off-axis hue on a document with
# a warm anchor reads as an accident or a sub-brand.
COCOA_D, COFFEE, COFFEE2 = '#140A03', '#2E1A0D', '#1A0E06'
CHEST, COCOA = '#43220F', '#241509'
GOLD, GOLD_BR, ANTIQUE = '#C6A15B', '#E9CE8A', '#9C7A3C'
IVORY, CREAM, PARCH = '#FBF7EF', '#F5EEE1', '#EDE3D2'
INK, INK2 = '#241A12', '#5A4632'

# ═══ THE SILHOUETTE ═══
#
# The head is not a band with a straight edge. Two elements, at two
# different angles, which is what makes the shape read as constructed
# rather than cropped:
#
#   the MASS   — full bleed at the top, its lower boundary a shallow curve
#                that eases up to the right, so the sheet's weight sits
#                under the seal where the seal needs a dark ground;
#   the RIBBON — a bolder diagonal at nearly four times that slope, which
#                begins *inside* the mass at the right and slides out onto
#                the ivory as it travels left.
#
# Because the two slopes differ, the ribbon crosses the mass boundary
# rather than tracing it, and appears to emerge from beneath the mass.
# That crossing is the signature. It is also why the shape cannot be
# mistaken for a rectangle with a corner cut off.
#
# The foot is the same construction rotated by half a turn, so head and
# foot answer each other rather than repeat.

HEAD_H, FOOT_H = 78, 70               # mm; the two bands
# mass boundary, right to left: 40mm deep at the right, 48.6mm at the left
HEAD_MASS = 'M0,0 H210 V40 C168,43 130,47.5 96,48 L0,48.6 Z'
HEAD_EDGE = 'M0,48.6 L96,48 C130,47.5 168,43 210,40'
FOOT_MASS = 'M0,30 C42,27 80,22.5 114,22 L210,21.4 V70 H0 Z'
FOOT_EDGE = 'M0,30 C42,27 80,22.5 114,22 L210,21.4'

def band(y0, y1, w):
    """A ribbon line across the sheet, running off both edges."""
    return f'M-6,{y0:g} L216,{y1:g}', w

# head assembly, measured from the ribbon's centre line
H_RIB   = band(60, 32, 7)          # the foil itself
H_LIP   = band(56.7, 28.7, .38)    # lit edge, above
H_TOE   = band(63.25, 35.25, .5)   # dark edge, beneath
H_BAND2 = band(67.55, 39.55, 2.1)  # the second, quieter band
H_SHAD  = band(71, 43, 10)         # what the assembly casts on the paper
# foot assembly — the same numbers, half-turned
F_RIB   = band(38, 10, 7)
F_LIP   = band(34.7, 6.7, .38)
F_TOE   = band(41.25, 13.25, .5)
F_BAND2 = band(30.45, 2.45, 2.1)
F_SHAD  = band(27, -1, 10)


def defs(tag, ramp_x2, ramp_y2):
    return (
      f'<linearGradient id="m{tag}" x1="0" y1="0" x2="{ramp_x2}" y2="{ramp_y2}">'
      f'<stop offset="0" stop-color="{COCOA_D}"/><stop offset=".34" stop-color="{COFFEE}"/>'
      f'<stop offset=".72" stop-color="{CHEST}"/><stop offset="1" stop-color="{COCOA}"/></linearGradient>'
      f'<linearGradient id="f{tag}" x1="0" y1="0" x2="1" y2="0">'
      f'<stop offset="0" stop-color="#6E5121"/><stop offset=".15" stop-color="#B48F45"/>'
      f'<stop offset=".36" stop-color="#F6E9CE"/><stop offset=".54" stop-color="#DFC58E"/>'
      f'<stop offset=".77" stop-color="{ANTIQUE}"/><stop offset=".92" stop-color="#F2DFAF"/>'
      f'<stop offset="1" stop-color="#8A6A2E"/></linearGradient>'
      f'<linearGradient id="q{tag}" x1="0" y1="0" x2="1" y2="0">'
      f'<stop offset="0" stop-color="#5E4419"/><stop offset=".46" stop-color="{ANTIQUE}"/>'
      f'<stop offset="1" stop-color="#C9A868"/></linearGradient>'
      f'<linearGradient id="c{tag}" x1="0" y1="0" x2="0" y2="1">'
      f'<stop offset="0" stop-color="#FFF0D4" stop-opacity=".20"/>'
      f'<stop offset=".5" stop-color="#FFEECE" stop-opacity=".05"/>'
      f'<stop offset="1" stop-color="#0C0502" stop-opacity=".26"/></linearGradient>'
      f'<filter id="b{tag}" x="-8%" y="-60%" width="116%" height="260%">'
      f'<feGaussianBlur stdDeviation="1.15"/></filter>')


def stroke(spec, paint, extra=''):
    d, w = spec
    return f'<path d="{d}" fill="none" stroke="{paint}" stroke-width="{w:g}" {extra}/>'


def sweep(tag, h, mass, edge, rib, lip, toe, band2, shad, chamfer_up):
    """One band: mass, chamfer, cast shadow, then the ribbon assembly."""
    cham = (f'<path d="{edge}" fill="none" stroke="url(#c{tag})" stroke-width="4.6" '
            f'transform="translate(0,{-2.3 if chamfer_up else 2.3:g})"/>')
    return (
      f'<svg class="bnd" viewBox="0 0 210 {h}" preserveAspectRatio="none" aria-hidden="true">'
      f'<defs>{defs(tag, 1 if chamfer_up else -1, 1)}'
      f'<clipPath id="k{tag}"><path d="{mass}"/></clipPath></defs>'
      f'<path d="{mass}" fill="url(#m{tag})"/>'
      f'<g clip-path="url(#k{tag})">{cham}</g>'
      + stroke(shad, 'rgba(34,16,6,.22)', f'filter="url(#b{tag})"')
      + stroke(band2, f'url(#q{tag})')
      + stroke(rib, f'url(#f{tag})')
      + stroke(lip, '#FCF3DC', 'opacity=".85"')
      + stroke(toe, '#1E1006', 'opacity=".82"')
      # the turn: the band darkens where it folds away under the sheet edge
      + f'<path d="{rib[0]}" fill="none" stroke="url(#t{tag})" stroke-width="{rib[1]:g}"/>'
      f'<defs><linearGradient id="t{tag}" x1="0" y1="0" x2="1" y2="0">'
      f'<stop offset="0" stop-color="#2A1D08" stop-opacity=".85"/>'
      f'<stop offset=".085" stop-color="#2A1D08" stop-opacity="0"/>'
      f'<stop offset=".915" stop-color="#2A1D08" stop-opacity="0"/>'
      f'<stop offset="1" stop-color="#2A1D08" stop-opacity=".7"/></linearGradient></defs>'
      f'</svg>')

AR = 'مدارس السلطان حنفي الملكية'
QUAD = '<span class="q"><i></i><i></i><i></i><i></i></span>'   # the crest's four quadrants, abstracted

HOUSES = ['Nursery &amp; Primary', 'Royal College', 'Islamic &amp; Arabic Studies',
          'Qur&rsquo;an College', 'Online &amp; Distance Learning']
INST = f' {QUAD} '.join(HOUSES)

HEAD_SVG = sweep('h', HEAD_H, HEAD_MASS, HEAD_EDGE, H_RIB, H_LIP, H_TOE, H_BAND2, H_SHAD, True)
FOOT_SVG = sweep('f', FOOT_H, FOOT_MASS, FOOT_EDGE, F_RIB, F_LIP, F_TOE, F_BAND2, F_SHAD, False)

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0D0703;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 color:{INK};font-family:'Inter',serif;
 background:radial-gradient(126% 88% at 34% 0%,#FFFEFC 0%,{IVORY} 38%,{CREAM} 74%,{PARCH} 100%)}}
/* cotton rag — the sheet must read as stock, not as screen */
.rag{{position:absolute;inset:0;pointer-events:none;opacity:.26;mix-blend-mode:multiply;
 background:url(data:image/svg+xml;base64,{RAG}) repeat;background-size:84mm 84mm}}
.vig{{position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(118% 84% at 40% 38%,rgba(0,0,0,0) 64%,rgba(43,26,14,.055) 100%)}}
.ghost{{position:absolute;right:-34mm;top:96mm;width:186mm;height:186mm;pointer-events:none;opacity:.03;
 background:url(data:image/png;base64,{CREST}) center/contain no-repeat}}

/* ═══ THE HEAD ═══ the silhouette is drawn in SVG (see HEAD_SVG above),
   because a curve that has to meet a ribbon at a second angle is a drawing,
   not a rectangle with a corner removed. The SVG carries the mass, its
   chamfer, the cast shadow and the ribbon assembly; everything set in type
   sits above it. */
.head{{position:absolute;left:0;right:0;top:0;height:{HEAD_H}mm;z-index:3}}
.bnd{{position:absolute;left:0;top:0;width:100%;height:100%;display:block}}

/* ═══ THE LOCK — one bilingual identity, not two languages ═══
   Neither language is above the other. They meet at a shared vertical
   member and each runs outward in its own reading direction, so the lock
   cannot be built in one language alone. */
.hgrid{{position:absolute;left:20mm;right:16mm;top:9mm;z-index:5;display:flex;align-items:center;gap:8mm}}
.seal{{flex:0 0 auto;position:relative;width:28mm;height:28mm;display:flex;align-items:center;justify-content:center}}
.seal img{{width:25mm;height:25mm;display:block;filter:drop-shadow(0 .7pt 1.1pt rgba(0,0,0,.6))}}
.seal::before{{content:'';position:absolute;inset:0;border-radius:50%;
 border:.5pt solid rgba(198,161,91,.58);
 box-shadow:inset 0 0 3.4mm rgba(0,0,0,.55),0 0 0 1mm rgba(255,255,255,.045)}}
.lock{{flex:1;min-width:0;display:flex;align-items:stretch}}
.lock .en,.lock .ar{{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;color:#F8F1E1}}
.lock .en{{padding-right:6mm;text-align:right;
 font-family:'Cinzel',serif;font-weight:800;font-size:17pt;letter-spacing:.055em;
 text-transform:uppercase;line-height:1.14;text-shadow:0 .5pt 1pt rgba(0,0,0,.4)}}
.lock .ar{{padding-left:6mm;text-align:left;direction:rtl;
 font-family:'Amiri',serif;font-size:19.55pt;line-height:1.14;text-shadow:0 .5pt 1pt rgba(0,0,0,.4)}}
.lock .en b,.lock .ar b{{display:block;font-weight:inherit}}
.lock .axis{{position:relative;flex:0 0 auto;width:1.2pt;
 background:linear-gradient(180deg,rgba(198,161,91,0) 0%,{GOLD} 14%,#F4E4BC 50%,{GOLD} 86%,rgba(198,161,91,0) 100%)}}
.lock .axis::before,.lock .axis::after{{content:'';position:absolute;left:-2.4mm;width:6mm;height:.45pt;
 background:rgba(198,161,91,.72)}}
.lock .axis::before{{top:0}} .lock .axis::after{{bottom:0}}
/* the office line sits inside the mass, below the lock, where the mass is
   deepest — reversed out, as a seat line should be */
.seat{{position:absolute;left:24mm;top:36.4mm;z-index:5;max-width:120mm;white-space:nowrap;
 font-size:5.4pt;letter-spacing:.24em;text-transform:uppercase;color:rgba(226,203,158,.92)}}
.seat .q{{margin-right:1.6mm}}

/* ═══ the ivory field ═══ */
/* the registry: what makes this document a record rather than a page */
.reg{{position:absolute;right:24mm;top:64mm;z-index:5;display:flex;gap:7mm;text-align:right}}
.reg dt{{font-size:4.7pt;letter-spacing:.24em;text-transform:uppercase;color:{ANTIQUE};margin-bottom:.7mm}}
.reg dd{{font-size:6.6pt;color:{INK};line-height:1.3}}
.reg .fold{{font-family:'Cinzel',serif;font-size:9pt;color:{ANTIQUE};align-self:flex-end;
 padding-left:6mm;border-left:.4pt solid rgba(156,122,60,.45)}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.42mm;
 width:2.3mm;height:2.3mm;vertical-align:-.15mm}}
.q i{{background:{GOLD};display:block}}

.body{{position:relative;z-index:1;flex:1;padding:80mm 24mm 0 24mm;font-size:10.4pt;line-height:1.68;color:{INK}}}
.body.cont{{padding-top:58mm}}
.body p{{margin-bottom:3.4mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;border-bottom:.5pt solid rgba(156,122,60,.6);text-decoration:none}}
.body p.open::first-letter{{font-family:'Cinzel',serif;font-weight:700;font-size:22pt;line-height:.98;
 float:left;margin:1.5mm 2mm 0 0;color:{COFFEE}}}
.addr{{margin-bottom:6.4mm!important;line-height:1.5}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:10.6pt;letter-spacing:.052em;text-transform:uppercase;
 color:{COFFEE};margin-bottom:5mm;line-height:1.44}}
.lead{{font-family:'Cinzel',serif;font-size:8.2pt;letter-spacing:.16em;text-transform:uppercase;color:{ANTIQUE};
 margin:5.4mm 0 2.8mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.5pt solid rgba(156,122,60,.55)}}
.signoff{{margin-top:6.4mm}} .sigsp{{height:17mm}}
.sigrule{{width:58mm;height:.5pt;background:{GOLD};margin-bottom:2.4mm}}
.signm{{line-height:1.55}} .sigt{{font-size:8.6pt;color:{INK2}}}
.blank{{display:flex;gap:5mm;font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;
 color:{ANTIQUE};margin-bottom:8mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(156,122,60,.45);font-style:normal}}

/* ═══ THE FOOT ═══ the same construction, half-turned. The record is what
   the document rests on. */
.foot{{position:relative;z-index:2;margin-top:auto;flex:0 0 {FOOT_H}mm;height:{FOOT_H}mm}}
.foot .gl{{position:absolute;left:0;right:0;bottom:0;height:11mm;opacity:.28;z-index:2;
 background:url(data:image/svg+xml;base64,{GL}) center/100% 100% no-repeat}}
.foot .mt{{position:absolute;left:0;right:0;bottom:1.4mm;height:2.4mm;opacity:.26;z-index:4;
 background:url(data:image/svg+xml;base64,{MT}) left center/100% 100% no-repeat}}
.fbody{{position:absolute;left:24mm;right:24mm;top:44.5mm;z-index:4}}
.fh{{display:flex;align-items:center;gap:2.6mm;justify-content:space-between;white-space:nowrap;
 font-size:5pt;letter-spacing:.1em;text-transform:uppercase;color:rgba(214,186,133,.92);
 padding-bottom:1.8mm;margin-bottom:2mm;border-bottom:.35pt solid rgba(198,161,91,.26)}}
.fg{{display:flex;justify-content:space-between;gap:6mm;font-size:6.6pt;color:#EFE1C6;line-height:1.5}}
.fg>div{{flex:1}} .fg>div:last-child{{text-align:right}}
.fl{{display:block;font-size:5.2pt;letter-spacing:.26em;text-transform:uppercase;color:{GOLD};margin-bottom:.7mm}}
.fg a{{color:inherit;text-decoration:none}}
.creed{{margin-top:2.6mm;padding-top:2mm;border-top:.35pt solid rgba(198,161,91,.24);
 font-family:'Cormorant Garamond',serif;font-style:italic;font-size:8.6pt;color:{GOLD};letter-spacing:.02em}}

/* continuation: the same drawing, compressed vertically. The ribbon's
   slope eases with it, so the sheet is recognisably the same construction
   with less ceremony. */
.head.c2{{height:52mm}}
.head.c2 .hgrid{{top:5mm;gap:6mm}} .head.c2 .seal{{width:19mm;height:19mm}}
.head.c2 .seal img{{width:17mm;height:17mm}}
.head.c2 .lock .en{{font-size:11.4pt;padding-right:4mm}}
.head.c2 .lock .ar{{font-size:13.1pt;padding-left:4mm}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

# The name breaks at the same place in both languages — two lines each, so
# the two blocks are of one build. Neither is a caption to the other.
EN_L = '<b>Sultan Hanafi</b><b>Royal Schools</b>'
AR_L = '<b>{0}</b><b>{1}</b>'.format(*AR.rsplit(' ', 1))

def head(first=True):
    c2 = '' if first else ' c2'
    seat = ''
    return (f'<header class="head{c2}">{HEAD_SVG}'
            f'<div class="hgrid">'
            f'<span class="seal"><img src="data:image/png;base64,{CREST}" '
            f'alt="Crest of Sultan Hanafi Royal Schools" /></span>'
            f'<div class="lock"><div class="en">{EN_L}</div>'
            f'<div class="axis"></div><div class="ar">{AR_L}</div></div>'
            f'</div>{seat}</header>')

REG = ('<div class="reg"><div><dt>Reference</dt><dd>SHRS/ICT/2026/001</dd></div>'
       '<div><dt>Issued</dt><dd>13 August 2026</dd></div>'
       '<span class="fold">{f}</span></div>'
       '<div class="seat">{QUAD} Information &amp; Communications Technology</div>').replace('{QUAD}', QUAD)

FOOT = ('<footer class="foot">' + FOOT_SVG + '<div class="gl"></div><div class="mt"></div>'
        f'<div class="fbody"><div class="fh">{INST}</div><div class="fg">'
        '<div><span class="fl">Campus</span>Ikorodu, Lagos State, Nigeria</div>'
        '<div><span class="fl">Telephone</span><a href="tel:+2348073747650">+234 807 374 7650</a></div>'
        '<div><span class="fl">Correspondence</span><a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></div>'
        '<div><span class="fl">Record</span><a href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></div>'
        '</div><p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;'
        f'&#8195;{QUAD}&#8195;Established July 2016&#8195;{QUAD}&#8195;Governed by a Board of Governors'
        '</p></div></footer>')

PAGE_NO = [1]

def page(inner, first=True):
    cls = 'body' if first else 'body cont'
    reg = REG.format(f=f'{PAGE_NO[0]:02d}') if first else ''
    PAGE_NO[0] += 1
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="rag"></div><div class="vig"></div><div class="ghost"></div>\n'
            f'    {head(first)}\n    {reg}\n    <main class="{cls}">\n{inner}\n    </main>\n{FOOT}\n  </div>')

def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>' + title +
            '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages) + '\n</body>\n</html>\n')

# ── the letter
blocks = (ROOT / 'assets' / 'letter-blocks.html').read_text(encoding='utf-8').split('\n@@@\n')
def rt(b):
    b = (b.replace('class="addressee"', 'class="addr"').replace('class="subject"', 'class="subj"')
          .replace('class="lead-in"', 'class="lead"')
          .replace('class="ref-line ref-line--f"', 'class="ref"')
          .replace('class="fill"', 'class="val"').replace('class="sig-space"', 'class="sigsp"')
          .replace('class="sig-rule"', 'class="sigrule"').replace('class="sig-name"', 'class="signm"')
          .replace('class="sig-title"', 'class="sigt"')
          .replace('<p>I write on behalf', '<p class="open">I write on behalf'))
    for plain, href in (('shroyalschools.com/portal/staff/login/', 'https://shroyalschools.com/portal/staff/login/'),
                        ('info@shroyalschools.com', 'mailto:info@shroyalschools.com')):
        if plain in b and '<a ' not in b:
            b = b.replace(plain, f'<a href="{href}">{plain}</a>')
    if ARGS.staff_id:
        b = b.replace('[SHRS&#8209;HQ&#8209;REG&#8209;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;]', ARGS.staff_id)
    if ARGS.activation_url:
        b = b.replace('<span class="val">[activation link]</span>',
                      f'<a href="{ARGS.activation_url}">{ARGS.activation_url}</a>')
    return b
blocks = [rt(b) for b in blocks]
blocks = [b for b in blocks if 'class="ref"' not in b]
body = lambda a, b: "\n".join("      " + x for x in blocks[a:b])
CUTS = [(0, 8), (8, 15), (15, 22), (22, 26)]
(ROOT / 'letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter',
        [page(body(a, b), i == 0) for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

# ── blank stationery
PAGE_NO[0] = 1
BLANK = '      <div class="blank"><span>Ref</span><i></i><span>Date</span><i></i></div>'
(ROOT / 'letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead', [page(BLANK, True)]), encoding='utf-8')
print('identity built')
