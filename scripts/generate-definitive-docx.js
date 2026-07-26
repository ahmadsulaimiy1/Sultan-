// Generates the DOCX edition of "The Definitive Flagship Publication —
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
  'gallery/boarding-dining.jpg': [1400, 934],
  'gallery/basic-school-classroom.jpg': [1040, 780],
  'gallery/spelling-competition.jpg': [1280, 960],
  'gallery/commissioning-day-1.jpg': [1400, 1867],
  'gallery/commissioning-day-2.jpg': [1400, 1867],
  'gallery/recitation-assembly-1.jpg': [1400, 1400],
  'gallery/recitation-assembly-2.jpg': [1400, 1400],
  'gallery/recitation-assembly-3.jpg': [1400, 1400],
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
const CHARCOAL = '2A2621', CRIMSON = '7C1F2E', PARCHMENT = 'EAE0C0', INK_SOFT = '6B6255';

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

function pendingBox(label, note) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.DASHED, size: 6, color: 'A47843' }, bottom: { style: BorderStyle.DASHED, size: 6, color: 'A47843' },
      left: { style: BorderStyle.DASHED, size: 6, color: 'A47843' }, right: { style: BorderStyle.DASHED, size: 6, color: 'A47843' },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: 'F1E4C8' },
      margins: { top: 200, bottom: 200, left: 200, right: 200 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: HEAD_FONT, bold: true, size: 18, color: 'A47843' })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: note, font: BODY_FONT, size: 17, color: 'A47843' })] }),
      ],
    })] })],
  });
}

// Elegant substitute for missing photography (Ministry Approval,
// Foundation, Library) — a large brand-coloured monogram badge, the
// same visual idiom already used for the CLEVER/core-values letters,
// not a "photography pending" placeholder.
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
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: s, font: HEAD_FONT, size: 15, bold: true, color: textColor })] })],
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

const sections = [];

// ============ COVER ============
sections.push({
  properties: { page: { size: { width: 13606, height: 17008 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 300 }, children: [img('crest-full.png', 120)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE DEFINITIVE FLAGSHIP PUBLICATION — BRAND BOOK & EDUCATIONAL REVIEW 2026', font: HEAD_FONT, size: 17, color: GOLD, bold: true, characterSpacing: 20 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 52, bold: true, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '"To be recognised as a leading institution excelling in knowledge dissemination and character building."', font: 'Constantia', italics: true, size: 24, color: INK_SOFT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 800 }, children: [img('gallery/campus-hero.jpg', 420)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Word Edition', font: BODY_FONT, size: 16, color: INK_SOFT })] }),
    pageBreak(),
  ],
});

const B = [];

// ============ DEDICATION ============
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600, after: 200 }, children: [new TextRun({ text: 'IN HONOUR', font: HEAD_FONT, size: 16, color: GOLD, bold: true, characterSpacing: 40 })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: "This publication is dedicated to the founder's late father — a man of limited formal education who was determined, above all else, that his children would have the opportunities he never did. His conviction is the reason a school exists at all.", font: 'Constantia', italics: true, size: 26, color: '2A2016' })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'And to every parent at Sultan Hanafi Royal Schools who has placed the same trust in us that a father once placed in an idea.', font: 'Constantia', italics: true, size: 22, color: INK_SOFT })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '"A secure, informed, and progressive society begins with the education one generation is willing to sacrifice for the next."', font: BODY_FONT, size: 20, color: INK_SOFT })] }));
B.push(pageBreak());

// ============ DIRECTOR'S MESSAGE ============
B.push(eyebrow('Welcome'), h1('A Message from the Director'));
B.push(new Paragraph({ children: [img('leadership/founder-ceo.jpg', 180)] }));
B.push(caption('Sultan Zakariya Olanrewaju Hanafi, PhD — Founder & Director, Sultan Hanafi Royal Schools. B.Sc. Applied Accounting (Oxford Brookes University) · M.Sc. Financial Management (Edinburgh Business School, Heriot-Watt University) · FCCA (UK) · FCA (ICAN).'));
B.push(lede('"I am delighted to welcome you to the official home of Sultan Hanafi Royal Schools — a hybrid, Islamic and secular school in Ikorodu, Lagos, committed to the highest quality education in a nurturing, safe, and inclusive environment."'));
B.push(body('My over two decades of work experience span banking, insurance, oil & gas, and consulting, with a bias for corporate reporting, taxation management, revenue generation, financial and business advisory, governance, and leadership. My passion for education informed my decision to invest in institutions whose sole motive is to impart knowledge to the populace.'));
B.push(body('Our schools are open to Muslims and non-Muslims, males and females. 2026 has been a year of firsts for this institution — our first cohort presented for the Basic Education Certificate Examination, formal Ministry registration secured, and a public commissioning that placed this school before the wider community it was built to serve. None of it changes why we started. It confirms it.'));
B.push(pageBreak());

// ============ HERITAGE & TIMELINE ============
B.push(eyebrow('Chapter II — Heritage'), h1('A Legacy Built on One Conviction'));
B.push(body("Sultan Hanafi Royal Schools was founded by Sultan Zakariya Olanrewaju Hanafi, PhD — a professional accountant, educationist, and traditional title-holder — and officially registered in December 2017. The school's name and purpose honour the founder's own upbringing: a household of limited formal education, but of total conviction that the next generation would have opportunities the last did not."));
B.push(new Paragraph({ children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(caption('The campus gate, Imowonla, Ikorodu, Lagos State.'));
B.push(h2('Timeline'));
[['2017', 'Sultan Hanafi Royal Schools officially registered.'],
 ['2021', 'Royal College established, extending the institution into mainstream Junior and Senior Secondary education.'],
 ['2026', 'Inaugural BECE cohort presented; formal Ministry of Education registration secured; the campus formally commissioned before the wider community.']]
  .forEach(([year, text]) => {
    B.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: year, font: HEAD_FONT, size: 24, color: GOLD, bold: true })] }));
    B.push(body(text));
  });
B.push(pageBreak());

// ============ VISION, MISSION & VALUES ============
B.push(eyebrow('Chapter III — Doctrine'), h1('Vision, Mission & Values'));
B.push(h2('Vision'));
B.push(body('To be recognised as a leading institution excelling in knowledge dissemination and character building — creating a positive impact wherever our presence is felt.'));
B.push(h2('Mission'));
B.push(body('To provide holistic education by imparting both Islamic and secular knowledge through rigorous research and effective teaching methods — promoting ethical behaviour and instilling strong values in pursuit of a secure, informed, and progressive society.'));
B.push(h2('Core Values'));
[['Knowledge', 'Academic excellence and Islamic scholarship pursued with equal rigour, one never subordinate to the other.'],
 ['Integrity', 'A moral compass built into daily conduct, not reserved for examinations of faith alone.'],
 ['Service', 'An education that produces contributors to society, not merely graduates of it.']]
  .forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 21, color: NAVY, bold: true })] })); B.push(body(d)); });
B.push(pageBreak());

// ============ CLEVER STANDARD ============
B.push(eyebrow('Chapter III — Doctrine'), h1('The CLEVER Standard'));
B.push(lede('Every student at Sultan Hanafi Royal Schools is guided toward one shared standard of character and capability — lived daily, not displayed once.'));
B.push(diagramRow(['C — Creativity', 'L — Leadership', 'E — Engagement'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
B.push(diagramRow(['V — Versatility', 'E — Ethics', 'R — Reliability'], PARCHMENT, NAVY));
B.push(pageBreak());

// ============ FOUR SCHOOLS ============
B.push(eyebrow('Chapter IV — Structure'), h1('The Four Schools of SHRS'));
B.push(body('Sultan Hanafi Royal Schools is not a single school with an Islamic Studies subject attached — it is four institutions, one shared standard, one campus community.'));
B.push(dataPanel([
  ['Nursery & Primary', 'Ages 2–10, day format'],
  ['Royal College', 'Ages 10+, est. 2021'],
  ['Arabic & Islamic Studies Institute', 'All ages, weekday & weekend'],
  ["Qur'an College", 'All ages, Hifz Journey & Ijazah'],
]));
B.push(pageBreak());

// ============ NURSERY & PRIMARY ============
B.push(eyebrow('One of Four Institutions'), h1('Nursery & Primary'));
B.push(new Paragraph({ children: [img('gallery/basic-school-classroom.jpg', 460)] }));
B.push(body("Our earliest years lay the foundation the rest of a child's SHRS journey builds on — a nurturing, structured introduction to both academic learning and Islamic values, preparing every child for a confident transition into Royal College's secondary pathway."));
B.push(dataPanel([['Ages', '2–10'], ['Format', 'Day'], ['Pathway', 'Primary 1–6']]));
B.push(pageBreak());

// ============ ROYAL COLLEGE ============
B.push(eyebrow('One of Four Institutions'), h1('Royal College'));
B.push(new Paragraph({ children: [img('gallery/chemistry-laboratory.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(body("SHRS's mainstream secondary academic programme — Junior and Senior Secondary education delivered with the same rigour named in our Mission. 2026 marked Royal College's first cohort presented for the Basic Education Certificate Examination."));
B.push(dataPanel([['Ages', '10+'], ['Format', 'Day'], ['Established', '2021']]));
B.push(h2('Ministry Approval'));
B.push(body('Royal College\'s academic programme operates under formal Ministry of Education registration, secured in 2026 — a milestone that follows years of building the academic, facilities, and governance record required to earn it.'));
B.push(iconPanel('M', 'Ministry Registered', 'Formal Ministry of Education registration, secured 2026'));
B.push(pageBreak());

// ============ ISLAMIC & QUR'AN EXCELLENCE ============
B.push(eyebrow('One of Four Institutions'), h1("Islamic & Qur'an Excellence"));
B.push(new Paragraph({ children: [img('gallery/quran-recitation-1.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 200 } }));
B.push(body("Dedicated Arabic language and Islamic Studies programmes, open across all ages, alongside Qur'an College's structured Hifz Journey — a five-stage memorisation pathway supervised by trained Muhaffiz and Muhaffizah instructors, culminating in Ijazah certification for students who complete it."));
B.push(body("Recitation assemblies bring the College's students before microphones and an audience — a public, disciplined test of memorisation and tajwīd that runs alongside the private, day-to-day work of the Hifz Journey."));
B.push(new Paragraph({ spacing: { before: 120 }, children: [img('gallery/quran-recitation-2.jpg', 220), new TextRun({ text: '  ' }), img('gallery/recitation-assembly-1.jpg', 220)] }));
B.push(pageBreak());

// ============ CAMPUS & FACILITIES ============
B.push(eyebrow('Chapter V — Campus'), h1('A Campus of Distinction'));
B.push(body('Purpose-built facilities across four institutions, on one campus in Imowonla, Ikorodu — designed for a child to move between a science laboratory, a recitation hall, and a workshop bench in the course of a single day.'));
B.push(new Paragraph({ children: [img('gallery/chemistry-laboratory.jpg', 220), new TextRun({ text: '  ' }), img('gallery/college-hall.jpg', 220)] }));
B.push(new Paragraph({ spacing: { before: 160 }, children: [img('gallery/basic-technology-workshop-1.jpg', 220), new TextRun({ text: '  ' }), img('gallery/boarding-dining.jpg', 220)] }));
B.push(body('Science laboratories, a multi-purpose college hall, dedicated ICT/basic-technology workshops, and boarding-dining facilities sit alongside open recitation spaces and a library — a campus built for the full range of what SHRS teaches.'));
B.push(iconPanel('L', 'Library', 'Dedicated library photography has not yet been captured'));
B.push(pageBreak());

// ============ THE SULTAN EXPERIENCE ============
B.push(eyebrow('Student Life'), h1('The Sultan Experience'));
B.push(body('Beyond the classroom, SHRS students grow through co-curricular competition, science practicals, technology learning, and a values-led boarding-dining community where the CLEVER standard is lived daily.'));
B.push(new Paragraph({ children: [img('gallery/biology-laboratory.jpg', 220), new TextRun({ text: '  ' }), img('gallery/spelling-competition.jpg', 220)] }));
B.push(caption('Dedicated food & nutrition studio and recreation-facility photography has not yet been captured.'));
B.push(pageBreak());

// ============ LEADERSHIP ROSTER ============
B.push(eyebrow('Chapter VI — Leadership'), h1('Leadership Roster'));
B.push(new Paragraph({ children: [img('leadership/founder-ceo.jpg', 100)] }));
rosterRow('Sultan Zakariya Olanrewaju Hanafi, PhD', 'Founder & Director', 'B.Sc. Applied Accounting (Oxford Brookes) · M.Sc. Financial Management (Edinburgh Business School) · FCCA (UK) · FCA (ICAN)').forEach(p => B.push(p));
B.push(new Paragraph({ children: [img('leadership/imam-ahmad-sulaimiy.jpg', 100)] }));
rosterRow('Imam Ahmad Sulaimiy', 'Principal', "Sultan Hanafi Qur'an College").forEach(p => B.push(p));
rosterRow('Vice Principal, Academic Affairs', 'Royal College', 'Named appointment pending public listing — role, not individual, confirmed as filled.').forEach(p => B.push(p));
rosterRow('Vice Principal, Administration', 'Royal College', 'Named appointment pending public listing.').forEach(p => B.push(p));
B.push(new Paragraph({ children: [img('leadership/shaykh-abubakr-solah.jpg', 100)] }));
rosterRow('Shaykh Abubakr Solah', 'Islamic Scholar', "Sultan Hanafi Qur'an College").forEach(p => B.push(p));
B.push(caption('Named biographical entries beyond those pictured are intentionally withheld pending confirmed, publishable staff details — not omitted by oversight.'));
B.push(pageBreak());

// ============ ORGANISATIONAL STRUCTURE ============
B.push(eyebrow('Chapter VI — Leadership'), h1('Organisational Structure'));
B.push(diagramRow(['Board of Trustees'], GOLD, NAVY_DEEP));
B.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
B.push(diagramRow(['Founder & Director — Sultan Zakariya Olanrewaju Hanafi, PhD'], GOLD, NAVY_DEEP));
B.push(new Paragraph({ spacing: { before: 80, after: 80 } }));
B.push(diagramRow(['Head — Nursery & Primary', 'Head — Royal College', 'Head — Arabic & Islamic Studies', "Qur'an College — Imam Ahmad Sulaimiy"], PARCHMENT, NAVY));
B.push(caption("One Board, one Director, four Heads of Institution — the same governance backbone that governs the Digital Campus's Role & Permission Matrix."));
B.push(pageBreak());

// ============ THE COMMISSIONING ============
B.push(eyebrow('Chapter VII — Recognition'), h1('The Commissioning'));
B.push(body('In 2026, Sultan Hanafi Royal Schools was formally commissioned before the wider community, with Engr. Seyi Makinde, Executive Governor of Oyo State, in attendance as guest of honour and speaker — a recognition that placed this institution\'s work before an audience well beyond its own gates.'));
B.push(new Paragraph({ children: [img('gallery/commissioning-day-2.jpg', 320), new TextRun({ text: '  ' }), img('gallery/commissioning-day-1.jpg', 320)] }));
B.push(caption('Guests at the 2026 commissioning day. Individual attendees are not identified by name here.'));
B.push(lede('"The commissioning address commended the institution\'s academic and Islamic education model and its contribution to the community."'));
B.push(verifyNote('the quotation above is presented as a paraphrase of its general content. The exact wording of the Governor\'s remarks has not yet been checked against an official transcript or press release and must be verified — quoted precisely or not at all — before this publication goes to print.'));
B.push(pageBreak());

// ============ AWARDS & RECOGNITION ============
B.push(eyebrow('Chapter VII — Recognition'), h1('Awards & Recognition'));
B.push(body('SHRS students compete for the ALA Endowment Prize, awarded by academic rank within each class tier.'));
B.push(new Paragraph({ children: [img('gallery/recitation-assembly-2.jpg', 220), new TextRun({ text: '  ' }), img('gallery/recitation-assembly-3.jpg', 220)] }));
B.push(new Paragraph({ spacing: { before: 120 } }));
B.push(awardsTable([
  ['SSS 3', 'Makinde Thoirah', 'Jbaar Abdulbasit', 'Shode Aisha'],
  ['SSS 2', 'Oyebisi Abdulhameed', 'Ojewumi Fawaz', 'Anofi Sofiat'],
  ['SSS 1', 'Giwa Idris Jamiu, Abdul Manan Ibraheem, Faheemah Ibraheem — order not reconstructible', '', ''],
  ['JSS 3', 'Ojewumi Hameedah', 'Durodola Ameerat', 'Ibrahim Fatimah'],
  ['JSS 2', 'Jimoh Faheez', 'Rasaq Aisha', 'Ashrof Moryam'],
  ['JSS 1', 'Sanni Fareedat, Hassan-Muritala Ikhlas, Adamson Abdullahi — order not reconstructible', '', ''],
]));
B.push(verifyNote('this table was reconstructed from a source document where cell text had become interleaved. SSS 3, SSS 2, JSS 3, and JSS 2 reconstruct with high confidence; the SSS 1 and JSS 1 rows do not divide evenly and their rank order must be confirmed against official records before publication. Every name above is a real student and none has been omitted, but positions for SSS 1 and JSS 1 are not yet certain.'));
B.push(pageBreak());

// ============ BECE 2026 & MINISTRY REGISTRATION ============
B.push(eyebrow('Milestones'), h1('BECE 2026 & Ministry Registration'));
B.push(body('Two formal milestones mark 2026: Royal College\'s inaugural cohort sat the Basic Education Certificate Examination, and Sultan Hanafi Royal Schools secured formal Ministry of Education registration.'));
B.push(dataPanel([
  ['Inaugural BECE Cohort', '2026'],
  ['BECE Results', '[figure pending official release]'],
  ['Ministry Registration', 'Secured, 2026'],
  ['Registration No.', '[pending document]'],
]));
B.push(caption('Figures marked "pending" require confirmation against the official examination release and Ministry certificate — never estimated for print.'));
B.push(pageBreak());

// ============ TESTIMONIALS ============
B.push(eyebrow('Community Voices'), h1('Testimonials'));
B.push(lede('"Most parents have confirmed that the values and morals the school instils in our children are worth more than the money we pay. I would recommend the school to anybody."'));
B.push(caption('— Dr. Ismail Akeem Seriki, Parent & Board Member'));
B.push(caption('Additional named student, parent, and alumni testimonials are being gathered and will be added once confirmed.'));
B.push(pageBreak());

// ============ FOUNDATION ============
B.push(eyebrow('Chapter VIII — Philanthropy'), h1('The Sultan Zakariya Hanafi Foundation'));
B.push(body("The Founder's community commitment extends beyond the school gate — free public lectures, relief support during the COVID-19 period, and local infrastructure contributions reflect a philanthropic thread that runs alongside the school's academic mission. The Sultan Zakariya Hanafi Foundation is the formal vehicle for that continuing commitment."));
B.push(iconPanel('C', 'Community Commitment', 'Public lectures, relief support, and local infrastructure contributions'));
B.push(figurePending('[FIGURE PENDING] Foundation scope, scholarship figures, and beneficiary counts pending SHRS confirmation — not estimated for this draft.'));
B.push(pageBreak());

// ============ ADMISSIONS ============
B.push(eyebrow('Your Journey Begins Here'), h1('Admissions'));
B.push(new Paragraph({ children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 200 } }));
['Enquiry — Contact the school office or submit an enquiry through the website.',
 'Application — Complete the admission form for the relevant institution and age group.',
 'Admission — Assessment and confirmation of a place.',
 'Parent Portal — Full family account access, attendance, results, and fee status in one place.']
  .forEach((t, i) => B.push(new Paragraph({ numbering: undefined, spacing: { after: 120 }, children: [new TextRun({ text: `${i + 1}. `, font: HEAD_FONT, size: 22, color: GOLD, bold: true }), new TextRun({ text: t, font: BODY_FONT, size: 20 })] })));
B.push(pageBreak());

// ============ CONTACT & CONNECT ============
B.push(eyebrow('Ten Reasons to Choose Us'), h1('Contact & Connect'));
[
  'Four institutions, one shared standard of character and capability.',
  'Both Islamic and secular education pursued with equal rigour.',
  'A published governance and safeguarding architecture, not merely asserted.',
  'A real-time Parent Portal for attendance, results, and fees.',
  'A structured, supervised five-stage Hifz Journey with Ijazah certification.',
  'Purpose-built science, ICT, and recitation facilities on one campus.',
  'Formal Ministry of Education registration.',
  "A founder whose own philanthropy extends into the surrounding community.",
  'A school open to Muslims and non-Muslims, males and females alike.',
  "A community that has grown from a single household's conviction into an institution the wider public has now formally recognised.",
].forEach((t, i) => B.push(new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: `${String(i + 1).padStart(2, '0')}  `, font: HEAD_FONT, size: 20, color: GOLD, bold: true }), new TextRun({ text: t, font: BODY_FONT, size: 19 })] })));

B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400 }, children: [img('brand-mark.png', 90)] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160 }, children: [new TextRun({ text: 'Imowonla, Ikorodu, Lagos State, Nigeria', font: BODY_FONT, size: 20 })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'shroyalschools.ng', font: BODY_FONT, size: 20 })] }));
B.push(caption('Contact details sourced from the live site\'s footer at production time — not re-typed from memory here.'));

sections.push({
  properties: { page: { size: { width: 13606, height: 17008 }, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
  headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Definitive Flagship Publication', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  children: B,
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Definitive Flagship Publication (Brand Book & Educational Review 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
