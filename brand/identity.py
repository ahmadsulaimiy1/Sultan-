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
import argparse, base64, json, pathlib

ap = argparse.ArgumentParser()
ap.add_argument('--staff-id')
ap.add_argument('--activation-url')
ARGS = ap.parse_args()

b64 = lambda p: base64.b64encode(pathlib.Path(p).read_bytes()).decode()
A = json.loads(pathlib.Path('/tmp/assets.json').read_text())
FONTS, CREST = A['fonts'], A['crest']
RAG, MT = b64('/tmp/rag.svg'), b64('/tmp/mt.svg')

# ── palette. Fixed. Coffee dominant, gold as foil, ivory as the field.
COFFEE, COFFEE2, COCOA = '#2B1A0E', '#1C1006', '#241509'
GOLD, ANTIQUE = '#C6A15B', '#9C7A3C'
IVORY, CREAM, PARCH = '#FBF7EF', '#F5EEE1', '#EDE3D2'
INK, INK2 = '#241A12', '#5A4632'
FOIL = ('linear-gradient(174deg,#F4E4BC 0%,#E3CB95 24%,#C6A15B 48%,'
        '#9B7738 70%,#EEDCAE 100%)')

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

/* ═══ THE CARTOUCHE — head mass, bleeds to top and left ═══ */
.cart{{position:absolute;left:0;top:0;width:34mm;height:38mm;z-index:2;
 background:linear-gradient(158deg,{COFFEE} 0%,{COFFEE2} 62%,#150B03 100%);
 display:flex;align-items:center;justify-content:center;
 box-shadow:inset -0.4pt 0 0 rgba(198,161,91,.34),inset 0 -0.4pt 0 rgba(198,161,91,.34)}}
.cart img{{width:21mm;height:21mm;display:block}}
.cart::after{{content:'';position:absolute;right:0;bottom:0;width:5.6mm;height:5.6mm;
 border-right:.5pt solid {GOLD};border-bottom:.5pt solid {GOLD};opacity:.7}}

/* ═══ THE LOCK — one bilingual identity, not two languages ═══
   The rule is dimensioned by the longer language, so the lock cannot be
   built in English alone. */
.lock{{position:absolute;left:42mm;top:9.6mm;z-index:2}}
.lock .en{{font-family:'Cinzel',serif;font-weight:800;font-size:13.4pt;letter-spacing:.058em;
 text-transform:uppercase;white-space:nowrap;color:{COFFEE};line-height:1}}
.lock .rule{{height:.6pt;background:{GOLD};margin:2.6mm 0 2.2mm}}
.lock .ar{{font-family:'Amiri',serif;font-size:15.4pt;line-height:1;color:{ANTIQUE};direction:rtl;
 white-space:nowrap}}
.lock .seat{{margin-top:2.4mm;font-size:5.4pt;letter-spacing:.3em;text-transform:uppercase;color:{ANTIQUE}}}

/* ═══ the field between the masses ═══ */
.houses{{position:absolute;left:34mm;right:16mm;top:44.6mm;display:flex;align-items:center;gap:3.2mm;
 font-size:5.7pt;letter-spacing:.13em;text-transform:uppercase;color:{ANTIQUE};white-space:nowrap}}
.houses::before,.houses::after{{content:'';height:.4pt;background:rgba(156,122,60,.5);flex:0 0 6mm}}
.houses::after{{flex:1}}
.q{{display:inline-grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:.42mm;
 width:2.3mm;height:2.3mm;vertical-align:-.15mm}}
.q i{{background:{GOLD};display:block}}
.creed .q i{{background:{GOLD};opacity:.85}}

.body{{position:relative;z-index:1;flex:1;padding:56mm 22mm 0 34mm;font-size:9.9pt;line-height:1.72;color:{INK}}}
.body.cont{{padding-top:26mm}}
.body p{{margin-bottom:3.2mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{COFFEE};font-weight:600;border-bottom:.5pt solid rgba(156,122,60,.6);text-decoration:none}}
.body p.open::first-letter{{font-family:'Cinzel',serif;font-weight:700;font-size:21pt;line-height:.98;
 float:left;margin:1.4mm 1.9mm 0 0;color:{COFFEE}}}
.ref{{display:flex;justify-content:space-between;font-size:8.2pt;color:{INK2};margin-bottom:7mm;
 padding-bottom:2.4mm;border-bottom:.4pt solid rgba(156,122,60,.4)}}
.ref.blank{{justify-content:flex-start;gap:4mm;letter-spacing:.18em;text-transform:uppercase;font-size:7.2pt}}
.ref.blank i{{flex:1;border-bottom:.4pt solid rgba(156,122,60,.45);font-style:normal}}
.addr{{margin-bottom:6.4mm!important;line-height:1.5}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:10.2pt;letter-spacing:.052em;text-transform:uppercase;
 color:{COFFEE};margin-bottom:5mm;line-height:1.44}}
.lead{{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.16em;text-transform:uppercase;color:{ANTIQUE};
 margin:5.2mm 0 2.6mm!important;text-align:left!important}}
.val{{font-weight:600;color:{COFFEE};border-bottom:.5pt solid rgba(156,122,60,.55)}}
.signoff{{margin-top:6.4mm}} .sigsp{{height:17mm}}
.sigrule{{width:58mm;height:.5pt;background:{GOLD};margin-bottom:2.4mm}}
.signm{{line-height:1.55}} .sigt{{font-size:8.4pt;color:{INK2}}}

/* ═══ THE FOOTING — foot mass, bears the record ═══ */
.foot{{position:relative;z-index:2;margin-top:auto;height:27mm;
 background:linear-gradient(174deg,{COFFEE} 0%,{COFFEE2} 58%,#150B03 100%);
 box-shadow:inset 0 .4pt 0 rgba(198,161,91,.4);padding:4.6mm 16mm 0 34mm}}
.foot .mt{{position:absolute;left:0;right:0;bottom:1.6mm;height:2.4mm;opacity:.5;
 background:url(data:image/svg+xml;base64,{MT}) left center/100% 100% no-repeat}}
.fg{{display:flex;justify-content:space-between;gap:6mm;font-size:6.5pt;color:#EFE1C6;line-height:1.55}}
.fg>div{{flex:1}} .fg>div:last-child{{text-align:right}}
.fl{{display:block;font-size:5.2pt;letter-spacing:.26em;text-transform:uppercase;color:{GOLD};margin-bottom:.7mm}}
.fg a{{color:inherit;text-decoration:none}}
.creed{{margin-top:3.2mm;padding-top:2.2mm;border-top:.35pt solid rgba(198,161,91,.24);
 font-family:'Cormorant Garamond',serif;font-style:italic;font-size:8.6pt;color:{GOLD};letter-spacing:.02em}}

/* continuation: the cartouche halves, the lock reduces — same grammar */
.cart.c2{{width:22mm;height:22mm}} .cart.c2 img{{width:13mm;height:13mm}}
.lock.c2{{left:30mm;top:6.4mm}} .lock.c2 .en{{font-size:9pt}} .lock.c2 .ar{{font-size:10.4pt}}
.lock.c2 .rule{{margin:1.8mm 0 1.6mm}} .lock.c2 .seat{{display:none}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

def head(first=True):
    c2 = '' if first else ' c2'
    seat = ('<div class="seat">Office of the ICT</div>' if first else '')
    houses = (f'<div class="houses">{INST}</div>' if first else '')
    return (f'<div class="cart{c2}"><img src="data:image/png;base64,{CREST}" alt="Crest of Sultan Hanafi Royal Schools" /></div>'
            f'<div class="lock{c2}"><div class="en">Sultan Hanafi Royal Schools</div>'
            f'<div class="rule"></div><div class="ar">{AR}</div>{seat}</div>{houses}')

FOOT = ('<footer class="foot"><div class="mt"></div><div class="fg">'
        '<div><span class="fl">Campus</span>Ikorodu, Lagos State, Nigeria</div>'
        '<div><span class="fl">Telephone</span><a href="tel:+2348073747650">+234 807 374 7650</a></div>'
        '<div><span class="fl">Correspondence</span><a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></div>'
        '<div><span class="fl">Record</span><a href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></div>'
        '</div><p class="creed">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;'
        f'&#8195;{QUAD}&#8195;Established July 2016&#8195;{QUAD}&#8195;Governed by a Board of Governors</p></footer>')

def page(inner, first=True):
    cls = 'body' if first else 'body cont'
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="rag"></div><div class="vig"></div><div class="ghost"></div>\n'
            f'    {head(first)}\n    <main class="{cls}">\n{inner}\n    </main>\n{FOOT}\n  </div>')

def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>' + title +
            '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages) + '\n</body>\n</html>\n')

# ── the letter
blocks = pathlib.Path('/tmp/blocks.txt').read_text().split('\n@@@\n')
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
body = lambda a, b: "\n".join("      " + x for x in blocks[a:b])
CUTS = [(0, 9), (9, 12), (12, 19), (19, 26)]
pathlib.Path('brand/letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter',
        [page(body(a, b), i == 0) for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

# ── blank stationery
BLANK = '      <div class="ref blank"><span>Ref</span><i></i><span>Date</span><i></i></div>'
pathlib.Path('brand/letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead', [page(BLANK, True)]), encoding='utf-8')
print('identity built')
