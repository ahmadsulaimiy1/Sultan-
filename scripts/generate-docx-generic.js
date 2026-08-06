// Generic markdown -> flagship-styled DOCX transcriber, for governance
// publication-programme documents that don't need the Constitution
// script's Part/Chapter/landscape-table machinery (Board Handbook,
// Governance Handbook, Organisational Structure Manual, and the two
// registers). Mirrors generate-constitution-docx.js's visual language
// (Cambria body, gold/navy/charcoal palette, justified body text) so
// the whole publication set reads as one family.
//
// Mermaid code fences (```mermaid ... ```) are rendered to PNG via
// mermaid-cli (mmdc, installed on demand: `npm install -g
// @mermaid-js/mermaid-cli`) and embedded as centered images — DOCX has
// no native mermaid renderer, so this is the only way the diagrams
// survive into the editable Word edition rather than becoming inert
// code blocks.
//
// Usage: node scripts/generate-docx-generic.js <source.md> <Output Name> <Title>
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, ImageRun, VerticalAlign,
} = require('docx');
const sizeOf = (() => {
  try { return require('image-size'); } catch { return null; }
})();

const [, , SRC_ARG, OUT_NAME, TITLE_ARG, VERSION_ARG, STATUS_ARG, DOC_ID_ARG] = process.argv;
if (!SRC_ARG || !OUT_NAME) {
  console.error('Usage: node scripts/generate-docx-generic.js <source.md> <Output Name> [Title] [Version] [Status] [DocumentID]');
  process.exit(1);
}
const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, SRC_ARG);
const OUT_DIR = path.join(ROOT, 'docs', 'exports');
const DIAGRAM_DIR = path.join(OUT_DIR, '.diagrams');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(DIAGRAM_DIR)) fs.mkdirSync(DIAGRAM_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, `${OUT_NAME}.docx`);
const TITLE = TITLE_ARG || OUT_NAME;
const VERSION = VERSION_ARG || '1.0';
const STATUS = STATUS_ARG || 'Internal Governance Publication — Board Submission Draft; not yet Board-adopted';
const DOC_ID = DOC_ID_ARG || `SHRS-PUB-${OUT_NAME.toUpperCase()}-2026`;

const GOLD = 'A9832E';
const NAVY = '1C2340';
const CHARCOAL = '2B2B2B';
const CREAM = 'FBF6EC';

const PUPPETEER_CONFIG = path.join(ROOT, '.puppeteer-config.json');
fs.writeFileSync(PUPPETEER_CONFIG, JSON.stringify({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
}));

function parseInline(text, overrides = {}) {
  text = text.replace(/ {2,}/g, ' ');
  const tokens = text.split(/(\*\*.+?\*\*|`.+?`|\*[^*]+?\*)/g).filter((t) => t.length > 0);
  return tokens.map((tok) => {
    if (tok.startsWith('**') && tok.endsWith('**')) {
      return new TextRun({ text: tok.slice(2, -2), bold: true, ...overrides });
    }
    if (tok.startsWith('`') && tok.endsWith('`')) {
      return new TextRun({ text: tok.slice(1, -1), font: 'Consolas', size: 20, ...overrides });
    }
    if (tok.startsWith('*') && tok.endsWith('*') && !tok.startsWith('**')) {
      return new TextRun({ text: tok.slice(1, -1), italics: true, ...overrides });
    }
    return new TextRun({ text: tok, ...overrides });
  });
}

function bodyPara(text, opts = {}) {
  return new Paragraph({
    children: parseInline(text),
    spacing: { after: 160, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    ...opts,
  });
}

function heading1(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 } });
}
function heading2(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 140 } });
}
function heading3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3, spacing: { before: 180, after: 100 } });
}

function bulletPara(text, level = 0) {
  return new Paragraph({
    children: parseInline(text),
    bullet: { level },
    spacing: { after: 80, line: 264 },
  });
}
function numberedPara(text, num) {
  return new Paragraph({
    children: [new TextRun({ text: `${num}. `, bold: true }), ...parseInline(text)],
    spacing: { after: 80, line: 264 },
    indent: { left: 300 },
  });
}

function makeTable(rows) {
  const colCount = rows[0].length;
  // Weight columns by mean cell length (min 12% each) so prose-heavy
  // columns get room and short code/date columns stop forcing
  // character-level word breaks in their neighbours.
  const weights = Array.from({ length: colCount }, (_, ci) => {
    const lens = rows.map((r) => (r[ci] || '').length);
    const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
    const max = Math.max(...lens);
    // Blend mean with the longest cell so a single long status/dependency
    // entry still buys its column room even among many short rows.
    return Math.max(mean * 0.6 + max * 0.4, 6);
  });
  const wsum = weights.reduce((a, b) => a + b, 0);
  const minW = Math.floor(9360 * 0.12);
  let widths = weights.map((w) => Math.max(minW, Math.floor(9360 * w / wsum)));
  const overshoot = widths.reduce((a, b) => a + b, 0) - 9360;
  widths[widths.indexOf(Math.max(...widths))] -= overshoot;
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((cells, ri) => new TableRow({
      cantSplit: true,
      tableHeader: ri === 0,
      children: cells.map((cell, ci) => new TableCell({
        width: { size: widths[ci], type: WidthType.DXA },
        shading: ri === 0 ? { type: ShadingType.CLEAR, fill: NAVY } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          children: parseInline(cell, ri === 0
            ? { bold: true, color: 'FFFFFF', size: 18 }
            : { size: 18, color: CHARCOAL }),
          spacing: { after: 0 },
        })],
      })),
    })),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'C9B074' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'C9B074' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'C9B074' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'C9B074' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E5DAC0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E5DAC0' },
    },
  });
}

// Restrained colophon-style key/value table for the Institutional Publication
// Information page — label column in small-caps gold, value column in ordinary
// body text, hairline bottom rule only (no cell shading, no grid), mirroring
// the .imprint-table treatment used on the Governance Charter's own imprint page.
function imprintTable(rows) {
  const labelWidth = 2600;
  const valueWidth = 6760;
  const hairline = { style: BorderStyle.SINGLE, size: 3, color: 'C9B074' };
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [labelWidth, valueWidth],
    rows: rows.map(([label, value]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: labelWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 140, bottom: 140, left: 0, right: 200 },
          borders: { top: noBorder, left: noBorder, right: noBorder, bottom: hairline },
          children: [new Paragraph({
            children: [new TextRun({ text: label, bold: true, smallCaps: true, size: 15, color: GOLD, font: 'Cambria' })],
            spacing: { after: 0 },
          })],
        }),
        new TableCell({
          width: { size: valueWidth, type: WidthType.DXA },
          verticalAlign: VerticalAlign.TOP,
          margins: { top: 140, bottom: 140, left: 0, right: 0 },
          borders: { top: noBorder, left: noBorder, right: noBorder, bottom: hairline },
          children: [new Paragraph({
            children: parseInline(value, { size: 18, color: CHARCOAL }),
            spacing: { after: 0 },
            alignment: AlignmentType.LEFT,
          })],
        }),
      ],
    })),
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    },
  });
}

// Brand-matched mermaid theme: ivory nodes, gold borders, espresso text —
// the stock lavender/yellow defaults were the single strongest template
// smell in the rendered governance DOCX suite.
const MERMAID_THEME = path.join(DIAGRAM_DIR, 'shrs-mermaid-theme.json');
fs.writeFileSync(MERMAID_THEME, JSON.stringify({
  theme: 'base',
  themeVariables: {
    primaryColor: '#F7EEDF', primaryTextColor: '#2A2016', primaryBorderColor: '#C6A15B',
    lineColor: '#3B2A1D', secondaryColor: '#EAE0C0', tertiaryColor: '#FFFFFF',
    clusterBkg: '#EAE0C0', clusterBorder: '#C6A15B',
    fontFamily: 'Cambria, Georgia, serif', fontSize: '18px',
    edgeLabelBackground: '#F7EEDF',
  },
}));

let diagramCounter = 0;
function renderMermaidToPng(mermaidSrc) {
  diagramCounter += 1;
  const base = path.join(DIAGRAM_DIR, `${OUT_NAME}-${diagramCounter}`);
  const mmdPath = `${base}.mmd`;
  const pngPath = `${base}.png`;
  fs.writeFileSync(mmdPath, mermaidSrc);
  try {
    execSync(
      `mmdc -i "${mmdPath}" -o "${pngPath}" -p "${PUPPETEER_CONFIG}" -b "#F7EEDF" -w 1400 --scale 2 -c "${MERMAID_THEME}"`,
      { stdio: 'pipe' },
    );
    return pngPath;
  } catch (e) {
    console.error(`Mermaid render failed for diagram ${diagramCounter}:`, e.message);
    return null;
  }
}

function imageParagraph(pngPath) {
  const buf = fs.readFileSync(pngPath);
  let w = 600, h = 400;
  if (sizeOf) {
    try {
      const dim = sizeOf(buf);
      const maxW = 620;
      w = Math.min(maxW, dim.width);
      h = Math.round(dim.height * (w / dim.width));
    } catch { /* keep defaults */ }
  }
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 160, after: 160 },
    children: [new ImageRun({ data: buf, transformation: { width: w, height: h }, type: 'png' })],
  });
}

// ---- Markdown block parser ----
function parseMarkdown(md) {
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  let firstH1Skipped = false;
  while (i < lines.length) {
    let line = lines[i];

    if (line.startsWith('```mermaid')) {
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i += 1; }
      i += 1; // skip closing ```
      blocks.push({ type: 'mermaid', src: buf.join('\n') });
      continue;
    }
    if (line.startsWith('```')) {
      // generic code fence — skip (not expected much in these docs)
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) i += 1;
      i += 1;
      continue;
    }
    if (line.startsWith('| ')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) { tableLines.push(lines[i]); i += 1; }
      const rows = tableLines
        .filter((l) => !/^\|[\s-:|]+\|$/.test(l))
        .map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
      if (rows.length) blocks.push({ type: 'table', rows });
      continue;
    }
    if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^(#{1,3})/)[1].length;
      const text = line.replace(/^#{1,3}\s/, '').trim();
      if (level === 1 && !firstH1Skipped) { firstH1Skipped = true; i += 1; continue; } // title handled separately
      blocks.push({ type: `h${level}`, text });
      i += 1;
      continue;
    }
    const isContinuation = (l) => l.trim() !== '' && !/^#{1,3}\s/.test(l)
      && !l.startsWith('|') && !l.startsWith('```')
      && !/^\s*[-*]\s/.test(l) && !/^\s*\d+\.\s/.test(l) && l.trim() !== '---';
    if (/^\s*[-*]\s/.test(line)) {
      const level = /^\s\s/.test(line) ? 1 : 0;
      const buf = [line.replace(/^\s*[-*]\s/, '').trim()];
      i += 1;
      while (i < lines.length && isContinuation(lines[i])) { buf.push(lines[i].trim()); i += 1; }
      blocks.push({ type: 'bullet', text: buf.join(' '), level });
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const num = line.match(/^\s*(\d+)\./)[1];
      const buf = [line.replace(/^\s*\d+\.\s/, '').trim()];
      i += 1;
      while (i < lines.length && isContinuation(lines[i])) { buf.push(lines[i].trim()); i += 1; }
      blocks.push({ type: 'numbered', text: buf.join(' '), num });
      continue;
    }
    if (line.trim() === '' || line.trim() === '---' || /^\*\(/.test(line.trim())) {
      i += 1;
      continue;
    }
    // body paragraph — accumulate until blank line
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() !== '' && !/^#{1,3}\s/.test(lines[i])
      && !lines[i].startsWith('|') && !lines[i].startsWith('```')
      && !/^\s*[-*]\s/.test(lines[i]) && !/^\s*\d+\.\s/.test(lines[i])) {
      buf.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: 'p', text: buf.join(' ').trim() });
  }
  return blocks;
}

async function main() {
  const md = fs.readFileSync(SRC, 'utf8');
  const blocks = parseMarkdown(md);
  const children = [];

  // Title page — crest, no running header/footer (titlePage section flag)
  try {
    const crestBuf = fs.readFileSync(path.join(ROOT, 'assets', 'images', 'brand-mark.png'));
    children.push(new Paragraph({
      spacing: { before: 1600, after: 240 },
      alignment: AlignmentType.CENTER,
      children: [new ImageRun({ data: crestBuf, transformation: { width: 86, height: 90 }, type: 'png' })],
    }));
  } catch { children.push(new Paragraph({ spacing: { before: 1600 }, children: [] })); }
  children.push(new Paragraph({
    spacing: { after: 100 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS', bold: true, size: 22, color: GOLD, font: 'Cambria' })],
  }));
  children.push(new Paragraph({
    spacing: { after: 300 },
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 12 } },
    children: [new TextRun({ text: '', size: 2 })],
  }));
  children.push(new Paragraph({
    spacing: { after: 200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: TITLE, bold: true, size: 44, color: NAVY, font: 'Cambria' })],
  }));
  children.push(new Paragraph({
    spacing: { after: 2000 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: 'Governance Publication Programme — 2026-08-04 Amendment Edition',
      italics: true, size: 22, color: CHARCOAL,
    })],
  }));
  // Institutional Publication Information page — the visually designed
  // ownership/imprint page every flagship publication carries, matching the
  // Governance Charter's own imprint page in content and restraint.
  children.push(new Paragraph({
    pageBreakBefore: true,
    spacing: { after: 40 },
    children: [new TextRun({ text: "PUBLISHER'S IMPRINT", bold: true, smallCaps: true, size: 16, color: GOLD, font: 'Cambria' })],
  }));
  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: 'Institutional Publication Information', bold: true, size: 30, color: NAVY, font: 'Cambria' })],
  }));
  children.push(new Paragraph({
    spacing: { after: 260 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 1 } },
    children: [new TextRun({ text: '', size: 2 })],
    indent: { right: 8500 },
  }));
  children.push(imprintTable([
    ['Institution', 'Sultan Hanafi Royal Schools'],
    ['Publisher', "Sultan Hanafi Royal Schools, acting through the Office of the Founder & Head of Schools / Administrator"],
    ['Address', '15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu, Lagos State, Nigeria'],
    ['Website', 'shroyalschools.com'],
    ['Email', 'info@shroyalschools.com'],
    ['Telephone', '+234 (0) 807 374 7650 · +234 (0) 807 058 6860'],
    ['Copyright', '© Sultan Hanafi Royal Schools. All rights reserved within the Institution.'],
    ['Classification', 'Internal governance publication of Sultan Hanafi Royal Schools'],
    ["Archival Statement", "Prepared for permanent retention in the Institution's governance archive"],
    ['Printing Specification', 'Set for US Letter (8.5in × 11in) digital archival distribution and print-on-demand reproduction'],
    ["Rights Statement", "For the internal use of the Board of Governors, the Head of Schools / Administrator, and the Institution's governance offices; not for external distribution without the Board's written authorisation"],
    ['Document Title', TITLE],
    ['Document ID', DOC_ID],
    ['Version', VERSION],
    ['Status', STATUS],
    ['Related Instrument', 'The Governance Charter of Sultan Hanafi Royal Schools (Policy GV-01 v3.0, Edition VII)'],
    ['Institution Founded', 'July 2016 · Ikorodu, Lagos State, Nigeria'],
  ]));
  children.push(new Paragraph({ pageBreakBefore: true, children: [] }));

  for (const block of blocks) {
    switch (block.type) {
      case 'h1': children.push(heading1(block.text)); break;
      case 'h2': children.push(heading2(block.text)); break;
      case 'h3': children.push(heading3(block.text)); break;
      case 'table': children.push(makeTable(block.rows)); children.push(new Paragraph({ spacing: { after: 200 }, children: [] })); break;
      case 'bullet': children.push(bulletPara(block.text, block.level)); break;
      case 'numbered': children.push(numberedPara(block.text, block.num)); break;
      case 'mermaid': {
        const png = renderMermaidToPng(block.src);
        if (png) children.push(imageParagraph(png));
        else children.push(bodyPara('*[Diagram could not be rendered — see the HTML/PDF edition or the source markdown for the mermaid definition.]*'));
        break;
      }
      case 'p': children.push(bodyPara(block.text)); break;
      default: break;
    }
  }

  const doc = new Document({
    creator: 'Sultan Hanafi Royal Schools — Office of the Board of Governors (drafting support)',
    title: TITLE,
    description: `${TITLE} — governance publication programme, 2026-08-04 amendment edition.`,
    styles: {
      default: {
        document: { run: { font: 'Cambria', size: 22, color: CHARCOAL } },
        heading1: { run: { font: 'Cambria', size: 32, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 200 } } },
        heading2: { run: { font: 'Cambria', size: 26, bold: true, color: NAVY }, paragraph: { spacing: { before: 240, after: 140 } } },
        heading3: { run: { font: 'Cambria', size: 23, bold: true, color: GOLD }, paragraph: { spacing: { before: 180, after: 100 } } },
      },
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, bottom: 1440, left: 1350, right: 1350 },
        },
        titlePage: true,
      },
      headers: {
        first: new Header({ children: [new Paragraph({ children: [] })] }),
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: TITLE, size: 16, color: 'A9832E', italics: true })],
          })],
        }),
      },
      footers: {
        first: new Footer({ children: [new Paragraph({ children: [] })] }),
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'Sultan Hanafi Royal Schools — Page ', size: 16, color: CHARCOAL, font: 'Cambria' }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: CHARCOAL, font: 'Cambria' }),
              new TextRun({ text: ' of ', size: 16, color: CHARCOAL, font: 'Cambria' }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: CHARCOAL, font: 'Cambria' }),
            ],
          })],
        }),
      },
      children,
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Wrote ${OUT} ${buffer.length} bytes`);
}

main().catch((e) => { console.error(e); process.exit(1); });
