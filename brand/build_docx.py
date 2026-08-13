#!/usr/bin/env python3
"""Builds brand/letterhead.docx — the Word template a member of staff opens
and types into.

    python3 brand/build_docx.py        (run brand/render.py first)

The masthead and foot are the *same* art the HTML sheet renders, cut by
render.py into band-masthead.png / band-foot.png. That is the whole point:
a Word file rebuilt by hand drifts from the sheet within one revision, which
is exactly how the previous .docx came to be two revisions stale — still
carrying the coffee palette and the singular Arabic name that Rule 0 forbids.

Both images are anchored to the PAGE, not to a paragraph, so Word cannot
reflow them: the masthead sits at (0,0) and the foot at the sheet's bottom
edge whatever the typist does. Margins then only have to clear them.

A .docx cannot embed fonts the way the HTML does, so the body is set in
Georgia — present on every Windows and Mac — rather than in Inter. §VI's
faces survive in the art, which is where the ceremony lives.
"""
import pathlib, struct, zipfile

import build as sheet

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'brand'

TWIP = 1440 / 25.4                 # twips per mm
EMU = 36000                        # EMU per mm
PXMM = 96 / 25.4
PAGE_W, PAGE_H = sheet.W, sheet.H
MARGIN_L = sheet.BODY_L            # the sheet's own text block (§III)
MARGIN_R = sheet.W - sheet.BODY_R
UNIT = sheet.NINTH                 # the margin module (§III)

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"')


def png_size(path):
    d = path.read_bytes()
    if d[:8] != b'\x89PNG\r\n\x1a\n':
        raise SystemExit('%s is not a PNG' % path)
    return struct.unpack('>II', d[16:24])


def anchor(rid, name, w_mm, h_mm, x_mm, y_mm, z):
    """A picture pinned to the page. behindDoc, so typed text runs over it
    rather than being pushed down the sheet."""
    cx, cy = int(w_mm * EMU), int(h_mm * EMU)
    return (
        f'<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" '
        f'simplePos="0" relativeHeight="{z}" behindDoc="1" locked="1" layoutInCell="1" '
        f'allowOverlap="1"><wp:simplePos x="0" y="0"/>'
        f'<wp:positionH relativeFrom="page"><wp:posOffset>{int(x_mm * EMU)}</wp:posOffset></wp:positionH>'
        f'<wp:positionV relativeFrom="page"><wp:posOffset>{int(y_mm * EMU)}</wp:posOffset></wp:positionV>'
        f'<wp:extent cx="{cx}" cy="{cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>'
        f'<wp:wrapNone/><wp:docPr id="{z}" name="{name}" descr="{name}"/>'
        f'<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>'
        f'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
        f'<pic:pic><pic:nvPicPr><pic:cNvPr id="{z}" name="{name}"/><pic:cNvPicPr/></pic:nvPicPr>'
        f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
        f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
        f'</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>')


def build():
    head_png, foot_png = OUT / 'band-masthead.png', OUT / 'band-record.png'
    rail_png = OUT / 'band-quarter.png'
    for p in (head_png, foot_png, rail_png):
        if not p.exists():
            raise SystemExit('%s is missing — run brand/render.py first.' % p.name)

    hw, hh = png_size(head_png)
    fw, fh = png_size(foot_png)
    rw, rh = png_size(rail_png)
    # Full-bleed width; height follows the art's own aspect so nothing stretches.
    head_h = PAGE_W * hh / hw
    foot_h = PAGE_W * fh / fw
    # The Quarter spans the sheet, so its width follows from its height. It is
    # cut with a pixel of slack either side, which is why it is placed by its
    # own left edge rather than by QUARTER_X.
    rail_w = PAGE_H * rw / rh
    rail_x = sheet.QUARTER_X - 1 / PXMM

    # The text block clears both bands by a whole number of margin modules.
    top_mm = head_h + UNIT
    bot_mm = foot_h + UNIT / 2

    header = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
              f'<w:hdr {NS}><w:p><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr>'
              + anchor('rId3', 'Quarter', rail_w, PAGE_H, rail_x, 0, 1)
              + anchor('rId1', 'Masthead', PAGE_W, head_h, 0, 0, 2)
              + anchor('rId2', 'Foot', PAGE_W, foot_h, 0, PAGE_H - foot_h, 3)
              + '</w:p></w:hdr>')

    sect = (f'<w:sectPr><w:headerReference w:type="default" r:id="rId1"/>'
            f'<w:pgSz w:w="{int(PAGE_W * TWIP)}" w:h="{int(PAGE_H * TWIP)}"/>'
            f'<w:pgMar w:top="{int(top_mm * TWIP)}" w:right="{int(MARGIN_R * TWIP)}" '
            f'w:bottom="{int(bot_mm * TWIP)}" w:left="{int(MARGIN_L * TWIP)}" '
            f'w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>')

    document = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                f'<w:document {NS}><w:body>'
                f'<w:p><w:pPr><w:pStyle w:val="Subject"/></w:pPr>'
                f'<w:r><w:t xml:space="preserve"></w:t></w:r></w:p>'
                f'<w:p><w:r><w:t xml:space="preserve"></w:t></w:r></w:p>'
                f'{sect}</w:body></w:document>')

    # Ink and garnet from §VII, so a heading typed in Word is the sheet's
    # garnet and not Word's default blue.
    styles = (f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
              f'<w:styles {NS}>'
              f'<w:docDefaults><w:rPrDefault><w:rPr>'
              f'<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>'
              f'<w:color w:val="241A0E"/><w:sz w:val="20"/><w:szCs w:val="20"/>'
              f'</w:rPr></w:rPrDefault>'
              f'<w:pPrDefault><w:pPr><w:spacing w:after="181" w:line="288" w:lineRule="auto"/>'
              f'<w:jc w:val="both"/></w:pPr></w:pPrDefault></w:docDefaults>'
              f'<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
              f'<w:name w:val="Normal"/><w:qFormat/></w:style>'
              f'<w:style w:type="paragraph" w:styleId="Subject"><w:name w:val="Subject Line"/>'
              f'<w:basedOn w:val="Normal"/><w:qFormat/>'
              f'<w:pPr><w:jc w:val="left"/><w:spacing w:after="363"/>'
              f'<w:pBdr><w:bottom w:val="single" w:sz="4" w:space="2" w:color="B08D45"/></w:pBdr></w:pPr>'
              f'<w:rPr><w:rFonts w:ascii="EB Garamond" w:hAnsi="EB Garamond"/><w:b/><w:caps/>'
              f'<w:color w:val="1C1409"/><w:sz w:val="20"/></w:rPr></w:style>'
              f'</w:styles>')

    types = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             '<Default Extension="xml" ContentType="application/xml"/>'
             '<Default Extension="png" ContentType="image/png"/>'
             '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
             '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
             '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
             '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
             '</Types>')

    root_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                 '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
                 '</Relationships>')

    doc_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
                '</Relationships>')

    hdr_rels = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
                '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/masthead.png"/>'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/foot.png"/>'
                '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/quarter.png"/>'
                '</Relationships>')

    core = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
            'xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '<dc:title>Sultan Hanafi Royal Schools — Letterhead</dc:title>'
            '<dc:creator>Sultan Hanafi Royal Schools</dc:creator>'
            '</cp:coreProperties>')

    target = OUT / 'letterhead.docx'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', types)
        z.writestr('_rels/.rels', root_rels)
        z.writestr('word/document.xml', document)
        z.writestr('word/_rels/document.xml.rels', doc_rels)
        z.writestr('word/styles.xml', styles)
        z.writestr('word/header1.xml', header)
        z.writestr('word/_rels/header1.xml.rels', hdr_rels)
        z.writestr('word/media/masthead.png', head_png.read_bytes())
        z.writestr('word/media/foot.png', foot_png.read_bytes())
        z.writestr('word/media/quarter.png', rail_png.read_bytes())
        z.writestr('docProps/core.xml', core)

    print('built: letterhead.docx')
    print('  masthead %.1f x %.1f mm at page (0, 0)' % (PAGE_W, head_h))
    print('  foot     %.1f x %.1f mm at page (0, %.1f)' % (PAGE_W, foot_h, PAGE_H - foot_h))
    print('  Quarter  %.2f x %.1f mm at page (%.2f, 0)' % (rail_w, PAGE_H, rail_x))
    print('  text block  top %.1f  bottom %.1f  left %.1f  right %.1f mm'
          % (top_mm, bot_mm, MARGIN_L, MARGIN_R))
    return target, head_h, foot_h, top_mm, bot_mm


def verify(target, head_h, foot_h, top_mm, bot_mm):
    """What can be proved without Word. LibreOffice cannot open even a
    one-word .docx in this environment, so layout is not rendered here —
    but structure, references and geometry are arithmetic, and those are
    checked rather than asserted."""
    import re
    import xml.etree.ElementTree as ET

    fails = []

    def ok(name, cond, detail):
        print('  %s  %-38s %s' % ('PASS' if cond else 'FAIL', name, detail))
        if not cond:
            fails.append(name)

    z = zipfile.ZipFile(target)
    names = set(z.namelist())

    bad = []
    for n in names:
        if n.endswith(('.xml', '.rels')):
            try:
                ET.fromstring(z.read(n))
            except ET.ParseError as e:
                bad.append('%s: %s' % (n, e))
    ok('every XML part is well-formed', not bad, '%d parts' % len([n for n in names if n.endswith(('.xml', '.rels'))]))

    # Every r:id used must resolve, and its target must be in the package.
    unresolved = []
    for part, rels in [('word/document.xml', 'word/_rels/document.xml.rels'),
                       ('word/header1.xml', 'word/_rels/header1.xml.rels')]:
        rel_map = {m.group(1): m.group(2) for m in
                   re.finditer(r'Id="([^"]+)"[^>]*Target="([^"]+)"', z.read(rels).decode())}
        for rid in set(re.findall(r'r:(?:id|embed)="([^"]+)"', z.read(part).decode())):
            tgt = rel_map.get(rid)
            if tgt is None:
                unresolved.append('%s -> %s (no relationship)' % (part, rid))
            elif ('word/' + tgt) not in names:
                unresolved.append('%s -> %s -> %s (missing part)' % (part, rid, tgt))
    ok('every r:id resolves to a real part', not unresolved, '; '.join(unresolved) or 'all resolve')

    ct = z.read('[Content_Types].xml').decode()
    missing_ct = [n for n in names
                  if n.endswith('.xml') and n != '[Content_Types].xml'
                  and ('PartName="/%s"' % n) not in ct]
    ok('content types cover every part', not missing_ct, '; '.join(missing_ct) or 'complete')

    # Geometry: the bands must sit inside the sheet and the text must clear them.
    ok('art fits the sheet', head_h + foot_h < PAGE_H,
       'masthead %.1f + foot %.1f = %.1f of %.0f mm' % (head_h, foot_h, head_h + foot_h, PAGE_H))
    ok('text block clears both bands', top_mm >= head_h and bot_mm >= foot_h,
       'top %.1f >= %.1f, bottom %.1f >= %.1f mm' % (top_mm, head_h, bot_mm, foot_h))
    # The point of building the Word file from the sheet's own art is that the
    # two are one design. That is only true if a typist's text block sits
    # exactly where the sheet's body sits, so check it rather than trust it.
    ok('typing area matches the sheet\'s body block',
       abs(top_mm - sheet.BODY_T) <= .5 and abs((PAGE_H - bot_mm) - sheet.BODY_B) <= .5,
       'top %.1f vs %.1f, foot %.1f vs %.1f mm'
       % (top_mm, sheet.BODY_T, PAGE_H - bot_mm, sheet.BODY_B))

    # §Rule 0 — the singular Arabic name may not survive anywhere in the file.
    blob = b''.join(z.read(n) for n in names if n.endswith(('.xml', '.rels')))
    singular = 'مدرسة سلطان حنفي الملكية'.encode('utf-8')
    ok('no singular Arabic name (Rule 0)', singular not in blob, 'absent from every part')

    # The coffee palette this file used to carry must be gone (§II-b).
    stale = [c for c in (b'3B1420', b'7A2E3E', b'C9A45E', b'14060A') if c in blob]
    ok('no garnet left from the old sheet', not stale,
       'coffee only' if not stale else 'found %s' % [c.decode() for c in stale])

    for part in ('word/media/masthead.png', 'word/media/foot.png', 'word/media/quarter.png'):
        d = z.read(part)
        ok('%s is a valid PNG' % part.split('/')[-1], d[:8] == b'\x89PNG\r\n\x1a\n',
           '%dx%d px' % struct.unpack('>II', d[16:24]))

    return fails


if __name__ == '__main__':
    import sys
    target, hh, fh, tm, bm = build()
    print('\nverifying (structure and geometry; Word layout is NOT rendered here)')
    failures = verify(target, hh, fh, tm, bm)
    print('\n%s' % ('all structural checks pass' if not failures
                    else '%d FAILED: %s' % (len(failures), ', '.join(failures))))
    sys.exit(1 if failures else 0)
