// Generates the DOCX edition of "The Constitution of Sultan Hanafi Royal
// Schools" (Draft v6.0) from docs/shrs-constitution-2026-draft.md — the
// markdown file is the source of truth; this script is a line-classifying
// transcriber (headings, tables, lettered sub-clauses, body paragraphs),
// not an independent drafting source.
//
// v6.0 adds a Part-level structure (## PART ... lines) above Chapters.
// Parts render as their own divider-style page — larger type, a gold
// rule above and below, and generous surrounding space — distinct from
// the Chapter heading style, so the structure itself signals seniority.
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
const OUT = path.join(OUT_DIR, 'SHRS-Governance-Charter.docx');

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

function heading1(text, pageBreakBefore) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore,
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

// Part-level divider: "PART I — FOUNDATIONS" -> a small gold eyebrow
// ("PART I") over a large rule-bounded title ("FOUNDATIONS"), with wide
// surrounding space so the page reads as a divider, not a chapter.
function headingPart(text, pageBreakBefore) {
  const dashIdx = text.indexOf('—');
  const eyebrow = dashIdx !== -1 ? text.slice(0, dashIdx).trim() : text;
  const title = dashIdx !== -1 ? text.slice(dashIdx + 1).trim() : '';
  return [
    new Paragraph({
      pageBreakBefore,
      spacing: { before: 2600, after: 140 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: eyebrow, bold: true, size: 24, color: GOLD, font: 'Cambria',
      })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 16 },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD, space: 16 },
      },
      children: [new TextRun({
        text: title || eyebrow, bold: true, size: 48, color: NAVY, font: 'Cambria',
      })],
    }),
    new Paragraph({ text: '', spacing: { after: 2400 } }),
  ];
}

function main() {
  const raw = fs.readFileSync(SRC, 'utf8');
  const lines = raw.split('\n');

  const children = [];
  let firstHeading = true;
  // True until the very first paragraph is pushed into `children`. That
  // paragraph carries pageBreakBefore so it reliably starts a new page
  // after the Table of Contents — LibreOffice can otherwise render a
  // spurious blank page when the TOC content fills its page exactly and
  // a separate break-only paragraph is used instead (see main()).
  let isFirstBodyItem = true;
  let i = 0;
  let splitIndex = null;
  let landscapeChildren = null;
  // True for every line before the first '## ' heading — the front-matter
  // paragraphs there (currently just "Submission.") are already rendered
  // by hand on the copyright page above; without this flag they also fell
  // through to the generic body-paragraph branch below and were printed a
  // second time, as a stray paragraph ahead of the Constitutional
  // Proclamation, which is exactly the kind of "not part of the operative
  // text but not obviously excluded" clutter this round's directive
  // objected to.
  let inMeta = true;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('# ')) { i++; continue; } // main title, handled on cover page
    if (line.trim() === '---') { i++; continue; }
    if (line.trim() === '') { i++; continue; }
    if (inMeta && !line.startsWith('## ')) { i++; continue; }
    inMeta = false;

    if (line.startsWith('## PART ')) {
      const pageBreakBefore = isFirstBodyItem ? true : !firstHeading;
      children.push(...headingPart(line.slice(3).trim(), pageBreakBefore));
      firstHeading = false;
      isFirstBodyItem = false;
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      const pageBreakBefore = isFirstBodyItem ? true : !firstHeading;
      children.push(heading1(line.slice(3).trim(), pageBreakBefore));
      firstHeading = false;
      isFirstBodyItem = false;
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      children.push(heading2(line.slice(4).trim()));
      isFirstBodyItem = false;
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
      isFirstBodyItem = false;
      continue;
    }

    // sub-clauses (a) (b) (c)
    if (/^\([a-z0-9]+\)/i.test(line.trim())) {
      children.push(clausePara(line.trim()));
      isFirstBodyItem = false;
      i++;
      continue;
    }

    // ordinary paragraph (Article text, intro notes, drafting notes)
    children.push(bodyPara(line.trim(), isFirstBodyItem ? { pageBreakBefore: true } : {}));
    isFirstBodyItem = false;
    i++;
  }

  // ---- Half-title, title page, copyright/imprint page ----
  // Matches the flagship HTML/PDF edition's front-matter sequence (see
  // that edition's generator and the Editorial Record for why): a plain
  // half-title, a fuller title page, then a copyright page carrying the
  // Submission statement in ordinary imprint-page prose rather than a
  // boxed alarm-coloured banner on the cover itself — the cover no
  // longer carries any draft-status marking of its own.
  const coverChildren = [];
  coverChildren.push(
    new Paragraph({ text: '', spacing: { before: 2600 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [new TextRun({ text: 'THE GOVERNANCE CHARTER', size: 26, color: NAVY, font: 'Cambria', characterSpacing: 40 })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );
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
      children: [new TextRun({ text: 'THE GOVERNANCE CHARTER', bold: true, size: 56, color: NAVY, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 500 },
      children: [new TextRun({ text: 'of Sultan Hanafi Royal Schools', size: 32, color: CHARCOAL, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: 'Seventh Edition', bold: true, size: 24, color: GOLD, font: 'Cambria' })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [new TextRun({ text: 'Ikorodu · Lagos State · Nigeria', size: 18, color: CHARCOAL })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );
  coverChildren.push(
    new Paragraph({ text: '', spacing: { before: 3200 } }),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun({ text: '© Sultan Hanafi Royal Schools. All rights reserved within the Institution.', size: 17, color: CHARCOAL })],
    }),
    new Paragraph({
      spacing: { after: 260 },
      children: [new TextRun({ text: 'Seventh Edition. Previously issued, through six prior editions, as the Constitution of Sultan Hanafi Royal Schools.', size: 17, color: CHARCOAL })],
    }),
    new Paragraph({
      spacing: { after: 260 },
      children: [
        new TextRun({ text: 'Certification. ', bold: true, size: 17, color: CHARCOAL }),
        new TextRun({
          text: 'This Governance Charter has been prepared under the authority of the Founder & Chief Executive Officer of Sultan Hanafi Royal Schools and is submitted to the Board of Governors for its consideration and adoption pursuant to Article 151 (Chapter XVIII). Upon adoption by resolution of the Board of Governors, it shall become the governing instrument of Sultan Hanafi Royal Schools and the substantive content of Policy GV-01.',
          size: 17, color: CHARCOAL,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: 'Sultan Hanafi Royal Schools · Royal College · Qur’an College · School of Islamic & Arabic Studies · Nursery & Primary School', size: 16, color: CHARCOAL })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Founded December 2017 · Ikorodu, Lagos State, Nigeria', size: 16, color: CHARCOAL })],
    }),
  );
  coverChildren.push(new Paragraph({ children: [new PageBreak()] }));

  // ---- TOC page ----
  // Page numbers below are hand-verified against a rendered PDF (see
  // header comment). Re-verify after any edit to the source markdown
  // changes pagination. `level: 0` entries (Parts, Schedules, Drafting
  // Notes, and the two front-matter items) render bold/gold/full-width;
  // `level: 1` entries (Chapters) render indented beneath their Part, so
  // the Table of Contents itself shows the Part/Chapter hierarchy.
  const TOC_ENTRIES = [
    ['CONSTITUTIONAL PROCLAMATION', 5, 0],
    ['PREAMBLE', 6, 0],
    ['PART I — FOUNDATIONS', 7, 0],
    ['CHAPTER I — FOUNDATIONAL PRINCIPLES', 8, 1],
    ['PART II — GOVERNING AND EXECUTIVE AUTHORITY', 12, 0],
    ['CHAPTER II — THE FOUNDER & CHIEF EXECUTIVE OFFICER', 13, 1],
    ['CHAPTER III — THE BOARD OF GOVERNORS', 18, 1],
    ['CHAPTER IV — THE EXECUTIVE MANAGEMENT TEAM', 23, 1],
    ['PART III — ACADEMIC AND RELIGIOUS AUTHORITY', 24, 0],
    ['CHAPTER V — ACADEMIC LEADERSHIP', 25, 1],
    ['CHAPTER VI — THE ACADEMIC COUNCIL', 26, 1],
    ['CHAPTER VII — RELIGIOUS GOVERNANCE', 27, 1],
    ['PART IV — INSTITUTIONAL STRUCTURE', 30, 0],
    ['CHAPTER VIII — ADMINISTRATIVE AND INSTITUTIONAL OFFICES', 31, 1],
    ['CHAPTER IX — ACADEMIC DEPARTMENTS', 33, 1],
    ['CHAPTER X — STUDENT LEADERSHIP', 34, 1],
    ['PART V — COMMITTEES, ACCOUNTABILITY, AND SAFEGUARDING', 35, 0],
    ['CHAPTER XI — COMMITTEES, COUNCILS, AND WORKING BODIES', 36, 1],
    ['CHAPTER XII — THE SAFEGUARDING COMMITTEE', 43, 1],
    ['CHAPTER XIII — APPOINTMENTS AND REMOVALS', 44, 1],
    ['CHAPTER XIV — INSTITUTIONAL INDEPENDENCE AND INTEGRITY', 45, 1],
    ['PART VI — FINANCE AND CONTINUITY', 46, 0],
    ['CHAPTER XV — FINANCIAL GOVERNANCE', 47, 1],
    ['CHAPTER XVI — SUCCESSION', 48, 1],
    ['CHAPTER XVII — INSTITUTIONAL CONTINUITY', 49, 1],
    ['PART VII — CONSTITUTIONAL SUPREMACY AND GENERAL PROVISIONS', 50, 0],
    ['CHAPTER XVIII — CONSTITUTIONAL AMENDMENT, REVIEW, AND INTERPRETATION', 51, 1],
    ['CHAPTER XIX — CEREMONIAL ORDER', 52, 1],
    ['CHAPTER XX — INSTRUMENTS MADE UNDER THIS CHARTER', 53, 1],
    ['CHAPTER XXI — INSTITUTIONAL IDENTITY, RECORDS, AND SAFEGUARDS OF OFFICE', 54, 1],
    ['CHAPTER XXII — TRANSITIONAL AND SAVING PROVISIONS', 55, 1],
    ['CERTIFICATE OF ADOPTION AND EXECUTION', 56, 0],
    ['SCHEDULES', 57, 0],
  ];
  coverChildren.push(
    new Paragraph({
      text: 'TABLE OF CONTENTS',
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 300 },
    }),
    ...TOC_ENTRIES.map(([title, pageNum, level]) => new Paragraph({
      spacing: { after: level === 0 ? 200 : 120, before: level === 0 ? 160 : 0 },
      indent: { left: level === 1 ? 400 : 0 },
      tabStops: [{ type: TabStopType.RIGHT, position: 10440, leader: LeaderType.DOT }],
      children: [
        new TextRun({
          text: title, size: level === 0 ? 22 : 20,
          color: level === 0 ? GOLD : NAVY, bold: level === 0,
        }),
        new TextRun({
          text: '\t', size: level === 0 ? 22 : 20,
          color: level === 0 ? GOLD : NAVY, bold: level === 0,
        }),
        new TextRun({
          text: String(pageNum), size: level === 0 ? 22 : 20,
          color: level === 0 ? GOLD : NAVY, bold: level === 0,
        }),
      ],
    })),
    // No trailing break-only paragraph here: the first paragraph of the
    // body content (below) carries pageBreakBefore instead, so it starts
    // the next page reliably even when the TOC fills its page exactly —
    // see the isFirstBodyItem comment in main().
  );

  // Decluttered to match the flagship edition's own running header fix
  // (see the Editorial Record): repeating "Draft v7.0 (Not Yet
  // Effective)" on every page added no protective value over stating it
  // once, clearly, on the copyright page and in the Certificate of
  // Adoption — it only crowded the header line.
  const makeHeader = () => new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: 'The Governance Charter of Sultan Hanafi Royal Schools',
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
    title: 'The Governance Charter of Sultan Hanafi Royal Schools — Seventh Edition',
    description: 'Constitutional instrument prepared under the authority of the Founder & Chief Executive Officer, submitted to the Board of Governors for consideration and adoption.',
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
