// Generates the DOCX edition of "The Flagship Institutional Publication —
// Brand Book & Educational Review 2026" from the same real content as
// prospectus/definitive/index.html — kept as a separate script rather
// than derived from the HTML because DOCX is a flow format (no absolute
// positioning, CSS grid, or background-image overlays), so the Word
// edition is deliberately simpler in layout while using identical real
// copy, images, and honest pending-markers/verification notes.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-definitive-docx.js`.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  Header, Footer, PageNumber, VerticalAlign,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'images') + path.sep;
const OUT_DIR = path.join(ROOT, 'prospectus', 'exports');
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Definitive-Flagship-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/campus-hero.jpg': [1080, 748],
  'gallery/campus-building.jpg': [1400, 934],
  'gallery/campus-gate.jpg': [1400, 934],
  'gallery/college-hall.jpg': [1600, 721],
  'gallery/chemistry-laboratory.jpg': [1400, 934],
  'gallery/biology-laboratory.jpg': [1400, 934],
  'gallery/quran-recitation-1.jpg': [1600, 721],
  'gallery/quran-recitation-2.jpg': [1600, 721],
  'gallery/basic-technology-workshop-1.jpg': [1400, 934],
  'gallery/basic-technology-workshop-2.jpg': [1400, 934],
  'gallery/boarding-dining.jpg': [1400, 934],
  'gallery/basic-school-classroom.jpg': [1040, 780],
  'gallery/spelling-competition.jpg': [1280, 960],
  'gallery/commissioning-day-1.jpg': [1400, 1867],
  'gallery/commissioning-day-2.jpg': [1400, 1867],
  'gallery/recitation-assembly-1.jpg': [1400, 1400],
  'gallery/recitation-assembly-2.jpg': [1400, 1400],
  'gallery/recitation-assembly-3.jpg': [1400, 1400],
  'gallery/ict-computer-laboratory.jpg': [2248, 1500],
  'gallery/islamic-prayer-hall.jpg': [1040, 780],
  'leadership/founder-ceo.jpg': [607, 900],
  'leadership/imam-ahmad-sulaimiy.jpg': [900, 1390],
  'leadership/shaykh-abubakr-solah.jpg': [900, 1600],
  'crest-full.png': [700, 623],
  'brand-mark.png': [152, 160],
};

function img(relPath, widthPx) {
  const [w, h] = DIM[relPath];
  const height = Math.round((widthPx * h) / w);
  return new ImageRun({
    data: fs.readFileSync(IMG + relPath),
    type: relPath.endsWith('.png') ? 'png' : 'jpg',
    transformation: { width: widthPx, height },
  });
}

const NAVY = '3B2A1D', NAVY_DEEP = '221709', GOLD = 'C6A15B', GOLD_BRIGHT = 'E9CE8A';
const CRIMSON = '7C1F2E', PARCHMENT = 'EAE0C0', INK_SOFT = '6B6255';

const HEAD_FONT = 'Cambria';
const BODY_FONT = 'Calibri';

function eyebrow(text) {
  return new Paragraph({ spacing: { after: 80 },
    children: [new TextRun({ text: text.toUpperCase(), font: HEAD_FONT, size: 16, color: GOLD, characterSpacing: 40, bold: true })] });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 40, color: NAVY, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 24, color: NAVY })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21, color: '2A2016', ...opts })] });
}
function lede(text) {
  return new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text, font: 'Constantia', italics: true, size: 26, color: NAVY })] });
}
function caption(text) {
  return new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text, font: BODY_FONT, size: 16, color: INK_SOFT, italics: true })] });
}
function verifyNote(text) {
  return new Paragraph({ spacing: { before: 100, after: 200 },
    children: [new TextRun({ text: 'Verification note: ' + text, font: BODY_FONT, size: 16, color: CRIMSON, italics: true })] });
}
function figurePending(text) {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, font: BODY_FONT, italics: true, size: 19, color: CRIMSON })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// Elegant substitute for missing photography — a large brand-coloured
// monogram badge, the same visual idiom used for the roster/value
// letters, not a "photography pending" placeholder.
function iconPanel(letter, label, note) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: PARCHMENT },
      margins: { top: 260, bottom: 260, left: 200, right: 200 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: letter, font: HEAD_FONT, size: 56, bold: true, color: NAVY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: HEAD_FONT, size: 16, bold: true, color: NAVY, characterSpacing: 20 })] }),
        ...(note ? [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: note, font: BODY_FONT, size: 15, color: INK_SOFT })] })] : []),
      ],
    })] })],
  });
}

function dataPanel(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [5000, 5000],
    borders: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, insideVertical: { style: BorderStyle.NONE } },
    rows: rows.map(([label, value]) => new TableRow({ children: [
      new TableCell({ width: { size: 5000, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: PARCHMENT }, margins: { top: 120, bottom: 120, left: 160, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), font: HEAD_FONT, size: 15, color: INK_SOFT })] })] }),
      new TableCell({ width: { size: 5000, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: PARCHMENT }, margins: { top: 120, bottom: 120, left: 80, right: 160 },
        children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: value, font: BODY_FONT, size: 20, bold: true, color: NAVY })] })] }),
    ] })),
  });
}

// Mirrors the HTML edition's .stat-bar-quad — a row of bold standalone
// figures.
function statQuad(cells) {
  const w = Math.floor(10000 / cells.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: cells.map(() => w),
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' } },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      margins: { top: 200, bottom: 200, left: 100, right: 100 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 40, bold: true, color: NAVY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: label.toUpperCase(), font: HEAD_FONT, size: 13, color: INK_SOFT, characterSpacing: 10 })] }),
      ],
    })) })],
  });
}

// Mirrors the HTML edition's .support-row / .pros-list — a labelled
// strip of real supporting facts.
function supportRow(cells) {
  const w = Math.floor(10000 / cells.length);
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: cells.map(() => w),
    borders: { top: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' } },
    rows: [new TableRow({ children: cells.map(([title, text]) => new TableCell({
      width: { size: w, type: WidthType.DXA },
      margins: { top: 160, bottom: 160, left: 120, right: 120 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: title.toUpperCase(), font: HEAD_FONT, size: 15, bold: true, color: GOLD })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text, font: BODY_FONT, size: 16, color: '2A2016' })] }),
      ],
    })) })],
  });
}

// Bordered quote box with a labelled attribution — mirrors the HTML
// edition's .quote-box.
function quoteBox(text, who) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, left: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 4, color: GOLD } },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: PARCHMENT },
      margins: { top: 220, bottom: 220, left: 260, right: 260 },
      children: [
        new Paragraph({ children: [new TextRun({ text: '“' + text + '”', font: 'Constantia', italics: true, size: 25, color: NAVY })] }),
        ...(who ? [new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: who.toUpperCase(), font: HEAD_FONT, size: 15, bold: true, color: GOLD })] })] : []),
      ],
    })] })],
  });
}

function diagramRow(steps, fill = PARCHMENT, textColor = NAVY) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: steps.map(() => Math.floor(10000 / steps.length)),
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: steps.map(s => new TableCell({
      width: { size: Math.floor(10000 / steps.length), type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill },
      margins: { top: 160, bottom: 160, left: 80, right: 80 },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: s.split('\n').flatMap((line, i) =>
        i === 0 ? [new TextRun({ text: line, font: HEAD_FONT, size: 15, bold: true, color: textColor })]
                 : [new TextRun({ text: line, font: HEAD_FONT, size: 15, bold: true, color: textColor, break: 1 })]
      ) })],
    })) })],
  });
}

function awardsTable(rows) {
  const header = new TableRow({ tableHeader: true, children: ['Class', '1st Position', '2nd Position', '3rd Position'].map(t =>
    new TableCell({ width: { size: 2500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: NAVY }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: t.toUpperCase(), font: HEAD_FONT, size: 14, bold: true, color: GOLD_BRIGHT })] })] })) });
  const body_rows = rows.map((r, i) => new TableRow({ children: r.map((cell, ci) =>
    new TableCell({ width: { size: 2500, type: WidthType.DXA }, shading: { type: ShadingType.CLEAR, fill: i % 2 === 1 ? PARCHMENT : 'FFFFFF' }, margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, font: BODY_FONT, size: 17, bold: ci === 0 })] })] })) }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2500, 2500, 2500, 2500],
    borders: { top: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, bottom: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, left: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, right: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9C89A' } },
    rows: [header, ...body_rows],
  });
}

function rosterRow(name, role, cred) {
  return [
    new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: name, font: HEAD_FONT, size: 22, color: NAVY, bold: true })] }),
    new Paragraph({ children: [new TextRun({ text: role.toUpperCase(), font: HEAD_FONT, size: 15, color: GOLD, bold: true })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: cred, font: 'Constantia', italics: true, size: 18, color: INK_SOFT })] }),
  ];
}

// Numbered governance-level row, for the full Board-to-Class-Captain
// governance spread — mirrors the HTML edition's .gov-tier.
function govTier(num, title, desc, items) {
  const out = [
    new Paragraph({ spacing: { before: 180 }, children: [
      new TextRun({ text: `LEVEL ${num}  `, font: HEAD_FONT, size: 15, color: GOLD, bold: true, characterSpacing: 10 }),
      new TextRun({ text: title, font: HEAD_FONT, size: 22, color: NAVY, bold: true }),
    ] }),
  ];
  if (desc) out.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: desc, font: BODY_FONT, size: 18, color: INK_SOFT, italics: true })] }));
  if (items && items.length) out.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: items.join(' · '), font: BODY_FONT, size: 19, color: '2A2016' })] }));
  return out;
}

function deptItem(title, courses) {
  return [
    new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: title, font: HEAD_FONT, size: 20, color: NAVY, bold: true })] }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: courses, font: BODY_FONT, size: 17, color: INK_SOFT })] }),
  ];
}

const sections = [];

// Luxury double-rule frame — wraps cover / back-cover content in a
// bordered single-cell table so the printed page reads as a designed
// frame rather than text floating on a blank page.
function coverFrame(children) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, left: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 8, color: GOLD } },
    rows: [new TableRow({ children: [new TableCell({
      margins: { top: 500, bottom: 500, left: 400, right: 400 },
      children,
    })] })],
  });
}

// ============ COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 300 }, children: [img('crest-full.png', 130)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS · NIGERIA', font: HEAD_FONT, size: 17, color: GOLD, bold: true, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'The Flagship Institutional Publication', font: HEAD_FONT, size: 52, bold: true, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Brand Book & Educational Review 2026', font: 'Constantia', italics: true, size: 28, color: INK_SOFT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'ACADEMIC EXCELLENCE · ISLAMIC SCHOLARSHIP · GLOBAL LEADERSHIP', font: HEAD_FONT, size: 15, color: INK_SOFT, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700 }, children: [new TextRun({ text: 'Est. July 2016 · Ikorodu, Lagos State, Nigeria', font: BODY_FONT, size: 16, color: INK_SOFT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 800 }, children: [new TextRun({ text: '2026 · Word Edition', font: BODY_FONT, size: 16, color: INK_SOFT })] }),
    ]),
    pageBreak(),
  ],
});

const B = [];

// ============ INSTITUTIONAL PUBLICATION INFORMATION ============
B.push(eyebrow("Publisher's Imprint"), h1('Institutional Publication Information'));
B.push(dataPanel([
  ['Institution', 'Sultan Hanafi Royal Schools'],
  ['Publisher', 'Sultan Hanafi Royal Schools, acting through the Office of the Founder & Head of Schools / Administrator'],
  ['Address', '15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu, Lagos State, Nigeria'],
  ['Website', 'shroyalschools.com'],
  ['Email', 'info@shroyalschools.com'],
  ['Telephone', '+234 (0) 807 374 7650 · +234 (0) 807 058 6860'],
  ['Copyright', '© Sultan Hanafi Royal Schools. All rights reserved within the Institution.'],
  ['Classification', 'Public institutional publication of Sultan Hanafi Royal Schools.'],
  ["Archival Statement", "Retained in the Institution's publications archive; superseded editions remain on record."],
  ['Printing Specification', 'Set for A4 (210mm × 297mm) digital distribution and print-on-demand reproduction.'],
  ["Rights Statement", "May be shared unaltered for admissions and public-information purposes; not for modification or commercial redistribution without the Institution's written authorisation."],
  ['Document Title', 'Sultan Hanafi Royal Schools — The Flagship Institutional Publication'],
  ['Document ID', 'SHRS-PUB-DEFIN-2026-001'],
  ['Edition', 'Brand Book & Educational Review 2026'],
  ['Related Instrument', 'The Governance Charter of Sultan Hanafi Royal Schools (Policy GV-01 v3.0, Edition VII)'],
  ['Institution Founded', 'July 2016 · Ikorodu, Lagos State, Nigeria'],
]));
B.push(pageBreak());

// ============ DEDICATION ============
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600, after: 200 }, children: [new TextRun({ text: 'A DEDICATION', font: HEAD_FONT, size: 16, color: GOLD, bold: true, characterSpacing: 40 })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 }, children: [new TextRun({ text: 'This institution bears the name of', font: 'Constantia', italics: true, size: 26, color: '2A2016' })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Anofi Aliu Akano', font: 'Constantia', italics: true, bold: true, size: 30, color: GOLD })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'a man who believed that education was the one gift no circumstance could take away.', font: 'Constantia', italics: true, size: 24, color: '2A2016' })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'He served with distinction at the Nigeria Ports Authority. He gave everything for the education of his sons. He passed away before witnessing what they would build in his honour.', font: BODY_FONT, size: 19, color: INK_SOFT })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'This school is the monument he deserved.', font: BODY_FONT, size: 20, color: NAVY, bold: true })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300 }, children: [new TextRun({ text: 'IN MEMORIAM · ANOFI ALIU AKANO', font: HEAD_FONT, size: 14, color: GOLD, characterSpacing: 20 })] }));
B.push(pageBreak());

// ============ DIRECTOR'S MESSAGE ============
B.push(eyebrow('In His Own Words'), h1('A School Built on Sacrifice'));
B.push(new Paragraph({ children: [img('leadership/founder-ceo.jpg', 180)] }));
B.push(caption('Zakariya Olanrewaju Anofi — Founder & Head of Schools/Administrator. BSc Oxford Brookes · MSc Heriot-Watt · Fellow, ACCA UK · Fellow, ICAN.'));
B.push(lede('Education has been the great liberator of our family. This school is my most deliberate act of gratitude.'));
B.push(body('It is my profound honour to welcome you to Sultan Hanafi Royal Schools — conceived not as a commercial venture, but as a sacred promise to the memory of my father, Anofi Aliu Akano, who worked at the Nigeria Ports Authority with diligence and love, and understood that education was the one gift no circumstance could take away.'));
B.push(body('My father passed away while my brother and I were completing our National Youth Service. From that grief came clarity: the most meaningful tribute was a living institution bearing his name.'));
B.push(body('This institution is open to all — all faiths, all backgrounds, all genders — because excellence does not discriminate. We ask only that every family who joins us commits to the pursuit of the extraordinary.'));
B.push(quoteBox('Together, let us embark on a journey where every child discovers not only what they know, but who they are called to become.', 'Zakariya Olanrewaju Anofi'));
B.push(pageBreak());

B.push(eyebrow('A Vision for Nigeria'), h1('Building the Leaders of Tomorrow'));
B.push(body('When I imagine what Sultan Hanafi Royal Schools must become in the next decade, I see not merely a school, but a forge — a place where raw potential is refined into genuine excellence.'));
B.push(body('Nigeria needs institutions that refuse mediocrity. SULTAN prepares students for leadership, for scholarship, for faith, for global citizenship.'));
B.push(new Paragraph({ children: [img('gallery/campus-building.jpg', 460)] }));
B.push(caption('The Sultan Hanafi Royal Schools campus · Ikorodu, Lagos.'));
B.push(body('Since 2016, Sultan Hanafi Royal Schools has taken children from the Imowonla community and given them access to the kind of education that was previously available only to the most privileged families in Nigeria.'));
B.push(body('Today, that dream is becoming a national story. The commissioning of the institution by the Executive Governor of Oyo State, the achievement of Ministry Registration with Lagos State, and the sitting of our inaugural BECE cohort are proof of concept.'));
B.push(pageBreak());

// ============ HERITAGE & TIMELINE ============
B.push(eyebrow('Our Story'), h1('A School Born of Conviction'));
B.push(body("Sultan Hanafi Royal Schools was born of conviction — the conviction of one man that the most powerful thing he could do was to build an institution that educated others the way his father had sacrificed to educate him."));
B.push(new Paragraph({ children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(caption('15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu.'));
B.push(quoteBox('Sultan Hanafi Royal Schools stands as a blueprint for how education can be a vehicle for transformative social change within marginalised communities.', 'Punch Newspaper · November 2025'));
B.push(h2('A Living Timeline'));
[['2016', 'Sultan Hanafi Royal Schools officially registered — a hybrid institution combining secular education with authentic Islamic learning, serving the Imowonla community in Ikorodu, Lagos State.'],
 ['2021', 'Sultan Hanafi Royal College established. Junior and Senior Secondary programmes (JSS 1–3 and SSS 1–3) launched for students from age ten.'],
 ['2022', "School of Islamic and Arabic Studies and the Qur'an College formalised, delivering Saudi Arabian curriculum programmes with internationally recognised Ijazah certification."],
 ['2024', 'Inaugural Annual Ramadan Qur\'an Competition held at the Royal College Auditorium. The ALA Endowment Prize established by Mr Lukman Anofi.'],
 ['2025', 'Distinguished commissioning ceremony attended by Engr. Seyi Makinde, Executive Governor of Oyo State.'],
 ['2026', 'Royal College passes Registration Stage with the Lagos State Ministry of Education. Inaugural BECE cohort sits national examinations. Governance constitutional amendment establishes the Board of Governors and formally recognises the Sultan Hanafi Online & Distance Learning School as the institution\'s fifth school.']]
  .forEach(([year, text]) => {
    B.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: year, font: HEAD_FONT, size: 24, color: GOLD, bold: true })] }));
    B.push(body(text));
  });
B.push(pageBreak());

// ============ VISION, MISSION & VALUES ============
B.push(eyebrow('Our Guiding Philosophy'), h1('One Vision. One Mission.'));
B.push(quoteBox('To be recognised as a leading institution that excels in knowledge dissemination and character building — creating a lasting positive impact wherever our presence is felt.', 'Our Vision'));
B.push(new Paragraph({ spacing: { before: 160 } }));
B.push(quoteBox('To provide a holistic education — imparting both Islamic and secular knowledge through rigorous research, instilling ethical behaviour, and contributing to a secure, informed, and progressive society.', 'Our Mission'));
B.push(h2('Three Pillars of Excellence'));
B.push(diagramRow(['Cognitive Excellence', 'Affective Formation', 'Psychomotor Development'], PARCHMENT, NAVY));
B.push(h2('Our Core Values — SULTAN'));
[['S', 'Scholarship', 'Academic rigour, love of learning, and the pursuit of knowledge as a lifelong vocation.'],
 ['U', 'Unity', 'Welcoming all faiths, nationalities, and backgrounds into one extraordinary community.'],
 ['L', 'Leadership', 'Cultivating the next generation of moral, visionary, and globally capable leaders.'],
 ['T', 'Trustworthiness', 'Honesty, accountability, and integrity in every interaction and every decision.'],
 ['A', 'Aspiration', 'Inspiring every student to reach beyond the expected, towards the extraordinary.'],
 ['N', 'Nobility', 'Dignity, grace, and the highest standards of conduct — in and beyond the classroom.']]
  .forEach(([letter, t, d]) => { B.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: `${letter} — ${t}`, font: HEAD_FONT, size: 21, color: NAVY, bold: true })] })); B.push(body(d)); });
B.push(pageBreak());

// ============ THE CLEVER FRAMEWORK ============
B.push(eyebrow('Six Values. One Character.'), h1('The CLEVER Framework'));
B.push(lede('At Sultan Hanafi Royal Schools, values are not aspirational statements on a wall. They are the lived architecture of every classroom interaction.'));
B.push(diagramRow(['C — Creativity', 'L — Leadership', 'E — Engagement'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
B.push(diagramRow(['V — Versatility', 'E — Ethical Behaviour', 'R — Reliability'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(supportRow([
  ['Open to All Faiths & Backgrounds', 'Welcoming students of all faiths, backgrounds, and nationalities, both male and female.'],
  ['Three Domains of Excellence', 'Cognitive, Affective, and Psychomotor development in every student.'],
]));
B.push(pageBreak());

// ============ FIVE SCHOOLS ============
B.push(eyebrow('An Integrated Institution'), h1('Five Schools. One Vision.'));
B.push(dataPanel([
  ['School 01 — Basic School', 'Ages 2–10, day format, Est. 2017'],
  ['School 02 — Royal College', 'Ages 10+, JSS 1–3 & SSS 1–3, Est. 2021'],
  ['School 03 — School of Islamic and Arabic Studies', 'Saudi Arabian Curriculum, weekday & weekend'],
  ["School 04 — Qur'an College", 'Hifz Programme, 24–36 months, day & boarding, Ijazah'],
  ['School 05 — Online & Distance Learning School', 'Newly established 2026, headship vacant, no students or curriculum yet'],
]));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(statQuad([['5', 'Schools'], ['2016', 'Founded'], ['7', 'Departments'], ['6', 'Year Groups']]));
B.push(pageBreak());

// ============ BASIC SCHOOL ============
B.push(eyebrow('School 01 — Ages 2–10'), h1('Basic School'));
B.push(new Paragraph({ children: [img('gallery/basic-school-classroom.jpg', 460)] }));
B.push(lede("Where every child's journey begins — with wonder, warmth, and the foundation of a lifetime's love of learning."));
B.push(body('Sultan Hanafi Nursery and Primary School is not merely where children begin their academic careers — it is where they discover who they are. Our play-based curriculum honours the developmental science of early childhood.'));
[['Crèche — Ages 2–3', 'Nurturing care in a secure, home-like environment, with caregivers trained in early childhood development.'],
 ['Nursery — Ages 3–5', 'Play-based learning woven with numeracy, literacy, and Islamic values.'],
 ['Primary — Ages 5–10', 'National curriculum enriched with entrepreneurship, financial literacy, and digital fluency.']]
  .forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 20, color: NAVY, bold: true })] })); B.push(body(d)); });
B.push(pageBreak());

// ============ SECULAR COLLEGE ============
B.push(eyebrow('School 02 — Ages 10 & Above'), h1('Sultan Hanafi Royal College'));
B.push(new Paragraph({ children: [img('gallery/chemistry-laboratory.jpg', 460)] }));
B.push(statQuad([['7', 'Academic Departments'], ['2021', 'Year Founded'], ['6', 'Year Groups']]));
B.push(body('Sultan Hanafi Royal College stands as one of Lagos State\'s most distinctive secondary institutions, serving students aged ten and above across JSS 1–3 and SSS 1–3.'));
B.push(quoteBox('The calibre of teachers here is outstanding — skilled, certified, professional educators genuinely invested in each child\'s future.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018'));
B.push(iconPanel('M', 'Ministry Approval', 'May 2026 — Sultan Hanafi Royal College achieves the Registration Stage with the Lagos State Ministry of Education.'));
B.push(pageBreak());

// ============ ACADEMIC PATHWAYS ============
B.push(eyebrow('Academic Pathway'), h1('From Foundation to University'));
B.push(lede('Sultan Hanafi Royal College prepares students not just for examinations, but for the full journey of academic life.'));
B.push(h2('Seven Departments of Academic Excellence'));
[['Languages', 'English · Yoruba · French · Hausa · Chinese (Planned)'],
 ['Mathematics & Digital Sciences', 'Mathematics · Further Maths · Computer Studies · Data Processing · Coding'],
 ['Humanities', 'Geography · History · Government · Civic Education · Art · Literature'],
 ['Science & Technology', 'Biology · Physics · Chemistry · Agricultural Science · Food & Nutrition · PHE'],
 ['Commerce & Management', 'Financial Accounting · Commerce · Economics · Bookkeeping · Marketing'],
 ['Arabic Sciences', 'Arabic · Nahwu & Sarfu · Balaghah · Al-Adab Al-Arabi · Al-Insha'],
 ['Islamic Sciences', 'Fiqh · Tawhid · Sirah · Tajwid · Hadith · Tafsir']]
  .forEach(([t, c]) => deptItem(t, c).forEach(p => B.push(p)));
B.push(h2('Academic Pathway'));
B.push(diagramRow(['Entry — Age 10+', 'JSS 1–3', 'BECE', 'SSS 1–3', 'WAEC/NECO', 'University'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(supportRow([
  ['Integrated Islamic Education', 'Islamic Sciences and Arabic taught by qualified Shuyukh alongside the full academic curriculum.'],
  ['STEM Innovation', 'Physics, Chemistry, and Biology labs. Coding and Data Processing from JSS 1.'],
]));
B.push(pageBreak());

// ============ ISLAMIC & QUR'AN EXCELLENCE ============
B.push(eyebrow("Schools 03 & 04 — Sacred Excellence"), h1("Islamic & Qur'an Excellence"));
B.push(new Paragraph({ children: [img('gallery/islamic-prayer-hall.jpg', 460)] }));
B.push(h2('Academic Resources & Curriculum Materials'));
B.push(body('Sultan Hanafi Royal Schools employs a carefully selected blend of educational resources drawn from: Nigerian National Curriculum requirements; International best-practice educational materials; Saudi Arabian educational resources; Established Arabic and Islamic scholarship texts; SHRS proprietary publications and institutional learning materials. For Arabic Language, Islamic Studies, and Qur\'an Studies, many of the textbooks utilised originate from Saudi Arabia and other respected centres of Islamic scholarship, complemented by SHRS-developed resources designed specifically for our students. This combination ensures academic rigour, authentic Islamic learning, structured language acquisition, and curriculum continuity across all programmes.'));
B.push(caption('The Academic Resource Ecosystem — Six Sources, One Integrated Framework'));
B.push(diagramRow(['1\nNational\nCurriculum', '2\nInternational\nStandards', '3\nSaudi Educational\nResources', '4\nSHRS\nPublications', '5\nArabic Language\nResources', '6\nIslamic Scholarship\nResources'], NAVY, GOLD_BRIGHT));
B.push(h2('School of Islamic and Arabic Studies'));
B.push(dataPanel([['Weekday Programme', 'Mon–Wed · 2–6pm'], ['Weekend Programme', 'Sat & Sun · 9am–3pm']]));
B.push(h2("Sultan Hanafi Qur'an College"));
B.push(body("24–36 month programme · Day & boarding · Certified Ijazah. A full-immersion journey through complete memorisation of the Noble Qur'an, alongside Tajwid, the Sciences of the Qur'an, Classical Arabic, and Islamic moral formation. Ages 9–16. Graduates receive Ijazat — formal scholarly certifications globally recognised in Qur'anic and Islamic sciences."));
B.push(new Paragraph({ spacing: { before: 120 }, children: [img('gallery/quran-recitation-2.jpg', 460)] }));
B.push(pageBreak());

// ============ THE SULTAN HANAFI JOURNEY ============
B.push(eyebrow('One Child · One Continuous Journey'), h1('The Sultan Hanafi Journey'));
B.push(lede("From a toddler's first day in Nursery to a graduate stepping into university, every stage of a child's education at Sultan Hanafi connects to the next — a single, deliberate pathway, not a series of disconnected years."));
govTier(1, 'Nursery (Stage 1 · Ages 2–5)', "Where every child's journey begins — play-based learning woven with numeracy, literacy, and Islamic values from the very first day.", ['Crèche', 'Nursery', 'Islamic Values', 'Play-Based Learning']).forEach(p => B.push(p));
govTier(2, 'Primary (Stage 2 · Ages 5–10)', 'National curriculum enriched with entrepreneurship, financial literacy, and digital fluency — the foundation for every pathway ahead.', ['National Curriculum', 'Numeracy & Literacy', 'Digital Fluency']).forEach(p => B.push(p));
govTier(3, 'Sultan Hanafi Royal College (Stage 3 · Ages 10+)', 'A rigorous integrated curriculum across seven departments — JSS 1–3 and SSS 1–3 — where academic excellence, Islamic grounding, and modern pedagogy converge.', ['7 Departments', 'JSS 1–3', 'SSS 1–3']).forEach(p => B.push(p));
govTier(4, "Sultan Hanafi Qur'an College (Stage 4 · Ages 9–16, Parallel Track)", 'A full-immersion 24–36 month programme — complete memorisation of the Noble Qur\'an, Tajwid, and the Sciences of the Qur\'an, culminating in a certified Ijazah.', ['Hifz Programme', 'Day & Boarding', 'Certified Ijazah']).forEach(p => B.push(p));
B.push(pageBreak());
govTier(5, 'School of Islamic and Arabic Studies (Stage 5 · Weekday & Weekend, Parallel Track)', 'Running alongside every other stage of the journey — carefully selected Saudi Arabian resources and SHRS-developed materials build authentic Islamic learning and structured Arabic language acquisition.', ['Weekday Programme', 'Weekend Programme']).forEach(p => B.push(p));
govTier(6, 'Leadership & Character Development (Stage 6 · Every Year Group)', 'Guided by the CLEVER framework and a structured student leadership pathway — from Student Representatives to School Prefects to Class Captains to Student Clubs — every student is mentored to lead.', ['The CLEVER Framework', 'Student Representatives', 'Prefects', 'Class Captains', 'Student Clubs']).forEach(p => B.push(p));
govTier(7, 'Graduation & Beyond (Stage 7 · Beyond SHRS)', 'BECE, WAEC, and NECO examinations mark the culmination of the Royal College years — opening the door to university and higher education, nationally and internationally.', ['BECE', 'WAEC / NECO', 'University & Higher Education']).forEach(p => B.push(p));
B.push(quoteBox("Nursery → Primary → Royal College → Qur'an College → School of Islamic and Arabic Studies → Leadership & Character → Graduation — one ecosystem, walked by every Sultan Hanafi child.", ''));
B.push(pageBreak());

// ============ CAMPUS & FACILITIES ============
B.push(eyebrow('Sultan Hanafi Royal Schools · Ikorodu, Lagos State, Nigeria'), h1('A Campus of Distinction'));
B.push(lede('Every space communicates, without words, that the highest standard is not optional — it is simply how we operate.'));
B.push(pageBreak());

B.push(eyebrow('Environments Built for Excellence'), h1('Every Space Purposeful.'));
B.push(new Paragraph({ children: [img('gallery/basic-technology-workshop-1.jpg', 220), new TextRun({ text: '  ' }), img('gallery/chemistry-laboratory.jpg', 220)] }));
B.push(new Paragraph({ spacing: { before: 160 }, children: [img('gallery/college-hall.jpg', 220), new TextRun({ text: '  ' }), img('gallery/ict-computer-laboratory.jpg', 220)] }));
B.push(caption('Basic Technology Workshop · Advanced Science Laboratories · The School Studio · ICT & Computer Laboratory'));
B.push(supportRow([
  ['STEM Innovation', 'Science labs · Technology workshop'],
  ['Creative Studios', 'CCA room · Food & nutrition'],
  ['Health & Wellbeing', 'Sick Bay · Prayer facilities'],
  ['Boarding Facilities', 'Residential accommodation, ages 9–16'],
]));
B.push(pageBreak());

B.push(eyebrow('The Complete Campus'), h1('The Sultan Experience'));
B.push(new Paragraph({ children: [img('gallery/biology-laboratory.jpg', 220), new TextRun({ text: '  ' }), img('gallery/boarding-dining.jpg', 220)] }));
B.push(new Paragraph({ spacing: { before: 160 }, children: [img('gallery/spelling-competition.jpg', 220)] }));
B.push(caption('Physics & Biology Laboratories · Boarding & Dining Hall · Student Achievement'));
[['The Leadership Experience', 'Structured opportunities to lead through debate, classroom responsibilities, and community initiatives.'],
 ['The Character Experience', 'The CLEVER values are the lived culture of every corridor.'],
 ['The Spiritual Experience', 'Islamic values woven into every dimension — from morning routines to Qur\'anic recitation.'],
 ['The Innovation Experience', 'Entrepreneurial thinking, financial literacy, coding, and data reasoning across all year groups.'],
 ['The Royal Learning Experience', 'An integrated Nigerian and Saudi Arabian curriculum enriched with international best practice.'],
 ['The Future Leaders Programme', 'Public speaking, debate, cultural arts, and creative performance.']]
  .forEach(([t, d]) => deptItem(t, d).forEach(p => B.push(p)));
B.push(pageBreak());

// ============ LEADERSHIP OF DISTINCTION ============
B.push(eyebrow('The People Behind the Vision'), h1('Leadership of Distinction'));
B.push(quoteBox('Every member of the Sultan Hanafi teaching faculty is recruited against the highest professional standards — PhDs, MEds, PGDEs, specialist certifications, and TRCN registration.', 'A Faculty of Excellence'));
B.push(h2('Management Team'));
B.push(new Paragraph({ children: [img('leadership/founder-ceo.jpg', 100)] }));
rosterRow('Zakariya Olanrewaju Anofi', 'Founder & Head of Schools/Administrator', 'MSc Edinburgh Business School, Heriot-Watt · BSc Applied Accounting, Oxford Brookes · Fellow, ACCA UK · Fellow, ICAN').forEach(p => B.push(p));
rosterRow('Dr Adegoke Musa Olatunji', 'Principal, Sultan Hanafi Royal College', 'PhD · MEd · BSc.Edu · NCE · MTRCN (Teachers Registration Council of Nigeria)').forEach(p => B.push(p));
B.push(new Paragraph({ children: [img('leadership/imam-ahmad-sulaimiy.jpg', 100)] }));
rosterRow('Imam Ahmad Sulaimiy', "Principal (Mudeer), Sultan Hanafi Qur'an College", 'BSc Qur\'anic Sciences · BA Islamic and Arabic Studies').forEach(p => B.push(p));
B.push(new Paragraph({ children: [img('leadership/shaykh-abubakr-solah.jpg', 100)] }));
rosterRow('Shaykh Abubakr Solah', "Principal (Ra'ees), School of Islamic and Arabic Studies", 'BA Arabic Language · Diploma in Islamic Studies').forEach(p => B.push(p));
rosterRow('Mrs. Kareemat Abdurazaq', 'Head Teacher, Basic School', 'BEd · NCE').forEach(p => B.push(p));
rosterRow('Vacant', 'Head, Sultan Hanafi Online & Distance Learning School', 'Newly established 2026 — headship not yet appointed; no students or curriculum yet.').forEach(p => B.push(p));
B.push(h2('Heads of Departments'));
rosterRow('Mrs. Anofi-Badmus Fatimat Omolola', 'VP Administration, Royal College', 'HND Accounting · PGDE').forEach(p => B.push(p));
B.push(pageBreak());

// ============ GOVERNANCE I — STRATEGIC GOVERNANCE ============
B.push(eyebrow('Governance Architecture I'), h1('Strategic Governance'));
B.push(lede("Sultan Hanafi Royal Schools operates under a complete governance architecture — from the Board's strategic oversight down to class-level student leadership. This spread traces the strategic tier: the Board of Governors, its Board-Level Committees, and the Management Team who lead each institution."));
B.push(diagramRow(['Level A — Board of Governors\nChairman · Secretary · Three Other Members'], GOLD, NAVY_DEEP));
B.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
B.push(caption('Level B — Board-Level Committees'));
B.push(diagramRow(['Educational Technical Committee', 'Finance Committee', 'Safeguarding Committee'], PARCHMENT, NAVY));
B.push(diagramRow(['Governance & Nominations Committee', 'Disciplinary & Ethics Committee', 'One Further Committee — Reserved'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
B.push(diagramRow(['Level C — Management Team (Executive Authority)\nHead of Schools/Administrator — Zakariya Olanrewaju Anofi'], GOLD, NAVY_DEEP));
B.push(caption('Held jointly with the Chairman of the Board of Governors — no executive authority exists outside these two offices.'));
B.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
B.push(caption("Level C, continued — the five schools' Heads, each reporting to the Head of Schools/Administrator"));
B.push(diagramRow(['Head Teacher, Basic School\nMrs. Kareemat Abdurazaq', 'Principal, Royal College\nAdegoke Musa Olatunji', "Principal (Ra'ees), School of Islamic and Arabic Studies\nShaykh Abubakr Solah", "Principal (Mudeer), Qur'an College\nImam Ahmad Sulaimiy", 'Head, Online & Distance Learning\nVacant (newly established)'], PARCHMENT, NAVY));
B.push(caption('The Management Team comprises the Head of Schools/Administrator and the five schools\' Heads. VP Administration (Royal College) and other departmental heads sit at Level E, Heads of Departments.'));
B.push(caption("Founding Organisation: Sultan Zakariya Hanafi Foundation (Non-Profit) — Lagos State Ministry of Education Registered 2026"));
B.push(supportRow([
  ['Staff Identity Platform', 'Every staff account is verified and scoped before it can touch a family\'s data.'],
  ['Role & Permission Matrix', 'Access is granted by role, not by request.'],
  ['Audit Trail', 'Sensitive actions are logged, not merely trusted.'],
]));
B.push(pageBreak());

// ============ GOVERNANCE II — OPERATIONAL GOVERNANCE ============
B.push(eyebrow('Governance Architecture II'), h1('Operational Governance'));
B.push(lede("Beneath the Management Team, Management-Level Committees, departments, and educators carry the institution's academic and administrative operations forward day to day."));
govTier('D', "Management-Level Committees", 'Standing committees operating under Management Team authority, between the Management Team and the Heads of Departments.',
  ["Da'wah Committee", 'Academic Committee', 'Sports Committee', 'Communications & Public Affairs Committee', 'Student Life Committee', 'Admissions & Enrolment Committee', 'Health, Safety & Facilities Committee']).forEach(p => B.push(p));
govTier('E', 'Heads of Departments', 'Reporting to the appropriate Principal or Head Teacher.',
  ['Mathematics & ICT', 'Science & Technology', 'Humanities', 'Other Languages', 'Arabic Language', 'Islamic Studies']).forEach(p => B.push(p));
B.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: 'Finance & Accounts · Human Resources · ICT · Registry · Administration', font: BODY_FONT, size: 19, italics: true, color: INK_SOFT })] }));
govTier('F', 'Educators', 'The faculty who deliver the curriculum and the Hifz Journey directly.',
  ['Subject Teachers', 'Class Teachers', 'Arabic Teachers', 'Islamic Studies Teachers', "Qur'an Teachers", 'Muhaffiz / Muhaffizah']).forEach(p => B.push(p));
B.push(pageBreak());

// ============ GOVERNANCE III — STUDENT LEADERSHIP STRUCTURE ============
B.push(eyebrow('Governance Architecture III'), h1('Student Leadership Structure'));
B.push(lede("Governance extends into the student body itself — a structured leadership pathway that carries the institution's standards into every classroom."));
govTier('G', 'Student Representatives', 'Official student leadership, the formal link between the student body and school management.').forEach(p => B.push(p));
govTier('H', 'School Prefects', null, ['Head Boy', 'Head Girl', 'Senior Prefects', 'House Prefects']).forEach(p => B.push(p));
govTier('I', 'Class Captains', 'The student leadership tier closest to individual classes — the first point of peer accountability in daily school life.').forEach(p => B.push(p));
govTier('J', 'Student Clubs', 'Voluntary, interest-led groups — the broadest tier of student participation, open to every pupil.').forEach(p => B.push(p));
B.push(quoteBox('Board of Governors → Board-Level Committees → Management Team → Management-Level Committees → Heads of Departments → Educators → Student Representatives → School Prefects → Class Captains → Student Clubs — one governance architecture, visible at every level of the institution.'));
B.push(pageBreak());

// ============ THE COMMISSIONING ============
B.push(eyebrow('An Historic Milestone'), h1('A Governor Bears Witness.'));
B.push(body('In a moment of profound institutional significance, Sultan Hanafi Royal Schools received one of the most distinguished endorsements in its history — the attendance and formal address of Engr. Seyi Makinde, Executive Governor of Oyo State, at the commissioning ceremony of the institution.'));
B.push(new Paragraph({ children: [img('gallery/commissioning-day-2.jpg', 320), new TextRun({ text: '  ' }), img('gallery/commissioning-day-1.jpg', 320)] }));
B.push(supportRow([
  ['2025', 'Year of commissioning'],
  ['Guest of Honour', 'Engr. Seyi Makinde, Executive Governor of Oyo State'],
  ['The Commissioner', 'Executive Governor, Oyo State, Nigeria'],
]));
B.push(pageBreak());

B.push(eyebrow('The Significance'), h1('A Moment of National Recognition'));
B.push(body("The Governor's commissioning address touched on themes that resonate deeply with the founding philosophy of Sultan Hanafi Royal Schools: the role of private enterprise in building Nigeria's educational future, the importance of Islamic values, and the extraordinary potential of Nigeria's youth."));
[
  'Formal commissioning address by Engr. Seyi Makinde, Executive Governor of Oyo State',
  "Qur'anic recitation by students of Sultan Hanafi Qur'an College",
  'Institutional vision presentation by Zakariya Olanrewaju Anofi',
  'Community testimonials from the CDA Chairman, parents, alumni, and local stakeholders',
  'Official dedication of the institution to the memory of Anofi Aliu Akano',
].forEach(t => B.push(new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: '•  ', font: BODY_FONT, size: 19, color: GOLD }), new TextRun({ text: t, font: BODY_FONT, size: 19 })] })));
B.push(new Paragraph({ children: [img('gallery/recitation-assembly-1.jpg', 460)] }));
B.push(quoteBox('What we see here today is not merely a school building. What we see is a statement of faith — faith in education, faith in our children, and faith in what Nigeria can become.', 'Engr. Seyi Makinde · Executive Governor, Oyo State'));
B.push(pageBreak());

// ============ AWARDS & RECOGNITION ============
B.push(eyebrow('Academic Recognition 2026'), h1('Awards & Recognition'));
B.push(body('The ALA Endowment Prize is awarded to the top three academic performers in each class across Sultan Hanafi Royal College every term. Established in 2024 by Mr Lukman Anofi, Board Member.'));
B.push(statQuad([['18', 'Students Recognised'], ['6', 'Year Groups'], ['3', 'Places / Class'], ['2024', 'Prize Established']]));
B.push(new Paragraph({ spacing: { before: 120 } }));
B.push(awardsTable([
  ['SSS 3', 'Makinde Thoirah', 'Jabaar Abdulbasit', 'Shode Aisha'],
  ['SSS 2', 'Oyebisi Abdulhameed', 'Ojewumi Fawaz', 'Anofi Sofiat'],
  ['SSS 1', 'Giwa Idris Jamiu', 'Abdul Manan Ibraheem', 'Faheemah Ibraheem'],
  ['JSS 3', 'Ojewumi Hameedah', 'Durodola Ameerat', 'Ibrahim Fatimah'],
  ['JSS 2', 'Jimoh Faheez', 'Rasaq Aisha', 'Ashrof Moryam'],
  ['JSS 1', 'Sanni Fareedat', 'Hassan-Muritala Ikhlas', 'Adamson Abdullahi'],
]));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(supportRow([
  ['Ministry Registration', 'May 2026 — passed the Registration Stage with the Lagos State Ministry of Education.'],
  ['BECE 2026', 'A historic first — the inaugural cohort sits the Basic Education Certificate Examination.'],
  ["Ramadan Qur'an Competition", 'An annual showcase of Hifz achievement and Tajwid excellence.'],
]));
B.push(pageBreak());

// ============ IN THE WORDS OF OUR FAMILIES ============
B.push(eyebrow('In the Words of Our Families'), h1('What They Say About Sultan.'));
B.push(quoteBox('One thing I look out for in schools is the calibre of teachers they have. Most private schools don\'t employ quality teachers — but at SULTAN, in most of their recruitments they look for experienced educators with PhD, M.Sc., PGDE, or B.Sc. Education qualifications.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018'));
B.push(new Paragraph({ spacing: { before: 160 } }));
B.push(quoteBox('Most of us parents have confirmed that the values and morals the school instils in our children are worth far more than the fees we pay. Since joining SULTAN, the improvement in my children\'s academic performance and character has been remarkable.', 'Dr Ismail Akeem Seriki · Parent, Three Children Enrolled'));
B.push(pageBreak());

// ============ THE FOUNDATION ============
B.push(eyebrow('Beyond the School Gates'), h1('The Sultan Zakariya Hanafi Foundation'));
B.push(quoteBox("We believe that a school's responsibility does not end at its gates. Our community is our classroom, and our obligation extends to every member of it.", 'Zakariya Olanrewaju Anofi · Founder & Head of Schools/Administrator'));
B.push(body('The Sultan Zakariya Hanafi Foundation is a non-profit, non-political organisation co-founded by Zakariya Olanrewaju Anofi and Mallam Lukman Ayinla Anofi.'));
[['Educational Scholarships', 'Merit- and need-based bursaries for students of exceptional potential.'],
 ['Literacy Promotion', 'Free adult literacy classes and community reading programmes.'],
 ['Mosque Construction', 'Support for mosque construction and maintenance in underserved communities.'],
 ['Medical & Healthcare Support', 'Medical outreach, free health screenings, and family healthcare support.'],
 ['Economic Empowerment', 'Micro-enterprise grants and business development support.']]
  .forEach(([t, d]) => deptItem(t, d).forEach(p => B.push(p)));
B.push(pageBreak());

// ============ ADMISSIONS ============
B.push(eyebrow('Begin the Journey'), h1('Joining Sultan Hanafi Royal Schools'));
['Initial Enquiry — Contact the school — in person, by telephone, or via our website.',
 'Admission Form — Purchased and completed with the required supporting documentation.',
 'Entrance Assessment — An entrance examination and interview enable optimal class placement.',
 'Results & Offer — Parents are notified of results and an admission offer is extended.',
 'Fee Settlement — Tuition and applicable fees are settled, with full guidance on payment.',
 'Enrolment — A formal Admission Letter is issued with a Class Acceptance Ticket.']
  .forEach((t, i) => B.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: `${i + 1}. `, font: HEAD_FONT, size: 22, color: GOLD, bold: true }), new TextRun({ text: t, font: BODY_FONT, size: 20 })] })));
B.push(supportRow([
  ['Documents Required', 'Birth certificate · Passport photographs (2) · School report · Completed admission form'],
  ['Campus Tour', 'Visit our campus and experience the Sultan Hanafi difference first-hand.'],
  ['Foundation Scholarships', 'Educational support for students of exceptional merit or financial need — contact info@shroyalschools.com'],
]));
B.push(new Paragraph({ spacing: { before: 200 }, children: [img('gallery/campus-hero.jpg', 460)] }));
B.push(caption('Sultan Hanafi Royal Schools · Imowonla, Ikorodu, Lagos State'));
B.push(pageBreak());

// ============ CONTACT & CONNECT ============
B.push(eyebrow('Connect With Us'), h1('We Are Here for Your Family'));
B.push(body('Whether you are ready to enrol, wishing to arrange a campus tour, seeking further information, or simply wanting to understand the Sultan Hanafi difference — we would love to hear from you.'));
B.push(dataPanel([
  ['Address', '15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu'],
  ['Email', 'info@shroyalschools.com'],
  ['Website', 'shroyalschools.com'],
  ['Telephone', '+234 807 374 7650 · +234 807 058 6860'],
  ['Instagram', '@shroyal_schools'],
]));
B.push(h2('Ten Reasons to Choose SULTAN'));
[
  'Internationally qualified faculty — PhDs, MEds, PGDEs, and TRCN registration.',
  'Integrated Nigerian curriculum with Saudi Arabian Islamic studies.',
  "Certified Ijazah from the Sultan Hanafi Qur'an College.",
  'Modern STEM Innovation Centre and science laboratories.',
  "Residential boarding for Royal College and Qur'an College students.",
  'The CLEVER values framework — character-led education at every stage.',
  'Entrepreneurship and financial literacy embedded from Primary 1.',
  'Lagos State Ministry of Education registration achieved May 2026.',
  'Commissioning endorsed by the Executive Governor of Oyo State, 2025.',
  'A community of extraordinary families united by genuine ambition.',
].forEach((t, i) => B.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `${String(i + 1).padStart(2, '0')}  `, font: HEAD_FONT, size: 20, color: GOLD, bold: true }), new TextRun({ text: t, font: BODY_FONT, size: 19 })] })));
B.push(new Paragraph({ spacing: { before: 160 } }));
B.push(statQuad([['2016', 'Founded'], ['5', 'Schools'], ['7', 'Departments'], ['∞', 'Ambition']]));

B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [img('crest-full.png', 90)] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [new TextRun({ text: '"Education is not the filling of a pail, but the lighting of a fire." At Sultan Hanafi Royal Schools, we light that fire — every single day.', font: 'Constantia', italics: true, size: 22, color: NAVY })] }));

sections.push({
  properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
  headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Flagship Institutional Publication', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  children: B,
});

// ============ BACK COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 260 }, children: [img('crest-full.png', 110)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 34, bold: true, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: "NURTURING TOMORROW'S LEADERS", font: HEAD_FONT, size: 15, color: GOLD, bold: true, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'Excellence · Character · Faith · Leadership', font: BODY_FONT, size: 18, color: INK_SOFT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'A Sultan Hanafi education is a standard, held for every child, for as long as it takes.', font: 'Constantia', italics: true, size: 22, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State, Nigeria', font: BODY_FONT, size: 18 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.com · +234 807 374 7650', font: BODY_FONT, size: 18 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.com · @shroyal_schools', font: BODY_FONT, size: 18, color: GOLD, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 800 }, children: [new TextRun({ text: 'FLAGSHIP INSTITUTIONAL PUBLICATION 2026 · NIGERIA', font: HEAD_FONT, size: 13, color: INK_SOFT, characterSpacing: 15 })] }),
    ]),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Flagship Institutional Publication (Brand Book & Educational Review 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
