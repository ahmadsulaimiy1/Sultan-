// Generates the DOCX edition of "The Institutional Masterplan Edition" —
// Prospectus V, the final edition of the SHRS Multi-Flagship Publication
// Programme ("Brochure 02") — from the same real content as
// prospectus/masterplan/index.html. Kept as a separate script, not
// derived from the HTML, because DOCX is a flow format (no blueprint
// grid backgrounds or horizontal timeline connectors), so the Word
// edition is deliberately simpler in layout while carrying identical
// real copy and facts.
//
// This is the highest fabrication-risk edition in the collection — it
// documents governance, infrastructure, community impact, and an
// "international register," all grounded in SHRS's own published
// record (docs/prospectus-editorial-bible.md, docs/governance-master-
// register.md, docs/role-permission-matrix.md). It explicitly does
// NOT invent a dated "Vision 2035" target, a second physical campus,
// or formal international partnership agreements that do not exist —
// every such gap is named as a gap, not silently dropped or invented.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-masterplan-docx.js`.
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
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Institutional-Masterplan-Edition-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/commissioning-day-1.jpg': [1400, 1867],
  'gallery/campus-gate.jpg': [1400, 934],
  'gallery/scholarly-visit-1.jpg': [1400, 934],
  'gallery/scholarly-visit-2.jpg': [1400, 934],
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

// Institutional Masterplan palette — steel navy / burgundy / paper,
// distinct from the Imperial Heritage, Luxury Aspirational, Future Digital
// Campus, and Student Experience systems already built.
const NAVY = '1B3A5C', NAVY_DEEP = '122740', BURGUNDY = '7A2331', BURGUNDY_BRIGHT = '9E3A48';
const INK = '1E2429', INK_SOFT = '5A6268', PAPER = 'F5F3EE';

const HEAD_FONT = 'Arial';
const BODY_FONT = 'Calibri';

function eyebrow(text) {
  return new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), font: BODY_FONT, size: 16, color: BURGUNDY, characterSpacing: 30, bold: true })] });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 36, color: NAVY, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 21, color: NAVY, bold: true })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21, color: INK, ...opts })] });
}
function lede(text, opts = {}) {
  return new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text, font: BODY_FONT, size: 23, color: INK_SOFT, ...opts })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// Report panel — bordered callout, the DOCX equivalent of .im-panel.
function panel(text, tag) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'D9D5C8' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D9D5C8' },
      left: { style: BorderStyle.SINGLE, size: 24, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 4, color: 'D9D5C8' },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: PAPER },
      margins: { top: 200, bottom: 200, left: 260, right: 260 },
      children: [
        new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: tag.toUpperCase(), font: BODY_FONT, size: 13, bold: true, color: BURGUNDY })] }),
        new Paragraph({ children: [new TextRun({ text, font: BODY_FONT, size: 19, color: INK })] }),
      ],
    })] })],
  });
}

// Pillar row — numbered square badge, the DOCX equivalent of
// .im-pillar-row.
function pillar(label, title, desc) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'E4E1D8' }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100 }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, borders: { top: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY }, bottom: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY }, left: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY }, right: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY } },
          children: [new TextRun({ text: label, font: HEAD_FONT, size: 22, bold: true, color: BURGUNDY })] }),
      ] }),
      new TableCell({ width: { size: 90, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100 }, children: [
        new Paragraph({ children: [new TextRun({ text: title, font: HEAD_FONT, size: 21, bold: true, color: NAVY })] }),
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
      top: { style: BorderStyle.SINGLE, size: 4, color: NAVY }, bottom: { style: BorderStyle.SINGLE, size: 4, color: NAVY },
      left: { style: BorderStyle.SINGLE, size: 4, color: NAVY }, right: { style: BorderStyle.SINGLE, size: 4, color: NAVY },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: NAVY }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: NAVY },
    },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: 2650, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? '1E3350' : PAPER },
      margins: { top: 200, bottom: 200, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 28, bold: true, color: opts.dark ? BURGUNDY_BRIGHT : NAVY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: BODY_FONT, size: 13, color: opts.dark ? 'D9D5C8' : INK_SOFT, characterSpacing: 4 })] }),
      ],
    })) })],
  });
}

function timelineItem(year, title, desc) {
  return [
    new Paragraph({ spacing: { before: 140, after: 20 },
      children: [new TextRun({ text: year.toUpperCase() + '  ', font: BODY_FONT, size: 15, bold: true, color: BURGUNDY }), new TextRun({ text: title, font: HEAD_FONT, size: 21, bold: true, color: NAVY })] }),
    body(desc, { size: 18, color: INK_SOFT }),
  ];
}

function coverFrame(children, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY }, bottom: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY },
      left: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY }, right: { style: BorderStyle.SINGLE, size: 8, color: BURGUNDY },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? NAVY_DEEP : 'FFFFFF' },
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 260 }, children: [img('gallery/commissioning-day-1.jpg', 340)] }),
      new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS · NIGERIA', font: BODY_FONT, size: 15, bold: true, color: BURGUNDY, characterSpacing: 20 })] }),
      new Paragraph({ spacing: { after: 200 },
        children: [new TextRun({ text: 'The Institutional Masterplan Edition', font: HEAD_FONT, size: 38, bold: true, color: NAVY })] }),
      new Paragraph({ children: [new TextRun({ text: 'A structural account of what Sultan Hanafi Royal Schools has built — governance, infrastructure, and record — for the parents, regulators, partners, and donors who want to see the institution, not only the school.', font: BODY_FONT, size: 19, italics: true, color: INK_SOFT })] }),
    ], { dark: false }),
  ],
});
sections[0].children.push(pageBreak());

// ============ 02. FOUNDER'S STATEMENT ============
{
  const B = [];
  B.push(eyebrow("A Statement From the Founder"));
  B.push(h1('An Institution, Not Only a School'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('leadership/founder-ceo.jpg', 160)] }));
  B.push(body('Most prospectuses show you a school. This one is written to show you an institution — the governance behind it, the systems that run it, and the record it has already produced.'));
  B.push(body('My own background — two decades across banking, insurance, oil & gas, and consulting, an MSc from Edinburgh Business School, Heriot-Watt, a BSc from Oxford Brookes, and fellowships with the ACCA UK and ICAN — shapes how I have built this school.'));
  B.push(panel('Sultan Hanafi Royal Schools is young — registered December 2017, with the Royal College established in 2021. Our case for trust rests on what we have actually built in that time, documented plainly in the pages that follow.', "Founder's Note"));
  B.push(statQuad([['2017', 'Founded'], ['2021', 'Royal College Established'], ['23', 'Governance Documents'], ['2026', 'Ministry Registered']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 03. CONTENTS ============
{
  const B = [];
  B.push(eyebrow('Contents'));
  B.push(h1('A Structural Account'));
  B.push(lede('Each chapter documents one dimension of the institution — real, dated, and drawn from what has actually been built and recorded.'));
  const toc = [
    ['Institutional Overview', '04'], ['Our Journey, 2017–2026', '05'], ['Governance Architecture', '06'],
    ['The Policy Framework', '07'], ['Digital Campus Infrastructure', '08'], ['Built to Scale', '09'],
    ['Community & Impact', '10'], ['International Register', '11'], ['Our Vision', '12'],
    ['The Road Ahead', '13'], ['Academic Milestones', '14'], ['Partner With Us', '15'],
  ];
  toc.forEach(([t, p]) => B.push(new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: t, font: BODY_FONT, size: 20, color: INK }), new TextRun({ text: '\t' + p, font: HEAD_FONT, size: 20, color: BURGUNDY, bold: true })] })));
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(panel("Every figure, date, and claim in this edition is drawn from SHRS's own governance register, technical documentation, and published record. Where a plan is real but not yet executed, it is named as such — this edition does not invent a dated strategic target, a second campus, or a formal partnership that does not exist.", 'A Note on Method'));
  B.push(statQuad([['12', 'Chapters'], ['16', 'Pages'], ['4', 'Audiences Addressed'], ['0', 'Fabricated Claims']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 04. INSTITUTIONAL OVERVIEW ============
{
  const B = [];
  B.push(eyebrow('At a Glance'));
  B.push(h1('Institutional Overview'));
  B.push(lede('Sultan Hanafi Royal Schools in structural summary — four institutions, one governance architecture, one crest.'));
  B.push(statQuad([['2017', 'Founded'], ['4', 'Schools, One Foundation'], ['23', 'Governance Documents'], ['7', 'Royal College Departments']]));
  B.push(body("Nursery & Primary, the Royal College, the Qur'an College, and the School of Islamic & Arabic Studies operate under one foundation, one crest, and one governance architecture."));
  B.push(pillar('1', 'Founded on Filial Honour', "Named for the founder's late father, Anofi Aliu Akano — grown from the Imowonla community outward."));
  B.push(pillar('2', 'Hybrid by Design', 'Islamic and secular education held as equally rigorous, not one subordinate to the other.'));
  B.push(pillar('3', 'Open to All', 'Open to Muslims and non-Muslims, males and females — a stated welcome, not a marketing gesture.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 05. OUR JOURNEY ============
{
  const B = [];
  B.push(eyebrow('Our Journey, 2017–2026'));
  B.push(h1('A Timeline of What Was Actually Built'));
  timelineItem('2017', 'Foundation', 'Sultan Hanafi Royal Schools registered, rooted in the Imowonla community, Ikorodu, Lagos State.').forEach(p => B.push(p));
  timelineItem('2021', 'Royal College Established', 'Junior and Senior Secondary programmes launched for students from age ten.').forEach(p => B.push(p));
  timelineItem('2022', "Qur'an College & Islamic Studies Formalised", 'Formally established, with Saudi Arabian curriculum resources and Ijazah certification.').forEach(p => B.push(p));
  timelineItem('2024', 'Ramadan Competition & ALA Prize', 'Inaugural Ramadan Qur’an Competition; the ALA Endowment Prize established by Mr Lukman Anofi.').forEach(p => B.push(p));
  timelineItem('2025', 'Governor Commission', 'Commissioned by Engr. Seyi Makinde, Executive Governor of Oyo State.').forEach(p => B.push(p));
  timelineItem('2026', 'Ministry Registration & Digital Campus', 'Royal College achieved Ministry Registration and sat its first BECE cohort; Guardian and Student Portals went live.').forEach(p => B.push(p));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 06. GOVERNANCE ARCHITECTURE ============
{
  const B = [];
  B.push(eyebrow('Governance Architecture'));
  B.push(h1('A Chain of Accountability'));
  B.push(lede('Board → Founder & CEO → Management Team → Heads of Department → Educators → Committees → Student Representatives → Prefects → Class Captains — one architecture, visible at every level.'));
  B.push(pillar('1', 'Board of Trustees', "The institution's highest governing authority."));
  B.push(pillar('2', 'Founder & Chief Executive Officer', 'Sultan Zakariya Olanrewaju Hanafi, PhD — executive leadership across all four schools.'));
  B.push(pillar('3', 'Management Team & Heads of Department', 'Principals and Head Teachers reporting to the Founder & CEO.'));
  B.push(pillar('4', 'Educators & Governance Committees', 'Faculty delivering the curriculum and the Hifz Journey.'));
  B.push(pillar('5', 'Student Leadership', 'Student Representatives, School Prefects, and Class Captains.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 07. THE POLICY FRAMEWORK ============
{
  const B = [];
  B.push(eyebrow('The Policy Framework'));
  B.push(h1('Twenty-Three Governance Documents'));
  B.push(lede('Drafted in four disciplined phases, each reviewed for cross-document consistency before the next began.'));
  B.push(h2('Governance & Safeguarding'));
  B.push(body('Constitution & Governance Charter, Child Protection & Safeguarding Policy, Designated Safeguarding Lead Framework, Emergency Response Plan.'));
  B.push(h2('Academic & Student Affairs'));
  B.push(body('Academic Regulations, Student Code of Conduct, Student Handbook, Boarding Regulations, Admissions Policy.'));
  B.push(h2("Islamic & Qur'an Education"));
  B.push(body("Hifz Regulations, Ijazah Governance Framework — the school's own five-stage Hifz methodology, formally codified."));
  B.push(h2('Technology, HR & Finance'));
  B.push(body('AI Usage Policy, Information Security Policy, Acceptable Use Policy, Records Retention Policy, Staff Handbook, Financial Controls Policy.'));
  B.push(statQuad([['6', 'Phase A Documents'], ['5', 'Phase B Documents'], ['10', 'Phase C Documents'], ['2', 'Phase D Documents']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 08. DIGITAL CAMPUS INFRASTRUCTURE ============
{
  const B = [];
  B.push(eyebrow('Digital Campus Infrastructure'));
  B.push(h1('A Governed Operating System, Not a Website'));
  B.push(lede('Most competitor prospectuses show buildings and uniforms. Sultan Hanafi can show a governed, audited, permission-controlled institutional operating system.'));
  B.push(pillar('1', 'Guardian & Student Portals', 'Two independent, database-backed authenticated roles.'));
  B.push(pillar('2', 'Permission Engine', 'Data-driven access control, built from the published Role & Permission Matrix.'));
  B.push(pillar('3', 'Founder / Executive Dashboard', 'A real-time institutional view of enrolment, attendance, and fee status.'));
  B.push(pillar('4', "Registrar's Office", 'A formal system of record for promotions, withdrawals, graduations, transfers, and certificate issuance.'));
  B.push(pillar('5', 'Staff Identity Platform', 'Authenticated staff logins distinct from guardian and student sessions.'));
  B.push(statQuad([['Neon', 'Postgres Database'], ['Cloudflare', 'Hosting Platform'], ['5', 'Governed Systems'], ['1', 'Shared Data Source']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 09. BUILT TO SCALE ============
{
  const B = [];
  B.push(eyebrow('Built to Scale'));
  B.push(h1('Architecture Designed for Growth'));
  B.push(lede('A structural fact about how the institution’s systems are built — not an announcement of a second campus.'));
  B.push(body('Every role in the Digital Campus’s Permission Engine is expressed as role + institution, never a flat global grant. Nothing in this structure is Sultan Hanafi–specific by design.'));
  B.push(panel('Adding a second campus, a fifth institution, or a future tier of education means adding new institution and class records to the same architecture — it does not mean redesigning who can see what.', 'What This Means'));
  B.push(panel('This is a description of technical and governance readiness, not an announcement. Sultan Hanafi Royal Schools has not announced a second physical campus. When a real expansion decision is made, it will be documented here — not before.', 'What This Is Not'));
  B.push(statQuad([['Role +', 'Institution Model'], ['1', 'INSERT to Add a Campus'], ['0', 'Redesign Required'], ['0', 'Campuses Announced']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 10. COMMUNITY & IMPACT ============
{
  const B = [];
  B.push(eyebrow('Community & Impact'));
  B.push(h1('Beyond the Classroom Gates'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/campus-gate.jpg', 420)] }));
  B.push(body('Rooted in the Imowonla community in Ikorodu, Sultan Hanafi has grown into a byword for what focused, values-led education can do for an underserved area — extending its reach through free community lectures, humanitarian relief during the COVID-19 lockdown, and infrastructure support such as road maintenance and community electrification.'));
  B.push(statQuad([['Free', 'Community Lectures'], ['COVID-19', 'Lockdown Relief'], ['Roads', 'Maintenance Support'], ['Power', 'Electrification Support']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 11. INTERNATIONAL REGISTER ============
{
  const B = [];
  B.push(eyebrow('International Register'));
  B.push(h1('A Real, Not Aspirational, International Footprint'));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ children: [img('gallery/scholarly-visit-1.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ children: [img('gallery/scholarly-visit-2.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('Our Founder holds degrees from Oxford Brookes University and Edinburgh Business School (Heriot-Watt University), and the school documents real scholarly visits abroad.'));
  B.push(panel('Sultan Hanafi Royal Schools does not currently hold formal international partnership agreements or memoranda of understanding with named foreign institutions. Where such an agreement is signed, it will be documented here with the partner named — not before.', 'What This Is Not'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 12. OUR VISION ============
{
  const B = [];
  B.push(eyebrow('Our Vision'));
  B.push(h1('A Trajectory, Not a Slogan'));
  B.push(panel('"To be recognised as a leading institution excelling in knowledge dissemination and character building — creating a positive impact wherever our presence is felt."', 'Our Published Vision'));
  B.push(body('This is the one vision statement Sultan Hanafi Royal Schools has actually published. Rather than attach a fabricated dated target to it, this edition treats the statement as a direction, proven by the evidence documented throughout.'));
  B.push(panel('"To provide a holistic education — imparting both Islamic and secular knowledge through rigorous research, instilling ethical behaviour, and contributing to a secure, informed, and progressive society."', 'Our Published Mission'));
  B.push(pillar('V', 'Character Building', 'The CLEVER framework — Creativity, Leadership, Engagement, Versatility, Ethics, Reliability — is how the Vision statement’s "character building" clause is actually operationalised.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 13. THE ROAD AHEAD ============
{
  const B = [];
  B.push(eyebrow('Named, Not Invented'));
  B.push(h1('The Road Ahead'));
  B.push(lede('Real, deliberate next steps in the institution’s own governance and infrastructure roadmap — named plainly rather than dressed as a completed plan.'));
  timelineItem('Next', 'Teacher & Staff Identity Expansion', 'Extending authenticated roles beyond guardians and students to teachers, principals, and administrators.').forEach(p => B.push(p));
  timelineItem('Planned', 'Registrar, Admissions & Finance Office Activation', 'Bringing the remaining offices named in the Role & Permission Matrix onto the same governed platform.').forEach(p => B.push(p));
  timelineItem('Roadmap', 'Full Learning Management System', 'Courses, assessments, and certificates — a categorically larger build requiring a real budget decision.').forEach(p => B.push(p));
  timelineItem('Roadmap', 'MFA, SSO & Payment Integration', 'Stronger authentication and direct fee payment, once real providers are selected.').forEach(p => B.push(p));
  timelineItem('Named Gap', 'Arabic Translation, Full Portal Coverage', 'Both live portals remain English-only today — a pre-existing gap, named plainly.').forEach(p => B.push(p));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 14. ACADEMIC MILESTONES ============
{
  const B = [];
  B.push(eyebrow('Academic Milestones'));
  B.push(h1('Results the Institution Can Point To'));
  B.push(statQuad([['2026', 'Ministry Registered'], ['1st', 'BECE Cohort Sat'], ['2025', 'Governor Commission'], ['2024', 'ALA Prize Established']]));
  B.push(body('By 2026, the Royal College had achieved Ministry Registration with the Lagos State Ministry of Education and seen its first cohort sit the Basic Education Certificate Examination.'));
  B.push(panel('"Sultan Hanafi Royal Schools stands as a blueprint for how education can be a vehicle for transformative social change within marginalised communities." — Punch Newspaper, November 2025', 'Press Recognition'));
  B.push(pillar('7', 'Royal College Departments', 'Languages, Mathematics & ICT, Humanities, Science & Technology, Commerce & Management, Arabic, and Islamic Sciences.'));
  B.push(pillar('Q', "Qur'an College Ijazah Outcomes", 'A 24–36 month full-immersion Hifz programme, culminating in a certified, permanently recorded Ijazah.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 15. PARTNER WITH US ============
{
  const B = [];
  B.push(eyebrow('Partner With Us'));
  B.push(h1('Whoever You Are, There Is a Real Way In'));
  B.push(lede('This edition was written for more than one reader. Each finds a different, real point of entry below.'));
  B.push(pillar('P', 'Parents', 'Begin an application through the Guardian Portal, or contact Admissions directly.'));
  B.push(pillar('R', 'Regulators', 'Our full governance register and Ministry registration record are available on request.'));
  B.push(pillar('D', 'Donors & Partners', 'The Sultan Zakariya Hanafi Foundation extends this institution’s mission into the wider community.'));
  B.push(pillar('S', 'Prospective Students & Alumni', 'Every Hifz & Ijazah record is permanent and verifiable years after graduation.'));
  B.push(panel('15, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State · info@shroyalschools.ng · +234 807 374 7650', 'Speak With Us'));
  sections.push({
    properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Institutional Masterplan Edition', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    children: B,
  });
}

// ============ 16. BACK COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 260 }, children: [img('crest-full.png', 90)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 30, bold: true, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE INSTITUTIONAL MASTERPLAN EDITION', font: BODY_FONT, size: 14, color: BURGUNDY_BRIGHT, bold: true, characterSpacing: 15 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.ng · +234 807 374 7650', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.ng · @shroyal_schools', font: BODY_FONT, size: 18, color: BURGUNDY_BRIGHT, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 800 }, children: [new TextRun({ text: 'INSTITUTIONAL MASTERPLAN EDITION 2026 · NIGERIA', font: HEAD_FONT, size: 13, color: 'D9D5C8', characterSpacing: 15 })] }),
    ], { dark: true }),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Institutional Masterplan Edition (Prospectus V, 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
