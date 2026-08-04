// Generates the DOCX edition of "The Luxury Aspirational Edition" —
// Prospectus II of the SHRS Multi-Flagship Publication Programme, rebuilt
// per the Founder's explicit brand-consistency correction: this edition
// keeps SHRS's real brand colours (coffee brown / gold / cream / bronze),
// differentiating from Brochure 01 through editorial philosophy — layout,
// photography, typography, and ornament — not colour. Mirrors the real
// content of prospectus/aspirational/index.html. Kept as a separate
// script, not derived from the HTML, because DOCX is a flow format.
//
// Requires the `docx` npm package (already installed in this sandbox).
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `NODE_PATH=/opt/node22/lib/node_modules node scripts/generate-aspirational-docx.js`.
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
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Luxury-Aspirational-Edition-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/recitation-assembly-1.jpg': [1400, 1400],
  'gallery/recitation-assembly-2.jpg': [1400, 1400],
  'gallery/recitation-assembly-3.jpg': [1400, 1400],
  'gallery/spelling-competition.jpg': [1280, 960],
  'gallery/quran-recitation-1.jpg': [1600, 721],
  'leadership/founder-ceo.jpg': [607, 900],
  'gallery/campus-building.jpg': [1400, 934],
  'gallery/games-recreation.jpg': [2248, 1500],
  'gallery/basic-technology-workshop-2.jpg': [1400, 934],
  'gallery/basic-school-classroom.jpg': [1040, 780],
  'gallery/chemistry-laboratory.jpg': [1400, 934],
  'gallery/campus-gate.jpg': [1400, 934],
  'gallery/commissioning-day-1.jpg': [1400, 1867],
  'gallery/commissioning-day-2.jpg': [1400, 1867],
  'gallery/college-hall.jpg': [1600, 721],
  'gallery/islamic-prayer-hall.jpg': [1040, 780],
  'gallery/scholarly-visit-1.jpg': [1600, 721],
  'gallery/scholarly-visit-2.jpg': [1600, 1600],
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

// Luxury Aspirational palette — SHRS's real brand tokens (identical to
// css/brand.css / the Imperial Heritage prospectus). Differentiation from
// Brochure 01 comes from typography and layout, not colour.
const COFFEE = '3B2A1D', COFFEE_DEEP = '221709', BRONZE = '7C5430', BRONZE_BRIGHT = 'A47843';
const GOLD = 'C6A15B', GOLD_BRIGHT = 'E9CE8A';
const IVORY = 'F7EEDF', INK = '2A2016', INK_SOFT = '6B5C4A';

// Word-safe font pairing distinct from the Masterplan (Arial/Calibri) and
// Imperial Heritage (Cinzel/Cormorant) systems — Constantia's italic form
// approximates Fraunces's editorial elegance; Garamond echoes Cormorant
// Garamond's warmth for body copy.
const HEAD_FONT = 'Constantia';
const BODY_FONT = 'Garamond';
const LABEL_FONT = 'Gill Sans MT';

function eyebrow(text, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), font: LABEL_FONT, size: 16, color: opts.dark ? GOLD_BRIGHT : BRONZE, characterSpacing: 40 })] });
}
function h1(text, opts = {}) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 40, color: opts.dark ? 'FFFFFF' : COFFEE, bold: true, italics: true })] });
}
function h2(text, opts = {}) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 23, color: opts.dark ? GOLD_BRIGHT : COFFEE, bold: true })] });
}
function body(text, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 22, color: opts.dark ? 'F7EEDF' : INK, ...opts })] });
}
function lede(text, opts = {}) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 25, italics: true, color: opts.dark ? GOLD_BRIGHT : COFFEE, ...opts })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// Rosette divider — the DOCX equivalent of .lx-rosette: a small centred
// gold ornamental mark flanked by thin rules, this edition's chapter-
// opener/divider system in place of Brochure 01's corner-brackets.
function rosette() {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 4 } },
    children: [new TextRun({ text: '  ✦  ', font: BODY_FONT, size: 18, color: GOLD, bold: true })] });
}

// Pull quote — large centred italic quote treatment, the DOCX equivalent
// of .lx-pullquote.
function pullquote(text, who, opts = {}) {
  const rows = [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: who ? 40 : 160 },
    children: [new TextRun({ text: `“${text}”`, font: HEAD_FONT, size: 26, italics: true, bold: true, color: opts.dark ? 'FFFFFF' : COFFEE })] })];
  if (who) rows.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 },
    children: [new TextRun({ text: who.toUpperCase(), font: LABEL_FONT, size: 15, color: opts.dark ? GOLD_BRIGHT : BRONZE, characterSpacing: 15 })] }));
  return rows;
}

// Stat band — gold-framed cell row, the DOCX equivalent of .lx-stats.
function statQuad(cells, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2650, 2650, 2650, 2650],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D9C79A' },
    },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: 2650, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? COFFEE_DEEP : 'FFFFFF' },
      margins: { top: 200, bottom: 200, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 30, bold: true, color: opts.dark ? GOLD_BRIGHT : COFFEE })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: LABEL_FONT, size: 12, color: opts.dark ? 'D9C79A' : INK_SOFT, characterSpacing: 6 })] }),
      ],
    })) })],
  });
}

// Feature row — refined, hairline-rule divided, the DOCX equivalent of
// .lx-feature (no icon badge, unlike the other editions' systems).
function feature(title, desc, opts = {}) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 20 },
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: opts.dark ? '4A3D2C' : 'E4D5B0', space: 8 } },
      children: [new TextRun({ text: title, font: HEAD_FONT, size: 22, bold: true, color: opts.dark ? 'FFFFFF' : COFFEE })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
      children: [new TextRun({ text: desc, font: BODY_FONT, size: 19, color: opts.dark ? 'E9E0CE' : INK_SOFT })] }),
  ];
}

function coverFrame(children, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? COFFEE_DEEP : IVORY },
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 260 }, children: [img('gallery/recitation-assembly-1.jpg', 320)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS · NIGERIA', font: LABEL_FONT, size: 15, color: GOLD_BRIGHT, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: 'Where Extraordinary Is Formed', font: HEAD_FONT, size: 42, bold: true, italics: true, color: 'FFFFFF' })] }),
      rosette(),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'The Luxury Aspirational Edition — a publication on the young people this institution is forming, one character at a time.', font: HEAD_FONT, size: 20, italics: true, color: GOLD_BRIGHT })] }),
    ], { dark: true }),
  ],
});
sections[0].children.push(pageBreak());

// ============ 02. OPENING STATEMENT ============
{
  const B = [];
  B.push(eyebrow('To Every Parent Who Believes', { dark: true }));
  B.push(h1('You Are Not Choosing a School', { dark: true }));
  B.push(lede('You are choosing who your child is permitted to become.', { dark: true }));
  B.push(rosette());
  B.push(body('Every institution promises excellence. Few can show you the formation itself — the leadership tiers a child climbs, the Juz’ they memorise one at a time, the character traits a teacher watches for by name. This edition is a factual account of that formation, not an aspiration.', { dark: true }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 1400, bottom: 1400, left: 1400, right: 1400 } }, background: { color: COFFEE_DEEP } }, children: B });
}

// ============ 03. CONTENTS ============
{
  const B = [];
  B.push(eyebrow('Contents'));
  B.push(h1('The Journey, Chapter by Chapter'));
  const toc = [
    ['A Vision for Your Child', '04'], ['The Making of a Leader', '05'], ['Character by Design', '06'],
    ["The Scholar's Journey", '07'], ["The Scholar's Journey, Continued", '08'], ['Portraits of Distinction', '09'],
    ["A Parent's Aspiration", '10'], ['The Five Pathways', '11'], ['A Campus Built for Becoming', '12'],
    ['Where Character Meets Craft', '13'], ['Beyond Graduation', '14'], ['Begin Their Story', '15'],
  ];
  toc.forEach(([t, p]) => B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: t + '   ', font: BODY_FONT, size: 21, color: INK }), new TextRun({ text: p, font: HEAD_FONT, size: 21, color: BRONZE, bold: true })] })));
  B.push(rosette());
  pullquote('Since joining SULTAN, the improvement in my children’s academic performance and character has been remarkable.', 'Dr Ismail Akeem Seriki · Parent, Three Children Enrolled').forEach(p => B.push(p));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 04. A VISION FOR YOUR CHILD ============
{
  const B = [];
  B.push(eyebrow('A Vision for Your Child'));
  B.push(h1('Who They Are Called to Become'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('leadership/founder-ceo.jpg', 170)] }));
  pullquote('Together, let us embark on a journey where every child discovers not only what they know, but who they are called to become.', 'Zakariya Olanrewaju Anofi · Founder & Head of Schools/Administrator').forEach(p => B.push(p));
  B.push(body('This edition follows that journey in the words of the people living it — students memorising Qur’an one Juz’ at a time, parents watching character take shape at home, and teachers naming the leadership traits they see forming.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 05. THE MAKING OF A LEADER ============
{
  const B = [];
  B.push(eyebrow('The Making of a Leader'));
  B.push(h1('Leadership Is Not Awarded. It Is Formed.'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/spelling-competition.jpg', 420)] }));
  B.push(body('Guided by the CLEVER framework — Creativity, Leadership, Engagement, Versatility, Ethics, Reliability — every student at Sultan Hanafi is mentored toward leadership long before any title is given.'));
  B.push(statQuad([['6', 'CLEVER Traits'], ['3', 'Leadership Tiers'], ['2024', 'ALA Prize Established'], ['3', 'Prize Winners Per Term']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 06. CHARACTER BY DESIGN ============
{
  const B = [];
  B.push(eyebrow('Character by Design'));
  B.push(h1('Three Tiers, One Standard'));
  feature('Student Representatives', 'The most senior student voice — elected, mentored, accountable to the Head of Schools/Administrator.').forEach(p => B.push(p));
  feature('School Prefects', 'Responsible for daily conduct and discipline across the student body.').forEach(p => B.push(p));
  feature('Class Captains', 'The first rung of leadership — accountability practised at the smallest scale.').forEach(p => B.push(p));
  feature('Student Clubs', 'The broadest tier of the leadership pathway — voluntary, interest-led groups open to every pupil.').forEach(p => B.push(p));
  pullquote('The ALA Endowment Prize, established in 2024 by Mr Lukman Anofi, rewards three students each term for embodying the CLEVER standard.', null).forEach(p => B.push(p));
  B.push(statQuad([['2024', 'ALA Prize Established'], ['3', 'Tiers of Leadership'], ['Termly', 'Prize Cycle'], ['6', 'CLEVER Traits Assessed']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 07. THE SCHOLAR'S JOURNEY ============
{
  const B = [];
  B.push(eyebrow("The Scholar's Journey", { dark: true }));
  B.push(h1('Thirty Juz’, One Verse at a Time', { dark: true }));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/quran-recitation-1.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/recitation-assembly-2.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('The Qur’an College’s Hifz Journey moves a student through five formal stages, from enrolment to a certified Ijazah — each stage assessed by a Muhaffiz before the next begins.', { dark: true }));
  B.push(statQuad([['24–36', 'Months, Full Programme'], ['30', "Juz' to Memorise"], ['2024', 'Ramadan Competition Since'], ['Ijazah', 'Certified Outcome']], { dark: true }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } }, background: { color: COFFEE_DEEP } }, children: B });
}

// ============ 08. THE SCHOLAR'S JOURNEY, CONTINUED ============
{
  const B = [];
  B.push(eyebrow("The Scholar's Journey, Continued"));
  B.push(h1('Scholarship Beyond Memorisation'));
  B.push(body('Islamic and Arabic Studies run alongside the Hifz Journey — weekday and weekend programmes covering Tajweed, Islamic history, and Arabic language, open to students across every stage of the school.'));
  pullquote('And whoever is grateful, it is only for the benefit of his own soul. — Surah Al-Mujadilah 58:11', null).forEach(p => B.push(p));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [img('gallery/recitation-assembly-3.jpg', 300)] }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 09. PORTRAITS OF DISTINCTION ============
{
  const B = [];
  B.push(eyebrow('Portraits of Distinction'));
  B.push(h1('Success, Documented'));
  B.push(statQuad([['2026', 'Ministry Registered'], ['1st', 'BECE Cohort Sat'], ['2025', 'Governor Commission'], ['7', 'Academic Departments']]));
  B.push(body('By 2026, the Secular College had achieved Ministry Registration with the Lagos State Ministry of Education and seen its first cohort sit the Basic Education Certificate Examination — a milestone every student in that cohort now carries with them.'));
  pullquote('Sultan Hanafi Royal Schools stands as a blueprint for how education can be a vehicle for transformative social change within marginalised communities.', 'Punch Newspaper · November 2025').forEach(p => B.push(p));
  B.push(rosette());
  B.push(body('In 2025, Sultan Hanafi Royal Schools was commissioned by Engr. Seyi Makinde, Executive Governor of Oyo State — a distinguished endorsement of an institution rooted equally in Qur’anic scholarship and secular excellence.'));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/commissioning-day-1.jpg', 180)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/commissioning-day-2.jpg', 180)] })] }),
    ] })] });
  B.push(gridRow);
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 10. A PARENT'S ASPIRATION ============
{
  const B = [];
  B.push(eyebrow("A Parent's Aspiration", { dark: true }));
  B.push(h1('Told Best by Those Who Chose Us', { dark: true }));
  pullquote('The calibre of teachers here is outstanding — skilled, certified, professional educators genuinely invested in each child’s future.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018', { dark: true }).forEach(p => B.push(p));
  B.push(rosette());
  pullquote('One thing I look out for in schools is the calibre of teachers they have. Most private schools don’t employ quality teachers — but at SULTAN, in most of their recruitments they look for experienced educators with PhD, M.Sc., PGDE, or B.Sc. Education qualifications.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018', { dark: true }).forEach(p => B.push(p));
  pullquote('Since joining SULTAN, the improvement in my children’s academic performance and character has been remarkable.', 'Dr Ismail Akeem Seriki · Parent, Three Children Enrolled', { dark: true }).forEach(p => B.push(p));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } }, background: { color: COFFEE_DEEP } }, children: B });
}

// ============ 11. THE FIVE PATHWAYS ============
{
  const B = [];
  B.push(eyebrow('The Five Pathways'));
  B.push(h1('One Vision, Five Ways to Reach It'));
  feature('Basic School', 'From age two, the foundation of faith and academic discipline, laid before a child ever sits a formal exam.').forEach(p => B.push(p));
  feature('Secular College', 'Seven academic departments, JSS 1–3 and SSS 1–3, for students aged ten and above.').forEach(p => B.push(p));
  feature("Qur'an College", 'A parallel track for full Hifz immersion, open to students aged nine to sixteen.').forEach(p => B.push(p));
  feature('Islamiyyah College', 'Weekday and weekend programmes running alongside every other stage of the journey.').forEach(p => B.push(p));
  feature('Online & Distance Learning School', 'Newly established in 2026 — a fifth institution just taking shape, with headship not yet appointed and no students or curriculum yet.').forEach(p => B.push(p));
  pullquote('Open to Muslims and non-Muslims, males and females — a welcome stated plainly, not a marketing gesture.', null).forEach(p => B.push(p));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/basic-school-classroom.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/chemistry-laboratory.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 12. A CAMPUS BUILT FOR BECOMING ============
{
  const B = [];
  B.push(eyebrow('Our Campus'));
  B.push(h1('A Campus Built for Becoming'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/campus-building.jpg', 420)] }));
  B.push(body('Fifteen, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State — a dedicated prayer hall, science and technology laboratories, an ICT & Computer Laboratory, and residential boarding for Secular College and Qur’an College students, all built around the same rhythm of prayer and disciplined study.'));
  B.push(statQuad([['2017', 'Campus Founded'], ['5', 'Institutions, One Foundation'], ['1', 'Prayer Hall'], ['Yes', 'Boarding Available']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 13. WHERE CHARACTER MEETS CRAFT ============
{
  const B = [];
  B.push(eyebrow('Where Character Meets Craft', { dark: true }));
  B.push(h1('The Ordinary Joys of an Extraordinary Formation', { dark: true }));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/games-recreation.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/basic-technology-workshop-2.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('Spelling competitions, recreation periods, and hands-on technology workshops give students room to compete, build, and simply be children — the ordinary joy that makes formation feel less like instruction and more like belonging.', { dark: true }));
  B.push(rosette());
  B.push(body('Inter-class spelling competitions turn vocabulary into a spectator sport; Basic Technology Workshops give younger students hands-on building and problem-solving, part of the practical curriculum long before it becomes an exam subject.', { dark: true }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } }, background: { color: COFFEE_DEEP } }, children: B });
}

// ============ 14. BEYOND GRADUATION ============
{
  const B = [];
  B.push(eyebrow('Beyond Graduation'));
  B.push(h1('A Formation That Outlasts the Classroom'));
  B.push(body('A Sultan Hanafi Ijazah is a certified, permanently recorded credential — verifiable years after graduation, wherever a student’s path leads next. BECE, WAEC, and NECO examinations mark the culmination of the Secular College years; for Qur’an College students, the Ijazah marks a different but equally permanent achievement.'));
  B.push(rosette());
  B.push(body('What a student carries out of Sultan Hanafi is not only a certificate. It is a character formed under a standard — the one this entire edition has attempted to make visible.'));
  B.push(statQuad([['BECE', 'Secular Milestone'], ['WAEC', 'Secular Milestone'], ['NECO', 'Secular Milestone'], ['Ijazah', 'Spiritual Milestone']]));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100, top: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/college-hall.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100, top: 160 }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [img('gallery/islamic-prayer-hall.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 15. BEGIN THEIR STORY ============
{
  const B = [];
  B.push(eyebrow('Begin Their Story', { dark: true }));
  B.push(h1('Every Extraordinary Journey Starts With One Enquiry', { dark: true }));
  feature('1. Initial Enquiry', 'Contact the school in person, by telephone, or via our website.', { dark: true }).forEach(p => B.push(p));
  feature('2. Admission Form', 'Purchased and completed with supporting documentation.', { dark: true }).forEach(p => B.push(p));
  feature('3. Entrance Assessment', 'An examination and interview enable optimal class placement.', { dark: true }).forEach(p => B.push(p));
  feature('4. Enrolment', 'A formal Admission Letter and Class Acceptance Ticket are issued.', { dark: true }).forEach(p => B.push(p));
  B.push(rosette());
  B.push(body('Documents Required: Birth certificate · Passport photographs (2) · School report · Completed admission form', { dark: true }));
  pullquote('15, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State · info@shroyalschools.ng · +234 807 374 7650', null, { dark: true }).forEach(p => B.push(p));
  sections.push({
    properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } }, background: { color: COFFEE_DEEP } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Luxury Aspirational Edition', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    children: B,
  });
}

// ============ 16. BACK COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1600, after: 260 }, children: [img('crest-full.png', 90)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 30, bold: true, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE LUXURY ASPIRATIONAL EDITION', font: LABEL_FONT, size: 14, color: GOLD_BRIGHT, bold: true, characterSpacing: 15 })] }),
      rosette(),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.ng · +234 807 374 7650', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.ng · @shroyal_schools', font: BODY_FONT, size: 18, color: GOLD_BRIGHT, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 700 }, children: [new TextRun({ text: 'LUXURY ASPIRATIONAL EDITION 2026 · NIGERIA', font: LABEL_FONT, size: 13, color: 'D9C79A', characterSpacing: 15 })] }),
    ], { dark: true }),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Luxury Aspirational Edition (Prospectus II, 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
