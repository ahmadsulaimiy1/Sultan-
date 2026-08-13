#!/usr/bin/env python3
"""Builds the school's stationery. Assets are embedded so the PDF renders
with no network and no installed fonts. See docs/letterhead-editorial-bible.md
— every rule below traces to a numbered section there."""
import argparse, json, pathlib, re

ap = argparse.ArgumentParser(description='Build the school stationery.')
ap.add_argument('--staff-id', default=None, help='Staff Identity Number issued at account creation')
ap.add_argument('--activation-url', default=None, help='the single-use activation link')
ARGS = ap.parse_args()

A = json.loads(pathlib.Path('/tmp/assets.json').read_text())
FONTS, GRAIN, BAND, MICRO, CREST = A['fonts'], A['grain'], A['band'], A['micro'], A['crest']

AR = 'مدارس السلطان حنفي الملكية'          # §Rule 0 — plural, with the article
# One colour per institution, each taken from a livery the design system
# already ships, so the spectrum means something rather than decorating.
HOUSE = [
    ('Nursery &amp; Primary',        '#2F6B4F'),   # emerald
    ('Royal College',                '#2C4C74'),   # sapphire
    ('Islamic &amp; Arabic Studies', '#7A2E3E'),   # garnet
    ('Qur&rsquo;an College',         '#96702F'),   # royal
    ('Online &amp; Distance',        '#3E4247'),   # obsidian
]
INST = "".join(
    f'<span class="ins"><i style="background:{c}"></i>{n}</span>' for n, c in HOUSE)
SPECTRUM = "".join(f'<i style="background:{c}"></i>' for _, c in HOUSE)

ic = lambda d: ('<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
                'stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round">' + d + '</svg>')
PIN  = ic('<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/>')
TEL  = ic('<path d="M6.2 3.5h3.1l1.6 4-2 1.4a12.5 12.5 0 0 0 6.2 6.2l1.4-2 4 1.6v3.1a1.7 1.7 0 0 1-1.8 1.7A16.8 16.8 0 0 1 4.5 5.3 1.7 1.7 0 0 1 6.2 3.5z"/>')
ENV  = ic('<rect x="2.6" y="5.4" width="18.8" height="13.2" rx="1.4"/><path d="m2.6 6.6 9.4 6.6 9.4-6.6"/>')
GLB  = ic('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18z"/>')
SEAL = ic('<circle cx="12" cy="9.6" r="6.2"/><path d="m8.3 15.2-1.1 6 4.8-2.6 4.8 2.6-1.1-6"/><path d="m9.8 9.6 1.6 1.7 3-3.3"/>')

CSS = FONTS + """
*{margin:0;padding:0;box-sizing:border-box}
body{background:#120509;display:flex;flex-direction:column;align-items:center;gap:9mm;padding:9mm 0}
.page{position:relative;width:210mm;height:297mm;overflow:hidden;display:flex;flex-direction:column;
 color:#191014;font-family:'Inter',serif;
 background:radial-gradient(132% 86% at 62% 0%,#FFFEFD 0%,#FDFBF8 42%,#F8F3EC 78%,#F2ECE2 100%)}
.grain{position:absolute;inset:0;background:url(data:image/svg+xml;base64,GRAIN__) repeat;
 background-size:78mm 78mm;opacity:.28;mix-blend-mode:multiply;pointer-events:none}
.vig{position:absolute;inset:0;pointer-events:none;
 background:radial-gradient(116% 82% at 55% 40%,rgba(0,0,0,0) 62%,rgba(58,12,22,.06) 100%)}
.wmk{position:absolute;left:56%;top:57%;width:124mm;height:124mm;transform:translate(-50%,-50%);
 background:url(data:image/png;base64,CREST__) center/contain no-repeat;opacity:.038;pointer-events:none}

/* §V-b.1 the rail — dead margin made into a spine */
.rail{position:absolute;left:0;top:0;bottom:0;width:7mm;z-index:3;
 background:linear-gradient(180deg,#3B1420,#1B0810);display:flex;align-items:center;justify-content:center}
.rail span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:5pt;letter-spacing:.44em;
 text-transform:uppercase;color:#C9A45E;white-space:nowrap}
.rail::before,.rail::after{content:'';position:absolute;left:1.6mm;right:1.6mm;height:.5pt;background:#C9A45E;opacity:.65}
.rail::before{top:9.6mm} .rail::after{bottom:9.6mm}

/* §V-b.2+3 asymmetric panel, angled edge */
.mast{position:relative;height:32mm}
.panel{position:absolute;left:7mm;top:0;width:62%;height:32mm;
 background:linear-gradient(162deg,#4A1A28 0%,#2C0E17 52%,#170710 100%);
 clip-path:polygon(0 0,100% 0,100% 86%,0 100%);
 display:flex;flex-direction:column;justify-content:center;padding:0 20mm 3mm 9.6mm}
.panel-g{position:absolute;left:0;right:0;bottom:0;height:6mm;opacity:.32;
 background:url(data:image/svg+xml;base64,BAND__) center/100% 100% no-repeat}
.wordmark{position:relative;font-family:'Cinzel',serif;font-weight:800;font-size:13pt;line-height:1.06;
 letter-spacing:.045em;text-transform:uppercase;white-space:nowrap;
 background:linear-gradient(176deg,#FDF5E2 0%,#EFD9A4 22%,#C9A45E 50%,#9A7434 72%,#F7EAC6 100%);
 -webkit-background-clip:text;background-clip:text;color:transparent;
 filter:drop-shadow(0 .3pt .2pt rgba(0,0,0,.65))}
.ar{position:relative;font-family:'Amiri',serif;font-size:10.8pt;color:#E2C68F;margin-top:1.3mm;
 direction:rtl;text-align:left}
/* §V-b.4 overlap — the one focal accent */
.disc{position:absolute;left:calc(7mm + 62% - 12.5mm);top:7.4mm;width:25mm;height:25mm;z-index:4;
 padding:1.4mm;border-radius:50%;background:radial-gradient(circle at 34% 26%,#FFFEFA 0%,#F6EFE3 100%);
 box-shadow:0 0 0 .8pt #C9A45E,0 0 0 2.2mm rgba(255,254,250,.94),0 0 0 2.5mm rgba(201,164,94,.45),
 0 1.6mm 3.4mm rgba(40,8,16,.26)}
.disc img{width:100%;height:100%;display:block}
.place{position:absolute;right:0;top:7.4mm;width:26%;padding-right:14mm;text-align:right;
 font-size:5.3pt;letter-spacing:.2em;text-transform:uppercase;color:#7A2E3E;line-height:2.3}
.place b{display:block;font-weight:600;color:#3B1420}

.strip{margin:6.4mm 14mm 0 16.6mm;padding-bottom:2.4mm;border-bottom:.5pt solid rgba(122,46,62,.32);
 display:flex;align-items:baseline;gap:4mm}
.inst{display:flex;align-items:center;gap:4.4mm;font-size:5.9pt;letter-spacing:.11em;
 text-transform:uppercase;white-space:nowrap}
.ins{display:flex;align-items:center;gap:1.2mm;color:#3A2C30}
.ins i{width:1.9mm;height:1.9mm;border-radius:50%;display:inline-block;flex:0 0 auto}
/* the five houses, ruled as one bar */
.spectrum{display:flex;height:1.1mm;margin:0 14mm 0 16.6mm;border-radius:.6mm;overflow:hidden}
.spectrum i{flex:1}
a{color:inherit;text-decoration:none;border-bottom:.5pt solid rgba(122,46,62,.4)}
a.plain{border-bottom:0}
.body a{color:#7A2E3E;font-weight:600}
.fg a,.cipher a{color:inherit;border-bottom:0}
.est{margin-left:auto;font-size:5.3pt;letter-spacing:.22em;text-transform:uppercase;color:#9A7434;white-space:nowrap}
.micro{margin:1.6mm 14mm 0 16.6mm;height:2.4mm;opacity:.38;
 background:url(data:image/svg+xml;base64,MICRO__) left center/100% 100% no-repeat}

.mastc{display:flex;align-items:center;gap:4mm;margin:9.6mm 14mm 0 16.6mm;padding-bottom:3.2mm;
 border-bottom:.5pt solid rgba(122,46,62,.32)}
.mastc img{width:10mm;height:10mm}
.mastc .n{font-family:'Cinzel',serif;font-weight:700;font-size:9.2pt;letter-spacing:.08em;
 text-transform:uppercase;color:#2C0E17}
.mastc .o{margin-left:auto;font-size:5.9pt;letter-spacing:.2em;text-transform:uppercase;color:#7A2E3E}

.body{position:relative;flex:1;padding:9.6mm 14mm 0 16.6mm;font-size:9.8pt;line-height:1.7;color:#191014}
.body p{margin-bottom:3.2mm;text-align:justify;hyphens:auto}
.body strong{font-weight:600}
.body p.open::first-letter{font-family:'Cinzel',serif;font-weight:700;font-size:22pt;line-height:1;
 float:left;margin:1.1mm 1.7mm 0 0;color:#7A2E3E}
.ref{display:flex;align-items:flex-end;gap:3mm;font-size:7.2pt;color:#7A2E3E;letter-spacing:.16em;
 text-transform:uppercase;margin-bottom:6.4mm}
.ref--f{justify-content:space-between;letter-spacing:.03em;text-transform:none;font-size:8.4pt;color:#4A3038}
.rr{flex:1;border-bottom:.45pt solid rgba(122,46,62,.35);height:1px} .rr--s{flex:0 0 44mm}
.addr{margin-bottom:6.4mm!important;line-height:1.5;padding-left:3.2mm;border-left:1.4pt solid #C9A45E}
.subj{font-family:'Cinzel',serif;font-weight:700;font-size:10pt;letter-spacing:.05em;text-transform:uppercase;
 margin-bottom:4.8mm;line-height:1.42;padding-bottom:2.2mm;border-bottom:.5pt solid rgba(122,46,62,.4);color:#2C0E17}
.lead{font-family:'Cinzel',serif;font-size:8pt;letter-spacing:.15em;text-transform:uppercase;color:#7A2E3E;
 margin:4.8mm 0 2.4mm!important;text-align:left!important}
.val{font-weight:600;color:#7A2E3E;border-bottom:.5pt solid rgba(122,46,62,.45);padding-bottom:.4mm}
.signoff{margin-top:6.4mm} .sigsp{height:16mm}
.sigrule{width:62mm;height:.5pt;background:#C9A45E;margin-bottom:2.2mm}
.signm{line-height:1.55} .sigt{font-size:8.3pt;color:#4A3038}

.foot{position:relative;margin-top:auto;padding-left:7mm}
.motto{text-align:right;padding:0 14mm 3.2mm 0;font-family:'Cormorant Garamond',serif;font-style:italic;
 font-size:11.2pt;color:#4A3038}
.foot-b{position:relative;background:linear-gradient(162deg,#2C0E17 0%,#170710 100%);
 clip-path:polygon(0 14%,100% 0,100% 100%,0 100%);padding:7.2mm 14mm 4.8mm 9.6mm}
.foot-g{position:absolute;left:0;right:0;top:0;height:6mm;opacity:.24;
 background:url(data:image/svg+xml;base64,BAND__) center/100% 100% no-repeat}
.fg{position:relative;display:flex;justify-content:space-between;gap:5mm;font-size:6.5pt;color:#EFE0C6;line-height:1.5}
.fg>div{display:flex;align-items:flex-start;gap:1.6mm;flex:1}
.ic{width:4.4mm;height:4.4mm;flex:0 0 auto;color:#C9A45E;margin-top:.4mm}
.fl{display:block;font-size:5.2pt;letter-spacing:.22em;text-transform:uppercase;color:#C9A45E;margin-bottom:.5mm}
.cipher{position:relative;margin-top:3.2mm;padding-top:2.4mm;border-top:.4pt solid rgba(201,164,94,.24);
 display:flex;align-items:center;gap:1.8mm;font-size:5.4pt;letter-spacing:.24em;color:#B08D4F;text-transform:uppercase}
@media print{body{background:none;padding:0;gap:0}.page{page-break-after:always}.page:last-child{page-break-after:auto}}
""".replace('GRAIN__', GRAIN).replace('CREST__', CREST).replace('BAND__', BAND).replace('MICRO__', MICRO)

MAST = f'''      <header class="mast">
        <div class="panel"><div class="panel-g"></div>
          <h1 class="wordmark">Sultan Hanafi Royal Schools</h1>
          <div class="ar">{AR}</div>
        </div>
        <div class="disc"><img src="data:image/png;base64,{CREST}" width="512" height="512" alt="Crest of Sultan Hanafi Royal Schools" /></div>
        <div class="place"><b>Ikorodu</b>Lagos State<b>Federal Republic of Nigeria</b></div>
      </header>
      <div class="strip"><span class="inst">{INST}</span><span class="est">Founded MMXVI</span></div>
      <div class="spectrum">{SPECTRUM}</div>
      <div class="micro"></div>'''

MASTC = f'''      <header class="mastc">
        <img src="data:image/png;base64,{CREST}" width="512" height="512" alt="" />
        <span class="n">Sultan Hanafi Royal Schools</span><span class="o">ICT Office &#9670; Continuation</span>
      </header>'''

FOOT = f'''      <footer class="foot">
        <p class="motto">&ldquo;Forming Scholars, Leaders and Guardians of Excellence.&rdquo;</p>
        <div class="foot-b"><div class="foot-g"></div>
          <div class="fg">
            <div>{PIN}<span><span class="fl">Campus</span>Ikorodu, Lagos State, Nigeria</span></div>
            <div>{TEL}<span><span class="fl">Telephone</span><a class="plain" href="tel:+2348073747650">+234 807 374 7650</a><br /><a class="plain" href="tel:+2348070586860">+234 807 058 6860</a></span></div>
            <div>{ENV}<span><span class="fl">Correspondence</span><a class="plain" href="mailto:info@shroyalschools.com">info@shroyalschools.com</a></span></div>
            <div>{GLB}<span><span class="fl">Online</span><a class="plain" href="https://shroyalschools.com">shroyalschools.com</a></span></div>
          </div>
          <p class="cipher">{SEAL}<span>Established July 2016 &#9670; Governed by a Board of Governors &#9670; Verifiable at <a class="plain" href="https://shroyalschools.com/verify">shroyalschools.com/verify</a></span></p>
        </div>
      </footer>'''

def page(inner, full=True, rail='Office of the ICT'):
    return (f'  <div class="page" data-canvas-width="794" data-canvas-height="1123">\n'
            f'    <div class="grain"></div><div class="vig"></div><div class="wmk"></div>\n'
            f'    <div class="rail"><span>{rail}</span></div>\n'
            f'{MAST if full else MASTC}\n{inner}\n{FOOT}\n  </div>')

def doc(title, pages):
    return ('<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8" />\n<title>' + title +
            '</title>\n<meta name="hz:slide-selector" content=".page" />\n'
            '<meta name="hz:canvas-width" content="794" />\n<meta name="hz:canvas-height" content="1123" />\n'
            '<style>' + CSS + '</style>\n</head>\n<body>\n' + "\n".join(pages) + '\n</body>\n</html>\n')

blocks = pathlib.Path('/tmp/blocks.txt').read_text().split('\n@@@\n')
rt = lambda b: (b.replace('class="addressee"','class="addr"').replace('class="subject"','class="subj"')
  .replace('class="lead-in"','class="lead"').replace('class="ref-line ref-line--f"','class="ref ref--f"')
  .replace('class="fill"','class="val"').replace('class="sig-space"','class="sigsp"')
  .replace('class="sig-rule"','class="sigrule"').replace('class="sig-name"','class="signm"')
  .replace('class="sig-title"','class="sigt"')
  .replace('<p>I write on behalf','<p class="open">I write on behalf'))
blocks = [rt(b) for b in blocks]

# Real, clickable links — a letter that tells someone to visit a URL and
# then prints it as dead text is asking them to retype it.
LINKS = {
    'shroyalschools.com/portal/staff/login/':
        '<a href="https://shroyalschools.com/portal/staff/login/">shroyalschools.com/portal/staff/login/</a>',
    'info@shroyalschools.com':
        '<a href="mailto:info@shroyalschools.com">info@shroyalschools.com</a>',
}
def linkify(b):
    for plain, anchor in LINKS.items():
        if plain in b and '<a ' not in b:
            b = b.replace(plain, anchor)
    return b
blocks = [linkify(b) for b in blocks]

# The two values only the system can know. Supplied -> the letter is
# finished, and the activation link is a live hyperlink the recipient
# clicks. Absent -> the gaps stay visible rather than silently wrong.
if ARGS.staff_id:
    blocks = [b.replace('[SHRS&#8209;HQ&#8209;REG&#8209;&mdash;&mdash;&mdash;&mdash;&mdash;&mdash;]', ARGS.staff_id)
              for b in blocks]
if ARGS.activation_url:
    live = f'<a href="{ARGS.activation_url}">{ARGS.activation_url}</a>'
    blocks = [b.replace('<span class="val">[activation link]</span>', live).replace('[activation link]', live)
              for b in blocks]
body = lambda a, b: '      <main class="body">\n' + "\n".join("        " + x for x in blocks[a:b]) + '\n      </main>'

# §Rule 13 — the letter begins on sheet one.
CUTS = [(0, 9), (9, 12), (12, 19), (19, 26)]
pathlib.Path('brand/letter-registrar-activation.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letter',
        [page(body(a, b), i == 0) for i, (a, b) in enumerate(CUTS)]), encoding='utf-8')

BLANK = ('      <main class="body">\n        <div class="ref"><span>Ref</span><span class="rr"></span>'
         '<span>Date</span><span class="rr rr--s"></span></div>\n      </main>')
pathlib.Path('brand/letterhead.html').write_text(
    doc('Sultan Hanafi Royal Schools — Letterhead',
        [page(BLANK, True, 'Sultan Hanafi Royal Schools')]), encoding='utf-8')
print('built: letter + blank stationery')
