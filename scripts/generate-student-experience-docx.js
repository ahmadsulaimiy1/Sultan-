// Generates the DOCX edition of "The Student Experience Edition" —
// Prospectus IV of the SHRS Multi-Flagship Publication Programme
// ("Brochure 02") — from the same real content as
// prospectus/student-experience/index.html. Kept as a separate script,
// not derived from the HTML, because DOCX is a flow format (no rotated
// Polaroid frames or full-bleed hero photos), so the Word edition is
// deliberately simpler in layout while carrying identical real copy,
// photography, and the same real parent testimonials/facts used
// throughout this engagement. No invented student names or quotes —
// every voice quoted here is a real, previously-verified source.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-student-experience-docx.js`.
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
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Student-Experience-Edition-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/recitation-assembly-1.jpg': [1400, 1400],
  'gallery/recitation-assembly-2.jpg': [1400, 1400],
  'gallery/recitation-assembly-3.jpg': [1400, 1400],
  'gallery/basic-school-classroom.jpg': [1040, 780],
  'gallery/basic-school-classroom-2.jpg': [1040, 780],
  'gallery/quran-recitation-1.jpg': [1600, 721],
  'gallery/games-recreation.jpg': [1400, 934],
  'gallery/spelling-competition.jpg': [1280, 960],
  'gallery/spelling-competition-2.jpg': [1280, 960],
  'gallery/basic-technology-workshop-2.jpg': [1400, 934],
  'gallery/boarding-dining.jpg': [1400, 934],
  'gallery/commissioning-day-1.jpg': [1400, 1867],
  'gallery/commissioning-day-2.jpg': [1400, 1867],
  'gallery/scholarly-visit-1.jpg': [1400, 934],
  'gallery/scholarly-visit-2.jpg': [1400, 934],
  'gallery/chemistry-laboratory-2.jpg': [1400, 934],
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

// Student Experience palette — deep forest green / warm terracotta /
// cream, editorial and warm, distinct from the Imperial Heritage,
// Royal Arabian, and Future Digital Campus systems built so far.
const FOREST = '1F3A2E', FOREST_DEEP = '122019', TERRACOTTA = 'C4633B', AMBER = 'D89A44';
const INK = '2B2620', INK_SOFT = '5A5248', CREAM = 'FAF3E8', PAPER = 'F3E9D8';

const HEAD_FONT = 'Georgia';
const BODY_FONT = 'Calibri';

function eyebrow(text) {
  return new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), font: BODY_FONT, size: 16, color: TERRACOTTA, characterSpacing: 40, bold: true })] });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 40, color: FOREST, bold: true, italics: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 22, color: FOREST, bold: true })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 },
    children: [new TextRun({ text, font: BODY_FONT, size: 21, color: INK, ...opts })] });
}
function lede(text, opts = {}) {
  return new Paragraph({ spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, italics: true, size: 25, color: FOREST, ...opts })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// Pull quote — left gold rule, italic serif, the DOCX equivalent of
// .se-pullquote.
function pullquote(text, who) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 18, color: TERRACOTTA } },
    rows: [new TableRow({ children: [new TableCell({
      margins: { top: 100, bottom: 100, left: 260, right: 60 },
      children: [
        new Paragraph({ children: [new TextRun({ text: '“' + text + '”', font: HEAD_FONT, size: 26, italics: true, color: FOREST })] }),
        ...(who ? [new Paragraph({ spacing: { before: 80 }, children: [new TextRun({ text: who.toUpperCase(), font: BODY_FONT, size: 15, bold: true, color: TERRACOTTA, characterSpacing: 10 })] })] : []),
      ],
    })] })],
  });
}

// Polaroid photo — white-bordered image with a caption strip, the DOCX
// equivalent of .se-polaroid.
function polaroid(relPath, widthPx, caption) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, bottom: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' }, right: { style: BorderStyle.SINGLE, size: 4, color: 'FFFFFF' },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
      margins: { top: 120, bottom: 160, left: 120, right: 120 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [img(relPath, widthPx)] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80 }, children: [new TextRun({ text: caption, font: BODY_FONT, size: 15, italics: true, color: INK_SOFT })] }),
      ],
    })] })],
  });
}

function chapter(num, title, desc) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 2, color: 'D9CDB8' }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 10, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100 }, children: [
        new Paragraph({ children: [new TextRun({ text: String(num), font: HEAD_FONT, size: 24, bold: true, color: TERRACOTTA })] }),
      ] }),
      new TableCell({ width: { size: 90, type: WidthType.PERCENTAGE }, margins: { top: 140, bottom: 100 }, children: [
        new Paragraph({ children: [new TextRun({ text: title, font: HEAD_FONT, size: 22, bold: true, color: FOREST })] }),
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
      top: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA }, bottom: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA },
      left: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA }, right: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: TERRACOTTA },
    },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: 2650, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? FOREST : PAPER },
      margins: { top: 200, bottom: 200, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 30, bold: true, color: opts.dark ? AMBER : FOREST })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: BODY_FONT, size: 13, color: opts.dark ? 'EFE6D4' : INK_SOFT, characterSpacing: 4 })] }),
      ],
    })) })],
  });
}

function coverFrame(children, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: TERRACOTTA }, bottom: { style: BorderStyle.SINGLE, size: 8, color: TERRACOTTA },
      left: { style: BorderStyle.SINGLE, size: 8, color: TERRACOTTA }, right: { style: BorderStyle.SINGLE, size: 8, color: TERRACOTTA },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? FOREST_DEEP : CREAM },
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 900, after: 260 }, children: [img('gallery/recitation-assembly-1.jpg', 340)] }),
      new Paragraph({ spacing: { after: 60 },
        children: [new TextRun({ text: 'SULTAN HANAFI ROYAL SCHOOLS · NIGERIA', font: BODY_FONT, size: 15, bold: true, color: TERRACOTTA, characterSpacing: 30 })] }),
      new Paragraph({ spacing: { after: 200 },
        children: [new TextRun({ text: 'The Student Experience Edition', font: HEAD_FONT, size: 42, bold: true, italics: true, color: FOREST })] }),
      new Paragraph({ children: [new TextRun({ text: "Not the story of a building. The story of a childhood — from a toddler's first day to a Hafiz's last Juz'.", font: BODY_FONT, size: 20, italics: true, color: INK_SOFT })] }),
    ]),
  ],
});
sections[0].children.push(pageBreak());

// ============ 02. EDITOR'S NOTE ============
{
  const B = [];
  B.push(new Paragraph({ spacing: { before: 2200 } }));
  B.push(eyebrow("A Note Before You Read On"));
  B.push(lede("Every prospectus can list facilities and fees. Fewer can tell you what a Tuesday morning actually feels like for a seven-year-old walking into assembly, or a sixteen-year-old closing their Mus'haf after verifying their twentieth Juz'.", { size: 30 }));
  B.push(body('This edition is written for that reason. Every fact in it is real — the same institution described in our other publications — but told here through the people who live it every day: students, teachers, and the parents who trust us with their children.', { size: 22, color: INK_SOFT }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 03. CONTENTS ============
{
  const B = [];
  B.push(eyebrow('Contents'));
  B.push(h1('Inside This Story'));
  B.push(lede('A guide to the chapters ahead — each one a real part of the Sultan Hanafi student experience.', { size: 22 }));
  const toc = [
    ['A Letter to Parents', '04'], ['A Day in the Life', '05'], ['The Weekly Rhythm', '06'],
    ['The Hifz Journey', '07'], ['The Hifz Journey, Stage by Stage', '08'], ['Leadership & Character', '09'],
    ['Clubs, Games & Competitions', '10'], ['Academic Success Stories', '11'], ['Voices of Our Parents', '12'],
    ['Boarding Life', '13'], ['Milestones We Remember', '14'], ['One Family, Four Schools / Join Their Story', '15'],
  ];
  toc.forEach(([t, p]) => B.push(new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: t, font: BODY_FONT, size: 20, color: INK }), new TextRun({ text: '\t' + p, font: HEAD_FONT, size: 20, color: TERRACOTTA, bold: true })] })));
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(pullquote('Most of us parents have confirmed that the values and morals the school instils in our children are worth far more than the fees we pay.', 'Dr Ismail Akeem Seriki · Parent, Three Children Enrolled'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 04. A LETTER TO PARENTS ============
{
  const B = [];
  B.push(eyebrow('A Letter to Parents'));
  B.push(h1('Why We Built This'));
  B.push(polaroid('leadership/founder-ceo.jpg', 160, 'Sultan Zakariya, Founder'));
  B.push(body('Since 2017, Sultan Hanafi Royal Schools has taken children from the Imowonla community and given them access to the kind of education that was previously available only to the most privileged families in Nigeria. That sentence is easy to write. Living it, one child at a time, is the actual work.'));
  B.push(body('Every parent who entrusts us with a child is trusting us with something larger than a curriculum — a formation of character, faith, and confidence that will outlast every exam they ever sit.'));
  B.push(pullquote('Together, let us embark on a journey where every child discovers not only what they know, but who they are called to become.', 'Sultan Zakariya Olanrewaju Hanafi, PhD · Founder & CEO'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 05. A DAY IN THE LIFE ============
{
  const B = [];
  B.push(eyebrow('A Day in the Life'));
  B.push(h1('One Ordinary Tuesday'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/basic-school-classroom.jpg', 460)] }));
  B.push(body("Morning begins the same way for every child on campus, whichever of the four schools they belong to — with the day's first prayer, before the first lesson of any kind. From there, the paths diverge."));
  B.push(chapter(1, 'The Nursery Child', 'Play-based learning woven with numeracy, literacy, and Islamic values.'));
  B.push(chapter(2, 'The Basic School Pupil', 'National curriculum lessons enriched with entrepreneurship and digital fluency.'));
  B.push(chapter(3, 'The Royal College Student', 'A full academic timetable across seven departments.'));
  B.push(chapter(4, "The Qur'an College Student", "Hours of memorisation and Tajwid practice with a Muhaffiz."));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 06. THE WEEKLY RHYTHM ============
{
  const B = [];
  B.push(eyebrow('The Weekly Rhythm'));
  B.push(h1('A Week Has Its Own Shape Too'));
  B.push(lede('Beyond the daily timetable, the week carries its own rhythm — anchored by Jumu’ah and the weekend Islamic & Arabic Studies programme.', { size: 22 }));
  B.push(chapter(1, "Friday, Jumu'ah", "The week's spiritual centre — congregational prayer that reorders everything around it."));
  B.push(chapter(2, 'Weekend Islamic & Arabic Studies', "A dedicated weekend programme, open beyond the Qur'an College's weekday track."));
  B.push(chapter(3, 'The Ramadan Season', 'The busiest stretch of the calendar, culminating in the annual Qur’an Competition.'));
  B.push(pullquote('And say: My Lord, increase me in knowledge.', 'Surah Taha · 20:114'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 07. THE HIFZ JOURNEY ============
{
  const B = [];
  B.push(eyebrow('The Hifz Journey'));
  B.push(h1("Carrying the Qur'an, One Juz' at a Time"));
  B.push(polaroid('gallery/quran-recitation-1.jpg', 380, 'Daily recitation practice'));
  B.push(body("A full-immersion 24–36 month programme for students aged nine to sixteen — complete memorisation of the Noble Qur'an, mastery of Tajwid, and the Sciences of the Qur'an, culminating in a certified Ijazah."));
  B.push(statQuad([['24–36', 'Months'], ['30', "Juz' to Memorise"], ['2024', 'Ramadan Competition Since'], ['Ijazah', 'Certified Outcome']]));
  B.push(pullquote('Whoever guides someone to goodness will have a reward like the one who did it.', 'Hadith · Sahih Muslim'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 08. FIVE-STAGE HIFZ JOURNEY ============
{
  const B = [];
  B.push(eyebrow('The Hifz Journey, Stage by Stage'));
  B.push(h1('Five Stages, One Destination'));
  B.push(chapter(1, 'Enrolment & Assessment', "A student's existing memorisation and Tajwid level is assessed."));
  B.push(chapter(2, 'Foundational Memorisation', 'Building the first Juz’, with daily Muhaffiz-supervised repetition.'));
  B.push(chapter(3, 'Sustained Progress', 'Steady accumulation of verified Juz’, balanced against Murajaah.'));
  B.push(chapter(4, 'Completion & Review', "All 30 Juz' memorised and formally reviewed."));
  B.push(chapter(5, 'Ijazah', 'A certified, permanently recorded credential.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 09. LEADERSHIP & CHARACTER ============
{
  const B = [];
  B.push(eyebrow('Leadership & Character'));
  B.push(h1('Growing Into Leaders'));
  B.push(chapter(1, 'Student Representatives', 'The formal link between the student body and school management.'));
  B.push(chapter(2, 'School Prefects', 'Head Boy, Head Girl, Senior Prefects, and House Prefects.'));
  B.push(chapter(3, 'Class Captains', 'The leadership tier closest to individual classes.'));
  B.push(statQuad([['6', 'CLEVER Traits'], ['3', 'Leadership Tiers'], ['3', 'Prize Winners Per Term'], ['2024', 'ALA Prize Established']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 10. CLUBS, GAMES & COMPETITIONS ============
{
  const B = [];
  B.push(eyebrow('Clubs, Games & Competitions'));
  B.push(h1('Where Character Gets Tested — Playfully'));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ children: [img('gallery/games-recreation.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ children: [img('gallery/spelling-competition.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('Spelling competitions, recreation periods, and hands-on technology workshops give students room to compete, build, and simply be children.'));
  B.push(chapter(1, 'Spelling Competitions', 'Inter-class contests that turn vocabulary into a spectator sport.'));
  B.push(chapter(2, 'Basic Technology Workshops', "Hands-on building and problem-solving in the Basic School's curriculum."));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 11. ACADEMIC SUCCESS STORIES ============
{
  const B = [];
  B.push(eyebrow('Academic Success Stories'));
  B.push(h1('Milestones That Belong to Every Student'));
  B.push(statQuad([['2026', 'Ministry Registered'], ['1st', 'BECE Cohort Sat'], ['2025', 'Governor Commission'], ['7', 'Academic Departments']]));
  B.push(body('By 2026, the Royal College had achieved Ministry Registration and seen its first cohort sit the Basic Education Certificate Examination.'));
  B.push(pullquote('Sultan Hanafi Royal Schools stands as a blueprint for how education can be a vehicle for transformative social change within marginalised communities.', 'Punch Newspaper · November 2025'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 12. VOICES OF OUR PARENTS ============
{
  const B = [];
  B.push(eyebrow('Voices of Our Parents'));
  B.push(h1('Told Best By Those Who Chose Us'));
  B.push(pullquote('The calibre of teachers here is outstanding — skilled, certified, professional educators genuinely invested in each child’s future.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018'));
  B.push(pullquote("One thing I look out for in schools is the calibre of teachers they have. Most private schools don't employ quality teachers — but at SULTAN, in most of their recruitments they look for experienced educators with PhD, M.Sc., PGDE, or B.Sc. Education qualifications.", 'Mr Waliy Ojewumi · Engineer · Parent Since 2018'));
  B.push(pullquote("Since joining SULTAN, the improvement in my children's academic performance and character has been remarkable.", 'Dr Ismail Akeem Seriki · Parent, Three Children Enrolled'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 13. BOARDING LIFE ============
{
  const B = [];
  B.push(eyebrow('Boarding Life'));
  B.push(h1('A Second Home'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [img('gallery/boarding-dining.jpg', 460)] }));
  B.push(body("For Royal College and Qur'an College students who board, campus life extends well past the final lesson bell. Shared meals, structured evening study, and the five daily prayers give boarding students a rhythm of their own."));
  B.push(statQuad([['2', 'Boarding Schools'], ['5', 'Daily Prayers'], ['Shared', 'Meals & Study'], ['1', 'Community']]));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 14. MILESTONES WE REMEMBER ============
{
  const B = [];
  B.push(eyebrow('Milestones We Remember'));
  B.push(h1('The Moments That Mark a Journey'));
  B.push(polaroid('gallery/commissioning-day-1.jpg', 300, 'Commissioning Day, 2025'));
  B.push(body('In 2025, Sultan Hanafi Royal Schools was commissioned by Engr. Seyi Makinde, Executive Governor of Oyo State.'));
  B.push(pullquote('What we see here today is not merely a school building. What we see is a statement of faith — faith in education, faith in our children, and faith in what Nigeria can become.', 'Engr. Seyi Makinde · Executive Governor, Oyo State'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 15. ONE FAMILY, FOUR SCHOOLS / JOIN THEIR STORY ============
{
  const B = [];
  B.push(eyebrow('One Family, Four Schools'));
  B.push(h1("Every Child's Whole Story"));
  [
    ['Nursery & Primary', 'From age two, the foundation of faith and academic discipline is laid.'],
    ['Royal College', 'Seven academic departments, JSS 1–3 and SSS 1–3, for students aged ten and above.'],
    ["Qur'an College", 'A parallel track for full Hifz immersion, open to students aged nine to sixteen.'],
    ['Islamic & Arabic Studies', 'Weekday and weekend programmes running alongside every other stage.'],
  ].forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 140, after: 20 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 22, bold: true, color: FOREST })] })); B.push(body(d)); });
  B.push(eyebrow('Join Their Story'));
  B.push(h2('Begin at Sultan Hanafi'));
  B.push(chapter(1, 'Initial Enquiry', 'Contact the school in person, by telephone, or via our website.'));
  B.push(chapter(2, 'Entrance Assessment & Enrolment', 'An examination and interview enable optimal class placement.'));
  B.push(pullquote('15, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State · info@shroyalschools.ng · +234 807 374 7650', null));
  sections.push({
    properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Student Experience Edition', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 30, bold: true, italics: true, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE STUDENT EXPERIENCE EDITION', font: BODY_FONT, size: 14, color: AMBER, bold: true, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.ng · +234 807 374 7650', font: BODY_FONT, size: 18, color: 'FFFFFF' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.ng · @shroyal_schools', font: BODY_FONT, size: 18, color: AMBER, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 800 }, children: [new TextRun({ text: 'STUDENT EXPERIENCE EDITION 2026 · NIGERIA', font: HEAD_FONT, size: 13, color: 'D9CDB8', characterSpacing: 15 })] }),
    ], { dark: true }),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Student Experience Edition (Prospectus IV, 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
