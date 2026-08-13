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
S_ARABIC = round(S_BODY * 1.15, 1)

# ── the grid. Two left edges, two right. Every vertical dimension is a
# whole multiple of the 3.5mm unit.
# The masthead is allowed a wider measure than the text — the names must
# be set at a readable size, and 27 Latin characters will not fit half of
# 132mm. Both are centred on the same axis, so the sheet still has one
# vertical centre line and the arms stand on it.
MARGIN, MEASURE, HEAD_MEASURE = 39, 132, 176
HEAD_PAD = (210 - HEAD_MEASURE) // 2

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#4A423A;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 background:{PAPER};color:{INK};font-family:'Inter',serif;
 font-size:{S_BODY}pt;line-height:1.62;
 -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}

/* ═══ THE HEAD ═══ arms on the axis, the two names meeting on it, one
   hairline, and the five schools. Nothing else, and no ink but type. */
.head{{flex:0 0 auto;padding:22mm {HEAD_PAD}mm 0;text-align:center}}
/* the arms are a heraldic device: flat, unshadowed, unringed */
.arms{{width:30mm;height:30mm;display:block;margin:0 auto 7mm}}

/* both halves take exactly half the masthead measure, so the Axis falls on
   the sheet's own centre line and neither language is given more room */
.lock{{width:{HEAD_MEASURE}mm;margin:0 auto;display:flex;align-items:stretch}}
.lock .en,.lock .ar{{flex:1 1 0;min-width:0;
 display:flex;flex-direction:column;justify-content:center;color:{COFFEE}}}
.lock b{{display:block;font-weight:inherit}}
.lock .en{{padding-right:5mm;text-align:right;
 font-family:'Cinzel',serif;font-weight:800;font-size:{S_BODY}pt;letter-spacing:.085em;
 text-transform:uppercase;line-height:1.1;white-space:nowrap}}
.lock .ar{{padding-left:5mm;text-align:left;direction:rtl;
 font-family:'Amiri',serif;font-size:{S_ARABIC}pt;line-height:1.1;white-space:nowrap}}
/* THE AXIS. One vertical gold member, standing a little proud of the
   names above and below, so it reads as something the names hang from
   rather than a rule drawn between them. */
.axis{{position:relative;flex:0 0 auto;width:.7pt;background:{GOLD_P};margin:-4.5mm 0}}

.hrule{{width:{HEAD_MEASURE}mm;height:.4pt;background:{GOLD_P};margin:7mm auto 0;opacity:.75}}
.houses{{margin-top:3.5mm;font-size:{S_LABEL}pt;letter-spacing:.11em;text-transform:uppercase;
 color:{GOLD_P};white-space:nowrap}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.4mm;
 width:1.9mm;height:1.9mm;vertical-align:.1mm;margin:0 .55mm}}
.q i{{background:{GOLD_P};display:block}}

/* ═══ THE FIELD ═══ 132mm of measure, 71 characters, and nothing in it
   that the writer did not put there. */
.body{{flex:1;padding:14mm {MARGIN}mm 0;min-width:0}}
.body p{{margin-bottom:3.5mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;text-decoration:none;
 border-bottom:.4pt solid rgba(156,122,60,.55)}}
.ref{{float:right;width:52mm;text-align:right;margin:0 0 7mm 10mm}}
.ref dt{{font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;color:{GOLD_P}}}
.ref dd{{font-size:{S_SMALL}pt;color:{INK};margin-bottom:2.4mm;line-height:1.35}}
.addr{{margin-bottom:7mm!important;line-height:1.45}}
.subj{{clear:right;font-family:'Cinzel',serif;font-weight:700;font-size:{S_SUBJ}pt;letter-spacing:.03em;
 text-transform:uppercase;color:{COFFEE};margin-bottom:5.25mm;line-height:1.32}}
.lead{{font-family:'Cinzel',serif;font-size:{S_SMALL}pt;letter-spacing:.14em;text-transform:uppercase;
 color:{GOLD_P};margin:7mm 0 3.5mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.4pt solid rgba(156,122,60,.5)}}
.signoff{{margin-top:7mm}} .sigsp{{height:17.5mm}}
.sigrule{{width:56mm;height:.4pt;background:{GOLD_P};margin-bottom:2.4mm}}
.signm{{line-height:1.45}} .sigt{{font-size:{S_SMALL}pt;color:{INK2}}}
.blank{{display:flex;gap:5mm;font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD_P};margin-bottom:10.5mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(156,122,60,.5);font-style:normal}}

/* ═══ THE FOOT ═══ the creed on the paper, the record in the one band of
   ink on the sheet. 16mm of 297 is 5.4% coverage; everything else on the
   page is type and two hairlines. */
.foot{{flex:0 0 34mm;position:relative}}
.creed{{position:absolute;left:0;right:0;bottom:22mm}}
.creed{{text-align:center;font-family:'Cormorant Garamond',serif;font-style:italic;
 font-size:{S_SMALL}pt;color:{INK2};padding:0 {MARGIN}mm}}
.band{{position:absolute;left:0;right:0;bottom:0;height:16mm;background:{COFFEE};
 box-shadow:inset 0 .5pt 0 {GOLD_R};
 display:flex;align-items:center;justify-content:center;gap:4mm;
 font-size:{S_SMALL}pt;color:{PAPER_R};white-space:nowrap}}
.band a{{color:inherit;text-decoration:none}}
.band .q i{{background:{GOLD_R}}}

/* continuation sheets: the arms reduce and the rule and houses drop away,
   which is the whole point of having one device — it survives its own
   subtraction */
.head.c2{{padding-top:16mm}} .head.c2 .arms{{width:18mm;height:18mm;margin-bottom:4.5mm}}
.body.c2{{padding-top:10.5mm}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

REF = ('      <div class="ref"><dt>Reference</dt><dd>SHRS/ICT/2026/001</dd>'
       '<dt>Issued</dt><dd>13 August 2026</dd></div>')

BAND = ('<div class="band"><span>Ikorodu, Lagos State, Nigeria</span>' + QUAD +
        '<a href="tel:+2348073747650">+234 807 374 7650</a>' + QUAD +
        '<a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a>' + QUAD +
        '<a href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></div>')

FOOT = ('<footer class="foot">'
        '<p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>'
        + BAND + '</footer>')


def head(first=True):
    c2 = '' if first else ' c2'
    tail = (f'<div class="hrule"></div><div class="houses">{INST}</div>') if first else ''
    return (f'<header class="head{c2}">'
            f'<img class="arms" src="data:image/png;base64,{CREST}" '
            f'alt="Arms of Sultan Hanafi Royal Schools" />'
            f'<div class="lock"><div class="en"><b>Sultan Hanafi Royal Schools</b></div>'
            f'<div class="axis"></div><div class="ar"><b>{AR}</b></div></div>'
            f'{tail}</header>')


def page(inner, first=True):
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    {head(first)}\n'
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
CUTS = [(0, 8), (8, 15), (15, 23), (23, 26)]
(ROOT / 'letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter',
        [page((REF + '\n' if i == 0 else '') + body(a, b), i == 0)
         for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

# ── blank stationery
BLANK = '      <div class="blank"><span>Ref</span><i></i><span>Date</span><i></i></div>'
(ROOT / 'letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead', [page(BLANK, True)]), encoding='utf-8')
print('identity built')
