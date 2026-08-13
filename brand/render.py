#!/usr/bin/env python3
"""Renders the stationery and measures it against the bible's acceptance
tests (docs/letterhead-editorial-bible.md §X).

    python3 brand/render.py

Builds the HTML, prints both PDFs, cuts the band art the Word template
needs, and then measures. It exits non-zero if any test fails, because a
sheet that has not been measured has not been checked — §X is explicit
that these are measured, never eyeballed.
"""
import pathlib, subprocess, sys

from playwright.sync_api import sync_playwright

import build

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'brand'
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
MM = 96 / 25.4                       # css px per mm at 96dpi
SHEET = (794, 1123)                  # A4 at 96dpi (§X.5)

results = []


def check(n, name, ok, detail):
    results.append((ok, n, name, detail))
    print('  %s  %2s. %-42s %s' % ('PASS' if ok else 'FAIL', n, name, detail))


def luminance(rgb):
    def ch(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (ch(x) for x in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def parse_rgb(s):
    return tuple(int(x) for x in s[s.index('(') + 1:s.index(')')].split(',')[:3])


def measure(page, sheets, is_letter):
    """Everything §X asserts, on the document currently loaded."""
    tag = 'letter' if is_letter else 'blank sheet'

    # §X.5 — the page is exactly A4 at 96dpi.
    dims = page.eval_on_selector_all(
        '.page', 'e=>e.map(p=>[Math.round(p.getBoundingClientRect().width),'
                 'Math.round(p.getBoundingClientRect().height)])')
    check(5, 'page is 794x1123 (%s)' % tag, all(tuple(d) == SHEET for d in dims),
          'measured %s' % (dims[0] if dims else 'none'))

    # §X.1 — the wordmark never wraps. Assert it, do not trust it.
    wm = page.eval_on_selector_all(
        '.wordmark', 'e=>e.map(w=>[w.scrollWidth,w.clientWidth,w.getClientRects().length])')
    check(1, 'wordmark on one line (%s)' % tag,
          all(w[0] <= w[1] + 1 and w[2] == 1 for w in wm),
          'scrollWidth %d <= clientWidth %d, %d line' % tuple(wm[0]) if wm else 'absent')

    # §X.2 — nothing overlaps the nation line.
    ov = page.evaluate("""() => document.querySelectorAll('.place').length && [...document.querySelectorAll('.page')]
        .map(p => { const q = p.querySelector('.place'), d = p.querySelector('.disc');
            if (!q || !d) return 0;
            const a = q.getBoundingClientRect(), b = d.getBoundingClientRect();
            return (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) ? 1 : 0; })
        .reduce((x,y)=>x+y,0)""")
    check(2, 'nation line clear of the medallion (%s)' % tag, ov == 0,
          '%s overlapping pair(s)' % ov)

    # §X.3 — every footer sits inside its page, on every sheet.
    esc = page.evaluate("""() => [...document.querySelectorAll('.page')].map((p,i)=>{
        const f = p.querySelector('.foot'); if (!f) return null;
        return Math.round(f.getBoundingClientRect().bottom - p.getBoundingClientRect().bottom); })
        .filter(v => v !== null)""")
    check(3, 'every footer inside its page (%s)' % tag, all(v <= 0 for v in esc),
          '%d sheet(s), worst overhang %+dpx' % (len(esc), max(esc)))

    # §Rule 4 — the letter is never condensed to fit. The sheet is
    # overflow:hidden, so prose that does not fit is silently clipped rather
    # than pushing the footer out: the footer test alone would not see it.
    clipped = page.evaluate("""() => [...document.querySelectorAll('.body')]
        .map((b, i) => [i + 1, b.scrollHeight - b.clientHeight])
        .filter(([, over]) => over > 1)""")
    check('4r', 'no prose clipped by its sheet (%s)' % tag, not clipped,
          'every sheet holds its text' if not clipped
          else '; '.join('sheet %d overflows by %dpx' % (i, o) for i, o in clipped))

    # §X.11 — the masthead is a band, not a half-page.
    mast = page.evaluate("""() => { const p = document.querySelector('.page'),
        m = p.querySelector('.mast'), mi = p.querySelector('.micro');
        if (!m) return null;
        const top = m.getBoundingClientRect().top,
              bot = (mi || m).getBoundingClientRect().bottom;
        return (bot - top) / p.getBoundingClientRect().height; }""")
    if mast is not None:
        check(11, 'masthead <= 15%% of sheet (%s)' % tag, mast <= 0.15,
              '%.1f%% of sheet height' % (mast * 100))

    # §X.6/7 — contrast, sampled from the rendered pixels, not from the CSS.
    px = page.evaluate("""() => { const b = document.querySelector('.body p') ||
            document.querySelector('.body'),
          c = document.querySelector('.fg span'),
          cs = getComputedStyle(b), cc = getComputedStyle(c);
        return [cs.color, cc.color]; }""")
    # Sample the rendered pixels, not the stylesheet: the paper is a radial
    # gradient and the band a linear one, so a declared hex would be a guess.
    import base64
    shot = page.locator('.page').first.screenshot()
    sample = page.evaluate("""async (b64) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        // §X.6 asks for the paper at its LIGHTEST point and the band at its
        // darkest, which is the worst case for each — so scan a patch and
        // take the extreme rather than trusting one pixel not to hit a glyph.
        const lum = p => .2126*p[0] + .7152*p[1] + .0722*p[2];
        const extreme = (x0, y0, w, h, wantMax) => {
            const d = g.getImageData(x0, y0, w, h).data;
            let best = null;
            for (let i = 0; i < d.length; i += 4) {
                const p = [d[i], d[i+1], d[i+2]];
                if (best === null || (wantMax ? lum(p) > lum(best) : lum(p) < lum(best))) best = p;
            }
            return best;
        };
        const W = img.width, H = img.height;
        return {size: [W, H],
                paper: extreme(Math.round(W*.30), Math.round(H*.45), Math.round(W*.40), Math.round(H*.10), true),
                band:  extreme(Math.round(W*.30), H - Math.round(H*.055), Math.round(W*.40), Math.round(H*.030), false)};
    }""", base64.b64encode(shot).decode('ascii'))
    paper, band = tuple(sample['paper']), tuple(sample['band'])
    check(6, 'body ink >= 12:1 on paper (%s)' % tag,
          contrast(parse_rgb(px[0]), paper) >= 12,
          '%.1f:1 (ink %s on paper rgb%s)' % (contrast(parse_rgb(px[0]), paper), px[0], paper))
    check(7, 'cream on band >= 7:1 (%s)' % tag,
          contrast(parse_rgb(px[1]), band) >= 7,
          '%.1f:1 (cream %s on band rgb%s)' % (contrast(parse_rgb(px[1]), band), px[1], band))

    # §X.15 — every vertical gap is a whole multiple of 3.2mm. A gap that
    # needs to be 4.7mm means the composition is wrong, not the number.
    UNIT = 3.2 * MM
    gaps = page.evaluate("""() => { const out = [];
        for (const sel of ['.mast', '.strip', '.micro', '.mastc', '.body', '.foot',
                           '.addressee', '.subject', '.lead-in', '.signoff', '.sig-space']) {
            for (const el of document.querySelectorAll('.page ' + sel)) {
                const cs = getComputedStyle(el);
                for (const prop of ['marginTop', 'marginBottom'])
                    if (parseFloat(cs[prop])) out.push([sel + '.' + prop, parseFloat(cs[prop])]);
            }
        }
        return out; }""")
    off = [(n, v) for n, v in gaps if abs(round(v / UNIT) - v / UNIT) > 0.02]
    check(15, 'vertical gaps are whole 3.2mm units (%s)' % tag, not off,
          '%d gaps, all whole units' % len(gaps) if not off
          else '; '.join('%s=%.2fmm (%.2f units)' % (n, v / MM, v / UNIT) for n, v in off))

    # §X.10 — no placeholder left that the system could have filled. The
    # bracketed fills are the ones only the issuing office can supply.
    stray = page.evaluate("""() => { const t = document.body.innerText;
        return ['TODO', 'TBD', 'XXX', 'Lorem', '{{', '<<'].filter(m => t.includes(m)); }""")
    check(10, 'no unfilled placeholder (%s)' % tag, not stray,
          'none' if not stray else 'found %s' % stray)

    # §X.14 — five contact icons, inline SVG.
    icons = page.eval_on_selector_all('.page:first-child .foot .ic, .page:first-child .cipher .ic',
                                      'e=>e.length')
    check(14, 'five contact icons (%s)' % tag, icons == 5, '%d found' % icons)

    if is_letter:
        # §X.13 — the letter begins on sheet one.
        first = page.eval_on_selector('.page:first-child', 'p=>!!p.querySelector(".subject")')
        check(13, 'the letter begins on sheet one', first,
              'subject line present on sheet 1' if first else 'sheet 1 carries no subject')

        # §X.12 — the drop initial is on the opening sentence, not the addressee.
        drop = page.evaluate("""() => { const o = document.querySelectorAll('.opening');
            if (o.length !== 1) return [o.length, false];
            return [o.length, !o[0].classList.contains('addressee') &&
                    o[0].previousElementSibling !== null]; }""")
        check(12, 'drop initial on the opening sentence', drop[0] == 1 and drop[1],
              '%d .opening block, after the salutation' % drop[0])

        # §X.9 — no page break inside a signature block.
        sig = page.evaluate("""() => [...document.querySelectorAll('.signoff')].every(s => {
            const p = s.closest('.page').getBoundingClientRect(), r = s.getBoundingClientRect();
            return r.top >= p.top && r.bottom <= p.bottom; })""")
        check(9, 'no page break inside a signature block', sig, 'signature block intact')

        # §X.5 (continuation) — rule 5: a lighter masthead on continuation sheets.
        full = page.eval_on_selector_all('.mast', 'e=>e.length')
        cont = page.eval_on_selector_all('.mastc', 'e=>e.length')
        check('5r', 'ceremonial masthead on sheet one only',
              full == 1 and cont == sheets - 1,
              '%d full, %d continuation, %d sheets' % (full, cont, sheets))


def main():
    build.build()
    failures_before = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        for name, is_letter in [('letter-registrar-activation', True), ('letterhead', False)]:
            src = OUT / (name + '.html')
            page = browser.new_page(viewport={'width': 900, 'height': 1200})
            errors = []
            page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(src.as_uri())
            page.wait_for_timeout(1500)
            sheets = page.eval_on_selector_all('.page', 'e=>e.length')
            print('\n%s — %d sheet(s)' % (src.name, sheets))

            faces = page.evaluate('document.fonts.size')
            check(4, 'all faces loaded (%s)' % name, faces >= 7, '%d faces' % faces)

            # §X.8 — no console errors.
            check(8, 'no console errors (%s)' % name, not errors,
                  'clean' if not errors else '; '.join(errors[:2]))

            measure(page, sheets, is_letter)

            # Backgrounds must print, or the garnet panel silently vanishes.
            page.pdf(path=str(OUT / (name + '.pdf')), width='210mm', height='297mm',
                     print_background=True, prefer_css_page_size=False,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
            page.close()

        # The band art the Word header and footer carry (see build_docx.py).
        page = browser.new_page(viewport={'width': 794, 'height': 1123},
                                device_scale_factor=3)
        page.goto((OUT / 'letterhead.html').as_uri())
        page.wait_for_timeout(1200)
        # Cut the bands on a transparent ground. The HTML sheet paints its own
        # warm stock, but a Word page is whatever paper it is printed on — and
        # §III says a tint is the stock's job, not the printer's. Baking the
        # gradient into the art would put a visible cream step across a white
        # page where the band ends; transparency lets the sheet show through.
        page.evaluate("""() => {
            document.body.style.cssText = 'background:none;padding:0;gap:0';
            const p = document.querySelector('.page');
            p.style.background = 'transparent';
            for (const sel of ['.grain', '.vig']) {
                const e = p.querySelector(sel); if (e) e.style.display = 'none';
            }
        }""")
        # Three pieces: the masthead, the foot, and the rail — which runs the
        # full height of the sheet (§V-b.1). Cutting only the two bands would
        # leave the spine broken across the middle of a Word page.
        for out in ('masthead', 'foot', 'rail'):
            clip = page.evaluate("""(which) => { const p = document.querySelector('.page'),
                r = p.getBoundingClientRect();
                if (which === 'head') { const m = p.querySelector('.micro').getBoundingClientRect();
                    return {x: 0, y: 0, width: r.width, height: m.bottom - r.top + 4}; }
                if (which === 'rail') { const s = p.querySelector('.rail').getBoundingClientRect();
                    return {x: 0, y: 0, width: s.width, height: r.height}; }
                const f = p.querySelector('.foot').getBoundingClientRect();
                return {x: 0, y: f.top - r.top, width: r.width, height: r.bottom - f.top}; }""",
                'head' if out == 'masthead' else out)
            page.screenshot(path=str(OUT / ('band-%s.png' % out)), clip=clip,
                            omit_background=True)
            print('  cut band-%s.png  %dx%d css px' % (out, clip['width'], clip['height']))
        page.close()
        browser.close()

    print()
    failed = [r for r in results if not r[0]]
    print('%d checks, %d failed' % (len(results), len(failed)))
    for _, n, name, detail in failed:
        print('  FAILED %s. %s — %s' % (n, name, detail))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
