// Generates the DOCX edition of "The Constitution of Sultan Hanafi Royal
// Schools" (Draft v5.0) from docs/shrs-constitution-2026-draft.md — the
// markdown file is the source of truth; this script is a line-classifying
// transcriber (headings, tables, lettered sub-clauses, body paragraphs),
// not an independent drafting source.
//
// The Schedule of Standing Committees (Chapter XI) is an 8-column table
// that cannot render legibly on a portrait page, so it is placed in its
// own landscape section; the Article 94 appointment matrix stays portrait.
// The Table of Contents page numbers are hardcoded (TOC_ENTRIES below)
// rather than a live Word TOC field, because LibreOffice's headless
// PDF conversion does not evaluate TOC fields — verify page numbers
// against a fresh PDF render after any edit to the source markdown.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (docs/exports/) — regenerate rather than track
// the binary: `node scripts/generate-constitution-docx.js`.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  Header, Footer, PageNumber, PageBreak, VerticalAlign,
  Tab, TabStopType, LeaderType, ImageRun, PageOrientation,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'shrs-constitution-2026-draft.md');
const CREST = path.join(ROOT, 'assets', 'images', 'brand-mark.png');
const OUT_DIR = path.join(ROOT, 'docs', 'exports');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, 'SHRS-Constitution-Draft-v5.0.docx');

const GOLD = 'A9832E';
const NAVY = '1C2340';
const CHARCOAL = '2B2B2B';

// ---- Inline markdown -> TextRun[] ----
function parseInline(text, overrides = {}) {
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

function clausePara(text) {
  return new Paragraph({
    children: parseInline(text),
    spacing: { after: 100, line: 276 },
    indent: { left: 400 },
    alignment: AlignmentType.JUSTIFIED,
  });
}

function heading1(text, first) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: !first,
    spacing: { after: 240 },
  });
}

function heading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 160 },
  });
}

function main() {
  const raw = fs.readFileSync(SRC, 'utf8');
  const lines = raw.split('\n');

  const children = [];
  let firstHeading = true;
  let i = 0;
  let splitIndex = null;
  let landscapeChildren = null;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) { i++; continue; } // main title, handled on cover page
    if (line.trim() === '---') { i++; continue; }
    if (line.trim() === '') { i++; continue; }

    if (line.startsWith('## ')) {
      children.push(heading1(line.slice(3).trim(), firstHeading));
      firstHeading = false;
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      children.push(heading2(line.slice(4).trim()));
      i++;
      continue;
    }

    if (line.startsWith('|')) {
      // collect contiguous table block
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines
        .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
        .filter((cells, idx) => !(idx === 1 && cells.every((c) => /^-+$/.test(c))));
      const header = rows[0];
      const dataRows = rows.slice(1);
      const nCols = header.length;
      const isWide = nCols > 5;
      // Portrait content width = 12240 - 900 - 900 = 10440 DXA.
      // Landscape content width = 15840 - 900 - 900 = 14040 DXA.
      const totalWidth = isWide ? 14040 : 10440;
      const colWidth = Math.floor(totalWidth / nCols);
      const mkRow = (cells, isHeader) => new TableRow({
        tableHeader: isHeader,
        children: cells.map((c) => new TableCell({
          width: { size: colWidth, type: WidthType.DXA },
          shading: isHeader ? { type: ShadingType.CLEAR, color: 'auto', fill: NAVY } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 60, bottom: 60, left: 80, right: 80 },
          children: [new Paragraph({
            children: parseInline(c, isHeader
              ? { bold: true, color: 'FFFFFF', size: isWide ? 16 : 17 }
              : { size: isWide ? 16 : 17 }),
          })],
        })),
      });
      const table = new Table({
        width: { size: totalWidth, type: WidthType.DXA },
        columnWidths: header.map(() => colWidth),
        rows: [mkRow(header, true), ...dataRows.map((r) => mkRow(r, false))],
      });
      if (isWide) {
        splitIndex = children.length;
        landscapeChildren = [
          new Paragraph({
            text: 'Schedule of Board Standing Committees (Chapter XI, Article 97)',
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          table,
        ];
      } else {
        children.push(table);
        children.push(new Paragraph({ text: '', spacing: { after: 160 } }));
      }
      continue;
    }

    // sub-clauses (a) (b) (c)
    if (/^\([a-z0-9]+\)/i.test(line.trim())) {
      children.push(clausePara(line.trim()));
      i++;
      continue;
    }

    // ordinary paragraph (Article text, intro notes, drafting notes)
    children.push(bodyPara(line.trim()));
    i++;
  }

  // ---- Cover page ----
  const coverChildren = [];
  try {
    const crestBuf = fs.readFileSync(CREST);
    coverChildren.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1400, after: 300 },
      children: [new ImageRun({ data: crestBuf, transformation: { width: 96, height: 100 }, type: 'png' })],
    }));
  } catch (e) {
    coverChildren.push(new Paragraph({ text: '', spacing: { before: 1400 } }));
  }
  coverChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 100 },
      children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS', bold: true, size: 30, color: NAVY, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [new TextRun({ text: 'Royal College · Qur’an College · School of Islamic & Arabic Studies · Nursery & Primary School', italics: true, size: 20, color: CHARCOAL })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'THE CONSTITUTION', bold: true, size: 56, color: NAVY, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
      children: [new TextRun({ text: 'of Sultan Hanafi Royal Schools', size: 32, color: CHARCOAL, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'Draft v5.0', bold: true, size: 26, color: GOLD })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 700 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD },
      },
      children: [new TextRun({
        text: '  STATUS: DRAFT — NOT YET EFFECTIVE — PREPARED FOR ADOPTION BY THE BOARD OF GOVERNORS  ',
        bold: true, size: 20, color: 'B00020',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200 },
      children: [new TextRun({
        text: 'No provision of this draft is currently in force. It does not alter the live administrative system, any published page, or Policy GV-01 in its present form. Upon adoption by the Board of Governors under Chapter XVIII, this draft becomes the substantive content of GV-01 v3.0.',
        italics: true, size: 18, color: CHARCOAL,
      })],
    }),
  );
  coverChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- TOC page ----
  // Page numbers below are hand-verified against a rendered PDF (see
  // header comment). Re-verify after any edit to the source markdown
  // changes pagination.
  const TOC_ENTRIES = [
    ['CHAPTER I — FOUNDATIONAL PRINCIPLES', 3],
    ['CHAPTER II — THE FOUNDER & CHIEF EXECUTIVE OFFICER', 5],
    ['CHAPTER III — THE BOARD OF GOVERNORS', 8],
    ['CHAPTER IV — THE EXECUTIVE MANAGEMENT TEAM', 11],
    ['CHAPTER V — ACADEMIC LEADERSHIP', 12],
    ['CHAPTER VI — THE ACADEMIC COUNCIL', 13],
    ['CHAPTER VII — RELIGIOUS GOVERNANCE', 14],
    ['CHAPTER VIII — ADMINISTRATIVE AND INSTITUTIONAL OFFICES', 15],
    ['CHAPTER IX — ACADEMIC DEPARTMENTS', 17],
    ['CHAPTER X — STUDENT LEADERSHIP', 18],
    ['CHAPTER XI — COMMITTEES, COUNCILS, AND WORKING BODIES', 19],
    ['CHAPTER XII — THE SAFEGUARDING COMMITTEE', 26],
    ['CHAPTER XIII — APPOINTMENTS AND REMOVALS', 27],
    ['CHAPTER XIV — INSTITUTIONAL INDEPENDENCE AND INTEGRITY', 28],
    ['CHAPTER XV — FINANCIAL GOVERNANCE', 29],
    ['CHAPTER XVI — SUCCESSION', 30],
    ['CHAPTER XVII — INSTITUTIONAL CONTINUITY', 31],
    ['CHAPTER XVIII — CONSTITUTIONAL AMENDMENT, REVIEW, AND INTERPRETATION', 32],
    ['CHAPTER XIX — CEREMONIAL ORDER', 33],
    ['SCHEDULES', 34],
    ['DRAFTING NOTES — NOT PART OF THE CONSTITUTION', 35],
  ];
  coverChildren.push(
    new Paragraph({
      text: 'TABLE OF CONTENTS',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
    ...TOC_ENTRIES.map(([title, pageNum]) => new Paragraph({
      spacing: { after: 160 },
      tabStops: [{ type: TabStopType.RIGHT, position: 10440, leader: LeaderType.DOT }],
      children: [
        new TextRun({ text: title, size: 22, color: NAVY, bold: true }),
        new TextRun({ text: '\t', size: 22, color: NAVY, bold: true }),
        new TextRun({ text: String(pageNum), size: 22, color: NAVY, bold: true }),
      ],
    })),
    new Paragraph({ children: [new PageBreak()] }),
  );

  const makeHeader = () => new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'The Constitution of Sultan Hanafi Royal Schools — Draft v5.0 (Not Yet Effective)',
        size: 15, italics: true, color: '6B6B6B',
      })],
    })],
  });
  const makeFooter = () => new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Page ', size: 16, color: '6B6B6B' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '6B6B6B' }),
        new TextRun({ text: ' of ', size: 16, color: '6B6B6B' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: '6B6B6B' }),
      ],
    })],
  });

  const portraitPage = {
    size: { width: 12240, height: 15840 },
    margin: { top: 1080, bottom: 1080, left: 900, right: 900 },
  };
  const landscapePage = {
    size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE },
    margin: { top: 1080, bottom: 1080, left: 900, right: 900 },
  };

  const sections = [
    {
      properties: { page: portraitPage },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: [
        ...coverChildren,
        ...(splitIndex !== null ? children.slice(0, splitIndex) : children),
      ],
    },
  ];

  if (splitIndex !== null && landscapeChildren) {
    sections.push({
      properties: { page: landscapePage },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: landscapeChildren,
    });
    sections.push({
      properties: { page: portraitPage },
      headers: { default: makeHeader() },
      footers: { default: makeFooter() },
      children: children.slice(splitIndex),
    });
  }

  const doc = new Document({
    creator: 'Sultan Hanafi Royal Schools — Office of the Board of Governors (drafting support)',
    title: 'The Constitution of Sultan Hanafi Royal Schools — Draft v5.0',
    description: 'Draft constitutional instrument prepared for adoption by the Board of Governors. Not yet effective.',
    styles: {
      default: {
        document: { run: { font: 'Cambria', size: 22, color: CHARCOAL } },
      },
      paragraphStyles: [
        {
          id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { bold: true, size: 30, color: NAVY, font: 'Cambria' },
          paragraph: {
            spacing: { before: 120, after: 240 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 6 } },
          },
        },
        {
          id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
          run: { bold: true, size: 24, color: NAVY, font: 'Cambria' },
          paragraph: { spacing: { before: 200, after: 160 } },
        },
      ],
    },
    sections,
  });

  Packer.toBuffer(doc).then((buf) => {
    fs.writeFileSync(OUT, buf);
    console.log('Wrote', OUT, buf.length, 'bytes');
  });
}

main();
