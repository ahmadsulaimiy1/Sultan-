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
import argparse, base64, json, pathlib, re, subprocess
import html as html_mod

ap = argparse.ArgumentParser()
ap.add_argument('--staff-id')
ap.add_argument('--activation-url')
ap.add_argument('--signature', help='path to the signatory\'s own signature image')
ap.add_argument('--draft', action='store_true',
                help='allow a placeholder activation link, for proofing the design only')
ARGS = ap.parse_args()

# A letter went out carrying "?token=DEMO" — the placeholder used to proof
# the design — and the Registrar met "this activation link is no longer
# usable" instead of her account. The build cannot know whether a token is
# live, but it can refuse to pass off an obvious stand-in as one. Proofing
# the design is still easy; it just has to say so.
PLACEHOLDERS = ('demo', 'test', 'example', 'xxx', 'token=...', 'placeholder',
                'changeme', 'your-token', 'sample')
if ARGS.activation_url and not ARGS.draft:
    _u = ARGS.activation_url.lower()
    _hit = next((p for p in PLACEHOLDERS if p in _u), None)
    if _hit:
        ap.error(
            'the activation link looks like a placeholder (it contains %r).\n'
            '  A letter built with a placeholder cannot be activated, and the\n'
            '  reader is told the link is no longer usable.\n'
            '  Issue a real link:\n'
            '    curl -sS -X POST https://shroyalschools.com/api/portal/admin/staff \\\n'
            '      -H "x-admin-token: $PORTAL_ADMIN_TOKEN" -H "content-type: application/json" \\\n'
            "      -d '{\"action\":\"create-login\",\"staffNo\":\"<the Staff ID>\"}'\n"
            '  or pass --draft if you are only proofing the design.' % _hit)

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
QR = b64(ROOT / 'assets' / 'qr-verify.png')

# ── ink. Dark bronze and gold on cream, as the supplied design sets them.
DARK, DARK_D, DARK_L = '#2A1F16', '#1B130C', '#3C2C1E'
GOLD, GOLD_LT, GOLD_D = '#C9A24A', '#E8CE8F', '#8E6B24'
PAPER, CREAM = '#F8F4EC', '#F2ECE0'
INK, INK2 = '#2B2118', '#6A5A48'
# ── the metal. Flat gold is what made the sheet look printed rather than
# made. Real foil carries a specular band along its length, a lit edge on
# top and a shadowed edge beneath, and it is those three together — not the
# colour — that read as metal.
METAL = ('linear-gradient(100deg,#6E4E18 0%,#A87F2E 9%,#D9BC6E 22%,#F6E9BE 34%,'
         '#FFFDF2 41%,#EDD89C 49%,#C9A24A 62%,#8E6B24 78%,#C9A24A 90%,#7A5A1C 100%)')
METAL_V = ('linear-gradient(178deg,#FFFBEA 0%,#E4CB86 16%,#C9A24A 44%,'
           '#9A7628 74%,#6E4E18 100%)')
# a bevelled gold bar: lit above, shadowed below, sitting proud of the plate
BEVEL = ('inset 0 .3pt 0 rgba(255,252,236,.85),inset 0 -.3pt 0 rgba(74,52,12,.9),'
         '0 .5pt 1.4pt rgba(18,11,4,.42)')
# a bronze plate: lit lip, shadowed foot, and a shadow cast on what is under it
PLATE = ('inset 0 .4pt 0 rgba(255,238,198,.24),inset 0 -.4pt 0 rgba(0,0,0,.55),'
         '0 1pt 3.4pt rgba(16,9,3,.34)')
# glass: one raking reflection and one corner bloom, both far below notice
GLASS = ('linear-gradient(116deg,rgba(255,255,255,.115) 0%,rgba(255,255,255,.03) 24%,'
         'rgba(255,255,255,0) 47%),'
         'radial-gradient(126% 84% at 10% -14%,rgba(255,246,220,.17),rgba(255,255,255,0) 62%)')
# the eight-fold girih ground the dark plates are struck on
GIRIH = 'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczNCcgaGVpZ2h0PSczNCcgdmlld0JveD0nMCAwIDM0IDM0Jz48ZyBmaWxsPSdub25lJyBzdHJva2U9JyNDOUEyNEEnIHN0cm9rZS13aWR0aD0nLjUnIHN0cm9rZS1vcGFjaXR5PScuMDg1Jz48cGF0aCBkPSdNMTcgMCBMMjQgMTAgTDM0IDE3IEwyNCAyNCBMMTcgMzQgTDEwIDI0IEwwIDE3IEwxMCAxMCBaJy8+PHBhdGggZD0nTTAgMCBMMTAgMTAgTTM0IDAgTDI0IDEwIE0zNCAzNCBMMjQgMjQgTTAgMzQgTDEwIDI0Jy8+PHBhdGggZD0nTTE3IDUuNSBMMjEuNSAxMi41IEwyOC41IDE3IEwyMS41IDIxLjUgTDE3IDI4LjUgTDEyLjUgMjEuNSBMNS41IDE3IEwxMi41IDEyLjUgWicvPjwvZz48L3N2Zz4=)'
GOLD_BAR = METAL

AR = 'مدارس السلطان'
AR2 = 'حنفي الملكية'
CREST_G = b64(ROOT / 'assets' / 'crest-gold.png')

# ── the scale. Print floors kept from docs/letterhead-audit.md: nothing
# below 6.2pt anywhere, nothing below 6.6pt reversed out of the bronze.
S_MICRO, S_LABEL, S_SMALL, S_BODY = 6.2, 6.8, 8.2, 10.4
S_NAME, S_SUBJ = 13.4, 12.6
S_ARABIC = round(S_NAME * 0.95, 1)   # derived by the parity rule

# ═══ THE ARCHITECTURE ═══ built to the supplied design.
#
#   a bracketed BRONZE FRAME at head and foot, gold-edged and stepped;
#   a cream MASTHEAD panel carrying the arms, the bilingual lock and the
#     motto, with a bronze CONTACT PANEL cut into it at the right;
#   a left RAIL — a gold hairline with diamond markers and the domain set
#     vertically;
#   a blind-embossed CREST in the field;
#   a bronze FOOT carrying the QR, four badged columns and a medallion,
#     over a GOVERNANCE strip.
HEAD_H, FOOT_H, BOT_H = 52, 40, 13
MARGIN, RAIL_X = 14, 13
PANEL_X = 140

CSS = FONTS + f"""
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#181009;display:flex;flex-direction:column;align-items:center;gap:10mm;padding:10mm 0}}
.page{{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 background:{PAPER};color:{INK};font-family:'Inter',serif;
 font-size:{S_BODY}pt;line-height:1.62;
 -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}}
/* the geometric ground, very faint, at the left of the field */
.tile{{position:absolute;left:0;top:0;bottom:0;width:62mm;z-index:0;opacity:.5;pointer-events:none;
 background:
  repeating-linear-gradient(60deg,rgba(142,107,36,.05) 0 .3pt,transparent .3pt 5mm),
  repeating-linear-gradient(-60deg,rgba(142,107,36,.05) 0 .3pt,transparent .3pt 5mm)}}
/* the arms, blind-embossed into the field */
.emboss{{position:absolute;right:6mm;bottom:52mm;width:118mm;height:118mm;z-index:0;opacity:.055;
 pointer-events:none;
 background:url(data:image/png;base64,{CREST_G}) center/contain no-repeat}}

/* ═══ THE RAIL ═══ */
.rail{{position:absolute;left:{RAIL_X}mm;top:{HEAD_H + 12}mm;bottom:{FOOT_H + BOT_H + 12}mm;
 width:.4pt;background:rgba(142,107,36,.45);z-index:2}}
.rail::before,.rail::after{{content:'';position:absolute;left:-1mm;width:2.2mm;height:2.2mm;
 background:{METAL_V};transform:rotate(45deg);
 box-shadow:0 .3pt .7pt rgba(18,11,4,.4),inset 0 .3pt 0 rgba(255,252,236,.7)}}
.rail::before{{top:22%}} .rail::after{{bottom:22%}}
.railtx{{position:absolute;left:{RAIL_X - 5}mm;top:50%;transform:translateY(-50%) rotate(180deg);
 writing-mode:vertical-rl;z-index:2;
 font-family:'Cinzel',serif;font-weight:700;font-size:{S_MICRO}pt;letter-spacing:.42em;
 text-transform:uppercase;color:#6E4E18;white-space:nowrap}}

/* ═══ THE HEAD ═══ */
.head{{flex:0 0 {HEAD_H}mm;position:relative;z-index:4}}
/* the bronze frame, stepped and gold-edged */
/* The bracket steps DOWN into the cream. Cut the other way it punches a
   hole through the band, which reads as a missing piece rather than as a
   bracket — that was the fault. */
.frame{{position:absolute;left:0;right:0;top:0;height:14mm;
 background:{GLASS},{GIRIH},
  linear-gradient(178deg,{DARK_L} 0%,{DARK} 58%,{DARK_D} 100%);
 background-size:auto,auto,15mm 15mm,auto;
 clip-path:polygon(0 0,100% 0,100% 64%,58% 64%,51% 92%,33% 92%,26% 64%,0 64%);
 filter:drop-shadow(0 .9pt 2.6pt rgba(16,9,3,.36))}}
/* the bar: struck metal, lit above and shadowed beneath, riding the cut */
.fedge{{position:absolute;left:0;right:0;top:0;height:14mm;z-index:5;pointer-events:none;
 background:{METAL};
 clip-path:polygon(0 64%,26% 64%,33% 92%,51% 92%,58% 64%,100% 64%,
                   100% calc(64% - 1.5pt),58% calc(64% - 1.5pt),
                   51% calc(92% - 1.5pt),33% calc(92% - 1.5pt),
                   26% calc(64% - 1.5pt),0 calc(64% - 1.5pt));
 filter:drop-shadow(0 .45pt .9pt rgba(18,11,4,.5))}}
/* a hairline of light immediately beneath the bar, so it reads as raised */
.fedge2{{position:absolute;left:0;right:0;top:0;height:14mm;z-index:5;pointer-events:none;
 background:rgba(255,250,232,.5);
 clip-path:polygon(0 calc(64% - 1.5pt),26% calc(64% - 1.5pt),33% calc(92% - 1.5pt),
                   51% calc(92% - 1.5pt),58% calc(64% - 1.5pt),100% calc(64% - 1.5pt),
                   100% calc(64% - 1.85pt),58% calc(64% - 1.85pt),
                   51% calc(92% - 1.85pt),33% calc(92% - 1.85pt),
                   26% calc(64% - 1.85pt),0 calc(64% - 1.85pt))}}
/* the contact panel, cut into the masthead at the right */
.panel{{position:absolute;right:0;top:8.96mm;width:{210 - PANEL_X}mm;height:{HEAD_H - 8.96}mm;
 background:{GLASS},{GIRIH},
  linear-gradient(122deg,{DARK_L} 0%,{DARK} 50%,{DARK_D} 100%);
 background-size:auto,auto,15mm 15mm,auto;
 clip-path:polygon(7% 0,100% 0,100% 100%,0 100%);
 padding:4.6mm 7mm 4.6mm 12mm;
 display:flex;flex-direction:column;justify-content:center;gap:2.2mm;
 filter:drop-shadow(-1pt 0 2.6pt rgba(16,9,3,.3))}}
/* its leading edge is a bevelled member, not a rule */
.panel::before{{content:'';position:absolute;left:-1.2mm;top:0;bottom:0;width:1.6pt;
 background:{METAL_V};transform:skewX(-5.2deg);transform-origin:top left;
 box-shadow:.35pt 0 .9pt rgba(18,11,4,.45)}}
.panel .l{{display:flex;align-items:flex-start;gap:2.6mm;
 font-size:{S_SMALL}pt;color:#EFE4D2;line-height:1.4;white-space:nowrap}}
.panel a{{color:inherit;text-decoration:none}}
.ico{{flex:0 0 auto;width:4mm;height:4mm;margin-top:.2mm;border-radius:50%;
 border:.4pt solid rgba(201,162,74,.75);display:flex;align-items:center;justify-content:center}}
.ico svg{{width:2.5mm;height:2.5mm;display:block;fill:{GOLD}}}
/* arms, lock and motto on the cream */
.mast{{position:absolute;left:{MARGIN}mm;top:12mm;z-index:5;display:flex;align-items:center;gap:6mm}}
.mast .arms{{flex:0 0 auto;text-align:center}}
.mast .arms img{{width:27mm;height:27mm;display:block}}
.mast .arms span{{display:block;margin-top:1mm;font-family:'Cinzel',serif;font-size:{S_MICRO}pt;
 letter-spacing:.04em;color:{GOLD_D}}}
.lock{{display:flex;align-items:center;gap:5mm}}
.lock .en{{font-family:'Cinzel',serif;font-weight:700;font-size:{S_NAME}pt;letter-spacing:.045em;
 text-transform:uppercase;color:{DARK};line-height:1.24;white-space:nowrap}}
.lock .ar{{direction:rtl;font-family:'Amiri',serif;font-size:{S_ARABIC}pt;line-height:1.24;
 color:{DARK};white-space:nowrap;text-align:right}}
.lock .div{{width:.6pt;align-self:stretch;background:{GOLD};margin:.6mm 0}}
.motto{{position:absolute;left:{MARGIN + 33}mm;top:{HEAD_H - 9}mm;z-index:5;
 display:flex;align-items:center;gap:3mm;width:{PANEL_X - MARGIN - 40}mm;
 font-family:'Cinzel',serif;font-size:{S_LABEL}pt;letter-spacing:.19em;text-transform:uppercase;
 color:{GOLD_D};white-space:nowrap}}
.motto::before,.motto::after{{content:'';flex:1;height:.4pt;background:rgba(142,107,36,.42)}}

/* ═══ THE FIELD ═══ */
.body{{flex:1;position:relative;z-index:2;padding:14mm 24mm 0 30mm;min-width:0}}
.body p{{margin-bottom:3.4mm;text-align:justify;hyphens:auto}}
.body strong{{font-weight:600}}
.body a{{color:{DARK};font-weight:600;text-decoration:none;
 border-bottom:.4pt solid rgba(201,162,74,.6)}}
.top{{display:flex;justify-content:space-between;gap:10mm;margin-bottom:8mm;
 font-size:{S_SMALL}pt;color:{INK2}}}
.top b{{display:block;font-weight:600;color:{DARK};font-size:{S_BODY}pt;margin-top:.8mm}}
.top .r{{text-align:right}}
.addr{{margin-bottom:7mm!important;line-height:1.45}}
.subj{{font-family:'Cinzel',serif;font-weight:700;font-size:{S_SUBJ}pt;letter-spacing:.03em;
 text-transform:uppercase;color:{DARK};margin-bottom:5mm;line-height:1.32}}
.lead{{font-family:'Cinzel',serif;font-size:{S_SMALL}pt;letter-spacing:.14em;text-transform:uppercase;
 color:{GOLD_D};margin:6.6mm 0 3.4mm!important;text-align:left!important}}
.val{{font-weight:600;color:{DARK};border-bottom:.4pt solid rgba(201,162,74,.55)}}
.signoff{{margin-top:6.6mm}} .sigsp{{height:17mm}}
.sigrule{{width:52mm;height:.4pt;background:{GOLD};margin-bottom:2.4mm}}
.signm{{line-height:1.45}} .sigt{{font-size:{S_SMALL}pt;color:{INK2}}}
/* the signatory's own hand, dropped onto the cream. A scan on white
   multiplies out; nothing is drawn or imitated here. */
.sig{{display:block;height:15mm;width:auto;max-width:52mm;margin:1mm 0 1.2mm;
 mix-blend-mode:multiply}}
/* the opening invocation, set in the Arabic face and given its own air */
.bism{{text-align:center;font-family:'Amiri',serif;font-size:12.6pt;direction:rtl;
 color:{GOLD_D};margin:0 0 6.6mm!important}}
/* the copy list, closing the letter */
.cc{{margin-top:9mm;padding-top:3.3mm;border-top:.4pt solid rgba(201,162,74,.4);
 font-size:{S_SMALL}pt;color:{INK2};line-height:1.5}}
.cc .ccl{{display:block;font-family:'Cinzel',serif;font-size:{S_LABEL}pt;letter-spacing:.2em;
 text-transform:uppercase;color:{GOLD_D};margin-bottom:1.4mm}}
.cc p{{margin:0!important;text-align:left!important}}
.blank{{display:flex;gap:5mm;font-size:{S_LABEL}pt;letter-spacing:.2em;text-transform:uppercase;
 color:{GOLD_D};margin-bottom:9mm}}
.blank i{{flex:1;border-bottom:.4pt solid rgba(201,162,74,.5);font-style:normal}}

/* ═══ THE FOOT ═══ */
.foot{{flex:0 0 {FOOT_H + BOT_H}mm;position:relative;z-index:4;
 background:{GLASS},{GIRIH},
  linear-gradient(178deg,{DARK_L} 0%,{DARK} 44%,{DARK_D} 100%);
 background-size:auto,auto,15mm 15mm,auto;
 box-shadow:0 -1pt 3.4pt rgba(16,9,3,.3)}}
.foot::before{{content:'';position:absolute;left:0;right:0;top:0;height:1.5pt;
 background:{METAL};box-shadow:{BEVEL};z-index:6}}
.fbrack{{position:absolute;left:0;right:0;top:-4.4mm;height:4.4mm;z-index:5;
 background:linear-gradient(2deg,{DARK} 0%,{DARK_D} 100%);
 clip-path:polygon(0 100%,26% 100%,33% 0,51% 0,58% 100%,100% 100%)}}
.fbrack::after{{content:'';position:absolute;left:0;right:0;top:0;bottom:0;background:{METAL};
 clip-path:polygon(0 100%,26% 100%,33% 0,51% 0,58% 100%,100% 100%,
                   100% calc(100% - 1.2pt),58% calc(100% - 1.2pt),51% 1.2pt,33% 1.2pt,
                   26% calc(100% - 1.2pt),0 calc(100% - 1.2pt))}}
.frow{{position:absolute;left:{MARGIN}mm;right:{MARGIN}mm;top:6.5mm;z-index:5;
 display:flex;align-items:flex-start;gap:3.5mm}}
.qr{{flex:0 0 auto;width:15mm;height:15mm;padding:1.2mm;background:{PAPER};
 border:.5pt solid {GOLD}}}
.qr img{{width:100%;height:100%;display:block}}
.fcols{{flex:1;display:flex;justify-content:space-between;gap:2.5mm;min-width:0}}
.fcols>div{{display:flex;align-items:flex-start;gap:2.4mm}}
.fcols .fl{{display:block;font-size:{S_LABEL}pt;letter-spacing:.16em;text-transform:uppercase;
 color:{GOLD_LT};margin-bottom:.9mm}}
.fcols .v{{font-size:{S_LABEL}pt;color:#EFE4D2;line-height:1.5;white-space:nowrap}}
.fcols a{{color:inherit;text-decoration:none}}
.seal{{flex:0 0 auto;position:relative;width:16mm;height:16mm;border-radius:50%;
 background:{METAL};padding:1.1mm;
 box-shadow:0 .7pt 2.2pt rgba(14,8,2,.55),inset 0 .35pt 0 rgba(255,252,236,.8),
  inset 0 -.35pt 0 rgba(70,48,10,.85);
 display:flex;align-items:center;justify-content:center}}
.seal::before{{content:'';position:absolute;inset:1.1mm;border-radius:50%;
 background:radial-gradient(66% 66% at 36% 28%,#FFFEF9 0%,{CREAM} 58%,#DFD2B6 100%);
 box-shadow:inset 0 .4pt 1.1pt rgba(90,66,22,.45)}}
/* the specular arc — the one thing that says struck rather than printed */
.seal::after{{content:'';position:absolute;left:14%;top:9%;width:56%;height:34%;
 border-radius:50%;background:linear-gradient(160deg,rgba(255,255,255,.85),rgba(255,255,255,0));
 opacity:.5}}
.seal img{{position:relative;z-index:2}}
.seal img{{width:9.5mm;height:9.5mm;display:block}}
.gov{{position:absolute;left:0;right:0;bottom:0;height:{BOT_H}mm;z-index:5;
 background:linear-gradient(178deg,#221810 0%,{DARK_D} 100%);
 box-shadow:inset 0 .4pt 0 rgba(201,162,74,.34);
 display:flex;align-items:center;justify-content:center;gap:9mm;
 font-size:{S_LABEL}pt;letter-spacing:.19em;text-transform:uppercase;color:{GOLD};white-space:nowrap}}
.gov span{{position:relative}}
.gov span+span::before{{content:'';position:absolute;left:-4.5mm;top:-.4mm;bottom:-.4mm;width:.4pt;
 background:rgba(201,162,74,.42)}}

/* ═══ PAGINATION ═══ see docs/shrs-correspondence-standard.md.
   The head appears on the opening sheet only and the foot on the closing
   sheet only; every sheet between them is clean, and its field expands to
   take the room the furniture would have used. */
.page.nh .head,.page.nf .foot{{display:none}}
.page.nh .body{{padding-top:32mm}}
.page.nf .body{{padding-bottom:30mm}}
.page.nh .rail{{top:26mm}} .page.nf .rail{{bottom:26mm}}
/* the only mark a middle sheet carries */
.folio{{position:absolute;right:24mm;bottom:16mm;z-index:3;
 font-size:{S_MICRO}pt;letter-spacing:.2em;text-transform:uppercase;color:{INK2}}}
@media print{{body{{background:none;padding:0;gap:0}}
 .page{{page-break-after:always}}.page:last-child{{page-break-after:auto}}}}
"""

GLYPH = {
 'globe': 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.3-3.6A8 8 0 0 1 18.9 8zM12 4.2c.7 1 1.3 2.3 1.7 3.8h-3.4C10.7 6.5 11.3 5.2 12 4.2zM4.3 14a8 8 0 0 1 0-4h3.3a17 17 0 0 0 0 4zm.8 2h2.9c.3 1.3.8 2.5 1.3 3.6A8 8 0 0 1 5.1 16zm2.9-8H5.1a8 8 0 0 1 4.2-3.6A15.6 15.6 0 0 0 8 8zm4 11.8c-.7-1-1.3-2.3-1.7-3.8h3.4c-.4 1.5-1 2.8-1.7 3.8zm2.1-5.8H9.9a15 15 0 0 1 0-4h4.2a15 15 0 0 1 0 4zm.3 5.6c.5-1.1 1-2.3 1.3-3.6h2.9a8 8 0 0 1-4.2 3.6zm1.7-5.6a17 17 0 0 0 0-4h3.3a8 8 0 0 1 0 4z',
 'mail':  'M3 6h18v12H3zm2 2.6V8l7 4.9L19 8v.6l-7 4.9z',
 'phone': 'M20 15.6a12.4 12.4 0 0 1-3.9-.6 1.1 1.1 0 0 0-1.1.3l-1.6 1.6a15 15 0 0 1-6.3-6.3l1.6-1.6a1.1 1.1 0 0 0 .3-1.1A12.4 12.4 0 0 1 8.4 4 1 1 0 0 0 7.4 3H4.3a1 1 0 0 0-1 1A16.7 16.7 0 0 0 20 20.7a1 1 0 0 0 1-1v-3.1a1 1 0 0 0-1-1z',
 'pin':   'M12 2a6.5 6.5 0 0 0-6.5 6.5C5.5 13.4 12 22 12 22s6.5-8.6 6.5-13.5A6.5 6.5 0 0 0 12 2zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
}
ico = lambda k: (f'<span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">'
                 f'<path d="{GLYPH[k]}"/></svg></span>')

WEB, MAIL = 'shroyalschools.com', 'info@shroyalschools.com'
TEL1, TEL2 = '+234 807 374 7650', '+234 807 058 6860'
ADDR = ('15 Imowonla Road,<br />AP Bus Stop, Off Gberigbe<br />'
        'Agura Road, Ikorodu,<br />Lagos State, Nigeria.')

PANEL = ('<div class="panel">'
         f'<span class="l">{ico("globe")}<a href="https://{WEB}">{WEB}</a></span>'
         f'<span class="l">{ico("mail")}<a href="mailto:{MAIL}">{MAIL}</a></span>'
         f'<span class="l">{ico("phone")}<span><a href="tel:+2348073747650">{TEL1}</a><br />'
         f'<a href="tel:+2348070586860">{TEL2}</a></span></span>'
         f'<span class="l">{ico("pin")}<span>{ADDR}</span></span>'
         '</div>')

HEAD = ('<header class="head">'
        '<div class="frame"></div><div class="fedge"></div><div class="fedge2"></div>'
        '<div class="mast">'
        f'<span class="arms"><img src="data:image/png;base64,{CREST_G}" '
        'alt="Arms of Sultan Hanafi Royal Schools" />'
        '<span>Sultan Hanafi Royal Schools</span></span>'
        '<div class="lock">'
        '<div class="en">Sultan Hanafi<br />Royal Schools</div>'
        '<div class="div"></div>'
        f'<div class="ar">{AR}<br />{AR2}</div>'
        '</div></div>'
        '<div class="motto"><span>Learning Today. Leading Tomorrow.</span></div>'
        + PANEL + '</header>')

FOOT = ('<footer class="foot"><div class="fbrack"></div>'
        '<div class="frow">'
        f'<span class="qr"><img src="data:image/png;base64,{QR}" '
        'alt="QR code linking to shroyalschools.com/verify" /></span>'
        '<div class="fcols">'
        f'<div>{ico("globe")}<span><span class="fl">Website</span>'
        f'<span class="v"><a href="https://{WEB}">{WEB}</a></span></span></div>'
        f'<div>{ico("mail")}<span><span class="fl">Email</span>'
        f'<span class="v"><a href="mailto:{MAIL}">{MAIL}</a></span></span></div>'
        f'<div>{ico("phone")}<span><span class="fl">Telephone</span>'
        f'<span class="v"><a href="tel:+2348073747650">{TEL1}</a><br />'
        f'<a href="tel:+2348070586860">{TEL2}</a></span></span></div>'
        f'<div>{ico("pin")}<span><span class="fl">Head Office</span>'
        '<span class="v">15 Imowonla Road, AP Bus Stop,<br />'
        'Off Gberigbe Agura Road,<br />Ikorodu, Lagos State, Nigeria.</span></span></div>'
        '</div>'
        f'<span class="seal"><img src="data:image/png;base64,{CREST_G}" alt="" /></span>'
        '</div>'
        '<div class="gov"><span>Established July 2016</span>'
        '<span>Governed by a Board of Governors</span>'
        '<span>Ikorodu, Lagos State, Nigeria</span></div></footer>')

RAIL = (f'<div class="rail"></div><div class="railtx">{WEB}</div>')
GROUND = '<div class="tile"></div><div class="emboss"></div>'


def page(inner, head=True, foot=True, folio=''):
    """One sheet. The furniture it carries is decided by the pagination
    standard, not by the caller's taste — see paginate()."""
    cls = 'page' + ('' if head else ' nh') + ('' if foot else ' nf')
    fol = f'<div class="folio">{folio}</div>' if folio else ''
    return (f'  <div class="{cls}" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    {GROUND}{RAIL}\n'
            f'    {HEAD if head else ""}\n'
            f'    <main class="body">\n{inner}\n    </main>\n'
            f'    {FOOT if foot else ""}{fol}\n  </div>')


def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>' + title +
            '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages) + '\n</body>\n</html>\n')

TOP = ('      <div class="top"><div>Reference<b>SHRS/ICT/2026/001</b></div>'
       '<div class="r">Date<b>13 August 2026</b></div></div>')

# ── THE PAGINATION STANDARD ────────────────────────────────────────────
#
# The institution introduces itself once, the document speaks for itself,
# and the institution signs off once. So the head belongs to the opening
# sheet alone and the foot to the closing sheet alone; every sheet between
# them is clean and its field expands into the room the furniture would
# have taken. A single-sheet letter carries both, which closes the frame.
#
# This is applied by measurement, not by hand: the blocks are rendered
# once at the letter's own measure, their heights are read back, and they
# are packed against each sheet's real capacity. Change the letter and the
# pagination follows it.
PAGE_H = 297
# A gutter is held back from every capacity. The measured heights come from
# one rendering; a different rasteriser, a hinting difference or a font
# substitution moves a long block by a millimetre or two, and without this
# reserve a sheet packed to the last hair collides with its own footer. It is
# cheap insurance: it costs a line of text and it removes a class of defect.
GUTTER = 5
CAP_FULL = PAGE_H - HEAD_H - 14 - FOOT_H - BOT_H - GUTTER   # opening sheet
CAP_OPEN = PAGE_H - HEAD_H - 14 - 30 - GUTTER               # opens, does not close
CAP_MID = PAGE_H - 32 - 30 - GUTTER                         # neither
CAP_CLOSE = PAGE_H - 32 - FOOT_H - BOT_H - GUTTER           # closes, does not open


def paginate(heights, extra_first=0.0, keep_with_next=()):
    """Pack blocks into sheets against each sheet's real capacity, then
    apply the standard. Returns a list of (slice, head, foot).

    `keep_with_next` marks blocks that must not be the last thing on a
    sheet — a section heading stranded above a break announces a section
    the reader then has to turn the page to find. It travels with the
    text it introduces."""
    n = len(heights)

    def settle(a, b):
        """Pull a sheet's break back past any block that must not end it."""
        while b - 1 > a and (b - 1) in keep_with_next:
            b -= 1
        return b

    # try one sheet first — if everything fits, it takes head and foot both
    if sum(heights) + extra_first <= CAP_FULL:
        return [((0, n), True, True)]
    sheets, i, first = [], 0, True
    while i < n:
        cap = (CAP_OPEN if first else CAP_MID) - (extra_first if first else 0)
        used, j = 0.0, i
        while j < n and used + heights[j] <= cap:
            used += heights[j]; j += 1
        if j == i:                       # a block taller than a whole sheet
            j = i + 1
        if j < n:                        # a break here, so it must not strand a heading
            j = settle(i, j)
        sheets.append([i, j]); i = j; first = False
    # the closing sheet must also hold the foot; if it cannot, open another
    last = sheets[-1]
    while sum(heights[last[0]:last[1]]) > CAP_CLOSE and last[1] - last[0] > 1:
        last[1] = settle(last[0], last[1] - 1)
        sheets.append([last[1], len(heights)])
        last = sheets[-1]
    out = []
    for k, (a, b) in enumerate(sheets):
        out.append(((a, b), k == 0, k == len(sheets) - 1))
    return out
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
    if ARGS.signature:
        b = b.replace('<div class="sigsp"></div>',
                      '<img class="sig" src="data:image/png;base64,%s" alt="Signature" />'
                      % b64(ARGS.signature))
    if ARGS.activation_url:
        b = b.replace('<span class="val">[activation link]</span>',
                      f'<a href="{ARGS.activation_url}">{ARGS.activation_url}</a>')
    return b

# The record copy is written from the *source* blocks, with the Staff ID and
# the activation link still standing as placeholders. Neither is a fact about
# the letter's design; both are secrets issued per person at the moment of
# sending, and neither may ever enter the repository.
SRC = [b for b in blocks if 'class="ref-line ref-line--f"' not in b]
blocks = [rt(b) for b in blocks]
blocks = [b for b in blocks if 'class="refline"' not in b]

# ── measure the blocks at the letter's own measure, so the pagination is
# decided by what the writer actually wrote rather than by a fixed table
PROBE = (ROOT / '_probe.html')
PROBE.write_text(doc('probe', [page('\n'.join(f'      <div class="blk">{b}</div>'
                                              for b in blocks), True, True)]), encoding='utf-8')
HEIGHTS = ROOT / 'assets' / 'block-heights.json'
try:
    subprocess.run(['node', str(ROOT / 'measure.js')], check=True,
                   capture_output=True, timeout=180, cwd=str(ROOT))
except Exception as exc:                      # no node, no chromium, no matter
    print('  ! could not measure blocks (%s); using the last measurement' % type(exc).__name__)
heights = json.loads(HEIGHTS.read_text()) if HEIGHTS.exists() else [12.0] * len(blocks)
PROBE.unlink(missing_ok=True)

TOP_MM = 12.0                                  # the reference/date row
# a section heading belongs to the text under it, not to the sheet above it
KEEP = {k for k, b in enumerate(blocks) if 'class="lead"' in b}
sheets = paginate(heights, extra_first=TOP_MM, keep_with_next=KEEP)
REF = 'SHRS/ICT/2026/001'
body = lambda a, b: "\n".join("      " + x for x in blocks[a:b])
pages = []
for k, ((a, b), hd, ft) in enumerate(sheets):
    inner = (TOP + '\n' if k == 0 else '') + body(a, b)
    folio = '' if (hd or ft) else f'{REF} &nbsp;&middot;&nbsp; {k + 1} of {len(sheets)}'
    pages.append(page(inner, hd, ft, folio))
(ROOT / 'letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter', pages), encoding='utf-8')
print('letter: %d sheet%s — %s' % (len(sheets), '' if len(sheets) == 1 else 's',
      ', '.join(('head+foot' if h and f else 'head' if h else 'foot' if f else 'clean')
                for _, h, f in sheets)))

# ── the record copy, written from the same blocks as the letter
#
# This used to be kept by hand, and it drifted: it named the wrong
# signatory and it was missing whole sections that had been added to the
# letter. A record of what was sent that disagrees with what was sent is
# worse than no record, so it is now generated. Edit the blocks; both
# follow.
def md(html):
    t = html
    for pat, rep in (
            (r'<p class="lead-in">(.*?)</p>', r'### \1'),
            (r'<p class="subject">(.*?)</p>', r'### \1'),
            (r'<p class="addressee">(.*?)</p>', r'\1'),
            (r'<p class="bism">(.*?)</p>', r'<div dir="rtl">\1</div>'),
            (r'<span class="ccl">(.*?)</span>', r'**\1:**\n'),
            (r'<div class="sig-space"></div>', '*(signature of the signatory)*'),
            (r'<div class="sig-rule"></div>', ''),
            (r'<a href="[^"]*">(.*?)</a>', r'\1'),
            (r'<strong>(.*?)</strong>', r'**\1**'),
            (r'<b>(.*?)</b>', r'**\1**'),
            (r'<em>(.*?)</em>', r'*\1*'),
            (r'<i>(.*?)</i>', r'*\1*'),
            # \x00 marks a hard break; it survives strip(), a trailing space
            # does not, and the indentation in the source would otherwise be
            # read as a markdown code block
            (r'<br\s*/?>', '\x00\n'),
            (r'</(p|div|h2)>', '\n'),
            (r'<[^>]+>', '')):
        t = re.sub(pat, rep, t, flags=re.S)
    t = html_mod.unescape(t)
    t = '\n'.join(x.strip() for x in t.strip().split('\n')).replace('\x00', '  ')
    return re.sub(r'\n{3,}', '\n\n', t)

RECORD = ROOT.parent / 'docs' / 'letters' / 'registrar-portal-activation.md'
if RECORD.parent.is_dir():
    RECORD.write_text('\n'.join([
        '# Letter — Registrar, portal activation',
        '',
        '**Generated by `brand/identity.py` from `brand/assets/letter-blocks.html`.**',
        'Do not edit this file by hand — it is the record of what the letter says,',
        'and it is rewritten from the letter\'s own source on every build. To change',
        'the letter, change the blocks.',
        '',
        'Two things are never written here and never committed:',
        '',
        '- **the Staff Identity Number** — issued by the system when the account is',
        '  created, and not knowable before then;',
        '- **the activation link** — a single-use secret generated per person.',
        '',
        'Both are passed to the build on the command line at the moment of sending;',
        'see `brand/README.md`. The rendered letter runs to **%d sheet%s**, paginated'
        % (len(sheets), '' if len(sheets) == 1 else 's'),
        'by measurement under `docs/shrs-correspondence-standard.md`.',
        '',
        '---',
        '',
        '**Reference** %s &nbsp;&middot;&nbsp; **Date** 13 August 2026' % REF,
        '',
    ] + [md(b) + '\n' for b in SRC]) + '\n', encoding='utf-8')
    print('record ->', RECORD.relative_to(ROOT.parent))

# ── blank stationery: one sheet, so it carries both, which closes the frame
BLANK = '      <div class="blank"><span>Ref</span><i></i><span>Date</span><i></i></div>'
(ROOT / 'letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead', [page(BLANK, True, True)]), encoding='utf-8')
print('identity built')
