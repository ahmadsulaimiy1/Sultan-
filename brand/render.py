#!/usr/bin/env python3
"""Renders the stationery and measures it against docs/institutional-identity.md §X.

    python3 brand/render.py

Builds the HTML, prints both PDFs, cuts the art the Word template carries,
and measures. Exits non-zero on any failure: a sheet that has not been
measured has not been checked.

The tests here are the identity's own claims turned into arithmetic. The
Quarter is only a signature if it is where it says it is; the lock-up is
only one identity if the alif really does stand as tall as the cap; the
sheet is only foilable if nothing gold is thinner than a die will strike.
"""
import base64, math, pathlib, sys

from playwright.sync_api import sync_playwright

import build

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'brand'
CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
PXMM = 96 / 25.4                     # css px per mm
SHEET = (794, 1123)

results = []


def check(n, name, ok, detail):
    results.append((ok, n, name, detail))
    print('  %s  %-3s %-44s %s' % ('PASS' if ok else 'FAIL', n, name, detail))


def luminance(rgb):
    f = lambda v: (v / 255) / 12.92 if v / 255 <= .03928 else (((v / 255) + .055) / 1.055) ** 2.4
    r, g, b = (f(x) for x in rgb)
    return .2126 * r + .7152 * g + .0722 * b


def contrast(a, b):
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)


def parse_rgb(s):
    return tuple(int(x) for x in s[s.index('(') + 1:s.index(')')].split(',')[:3])


def measure(page, sheets, is_letter):
    tag = 'letter' if is_letter else 'blank'

    dims = page.eval_on_selector_all('.page', 'e=>e.map(p=>[Math.round(p.getBoundingClientRect().width),'
                                              'Math.round(p.getBoundingClientRect().height)])')
    check(1, 'page is 794x1123 (%s)' % tag, all(tuple(d) == SHEET for d in dims),
          'measured %s' % (dims[0] if dims else 'none'))

    # §II — the signature is only a signature if it is where it claims to be.
    q = page.evaluate("""() => { const p = document.querySelector('.page'),
        r = p.getBoundingClientRect(), q = p.querySelector('.quarter').getBoundingClientRect(),
        h = p.querySelector('.headrule').getBoundingClientRect();
        return {x: q.left - r.left, len: q.height, w: q.width,
                headRight: h.right - r.left, headW: h.height}; }""")
    want_x, want_len = build.QUARTER_X * PXMM, build.QUARTER_Y * PXMM
    check(2, 'Quarter stands at W/root2 (%s)' % tag, abs(q['x'] - want_x) <= 1,
          '%.2fmm, wanted %.2fmm' % (q['x'] / PXMM, build.QUARTER_X))
    check(3, 'Quarter runs H/root2, = sheet width (%s)' % tag, abs(q['len'] - want_len) <= 1,
          '%.2fmm long, sheet is %.1fmm wide' % (q['len'] / PXMM, build.W))
    # §II — the head rule stops dead on the Quarter: that right angle is the mark.
    check(4, 'head rule closes on the Quarter (%s)' % tag,
          abs(q['headRight'] - (want_x + build.FOIL_RULE * PXMM)) <= 1.5,
          'meets at (%.1f, %.1f)mm' % (build.QUARTER_X, build.HEAD_Y))

    # §III — nothing institutional may cross the Quarter. The right field
    # carries only the document's own identity.
    cross = page.evaluate("""(qx) => { const out = [];
        for (const p of document.querySelectorAll('.page')) {
            const r = p.getBoundingClientRect();
            for (const e of p.querySelectorAll('.panel,.wordmark,.ar,.inst,.inst i,.body,' +
                                               '.record,.subject,.motto,.contact,.seal,.seal i,.cont'))
                if (e.getBoundingClientRect().right - r.left > qx + 1)
                    out.push(e.className + ' +' +
                             Math.round(e.getBoundingClientRect().right - r.left - qx) + 'px');
        }
        return out; }""", build.QUARTER_X * PXMM)
    check(5, 'nothing crosses the Quarter (%s)' % tag, not cross,
          'clear' if not cross else '; '.join(cross[:3]))

    # §V — foil is binary and a die has a minimum. Every gold element on the
    # sheet must be one a press could actually strike.
    foil = page.evaluate("""(minPt) => { const bad = [];
        const gold = c => { const m = c.match(/\\d+/g); if (!m) return false;
            const [r,g,b] = m.map(Number);
            return r > 120 && r < 240 && g > 90 && g < 210 && b < 150 && (r - b) > 55; };
        for (const e of document.querySelectorAll('.page *')) {
            const cs = getComputedStyle(e), b = e.getBoundingClientRect();
            if (gold(cs.backgroundColor) && b.width && b.height &&
                Math.min(b.width, b.height) < 1.12)           // 0.3mm at 96dpi, less rounding
                bad.push('rule ' + e.className + ' ' + Math.min(b.width, b.height).toFixed(2) + 'px');
            if (gold(cs.color) && e.textContent.trim() && parseFloat(cs.fontSize) < minPt * 96 / 72 - 0.02)
                bad.push('type ' + e.className + ' ' +
                         (parseFloat(cs.fontSize) * 72 / 96).toFixed(1) + 'pt');
        }
        return [...new Set(bad)]; }""", build.FOIL_MIN_PT)
    check(6, 'every gold element is strikeable (%s)' % tag, not foil,
          'rules >= %.1fmm, type >= %.0fpt' % (build.FOIL_RULE, build.FOIL_MIN_PT)
          if not foil else '; '.join(foil[:3]))

    # §VII — one identity, not two languages side by side. The alif must
    # stand exactly as tall as the Latin cap, or the lock-up is two marks.
    optic = page.evaluate("""() => { const c = document.createElement('canvas').getContext('2d');
        const wm = getComputedStyle(document.querySelector('.wordmark'));
        const ar = getComputedStyle(document.querySelector('.ar'));
        c.font = wm.fontWeight + ' ' + wm.fontSize + ' "EB Garamond"';
        const cap = c.measureText('H').actualBoundingBoxAscent;
        c.font = ar.fontSize + ' "Amiri"';
        const alif = c.measureText('\\u0627').actualBoundingBoxAscent;
        return {cap, alif, ratio: alif / cap}; }""")
    check(7, 'alif matches the Latin cap (%s)' % tag, abs(optic['ratio'] - 1) <= .05,
          'alif %.1fpx / cap %.1fpx = %.3f' % (optic['alif'], optic['cap'], optic['ratio']))

    # Rule 4 — the sheet is overflow:hidden, so prose that does not fit is
    # cut off rather than pushing anything out. A letter re-paginates.
    clipped = page.evaluate("""() => [...document.querySelectorAll('.body')]
        .map((b, i) => [i + 1, b.scrollHeight - b.clientHeight]).filter(([, o]) => o > 1)""")
    check(8, 'no prose clipped by its sheet (%s)' % tag, not clipped,
          'every sheet holds its text' if not clipped
          else '; '.join('sheet %d over by %dpx' % (i, o) for i, o in clipped))

    inside = page.evaluate("""() => [...document.querySelectorAll('.page')].map(p => {
        const r = p.getBoundingClientRect(), f = p.querySelector('.record').getBoundingClientRect();
        return Math.round(f.bottom - r.bottom); })""")
    check(9, 'the record sits inside every sheet (%s)' % tag, all(v <= 0 for v in inside),
          '%d sheet(s), worst %+dpx' % (len(inside), max(inside)))

    # §IV — luminance, not hue, is what separates coffee from gold. Measured
    # off the rendered pixels, since the ground is a gradient.
    shot = page.locator('.page').first.screenshot()
    px = page.evaluate("""async (b64) => {
        const img = new Image();
        await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const lum = p => .2126*p[0] + .7152*p[1] + .0722*p[2];
        const extreme = (x, y, w, h, max) => { const d = g.getImageData(x, y, w, h).data;
            let best = null;
            for (let i = 0; i < d.length; i += 4) { const p = [d[i], d[i+1], d[i+2]];
                if (!best || (max ? lum(p) > lum(best) : lum(p) < lum(best))) best = p; }
            return best; };
        const W = img.width, H = img.height;
        return {paper: extreme(Math.round(W*.30), Math.round(H*.42), Math.round(W*.36),
                               Math.round(H*.10), true)}; }""",
        base64.b64encode(shot).decode('ascii'))
    paper = tuple(px['paper'])
    ink = parse_rgb(page.evaluate("()=>getComputedStyle(document.querySelector('.page')).color"))
    gold = parse_rgb(page.evaluate(
        "()=>getComputedStyle(document.querySelector('.contact .l')).color"))
    check(10, 'body ink >= 12:1 on paper (%s)' % tag, contrast(ink, paper) >= 12,
          '%.1f:1 (ink rgb%s on paper rgb%s)' % (contrast(ink, paper), ink, paper))
    check(11, 'gold label >= 4.5:1 on paper (%s)' % tag, contrast(gold, paper) >= 4.5,
          '%.1f:1 — printed gold is darker than foil because it does not reflect'
          % contrast(gold, paper))

    stray = page.evaluate("""() => ['TODO','TBD','XXX','Lorem','{{','<<']
        .filter(m => document.body.innerText.includes(m))""")
    check(12, 'no unfilled placeholder (%s)' % tag, not stray, 'none' if not stray else str(stray))

    if is_letter:
        first = page.eval_on_selector('.page:first-child', 'p=>!!p.querySelector(".subject")')
        check(13, 'the letter begins on sheet one', first, 'subject present on sheet 1')
        full = page.eval_on_selector_all('.panel', 'e=>e.length')
        cont = page.eval_on_selector_all('.cont', 'e=>e.length')
        check(14, 'lock-up on sheet one only', full == 1 and cont == sheets - 1,
              '%d lock-up, %d continuation, %d sheets' % (full, cont, sheets))
        drop = page.eval_on_selector_all('.opening', 'e=>e.length')
        check(15, 'one drop initial, on the opening sentence', drop == 1, '%d found' % drop)


def main():
    build.build()
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
            check(0, 'both faces loaded (%s)' % name, faces >= 3, '%d faces' % faces)
            check('0b', 'no console errors (%s)' % name, not errors,
                  'clean' if not errors else '; '.join(errors[:2]))
            measure(page, sheets, is_letter)
            page.pdf(path=str(OUT / (name + '.pdf')), width='210mm', height='297mm',
                     print_background=True, prefer_css_page_size=False,
                     margin={'top': '0', 'bottom': '0', 'left': '0', 'right': '0'})
            page.close()

        # The art the Word template carries, cut from the sheet itself and on a
        # transparent ground so the page's own paper shows through (§V).
        page = browser.new_page(viewport={'width': 794, 'height': 1123}, device_scale_factor=3)
        page.goto((OUT / 'letterhead.html').as_uri())
        page.wait_for_timeout(1200)
        page.evaluate("""() => { document.body.style.cssText = 'background:none;padding:0;gap:0';
            const p = document.querySelector('.page');
            p.style.background = 'transparent';
            const g = p.querySelector('.ground'); if (g) g.style.display = 'none'; }""")
        for out in ('masthead', 'record'):
            clip = page.evaluate("""(which) => { const p = document.querySelector('.page'),
                r = p.getBoundingClientRect();
                if (which === 'masthead') { const h = p.querySelector('.headrule').getBoundingClientRect();
                    return {x: 0, y: 0, width: r.width, height: h.bottom - r.top}; }
                const f = p.querySelector('.record').getBoundingClientRect();
                return {x: 0, y: f.top - r.top, width: r.width, height: r.bottom - f.top}; }""", out)
            page.screenshot(path=str(OUT / ('band-%s.png' % out)), clip=clip, omit_background=True)
            print('  cut band-%s.png  %dx%d css px' % (out, clip['width'], clip['height']))
        # the Quarter, full height, so the spine is unbroken in Word
        clip = page.evaluate("""() => { const p = document.querySelector('.page'),
            r = p.getBoundingClientRect(), q = p.querySelector('.quarter').getBoundingClientRect();
            return {x: q.left - r.left - 1, y: 0, width: q.width + 2, height: r.height}; }""")
        page.screenshot(path=str(OUT / 'band-quarter.png'), clip=clip, omit_background=True)
        print('  cut band-quarter.png  %.1fx%d css px' % (clip['width'], clip['height']))
        page.close()
        browser.close()

    failed = [r for r in results if not r[0]]
    print('\n%d checks, %d failed' % (len(results), len(failed)))
    for _, n, name, detail in failed:
        print('  FAILED %s. %s — %s' % (n, name, detail))
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
