#!/usr/bin/env python3
"""Word stationery — the same sheet, typed into.

A .docx cannot embed the school's faces the way the HTML does, and the
Axis runs the full height of the sheet. So the whole ground is placed as
one image, anchored to the *page* rather than to the text and set behind
it. That is the only construction Word honours full-bleed: an inline
image would be pushed inside the margins and the Axis would stop short of
both edges.

The bands are rendered from `letterhead.html` itself by `bands.js`, so
the Word sheet and the PDF are the same drawing and cannot drift.

Run:  python3 brand/word.py
"""
import pathlib, shutil, zipfile

ROOT = pathlib.Path(__file__).resolve().parent
EMU_MM = 36000                      # English Metric Units per millimetre
PAGE_W, PAGE_H = 210, 297
HEAD_TOP, FOOT_H = 124, 30   # where the typist's text may begin and end             # the two bands, as identity.py draws them

def emu(mm):
    return int(round(mm * EMU_MM))

def twip(mm):
    return int(round(mm * 1440 / 25.4))

NS = ('xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
      'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
      'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
      'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"')


def anchor(rid, name, w_mm, h_mm, y_mm):
    """A drawing pinned to the page, behind the text, ignoring the margins."""
    return (
      f'<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0"'
      f' relativeHeight="{1 if y_mm == 0 else 2}" behindDoc="1" locked="0" layoutInCell="1"'
      f' allowOverlap="1"><wp:simplePos x="0" y="0"/>'
      f'<wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>'
      f'<wp:positionV relativeFrom="page"><wp:posOffset>{emu(y_mm)}</wp:posOffset></wp:positionV>'
      f'<wp:extent cx="{emu(w_mm)}" cy="{emu(h_mm)}"/>'
      f'<wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/>'
      f'<wp:docPr id="{1 if y_mm == 0 else 2}" name="{name}" descr="{name}"/>'
      f'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      f'<pic:pic><pic:nvPicPr><pic:cNvPr id="{1 if y_mm == 0 else 2}" name="{name}"/>'
      f'<pic:cNvPicPr/></pic:nvPicPr>'
      f'<pic:blipFill><a:blip r:embed="{rid}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
      f'<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{emu(w_mm)}" cy="{emu(h_mm)}"/></a:xfrm>'
      f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>'
      f'</a:graphicData></a:graphic></wp:anchor></w:drawing></w:r>')


# The Axis runs the height of the sheet, so Word gets one page-sized ground
# rather than two bands. It lives in the header, which is drawn on every
# page, and it is anchored to the page and set behind the text.
HEADER = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  f'<w:hdr {NS}><w:p><w:pPr><w:spacing w:after="0" w:line="20" w:lineRule="exact"/></w:pPr>'
  + anchor('rId1', 'Sheet', PAGE_W, PAGE_H, 0)
  + '</w:p></w:hdr>')

DOCUMENT = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  f'<w:document {NS}><w:body>'
  '<w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>'
  '<w:sectPr>'
  '<w:headerReference w:type="default" r:id="rIdH"/>'
  f'<w:pgSz w:w="{twip(PAGE_W)}" w:h="{twip(PAGE_H)}"/>'
  # text sits clear of both masses; the header itself is pinned to the edge
  # text sits right of the Axis, clear of the masthead and the foot band
  f'<w:pgMar w:top="{twip(HEAD_TOP)}" w:right="{twip(24)}" w:bottom="{twip(FOOT_H)}"'
  f' w:left="{twip(82)}" w:header="0" w:footer="0" w:gutter="0"/>'
  '<w:titlePg w:val="0"/>'
  '</w:sectPr></w:body></w:document>')

STYLES = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  f'<w:styles {NS}><w:docDefaults><w:rPrDefault><w:rPr>'
  '<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>'
  '<w:color w:val="241A12"/><w:sz w:val="21"/><w:szCs w:val="21"/>'
  '</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr>'
  '<w:spacing w:after="120" w:line="288" w:lineRule="auto"/>'
  '</w:pPr></w:pPrDefault></w:docDefaults></w:styles>')

CONTENT_TYPES = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  '<Default Extension="xml" ContentType="application/xml"/>'
  '<Default Extension="jpeg" ContentType="image/jpeg"/>'
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
  '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
  '</Types>')

ROOT_RELS = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
  '</Relationships>')

DOC_RELS = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  '<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  '<Relationship Id="rIdH" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
  '</Relationships>')

HEADER_RELS = (
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/sheet.jpeg"/>'
  '</Relationships>')

out = ROOT / 'letterhead.docx'
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('[Content_Types].xml', CONTENT_TYPES)
    z.writestr('_rels/.rels', ROOT_RELS)
    z.writestr('word/document.xml', DOCUMENT)
    z.writestr('word/_rels/document.xml.rels', DOC_RELS)
    z.writestr('word/styles.xml', STYLES)
    z.writestr('word/header1.xml', HEADER)
    z.writestr('word/_rels/header1.xml.rels', HEADER_RELS)
    z.writestr('word/media/sheet.jpeg', (ROOT / 'assets' / 'word-sheet.jpg').read_bytes())
print('word stationery built ->', out)
