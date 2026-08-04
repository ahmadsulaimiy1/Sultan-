// Generates the DOCX edition of "The Future Digital Campus Edition" —
// Prospectus III of the SHRS Multi-Flagship Publication Programme
// ("Brochure 02") — from the same real content as
// prospectus/digital-campus/index.html. Kept as a separate script, not
// derived from the HTML, because DOCX is a flow format (no glassmorphism,
// grid-line backgrounds, or hexagon clip-paths), so the Word edition is
// deliberately simpler in layout while carrying identical real copy and
// facts — including the same explicit "live" vs "roadmap" labelling that
// keeps this edition honest about what SHRS has actually built.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-digital-campus-docx.js`.
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle, PageBreak,
  Header, Footer, PageNumber,
} = require('docx');

const ROOT = path.join(__dirname, '..');
const IMG = path.join(ROOT, 'assets', 'images') + path.sep;
const OUT_DIR = path.join(ROOT, 'prospectus', 'exports');
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Digital-Campus-Edition-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/ict-computer-laboratory.jpg': [2248, 1500],
  'gallery/basic-technology-workshop-1.jpg': [1400, 934],
  'gallery/basic-technology-workshop-2.jpg': [1400, 934],
  'gallery/campus-building.jpg': [1400, 934],
  'leadership/founder-ceo.jpg': [607, 900],
  'crest-full.png': [700, 623],
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

// Future Digital Campus palette — white / charcoal / electric gold,
// distinct from the Imperial Heritage (navy/coffee-brown/parchment) and
// Luxury Aspirational (coffee/gold/cream) systems.
const CHARCOAL = '14171C', CHARCOAL_DEEP = '0A0C10', GOLD = 'B4830F', GOLD_BRIGHT = 'E3A81E';
const INK = '14171C', INK_SOFT = '5A6270', OFF_WHITE = 'F4F5F7', GREEN = '1F9D55';

const HEAD_FONT = 'Century Gothic';
const BODY_FONT = 'Calibri';

function eyebrow(text) {
  return new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), font: BODY_FONT, size: 16, color: GOLD, characterSpacing: 50, bold: true })] });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 38, color: CHARCOAL, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 22, color: CHARCOAL })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21, color: INK, ...opts })] });
}
function lede(text) {
  return new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text, font: BODY_FONT, size: 24, color: INK_SOFT })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

function liveBadge() {
  return new TextRun({ text: '  LIVE', font: BODY_FONT, size: 13, bold: true, color: GREEN });
}

// Glass-panel substitute — a soft-bordered callout box, the DOCX
// equivalent of .dc-glass, with an optional coloured tag line.
function glass(text, tag, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? '1E222A' : OFF_WHITE },
      margins: { top: 200, bottom: 200, left: 260, right: 260 },
      children: [
        ...(tag ? [new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: tag.toUpperCase(), font: BODY_FONT, size: 13, bold: true, color: opts.roadmap ? GOLD : (opts.dark ? GOLD_BRIGHT : CHARCOAL) })] })] : []),
        new Paragraph({ children: [new TextRun({ text, font: BODY_FONT, size: 19, color: opts.dark ? 'FFFFFF' : INK, italics: !!opts.italic })] }),
      ],
    })] })],
  });
}

// Hexagon-badge substitute — a bordered two-letter tile, the DOCX
// equivalent of .dc-hex, distinct from the octagram and circular
// badge systems used in the other two editions built so far.
function hexFeature(letters, title, desc, live) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E4E6EA' }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 14, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100, right: 140 }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, shading: { type: ShadingType.CLEAR, fill: GOLD_BRIGHT },
          children: [new TextRun({ text: letters, font: HEAD_FONT, size: 20, bold: true, color: CHARCOAL_DEEP })] }),
      ] }),
      new TableCell({ width: { size: 86, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100 }, children: [
        new Paragraph({ children: [new TextRun({ text: title, font: HEAD_FONT, size: 22, bold: true, color: CHARCOAL }), ...(live ? [liveBadge()] : [])] }),
        new Paragraph({ children: [new TextRun({ text: desc, font: BODY_FONT, size: 18, color: INK_SOFT })] }),
      ] }),
    ] })],
  });
}

function statQuad(cells, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2650, 2650, 2650, 2650],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'D9DCE1' },
    },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: 2650, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? '1E222A' : OFF_WHITE },
      margins: { top: 200, bottom: 200, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 30, bold: true, color: opts.dark ? GOLD_BRIGHT : CHARCOAL })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: BODY_FONT, size: 13, color: opts.dark ? 'D9D2C0' : INK_SOFT, characterSpacing: 4 })] }),
      ],
    })) })],
  });
}

function roadmapItem(year, title, desc) {
  return [
    new Paragraph({ spacing: { before: 140, after: 20 },
      children: [new TextRun({ text: year.toUpperCase() + '  ', font: BODY_FONT, size: 15, bold: true, color: GOLD }), new TextRun({ text: title, font: HEAD_FONT, size: 22, bold: true, color: CHARCOAL })] }),
    body(desc, { size: 19, color: INK_SOFT }),
  ];
}

// Imprint table — a two-column key/value ownership table, the DOCX
// equivalent of .dc-imprint-table / the Governance Charter's own
// .imprint-table, used only on the Institutional Publication
// Information page.
function imprintTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [3200, 6800],
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E4E6EA' }, insideVertical: { style: BorderStyle.NONE } },
    rows: rows.map(([label, value]) => new TableRow({ children: [
      new TableCell({ width: { size: 3200, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 60, right: 80 },
        children: [new Paragraph({ children: [new TextRun({ text: label.toUpperCase(), font: BODY_FONT, size: 14, bold: true, color: GOLD, characterSpacing: 10 })] })] }),
      new TableCell({ width: { size: 6800, type: WidthType.DXA }, margins: { top: 140, bottom: 140, left: 80, right: 60 },
        children: [new Paragraph({ children: [new TextRun({ text: value, font: BODY_FONT, size: 20, color: INK })] })] }),
    ] })),
  });
}

function coverFrame(children, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? CHARCOAL_DEEP : 'FFFFFF' },
      margins: { top: 200, bottom: 200, left: 300, right: 300 },
      children,
    })] })],
  });
}

const sections = [];

// ============ 01. COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 260 }, children: [img('crest-full.png', 90)] }),
      new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS · NIGERIA', font: BODY_FONT, size: 15, bold: true, color: GOLD_BRIGHT, characterSpacing: 30 })] }),
      new Paragraph({ spacing: { after: 200 },
        children: [new TextRun({ text: 'The Future Digital Campus Edition', font: HEAD_FONT, size: 42, bold: true, color: CHARCOAL })] }),
      glass('A prospectus on how Sultan Hanafi is building the digital infrastructure of a school preparing students for 2050 — one real system at a time.', null),
    ], { dark: false }),
  ],
});
sections[0].children.push(pageBreak());

// ============ 02. INSTITUTIONAL PUBLICATION INFORMATION ============
{
  const B = [];
  B.push(eyebrow("Publisher's Imprint"));
  B.push(h1('Institutional Publication Information'));
  B.push(imprintTable([
    ['Institution', 'Sultan Hanafi Royal Schools'],
    ['Publisher', 'Sultan Hanafi Royal Schools, acting through the Office of the Founder & Head of Schools / Administrator'],
    ['Address', '15, Imowonla Road, AP Bus Stop, Off Gberigbe–Agura Road, Ikorodu, Lagos State, Nigeria'],
    ['Website', 'shroyalschools.com'],
    ['Email', 'info@shroyalschools.com'],
    ['Telephone', '+234 (0) 807 374 7650 · +234 (0) 807 058 6860'],
    ['Copyright', '© Sultan Hanafi Royal Schools. All rights reserved within the Institution.'],
    ['Classification', 'Public institutional publication'],
    ["Archival Statement", "Retained in the Institution's publications archive"],
    ['Printing Specification', 'A4 digital distribution & print-on-demand'],
    ['Rights Statement', 'Share unaltered; no modification or commercial redistribution'],
    ['Document Title', 'Sultan Hanafi Royal Schools — The Future Digital Campus Edition'],
    ['Document ID', 'SHRS-PUB-DIGCAM-2026-001'],
    ['Edition', 'Edition I'],
    ['Related Instrument', 'The Governance Charter of Sultan Hanafi Royal Schools (Policy GV-01, Edition VII)'],
    ['Institution Founded', 'July 2016 · Ikorodu, Lagos State, Nigeria'],
  ]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 1200, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 03. VISION STATEMENT ============
{
  const B = [];
  B.push(new Paragraph({ spacing: { before: 2400 } }));
  B.push(eyebrow('Our Digital Vision'));
  B.push(new Paragraph({ spacing: { before: 100, after: 200 },
    children: [new TextRun({ text: 'We are not building a website. We are building the operating system of a 21st-century Islamic school.', font: HEAD_FONT, size: 32, bold: true, color: CHARCOAL })] }));
  B.push(body('Every family record, every Hifz milestone, every fee status — built to be real, accountable, and secure, before it is ever built to look impressive. This edition tells that story honestly: what runs today, and what we are building toward next.', { size: 22, color: INK_SOFT }));
  B.push(statQuad([['2', 'Live Portals'], ['1', 'AI Assistant'], ['2026', 'Cloud Migration'], ['2035', 'Full Vision']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 04. CONTENTS ============
{
  const B = [];
  B.push(eyebrow('Contents'));
  B.push(h1('A Guide to This Edition'));
  B.push(lede('This is the Future Digital Campus Edition — the same institution, retold through what is actually built, running, and used by real families today, and what is deliberately still ahead.'));
  const toc = [
    ["A Word from the Founder", '05'], ['The Digital Campus Today', '06'], ['The Guardian Portal', '07'],
    ['The Student Portal', '08'], ['The Digital Academic Assistant', '09'], ['Hifz & Ijazah Digital Register', '10'],
    ['The ICT & Computer Laboratory', '11'], ['Personalisation & the Adhkār Centre', '12'],
    ['Data-Driven Leadership', '13'], ['The Road to 2035', '14'], ['Campus & Connectivity', '15'],
    ['Join the Digital Campus', '16'],
  ];
  toc.forEach(([t, p]) => B.push(new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: t, font: BODY_FONT, size: 20, color: INK }), new TextRun({ text: '\t' + p, font: HEAD_FONT, size: 20, color: GOLD, bold: true })] })));
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(glass('Wherever this edition describes a system as live, it is running today, storing real data, used by real families or staff. Wherever it describes something as roadmap or 2035 vision, it is a deliberate, named, not-yet-built plan — never a claim of present capability.', 'A Note on Honesty'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 05. FOUNDER'S MESSAGE ============
{
  const B = [];
  B.push(eyebrow("A Word from the Founder"));
  B.push(h1('Building the Systems Our Children Deserve'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('leadership/founder-ceo.jpg', 180)] }));
  B.push(body("When people hear “digital campus,” they often picture dashboards and demos. I think about something more basic: can a parent in Ikorodu check their child's attendance from a shared phone on a slow connection? Can a Qur'an College student see exactly how many Juz' they have verified, tonight, without waiting for a report card?"));
  B.push(body('That is the standard we are building to — real infrastructure, real data protection, real accountability — before a single feature is announced as finished. We would rather ship two systems that genuinely work than ten that only look finished in a screenshot.'));
  B.push(glass('"A school’s digital systems should earn a family’s trust the same way its teachers do — slowly, honestly, and by actually showing up." — Zakariya Olanrewaju Anofi, Founder & Head of Schools/Administrator', null, { italic: true }));
  B.push(statQuad([['01', 'Digital Assistant Live'], ['02', 'Guardian Portal Live'], ['03', 'Student Portal Live'], ['Neon', 'Cloud Database']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 06. THE DIGITAL CAMPUS TODAY ============
{
  const B = [];
  B.push(eyebrow('Overview'));
  B.push(h1('The Digital Campus Today'));
  B.push(lede("Four real, independent systems, each solving one specific problem for one specific person — a guardian, a student, a family asking a question, a Qur'an College Muhaffiz recording progress."));
  B.push(hexFeature('GP', 'Guardian Portal', 'Attendance, term results, fee status, and notifications for every enrolled child — one login per family.', true));
  B.push(hexFeature('SP', 'Student Portal', "A second, independent login for students themselves — profile, transcript preview, and, for Qur'an College students, their own Hifz & Ijazah record.", true));
  B.push(hexFeature('AI', 'Digital Academic Assistant', 'An AI chat assistant answering admissions and academic questions instantly, with a direct WhatsApp escalation to staff.', true));
  B.push(hexFeature('HI', "Hifz & Ijazah Digital Register", 'Per-Juz’ memorisation progress and a permanent Ijazah register, visible to the student and, as a snapshot, to their guardian.', true));
  B.push(glass('All four systems share one Neon Postgres database behind Cloudflare Pages Functions — not four disconnected tools. A change recorded by staff in one place is immediately visible wherever a family is entitled to see it.', null));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 07. GUARDIAN PORTAL ============
{
  const B = [];
  B.push(eyebrow('Live System'));
  B.push(h1('The Guardian Portal'));
  B.push(lede('A secure, staff-mediated login — no self-serve signup, no unverified accounts — giving every guardian one place to see their children’s real record.'));
  B.push(hexFeature('01', 'Attendance & Term Results', 'A running record for every enrolled child, term by term.'));
  B.push(hexFeature('02', 'Fee Status', 'Clear, current fee standing per child — no chasing the school office for a balance.'));
  B.push(hexFeature('03', 'In-Portal Notifications', 'School announcements delivered directly into the dashboard.'));
  B.push(hexFeature('04', 'Hifz Snapshot', "For Qur'an College families — current stage and Juz’-verified count, at a glance."));
  B.push(glass('Every login is protected by rate-limiting and account lockout after repeated failed attempts, and every password reset is staff-mediated — never a self-service link a stranger could exploit. A small audit log records login activity across both the guardian and student portals.', 'Security by Design', { roadmap: true }));
  B.push(statQuad([['1', 'Login Per Family'], ['5', 'Attempts Before Lockout'], ['Staff', 'Mediated Reset'], ['All', 'Children, One View']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 08. STUDENT PORTAL ============
{
  const B = [];
  B.push(eyebrow('Live System'));
  B.push(h1('The Student Portal'));
  B.push(lede('A second, independent login — a student signs in as themselves, not through a parent’s account, to see their own academic record.'));
  B.push(statQuad([['1', 'Login Per Student'], ['Own', 'Profile & Transcript'], ['30', "Juz' Tracked"], ['7', 'Days Before Expiry']]));
  B.push(body("Every student sees their profile, attendance summary, a multi-term transcript preview, and current fee status. Qur'an College students additionally see their own 30-Juz’ Hifz progress grid, their current stage in the school's published five-stage Hifz Journey, and any Ijazah entries granted to them — a record that stays visible and verifiable years after graduation."));
  B.push(glass('Where the directive behind this edition asks for assignments, deadlines, and announcements feeds — no course-content system exists yet to generate real ones. The student dashboard shows an honest empty state there rather than a fabricated placeholder.', 'Honest Gap', { roadmap: true }));
  B.push(body('A student’s session is entirely separate from their guardian’s — a suspended or withdrawn student’s own login is blocked outright, while a graduate keeps access to their transcript and Ijazah record indefinitely.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 09. DIGITAL ACADEMIC ASSISTANT ============
{
  const B = [];
  B.push(eyebrow('Live System'));
  B.push(h1('The Digital Academic Assistant'));
  B.push(body('A conversational AI assistant, built on Claude, embedded on every page of the SHRS website — available in a floating chat widget that a family can open, minimise, or expand to full screen, in English or Arabic.'));
  B.push(body("It answers real questions about admissions, curriculum, the Hifz Journey, and school policies drawing on SHRS's own published information — and when a question needs a human, it hands off directly to a WhatsApp conversation with the right school office, routed by topic."));
  B.push(glass('What it is: an always-available answer engine for admissions and academic questions. What it is not: a personal AI tutor delivering lessons or grading student work — that is roadmap, not built.', null));
  B.push(glass('Every conversation is logged server-side through a single Cloudflare Pages Function calling the Claude API — no student data, grades, or portal records are exposed to the assistant.', null));
  B.push(statQuad([['2', 'Languages'], ['24/7', 'Availability'], ['1', 'WhatsApp Handoff'], ['Claude', 'Model Family']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 10. HIFZ & IJAZAH DIGITAL REGISTER ============
{
  const B = [];
  B.push(eyebrow("Live System · Qur'an College"));
  B.push(h1('Hifz & Ijazah, Made Visible'));
  B.push(lede("The one part of this digital campus with genuine Qur'an-College-specific depth — tracking a journey that used to live only in a teacher's private notebook."));
  B.push(hexFeature('01', "Per-Juz’ Progress", "Each of the 30 Juz' tracked individually — not started, memorising, pending review, or verified."));
  B.push(hexFeature('02', 'Muhaffiz-Entered Notes', 'Tajwid and Murajaah notes entered by the assessing teacher, gated behind a separate, narrower staff credential.'));
  B.push(hexFeature('03', 'Five-Stage Journey', "Current stage of the school's own published Hifz Journey, visible on the student's own dashboard."));
  B.push(hexFeature('04', 'Permanent Ijazah Register', "A record that is never deleted — only annotated — so a graduate's Ijazah stays verifiable years later."));
  B.push(glass('A public, third-party verification endpoint — so an employer or institution abroad could confirm an Ijazah’s authenticity directly — is a named future step, requiring its own access-control design. Not built yet.', 'Roadmap', { roadmap: true }));
  B.push(statQuad([['30', "Juz' Per Student"], ['5', 'Journey Stages'], ['Never', 'Deleted'], ['2', 'Views: Student & Guardian']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 11. ICT & COMPUTER LABORATORY ============
{
  const B = [];
  B.push(eyebrow('Our Infrastructure'));
  B.push(h1('The ICT & Computer Laboratory'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/ict-computer-laboratory.jpg', 460)] }));
  B.push(body('Digital literacy is not confined to a single subject at Sultan Hanafi — it runs through the ICT & Computer Laboratory, a dedicated facility where students build the foundational technology skills the digital systems described in this edition assume every family and student can use.'));
  B.push(statQuad([['1', 'Dedicated Lab'], ['2', 'Core Strands'], ['All', 'Year Groups'], ['7', 'SC Departments']]));
  B.push(body('Digital Literacy and Programming form the two core strands taught in the laboratory, sitting within the Secular College’s Mathematics & ICT department — one of seven academic departments spanning JSS 1–3 and SSS 1–3.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 12. PERSONALISATION & ADHKAR CENTRE ============
{
  const B = [];
  B.push(eyebrow('Live System'));
  B.push(h1('Personalisation & the Adhkār Centre'));
  B.push(lede('Not every real digital feature at Sultan Hanafi is academic — some are built to support a family’s spiritual life, on their own terms.'));
  B.push(h2('Personalisation Centre'));
  B.push(body('Accent colours, reading mode, text density, date/time format, and AI communication style — a site-wide panel letting every visitor tune the experience to their own preference, plus a self-service "Download My Data" export.'));
  B.push(h2('Adhkār Centre'));
  B.push(body('A dedicated Morning & Evening Adhkār experience with a Smart Tasbih Counter, Arabic text-to-speech, session tracking, and streaks — logged to a family’s own Guardian Portal dashboard when they choose to sign in.'));
  B.push(statQuad([['2', 'Adhkār Sessions Daily'], ['TTS', 'Arabic Recitation'], ['Streaks', 'Progress Tracking'], ['JS-Free', 'Fallback Included']]));
  B.push(h2('Islamic Preferences'));
  B.push(body('A real Hijri mini-calendar, Friday reminders, a fuller Islamic events list, and a rotating Verse or Hadith of the Day — woven into the same panel a visitor uses to change their accent colour.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 13. DATA-DRIVEN LEADERSHIP ============
{
  const B = [];
  B.push(eyebrow('Behind the Scenes'));
  B.push(h1('Data-Driven Leadership'));
  B.push(lede('The systems described in this edition are not only parent- and student-facing — they give the school’s own leadership a real, live view of the institution.'));
  B.push(hexFeature('FD', 'Founder / Executive Dashboard', 'A single real-time view of enrolment, attendance, and fee status across every school, drawn from the same database as the family-facing portals.', true));
  B.push(hexFeature('PE', 'Permission Engine', 'A data-driven access-control system, built directly from SHRS’s own published Role & Permission Matrix.', true));
  B.push(hexFeature('RO', "Registrar's Office", 'A real staff system for promotions, withdrawals, graduations, transfers, and certificate issuance.', true));
  B.push(hexFeature('SI', 'Staff Identity Platform', 'Real authenticated staff logins, distinct from guardian and student sessions.', true));
  B.push(glass('This is what "digital campus" means at Sultan Hanafi before it means anything else: a school that can see itself clearly, in real time, and govern itself accountably.', null));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 14. THE ROAD TO 2035 ============
{
  const B = [];
  B.push(eyebrow('Named, Not Built'));
  B.push(h1('The Road to 2035'));
  B.push(lede('Every item on this page is a deliberate future step, not a present capability. We name them because pretending otherwise would betray the same honesty this whole edition is built on.'));
  roadmapItem('Next', 'Teacher & Staff Identity Expansion', 'Extending real authenticated roles beyond guardians and students to teachers, principals, and administrators, each scoped by the Permission Engine.').forEach(p => B.push(p));
  roadmapItem('Roadmap', 'Full Learning Management System', 'Courses, modules, lessons, assessments, and certificates — a categorically larger build than anything live today, requiring a real content-authoring and hosting budget decision before it starts.').forEach(p => B.push(p));
  roadmapItem('Roadmap', 'MFA & Single Sign-On', 'Stronger authentication once a real provider is chosen — not "MFA-ready" scaffolding that does not actually gate anything.').forEach(p => B.push(p));
  roadmapItem('Roadmap', 'Payment Integration', 'Direct fee payment and reconciliation inside the Guardian Portal, via a Nigerian payment processor.').forEach(p => B.push(p));
  roadmapItem('Vision', 'Public Ijazah Verification', 'A third-party endpoint so any institution can confirm a graduate’s Ijazah authenticity directly, years after graduation.').forEach(p => B.push(p));
  roadmapItem('Named Gap', 'Arabic Portal Translation', 'Both live portals are English-only today, sitting outside the site’s Arabic build pipeline — a pre-existing gap, stated plainly rather than left unspoken.').forEach(p => B.push(p));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 15. CAMPUS & CONNECTIVITY ============
{
  const B = [];
  B.push(eyebrow('Our Campus'));
  B.push(h1('Campus & Connectivity'));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ children: [img('gallery/basic-technology-workshop-1.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ children: [img('gallery/campus-building.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('Fifteen, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State — the physical campus every digital system in this edition ultimately serves.'));
  B.push(statQuad([['2017', 'Campus Founded'], ['Cloudflare', 'Hosting Platform'], ['Neon', 'Postgres Database'], ['2', 'Site Languages']]));
  B.push(body('Built deliberately offline-tolerant in mind — a low-bandwidth, patchy-connection reality for many Ikorodu families is treated as a design constraint, not an edge case.', { italics: true, size: 18, color: INK_SOFT }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 16. JOIN THE DIGITAL CAMPUS ============
{
  const B = [];
  B.push(eyebrow('Join the Digital Campus'));
  B.push(h1('Begin at Sultan Hanafi'));
  B.push(lede('Admission at Sultan Hanafi now starts digitally — a guardian can register an account and submit an application directly through the Guardian Portal.'));
  [
    ['1. Register', 'Create a guardian account with email verification.'],
    ['2. Apply Online', 'Submit the admissions application directly from your dashboard.'],
    ['3. Staff Review', 'Reviewed by the admissions office through the Permission Engine.'],
    ['4. Enrolment', 'Once accepted, your child’s real academic record begins.'],
  ].forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 120, after: 20 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 22, bold: true, color: CHARCOAL })] })); B.push(body(d)); });
  B.push(glass('15, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State · info@shroyalschools.com · +234 807 374 7650 · shroyalschools.com', 'Speak With Admissions'));
  B.push(body('Prefer to ask first? The Digital Academic Assistant is available on every page of shroyalschools.com, in English or Arabic, and can hand you directly to the right school office on WhatsApp.'));
  sections.push({
    properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Future Digital Campus Edition', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    children: B,
  });
}

// ============ 17. BACK COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 260 }, children: [img('crest-full.png', 90)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 30, bold: true, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE FUTURE DIGITAL CAMPUS EDITION', font: BODY_FONT, size: 14, color: GOLD_BRIGHT, bold: true, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.com · +234 807 374 7650', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.com · @shroyal_schools', font: BODY_FONT, size: 18, color: GOLD_BRIGHT, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 800 }, children: [new TextRun({ text: 'FUTURE DIGITAL CAMPUS EDITION 2026 · NIGERIA', font: HEAD_FONT, size: 13, color: 'D9D2C0', characterSpacing: 15 })] }),
    ], { dark: true }),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Future Digital Campus Edition (Prospectus III, 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
