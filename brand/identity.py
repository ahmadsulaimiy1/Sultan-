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
CREST = b64(ROOT / 'assets' / 'crest-coffee.png')

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

# ── the scale. Ratio 1.25 from a 10.5pt body. Five sizes, and one derived:
# the Arabic is set at 1.15x the Latin, because Amiri at matched point size
# reads smaller — matching the numbers would make the Arabic subordinate,
# and it is matching the *presence* that parity actually requires.
S_LABEL, S_SMALL, S_BODY, S_SUBJ = 6.7, 8.4, 10.5, 13.1
S_ARABIC = round(11.4 * 1.15, 1)   # 13.1 — lands on the scale

# ── the grid. Two left edges, two right. Every vertical dimension is a
# whole multiple of the 3.5mm unit.
# The masthead is allowed a wider measure than the text — the names must
# be set at a readable size, and 27 Latin characters will not fit half of
# 132mm. Both are centred on the same axis, so the sheet still has one
# vertical centre line and the arms stand on it.
# The page is built off one vertical line rather than a centre. Left of it
# is the margin column and its apparatus; right of it is the text. The arms
# stand astride it and the two names meet on it.
MARGIN = 24
AXIS = 74                     # the spine, 74mm from the left trim
ARMS = 38
HEAD_H = 112
LOCK_TOP = 60
RULE_TOP = 92
BAND_H = 22
S_NAME = 11.4

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#4A423A;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 background:{PAPER};color:{INK};font-family:'Inter',serif;
 font-size:{S_BODY}pt;line-height:1.62;
 -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}

/* ═══ THE AXIS ═══ the meeting line of the school's two languages, carried
   the full height of the sheet as its spine. It is one gold hairline. It
   is also the only structural line the page has, and everything — the
   arms, both names, the text block, the marginal column — is placed by
   it. A centred stack was the failure this replaces: centring is the
   least designed arrangement available, and it gave the sheet no tension
   at all. */
.axis{{position:absolute;left:{AXIS}mm;top:0;bottom:{BAND_H}mm;width:.7pt;background:{GOLD_P};z-index:2}}
/* it is struck at the head and at the foot, so it reads as a member with
   ends rather than a rule that simply stops */
.axis::before,.axis::after{{content:'';position:absolute;left:-2.6mm;width:6mm;height:.7pt;background:{GOLD_P}}}
.axis::before{{top:{HEAD_H}mm}} .axis::after{{bottom:0}}

/* ═══ THE HEAD ═══ arms astride the Axis, the two names flanking it. */
.head{{flex:0 0 {HEAD_H}mm;position:relative}}
.arms{{position:absolute;left:{AXIS}mm;top:16mm;width:{ARMS}mm;height:{ARMS}mm;
 transform:translateX(-50%);z-index:3}}
.lock{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;top:{LOCK_TOP}mm;z-index:3;
 display:flex;align-items:stretch}}
.lock .en{{flex:0 0 {AXIS - MARGIN}mm;padding-right:6mm;text-align:right;color:{COFFEE};
 font-family:'Cinzel',serif;font-weight:800;font-size:{S_NAME}pt;letter-spacing:.06em;
 text-transform:uppercase;line-height:1.16}}
.lock .ar{{flex:1;min-width:0;padding-left:6mm;text-align:left;direction:rtl;color:{COFFEE};
 font-family:'Amiri',serif;font-size:{S_ARABIC}pt;line-height:1.16;
 display:flex;flex-direction:column;justify-content:center}}
.lock b{{display:block;font-weight:inherit}}

/* the double rule — thick over thin, the engraver's cadence, and the one
   piece of ornament the sheet allows itself */
.hrule{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;top:{RULE_TOP}mm;height:1.1pt;
 background:{GOLD_P};z-index:2}}
.hrule::after{{content:'';position:absolute;left:0;right:0;top:2.1mm;height:.4pt;
 background:{GOLD_P};opacity:.62}}
.houses{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;top:{RULE_TOP + 5}mm;z-index:2;
 font-size:{S_LABEL}pt;letter-spacing:.055em;text-transform:uppercase;
 color:{GOLD_P};white-space:nowrap;text-align:center}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.4mm;
 width:1.9mm;height:1.9mm;vertical-align:.1mm;margin:0 .55mm}}
.q i{{background:{GOLD_P};display:block}}

/* ═══ THE MARGIN ═══ left of the Axis. The record of the document lives
   here, which is what the column is for — a scholarly page has always
   carried its apparatus in the margin, and it is why this sheet has no
   empty quarter. */
.marg{{position:absolute;left:{MARGIN}mm;width:{AXIS - MARGIN - 8}mm;top:{HEAD_H + 12}mm;
 z-index:2;text-align:right}}
.marg dt{{font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;color:{GOLD_P};
 margin-bottom:.8mm}}
.marg dd{{font-size:{S_SMALL}pt;color:{INK2};margin-bottom:5.25mm;line-height:1.35}}
.marg .fol{{font-family:'Cinzel',serif;font-size:{S_SUBJ}pt;color:{GOLD_P};margin-top:3.5mm}}
.marg i{{display:block;border-bottom:.4pt solid rgba(156,122,60,.5);height:4.4mm;font-style:normal}}

/* ═══ THE FIELD ═══ right of the Axis. 106mm of measure, 58 characters. */
.body{{flex:1;position:relative;z-index:2;padding:12mm {MARGIN}mm 0 {AXIS + 8}mm;min-width:0}}
.body p{{margin-bottom:3.5mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;text-decoration:none;
 border-bottom:.4pt solid rgba(156,122,60,.55)}}
.addr{{margin-bottom:7mm!important;line-height:1.45}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:{S_SUBJ}pt;letter-spacing:.03em;
 text-transform:uppercase;color:{COFFEE};margin-bottom:5.25mm;line-height:1.32}}
.lead{{font-family:'Cinzel',serif;font-size:{S_SMALL}pt;letter-spacing:.14em;text-transform:uppercase;
 color:{GOLD_P};margin:7mm 0 3.5mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.4pt solid rgba(156,122,60,.5)}}
.signoff{{margin-top:7mm}} .sigsp{{height:17.5mm}}
.sigrule{{width:52mm;height:.4pt;background:{GOLD_P};margin-bottom:2.4mm}}
.signm{{line-height:1.45}} .sigt{{font-size:{S_SMALL}pt;color:{INK2}}}

/* ═══ THE FOOT ═══ one band of ink, carrying the creed in the school's own
   voice and the record beneath it. */
.foot{{flex:0 0 {BAND_H}mm;position:relative;background:{COFFEE};
 box-shadow:inset 0 .7pt 0 {GOLD_R};
 display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2.4mm;
 padding:0 {MARGIN}mm}}
.creed{{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:{S_SUBJ}pt;
 color:{GOLD_R};letter-spacing:.01em}}
.rec{{display:flex;gap:4mm;font-size:{S_SMALL}pt;color:{PAPER_R};white-space:nowrap}}
.rec a{{color:inherit;text-decoration:none}}
.foot .q i{{background:{GOLD_R}}}

/* continuation sheets: the Axis and the arms remain, the rule and the five
   schools drop away. The device survives its own subtraction, which is the
   point of having only one. */
.head.c2{{flex:0 0 {HEAD_H - 34}mm}}
.head.c2 .arms{{top:12mm;width:{ARMS - 14}mm;height:{ARMS - 14}mm}}
.body.c2{{padding-top:8mm}}
.marg.c2{{top:{HEAD_H - 22}mm}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

MARG = ('<div class="marg{c}"><dl><dt>Reference</dt><dd>SHRS/ICT/2026/001</dd>'
        '<dt>Issued</dt><dd>13 August 2026</dd></dl>'
        '<div class="fol">{f}</div></div>')

MARG_BLANK = ('<div class="marg"><dl><dt>Reference</dt><dd><i></i></dd>'
              '<dt>Date</dt><dd><i></i></dd></dl></div>')

FOOT = ('<footer class="foot">'
        '<p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>'
        '<div class="rec"><span>Ikorodu, Lagos State, Nigeria</span>' + QUAD +
        '<a href="tel:+2348073747650">+234 807 374 7650</a>' + QUAD +
        '<a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a>' + QUAD +
        '<a href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></div>'
        '</footer>')

# The name breaks at the same place in both languages — two lines each, so
# the two blocks are of one build, and the break in Arabic falls after the
# idafa, which is the unit that must not be split.
EN_L = '<b>Sultan Hanafi</b><b>Royal Schools</b>'
AR_L = '<b>{0}</b><b>{1}</b>'.format(*AR.rsplit(' ', 1))


def head(first=True):
    c2 = '' if first else ' c2'
    tail = (f'<div class="hrule"></div><div class="houses">{INST}</div>') if first else ''
    return (f'<header class="head{c2}">'
            f'<img class="arms" src="data:image/png;base64,{CREST}" '
            f'alt="Arms of Sultan Hanafi Royal Schools" />'
            f'<div class="lock"><div class="en">{EN_L}</div><div class="ar">{AR_L}</div></div>'
            f'{tail}</header>')


PAGE_NO = [1]

def page(inner, first=True, marg=None):
    m = marg if marg is not None else MARG.format(c='' if first else ' c2',
                                                  f=f'{PAGE_NO[0]:02d}')
    PAGE_NO[0] += 1
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="axis"></div>\n    {head(first)}\n    {m}\n'
            f'    <main class="body{"" if first else " c2"}">\n{inner}\n    </main>\n{FOOT}\n  </div>')


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
        [page(body(a, b), i == 0) for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

# ── blank stationery
PAGE_NO[0] = 1
(ROOT / 'letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead',
        [page('', True, marg=MARG_BLANK)]), encoding='utf-8')
print('identity built')
