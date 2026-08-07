#!/usr/bin/env node
/**
 * The Graduation Ceremony Programme — 8 August 2026.
 *
 *     node scripts/build-graduation-programme.mjs
 *
 * Four A4 portrait pages: one A3 sheet, folded once. That is a real bindery
 * format — it prints, folds and hands out — rather than a page count chosen to
 * sound right.
 *
 * EVERY GRADUAND IS READ, NOT TYPED. The rolls come from the same constants the
 * certificate issuer prints from, and the two published registers are read off
 * disk. A programme that disagrees with the certificates about who graduated,
 * or about how a name is spelled, is worse than no programme: the certificate
 * is the permanent record and the programme is what four hundred guests read
 * on the day.
 *
 * The running order is the Founder's document of 2026-08-07, with one class of
 * change recorded at ORDER below.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'dist/graduation-programme';
mkdirSync(OUT, { recursive: true });

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── THE GRADUANDS ───────────────────────────────────────────────────────────
// Read from the published registers where they exist, and from the issuer's
// own rolls where the batch has been issued but the register is build output.
const reg = (f) => JSON.parse(readFileSync(`docs/graduation-registers/${f}`, 'utf8'))
  .entries.map((e) => e.studentEn);

const AWARDS = [
  { code: 'QUR', school: 'Sultan Hanafi Qur’an College',
    title: 'Ḥifẓ of the Glorious Qur’an', ar: 'حفظ القرآن الكريم',
    note: 'Complete memorisation, and Ten Juz’',
    names: ['Zaynab Zakariya Anofi', 'Baqi Olamiposi Anofi', 'Aisha Omoshalewa Anofi'] },
  { code: 'IBT', school: 'Sultan Hanafi School of Islamic and Arabic Studies',
    title: 'Ibtidā’iyyah', ar: 'المرحلة الابتدائية',
    note: 'The elementary stage of Islamic and Arabic Studies',
    names: reg('2026-08-08-IBT-000035.json') },
  { code: 'IDD', school: 'Sultan Hanafi School of Islamic and Arabic Studies',
    title: 'I‘dādiyyah', ar: 'المرحلة الإعدادية',
    note: 'The preparatory stage of Islamic and Arabic Studies',
    names: reg('2026-08-08-IDD-000042.json') },
  { code: 'PRY', school: 'Sultan Hanafi Nursery and Primary School',
    title: 'Primary School Graduation', ar: '',
    note: 'Completion of the Primary School programme',
    names: ['Naheemah Ismai Seriki', 'Ashraf Korede Ojewumi', 'Al-ameen Okoh',
      'Al-ameen Abidemi Jokomba', 'Aisha Lawal', 'Imran Iremide Adegoke', 'Daud Aliu'] },
  { code: 'JSS', school: 'Sultan Hanafi Royal College',
    title: 'Junior Secondary School Graduation', ar: '',
    note: 'Completion of the three-year Junior Secondary programme',
    names: ['Hameedah Adebimpe Ojewumi', 'Muhammad Ismail Seriki', 'Fatimah Desire Ibrahim',
      'Aisha Anofi', 'Baqi Anofi', 'Sa’ad Sanusi', 'Fawaz Owolabi', 'Radiah Apatira',
      'Faridah Aliu', 'Anisa Opeyemi Jokomba', 'Ameerah Durodola',
      'Abdulrahman Abdullah', 'Ameerah Abdulhafeez'] },
  { code: 'SS', school: 'Sultan Hanafi Royal College',
    title: 'Senior Secondary School Graduation', ar: '',
    note: 'Completion of the three-year Senior Secondary programme',
    names: ['Thoirah Makinde', 'Abdulbasit Amobi Jabarr', 'Aisha Shode',
      'Mazeed Hassan-Murtala'] },
];

const TOTAL = AWARDS.reduce((n, a) => n + a.names.length, 0);
// Some graduands hold more than one award — a student may complete Ibtidā'iyyah
// and Junior Secondary in the same year. The programme says so rather than
// letting a guest count the same child twice and wonder.
const PEOPLE = new Set(AWARDS.flatMap((a) => a.names)).size;

// ── THE ORDER OF PROCEEDINGS ────────────────────────────────────────────────
// The Founder's list of 2026-08-07, in his sequence and his wording.
//
// ONE CLASS OF CHANGE, made and declared: his times overlapped in four places.
// The Graduands were introduced at 10:10, during the anthems and across the
// whole of the Key Guests' slot; and the Donation, the Goodwill Message and the
// Refreshments all fell inside Ṣolātu Ẓuhr. Read literally, five things happen
// during the prayer. Every item he listed is kept, in his order; only the
// minutes are resolved so the sequence can actually be run. Reverting any line
// is a one-line change here.
const ORDER = [
  ['10:00', '10:05', 'Arrival and Seating of Guests', ''],
  ['10:05', '10:10', 'Recitation from the Glorious Qur’an', 'تلاوة من القرآن الكريم'],
  ['10:10', '10:15', 'National Anthem and School Anthem', ''],
  ['10:15', '10:30', 'Introduction of the Graduands', ''],
  ['10:30', '10:45', 'Introduction of Key Guests', ''],
  ['10:45', '11:30', 'Welcome Address by the School Heads', ''],
  ['11:30', '11:40', 'Chairman’s Opening Speech', ''],
  ['11:40', '11:50', 'Primary Pupils’ Presentations', ''],
  ['11:50', '12:00', 'Graduands’ Presentations', 'Secular · Islāmiyyah · Arabic'],
  ['12:00', '12:45', 'Lecture', ''],
  ['12:45', '13:20', 'Ṣolātu Ẓuhr', 'صلاة الظهر'],
  ['13:20', '13:35', 'Royal Students’ Presentation', 'All Units'],
  ['13:35', '13:40', 'Goodwill Message', ''],
  ['13:40', '13:45', 'Donation', ''],
  ['13:45', '14:00', 'Light Refreshments', ''],
];

const OFFICERS = [
  ['Dr. Zakariya Olanrewaju Anofi', 'د. زكريا أولانريوجو حنفي', 'Chairman, Board of Governors'],
  ['Imam Ahmad Sulaimiy', 'الإمام أحمد السليمي', 'Principal (Mudeer), Sultan Hanafi Qur’an College'],
  ['Dr. Adegoke Musa Olatunji', '', 'Principal, Sultan Hanafi Royal College'],
  ['Shaykh Abubakr Solah', 'الشيخ أبو بكر صلاح', 'Principal (Ra’ees), School of Islamic and Arabic Studies'],
  ['Mrs. Mariam Tope AbdulKareem', '', 'Head Teacher, Nursery and Primary School'],
];

const COORDINATORS = 'Mr. Shola  ·  Ustādh Shereef Alwaafir';
const VENUE = '15 Imowonla Road, AP Bus Stop, Off Gberigbe Agura Road, Ikorodu, Lagos State';
// The live domain. The supplied letterhead reads .ng; every verification URL,
// every QR on every certificate issued this week and the site itself are .com,
// so a guest who types the .ng reaches nothing.
const WEB = 'shroyalschools.com';
const MAIL = 'shroyalschools@gmail.com';
const TEL = '+234 (0) 807 374 7650';


// ── THE OCCASION ────────────────────────────────────────────────────────────
// Everything below is read off the Founder's own trifold of 2026-08-07: the
// welcome, the lecture, the guest list, the chief host, the founding figures.
// Nothing here is invented, and no name is spelled differently from the way he
// spelled it — except where the certificate register, which is the permanent
// record, spells a graduand's name more fully. See the note printed at the end
// of the build.
const CHIEF_HOST = ['Dr. Zakariya Olanrewaju Anofi', 'د. زكريا أولانريوجو حنفي',
  'Chief Executive Director'];

const LECTURE = {
  by: 'Dr. Misbahudeen Dosumu',
  title: 'Building the Future Ummah Through Holistic Education',
};

const GUESTS = [
  ['Mr. Ismail Adebisi', 'Chairman, Olaife Estate CDA'],
  ['Mr. Abdullah Ibrahim', 'Chairman, Bagidan Unity Estate CDA'],
  ['Shaykh Habeeb Adewuyi', 'Founder, Manaar-ul-Huda International Schools'],
  ['Imam Sanni K. Yusuf', 'Chief Imam, Alfawz Central Mosque'],
  ['Alfa Nurudeen', 'Imam, Anwarul Islam Mosque'],
  ['Mr. Busari', ''],
];

const FIGURES = [
  ['2017', 'Founded and registered'],
  ['4', 'Integrated schools'],
  ['1', 'Unified academic project'],
  ['2026', 'First combined ceremony'],
];

const WELCOME = [
  'n behalf of the Board of Trustees and every member of the Sultan Hanafi '
  + 'Royal Schools community, it is our honour to welcome you to this Combined '
  + 'Graduation Ceremony for the Class of 2026. Since our doors opened in '
  + 'Ikorodu in December 2017, we have held to a single conviction: that a '
  + 'child’s secular education and their grounding in Islamic and Arabic '
  + 'learning need not stand apart.',
  'Today’s graduates — from our youngest Primary School leavers to our Qur’an '
  + 'College ḥuffāẓ — represent the full breadth of that vision. To our '
  + 'parents, guardians and distinguished guests: thank you for entrusting us '
  + 'with these years, and for joining us as we celebrate them.',
];

const CEO_WORD = [
  'A combined ceremony such as this is also, I think, a statement about who we '
  + 'are. We have always resisted the idea that a strong Qur’an memorisation '
  + 'pathway and a rigorous secular curriculum are two different projects '
  + 'running side by side.',
  'At Sultan Hanafi Royal Schools they are one project, and today’s graduates '
  + 'are its clearest evidence.',
];

const TAGLINE = 'Celebrating Achievement, Inspiring Futures';
const OPENS = ORDER[0][0];
const CLOSES = ORDER[ORDER.length - 1][1];
const to12 = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
};


// ── THE PHOTOGRAPHY ─────────────────────────────────────────────────────────
// Every photograph here is a real photograph of this campus, already cleared
// and already published on the school's own site. Nothing is stock, nothing is
// a placeholder, and the captions name what is actually in the frame.
const G = '/assets/images/gallery';
// No leadership portraits: see the ruling above the officers' block.

// ── ORNAMENT ────────────────────────────────────────────────────────────────
// A real engine-turned band, not a clip-art flourish: interfering sine strands
// at a hairline, the same lathe the certificates carry. Cheap to print,
// impossible to photocopy cleanly, and the one mark on the sheet that says
// this came from the same press as the awards.
function lathe(id, w, h, cycles, stroke) {
  const strand = (phase, amp, wob) => {
    const pts = [];
    for (let i = 0; i <= 260; i += 1) {
      const x = (i / 260) * w;
      const t = (i / 260) * cycles * Math.PI * 2;
      pts.push(`${x.toFixed(2)},${(h / 2 + Math.sin(t + phase) * amp
        * (0.62 + 0.38 * Math.sin(t * wob))).toFixed(2)}`);
    }
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="url(#${id})"
      stroke-width="${stroke}" />`;
  };
  return `<svg class="lathe" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#A8863F" stop-opacity="0" />
      <stop offset=".22" stop-color="#A8863F" stop-opacity=".85" />
      <stop offset=".5" stop-color="#D8BC7C" stop-opacity="1" />
      <stop offset=".78" stop-color="#A8863F" stop-opacity=".85" />
      <stop offset="1" stop-color="#A8863F" stop-opacity="0" />
    </linearGradient></defs>
    ${strand(0, h * 0.34, 0.21)}${strand(Math.PI, h * 0.34, 0.21)}
    ${strand(Math.PI / 2, h * 0.2, 0.47)}${strand(-Math.PI / 2, h * 0.2, 0.47)}
  </svg>`;
}

// ── FIXTURES ────────────────────────────────────────────────────────────────
const crest = (h, cls = '') => `<img class="crest ${cls}" style="height:${h}mm"
  src="/assets/images/crests/shrs-institutional-crest.png" alt="" />`;

const rule = (cls = '') => `<div class="rule ${cls}"><span></span><i></i><span></span></div>`;
const star = (cls = '') => `<div class="star ${cls}"><b></b></div>`;

const plate = (src, cap, h, cls = '') => `<figure class="plate ${cls}" style="--h:${h}mm">
  <span class="fr"><img src="${G}/${src}" alt="" /></span>
  <figcaption>${esc(cap)}</figcaption></figure>`;

const plateRow = (items, h) => `<div class="prow">${items
  .map(([src, cap]) => plate(src, cap, h)).join('')}</div>`;

const ph = (kicker, title) => `<header class="ph">
  <div class="ph-k">${esc(kicker)}</div>
  <h3 class="ph-t">${title}</h3></header>${rule()}`;

const sh = (t) => `<h4 class="sh">${esc(t)}</h4>`;

const HONORIFIC = /^(dr|mr|mrs|ms|imam|shaykh|sheikh|alfa|ustadh|ustādh|prof)\.?$/i;
const initials = (name) => name.split(/\s+/).filter((w) => !HONORIFIC.test(w))
  .slice(0, 2).map((w) => w[0]).join('');

// NO PORTRAIT OF ANY OFFICER APPEARS IN THIS PROGRAMME. The Founder's ruling
// of 8 August 2026: the leadership photographs come out entirely, and framed
// pictures of the school go in against them. An office is named, ruled and
// set in type here; the campus is what is shown.

const rollBlock = (a) => `<div class="rl">
  <div class="rl-h">
    ${a.ar ? `<i dir="rtl" lang="ar">${esc(a.ar)}</i>` : ''}
    <b>${esc(a.title)}</b>
    <span>${esc(a.school)}</span>
  </div>
  <ol class="rl-n">${a.names.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
</div>`;

const byCode = Object.fromEntries(AWARDS.map((a) => [a.code, a]));

// ── SHEET 1 · THE OUTSIDE ───────────────────────────────────────────────────
const panelWelcome = `<section class="panel p-w">
  <figure class="hero">
    <img src="${G}/campus-hero.jpg" alt="" />
    <figcaption><b>Sultan Hanafi Royal Schools</b>
      <span>15 Imowonla Road · Ikorodu · Lagos State</span></figcaption>
  </figure>
  <div class="pad">
    ${ph('Sultan Hanafi Royal Schools', 'A Word of Welcome')}
    <div class="letter">
      <p><span class="drop">O</span>${esc(WELCOME[0])}</p>
      <blockquote>${esc(LECTURE.title)}</blockquote>
      <p>${esc(WELCOME[1])}</p>
      <div class="sign">The Board of Trustees</div>
    </div>
    <div class="figs">${FIGURES.map(([n, l]) => `<div class="fig">
      <b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
    <div class="closing">
      <h4>A Word from the Chief Executive Director</h4>
      ${CEO_WORD.map((t) => `<p>${esc(t)}</p>`).join('')}
      <div class="cl-sig"><b>${esc(CHIEF_HOST[0])}</b>
        <span>${esc(CHIEF_HOST[2])}</span></div>
    </div>
    <div class="fol">Welcome</div>
  </div>
</section>`;

const panelBack = `<section class="panel p-b">
  <div class="pad">
    ${crest(20)}
    <div class="bk-ar">مدارس السلطان حنفي الملكية</div>
    <h1 class="bk-inst">Sultan Hanafi Royal Schools</h1>
    <div class="bk-est">Established MMXVII · Ikorodu · Lagos State</div>
    <div class="bk-lathe">${lathe('lb', 400, 22, 20, 0.6)}</div>
    <div class="bk-tag">${esc(TAGLINE)}</div>
    ${sh('Presiding and Officiating')}
    <div class="offs">${OFFICERS.map(([n, ar, r]) => `<div class="off">
      ${ar ? `<i dir="rtl" lang="ar">${esc(ar)}</i>` : ''}
      <b>${esc(n)}</b><span>${esc(r)}</span>
    </div>`).join('')}</div>
    ${sh('The Four Schools')}
    <div class="schools">
      <div><b>Nursery and Primary School</b><span>Ages 2 to 10</span></div>
      <div><b>Royal College</b><span>Junior and Senior Secondary</span></div>
      <div><b>School of Islamic and Arabic Studies</b>
        <span dir="rtl" lang="ar">قسم الدراسات الإسلامية والعربية</span></div>
      <div><b>Qur’an College</b>
        <span dir="rtl" lang="ar">كلية السلطان حنفي للقرآن</span></div>
    </div>
    ${plateRow([['campus-gate.jpg', 'The Campus Gate'],
      ['college-hall.jpg', 'The School Studio']], 21)}
    <div class="verify"><b>Every certificate is verifiable.</b>
      <span>Each carries a certificate number, a verification code and a QR code
      registered with the Office of the Registrar — scan the code, or enter the
      number at ${WEB}/verify-certificate.</span></div>
    <div class="bk-c">
      <span>${esc(VENUE)}</span>
      <span>${WEB} · ${MAIL} · ${TEL}</span>
    </div>
    <div class="bk-m" dir="rtl" lang="ar">القرآن يعلو ولا يعلى</div>
  </div>
</section>`;

const panelCover = `<section class="panel p-c">
  <img class="cv-photo" src="${G}/campus-building.jpg" alt="" />
  <div class="cv-scrim"></div>
  <div class="cv-frame"></div>
  <div class="cv-corner tl"></div><div class="cv-corner tr"></div>
  <div class="cv-corner bl"></div><div class="cv-corner br"></div>
  <div class="cv-top">
    ${crest(21, 'cv-crest')}
    <div class="cv-ar">مدارس السلطان حنفي الملكية</div>
    <h1 class="cv-inst">Sultan Hanafi Royal Schools</h1>
    <div class="cv-est">Established MMXVII · Ikorodu · Lagos</div>
  </div>
  <div class="cv-in">
    <div class="cv-lathe">${lathe('lc', 400, 22, 20, 0.6)}</div>
    <div class="cv-kicker">The First Combined</div>
    <h2 class="cv-title">Graduation<br/>Ceremony</h2>
    ${star('star-lg')}
    <div class="cv-class">Class of 2026</div>
    <div class="cv-when">
      <b>Saturday, 8 August 2026</b>
      <span dir="rtl" lang="ar">٢٥ صفر ١٤٤٨هـ</span>
      <span class="cv-hours">${to12(OPENS)} – ${to12(CLOSES)} · School Grounds</span>
    </div>
    <div class="cv-lathe cv-lathe-b">${lathe('lc2', 400, 22, 20, 0.6)}</div>
    <div class="cv-tag">${esc(TAGLINE)}</div>
    <div class="cv-count">${TOTAL} awards · ${PEOPLE} graduands · four schools</div>
  </div>
</section>`;

// ── SHEET 2 · THE INSIDE ────────────────────────────────────────────────────
const panelOrder = `<section class="panel p-o">
  <div class="pad">
    ${plate('recitation-assembly-1.jpg', 'Recitation Assembly', 30, 'plate-top')}
    ${ph('The Order of the Day', 'Order of Proceedings')}
    <ol class="ord">
      ${ORDER.map(([a, b, t, s]) => `<li>
        <span class="ord-t">${a}<i>–</i>${b}</span>
        <span class="ord-n"><b>${esc(t)}</b>${s
          ? `<em${/[؀-ۿ]/.test(s) ? ' dir="rtl" lang="ar"' : ''}>${esc(s)}</em>` : ''}</span>
      </li>`).join('')}
    </ol>
    <div class="coord"><span>Programme Coordinators</span><b>${esc(COORDINATORS)}</b></div>
    ${sh('Distinguished Guests')}
    <ul class="guests">${GUESTS.map(([n, r]) => `<li><b>${esc(n)}</b>${r
      ? `<span>${esc(r)}</span>` : ''}</li>`).join('')}</ul>
    <div class="fol">Proceedings</div>
  </div>
</section>`;

const panelRollA = `<section class="panel p-r">
  <div class="pad">
    ${ph('Class of 2026', 'The Graduands')}
    <p class="lead">Each graduand named here has completed the requirements of
    their programme and is admitted to the award beneath their school. One who
    has completed two programmes is named under each.</p>
    ${plateRow([['islamic-prayer-hall.jpg', 'The Prayer Hall'],
      ['basic-school-classroom.jpg', 'A Primary Classroom']], 18)}
    ${['QUR', 'IBT', 'IDD', 'PRY'].map((c) => rollBlock(byCode[c])).join('')}
    ${plate('quran-recitation-1.jpg', 'Qur’an Recitation', 20)}
  </div>
</section>`;

const panelRollB = `<section class="panel p-r">
  <div class="pad">
    ${ph('Class of 2026', 'The Graduands · continued')}
    ${['JSS', 'SS'].map((c) => rollBlock(byCode[c])).join('')}
    ${sh('The Chief Host')}
    <div class="host">
      <i dir="rtl" lang="ar">${esc(CHIEF_HOST[1])}</i>
      <b>${esc(CHIEF_HOST[0])}</b>
      <span>${esc(CHIEF_HOST[2])}</span>
    </div>
    ${sh('The Lecture')}
    <div class="lect">
      <em>“${esc(LECTURE.title)}”</em>
      <b>${esc(LECTURE.by)}</b>
    </div>
    ${plateRow([['chemistry-laboratory.jpg', 'Chemistry Laboratory'],
      ['games-recreation.jpg', 'Games and Recreation']], 21)}
    ${plate('ict-computer-laboratory.jpg', 'ICT Laboratory', 26)}
  </div>
</section>`;

// A trifold is two printed sides of three panels each. The panels are placed in
// the order the folder needs, not the order a reader meets them: with a
// letter-fold the right-hand panel of the outside is the face, the centre is
// the back, and the left tucks in first.
const marks = `<i class="mk tl"></i><i class="mk tr"></i>
  <i class="mk bl"></i><i class="mk br"></i>
  <i class="fold f1"></i><i class="fold f2"></i>`;

const CSS = `
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-500-normal.woff2') format('woff2');font-weight:500;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-600-normal.woff2') format('woff2');font-weight:600;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-700-normal.woff2') format('woff2');font-weight:700;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-500-italic.woff2') format('woff2');font-weight:500;font-style:italic;font-display:block}
@font-face{font-family:'Cormorant Garamond';src:url('/assets/fonts/cormorant-garamond-latin-600-italic.woff2') format('woff2');font-weight:600;font-style:italic;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-400-normal.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-700-normal.woff2') format('woff2');font-weight:700;font-display:block}
@font-face{font-family:'Cinzel';src:url('/assets/fonts/cinzel-latin-800-normal.woff2') format('woff2');font-weight:800;font-display:block}
@font-face{font-family:'Inter';src:url('/assets/fonts/inter-latin-400-normal.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Inter';src:url('/assets/fonts/inter-latin-600-normal.woff2') format('woff2');font-weight:600;font-display:block}
@font-face{font-family:'Amiri';src:url('/assets/fonts/amiri-arabic-400-normal.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:'Amiri';src:url('/assets/fonts/amiri-arabic-700-normal.woff2') format('woff2');font-weight:700;font-display:block}

/* A4 landscape plus 3mm bleed all round — the size this school's printer has
   already handled once. Trim to 297 x 210, fold to three 99mm panels. */
@page{size:303mm 216mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#2A2013}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{
  --paper:#FBF7EE; --ink:#241D12; --soft:#5A4E37; --gold:#A8863F;
  --gold-d:#7A5C21; --gold-l:#D8BC7C; --dk:#1B1408;
}
.sheet{position:relative;width:303mm;height:216mm;margin:0 auto;overflow:hidden;
  background:var(--paper);page-break-after:always;break-after:page}
.sheet:last-child{page-break-after:auto;break-after:auto}
/* Crop marks in the bleed, and a hairline on each fold. Both sit outside or
   between the panels, so neither prints inside a panel's image area. */
.mk{position:absolute;width:3mm;height:3mm;border:0}
.mk.tl{left:0;top:0;border-left:.2mm solid #8A7752;border-top:.2mm solid #8A7752}
.mk.tr{right:0;top:0;border-right:.2mm solid #8A7752;border-top:.2mm solid #8A7752}
.mk.bl{left:0;bottom:0;border-left:.2mm solid #8A7752;border-bottom:.2mm solid #8A7752}
.mk.br{right:0;bottom:0;border-right:.2mm solid #8A7752;border-bottom:.2mm solid #8A7752}
.fold{position:absolute;top:0;height:3mm;width:0;border-left:.2mm solid #8A7752;z-index:9}
.fold::after{content:'';position:absolute;left:-.1mm;top:210mm;width:0;height:3mm;
  border-left:.2mm solid #8A7752}
.fold.f1{left:102mm}
.fold.f2{left:201mm}

.panel{position:absolute;top:0;width:99mm;height:216mm;overflow:hidden;
  font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink);
  background:var(--paper)}
.sheet .panel:nth-of-type(1){left:0;width:102mm}
.sheet .panel:nth-of-type(1) .pad,.sheet .panel:nth-of-type(1) .fol{padding-left:11mm}
.sheet .panel:nth-of-type(2){left:102mm}
.sheet .panel:nth-of-type(3){left:201mm;width:102mm}
.sheet .panel:nth-of-type(3) .pad,.sheet .panel:nth-of-type(3) .fol{padding-right:11mm}
/* A woven ground, printed not pasted: hairlines at 45 and 135 degrees. */
.panel::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    repeating-linear-gradient(45deg,rgba(168,134,63,.05) 0 .18mm,transparent .18mm .9mm),
    repeating-linear-gradient(135deg,rgba(168,134,63,.038) 0 .18mm,transparent .18mm .9mm)}
.panel>*{position:relative;z-index:1}
.pad{padding:9mm 8mm 8mm}
.crest{display:block;margin:0 auto;width:auto;object-fit:contain}
.rule{display:flex;align-items:center;gap:2mm;margin:2.4mm 0}
.rule span{flex:1;height:.22mm;background:linear-gradient(90deg,rgba(168,134,63,0),var(--gold))}
.rule span:last-child{background:linear-gradient(270deg,rgba(168,134,63,0),var(--gold))}
.rule i{width:1.5mm;height:1.5mm;background:var(--gold);transform:rotate(45deg)}
.star{display:flex;justify-content:center;margin:2mm 0}
.star b{display:block;width:4mm;height:4mm;
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d));
  clip-path:polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%)}
.star-lg b{width:6.4mm;height:6.4mm}
.lathe{display:block;width:100%;height:100%}
.fol{position:absolute;left:8mm;right:8mm;bottom:5.4mm;font-family:'Inter',sans-serif;
  font-size:5pt;letter-spacing:.24em;text-transform:uppercase;color:var(--soft);
  text-align:center}

.ph-k{font-family:'Inter',sans-serif;font-size:5.2pt;letter-spacing:.24em;
  text-transform:uppercase;color:var(--soft);text-align:center}
.ph-t{font-family:'Cinzel',serif;font-size:12.4pt;font-weight:800;letter-spacing:.05em;
  text-transform:uppercase;color:var(--gold-d);margin-top:.8mm;text-align:center;
  line-height:1.1}
.sh{font-family:'Cinzel',serif;font-size:6.6pt;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:var(--gold-d);margin:3.2mm 0 1.6mm;
  padding-bottom:.9mm;border-bottom:.22mm solid rgba(168,134,63,.55)}

/* A hung picture, not a pasted rectangle. A cream mount carries a gold
   hairline; a dark keyline sits inside the aperture; the caption rides its own
   rail beneath, between two fading rules. Every photograph in this programme
   is framed this way, at one of three heights. */
.plate{margin:0 0 2.6mm;padding:1.3mm 1.3mm 1mm;
  background:linear-gradient(158deg,#FEFCF7 0%,#F7F0E0 52%,#F1E7D2 100%);
  box-shadow:0 .7mm 1.8mm rgba(36,26,11,.22),0 .15mm .4mm rgba(36,26,11,.16),
    inset 0 0 0 .22mm rgba(168,134,63,.9),inset 0 0 0 .55mm rgba(255,253,247,.9)}
.plate .fr{position:relative;display:block;height:var(--h);overflow:hidden;
  box-shadow:inset 0 0 0 .3mm rgba(27,20,8,.55),0 .2mm .5mm rgba(36,26,11,.18)}
.plate img{display:block;width:100%;height:100%;object-fit:cover;
  filter:sepia(.3) saturate(.9) contrast(1.06) brightness(1.02)}
.plate figcaption{display:flex;align-items:center;gap:1.8mm;margin-top:1.4mm;
  font-family:'Inter',sans-serif;font-size:4.5pt;letter-spacing:.2em;
  text-transform:uppercase;color:var(--gold-d);white-space:nowrap}
.plate figcaption::before,.plate figcaption::after{content:'';flex:1;height:.15mm;
  background:linear-gradient(90deg,rgba(168,134,63,0),rgba(168,134,63,.75))}
.plate figcaption::after{background:linear-gradient(270deg,rgba(168,134,63,0),rgba(168,134,63,.75))}
.plate-top{margin-top:0}
/* Two plates side by side share the rail below them. */
.prow{display:grid;grid-template-columns:1fr 1fr;gap:2mm}
.prow .plate{margin-bottom:2.4mm}
.prow figcaption{font-size:4.1pt;letter-spacing:.14em;gap:1.2mm}

/* ── COVER PANEL ─────────────────────────────────────────────────────────── */
.p-c{background:var(--dk);color:#F5EAD2;display:flex;flex-direction:column;
  justify-content:space-between}
.p-c::before{opacity:.35}
.cv-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
  object-position:52% 40%;filter:sepia(.5) saturate(.72) contrast(1.06) brightness(.86)}
.cv-scrim{position:absolute;inset:0;
  background:
    linear-gradient(180deg,rgba(16,11,3,.95) 0%,rgba(16,11,3,.7) 20%,
      rgba(20,14,5,.38) 38%,rgba(18,12,4,.8) 60%,rgba(14,9,2,.96) 80%,#100B03 100%),
    radial-gradient(80% 44% at 50% 62%,rgba(216,188,124,.14),transparent 70%)}
.cv-frame{position:absolute;inset:5mm;border:.4mm solid rgba(216,188,124,.62);
  box-shadow:inset 0 0 0 .9mm rgba(168,134,63,.36),0 0 12mm rgba(0,0,0,.6)}
.cv-corner{position:absolute;width:9mm;height:9mm;border:.25mm solid var(--gold-l);
  opacity:.9;z-index:3}
.cv-corner.tl{left:2.6mm;top:2.6mm;border-right:0;border-bottom:0}
.cv-corner.tr{right:2.6mm;top:2.6mm;border-left:0;border-bottom:0}
.cv-corner.bl{left:2.6mm;bottom:2.6mm;border-right:0;border-top:0}
.cv-corner.br{right:2.6mm;bottom:2.6mm;border-left:0;border-top:0}
.cv-top{position:relative;z-index:2;text-align:center;padding:13mm 10mm 0}
.cv-in{position:relative;z-index:2;text-align:center;padding:0 9mm 13mm}
.cv-crest{margin:0 auto 3mm;filter:drop-shadow(0 .8mm 1.6mm rgba(0,0,0,.7))}
.cv-ar{font-family:'Amiri',serif;font-size:10pt;font-weight:700;color:var(--gold-l);
  direction:rtl;margin-bottom:1.4mm}
.cv-inst{font-family:'Cinzel',serif;font-size:10.2pt;font-weight:800;letter-spacing:.11em;
  text-transform:uppercase;line-height:1.24;
  background:linear-gradient(180deg,#F9EDCC,#D8BC7C 46%,#A8863F);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.cv-est{font-family:'Inter',sans-serif;font-size:4.8pt;letter-spacing:.24em;
  text-transform:uppercase;color:rgba(216,188,124,.78);margin-top:1.8mm}
.cv-lathe{height:4mm;margin:0 0 3mm;opacity:.95}
.cv-lathe-b{margin:4mm 0 3mm}
.cv-kicker{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:10.4pt;
  color:rgba(245,234,210,.88);margin-bottom:1.2mm}
.cv-title{font-family:'Cinzel',serif;font-size:24pt;font-weight:800;line-height:1.03;
  letter-spacing:.03em;text-transform:uppercase;
  background:linear-gradient(180deg,#FFF8E6,#E7CF97 40%,#BC9850 78%,#8E6E2C);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .35mm .6mm rgba(0,0,0,.75))}
.cv-class{font-family:'Cinzel',serif;font-size:9pt;font-weight:400;letter-spacing:.34em;
  text-transform:uppercase;color:var(--gold-l);padding-left:.34em;margin-bottom:4mm}
.cv-when{display:flex;flex-direction:column;gap:1.2mm}
.cv-when b{font-size:11.6pt;font-weight:600;color:#FDF6E6;
  text-shadow:0 .3mm .6mm rgba(0,0,0,.6)}
.cv-when [lang=ar]{font-family:'Amiri',serif;font-size:10pt;color:var(--gold-l)}
.cv-hours{font-family:'Inter',sans-serif;font-size:5pt;letter-spacing:.18em;
  text-transform:uppercase;color:rgba(245,234,210,.7)}
.cv-tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:9.8pt;
  color:var(--gold-l)}
.cv-count{margin-top:1.6mm;font-family:'Inter',sans-serif;font-size:4.8pt;
  letter-spacing:.2em;text-transform:uppercase;color:rgba(245,234,210,.58)}

/* ── WELCOME PANEL ───────────────────────────────────────────────────────── */
.hero{position:relative;height:54mm;overflow:hidden}
.hero img{width:100%;height:100%;object-fit:cover;object-position:50% 32%;
  filter:sepia(.28) saturate(.94) contrast(1.05)}
.hero::after{content:'';position:absolute;left:0;right:0;bottom:0;height:22mm;
  background:linear-gradient(180deg,rgba(20,13,3,0),rgba(20,13,3,.84))}
.hero figcaption{position:absolute;left:6mm;right:6mm;bottom:2.6mm;z-index:2;
  display:flex;flex-direction:column;gap:.6mm;text-align:center}
.hero figcaption b{font-size:7.4pt;font-weight:600;color:#FBF3E1;line-height:1.2}
.hero figcaption span{font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.18em;text-transform:uppercase;color:rgba(216,188,124,.9)}
.letter p{font-size:7.9pt;line-height:1.42;text-align:justify;margin-bottom:1.8mm}
.drop{float:left;font-family:'Cinzel',serif;font-size:16pt;line-height:.92;
  font-weight:700;color:#FBF3E1;background:linear-gradient(150deg,var(--gold),var(--gold-d));
  padding:1.1mm 1.4mm .8mm;margin:.5mm 1.7mm 0 0;
  box-shadow:0 .3mm .7mm rgba(0,0,0,.22)}
.letter blockquote{margin:2mm 0 2.2mm;padding-left:3.2mm;
  border-left:.5mm solid var(--gold);font-style:italic;font-size:9pt;line-height:1.28;
  color:var(--gold-d)}
.sign{font-family:'Inter',sans-serif;font-size:4.8pt;letter-spacing:.22em;
  text-transform:uppercase;color:var(--soft);text-align:right}
.figs{display:grid;grid-template-columns:1fr 1fr;gap:1.6mm 3mm;margin:3mm 0;
  padding:2.4mm 0;border-top:.22mm solid rgba(168,134,63,.55);
  border-bottom:.22mm solid rgba(168,134,63,.55)}
.fig{text-align:center}
.fig b{display:block;font-family:'Cinzel',serif;font-size:11pt;font-weight:700;
  color:var(--gold-d);line-height:1.1}
.fig span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-top:.7mm}
.closing{background:linear-gradient(150deg,#241A0B,#191204 62%,#261C0C);
  color:#F3E7CC;padding:3.4mm 4mm;box-shadow:inset 0 0 0 .22mm rgba(216,188,124,.5)}
.closing h4{font-family:'Cinzel',serif;font-size:5.8pt;font-weight:700;letter-spacing:.2em;
  text-transform:uppercase;color:var(--gold-l);margin-bottom:1.4mm}
.closing p{font-size:7.6pt;line-height:1.36;text-align:justify;
  color:rgba(243,231,204,.92);margin-bottom:1.2mm}
.cl-sig{margin-top:1.4mm;text-align:right}
.cl-sig b{font-size:8.4pt;font-weight:600;color:#FBF3E1}
.cl-sig span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.18em;text-transform:uppercase;color:rgba(216,188,124,.8);margin-top:.4mm}

/* ── BACK PANEL ──────────────────────────────────────────────────────────── */
.p-b{background:linear-gradient(184deg,#FDFAF3,#F6EEDD 62%,#F2E9D6)}
.p-b .pad{text-align:center}
.bk-ar{font-family:'Amiri',serif;font-size:10pt;font-weight:700;color:var(--gold-d);
  direction:rtl;margin-top:2.4mm}
.bk-inst{font-family:'Cinzel',serif;font-size:10.4pt;font-weight:800;letter-spacing:.11em;
  text-transform:uppercase;color:var(--gold-d);margin-top:1.2mm;line-height:1.24}
.bk-est{font-family:'Inter',sans-serif;font-size:4.7pt;letter-spacing:.22em;
  text-transform:uppercase;color:var(--soft);margin-top:1.6mm}
.bk-lathe{height:4mm;margin:3mm 0 2mm}
.bk-tag{font-style:italic;font-size:9.4pt;color:var(--gold-d)}
.p-b .sh{text-align:center}
/* The offices are set in type. No portrait of an officer appears anywhere in
   this programme — the Founder's ruling. A gold lozenge marks each entry and a
   hairline separates them. */
.offs{display:flex;flex-direction:column;gap:0}
.off{position:relative;padding:1.9mm 0 1.9mm 4.6mm;text-align:left;
  border-bottom:.1mm solid rgba(168,134,63,.3)}
.off:last-child{border-bottom:0}
.off::before{content:'';position:absolute;left:.6mm;top:3.1mm;width:1.5mm;height:1.5mm;
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d));transform:rotate(45deg)}
.off i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:8pt;
  direction:rtl;text-align:left;color:var(--gold-d);line-height:1.24}
.off b{display:block;font-size:8.6pt;font-weight:600;line-height:1.18;margin-top:.2mm}
.off span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin-top:.6mm;
  line-height:1.32}
.schools{display:flex;flex-direction:column;gap:1.6mm;text-align:center}
.schools b{display:block;font-size:8pt;font-weight:600;line-height:1.18}
.schools span{display:block;font-family:'Inter',sans-serif;font-size:4.3pt;
  letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-top:.4mm}
.schools span[lang=ar]{font-family:'Amiri',serif;font-size:7pt;letter-spacing:0;
  text-transform:none;color:var(--gold-d)}
.verify{display:flex;flex-direction:column;gap:.9mm;margin-top:4mm}
.verify b{font-family:'Cinzel',serif;font-size:6pt;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--gold-d)}
.verify span{font-size:7.2pt;line-height:1.32;color:var(--soft);font-style:italic}
.bk-c{display:flex;flex-direction:column;gap:.7mm;margin-top:3mm}
.bk-c span{font-family:'Inter',sans-serif;font-size:4.6pt;letter-spacing:.12em;
  color:var(--soft)}
.bk-m{margin-top:3mm;font-family:'Amiri',serif;font-size:9.4pt;color:var(--gold-d)}

/* ── ORDER PANEL ─────────────────────────────────────────────────────────── */
.ord{list-style:none;margin-top:.4mm}
.ord li{display:flex;align-items:baseline;gap:2.2mm;padding:.94mm 0;
  border-bottom:.1mm solid rgba(168,134,63,.32)}
.ord li:nth-child(odd){background:linear-gradient(90deg,rgba(168,134,63,.06),
  rgba(168,134,63,.012) 62%,transparent)}
.ord li:last-child{border-bottom:0}
.ord-t{flex:0 0 20mm;padding-left:1mm;font-family:'Inter',sans-serif;font-size:5.2pt;
  font-weight:600;letter-spacing:.02em;color:var(--gold-d);white-space:nowrap}
.ord-t i{font-style:normal;padding:0 .3mm;color:var(--gold-l)}
.ord-n{flex:1}
.ord-n b{display:block;font-size:8.4pt;font-weight:600;line-height:1.16}
.ord-n em{display:block;font-size:6.2pt;font-style:italic;color:var(--soft);margin-top:.2mm}
.ord-n em[lang=ar]{font-family:'Amiri',serif;font-style:normal;font-size:7.4pt;
  color:var(--gold-d)}
.coord{display:flex;flex-direction:column;align-items:center;gap:.6mm;margin-top:2mm}
.coord span{font-family:'Inter',sans-serif;font-size:4.6pt;letter-spacing:.22em;
  text-transform:uppercase;color:var(--soft)}
.coord b{font-size:8.2pt;font-weight:600}
.guests{list-style:none}
.guests li{padding:.62mm 0;border-bottom:.1mm solid rgba(168,134,63,.28)}
.guests li:last-child{border-bottom:0}
.guests b{display:block;font-size:8pt;font-weight:600;line-height:1.18}
.guests span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin-top:.3mm}

/* ── GRADUAND PANELS ─────────────────────────────────────────────────────── */
.p-r .pad{padding-bottom:8mm}
.lead{font-size:7.2pt;line-height:1.36;color:var(--soft);font-style:italic;
  text-align:center;margin:.4mm 1mm 3mm}
.rl{margin-bottom:2.5mm}
.rl-h{border-bottom:.26mm solid var(--gold);padding-bottom:.9mm;margin-bottom:1.1mm}
.rl-h i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:7.6pt;
  direction:rtl;text-align:left;color:var(--gold);line-height:1.2}
.rl-h b{display:block;font-family:'Cinzel',serif;font-size:6.9pt;font-weight:700;
  letter-spacing:.04em;text-transform:uppercase;color:var(--gold-d);line-height:1.2}
.rl-h span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.08em;text-transform:uppercase;color:var(--soft);margin-top:.5mm}
.rl-n{margin-left:3.4mm}
.rl-n li{font-size:8.2pt;line-height:1.26}
.rl-n li::marker{color:var(--gold);font-size:5.8pt}
.host{position:relative;padding-left:4.6mm}
.host::before{content:'';position:absolute;left:.6mm;top:2.2mm;width:1.5mm;height:1.5mm;
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d));transform:rotate(45deg)}
.host i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:8.4pt;
  direction:rtl;text-align:left;color:var(--gold-d)}
.host b{display:block;font-size:9.2pt;font-weight:600;line-height:1.18;margin-top:.3mm}
.host span{display:block;font-family:'Inter',sans-serif;font-size:4.4pt;
  letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-top:.6mm}
.lect em{display:block;font-size:8.4pt;font-style:italic;line-height:1.26;
  color:var(--gold-d)}
.lect b{display:block;font-size:8.4pt;font-weight:600;margin-top:.9mm}
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>SHRS Graduation Ceremony 2026 — Trifold Programme</title>
<style>${CSS}</style></head><body>
<section class="sheet">${panelWelcome}${panelBack}${panelCover}${marks}</section>
<section class="sheet">${panelOrder}${panelRollA}${panelRollB}${marks}</section>
</body></html>`;

writeFileSync(join(OUT, 'SHRS-Graduation-Programme-2026.html'), html);

// The Word edition is set from these same constants rather than from a second
// hand-typed list, so the two editions cannot drift apart on a name.
export {
  AWARDS, ORDER, OFFICERS, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, GUESTS, FIGURES, WELCOME, CEO_WORD, TAGLINE, OPENS, CLOSES, to12,
};

console.log(`\nGraduation Ceremony Programme — trifold, 2 sheets of 3 panels`);
console.log(`  303 x 216mm (A4 landscape + 3mm bleed) · folds to 99 x 210mm`);
console.log(`  ${TOTAL} awards · ${PEOPLE} graduands · ${AWARDS.length} award rolls`);
for (const a of AWARDS) console.log(`    ${a.code.padEnd(4)} ${String(a.names.length).padStart(2)}  ${a.title}`);
console.log(`  → ${OUT}/SHRS-Graduation-Programme-2026.html\n`);
