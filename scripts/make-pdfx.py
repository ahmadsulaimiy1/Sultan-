#!/usr/bin/env python3
"""Label a finished press PDF as PDF/X, losslessly.

    python3 scripts/make-pdfx.py --icc <printer-profile.icc> <in.pdf> <out.pdf>

WHAT THIS DOES, AND WHY IT DOES IT THIS WAY
-------------------------------------------
It adds, by incremental update, the six things the press file is missing and a
PDF/X file must have: a TrimBox, a BleedBox, /Trapped, a file /ID, an XMP packet
carrying the PDF/X identification, and an output intent with the printer's ICC
profile embedded.  It does NOT touch a single content stream, font or image.

That restraint is the whole design.  The obvious route -- `gs -dPDFX` -- was
tried, and the result is in the tree's history as a warning.  Ghostscript 10.02.1
with -dPDFX -dPDFXVersion=PDF/X-3 produced a file that a preflight tool happily
identifies as PDF/X-3 and that is, as a certificate, destroyed:

    original press PDF   6 pages   11 embedded font subsets (44 /FontFile2)
                                   144 image XObjects, 158 /SMask, 699
                                   transparency groups, all live vector
    gs -dPDFX output     6 pages   0 embedded fonts, 0 /FontFile of any kind,
                                   6 image XObjects -- one 3507x2479 DeviceCMYK
                                   bitmap per page, i.e. 300 DPI, 0 /SMask

Every glyph, rule, guilloche and microtext line became a 300 DPI raster, and the
measured ink in the foil name band fell from 19.16% to 15.84% of the area.  The
cause is not a bad flag: PDF/X-1a and PDF/X-3 FORBID live transparency, this
artwork is built on it (drop-shadow filters, 50-odd elements at fractional
opacity, mix-blend-mode:multiply, CSS masks), and the only way to satisfy those
parts is to flatten.  Ghostscript flattens by rasterising the whole page.

So: PDF/X-4 permits live transparency, and PDF/X-4 is therefore the only part
this document can reach without being re-drawn.  That is the single most
important question for the printer.  See docs/certificate-press-specification.md.

WHAT IT DELIBERATELY REFUSES TO DO
----------------------------------
  * Run without an ICC profile.  A PDF/X file without an output intent is not a
    PDF/X file, and the output intent is the printer's characterisation of their
    press, paper and ink.  There is no safe default to guess.
  * Emit PDF/X-1a or PDF/X-3 labelling.  This script cannot flatten, so such a
    label would be a false claim of conformance -- exactly the failure above,
    minus the honesty of visibly wrecking the artwork.
  * Label a file whose device colour space disagrees with the output intent.
    Attaching a CMYK intent to a DeviceRGB document does not convert it; it
    produces a file that claims a conformance it does not have.
"""
import argparse
import hashlib
import os
import re
import struct
import sys
import zlib
from datetime import datetime, timezone

# ── Press geometry ────────────────────────────────────────────────────────────
# The trim is the drawn sheet: .sheet{width:297mm;height:209.5mm}.  It is NOT
# the page box.  The page is 841.92 x 594.96pt (297.01 x 209.89mm) and the sheet
# is anchored to its TOP, so 0.39pt-per-mm of surplus lands at the FOOT of every
# page, filled with the print-media body colour #FDF6E3.  Measured on the
# archived press PDF at 600 DPI: the artwork ends at raster row 4949 of 4958,
# i.e. 9 rows = 0.38mm of non-artwork at the foot.  The TrimBox therefore has a
# non-zero y0 and this is the only place that offset is written down.
TRIM_W_MM = 297.0
TRIM_H_MM = 209.5
PT_PER_MM = 72.0 / 25.4

# The artwork runs edge to edge -- measured, at every threshold down to 160/255
# luminance, ink reaches column 0, the last column and the last row of the
# sheet -- but NO bleed was drawn beyond the trim.  So the default bleed is 0,
# and asking for more than 0 is refused rather than faked, because there is no
# artwork out there to bleed.
DEFAULT_BLEED_MM = 0.0

# PDF/X-4 is ISO 15930-7, defined on top of PDF 1.6.  The press file's header
# says %PDF-1.4.  Rewriting the header would mean rewriting the file, so the
# version is raised the way the PDF spec provides for: a /Version name in the
# catalogue, which overrides the header when it is higher.
PDFX_PART = 'PDF/X-4'
PDF_VERSION_NAME = '/1.6'

REFUSE = 2   # blocked on an input we do not have
FAIL = 1     # the file did not pass a check


def refuse(msg):
    sys.stderr.write('make-pdfx: refusing — ' + msg + '\n')
    sys.exit(REFUSE)


def fail(msg):
    sys.stderr.write('make-pdfx: ' + msg + '\n')
    sys.exit(FAIL)


# ── ICC profile ───────────────────────────────────────────────────────────────
ICC_CLASSES = {b'prtr': 'output (printer)', b'mntr': 'display (monitor)',
               b'scnr': 'input (scanner)', b'spac': 'colour space conversion',
               b'link': 'device link', b'abst': 'abstract', b'nmcl': 'named colour'}
ICC_SPACE_N = {b'CMYK': 4, b'RGB ': 3, b'GRAY': 1}


def read_icc(path):
    """Parse just enough of an ICC profile to embed it honestly."""
    try:
        with open(path, 'rb') as fh:
            blob = fh.read()
    except OSError as exc:
        refuse('cannot read the ICC profile at %s (%s).\n'
               '  The profile has to come from the printer; there is no copy in this repo.'
               % (path, exc.strerror))
    if len(blob) < 132 or blob[36:40] != b'acsp':
        refuse('%s is not an ICC profile (no "acsp" signature at byte 36).\n'
               '  A .icc from a printer is usually 0.5-2 MB; this file is %d bytes.'
               % (path, len(blob)))
    declared = struct.unpack('>I', blob[0:4])[0]
    if declared != len(blob):
        fail('%s is truncated or padded: header says %d bytes, file is %d.'
             % (path, declared, len(blob)))
    cls, space = blob[12:16], blob[16:20]
    if cls != b'prtr':
        refuse('%s is a %s profile, not an output profile.\n'
               '  A PDF/X output intent must carry the press characterisation ("prtr").\n'
               '  Ask the printer for the profile they proof and print against.'
               % (path, ICC_CLASSES.get(cls, cls.decode('latin1', 'replace'))))
    if space not in ICC_SPACE_N:
        refuse('%s describes the colour space %r, which this script does not know how to\n'
               '  declare an /N for.  Expected CMYK, RGB or GRAY.' % (path, space))
    return blob, ICC_SPACE_N[space], space.strip().decode('ascii'), icc_description(blob)


def icc_description(blob):
    """The profile's own name, from its 'desc' tag — never invented here."""
    count = struct.unpack('>I', blob[128:132])[0]
    for i in range(count):
        off = 132 + i * 12
        sig, toff, tlen = struct.unpack('>4sII', blob[off:off + 12])
        if sig != b'desc':
            continue
        tag = blob[toff:toff + tlen]
        if tag[:4] == b'mluc':          # ICC v4
            n, rec = struct.unpack('>II', tag[8:16])
            if n:
                ln, lo = struct.unpack('>II', tag[20:28])
                return tag[lo:lo + ln].decode('utf-16-be', 'replace').strip('\x00').strip()
        if tag[:4] == b'desc':          # ICC v2
            ln = struct.unpack('>I', tag[8:12])[0]
            return tag[12:12 + ln].decode('latin1', 'replace').strip('\x00').strip()
    return ''


# ── Minimal PDF reader ────────────────────────────────────────────────────────
# Only enough to find and rewrite the catalogue, the Info dictionary and the page
# objects.  Skia writes those as plain uncompressed dictionaries with a classic
# cross-reference table, which is why this can stay this small; anything else is
# rejected loudly rather than half-handled.
class Pdf:
    def __init__(self, path):
        with open(path, 'rb') as fh:
            self.buf = fh.read()
        if not self.buf.startswith(b'%PDF-'):
            fail('%s does not start with %%PDF- — not a PDF.' % path)
        self.offsets = {}
        self.trailer = ''
        self._read_xref()

    def _read_xref(self):
        m = None
        for m in re.finditer(rb'startxref\s+(\d+)', self.buf):
            pass
        if not m:
            fail('no startxref — the file is truncated or uses an unsupported layout.')
        start = int(m.group(1))
        seen = set()
        while start is not None and start not in seen:
            seen.add(start)
            if self.buf[start:start + 4] != b'xref':
                fail('cross-reference stream at byte %d is not a classic xref table.\n'
                     '  This script only handles the classic table Skia/Chromium writes.' % start)
            pos = start + 4
            while True:
                head = re.compile(rb'\s*(\d+)\s+(\d+)\s*').match(self.buf, pos)
                if not head:
                    break
                first, count = int(head.group(1)), int(head.group(2))
                pos = head.end()
                for i in range(count):
                    entry = self.buf[pos:pos + 20]
                    if entry[17:18] == b'n' and (first + i) not in self.offsets:
                        self.offsets[first + i] = int(entry[0:10])
                    pos += 20
            tm = re.compile(rb'\s*trailer\s*').match(self.buf, pos)
            if not tm:
                break
            tdict = self._dict_at(tm.end())
            if not self.trailer:
                self.trailer = tdict
            pm = re.search(r'/Prev\s+(\d+)', tdict)
            start = int(pm.group(1)) if pm else None

    def _dict_at(self, pos):
        """Return the balanced << ... >> starting at or after `pos`, as text."""
        i = self.buf.index(b'<<', pos)
        depth, j = 0, i
        while j < len(self.buf) - 1:
            two = self.buf[j:j + 2]
            if two == b'<<':
                depth += 1
                j += 2
            elif two == b'>>':
                depth -= 1
                j += 2
                if depth == 0:
                    return self.buf[i:j].decode('latin1')
            else:
                j += 1
        fail('unbalanced dictionary starting at byte %d.' % i)

    def enclosing_obj(self, pos):
        """Object number whose body contains byte `pos`, via the xref offsets."""
        if not hasattr(self, '_sorted'):
            self._sorted = sorted((off, num) for num, off in self.offsets.items())
        lo, hi = 0, len(self._sorted)
        while lo < hi:
            mid = (lo + hi) // 2
            if self._sorted[mid][0] <= pos:
                lo = mid + 1
            else:
                hi = mid
        return self._sorted[lo - 1][1] if lo else None

    def obj_dict(self, num):
        if num not in self.offsets:
            fail('object %d is not in the cross-reference table.' % num)
        off = self.offsets[num]
        head = re.compile(rb'\s*(\d+)\s+(\d+)\s+obj').match(self.buf, off)
        if not head or int(head.group(1)) != num:
            fail('object %d is not at the offset the xref claims (%d).' % (num, off))
        return self._dict_at(head.end())

    def ref(self, dct, key):
        m = re.search(r'/%s\s+(\d+)\s+\d+\s+R' % key, dct)
        return int(m.group(1)) if m else None


def page_objects(pdf, pages_num, seen=None):
    """Flatten /Pages -> /Kids into page object numbers, in document order."""
    seen = seen if seen is not None else set()
    if pages_num in seen:
        fail('the page tree contains a loop at object %d.' % pages_num)
    seen.add(pages_num)
    dct = pdf.obj_dict(pages_num)
    kids = re.search(r'/Kids\s*\[(.*?)\]', dct, re.S)
    if not kids:
        return [pages_num]
    out = []
    for num in (int(n) for n in re.findall(r'(\d+)\s+\d+\s+R', kids.group(1))):
        kid = pdf.obj_dict(num)
        out += page_objects(pdf, num, seen) if '/Type /Pages' in kid or '/Type/Pages' in kid else [num]
    return out


# ── Preflight ─────────────────────────────────────────────────────────────────
def preflight(pdf, src, icc_space, allow_colour_mismatch):
    """Everything that must be true BEFORE the file may wear a PDF/X label."""
    problems = []
    text = pdf.buf.decode('latin1')

    if '/Encrypt' in pdf.trailer:
        problems.append('the file is encrypted; PDF/X forbids encryption.')

    # Every font must be embedded — with ONE legitimate exception. Chromium's
    # Skia backend emits a Type 3 font whenever it has to draw glyphs as
    # procedures rather than as outlines, which is what the gold-foil gradient
    # on the two name lines forces. A Type 3 font's glyphs ARE content streams
    # (/CharProcs), so its descriptor correctly carries no /FontFile. Measured on
    # the archived press PDF: 46 descriptors, 44 with an embedded TrueType
    # subset, and the other 2 shared by 32 Type 3 fonts, all with /CharProcs.
    # Counting descriptors against /FontFile streams without that exemption
    # reports two non-existent unembedded fonts and blocks a good file.
    type3 = set()
    for m in re.finditer(r'/Subtype\s*/Type3\b', text):
        seg = text[m.start():text.find('endobj', m.start())]
        fd = re.search(r'/FontDescriptor\s+(\d+)\s+\d+\s+R', seg)
        if fd:
            type3.add(int(fd.group(1)))
    bare = []
    for m in re.finditer(r'/Type\s*/FontDescriptor', text):
        num = pdf.enclosing_obj(m.start())
        end = text.find('endobj', m.start())
        if not re.search(r'/FontFile\d?\b', text[m.start():end]) and num not in type3:
            name = re.search(r'/FontName\s*/([^\s/>]+)', text[m.start():end])
            bare.append(name.group(1) if name else 'object %s' % num)
    if bare:
        problems.append('%d font(s) referenced but not embedded: %s.'
                        % (len(bare), ', '.join(bare)))

    for forbidden in ('/OpenAction', '/JavaScript', '/Movie', '/Sound'):
        if forbidden in text:
            problems.append('the file contains %s, which PDF/X forbids.' % forbidden)

    if 'GTS_PDFXVersion' in text or '/OutputIntents' in text:
        problems.append('the file is already labelled PDF/X — relabelling would leave two '
                        'output intents. Start again from the unlabelled press PDF.')

    # Device colour has to live in the intent's space.  This is the check that
    # stops an RGB document being handed a CMYK intent and called conformant.
    rgb = len(re.findall(r'/DeviceRGB\b', text))
    cmyk = len(re.findall(r'/DeviceCMYK\b', text))
    wrong = ('DeviceRGB', rgb) if icc_space == 'CMYK' and rgb else \
            ('DeviceCMYK', cmyk) if icc_space == 'RGB' and cmyk else None
    if wrong and not allow_colour_mismatch:
        problems.append(
            '%d uses of %s, but the output intent is %s.\n'
            '    PDF/X requires device colour to be in the output intent\'s space. Attaching the\n'
            '    intent does not convert the file. The colour conversion is a separate, earlier\n'
            '    step and it is the printer\'s call how it is done (rendering intent, black\n'
            '    generation, total area coverage) — see the three questions in\n'
            '    docs/certificate-press-specification.md.\n'
            '    Ghostscript CAN do that conversion without destroying the artwork — measured on\n'
            '    this document, -dColorConversionStrategy=CMYK kept all 44 embedded font streams\n'
            '    and the live transparency, unlike -dPDFX which rasterised every page. Convert\n'
            '    first, then label with this script. Pass --allow-colour-mismatch only if the\n'
            '    printer has confirmed in writing that they want it labelled as it stands.'
            % (wrong[1], wrong[0], icc_space))

    if problems:
        sys.stderr.write('make-pdfx: %s did not pass preflight:\n' % os.path.basename(src))
        for p in problems:
            sys.stderr.write('  - ' + p + '\n')
        sys.exit(FAIL)


# ── XMP ───────────────────────────────────────────────────────────────────────
def xmp_packet(title, part, when, doc_id, instance_id, producer):
    # PDF/X-4 identification lives in XMP, not in the Info dictionary (which is
    # where X-1a and X-3 put it); this writes both, consistently, because older
    # preflight tools still look in Info.
    #
    # The title is the batch's file name and nothing else.  Student names, and
    # in particular Arabic names, are never reconstructed here: this script has
    # no business inventing one and no reliable source for one.
    stamp = when.strftime('%Y-%m-%dT%H:%M:%SZ')
    return (
        '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n'
        ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
        '  <rdf:Description rdf:about=""\n'
        '    xmlns:dc="http://purl.org/dc/elements/1.1/"\n'
        '    xmlns:xmp="http://ns.adobe.com/xap/1.0/"\n'
        '    xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/"\n'
        '    xmlns:pdf="http://ns.adobe.com/pdf/1.3/"\n'
        '    xmlns:pdfxid="http://www.npes.org/pdfx/ns/id/">\n'
        '   <dc:format>application/pdf</dc:format>\n'
        '   <dc:title><rdf:Alt><rdf:li xml:lang="x-default">%s</rdf:li></rdf:Alt></dc:title>\n'
        '   <xmp:CreateDate>%s</xmp:CreateDate>\n'
        '   <xmp:ModifyDate>%s</xmp:ModifyDate>\n'
        '   <xmp:MetadataDate>%s</xmp:MetadataDate>\n'
        '   <xmpMM:DocumentID>uuid:%s</xmpMM:DocumentID>\n'
        '   <xmpMM:InstanceID>uuid:%s</xmpMM:InstanceID>\n'
        '   <pdf:Producer>%s</pdf:Producer>\n'
        '   <pdf:Trapped>False</pdf:Trapped>\n'
        '   <pdfxid:GTS_PDFXVersion>%s</pdfxid:GTS_PDFXVersion>\n'
        '  </rdf:Description>\n'
        ' </rdf:RDF>\n'
        '</x:xmpmeta>\n'
        '<?xpacket end="r"?>\n'
        % (esc(title), stamp, stamp, stamp, doc_id, instance_id, esc(producer), part))


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def pdf_string(s):
    """A PDF literal string: escape the three characters that can unbalance it."""
    return '(' + s.replace('\\', r'\\').replace('(', r'\(').replace(')', r'\)') + ')'


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(add_help=True, description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('src', nargs='?', help='the finished press PDF')
    ap.add_argument('dst', nargs='?', help='where to write the labelled PDF/X')
    ap.add_argument('--icc', help='the printer\'s ICC output profile (REQUIRED)')
    ap.add_argument('--condition', help='OutputConditionIdentifier; defaults to the profile\'s '
                                        'own description tag')
    ap.add_argument('--part', default='x-4', help='PDF/X part (default x-4; see below)')
    ap.add_argument('--trim', default='%gx%g' % (TRIM_W_MM, TRIM_H_MM),
                    metavar='WxH', help='trim size in mm (default %(default)s)')
    ap.add_argument('--bleed', type=float, default=DEFAULT_BLEED_MM,
                    help='bleed in mm (default %(default)g — none was drawn)')
    ap.add_argument('--allow-colour-mismatch', action='store_true',
                    help='label even though device colour is not in the intent\'s space')
    args = ap.parse_args()

    # ── the refusal that matters ──────────────────────────────────────────────
    if not args.icc:
        sys.stderr.write("""make-pdfx: refusing — no ICC output profile supplied (--icc).

  A PDF/X file is a PDF plus an OUTPUT INTENT, and the output intent is the
  printer's ICC characterisation of their press, their paper and their ink.
  There is no default that is safe to guess and none is shipped in this repo:
  guessing one would produce a file that states, in machine-readable form, a
  printing condition nobody has agreed to.

  So this is blocked on the printer, not on the code. Ask them, in writing, for:

    1. THE ICC OUTPUT PROFILE they want the file prepared for
       (e.g. a FOGRA or GRACoL characterisation, or their own press profile).

    2. WHICH PDF/X PART they require — and ask about PDF/X-4 specifically.
       This artwork uses live transparency (drop shadows, fractional opacity,
       mix-blend-mode, CSS masks). PDF/X-1a and PDF/X-3 forbid it and force a
       flatten; the flatten measured here turned every page into a 300 DPI
       bitmap and destroyed all 11 embedded font subsets. PDF/X-4 permits it.

    3. MAXIMUM TOTAL AREA COVERAGE, and whether pure black must stay 100% K.
       The Code 128-C barcode is drawn in pure #000000 and must not be
       separated into a four-colour black.

  docs/certificate-press-specification.md has the measured numbers to send them.

  The day the .icc arrives this is one command:

    python3 scripts/make-pdfx.py --icc <their-profile.icc> \\
      dist/certificates/<batch>/SHRS-<STAGE>-<YEAR>-<FIRST>-<LAST>-press.pdf \\
      dist/certificates/<batch>/SHRS-<STAGE>-<YEAR>-<FIRST>-<LAST>-pdfx.pdf
""")
        sys.exit(REFUSE)

    if not args.src or not args.dst:
        refuse('an input PDF and an output path are both required.\n'
               '  usage: make-pdfx.py --icc <profile.icc> <in.pdf> <out.pdf>')

    part = args.part.strip().lower().replace('pdf/', '')
    if part in ('x-1a', 'x1a', 'x-3', 'x3'):
        refuse('this script cannot produce PDF/X-%s.\n'
               '  Those parts forbid live transparency, and this artwork is built on it. This\n'
               '  script does not flatten — it only labels — so an X-%s label here would be a\n'
               '  false claim of conformance. Flattening it anyway is what `gs -dPDFX` does, and\n'
               '  the result was a 300 DPI bitmap per page with every embedded font destroyed.\n'
               '  If the printer genuinely requires X-1a or X-3, the artwork has to be rebuilt\n'
               '  without transparency by a designer — it is not a conversion setting.'
               % (part.lstrip('x-'), part.lstrip('x-')))
    if part not in ('x-4', 'x4'):
        refuse('unknown PDF/X part %r. This script produces %s only.' % (args.part, PDFX_PART))

    icc, icc_n, icc_space, icc_desc = read_icc(args.icc)
    pdf = Pdf(args.src)
    preflight(pdf, args.src, icc_space, args.allow_colour_mismatch)

    try:
        tw, th = (float(v) for v in args.trim.lower().split('x'))
    except ValueError:
        refuse('--trim must look like 297x209.5 (millimetres).')
    if args.bleed < 0:
        refuse('--bleed cannot be negative.')

    root_num = pdf.ref(pdf.trailer, 'Root')
    info_num = pdf.ref(pdf.trailer, 'Info')
    if root_num is None:
        fail('the trailer has no /Root.')
    catalog = pdf.obj_dict(root_num)
    pages_num = pdf.ref(catalog, 'Pages')
    if pages_num is None:
        fail('the catalogue has no /Pages.')
    pages = page_objects(pdf, pages_num)
    if not pages:
        fail('the page tree is empty.')

    # Boxes, per page, from that page's own MediaBox: the trim is anchored to the
    # TOP of the page (see the geometry note at the top of this file), so y0 is
    # whatever is left over at the foot, not zero.
    boxes = {}
    for num in pages:
        m = re.search(r'/MediaBox\s*\[\s*([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s+([\d.+-]+)\s*\]',
                      pdf.obj_dict(num))
        if not m:
            fail('page object %d has no /MediaBox.' % num)
        mx0, my0, mx1, my1 = (float(v) for v in m.groups())
        trim = (mx0, my1 - th * PT_PER_MM, mx0 + tw * PT_PER_MM, my1)
        if trim[0] < mx0 - 1e-6 or trim[1] < my0 - 1e-6 or trim[2] > mx1 + 1e-6:
            fail('page object %d: a %gx%gmm trim does not fit inside its %g x %gpt MediaBox.'
                 % (num, tw, th, mx1 - mx0, my1 - my0))
        b = args.bleed * PT_PER_MM
        bleed = (trim[0] - b, trim[1] - b, trim[2] + b, trim[3] + b)
        if b and (bleed[0] < mx0 - 1e-6 or bleed[1] < my0 - 1e-6
                  or bleed[2] > mx1 + 1e-6 or bleed[3] > my1 + 1e-6):
            refuse('a %gmm bleed does not fit inside the page box of object %d.\n'
                   '  There is no artwork outside the trim to bleed with — the sheet was drawn\n'
                   '  edge to edge and stops there. A bleed has to be added to the artwork, not\n'
                   '  declared here.' % (args.bleed, num))
        boxes[num] = (trim, bleed)

    digest = hashlib.sha256(pdf.buf).hexdigest()
    doc_id, inst_id = digest[:32], digest[32:64]
    # Deterministic timestamp: the press file's own mtime, so relabelling the
    # same bytes twice produces the same PDF/X.
    when = datetime.fromtimestamp(os.path.getmtime(args.src), timezone.utc)
    title = os.path.basename(args.src)
    condition = args.condition or icc_desc or os.path.basename(args.icc)
    producer = 'SHRS make-pdfx.py (lossless incremental label; content untouched)'

    # ── build the incremental update ─────────────────────────────────────────
    size = int(re.search(r'/Size\s+(\d+)', pdf.trailer).group(1))
    icc_num, oi_num, meta_num = size, size + 1, size + 2
    new_size = size + 3

    icc_z = zlib.compress(icc, 9)
    parts, offsets = [], {}
    out = bytearray(pdf.buf)
    if not out.endswith(b'\n'):
        out += b'\n'

    def emit(num, body):
        offsets[num] = len(out)
        out.extend(('%d 0 obj\n' % num).encode('latin1'))
        out.extend(body if isinstance(body, bytes) else body.encode('latin1'))
        out.extend(b'\nendobj\n')

    emit(icc_num, ('<</N %d /Filter /FlateDecode /Length %d>>\nstream\n' % (icc_n, len(icc_z))
                   ).encode('latin1') + icc_z + b'\nendstream')
    emit(oi_num,
         '<</Type /OutputIntent /S /GTS_PDFX'
         '\n/OutputConditionIdentifier %s'
         '\n/OutputCondition %s'
         '\n/RegistryName (http://www.color.org)'
         '\n/Info %s'
         '\n/DestOutputProfile %d 0 R>>'
         % (pdf_string(condition), pdf_string(condition),
            pdf_string('%s, %s, %d components' % (condition, icc_space, icc_n)), icc_num))
    xmp = xmp_packet(title, PDFX_PART, when, doc_id, inst_id, producer).encode('utf-8')
    # XMP must not be compressed: a preflight tool has to be able to read it
    # without knowing the PDF's filters.
    emit(meta_num, b'<</Type /Metadata /Subtype /XML /Length %d>>\nstream\n' % len(xmp)
         + xmp + b'\nendstream')

    def reissue(num, insert):
        """Re-emit an existing object with `insert` spliced in after its `<<`."""
        dct = pdf.obj_dict(num)
        emit(num, '<<' + insert + dct[2:])

    for num in pages:
        (t, b) = boxes[num]
        reissue(num, '/TrimBox [%s]\n/BleedBox [%s]\n'
                % (' '.join('%.4f' % v for v in t), ' '.join('%.4f' % v for v in b)))
    reissue(root_num, '/Version %s\n/OutputIntents [%d 0 R]\n/Metadata %d 0 R\n'
            % (PDF_VERSION_NAME, oi_num, meta_num))
    if info_num is not None:
        reissue(info_num, '/Trapped /False\n/GTS_PDFXVersion %s\n' % pdf_string(PDFX_PART))
    else:
        info_num = new_size
        new_size += 1
        emit(info_num, '<</Trapped /False /GTS_PDFXVersion %s>>' % pdf_string(PDFX_PART))

    # Classic xref section: one subsection per contiguous run of object numbers.
    xref_at = len(out)
    runs, nums = [], sorted(offsets)
    for n in nums:
        if runs and n == runs[-1][-1] + 1:
            runs[-1].append(n)
        else:
            runs.append([n])
    out.extend(b'xref\n')
    for run in runs:
        out.extend(('%d %d\n' % (run[0], len(run))).encode('latin1'))
        for n in run:
            out.extend(('%010d 00000 n \n' % offsets[n]).encode('latin1'))
    prev = int(list(re.finditer(rb'startxref\s+(\d+)', pdf.buf))[-1].group(1))
    # PDF/X requires a file /ID; Skia does not write one, so it is minted here
    # from the digest of the input — deterministic, and it changes if the press
    # file changes.
    out.extend(('trailer\n<</Size %d\n/Root %d 0 R\n/Info %d 0 R\n/Prev %d\n/ID [<%s> <%s>]>>\n'
                'startxref\n%d\n%%%%EOF\n'
                % (new_size, root_num, info_num, prev, doc_id.upper(), inst_id.upper(), xref_at)
                ).encode('latin1'))

    tmp = args.dst + '.partial'
    with open(tmp, 'wb') as fh:
        fh.write(out)

    # ── verify what was actually written ─────────────────────────────────────
    check = Pdf(tmp)
    bad = []
    if len(page_objects(check, check.ref(check.obj_dict(check.ref(check.trailer, 'Root')),
                                         'Pages'))) != len(pages):
        bad.append('page count changed')
    for num in pages:
        d = check.obj_dict(num)
        if '/TrimBox' not in d:
            bad.append('page object %d has no /TrimBox' % num)
        if '/BleedBox' not in d:
            bad.append('page object %d has no /BleedBox' % num)
    cat = check.obj_dict(check.ref(check.trailer, 'Root'))
    for key in ('/OutputIntents', '/Metadata', '/Version'):
        if key not in cat:
            bad.append('the catalogue has no %s' % key)
    if '/Trapped' not in check.obj_dict(check.ref(check.trailer, 'Info')):
        bad.append('the Info dictionary has no /Trapped')
    if '/ID' not in check.trailer:
        bad.append('the trailer has no /ID')
    if check.buf[:len(pdf.buf)] != pdf.buf:
        bad.append('the original bytes were modified — the update was not incremental')
    if bad:
        os.unlink(tmp)
        fail('the labelled file failed its own verification:\n  - ' + '\n  - '.join(bad))

    os.replace(tmp, args.dst)
    print('make-pdfx: %s' % args.dst)
    print('  part            %s' % PDFX_PART)
    print('  output intent   %s (%s, %d components)' % (condition, icc_space, icc_n))
    print('  profile         %s, %d bytes embedded' % (args.icc, len(icc)))
    print('  pages           %d, TrimBox %gx%gmm, BleedBox +%gmm' % (len(pages), tw, th, args.bleed))
    print('  original bytes  unchanged (incremental update, %d bytes appended)'
          % (len(out) - len(pdf.buf)))
    print('\n  NOT a conformance certificate. Run the printer\'s preflight before release.')


if __name__ == '__main__':
    main()
