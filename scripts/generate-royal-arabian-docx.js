// Generates the DOCX edition of "The Royal Arabian Edition" — Prospectus II
// of the SHRS Multi-Flagship Publication Programme ("Brochure 02") — from
// the same real content as prospectus/royal-arabian/index.html. Kept as a
// separate script, not derived from the HTML, because DOCX is a flow
// format (no CSS grid, absolute overlays, or geometric-frame borders), so
// the Word edition is deliberately simpler in layout while carrying
// identical real copy, images, and facts, retold through the Islamic
// Excellence lens.
//
// Requires the `docx` npm package (not a project dependency — installs
// on demand): `npm install docx --no-save` before running.
//
// Output is gitignored (prospectus/exports/) — regenerate rather than
// track the binary: `node scripts/generate-royal-arabian-docx.js`.
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
const OUT_FILE = path.join(OUT_DIR, 'SHRS-Royal-Arabian-Edition-2026.docx');

// A4 in twips (1440 twips = 1in; A4 = 210mm x 297mm = 8.27in x 11.69in)
const PAGE = { width: 11906, height: 16838 };

const DIM = {
  'gallery/campus-building.jpg': [1400, 934],
  'gallery/campus-gate.jpg': [1400, 934],
  'gallery/islamic-prayer-hall.jpg': [1040, 780],
  'gallery/chemistry-laboratory.jpg': [1400, 934],
  'gallery/biology-laboratory.jpg': [1400, 934],
  'gallery/basic-school-classroom.jpg': [1040, 780],
  'gallery/quran-recitation-1.jpg': [1600, 721],
  'gallery/quran-recitation-2.jpg': [1600, 721],
  'gallery/recitation-assembly-1.jpg': [1400, 1400],
  'gallery/recitation-assembly-2.jpg': [1400, 1400],
  'leadership/founder-ceo.jpg': [607, 900],
  'leadership/imam-ahmad-sulaimiy.jpg': [900, 1390],
  'leadership/shaykh-abubakr-solah.jpg': [900, 1600],
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

// Royal Arabian palette — deep royal blue / gold / ivory, distinct from
// the Imperial Heritage Edition's coffee-brown/navy/parchment system.
const NAVY = '0A2A5C', NAVY_DEEP = '071B3D', GOLD = 'C9A54A', GOLD_BRIGHT = 'E8C976';
const IVORY = 'FAF6EC', CREAM = 'F1E8D2', INK = '1A2333', INK_SOFT = '5A6270';

const HEAD_FONT = 'Book Antiqua';
const BODY_FONT = 'Calibri';

function eyebrow(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
    children: [new TextRun({ text: text.toUpperCase(), font: BODY_FONT, size: 16, color: GOLD, characterSpacing: 40, bold: true })] });
}
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 40, color: NAVY, bold: true })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200 },
    children: [new TextRun({ text, font: HEAD_FONT, size: 24, color: NAVY })] });
}
function body(text, opts = {}) {
  return new Paragraph({ spacing: { after: 160 }, alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, font: BODY_FONT, size: 21, color: INK, ...opts })] });
}
function lede(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text, font: 'Constantia', italics: true, size: 26, color: NAVY })] });
}
function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
    children: [new TextRun({ text, font: BODY_FONT, size: 16, color: INK_SOFT, italics: true })] });
}
function pageBreak() { return new Paragraph({ children: [new PageBreak()] }); }

// Manuscript-style framed panel — the DOCX equivalent of .ra-panel — used
// for Qur'anic verses, Hadith, and testimonials throughout this edition.
function panel(text, who, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 8, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 8, color: GOLD },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? NAVY_DEEP : CREAM },
      margins: { top: 260, bottom: 260, left: 300, right: 300 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
          children: [new TextRun({ text: '“' + text + '”', font: 'Constantia', italics: true, size: 26, color: opts.dark ? IVORY : NAVY })] }),
        ...(who ? [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: who.toUpperCase(), font: BODY_FONT, size: 15, bold: true, color: GOLD, characterSpacing: 15 })] })] : []),
      ],
    })] })],
  });
}

// Octagram-badge substitute for missing photography — a gold diamond
// frame with initials, echoing the .ra-octagram medallion used on-screen.
function octagramPanel(letter, name, role, cred) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60, right: 160 }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 10, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 10, color: GOLD }, left: { style: BorderStyle.SINGLE, size: 10, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 10, color: GOLD } },
          children: [new TextRun({ text: letter, font: HEAD_FONT, size: 28, bold: true, color: NAVY })] }),
      ] }),
      new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60 }, children: [
        new Paragraph({ children: [new TextRun({ text: name, font: HEAD_FONT, size: 22, bold: true, color: NAVY })] }),
        new Paragraph({ children: [new TextRun({ text: role.toUpperCase(), font: BODY_FONT, size: 15, bold: true, color: GOLD, characterSpacing: 8 })] }),
        ...(cred ? [new Paragraph({ children: [new TextRun({ text: cred, font: 'Constantia', italics: true, size: 17, color: INK_SOFT })] })] : []),
      ] }),
    ] })],
  });
}

function rosterRow(imgRel, imgWidth, name, role, cred) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.SINGLE, size: 4, color: 'D9D2C0' }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 18, type: WidthType.PERCENTAGE }, margins: { top: 120, bottom: 60, right: 160 }, children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [img(imgRel, imgWidth)] }),
      ] }),
      new TableCell({ width: { size: 82, type: WidthType.PERCENTAGE }, margins: { top: 120, bottom: 60 }, children: [
        new Paragraph({ children: [new TextRun({ text: name, font: HEAD_FONT, size: 22, bold: true, color: NAVY })] }),
        new Paragraph({ children: [new TextRun({ text: role.toUpperCase(), font: BODY_FONT, size: 15, bold: true, color: GOLD, characterSpacing: 8 })] }),
        ...(cred ? [new Paragraph({ children: [new TextRun({ text: cred, font: 'Constantia', italics: true, size: 17, color: INK_SOFT })] })] : []),
      ] }),
    ] })],
  });
}

function statQuad(cells, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2650, 2650, 2650, 2650],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: GOLD }, insideVertical: { style: BorderStyle.SINGLE, size: 4, color: GOLD },
    },
    rows: [new TableRow({ children: cells.map(([num, label]) => new TableCell({
      width: { size: 2650, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? NAVY : CREAM },
      margins: { top: 200, bottom: 200, left: 80, right: 80 },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: num, font: HEAD_FONT, size: 32, bold: true, color: opts.dark ? GOLD_BRIGHT : NAVY })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: label.toUpperCase(), font: BODY_FONT, size: 13, color: opts.dark ? 'D9D2C0' : INK_SOFT, characterSpacing: 4 })] }),
      ],
    })) })],
  });
}

function tierRow(num, title, desc) {
  return [
    new Paragraph({ spacing: { before: 160, after: 40 },
      children: [new TextRun({ text: `${String(num).padStart(2, '0')}  `, font: HEAD_FONT, size: 20, color: GOLD, bold: true }), new TextRun({ text: title, font: HEAD_FONT, size: 21, bold: true, color: NAVY })] }),
    body(desc),
  ];
}

function coverFrame(children, opts = {}) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD },
      left: { style: BorderStyle.SINGLE, size: 12, color: GOLD }, right: { style: BorderStyle.SINGLE, size: 12, color: GOLD },
    },
    rows: [new TableRow({ children: [new TableCell({
      shading: { type: ShadingType.CLEAR, fill: opts.dark ? NAVY_DEEP : IVORY },
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
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1400, after: 100 },
        children: [new TextRun({ text: 'بِسْمِ اللّهِ الرَّحْمَٰنِ الرَّحِيمِ', font: 'Traditional Arabic', size: 30, bold: true, color: GOLD_BRIGHT })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 700, after: 260 }, children: [img('crest-full.png', 100)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 },
        children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 36, bold: true, color: NAVY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
        children: [new TextRun({ text: 'THE ROYAL ARABIAN EDITION', font: BODY_FONT, size: 18, bold: true, color: GOLD, characterSpacing: 40 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100, after: 900 },
        children: [new TextRun({ text: 'Islamic Excellence · Qur’anic Scholarship · Future Scholars', font: 'Constantia', italics: true, size: 22, color: INK_SOFT })] }),
    ]),
  ],
});
sections[0].children.push(pageBreak());

// ============ 02. DEDICATION ============
{
  const B = [];
  B.push(new Paragraph({ spacing: { before: 3000 } }));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'وَقُلْ رَّبِ زِدْنِي عِلْمًا', font: 'Traditional Arabic', size: 34, bold: true, color: GOLD })] }));
  B.push(new Paragraph({ spacing: { before: 200, after: 60 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '“And say: My Lord, increase me in knowledge.”', font: 'Constantia', italics: true, size: 30, color: NAVY })] }));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SURAH TAHA · 20:114', font: BODY_FONT, size: 15, bold: true, color: GOLD, characterSpacing: 15 })] }));
  B.push(new Paragraph({ spacing: { before: 600, after: 60 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '“Allah will raise those who have believed among you and those who were given knowledge, by degrees.”', font: 'Constantia', italics: true, size: 26, color: NAVY })] }));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: 'SURAH AL-MUJADILAH · 58:11', font: BODY_FONT, size: 15, bold: true, color: GOLD, characterSpacing: 15 })] }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 03. CONTENTS ============
{
  const B = [];
  B.push(eyebrow('Contents'));
  B.push(h1('A Guide to This Edition'));
  B.push(lede('This is the Royal Arabian Edition of the Sultan Hanafi prospectus — the same institution, retold through the lens of Islamic scholarship, Qur’anic excellence, and the sacred trust placed in every teacher and Shaykh who carries it forward.'));
  const toc = [
    ['A Word from the Founder', '04'], ['Faith & Knowledge — Our Foundation', '05'],
    ['The Qur’an College — The Hifz Journey', '06'], ['School of Islamic & Arabic Studies', '08'],
    ['One Integrated Vision — The Four Schools', '09'], ['Academic Distinction — Royal College', '10'],
    ['Foundations of Faith — Nursery & Primary', '11'], ['A Campus of Sacred Learning', '12'],
    ['Scholars & Stewards — Leadership', '13'], ['Recognition & Testimony', '14'],
    ['Join the Journey — Admissions', '15'],
  ];
  toc.forEach(([t, p]) => B.push(new Paragraph({ spacing: { after: 100 },
    children: [new TextRun({ text: t, font: BODY_FONT, size: 20, color: INK }), new TextRun({ text: '\t' + p, font: HEAD_FONT, size: 20, color: GOLD, bold: true })] })));
  B.push(new Paragraph({ spacing: { before: 200 } }));
  B.push(panel('And say: My Lord, increase me in knowledge.', 'Surah Taha · 20:114'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 04. FOUNDER'S MESSAGE ============
{
  const B = [];
  B.push(eyebrow('A Word from the Founder'));
  B.push(h1('A Vision Rooted in Faith'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [img('leadership/founder-ceo.jpg', 220)] }));
  B.push(body('When I founded Sultan Hanafi Royal Schools, I carried a conviction that education divorced from faith produces knowledge without wisdom — and that faith divorced from rigorous scholarship produces piety without capability. Our mission has always been to prove that a child can memorise the Noble Qur’an and excel at mathematics; can master Tajwid and computer science; can be rooted in Islamic character and ready for a global stage.'));
  B.push(body('Since 2017, this conviction has taken physical form in Imowonla, Ikorodu — a hybrid institution combining secular education with authentic Islamic learning, welcoming students of all faiths and backgrounds into one community bound by the pursuit of excellence.'));
  B.push(panel('Together, let us embark on a journey where every child discovers not only what they know, but who they are called to become.', 'Sultan Zakariya Olanrewaju Hanafi, PhD'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 05. FAITH & KNOWLEDGE ============
{
  const B = [];
  B.push(eyebrow('Our Foundation'));
  B.push(h1('Faith & Knowledge, One Vision'));
  B.push(h2('Our Vision'));
  B.push(body('To be recognised as a leading institution that excels in knowledge dissemination and character building — creating a lasting positive impact wherever our presence is felt.'));
  B.push(h2('Our Mission'));
  B.push(body('To provide a holistic education — imparting both Islamic and secular knowledge through rigorous research, instilling ethical behaviour, and contributing to a secure, informed, and progressive society.'));
  B.push(statQuad([['2017', 'Founded'], ['4', 'Schools, One Vision'], ['2022', 'Qur’an College Formalised'], ['∞', 'Ambition']]));
  B.push(body('In 2022, the School of Islamic & Arabic Studies and the Qur’an College were formally established, delivering Saudi Arabian curriculum programmes with internationally recognised Ijazah certification — the moment this vision became a lived reality.', { italics: true, size: 18, color: INK_SOFT }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 06-07. QUR'AN COLLEGE ============
{
  const B = [];
  B.push(eyebrow('The Qur’an College'));
  B.push(h1('The Hifz Journey'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [img('gallery/quran-recitation-1.jpg', 460)] }));
  B.push(body('A full-immersion 24–36 month programme for students aged nine to sixteen — complete memorisation of the Noble Qur’an, mastery of Tajwid, and the Sciences of the Qur’an, culminating in a certified Ijazah recognised by examining scholars. Day and boarding options are available.'));
  B.push(statQuad([['24–36', 'Months'], ['9–16', 'Ages'], ["30 Juz’", 'Full Qur’an'], ['Ijazah', 'Certified']]));
  B.push(body('Each year, our Qur’an College students take part in a Ramadan Qur’an Competition, an annual showcase of Hifz achievement and Tajwid excellence held at the Royal College Auditorium — a tradition established in 2024 to mark the discipline and devotion this journey demands.'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [img('gallery/recitation-assembly-1.jpg', 460)] }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 08. ISLAMIC & ARABIC STUDIES ============
{
  const B = [];
  B.push(eyebrow('School of Islamic & Arabic Studies'));
  B.push(h1('Language of the Qur’an, Discipline of Scholars'));
  B.push(body('Running alongside every other stage of the SHRS journey — weekday and weekend programmes build authentic Islamic learning and structured Arabic language acquisition for every student, not only those enrolled in the Qur’an College.'));
  B.push(body('Sultan Hanafi Royal Schools draws on a deliberate blend of resources: Nigerian National Curriculum requirements, international best-practice materials, carefully selected Saudi Arabian textbooks, established Arabic and Islamic scholarship texts, and SHRS’s own proprietary publications. For Arabic Language, Islamic Studies, and Qur’an Studies specifically, many of these texts originate from Saudi Arabia and other respected centres of Islamic scholarship — complemented, not replaced, by materials developed by SHRS for our own students.'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [img('gallery/recitation-assembly-2.jpg', 420)] }));
  B.push(caption('Weekly recitation assembly — School of Islamic & Arabic Studies'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 09. THE FOUR SCHOOLS ============
{
  const B = [];
  B.push(eyebrow('One Integrated Vision'));
  B.push(h1('The Four Schools'));
  [
    ['Royal College', 'Secular academic excellence, JSS 1–3 and SSS 1–3, seven departments.'],
    ['Qur’an College', 'Full Hifz immersion, Tajwid, certified Ijazah.'],
    ['Islamic & Arabic Studies', 'Weekday and weekend programmes, open to every student.'],
    ['Nursery & Primary', 'The foundation of faith and academic discipline, from age two.'],
  ].forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 140, after: 20 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 22, bold: true, color: NAVY })] })); B.push(body(d)); });
  B.push(h2('The CLEVER Framework'));
  B.push(body('Character, Leadership, Excellence, Values, Engagement, Responsibility — the shared framework that runs through all four schools, ensuring one integrated vision of the child rather than four disconnected programmes.'));
  B.push(h2('Open to All'));
  B.push(body('While the Qur’an College and Islamic & Arabic Studies programmes centre Islamic scholarship, Sultan Hanafi Royal Schools welcomes families of every faith and background into the Royal College and Nursery & Primary School — united by a shared commitment to academic excellence and strong character.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 10. ROYAL COLLEGE ============
{
  const B = [];
  B.push(eyebrow('Academic Distinction'));
  B.push(h1('Sultan Hanafi Royal College'));
  B.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [img('gallery/chemistry-laboratory.jpg', 460)] }));
  B.push(body('Serving students aged ten and above across JSS 1–3 and SSS 1–3, the Royal College delivers a curriculum spanning seven departments — Languages, Mathematics & ICT, Humanities, Science & Technology, Commerce & Management, Arabic, and Islamic Sciences — under Principal Dr Adegoke Musa Olatunji, PhD, MEd. Established in 2021 and registered with the Lagos State Ministry of Education in May 2026, the College sat its inaugural BECE cohort the same year.'));
  B.push(statQuad([['7', 'Departments'], ['2021', 'Founded'], ['6', 'Year Groups'], ['10+', 'Entry Age']]));
  B.push(body('Islamic Sciences sits alongside Mathematics and the Sciences as a full academic department, taught by Shuyukh alongside secular subject specialists — not an add-on, but a core department of the College.', { italics: true, size: 18, color: INK_SOFT }));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 11. NURSERY & PRIMARY ============
{
  const B = [];
  B.push(eyebrow('Foundations of Faith'));
  B.push(h1('Nursery & Primary School'));
  B.push(body('Every journey at Sultan Hanafi begins here — play-based learning woven with numeracy, literacy, and Islamic values from a child’s very first day.'));
  [
    ['Crèche · Ages 2–3', 'Nurturing care in a secure, home-like environment, with caregivers trained in early childhood development.'],
    ['Nursery · Ages 3–5', 'Play-based learning woven with numeracy, literacy, and Islamic values from the earliest age of formation.'],
    ['Basic School · Ages 5–10', 'National curriculum enriched with entrepreneurship, financial literacy, and digital fluency.'],
    ['One Foundation', 'By the time a child is ready for the Royal College or the Qur’an College, the foundation of faith and academic discipline is already in place.'],
  ].forEach(([t, d]) => { B.push(new Paragraph({ spacing: { before: 140, after: 20 }, children: [new TextRun({ text: t, font: HEAD_FONT, size: 21, bold: true, color: NAVY })] })); B.push(body(d)); });
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 12. CAMPUS OF SACRED LEARNING ============
{
  const B = [];
  B.push(eyebrow('Our Campus'));
  B.push(h1('A Campus of Sacred Learning'));
  const gridRow = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { right: 100 }, children: [new Paragraph({ children: [img('gallery/islamic-prayer-hall.jpg', 220)] })] }),
      new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { left: 100 }, children: [new Paragraph({ children: [img('gallery/campus-building.jpg', 220)] })] }),
    ] })] });
  B.push(gridRow);
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(body('Fifteen, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State — a campus built around the rhythms of prayer and study alike, with a dedicated prayer hall at its centre, science and technology laboratories, an ICT & Computer Laboratory, and residential boarding for Royal College and Qur’an College students. Every space communicates the same standard: excellence is not optional, in scholarship or in worship.'));
  B.push(statQuad([['2017', 'Campus Founded'], ['4', 'Schools, One Campus'], ['1', 'Prayer Hall'], ['Yes', 'Boarding Available']]));
  B.push(body('Boarding is available to students of the Royal College and the Qur’an College, allowing families beyond Ikorodu to entrust their children to a residential environment structured around the five daily prayers, disciplined study, and Islamic character formation.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 13. LEADERSHIP ============
{
  const B = [];
  B.push(eyebrow('Scholars & Stewards'));
  B.push(h1('Those Who Carry the Trust'));
  B.push(lede('Leadership at Sultan Hanafi is a shared trust between scholars of the Qur’an, custodians of Arabic and Islamic learning, and stewards of academic excellence — each accountable for a distinct part of the same vision.'));
  B.push(rosterRow('leadership/imam-ahmad-sulaimiy.jpg', 130, 'Imam Ahmad Sulaimiy', 'Principal, Sultan Hanafi Qur’an College', 'BSc Qur’anic Sciences · BA Arabic & Islamic Studies'));
  B.push(rosterRow('leadership/shaykh-abubakr-solah.jpg', 130, 'Shaykh Abubakr Solah', 'Principal, School of Islamic & Arabic Studies', 'BA Arabic Language · Diploma in Islamic Studies'));
  B.push(rosterRow('leadership/founder-ceo.jpg', 130, 'Sultan Zakariya Olanrewaju Hanafi, PhD', 'Founder & Chief Executive Officer (CEO)', 'MSc Edinburgh Business School, Heriot-Watt · BSc Oxford Brookes · Fellow, ACCA UK · Fellow, ICAN'));
  B.push(octagramPanel('AO', 'Dr Adegoke Musa Olatunji', 'Principal, Sultan Hanafi Royal College', 'PhD · MEd · BSc.Edu · NCE · MTRCN'));
  B.push(octagramPanel('KA', 'Mrs. Kareemat Abdurazaq', 'Head Teacher, Nursery & Primary School', 'BEd · NCE'));
  B.push(new Paragraph({ spacing: { before: 160 } }));
  B.push(panel('Whoever guides someone to goodness will have a reward like the one who did it.', 'Hadith · Sahih Muslim'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 14. RECOGNITION ============
{
  const B = [];
  B.push(eyebrow('Recognition & Testimony'));
  B.push(h1('Witnessed, Endorsed, Recognised'));
  B.push(panel('Sultan Hanafi Royal Schools stands as a blueprint for how education can be a vehicle for transformative social change within marginalised communities.', 'Punch Newspaper · November 2025', { dark: true }));
  B.push(body('In 2025, Sultan Hanafi Royal Schools was commissioned by Engr. Seyi Makinde, Executive Governor of Oyo State — a distinguished endorsement affirming that an institution rooted equally in Qur’anic scholarship and secular excellence represents a model Nigeria’s leadership recognises. By 2026, the Royal College had achieved Ministry Registration and seen its first cohort sit the Basic Education Certificate Examination.'));
  B.push(panel('The calibre of teachers here is outstanding — skilled, certified, professional educators genuinely invested in each child’s future.', 'Mr Waliy Ojewumi · Engineer · Parent Since 2018', { dark: true }));
  B.push(statQuad([['2025', 'Governor Commission'], ['2026', 'Ministry Registered'], ['1st', 'BECE Cohort Sat'], ['2025', 'Featured, Punch']], { dark: true }));
  B.push(body('This recognition rests on a simple conviction: that a school raising Huffaz alongside high academic achievers, in one of Lagos State’s most underserved communities, is not a contradiction but a model worth studying — and one Sultan Hanafi Royal Schools intends to keep proving, cohort after cohort.'));
  sections.push({ properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 1200, right: 1200 } } }, children: B });
}

// ============ 15. ADMISSIONS ============
{
  const B = [];
  B.push(eyebrow('Join the Journey'));
  B.push(h1('Begin at Sultan Hanafi'));
  B.push(lede('We welcome families of every faith and background who share our commitment to academic excellence and Islamic values.'));
  tierRow(1, 'Initial Enquiry', 'Contact the school in person, by telephone, or via our website.').forEach(p => B.push(p));
  tierRow(2, 'Admission Form', 'Purchased and completed with supporting documentation.').forEach(p => B.push(p));
  tierRow(3, 'Entrance Assessment', 'An examination and interview enable optimal class placement.').forEach(p => B.push(p));
  tierRow(4, 'Enrolment', 'A formal Admission Letter and Class Acceptance Ticket are issued.').forEach(p => B.push(p));
  B.push(new Paragraph({ spacing: { before: 120 } }));
  B.push(panel('Documents Required: Birth certificate · Passport photographs (2) · School report · Completed admission form', ''));
  B.push(h2('Entry Ages'));
  B.push(body('Crèche from age two through to the Royal College and Qur’an College from age ten — students may join at the beginning of any term, subject to space and assessment.'));
  B.push(h2('Speak With Admissions'));
  B.push(body('15, Imowonla Road, Off Gberigbe–Agura Road, Ikorodu, Lagos State · info@shroyalschools.ng · +234 807 374 7650'));
  B.push(panel('Our Lord, grant us in this world that which is good, and in the Hereafter that which is good.', 'Surah Al-Baqarah · 2:201'));
  sections.push({
    properties: { page: { size: PAGE, margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools — The Royal Arabian Edition', font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: BODY_FONT, size: 14, color: INK_SOFT })] })] }) },
    children: B,
  });
}

// ============ 16. BACK COVER ============
sections.push({
  properties: { page: { size: PAGE, margin: { top: 900, bottom: 900, left: 900, right: 900 } } },
  children: [
    coverFrame([
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1800, after: 260 }, children: [img('crest-full.png', 100)] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: 'Sultan Hanafi Royal Schools', font: HEAD_FONT, size: 32, bold: true, color: IVORY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: 'THE ROYAL ARABIAN EDITION', font: BODY_FONT, size: 15, color: GOLD_BRIGHT, bold: true, characterSpacing: 20 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: '15, Imowonla Road, Ikorodu, Lagos State', font: BODY_FONT, size: 18, color: IVORY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'info@shroyalschools.ng · +234 807 374 7650', font: BODY_FONT, size: 18, color: IVORY })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60 }, children: [new TextRun({ text: 'shroyalschools.ng · @shroyal_schools', font: BODY_FONT, size: 18, color: GOLD_BRIGHT, bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 400, after: 800 }, children: [new TextRun({ text: 'ROYAL ARABIAN EDITION 2026 · NIGERIA', font: HEAD_FONT, size: 13, color: 'D9D2C0', characterSpacing: 15 })] }),
    ], { dark: true }),
  ],
});

const doc = new Document({
  creator: 'Sultan Hanafi Royal Schools',
  title: 'SHRS — The Royal Arabian Edition (Prospectus II, 2026)',
  sections,
});

Packer.toBuffer(doc).then(buf => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, buf);
  console.log('DOCX written:', buf.length, 'bytes ->', OUT_FILE);
});
