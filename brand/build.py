#!/usr/bin/env python3
"""Sultan Hanafi Royal Schools — the institutional sheet.

    python3 brand/build.py

One identity. The reasoning is docs/institutional-identity.md; this file is
that document made executable, and every number below cites the section it
comes from.

Nothing is fetched and nothing is read from /tmp. Faces and crest come from
assets/, the letter's prose from letter-registrar-activation.src.html.
"""
import base64, math, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'brand'

b64 = lambda rel: base64.b64encode((ROOT / rel).read_bytes()).decode('ascii')

# ---------------------------------------------------------------------------
# §II  THE QUARTER — the structural signature
#
# ISO 216 is built on root two so that halving a sheet preserves its shape.
# On A4 that arithmetic is exact and unusually beautiful:
#
#     297 / √2 = 210.0      the sheet's height divided by root two
#                           is the sheet's own width
#     210 / √2 = 148.492
#
# So a vertical rule at W/√2, descending from the top edge to depth H/√2,
# encloses an upper-left rectangle of 148.5 x 210 — an A5 sheet standing in
# the corner of the A4 — and that rule's LENGTH equals the sheet's WIDTH.
#
# One line. Its position and its length are both dictated by the paper. It
# holds on every ISO size (on A5 the rule sits at 105mm and runs 148.5mm),
# and anyone with a ruler can verify it. That is the difference between a
# signature and an ornament: this one can be checked.
#
# The crest is quartered; so is the sheet. The vertical Quarter rule and the
# horizontal record rule are the two strokes of that quartering, and they
# are the only two rules on the page.
# ---------------------------------------------------------------------------
W, H = 210.0, 297.0                      # A4, mm
SQRT2 = math.sqrt(2)
QUARTER_X = W / SQRT2                    # 148.492 — the rule's position
QUARTER_Y = H / SQRT2                    # 210.000 — the rule's depth, = W
NINTH = W / 9                            # 23.333 — the margin module (§III)

MAST_T = NINTH / 3                       # 7.778 — the lock-up's head clearance
HEAD_Y = 2 * NINTH                       # 46.667 — where the head rule crosses
BODY_L = NINTH                           # 23.333
BODY_R = QUARTER_X - NINTH / 2           # 136.825
BODY_T = HEAD_Y + NINTH                  # 70.000 — one ninth below the head rule
RECORD_Y = QUARTER_Y + NINTH             # 233.333 — one ninth below the terminus
BODY_B = RECORD_Y - NINTH / 2            # 221.667
FIELD_R = W - NINTH / 2                  # 198.333 — right field's outer edge

# §V  Production — foil will not hold a hairline. A brass die needs 0.2–0.3mm
# of line and 7pt of type; below that the foil breaks off the shoulder. Every
# gold element on this sheet is therefore >= 0.3mm and >= 7pt, which is why
# there is no guilloche and no microtext: they could not have been foiled,
# and an ornament that cannot be made is a picture of an ornament.
FOIL_RULE = 0.3                          # mm — the minimum a die will hold
FOIL_MIN_PT = 7.0

# §IV  Colour. The palette is coffee, gold, ivory, cream — fixed. Brown and
# gold are neighbours on the wheel, so they are separated by LUMINANCE rather
# than by hue: the coffee is taken down to near-espresso and the gold kept
# light, which is also how foil behaves against a dark ground in daylight.
COFFEE_900 = '#1C1409'
COFFEE_800 = '#2A1F12'
COFFEE_700 = '#3B2C19'
COFFEE_600 = '#4E3B22'
INK = '#241A0E'
GOLD = '#B08D45'        # foil: the rules, which are struck, not read
GOLD_INK = '#856327'    # printed gold: the labels, which are read
GOLD_LIGHT = '#E3C88A'
IVORY = '#FCF9F2'
CREAM = '#F1E7D4'
FOIL = ('linear-gradient(172deg,#F7EBCD 0%,#E3C88A 21%,#C2A05A 43%,'
        '#9A7734 66%,#D9BC7E 84%,#F3E6C4 100%)')

# §VI  Two faces, each with a reason, and no third.
#
#   EB Garamond — a revival of the 1592 Egenolff–Berner specimen, which shows
#   Garamont's roman beside Granjon's italic. It is the lineage of the
#   scholarly press. Variable, 400–800, so weight is chosen optically rather
#   than picked from a menu.
#
#   Amiri — Khaled Hosny's revival of the Bulaq (al-Matba'a al-Amiriyya)
#   naskh of 1905, the face of the 1924 Cairo Qur'an certified by al-Azhar.
#   For a house that keeps a Qur'an College this is provenance, not styling.
FACES = [
    ('EB Garamond', 'normal', '400 800', 'eb-garamond-latin-variable-normal.woff2'),
    ('EB Garamond', 'italic', '400 800', 'eb-garamond-latin-variable-italic.woff2'),
    ('Amiri', 'normal', '400', 'amiri-arabic-400-normal.woff2'),
]
FONTS = "".join(
    "@font-face{font-family:'%s';font-style:%s;font-weight:%s;font-display:block;"
    "src:url(data:font/woff2;base64,%s) format('woff2');}"
    % (fam, style, weight, b64('assets/fonts/' + f))
    for fam, style, weight, f in FACES)

CREST = b64('assets/images/brand-mark.png')

AR = 'مدارس السلطان حنفي الملكية'        # §Rule 0 — plural, with the article
# The roll of the house, on two placed lines. Like the wordmark, the break
# is chosen rather than left to the box.
INST = ('<i>Nursery &amp; Primary &middot; Royal College &middot; School of Islamic '
        '&amp; Arabic Studies</i>'
        '<i>Qur&rsquo;an College &middot; Online &amp; Distance Learning School</i>')

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#0E0A05;display:flex;flex-direction:column;align-items:center;gap:9mm;padding:9mm 0}}
.page{{position:relative;width:{W}mm;height:{H}mm;overflow:hidden;background:{IVORY};
 color:{INK};font-family:'EB Garamond',Garamond,serif;font-variant-numeric:oldstyle-nums}}

/* §IV — paper is never one flat value; it lightens where the light falls.
   No texture image: a gradient is enough, and it costs no ink. */
.ground{{position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(128% 84% at 62% 4%,#FFFDF9 0%,{IVORY} 46%,#F7F1E5 100%)}}

/* The crest, held at 3.5% as a watermark. It is the only thing on the sheet
   that is not either type or one of the two rules. */
.wmk{{position:absolute;left:{QUARTER_X / 2}mm;top:{(RECORD_Y + HEAD_Y) / 2}mm;
 width:96mm;height:96mm;transform:translate(-50%,-50%);opacity:.028;pointer-events:none;
 background:url(data:image/png;base64,{CREST}) center/contain no-repeat}}

/* §II — the masthead panel. Its right edge IS the Quarter, at W/root-2.
   The panel is not 62% because 62% looked right; it is 70.71% because the
   paper is root two. */
.panel{{position:absolute;left:{BODY_L}mm;top:{MAST_T}mm;width:{QUARTER_X - BODY_L}mm;
 display:flex;align-items:center;gap:{NINTH / 3}mm}}
.crest{{width:24mm;height:24mm;flex:0 0 auto;
 background:url(data:image/png;base64,{CREST}) center/contain no-repeat}}

/* §VII — the bilingual lock-up. One identity, not two languages side by
   side: the Arabic is optically sized so that the height of its alif equals
   the Latin cap height, and both sit on the same left edge. */
.lockup{{display:flex;flex-direction:column;gap:1.8mm;min-width:0}}
.wordmark{{font-weight:500;font-size:16.5pt;line-height:1.16;letter-spacing:.132em;
 text-transform:uppercase;white-space:nowrap;color:{COFFEE_900}}}
/* The break is placed, not left to the box: a wordmark that reflows at a
   different width is two different wordmarks. */
.wordmark i{{display:block;font-style:normal}}
/* §VII — sized so the alif stands exactly as tall as the Latin cap. The
   constant is not a guess; render.py measures both and fails if they part. */
.ar{{font-family:'Amiri',serif;font-size:13.6pt;line-height:1;color:{COFFEE_700};
 direction:rtl;text-align:left;white-space:nowrap}}

/* §II — the Quarter itself. 0.3mm because that is the least a brass die
   will hold, and solid for its whole length because foil is binary: a die
   either strikes or it does not, so a graduated fade is a thing that can be
   drawn and never made. It ends dead at H/root-2, where it can be measured. */
.quarter{{position:absolute;left:{QUARTER_X}mm;top:0;width:{FOIL_RULE}mm;
 height:{QUARTER_Y}mm;background:{GOLD}}}
.headrule{{position:absolute;left:0;top:{HEAD_Y}mm;width:{QUARTER_X + FOIL_RULE}mm;
 height:{FOIL_RULE}mm;background:{GOLD}}}

/* §III — right of the Quarter the document identifies itself, and nothing
   else is ever set there. Place of issue at the head, sheet number at the
   foot. That is the whole information architecture of the sheet. */
.issue{{position:absolute;left:{QUARTER_X + NINTH / 3}mm;top:{HEAD_Y + NINTH / 3}mm;
 width:{FIELD_R - QUARTER_X - NINTH / 3}mm;
 font-size:6.4pt;line-height:2.1;letter-spacing:.11em;text-transform:uppercase;
 white-space:nowrap;color:{COFFEE_600}}}
.issue b{{display:block;font-weight:600;color:{COFFEE_800}}}
.folio{{position:absolute;left:{QUARTER_X + NINTH / 3}mm;top:{RECORD_Y}mm;
 font-size:7pt;letter-spacing:.14em;text-transform:uppercase;color:{COFFEE_600}}}

/* §III — the text block. Left of the Quarter, always. */
.body{{position:absolute;left:{BODY_L}mm;top:{BODY_T}mm;width:{BODY_R - BODY_L}mm;
 height:{BODY_B - BODY_T}mm;font-size:10.5pt;line-height:1.62;text-align:justify;
 hyphens:auto;overflow:hidden}}
.body p{{margin-bottom:{NINTH / 5}mm}}
.body strong{{font-weight:600}}
.opening::first-letter{{initial-letter:2;font-weight:600;color:{COFFEE_700};margin-right:2mm}}

.ref-line{{display:flex;justify-content:space-between;font-size:8.5pt;letter-spacing:.02em;
 color:{COFFEE_600};margin-bottom:{NINTH / 3}mm}}
.addressee{{margin-bottom:{NINTH / 3}mm;line-height:1.42}}
.subject{{font-size:10.5pt;font-weight:600;letter-spacing:.09em;text-transform:uppercase;
 line-height:1.44;margin-bottom:{NINTH / 4}mm;color:{COFFEE_800}}}
.lead-in{{font-size:9pt;font-weight:600;letter-spacing:.16em;text-transform:uppercase;
 color:{COFFEE_700};margin:{NINTH / 3}mm 0 {NINTH / 6}mm!important;text-align:left!important}}
.fill{{font-weight:600;color:{COFFEE_700};border-bottom:{FOIL_RULE}mm solid {GOLD}}}
.signoff{{margin-top:{NINTH / 3}mm}}
.sig-space{{height:15mm}}
.sig-rule{{width:58mm;height:{FOIL_RULE}mm;background:{GOLD};margin-bottom:1.8mm}}
.sig-name{{font-weight:600;line-height:1.4}}
.sig-title{{font-size:9pt;color:{COFFEE_600}}}

/* §III — the record. On ivory, under one gold rule: an institution states
   where it is found and how its documents are checked. No band, because a
   second mass of colour would argue with the masthead, and because the
   record's authority is in its precision, not its weight. */
.record{{position:absolute;left:{BODY_L}mm;top:{RECORD_Y}mm;width:{QUARTER_X - BODY_L}mm}}
.record-rule{{height:{FOIL_RULE}mm;background:{GOLD};margin-bottom:{NINTH / 4}mm}}
.motto{{font-style:italic;font-size:11pt;line-height:1.3;color:{COFFEE_700};
 margin-bottom:{NINTH / 4}mm}}
.contact{{display:flex;gap:{NINTH / 3}mm;font-size:8pt;line-height:1.5;color:{COFFEE_600}}}
.contact>div{{flex:1}}
.contact .l{{display:block;font-size:7pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD_INK};margin-bottom:.6mm}}
.seal{{margin-top:{NINTH / 4}mm;font-size:6.8pt;line-height:1.7;letter-spacing:.13em;
 text-transform:uppercase;color:{COFFEE_600}}}
.seal i{{display:block;font-style:normal;white-space:nowrap}}
/* Under the rule, and never across the Quarter: the roll of the house to the
   left, the place of issue to the right, one band of small caps divided by
   the signature. */
.inst{{position:absolute;left:{BODY_L}mm;top:{HEAD_Y + NINTH / 3}mm;
 width:{BODY_R - BODY_L}mm;font-size:6.8pt;line-height:1.72;letter-spacing:.1em;
 text-transform:uppercase;color:{COFFEE_600}}}
.inst i{{display:block;font-style:normal;white-space:nowrap}}

/* §Rule 5 — a continuation sheet keeps the Quarter and drops the panel.
   The signature is what identifies the sheet; repeating the full masthead
   is what a template does. */
.cont{{position:absolute;left:{BODY_L}mm;top:{NINTH}mm;width:{BODY_R - BODY_L}mm;
 display:flex;align-items:baseline;justify-content:space-between;
 font-size:8pt;letter-spacing:.18em;text-transform:uppercase;color:{COFFEE_600}}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

MAST = f'''    <header class="panel">
      <div class="crest"></div>
      <div class="lockup">
        <div class="wordmark"><i>Sultan Hanafi</i><i>Royal Schools</i></div>
        <div class="ar">{AR}</div>
      </div>
    </header>
    <div class="inst">{INST}</div>
    <div class="issue"><b>Ikorodu</b>Lagos State<b>Federal Republic of Nigeria</b></div>'''

RECORD = f'''    <footer class="record">
      <div class="record-rule"></div>
      <p class="motto">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>
      <div class="contact">
        <div><span class="l">Campus</span>Ikorodu, Lagos State</div>
        <div><span class="l">Telephone</span>+234 807 374 7650<br />+234 807 058 6860</div>
        <div><span class="l">Correspondence</span>info@shroyalschools.com</div>
        <div><span class="l">Online</span>shroyalschools.com</div>
      </div>
      <p class="seal"><i>Established July 2016 &middot; Governed by a Board of Governors</i>
        <i>Verifiable at shroyalschools.com/verify</i></p>
    </footer>'''


def page(inner, first, n, of, office='Office of the ICT'):
    folio = (f'    <div class="folio">Sheet {n} of {of}</div>\n' if of > 1 else '')
    head = MAST if first else (
        f'    <div class="cont"><span>Sultan Hanafi Royal Schools</span>'
        f'<span>{office}</span></div>')
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="ground"></div><div class="wmk"></div>\n'
            f'    <div class="quarter"></div><div class="headrule"></div>\n{head}\n{inner}\n{RECORD}\n'
            f'{folio}  </div>')


def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>'
            + title + '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n'
            '<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages)
            + '\n</body>\n</html>\n')


def build():
    src = (OUT / 'letter-registrar-activation.src.html').read_text(encoding='utf-8')
    src = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    sheets = [s.strip() for s in src.split('PAGE-BREAK') if s.strip()]
    body = lambda s: ('    <main class="body">\n'
                      + "\n".join('      ' + l for l in s.split('\n')) + '\n    </main>')
    n = len(sheets)
    (OUT / 'letter-registrar-activation.html').write_text(
        doc('Sultan Hanafi Royal Schools — Letter',
            [page(body(s), i == 0, i + 1, n) for i, s in enumerate(sheets)]), encoding='utf-8')

    blank = ('    <main class="body">\n      <div class="ref-line"><span>Ref</span>'
             '<span>Date</span></div>\n    </main>')
    (OUT / 'letterhead.html').write_text(
        doc('Sultan Hanafi Royal Schools — Letterhead', [page(blank, True, 1, 1)]),
        encoding='utf-8')
    print('built: letter (%d sheets) + blank stationery' % n)
    print('  Quarter at %.3fmm, depth %.3fmm (= sheet width %.1fmm)' % (QUARTER_X, QUARTER_Y, W))
    return n


if __name__ == '__main__':
    build()
