// Generates the DOCX edition of the Flagship Prospectus
// (docs/prospectus-*.md deliverables #1-4) from the same real content
// as prospectus/index.html (Deliverable #5's HTML/PDF edition) — kept
// as a separate script rather than derived from the HTML because DOCX
// is a flow format (no absolute positioning, background-image overlays,
// or CSS grid), so the Word edition is deliberately simpler in layout
// while using identical real copy, images, and honest pending-markers.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running, or `npx -p
// docx node scripts/generate-prospectus-docx.js`.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-prospectus-docx.js`.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  TableOfContents, Header, Footer, PageNumber, VerticalAlign, convertInchesToTwip,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'images') + path.sep;
const OUT_DIR = path.join(ROOT, 'prospectus', 'exports');
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Flagship-Prospectus-v1.0.docx');

// Real, verified pixel dimensions (see PIL inspection) — used to keep
// aspect ratio correct rather than distorting images.
const DIM = {
  'gallery/campus-hero.jpg': [1080, 748],
  'gallery/campus-building.jpg': [1400, 934],
  'gallery/campus-gate.jpg': [1400, 934],
  'gallery/college-hall.jpg': [1600, 721],
  'gallery/chemistry-laboratory.jpg': [1400, 934],
  'gallery/biology-laboratory.jpg': [1400, 934],
  'gallery/quran-recitation-1.jpg': [1600, 721],
  'gallery/quran-recitation-2.jpg': [1600, 721],
  'gallery/boarding-dining.jpg': [1400, 934],
  'gallery/scholarly-visit-1.jpg': [1600, 721],
  'gallery/scholarly-visit-2.jpg': [1600, 1600],
  'gallery/spelling-competition.jpg': [1280, 960],
  'gallery/basic-technology-workshop-1.jpg': [1400, 934],
  'gallery/basic-technology-workshop-2.jpg': [1400, 934],
  'leadership/founder-ceo.jpg': [607, 900],
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

// ---- Brand palette (from css/brand.css) ----
const NAVY = '3B2A1D', NAVY_DEEP = '221709', GOLD = 'C6A15B', GOLD_BRIGHT = 'E9CE8A';
const IVORY = 'F7EEDF', CHARCOAL = '2A2621', CRIMSON = '7C1F2E', PARCHMENT = 'EAE0C0', INK_SOFT = '6B6255';

const HEAD_FONT = 'Cambria';   // closest widely-available analogue to Cinzel's engraved-serif register
const BODY_FONT = 'Calibri';  // closest widely-available analogue to Inter

function eyebrow(text) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: text.toUpperCase(), font: HEAD_FONT, size: 16, color: GOLD, characterSpacing: 40, bold: true })],
  });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 40, color: NAVY, bold: true })] });
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

function figurePending(text) {
  return new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text, font: BODY_FONT, italics: true, size: 19, color: CRIMSON })] });
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

const sections = [];

// ============ COVER ============
sections.push({
  properties: { page: { size: { width: 13606, height: 17008 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
  children: [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 300 }, children: [img('crest-full.png', 130)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'FLAGSHIP PROSPECTUS', font: HEAD_FONT, size: 20, color: GOLD, bold: true, characterSpacing: 60 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 56, bold: true, color: NAVY })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '"To be recognised as a leading institution excelling in knowledge dissemination and character building."', font: 'Constantia', italics: true, size: 24, color: INK_SOFT })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900 }, children: [img('gallery/campus-hero.jpg', 420)] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Production Draft v1.0 — Word Edition', font: BODY_FONT, size: 16, color: INK_SOFT })] }),
    pageBreak(),
  ],
});

const body_children = [];
const B = body_children;

// ============ INSTITUTIONAL PUBLICATION INFORMATION ============
B.push(eyebrow("Publisher's Imprint"), h1('Institutional Publication Information'));
B.push(dataPanel([
  ['Institution', 'Sultan Hanafi Royal Schools'],
  ['Publisher', 'Office of the Founder & Head of Schools / Administrator'],
  ['Address', '15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu, Lagos State, Nigeria'],
  ['Website', 'shroyalschools.com'],
  ['Email', 'info@shroyalschools.com'],
  ['Telephone', '+234 (0) 807 374 7650 · +234 (0) 807 058 6860'],
  ['Copyright', '© Sultan Hanafi Royal Schools'],
  ['Document Title', 'Sultan Hanafi Royal Schools — Flagship Prospectus'],
  ['Document ID', 'SHRS-PUB-PROS-2026-001'],
  ['Edition', 'Production Draft v1.0'],
  ['Related Instrument', 'The Governance Charter (Policy GV-01, Edition VII)'],
  ['Institution Founded', 'July 2016 · Ikorodu, Lagos State'],
]));
B.push(pageBreak());

// ============ WELCOME ============
B.push(eyebrow('Welcome'), h1('A Message from Our Founder'));
B.push(new Paragraph({ children: [img('leadership/founder-ceo.jpg', 180)] }));
B.push(caption('Zakariya Olanrewaju Anofi — Founder & CEO, Sultan Hanafi Royal Schools. B.Sc. Applied Accounting (Oxford Brookes University) · M.Sc. Financial Management (Edinburgh Business School, Heriot-Watt University) · FCCA (UK) · FCA (ICAN).'));
B.push(lede('"I am delighted to welcome you to the official home of Sultan Hanafi Royal Schools — a hybrid, Islamic and secular school in Ikorodu, Lagos, committed to the highest quality education in a nurturing, safe, and inclusive environment."'));
B.push(body('My over two decades of work experience span banking, insurance, oil & gas, and consulting, with a bias for corporate reporting, taxation management, revenue generation, financial and business advisory, governance, and leadership. My passion for education informed my decision to invest in institutions whose sole motive is to impart knowledge to the populace.'));
B.push(body('Our schools are open to Muslims and non-Muslims, males and females. At SHRS, our dedicated team of educators are passionate about equipping students with the skills, knowledge, and values they need to succeed in an ever-changing world.'));
B.push(pageBreak());

// ============ HERITAGE ============
B.push(eyebrow('Chapter II — Heritage'), h1('A Legacy Named in Honour of a Father'));
B.push(body("Sultan Hanafi Royal Schools was founded by Zakariya Olanrewaju Anofi, a professional accountant and educationist, in July 2016. The school takes its name from the founder's late father, Anofi Aliu Akano — a clerk at the Nigerian Ports Authority whose own education was limited, but who was determined that his children would have the opportunities he didn't."));
B.push(body("The idea took shape during Lagos Governor Babatunde Fashola's administration, and was carried through with the encouragement of the founder's mentor, Governor Seyi Makinde, his brother Lukman Olajide Anofi, and others. Rooted in the Imowonla community in Ikorodu, the school has grown into a byword for what focused, values-led education can do for an underserved area — extending its reach through free community lectures, humanitarian relief during the COVID-19 lockdown, and infrastructure support such as road maintenance and community electrification."));
B.push(new Paragraph({ children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(caption('The campus gate — Imowonla, Ikorodu, Lagos State.'));
B.push(new Paragraph({ children: [img('gallery/scholarly-visit-1.jpg', 220), new TextRun({ text: '  ' }), img('gallery/scholarly-visit-2.jpg', 220)] }));
B.push(caption("Scholarly ties abroad — SHRS's Islamic and Qur'anic programme is grounded in real scholarly relationships. Source: independent reporting by Punch Newspapers, August 2023."));
B.push(pageBreak());

// ============ DOCTRINE ============
B.push(eyebrow('Chapter III — Doctrine'), h1('Mission, Vision & Values'));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Mission', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(body('To provide holistic education by imparting both Islamic and secular knowledge through rigorous research and effective teaching methods — promoting ethical behaviour and instilling strong values in pursuit of a secure, informed, and progressive society.'));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: 'Vision', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(body('To be recognised as a leading institution excelling in knowledge dissemination and character building — creating a positive impact wherever our presence is felt.'));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: 'The CLEVER Standard', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(diagramRow(['C — Creativity', 'L — Leadership', 'E — Engagement'], PARCHMENT, NAVY));
B.push(new Paragraph({ spacing: { before: 60, after: 60 } }));
B.push(diagramRow(['V — Versatility', 'E — Ethics', 'R — Reliability'], PARCHMENT, NAVY));
B.push(pageBreak());

// ============ WHY CHOOSE ============
B.push(eyebrow('Educational Philosophy'), h1('Why Choose Sultan Hanafi Royal Schools'));
B.push(body('SHRS holds that faith and academic rigour are not in tension — our Mission commits explicitly to "rigorous research and effective teaching methods" alongside Islamic knowledge. Every student is guided to:'));
['Excel in academic knowledge across various subjects', 'Develop a strong moral compass and exhibit exemplary character', 'Receive faith-based education to deepen understanding of Islam', 'Cultivate entrepreneurship skills, fostering innovation and creativity', 'Gain financial literacy to make informed decisions and manage resources effectively']
  .forEach(t => B.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 100 }, children: [new TextRun({ text: t, font: BODY_FONT, size: 21 })] })));
B.push(new Paragraph({ spacing: { before: 200 }, children: [img('gallery/campus-building.jpg', 460)] }));
B.push(pageBreak());

// ============ FOUR INSTITUTIONS ============
function institutionSpread(title, imgPath, widthPx, panelRows, narrative, pending) {
  B.push(eyebrow('One of Five Institutions'), h1(title));
  if (pending) {
    B.push(pendingBox('Photography Pending', `No dedicated ${title} photography exists yet — see docs/prospectus-spread-blueprint.md. Not filled with a substitute image.`));
  } else {
    B.push(new Paragraph({ spacing: { before: 120 }, children: [img(imgPath, widthPx)] }));
  }
  B.push(new Paragraph({ spacing: { before: 200, after: 200 } }));
  B.push(body(narrative));
  B.push(dataPanel(panelRows));
  B.push(pageBreak());
}

institutionSpread('Basic School', null, null,
  [['Ages', '2–10'], ['Format', 'Day'], ['Pathway', 'Primary 1–6']],
  "Our earliest years lay the foundation the rest of a child's SHRS journey builds on — a nurturing, structured introduction to both academic learning and Islamic values, preparing every child for a confident transition into Secular College's secondary pathway.",
  true);

institutionSpread('Secular College', 'gallery/chemistry-laboratory.jpg', 460,
  [['Ages', '10+'], ['Format', 'Day'], ['Established', '2021']],
  "SHRS's mainstream secondary academic programme — Junior and Senior Secondary education delivered with the same rigour named in our Mission, in dedicated science and general-academic facilities.");

institutionSpread('Islamiyyah College', null, null,
  [['Ages', 'All ages'], ['Format', 'Weekday & weekend']],
  'Dedicated Arabic language and Islamic Studies programmes, open across all ages — deepening the Islamic-knowledge half of our Mission alongside the secular academic pathways.',
  true);

B.push(eyebrow("One of Five Institutions"), h1("Qur'an College"));
B.push(new Paragraph({ children: [img('gallery/quran-recitation-1.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 200, after: 200 } }));
B.push(body("A dedicated Hifz (Qur'an memorisation) pathway with day and boarding options, guided by a structured, published five-stage Hifz Journey — the one part of our offering with a genuinely distinct, specialised methodology."));
B.push(dataPanel([['Format', 'Day & Boarding'], ['Programme', '24–36 months']]));
B.push(new Paragraph({ spacing: { before: 240 }, children: [img('gallery/quran-recitation-2.jpg', 220), new TextRun({ text: '  ' }), img('gallery/boarding-dining.jpg', 220)] }));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun({ text: 'The Hifz Journey — Five Stages', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(diagramRow(['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Stage 5 · Ijazah'], NAVY_DEEP, GOLD_BRIGHT));
B.push(caption('Full stage names and descriptions to be inserted from the published Hifz Regulations (IQ-01) at final production.'));
B.push(pageBreak());

// ============ STUDENT LIFE ============
B.push(eyebrow('Community'), h1('Student Life'));
B.push(body('Beyond the classroom, SHRS students grow through co-curricular competition, technology learning, and a values-led community where the CLEVER standard is lived daily, not just displayed.'));
B.push(new Paragraph({ children: [img('gallery/spelling-competition.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 160 }, children: [img('gallery/basic-technology-workshop-1.jpg', 220), new TextRun({ text: '  ' }), img('gallery/basic-technology-workshop-2.jpg', 220)] }));
B.push(pageBreak());

// ============ FACILITIES ============
B.push(eyebrow('World-Class Facilities'), h1('Take a Peek Inside Sultan Hanafi'));
B.push(new Paragraph({ children: [img('gallery/campus-building.jpg', 220), new TextRun({ text: '  ' }), img('gallery/college-hall.jpg', 220)] }));
B.push(new Paragraph({ spacing: { before: 160 }, children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(pageBreak());

// ============ DIGITAL CAMPUS ============
B.push(eyebrow('Our Genuine Differentiator'), h1('Technology & the Digital Campus'));
B.push(body('SHRS operates a real, live Digital Campus — a Parent Portal, a Student Portal, and a Staff Identity & Permission Engine governing who may see and change what, built on a published governance architecture rather than assembled ad hoc. Families can already track results, attendance, fee status, and — for Qur\'an College students — real Hifz progress and Ijazah records, all from one secure account.'));
B.push(new Paragraph({ children: [img('gallery/basic-technology-workshop-1.jpg', 460)] }));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 240 }, children: [new TextRun({ text: 'The Digital Campus Ecosystem', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(diagramRow(['Public Website', 'Identity & Access Platform', "Registrar's Office", 'Parent & Student Portals']));
B.push(body('Every account — parent, student, and staff — is governed by the same Role & Permission Matrix, so a family\'s data is only ever visible to the people with a genuine institutional reason to see it.', { size: 20 }));
B.push(pageBreak());

// ============ ADMISSIONS ============
B.push(eyebrow('Your Journey Begins Here'), h1('Admissions'));
B.push(new Paragraph({ children: [img('gallery/campus-gate.jpg', 460)] }));
B.push(new Paragraph({ spacing: { before: 200, after: 160 } }));
B.push(body('Applying to SHRS is a single, guided journey — from your first enquiry to full Parent Portal access, under one family account throughout.'));
B.push(diagramRow(['Enquiry', 'Application', 'Admission', 'Parent Portal']));
B.push(pageBreak());

// ============ GOVERNANCE ============
B.push(eyebrow('The Trust Chapter'), h1('Governance & Safeguarding'));
B.push(body('A school this young rarely publishes a governance architecture this deep. SHRS operates under a Board of Governors, a published Constitution & Governance Charter, and a comprehensive set of institutional policies covering safeguarding, data protection, academic regulation, and staff conduct — each one publicly documented, not asserted.'));
B.push(body('Our Digital Campus enforces this governance in software, not just on paper: every staff account operates under a Role & Permission Matrix, every sensitive action is logged to an audit trail, and a Designated Safeguarding Lead framework is formally established (appointment in progress).'));
B.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 }, children: [new TextRun({ text: 'By the Numbers', font: HEAD_FONT, size: 24, color: NAVY })] }));
B.push(figurePending('[FIGURE PENDING] Published policies — verify current count against docs/governance-master-register.md before this ships.'));
B.push(diagramRow(['Governing Offices — figure pending', '5 Institutions', 'One Governance Model'], NAVY_DEEP, GOLD_BRIGHT));
B.push(pageBreak());

// ============ PARENT PARTNERSHIP ============
B.push(eyebrow('Parent Partnership'), h1('A Partnership, Not a Transaction'));
B.push(body('Through the Parent Portal, families track their child\'s academic progress, attendance, and fee status directly — real-time visibility most schools this size don\'t offer. Beyond the portal, our founder\'s own community commitment (free public lectures, COVID-19 relief, local infrastructure support) reflects a partnership that extends past the school gate.'));
B.push(lede('"Most parents have confirmed that the values and morals the school instils in our children are worth more than the money we pay. I would recommend the school to anybody."'));
B.push(caption('— Dr. Ismail Akeem Seriki, Parent & Board Member'));
B.push(pendingBox('Photography Pending', 'No dedicated parent/community photography exists yet.'));
B.push(pageBreak());

// ============ ACHIEVEMENTS ============
B.push(eyebrow('Achievements'), h1('Recognised Excellence'));
B.push(new Paragraph({ children: [img('gallery/spelling-competition.jpg', 460)] }));
B.push(figurePending('[FIGURE PENDING] Specific competition results, examination pass rates, and enrolment figures pending SHRS confirmation — not estimated for this draft.'));
B.push(pageBreak());

// ============ FUTURE VISION ============
B.push(eyebrow('Looking Ahead'), h1('Our Vision Forward'));
B.push(lede('"To be recognised as a leading institution excelling in knowledge dissemination and character building — creating a positive impact wherever our presence is felt."'));
B.push(body('We build toward this Vision with real evidence, not a fixed roadmap: a Digital Campus already live, a governance architecture already published, and five institutions — four already serving one community with one shared standard, and a newly established Sultan Hanafi Online & Distance Learning School taking shape as the fifth.'));
B.push(pageBreak());

// ============ CONTACT ============
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600 }, children: [img('brand-mark.png', 100)] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, children: [new TextRun({ text: 'Contact Us', font: HEAD_FONT, size: 32, bold: true, color: NAVY })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Imowonla, Ikorodu, Lagos State, Nigeria', font: BODY_FONT, size: 20 })] }));
B.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'shroyalschools.com', font: BODY_FONT, size: 20 })] }));

sections.push({
  properties: { page: { size: { width: 13606, height: 17008 }, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
  headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — Flagship Prospectus', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
  children: body_children,
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS Flagship Prospectus — Production Draft v1.0',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
