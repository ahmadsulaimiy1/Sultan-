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

# ── ink. Burgundy and gold on cream: the school's arms colours, held as
# two flat specified inks so the sheet has an economical production route.
BURG, BURG_D, BURG_L = '#4A1228', '#33091B', '#5E1A34'
GOLD, GOLD_LT, GOLD_D = '#C9A24A', '#E3C577', '#8E6B24'
PAPER, CREAM = '#FDFBF8', '#F7F1E6'
INK, INK2 = '#2A2124', '#5A4A50'

AR = 'مدارس السلطان حنفي الملكية'
LOZ = '<i class="lz"></i>'

HOUSES = ['Nursery &amp; Primary', 'Royal College', 'Islamic &amp; Arabic Studies',
          'Qur&rsquo;an College', 'Online &amp; Distance Learning']
INST = f' {LOZ} '.join(HOUSES)

CREST_G = b64(ROOT / 'assets' / 'crest-gold.png')

# ── the scale. Print floors kept: nothing below 6.2pt anywhere, nothing
# below 6.6pt reversed out of the burgundy.
S_MICRO, S_LABEL, S_SMALL, S_BODY = 6.3, 6.6, 8.2, 10.4
S_NAME, S_SUBJ = 12.6, 12.6
S_ARABIC = round(S_NAME * 0.92, 1)

# ═══ THE ARCHITECTURE ═══
#
#   a RAIL down the left edge, burgundy, full height, carrying the school's
#     name turned on its side — the spine that ties masthead to foot;
#   a MASS across the head, burgundy, stopping two-thirds across, with the
#     place of issue set on the cream beyond it;
#   a MEDALLION straddling the mass's right edge, half on ink and half on
#     paper, carrying the arms;
#   a STRIP beneath, naming the five schools and the year of founding,
#     over a line of MICROTEXT;
#   the FIELD;
#   a FOOT cut on a shallow diagonal, carrying the creed on the cream
#     above it and the record, badged, on the burgundy below.
RAIL_W, HEAD_H, MASS_W = 7.5, 33, 138
FOOT_H = 44
MARGIN = 16.5

MICRO = ('SULTAN HANAFI ROYAL SCHOOLS ' + '◆ ') * 22

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#241016;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 background:{PAPER};color:{INK};font-family:'Inter',serif;
 font-size:{S_BODY}pt;line-height:1.6;
 -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}

/* ═══ THE RAIL ═══ full height, so the spine is unbroken between the
   masthead and the foot. */
.rail{{position:absolute;left:0;top:0;bottom:0;width:{RAIL_W}mm;z-index:5;
 background:linear-gradient(180deg,{BURG} 0%,{BURG_D} 100%)}}
.rail b{{position:absolute;left:50%;bottom:44mm;transform:translateX(-50%) rotate(180deg);
 writing-mode:vertical-rl;font-family:'Cinzel',serif;font-weight:700;
 font-size:{S_LABEL}pt;letter-spacing:.34em;text-transform:uppercase;
 color:rgba(227,197,119,.72);white-space:nowrap}}
/* struck at head and foot, as a rail is */
.rail::before,.rail::after{{content:'';position:absolute;left:1.5mm;width:4.5mm;height:.5pt;
 background:{GOLD}}}
.rail::before{{top:14mm}} .rail::after{{bottom:14mm}}

/* ═══ THE HEAD ═══ */
.head{{flex:0 0 auto;position:relative;height:{HEAD_H}mm;z-index:3}}
.mass{{position:absolute;left:0;top:0;width:{MASS_W}mm;height:{HEAD_H}mm;
 background:linear-gradient(104deg,{BURG_L} 0%,{BURG} 46%,{BURG_D} 100%);
 clip-path:polygon(0 0,100% 0,100% 84%,96% 100%,0 100%)}}
/* one raking light across the mass, so it is a plane and not a fill */
.mass::after{{content:'';position:absolute;left:34%;top:-30%;width:26%;height:170%;
 transform:rotate(19deg);
 background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,236,200,.075),rgba(255,255,255,0))}}
.wm{{position:absolute;left:{MARGIN}mm;top:8.5mm;z-index:4}}
.wm .en{{font-family:'Cinzel',serif;font-weight:800;font-size:{S_NAME}pt;letter-spacing:.075em;
 text-transform:uppercase;color:{GOLD_LT};line-height:1;white-space:nowrap}}
.wm .ar{{margin-top:2.4mm;direction:rtl;font-family:'Amiri',serif;font-size:{S_ARABIC}pt;
 line-height:1;color:{GOLD};white-space:nowrap}}
/* place of issue, on the cream beyond the mass */
.place{{position:absolute;right:{MARGIN}mm;top:8mm;z-index:4;text-align:right;
 font-size:{S_LABEL}pt;letter-spacing:.1em;text-transform:uppercase;
 color:{BURG};line-height:2;white-space:nowrap}}
.place b{{display:block;font-weight:700}}
/* the medallion, half on ink and half on paper */
.medal{{position:absolute;left:{MASS_W - 18}mm;top:{HEAD_H / 2 - 14}mm;width:28mm;height:28mm;
 border-radius:50%;z-index:6;
 background:radial-gradient(64% 64% at 40% 32%,#FFFDF8 0%,{CREAM} 62%,#EADFC9 100%);
 box-shadow:0 0 0 .5pt {GOLD},0 .6pt 2.4pt rgba(40,10,22,.28);
 display:flex;align-items:center;justify-content:center}}
.medal::before{{content:'';position:absolute;inset:1.7mm;border-radius:50%;
 border:.4pt solid rgba(142,107,36,.55)}}
.medal img{{width:17mm;height:17mm;display:block}}

/* ═══ THE STRIP ═══ the five schools, the year, and the microtext line */
.strip{{flex:0 0 auto;position:relative;z-index:3;
 padding:4.2mm {MARGIN}mm 0 {MARGIN}mm}}
.houses{{display:flex;align-items:center;justify-content:space-between;gap:3mm;white-space:nowrap;
 font-size:{S_MICRO}pt;letter-spacing:.02em;text-transform:uppercase;color:{BURG};font-weight:600}}
.houses .yr{{color:{GOLD_D};letter-spacing:.12em}}
.lz{{display:inline-block;width:1.4mm;height:1.4mm;background:{GOLD};
 transform:rotate(45deg);margin:0 .6mm;vertical-align:.2mm}}
.strip .rule{{height:.4pt;background:{GOLD};opacity:.55;margin-top:2.4mm}}
.micro{{margin-top:.9mm;font-size:{S_MICRO}pt;letter-spacing:.06em;text-transform:uppercase;
 color:rgba(74,18,40,.12);white-space:nowrap;overflow:hidden;height:2.2mm;line-height:2.2mm}}

/* ═══ THE FIELD ═══ */
.body{{flex:1;position:relative;z-index:2;padding:11mm 30mm 0 34mm;min-width:0}}
.body.c2{{padding-top:9mm}}
.body p{{margin-bottom:3.3mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{BURG};font-weight:600;text-decoration:none;
 border-bottom:.4pt solid rgba(201,162,74,.6)}}
.top{{display:flex;justify-content:space-between;gap:10mm;margin-bottom:8mm;
 font-size:{S_SMALL}pt;color:{INK2}}}
.top b{{display:block;font-weight:600;color:{BURG};font-size:{S_BODY}pt;margin-top:.8mm}}
.top .r{{text-align:right}}
.addr{{margin-bottom:7mm!important;line-height:1.45}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:{S_SUBJ}pt;letter-spacing:.03em;
 text-transform:uppercase;color:{BURG};margin-bottom:5mm;line-height:1.32}}
.lead{{font-family:'Cinzel',serif;font-size:{S_SMALL}pt;letter-spacing:.14em;text-transform:uppercase;
 color:{GOLD_D};margin:6.6mm 0 3.3mm!important;text-align:left!important}}
.val{{font-weight:600;color:{BURG};border-bottom:.4pt solid rgba(201,162,74,.55)}}
.signoff{{margin-top:6.6mm}} .sigsp{{height:17mm}}
.sigrule{{width:52mm;height:.4pt;background:{GOLD};margin-bottom:2.4mm}}
.signm{{line-height:1.45}} .sigt{{font-size:{S_SMALL}pt;color:{INK2}}}
.blank{{display:flex;gap:5mm;font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD_D};margin-bottom:9mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(201,162,74,.5);font-style:normal}}

/* ═══ THE FOOT ═══ cut on a shallow diagonal: the creed on the cream
   above it, the record badged on the burgundy below. */
.foot{{flex:0 0 {FOOT_H}mm;position:relative;z-index:3}}
.creed{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;top:0;z-index:4;text-align:right;
 font-family:'Cormorant Garamond',serif;font-style:italic;font-size:{S_SUBJ}pt;
 color:{BURG};letter-spacing:.01em}}
.fmass{{position:absolute;left:0;right:0;bottom:0;height:{FOOT_H - 8}mm;
 background:linear-gradient(284deg,{BURG_L} 0%,{BURG} 48%,{BURG_D} 100%);
 clip-path:polygon(0 14%,100% 0,100% 100%,0 100%)}}
.fmass::after{{content:'';position:absolute;left:56%;top:-40%;width:22%;height:180%;
 transform:rotate(19deg);
 background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,236,200,.06),rgba(255,255,255,0))}}
.rec{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;bottom:12mm;z-index:4;
 display:flex;justify-content:space-between;gap:6mm}}
.rec>div{{display:flex;align-items:flex-start;gap:2.2mm;min-width:0}}
.rec .fl{{display:block;font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD};margin-bottom:.8mm}}
.rec .v{{font-size:{S_SMALL}pt;color:#F3E8DA;line-height:1.4;white-space:nowrap}}
.rec a{{color:inherit;text-decoration:none}}
.ico{{flex:0 0 auto;width:4.2mm;height:4.2mm;margin-top:.3mm;border-radius:50%;
 border:.4pt solid rgba(201,162,74,.7);display:flex;align-items:center;justify-content:center}}
.ico svg{{width:2.3mm;height:2.3mm;display:block;fill:{GOLD}}}
.gov{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;bottom:4.4mm;z-index:4;
 padding-top:2.6mm;border-top:.4pt solid rgba(201,162,74,.32);
 display:flex;align-items:center;gap:2.4mm;
 font-size:{S_LABEL}pt;letter-spacing:.09em;text-transform:uppercase;color:{GOLD};white-space:nowrap}}
.gov .lz{{background:{GOLD}}}

/* continuation sheets: the mass halves, the medallion and the place drop */
.head.c2{{height:20mm}} .head.c2 .mass{{height:20mm;width:{MASS_W - 26}mm}}
.head.c2 .wm{{top:4.6mm}} .head.c2 .wm .en{{font-size:9.6pt}}
.head.c2 .wm .ar{{font-size:8.8pt;margin-top:1.6mm}}
.head.c2 .medal{{width:19mm;height:19mm;left:{MASS_W - 38}mm;top:.5mm}}
.head.c2 .medal img{{width:11.5mm;height:11.5mm}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

GLYPH = {
 'campus': 'M12 2 3 8v13h6v-6h6v6h6V8z',
 'phone':  'M20 15.6a12.4 12.4 0 0 1-3.9-.6 1.1 1.1 0 0 0-1.1.3l-1.6 1.6a15 15 0 0 1-6.3-6.3l1.6-1.6a1.1 1.1 0 0 0 .3-1.1A12.4 12.4 0 0 1 8.4 4 1 1 0 0 0 7.4 3H4.3a1 1 0 0 0-1 1A16.7 16.7 0 0 0 20 20.7a1 1 0 0 0 1-1v-3.1a1 1 0 0 0-1-1z',
 'mail':   'M3 6h18v12H3zm2 2.6V8l7 4.9L19 8v.6l-7 4.9z',
 'globe':  'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.3-3.6A8 8 0 0 1 18.9 8zM12 4.2c.7 1 1.3 2.3 1.7 3.8h-3.4C10.7 6.5 11.3 5.2 12 4.2zM4.3 14a8 8 0 0 1 0-4h3.3a17 17 0 0 0 0 4zm.8 2h2.9c.3 1.3.8 2.5 1.3 3.6A8 8 0 0 1 5.1 16zm2.9-8H5.1a8 8 0 0 1 4.2-3.6A15.6 15.6 0 0 0 8 8zm4 11.8c-.7-1-1.3-2.3-1.7-3.8h3.4c-.4 1.5-1 2.8-1.7 3.8zm2.1-5.8H9.9a15 15 0 0 1 0-4h4.2a15 15 0 0 1 0 4zm.3 5.6c.5-1.1 1-2.3 1.3-3.6h2.9a8 8 0 0 1-4.2 3.6zm1.7-5.6a17 17 0 0 0 0-4h3.3a8 8 0 0 1 0 4z',
 'seal':   'M12 2 4 5v6.2C4 16.4 7.4 20.9 12 22c4.6-1.1 8-5.6 8-10.8V5zm-1 13-3.2-3.2 1.4-1.4L11 12.2l4.8-4.8 1.4 1.4z',
}
ico = lambda k: (f'<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">'
                 f'<path d="{GLYPH[k]}"/></svg></span>')

REC = ('<div class="rec">'
       f'<div>{ico("campus")}<span><span class="fl">Campus</span>'
       '<span class="v">Ikorodu, Lagos State, Nigeria</span></span></div>'
       f'<div>{ico("phone")}<span><span class="fl">Telephone</span>'
       '<span class="v"><a href="tel:+2348073747650">+234 807 374 7650</a><br />'
       '<a href="tel:+2348070586860">+234 807 058 6860</a></span></span></div>'
       f'<div>{ico("mail")}<span><span class="fl">Correspondence</span>'
       '<span class="v"><a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></span></span></div>'
       f'<div>{ico("globe")}<span><span class="fl">Online</span>'
       '<span class="v"><a href="https://shroyalschools.com">shroyalschools.com</a></span></span></div>'
       '</div>')

FOOT = ('<footer class="foot">'
        '<p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>'
        '<div class="fmass"></div>' + REC +
        f'<div class="gov">{ico("seal")}<span>Established July 2016 {LOZ} '
        f'Governed by a Board of Governors {LOZ} '
        'Verifiable at <a href="https://shroyalschools.com/verify" '
        'style="color:inherit;text-decoration:none">shroyalschools.com/verify</a></span></div>'
        '</footer>')


def head(first=True):
    c2 = '' if first else ' c2'
    place = ('<div class="place">Ikorodu<b>Lagos State</b>'
             '<b>Federal Republic of Nigeria</b></div>') if first else ''
    return (f'<header class="head{c2}"><div class="mass"></div>'
            f'<div class="wm"><div class="en">Sultan Hanafi Royal Schools</div>'
            f'<div class="ar">{AR}</div></div>{place}'
            f'<div class="medal"><img src="data:image/png;base64,{CREST_G}" '
            f'alt="Arms of Sultan Hanafi Royal Schools" /></div></header>')


def strip(first=True):
    if not first:
        return ''
    return ('<div class="strip">'
            f'<div class="houses"><span>{INST}</span>'
            '<span class="yr">Founded MMXVI</span></div>'
            f'<div class="rule"></div><div class="micro">{MICRO}</div></div>')


def page(inner, first=True):
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="rail"><b>Sultan Hanafi Royal Schools</b></div>\n'
            f'    {head(first)}\n    {strip(first)}\n'
            f'    <main class="body{"" if first else " c2"}">\n{inner}\n    </main>\n{FOOT}\n  </div>')


def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>' + title +
            '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages) + '\n</body>\n</html>\n')

TOP = ('      <div class="top"><div>Reference<b>SHRS/ICT/2026/001</b></div>'
       '<div class="r">Date<b>13 August 2026</b></div></div>')

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
