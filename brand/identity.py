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

# ── palette. Not one brown: a ramp with roles.
#
# A mass painted in a single coffee is a flat panel, and a flat panel is
# what makes a sheet look printed rather than made. So every mass runs the
# ramp — cocoa at the cold edge, through coffee and chestnut, into the
# school's own crimson at the hot end. The crimson is not invented for this
# sheet: it is `--crimson` from css/brand.css, already the site's accent
# livery, so the stationery and the website are one system.
#
# Hierarchy follows the ramp: the deepest tone carries weight, the hottest
# carries attention, and gold is reserved for the ribbon and the axis. No
# element takes a colour outside it.
COCOA_D, COFFEE, COFFEE2 = '#140A03', '#2E1A0D', '#1A0E06'
CHEST, OXBLOOD = '#4E2116', '#6E1F26'
CRIMSON, CRIMSON_BR = '#7C1F2E', '#A8455A'          # css/brand.css tokens
COCOA = '#241509'
GOLD, GOLD_BR, ANTIQUE = '#C6A15B', '#E9CE8A', '#9C7A3C'
IVORY, CREAM, PARCH = '#FBF7EF', '#F5EEE1', '#EDE3D2'
INK, INK2 = '#241A12', '#5A4632'

# the two masses, ramped in opposite directions so head and foot answer
# each other rather than repeat
RAMP_HEAD = (f'linear-gradient(112deg,{COCOA_D} 0%,{COFFEE} 24%,{CHEST} 58%,'
             f'{OXBLOOD} 84%,{CRIMSON} 100%)')
RAMP_FOOT = (f'linear-gradient(292deg,{COCOA_D} 0%,{COFFEE} 26%,{CHEST} 60%,'
             f'{OXBLOOD} 86%,{CRIMSON} 100%)')

# The cut rises 15.99mm across the 210mm measure on both masses — 4.355°.
# Every ribbon is a real bar rotated to that angle rather than a polygon,
# so it can carry a bevel, a specular sweep and a cast shadow: the three
# things that make a band read as folded metal instead of a flat shape.
CUT_DEG = '-4.355deg'
# top bevel, bottom bevel, then the foil itself running along its length
RIBBON = ('linear-gradient(to bottom,#FCF3DC 0 .17mm,rgba(0,0,0,0) .17mm),'
          'linear-gradient(to top,rgba(46,26,13,.9) 0 .24mm,rgba(0,0,0,0) .24mm),'
          'linear-gradient(96deg,#6E5121 0%,#B48F45 11%,#F6E9CE 33%,#E0C68F 49%,'
          '#9C7A3C 72%,#F2DFAF 91%,#8A6A2E 100%)')
RIBBON2 = ('linear-gradient(to bottom,rgba(255,225,225,.5) 0 .13mm,rgba(0,0,0,0) .13mm),'
           'linear-gradient(to top,rgba(30,6,10,.75) 0 .18mm,rgba(0,0,0,0) .18mm),'
           f'linear-gradient(96deg,#4E1018 0%,{CRIMSON} 26%,{CRIMSON_BR} 52%,'
           f'{CRIMSON} 76%,#5A1520 100%)')
# Real foil is not a flat colour: it catches light along its length, so the
# gradient runs along the ribbon rather than across it.
FOIL_H = ('linear-gradient(96deg,#8A6A2E 0%,#C6A15B 16%,#F6E9CE 38%,'
          '#E3CB95 56%,#B08D4F 78%,#F2DFAF 100%)')

AR = 'مدارس السلطان حنفي الملكية'
QUAD = ('<span class="q"><i></i><i></i><i></i><i></i></span>')   # the crest's four quadrants, abstracted

HOUSES = ['Nursery &amp; Primary', 'Royal College', 'Islamic &amp; Arabic Studies',
          'Qur&rsquo;an College', 'Online &amp; Distance Learning']
INST = f' {QUAD} '.join(HOUSES)

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

/* ═══ THE HEAD — a coffee mass cut on the diagonal, with a royal-gold
   ribbon riding the cut, mirrored and inverted at the foot. The sheet is
   held between two sweeps of the same two materials: the mass is the
   institution, the ribbon is the movement across it. Nothing here is a
   rectangle sitting on paper. ═══ */
.head{{position:absolute;left:0;right:0;top:0;height:72mm;z-index:3}}
.head .mass{{position:absolute;inset:0;overflow:hidden;
 clip-path:polygon(0 0,100% 0,100% 47.2%,0 69.4%);
 background:{RAMP_HEAD};
 box-shadow:inset 0 .5mm 0 -.15mm rgba(255,238,206,.13),inset .5mm 0 0 -.15mm rgba(255,238,206,.09)}}
/* the light that travels across the mass — depth, not decoration */
.head .mass::before{{content:'';position:absolute;left:-14%;top:-50%;width:62%;height:210%;
 transform:rotate(21deg);
 background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,244,220,.115) 48%,rgba(255,255,255,0) 100%)}}
/* the mass is lit from the top left, so its far corner falls away */
.head .mass::after{{content:'';position:absolute;inset:0;
 background:radial-gradient(120% 150% at 6% -10%,rgba(255,240,212,.10) 0%,rgba(0,0,0,0) 46%,rgba(0,0,0,.28) 100%)}}
/* The chamfer: the mass is not a slab with a printed edge, it is a solid
   whose face is machined back before it meets the cut. The chamfer sits at
   a different angle to the light, so it reads brighter at its lip and falls
   away beneath — which is what tells the eye there is thickness here. */
.chm{{position:absolute;left:-16mm;width:242mm;height:8mm;transform:rotate({CUT_DEG});
 pointer-events:none}}
.head .chm{{top:33.98mm;
 background:linear-gradient(to bottom,rgba(255,242,216,.20) 0 .22mm,
  rgba(255,238,206,.085) .22mm,rgba(255,238,206,.02) 46%,rgba(12,5,2,.20) 100%)}}
.foot .chm{{top:17.78mm;
 background:linear-gradient(to top,rgba(255,242,216,.15) 0 .22mm,
  rgba(255,238,206,.07) .22mm,rgba(255,238,206,.02) 46%,rgba(12,5,2,.18) 100%)}}
.head.c2 .chm{{top:17.68mm}}
/* struck arcs — the seal's geometry carried out into the mass */
.head .arc{{position:absolute;right:-46mm;top:-34mm;width:112mm;height:112mm;border-radius:50%;
 border:2.2mm solid rgba(198,161,91,.18)}}
.head .arc2{{position:absolute;right:-22mm;top:-54mm;width:96mm;height:96mm;border-radius:50%;
 border:.5pt solid rgba(198,161,91,.38)}}
/* the ribbon, in two weights, riding the cut and running off both edges */
/* Ribbons and the shadow they cast are one assembly, rotated together to
   the angle of the cut. Because each is a real bar and not a clipped
   polygon, it takes a bevel on both edges and a shadow underneath — which
   is the whole difference between a folded band and a painted stripe. */
.rib,.rib2,.rsh{{position:absolute;left:-16mm;width:242mm;z-index:4;pointer-events:none;
 transform:rotate({CUT_DEG})}}
.rib{{top:41.98mm;height:6mm;background:{RIBBON};
 box-shadow:0 .9pt 2.1pt rgba(20,10,3,.42)}}
/* the fold: the band turns behind the mass at the left edge */
.rib::before{{content:'';position:absolute;left:0;top:0;width:22mm;height:100%;
 background:linear-gradient(90deg,#3A2A10 0%,#6E5121 42%,rgba(110,81,33,0) 100%)}}
.rib2{{top:49.38mm;height:2.2mm;background:{RIBBON2};
 box-shadow:0 .6pt 1.4pt rgba(20,4,8,.4)}}
/* the assembly floats: this is its shadow on the paper */
.rsh{{top:51.6mm;height:6mm;
 background:linear-gradient(to bottom,rgba(43,20,10,.20) 0%,rgba(43,20,10,.07) 38%,rgba(43,20,10,0) 100%)}}

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
.seat{{position:absolute;left:24mm;top:63.4mm;z-index:5;max-width:96mm;white-space:nowrap;
 font-size:5.4pt;letter-spacing:.2em;text-transform:uppercase;color:{ANTIQUE}}}
.seat .q{{margin-right:1.6mm}}

/* ═══ the ivory field ═══ */
/* the registry: what makes this document a record rather than a page */
.reg{{position:absolute;right:24mm;top:61mm;z-index:5;display:flex;gap:7mm;text-align:right}}
.reg dt{{font-size:4.7pt;letter-spacing:.24em;text-transform:uppercase;color:{ANTIQUE};margin-bottom:.7mm}}
.reg dd{{font-size:6.6pt;color:{INK};line-height:1.3}}
.reg .fold{{font-family:'Cinzel',serif;font-size:9pt;color:{CRIMSON};align-self:flex-end;
 padding-left:6mm;border-left:.4pt solid rgba(124,31,46,.5)}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.42mm;
 width:2.3mm;height:2.3mm;vertical-align:-.15mm}}
.q i{{background:{GOLD};display:block}}

.body{{position:relative;z-index:1;flex:1;padding:78mm 24mm 0 24mm;font-size:10.4pt;line-height:1.68;color:{INK}}}
.body.cont{{padding-top:48mm}}
.body p{{margin-bottom:3.4mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;border-bottom:.5pt solid rgba(156,122,60,.6);text-decoration:none}}
.body p.open::first-letter{{font-family:'Cinzel',serif;font-weight:700;font-size:22pt;line-height:.98;
 float:left;margin:1.5mm 2mm 0 0;color:{COFFEE}}}
.addr{{margin-bottom:6.4mm!important;line-height:1.5}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:10.6pt;letter-spacing:.052em;text-transform:uppercase;
 color:{COFFEE};margin-bottom:5mm;line-height:1.44}}
.lead{{font-family:'Cinzel',serif;font-size:8.2pt;letter-spacing:.16em;text-transform:uppercase;color:{CRIMSON};
 margin:5.4mm 0 2.8mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.5pt solid rgba(156,122,60,.55)}}
.signoff{{margin-top:6.4mm}} .sigsp{{height:17mm}}
.sigrule{{width:58mm;height:.5pt;background:{GOLD};margin-bottom:2.4mm}}
.signm{{line-height:1.55}} .sigt{{font-size:8.6pt;color:{INK2}}}
.blank{{display:flex;gap:5mm;font-size:7.4pt;letter-spacing:.18em;text-transform:uppercase;
 color:{ANTIQUE};margin-bottom:8mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(156,122,60,.45);font-style:normal}}

/* ═══ THE FOOT — the same mass and the same ribbon, swept the other way.
   The record is what the document rests on. ═══ */
.foot{{position:relative;z-index:2;margin-top:auto;flex:0 0 56mm;height:56mm}}
.foot .fmass{{position:absolute;inset:0;overflow:hidden;
 clip-path:polygon(0 46%,100% 17.5%,100% 100%,0 100%);
 background:{RAMP_FOOT};
 box-shadow:inset 0 -.5mm 0 -.15mm rgba(255,238,206,.09)}}
.foot .fmass::before{{content:'';position:absolute;left:24%;top:-60%;width:64%;height:230%;
 transform:rotate(21deg);
 background:linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,244,220,.095) 48%,rgba(255,255,255,0) 100%)}}
.foot .fmass::after{{content:'';position:absolute;inset:0;
 background:radial-gradient(120% 160% at 94% 116%,rgba(255,240,212,.09) 0%,rgba(0,0,0,0) 44%,rgba(0,0,0,.26) 100%)}}
.frib,.frib2,.fsh{{position:absolute;left:-16mm;width:242mm;z-index:3;pointer-events:none;
 transform:rotate({CUT_DEG})}}
.frib{{top:11.78mm;height:6mm;background:{RIBBON};
 box-shadow:0 -.9pt 2.1pt rgba(20,10,3,.34)}}
.frib::before{{content:'';position:absolute;right:0;top:0;width:22mm;height:100%;
 background:linear-gradient(270deg,#3A2A10 0%,#6E5121 42%,rgba(110,81,33,0) 100%)}}
.frib2{{top:8.18mm;height:2.2mm;background:{RIBBON2};
 box-shadow:0 -.6pt 1.4pt rgba(20,4,8,.36)}}
.fsh{{top:2.2mm;height:6mm;
 background:linear-gradient(to top,rgba(43,20,10,.17) 0%,rgba(43,20,10,.06) 38%,rgba(43,20,10,0) 100%)}}
.foot .gl{{position:absolute;left:0;right:0;bottom:0;height:11mm;opacity:.3;z-index:2;
 background:url(data:image/svg+xml;base64,{GL}) center/100% 100% no-repeat}}
.foot .mt{{position:absolute;left:0;right:0;bottom:1.4mm;height:2.4mm;opacity:.26;z-index:4;
 background:url(data:image/svg+xml;base64,{MT}) left center/100% 100% no-repeat}}
.fbody{{position:absolute;left:24mm;right:24mm;top:30mm;z-index:4}}
.fh{{display:flex;align-items:center;gap:2.6mm;justify-content:space-between;white-space:nowrap;
 font-size:5pt;letter-spacing:.1em;text-transform:uppercase;color:rgba(214,186,133,.92);
 padding-bottom:1.8mm;margin-bottom:2mm;border-bottom:.35pt solid rgba(198,161,91,.26)}}
.fg{{display:flex;justify-content:space-between;gap:6mm;font-size:6.6pt;color:#EFE1C6;line-height:1.5}}
.fg>div{{flex:1}} .fg>div:last-child{{text-align:right}}
.fl{{display:block;font-size:5.2pt;letter-spacing:.26em;text-transform:uppercase;color:{GOLD};margin-bottom:.7mm}}
.fg a{{color:inherit;text-decoration:none}}
.creed{{margin-top:2.6mm;padding-top:2mm;border-top:.35pt solid rgba(198,161,91,.24);
 font-family:'Cormorant Garamond',serif;font-style:italic;font-size:8.6pt;color:{GOLD};letter-spacing:.02em}}

/* continuation: the same two sweeps, shallower. Same grammar, less ceremony */
.head.c2{{height:44mm}} .head.c2 .mass{{clip-path:polygon(0 0,100% 0,100% 46.7%,0 70%)}}
.head.c2 .rib{{top:25.68mm}} .head.c2 .rib2{{top:33.08mm}} .head.c2 .rsh{{top:35.3mm}}
.head.c2 .hgrid{{top:6mm;gap:6mm}} .head.c2 .seal{{width:19mm;height:19mm}}
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
    return (f'<header class="head{c2}">'
            f'<div class="mass"><div class="arc"></div><div class="arc2"></div><div class="chm"></div></div>'
            f'<div class="rib"></div><div class="rib2"></div><div class="rsh"></div>'
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

FOOT = ('<footer class="foot"><div class="fmass"><div class="chm"></div></div><div class="gl"></div>'
        '<div class="fsh"></div><div class="frib"></div><div class="frib2"></div><div class="mt"></div>'
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
