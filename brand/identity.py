#!/usr/bin/env python3
"""SULTAN HANAFI ROYAL SCHOOLS — the institutional identity.

THE SIGNATURE — the Axis.

The school teaches in two languages and it is one school. So the two
names are not stacked, and neither is a caption to the other: they meet
at a single vertical gold member, English running right-to-left toward
it, Arabic running left-to-right toward it. That member is the Axis.

The arms stand on it. The measure is centred on it. Everything on the
sheet is either on the Axis or measured from it. It is the only device
the system has, and it is the only one it needs — because it says
something true about this institution that no other institution can say
in the same way, and it can be built at any size, in one ink, by anyone.

Fifteen-per-cent test: a fragment showing two languages meeting at a gold
vertical, with arms above it, is SHRS and nothing else.

WHAT THIS SHEET DELIBERATELY DOES NOT DO
----------------------------------------
No coffee masses, no ribbon, no gradient, no printed paper texture, no
vignette, no watermark, no microtext, no drop shadow on the arms. Every
one of those was present in an earlier revision and every one was removed
against a measured fault; see docs/letterhead-audit.md.

The governing numbers, and the reason each exists:

  ink coverage       ~6%    Oxford ~5, Cambridge ~6, Aramco ~12. Above
                            about 15% a school cannot afford to print
                            ordinary correspondence on its own letterhead.
  left edges          2     one margin, one indent. Eleven was the fault.
  right edges         2     the measure, and the reference block.
  type sizes          5     one modular scale, ratio 1.25 from 10.5pt.
                            Nothing below 6.7pt anywhere, nothing below
                            8.4pt reversed out of the foot band.
  measure           132mm   71 characters. 45-75 is the readable range.

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
         ('Inter', 'normal', 400, 'inter-latin-400-normal'),
         ('Inter', 'normal', 600, 'inter-latin-600-normal'),
         ('Amiri', 'normal', 400, 'amiri-arabic-400-normal')]
FONTS = ''.join(
    "@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:block;"
    "src:url(data:font/woff2;base64,%s) format('woff2')}" %
    (fam, style, wt, b64(ROOT.parent / 'assets' / 'fonts' / (f + '.woff2')))
    for fam, style, wt, f in FACES)
# single-ink arms: the stock artwork is drawn light for a dark ground and
# disappears on ivory, so it is re-rendered in one colour by build-arms.py
# on this architecture the arms sit on the coffee mass, so they take the
# light artwork; crest-coffee.png is the single-ink version for ivory
CREST = b64(ROOT / 'assets' / 'crest.png')

# ── ink. Two colours and the paper. Coffee is the text ink; gold is one
# flat specified colour — Pantone 872, or a single CMYK build — because a
# gradient gold bands in four-colour and goes green under dot gain, and as
# foil it is a separate pass that has to be paid for on every sheet.
COFFEE, INK, INK2 = '#2E1A0D', '#241A12', '#5A4632'
GOLD_P = '#9C7A3C'          # on paper: an ochre that prints honestly
GOLD_R = '#C6A15B'          # reversed out of coffee, where it can be lighter
PAPER, PAPER_R = '#FBF8F1', '#F2ECE0'

AR = 'مدارس السلطان حنفي الملكية'
QUAD = '<span class="q"><i></i><i></i><i></i><i></i></span>'

HOUSES = ['Nursery &amp; Primary', 'Royal College', 'Islamic &amp; Arabic Studies',
          'Qur&rsquo;an College', 'Online &amp; Distance Learning']
INST = f' {QUAD} '.join(HOUSES)

# ── the scale. Ratio 1.25 from a 10.5pt body. The print floors survive
# from the audit, because they are craft and not register: nothing below
# 6.7pt anywhere, nothing below 8.4pt reversed out of the coffee.
S_LABEL, S_SMALL, S_BODY, S_SUBJ = 6.7, 8.4, 10.5, 13.1
S_NAME = 9.1        # so the derived Arabic lands on 10.5, the body size
S_ARABIC = round(S_NAME * 1.15, 1)

# ═══ THE ARCHITECTURE ═══
#
# Built to the reference stationery, element for element:
#
#   a coffee MASS across the head, with a gold WEDGE folded into its
#   top-right corner and a rounded PANEL of contact detail inset at the
#   right, each line badged with a gold disc;
#   a gold RIBBON sweeping down out of the mass on a curve, folding where
#   it crosses the mass's edge and running on into the ivory;
#   the ivory FIELD, carrying the addressee at the left and the date at
#   the right;
#   a coffee BAR at the foot with the ribbon mirrored into it and a wedge
#   folded into the opposite corner, so the sheet turns through a half
#   turn rather than repeating.
#
# Coverage is 29% of the sheet, against the 4-12% of the institutions in
# docs/letterhead-audit.md. That is the architecture's own cost and it is
# a deliberate choice, recorded here so it is not mistaken for an
# oversight.
HEAD_H, FOOT_H = 59, 27
MARGIN = 28

GOLD_G = ('<linearGradient id="{i}" x1="0" y1="0" x2=".35" y2="1">'
          '<stop offset="0" stop-color="#E8C77E"/><stop offset=".45" stop-color="#C6A15B"/>'
          '<stop offset="1" stop-color="#A07E38"/></linearGradient>')
COFFEE_G = ('<linearGradient id="{i}" x1="0" y1="0" x2="1" y2=".7">'
            '<stop offset="0" stop-color="#3A2211"/><stop offset=".55" stop-color="#2E1A0D"/>'
            '<stop offset="1" stop-color="#1C0F06"/></linearGradient>')
FOLD_G = ('<linearGradient id="{i}" x1="0" y1="0" x2=".6" y2="1">'
          '<stop offset="0" stop-color="#8A6A2E"/><stop offset="1" stop-color="#5A4119"/></linearGradient>')

# THE RIBBON. In the reference it is a broad band of *constant width* that
# runs straight, turns once through a large radius, and ends on a straight
# cut. That is a stroked path with a round join — not a pair of Bezier
# curves, which is what made the earlier attempt wobble like a scarf
# instead of reading as a folded band of material.
RIB_W = 27

HEAD_SVG = f"""<svg class="bnd" viewBox="0 0 210 {HEAD_H + 40}" preserveAspectRatio="none" aria-hidden="true">
<defs>{COFFEE_G.format(i='mh')}{GOLD_G.format(i='gh')}{FOLD_G.format(i='fh')}</defs>
<path d="M0,0 H210 V{HEAD_H} H0 Z" fill="url(#mh)"/>
<path d="M168,0 L210,0 L210,29 Z" fill="url(#gh)"/>
<path d="M168,0 L181,0 L210,20 L210,29 Z" fill="url(#fh)" opacity=".6"/>
<path d="M141,-8 L141,30 L114,70" fill="none" stroke="url(#gh)" stroke-width="{RIB_W}"
      stroke-linejoin="round" stroke-linecap="butt"/>
<path d="M127.5,26 L154.5,26 L150,41 L132,35 Z" fill="url(#fh)"/>
</svg>"""

FOOT_SVG = f"""<svg class="bnd" viewBox="0 0 210 {FOOT_H + 34}" preserveAspectRatio="none" aria-hidden="true">
<defs>{COFFEE_G.format(i='mf')}{GOLD_G.format(i='gf')}{FOLD_G.format(i='ff')}</defs>
<path d="M0,34 H210 V{FOOT_H + 34} H0 Z" fill="url(#mf)"/>
<path d="M146,{FOOT_H + 42} L146,30 L184,-2" fill="none" stroke="url(#gf)" stroke-width="{RIB_W}"
      stroke-linejoin="round" stroke-linecap="butt"/>
<path d="M132.5,34 L159.5,34 L155,19 L137,25 Z" fill="url(#ff)"/>
</svg>"""

# Four glyphs, drawn rather than imported: nothing here may depend on an
# icon font being installed where the sheet is printed.
GLYPH = {
 'campus': 'M12 2 3 8v13h6v-6h6v6h6V8z',
 'phone':  'M20 15.6a12.4 12.4 0 0 1-3.9-.6 1.1 1.1 0 0 0-1.1.3l-1.6 1.6a15 15 0 0 1-6.3-6.3l1.6-1.6a1.1 1.1 0 0 0 .3-1.1A12.4 12.4 0 0 1 8.4 4 1 1 0 0 0 7.4 3H4.3a1 1 0 0 0-1 1A16.7 16.7 0 0 0 20 20.7a1 1 0 0 0 1-1v-3.1a1 1 0 0 0-1-1z',
 'mail':   'M3 6h18v12H3zm2 2.6V8l7 4.9L19 8v.6l-7 4.9z',
 'record': 'M12 2 4 5v6.2C4 16.4 7.4 20.9 12 22c4.6-1.1 8-5.6 8-10.8V5zm-1 13-3.2-3.2 1.4-1.4L11 12.2l4.8-4.8 1.4 1.4z',
}
ico = lambda k: (f'<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">'
                 f'<path d="{GLYPH[k]}"/></svg></span>')

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#4A423A;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 background:{PAPER};color:{INK};font-family:'Inter',serif;
 font-size:{S_BODY}pt;line-height:1.6;
 -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}
.bnd{{position:absolute;left:0;width:100%;display:block}}

/* ═══ THE HEAD ═══ mass, corner wedge, inset panel, and the ribbon that
   sweeps down out of all three. */
.head{{flex:0 0 {HEAD_H}mm;position:relative;z-index:3}}
.head .bnd{{top:0;height:{HEAD_H + 40}mm}}
.hgrid{{position:absolute;left:{MARGIN}mm;top:14mm;z-index:4;display:flex;align-items:center;gap:4.5mm}}
.arms{{flex:0 0 auto;width:19mm;height:19mm;display:block}}
.lock{{display:flex;align-items:stretch}}
.lock .en,.lock .ar{{display:flex;flex-direction:column;justify-content:center;color:#F7EFDD}}
.lock .en{{padding-right:4mm;text-align:right;
 font-family:'Cinzel',serif;font-weight:800;font-size:{S_NAME}pt;letter-spacing:.06em;
 text-transform:uppercase;line-height:1.18;white-space:nowrap}}
.lock .ar{{padding-left:4mm;text-align:left;direction:rtl;
 font-family:'Amiri',serif;font-size:{S_ARABIC}pt;line-height:1.18;white-space:nowrap}}
.lock b{{display:block;font-weight:inherit}}
/* the Axis survives the change of architecture: it is still where the two
   languages meet, and it is still the only thing that joins them */
.lock .axis{{flex:0 0 auto;width:.6pt;background:{GOLD_R};margin:-1mm 0}}

/* the inset panel of contact detail, each line badged */
.panel{{position:absolute;right:{MARGIN}mm;top:9mm;z-index:5;
 display:grid;grid-template-columns:auto;gap:2.4mm;
 padding:3.6mm 5mm;border-radius:1.2mm 4mm 1.2mm 4mm;
 background:rgba(255,244,222,.06);border:.4pt solid rgba(198,161,91,.32)}}
.panel span.l{{display:flex;align-items:center;gap:2.2mm;
 font-size:{S_SMALL}pt;color:{PAPER_R};white-space:nowrap}}
.panel a{{color:inherit;text-decoration:none}}
.ico{{flex:0 0 auto;width:4.2mm;height:4.2mm;border-radius:50%;
 background:linear-gradient(152deg,#E8C77E,{GOLD_R} 55%,#8A6A2E);
 display:flex;align-items:center;justify-content:center}}
.ico svg{{width:2.4mm;height:2.4mm;display:block;fill:#2A1808}}

/* ═══ THE FIELD ═══ */
.body{{flex:1;position:relative;z-index:2;padding:34mm {MARGIN}mm 0;min-width:0}}
.body.c2{{padding-top:20mm}}
.body p{{margin-bottom:3.4mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;text-decoration:none;
 border-bottom:.4pt solid rgba(156,122,60,.55)}}
.top{{display:flex;justify-content:space-between;align-items:flex-start;gap:10mm;margin-bottom:9mm}}
.top .dt{{font-size:{S_SMALL}pt;color:{INK2};white-space:nowrap;text-align:right}}
.top .dt b{{display:block;font-weight:600;color:{COFFEE};font-size:{S_BODY}pt;margin-top:.8mm}}
.addr{{line-height:1.45}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:{S_SUBJ}pt;letter-spacing:.03em;
 text-transform:uppercase;color:{COFFEE};margin-bottom:5mm;line-height:1.32}}
.lead{{font-family:'Cinzel',serif;font-size:{S_SMALL}pt;letter-spacing:.14em;text-transform:uppercase;
 color:{GOLD_P};margin:6.8mm 0 3.4mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.4pt solid rgba(156,122,60,.5)}}
.signoff{{margin-top:6.8mm}} .sigsp{{height:17mm}}
.sigrule{{width:52mm;height:.4pt;background:{GOLD_P};margin-bottom:2.4mm}}
.signm{{line-height:1.45}} .sigt{{font-size:{S_SMALL}pt;color:{INK2}}}
.blank{{display:flex;gap:5mm;font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD_P};margin-bottom:9mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(156,122,60,.5);font-style:normal}}

/* ═══ THE FOOT ═══ the same three elements, turned through a half turn. */
.foot{{flex:0 0 {FOOT_H}mm;position:relative;z-index:3}}
.foot .bnd{{bottom:0;height:{FOOT_H + 34}mm}}
/* the creed sits left of the ribbon, in the school's own voice */
.creed{{position:absolute;left:{MARGIN}mm;width:60mm;top:50%;transform:translateY(-50%);z-index:4;
 font-family:'Cormorant Garamond',serif;font-style:italic;font-size:{S_SMALL}pt;
 color:{GOLD_R};letter-spacing:.01em;line-height:1.5}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.35mm;
 width:1.6mm;height:1.6mm;vertical-align:.1mm;margin:0 .9mm}}
.q i{{background:{GOLD_R};display:block}}

/* continuation sheets: the mass halves and the panel drops away */
.head.c2{{flex:0 0 {HEAD_H - 22}mm}}
.head.c2 .bnd{{height:{HEAD_H + 18}mm}}
.head.c2 .hgrid{{top:7mm}} .head.c2 .arms{{width:17mm;height:17mm}}
.head.c2 .lock .en{{font-size:8.4pt}} .head.c2 .lock .ar{{font-size:9.7pt}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

PANEL = ('<div class="panel">'
         f'<span class="l">{ico("campus")}Ikorodu, Lagos State</span>'
         f'<span class="l">{ico("phone")}<a href="tel:+2348073747650">+234 807 374 7650</a></span>'
         f'<span class="l">{ico("mail")}<a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></span>'
         f'<span class="l">{ico("record")}<a href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></span>'
         '</div>')

FOOT = ('<footer class="foot">' + FOOT_SVG +
        '<p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;'
        f'&#8195;{QUAD}&#8195;Established July 2016</p>'
        '</footer>')

# The name breaks at the same place in both languages — two lines each — and
# the break in Arabic falls after the idafa, the unit that must not be split.
EN_L = '<b>Sultan Hanafi</b><b>Royal Schools</b>'
AR_L = '<b>{0}</b><b>{1}</b>'.format(*AR.rsplit(' ', 1))


def head(first=True):
    c2 = '' if first else ' c2'
    return (f'<header class="head{c2}">{HEAD_SVG}'
            f'<div class="hgrid">'
            f'<img class="arms" src="data:image/png;base64,{CREST}" '
            f'alt="Arms of Sultan Hanafi Royal Schools" />'
            f'<div class="lock"><div class="en">{EN_L}</div>'
            f'<div class="axis"></div><div class="ar">{AR_L}</div></div></div>'
            + (PANEL if first else '') + '</header>')

TOP = ('      <div class="top"><div class="dt">Reference<b>SHRS/ICT/2026/001</b></div>'
       '<div class="dt">Date<b>13 August 2026</b></div></div>')


def page(inner, first=True):
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    {head(first)}\n    <main class="body{"" if first else " c2"}">\n{inner}\n'
            f'    </main>\n{FOOT}\n  </div>')


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
          .replace('class="ref-line ref-line--f"', 'class="refline"')
          .replace('class="fill"', 'class="val"').replace('class="sig-space"', 'class="sigsp"')
          .replace('class="sig-rule"', 'class="sigrule"').replace('class="sig-name"', 'class="signm"')
          .replace('class="sig-title"', 'class="sigt"'))
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
blocks = [b for b in blocks if 'class="refline"' not in b]
body = lambda a, b: "\n".join("      " + x for x in blocks[a:b])
CUTS = [(0, 5), (5, 11), (11, 16), (16, 21), (21, 26)]
(ROOT / 'letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter',
        [page((TOP + '\n' if i == 0 else '') + body(a, b), i == 0)
         for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

# ── blank stationery
BLANK = '      <div class="blank"><span>Ref</span><i></i><span>Date</span><i></i></div>'
(ROOT / 'letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead', [page(BLANK, True)]), encoding='utf-8')
print('identity built')
