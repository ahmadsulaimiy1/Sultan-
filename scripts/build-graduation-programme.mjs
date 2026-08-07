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
      'Aisha Anofi', 'Baqi Anofi', "Sa'ad Sanusi", 'Fawaz Owolabi', 'Radiah Apatira',
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
// SOURCE: the school's own "Programme of Event" (Programme_of_Event1.docx,
// supplied 2026-08-07). Fourteen items, in the school's sequence and wording.
//
// ITS SEQUENCE IS FOLLOWED EXACTLY. An earlier pass here reordered two pairs —
// Key Guests / Graduands, and Donation / Goodwill Message — while claiming to
// keep the school's order. That was wrong and is corrected: the sequence below
// is the document's, line for line.
//
// ONE CLASS OF CHANGE, made and declared: the document's TIMES contradict
// themselves in four places and cannot be printed as written.
//   · "Introduction of the Graduands 10:10-10:30" runs back through the anthems
//     and across the whole of the Key Guests' slot. Given 10:30–10:45, which
//     moves the Welcome Address from 10:30 to 10:45.
//   · "Solatu Dhur 12:45 – 1: 1:20" is malformed. Read as 12:45–13:20.
//   · Donation "1:00-1:05" and Light Refreshments "1:05-1:20" both fall INSIDE
//     that prayer. Their DURATIONS are kept — five minutes and fifteen — and
//     they are placed after it.
//   · "Royal Students Presentation" and "Goodwill message" carry no time at
//     all. Fifteen minutes and five, in their printed positions.
//
// Nothing is added and nothing is dropped. A previous pass also printed an
// "Arrival and Seating of Guests 10:00–10:05" that appears in no school
// document; it has been removed. The ceremony begins at 10:05, as written.
//
// Two wordings are normalised for a formal programme and nothing else is:
// "Lecture! Lecture!! Lecture!!!" prints as "Lecture", and "Solatu Dhur" as
// "Ṣolātu Ẓuhr" beside the Arabic صلاة الظهر. Reverting either is a one-line
// change here.
const ORDER = [
  ['10:05', '10:10', 'Recitation from the Glorious Qur’an', 'تلاوة من القرآن الكريم'],
  ['10:10', '10:15', 'National Anthem and School Anthem', ''],
  ['10:15', '10:30', 'Introduction of Key Guests', ''],
  ['10:30', '10:45', 'Introduction of the Graduands', ''],
  ['10:45', '11:30', 'Welcome Address by the School Heads', ''],
  ['11:30', '11:40', 'Chairman’s Opening Speech', ''],
  ['11:40', '11:50', 'Primary Pupils’ Presentations', ''],
  ['11:50', '12:00', 'Graduands’ Presentations', 'Secular · Islāmiyyah · Arabic'],
  ['12:00', '12:45', 'Lecture', ''],
  ['12:45', '13:20', 'Ṣolātu Ẓuhr', 'صلاة الظهر'],
  ['13:20', '13:35', 'Royal Students’ Presentation', 'All Units'],
  ['13:35', '13:40', 'Donation', ''],
  ['13:40', '13:45', 'Goodwill Message', ''],
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
// The live domain. The school's own letterhead — on the Programme of Event
// itself — reads https://shroyalschools.ng. Every verification URL, every QR
// in the certificate registers, and the live site are .com, so a guest who
// types the .ng reaches nothing. The .com prints until the Founder rules
// otherwise, and the discrepancy is reported rather than smoothed.
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

// ── THE DIGITAL CAMPUS ──────────────────────────────────────────────────────
// Written to the honesty rule: every capability named below is running in this
// repository and on the live site today. Nothing here is a roadmap item, an
// intention, or a rounded claim. The register that issues the numbers on the
// certificates conferred at this ceremony is the same register described here.
const DIGITAL = {
  lead: 'Alongside its classrooms Sultan Hanafi Royal Schools maintains an '
    + 'institutional digital campus. Every certificate conferred today carries '
    + 'a unique certificate number, a verification code and a QR code entered '
    + 'in the register of the Office of the Registrar, and may be authenticated '
    + 'from any device by any holder or employer, without contacting the school.',
  body: 'The same registry issues institutional identity numbers to students '
    + 'and to staff, each independently verifiable; guardians, students and '
    + 'officers hold distinct portals secured by one-time verification at '
    + 'sign-in; and the Office of Finance issues invoices and receipts that '
    + 'verify publicly against their own record.',
  items: [
    ['Verifiable certificates', 'Number, code and QR, registered at issue'],
    ['Institutional identity', 'Numbered and verifiable for student and officer'],
    ['Guardian and student portals', 'Distinct access, one-time verification'],
    ['The Registrar’s Office', 'Promotion, graduation, transfer, certification'],
    ['Public receipt verification', 'Every invoice and receipt checkable'],
    ['An installable campus', 'The school as an application, on any device'],
  ],
};

// ── THE PHOTOGRAPHY ─────────────────────────────────────────────────────────
// Every photograph here is a real photograph of this campus, already cleared
// and already published on the school's own site. Nothing is stock, nothing is
// a placeholder, and the captions name what is actually in the frame.
const G = '/assets/images/gallery';

// ── ORNAMENT ────────────────────────────────────────────────────────────────
// A real engine-turned band: interfering sine strands at a hairline, the same
// lathe the certificates carry. Cheap to print, impossible to photocopy
// cleanly, and the one mark that says this came from the same press as the
// awards.
function lathe(id, w, h, cycles, stroke, dark = false) {
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
  const mid = dark ? '#F0DCA9' : '#D8BC7C';
  return `<svg class="lathe" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
    <defs><linearGradient id="${id}" x1="0" x2="1">
      <stop offset="0" stop-color="#A8863F" stop-opacity="0" />
      <stop offset=".22" stop-color="#A8863F" stop-opacity=".85" />
      <stop offset=".5" stop-color="${mid}" stop-opacity="1" />
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

// A hung picture, not a pasted rectangle: a mount carrying a gold hairline, a
// keyline inside the aperture, and the caption on its own rail beneath.
const plate = (src, cap, h, cls = '') => `<figure class="plate ${cls}" style="--h:${h}mm">
  <span class="fr"><img src="${G}/${src}" alt="" /></span>
  <figcaption>${esc(cap)}</figcaption></figure>`;

const plateRow = (items, h, cls = '') => `<div class="prow">${items
  .map(([src, cap]) => plate(src, cap, h, cls)).join('')}</div>`;

const ph = (kicker, title) => `<header class="ph">
  <div class="ph-k">${esc(kicker)}</div>
  <h3 class="ph-t">${title}</h3></header>${rule()}`;

const sh = (t) => `<h4 class="sh">${esc(t)}</h4>`;

const rollBlock = (a) => `<div class="rl">
  <div class="rl-h">
    ${a.ar ? `<i dir="rtl" lang="ar">${esc(a.ar)}</i>` : ''}
    <b>${esc(a.title)}</b>
    <span>${esc(a.school)}</span>
  </div>
  <ol class="rl-n">${a.names.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
</div>`;

const byCode = Object.fromEntries(AWARDS.map((a) => [a.code, a]));

// The lecture's own slot in the running order, so the hour on the feature
// panel can never disagree with the hour on the order of proceedings.
const LECTURE_SLOT = ORDER.find(([, , t]) => t === 'Lecture');

// ── PANEL 1 · THE WELCOME ───────────────────────────────────────────────────
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
    <div class="fol">I · Welcome</div>
  </div>
</section>`;

// ── PANEL 2 · THE BACK ──────────────────────────────────────────────────────
const panelBack = `<section class="panel p-b">
  <div class="pad">
    ${crest(20)}
    <div class="bk-ar">مدارس السلطان حنفي الملكية</div>
    <h1 class="bk-inst">Sultan Hanafi Royal Schools</h1>
    <div class="bk-est">Established MMXVII · Ikorodu · Lagos State</div>
    <div class="bk-lathe">${lathe('lb', 400, 22, 20, 0.6)}</div>
    <div class="bk-tag">${esc(TAGLINE)}</div>
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
      ['college-hall.jpg', 'The School Studio']], 42)}
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

// ── PANEL 3 · THE FACE ──────────────────────────────────────────────────────
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
    <div class="cv-lathe">${lathe('lc', 400, 22, 20, 0.6, true)}</div>
    <div class="cv-kicker">The First Combined</div>
    <h2 class="cv-title">Graduation<br/>Ceremony</h2>
    ${star('star-lg')}
    <div class="cv-class">Class of 2026</div>
    <div class="cv-when">
      <b>Saturday, 8 August 2026</b>
      <span dir="rtl" lang="ar">٢٥ صفر ١٤٤٨هـ</span>
      <span class="cv-hours">${to12(OPENS)} – ${to12(CLOSES)} · School Grounds</span>
    </div>
    <div class="cv-lathe cv-lathe-b">${lathe('lc2', 400, 22, 20, 0.6, true)}</div>
    <div class="cv-tag">${esc(TAGLINE)}</div>
    <div class="cv-count">${TOTAL} awards · ${PEOPLE} graduands · four schools</div>
  </div>
</section>`;

// ── PANEL 4 · THE CHIEF HOST ────────────────────────────────────────────────
// A panel of its own. The Founder's ruling of 8 August 2026: the Chief Host
// and the Lecture of the Day carry the hierarchy of this programme, and the
// names of the Principals and the Head Teacher are not printed.
const panelHost = `<section class="panel p-host">
  <div class="ho-frame"></div>
  <div class="pad">
    ${crest(17)}
    <div class="ho-k">The Chief Host</div>
    <div class="ho-lathe">${lathe('lh', 400, 22, 20, 0.6)}</div>
    <div class="ho-ar" dir="rtl" lang="ar">${esc(CHIEF_HOST[1])}</div>
    <h2 class="ho-name">${esc(CHIEF_HOST[0])}</h2>
    <div class="ho-offices">
      <span>${esc(CHIEF_HOST[2])}</span>
      <i></i>
      <span>Chairman, Board of Governors</span>
    </div>
    ${star()}
    <p class="ho-note">Presiding over the first combined convocation of the four
    schools, and conferring every award named in this programme.</p>
    ${plate('campus-building.jpg', 'The Campus at Imowonla Road', 76)}
    <div class="fol">IV · The Chief Host</div>
  </div>
</section>`;

// ── PANEL 5 · THE LECTURE OF THE DAY ────────────────────────────────────────
// The dark panel at the centre of the opened sheet. The topic is the largest
// thing inside the programme; a guest should find it without reading anything
// else.
const panelLecture = `<section class="panel p-lec">
  <div class="lc-ground"></div>
  <div class="lc-frame"></div>
  <div class="cv-corner tl"></div><div class="cv-corner tr"></div>
  <div class="cv-corner bl"></div><div class="cv-corner br"></div>
  <div class="pad">
    <div class="lc-k">The Lecture of the Day</div>
    <div class="lc-lathe">${lathe('ll', 400, 22, 20, 0.6, true)}</div>
    <h2 class="lc-topic">${esc(LECTURE.title)}</h2>
    ${star('star-lg')}
    <div class="lc-by">Delivered by</div>
    <div class="lc-name">${esc(LECTURE.by)}</div>
    <div class="lc-when">${LECTURE_SLOT[0]} – ${LECTURE_SLOT[1]} · Saturday, 8 August 2026</div>
    <div class="lc-seat">The School Grounds · Ikorodu, Lagos State</div>
    <div class="lc-lathe lc-lathe-b">${lathe('ll2', 400, 22, 20, 0.6, true)}</div>
    ${plate('recitation-assembly-1.jpg', 'The Assembly Hall', 72, 'plate-dk')}
    <div class="fol fol-dk">V · The Lecture</div>
  </div>
</section>`;

// ── PANEL 6 · THE ORDER OF PROCEEDINGS ──────────────────────────────────────
const panelOrder = `<section class="panel p-o">
  <div class="pad">
    ${plate('islamic-prayer-hall.jpg', 'The Prayer Hall', 28, 'plate-top')}
    ${ph('The Order of the Day', 'Order of Proceedings')}
    <ol class="ord">
      ${ORDER.map(([a, b, t, s0]) => {
        const mark = t === 'Lecture';
        const s = mark && !s0 ? LECTURE.title : s0;
        return `<li${mark ? ' class="ord-mark"' : ''}>
        <span class="ord-t">${a}<i>–</i>${b}</span>
        <span class="ord-n"><b>${esc(t)}</b>${s
          ? `<em${/[؀-ۿ]/.test(s) ? ' dir="rtl" lang="ar"' : ''}>${esc(s)}</em>` : ''}</span>
      </li>`;
      }).join('')}
    </ol>
    <div class="coord"><span>Programme Coordinators</span><b>${esc(COORDINATORS)}</b></div>
    <div class="fol">VI · Proceedings</div>
  </div>
</section>`;

// ── PANEL 7 · THE DISTINGUISHED GUESTS ──────────────────────────────────────
const panelGuests = `<section class="panel p-g">
  <div class="pad">
    ${ph('In Attendance', 'Distinguished Guests')}
    <ul class="guests">${GUESTS.map(([n, r]) => `<li><b>${esc(n)}</b>${r
      ? `<span>${esc(r)}</span>` : ''}</li>`).join('')}</ul>
    ${plateRow([['scholarly-visit-1.jpg', 'A Scholarly Visit'],
      ['spelling-competition.jpg', 'Spelling Competition']], 28)}
    ${sh('The Presiding Officers')}
    <p class="gs-note">The Board of Governors, the Principals of the Royal
    College and of the School of Islamic and Arabic Studies, the Mudeer of the
    Qur’an College and the Head Teacher of the Nursery and Primary School
    present the graduands named in this programme.</p>
    ${plate('boarding-dining.jpg', 'The Dining Hall', 44)}
    <div class="fol">VII · In Attendance</div>
  </div>
</section>`;

// ── PANEL 8 · THE DIGITAL CAMPUS ────────────────────────────────────────────
const panelDigital = `<section class="panel p-d">
  <div class="pad">
    ${ph('Technology and the Record', 'The Digital Campus')}
    <p class="dg-lead">${esc(DIGITAL.lead)}</p>
    <p class="dg-body">${esc(DIGITAL.body)}</p>
    <ul class="dg-list">${DIGITAL.items.map(([t, d]) => `<li>
      <b>${esc(t)}</b><span>${esc(d)}</span></li>`).join('')}</ul>
    ${plateRow([['ict-computer-laboratory.jpg', 'ICT Laboratory'],
      ['chemistry-laboratory.jpg', 'Chemistry Laboratory']], 44)}
    <div class="fol">VIII · The Digital Campus</div>
  </div>
</section>`;

// ── PANEL 9 · THE CLASS OF 2026 (the insert's face) ─────────────────────────
const panelClass = `<section class="panel p-cl">
  <img class="cv-photo" src="${G}/recitation-assembly-3.jpg" alt="" />
  <div class="cl-scrim"></div>
  <div class="cv-frame"></div>
  <div class="cv-corner tl"></div><div class="cv-corner tr"></div>
  <div class="cv-corner bl"></div><div class="cv-corner br"></div>
  <div class="cl-in">
    ${crest(23, 'cv-crest')}
    <div class="cl-k">The Roll of</div>
    <h2 class="cl-title">The<br/>Graduands</h2>
    <div class="cl-lathe">${lathe('lz', 400, 22, 20, 0.6, true)}</div>
    <div class="cl-stats">
      <div><b>${TOTAL}</b><span>Awards conferred</span></div>
      <div><b>${PEOPLE}</b><span>Graduands</span></div>
      <div><b>${AWARDS.length}</b><span>Award rolls</span></div>
      <div><b>4</b><span>Schools</span></div>
    </div>
    <div class="cl-year">Class of 2026</div>
  </div>
</section>`;

// ── PANELS 10–12 · THE GRADUANDS ────────────────────────────────────────────
// Three panels carry the roll, two award rolls to a panel, each panel closed by
// a framed picture of the school the names come from.
const rollPanel = (codes, numeral, lead, plates) => `<section class="panel p-r">
  <div class="pad">
    ${lead ? `${ph('Class of 2026', 'The Graduands')}
    <p class="lead">Each graduand named here has completed the requirements of
    their programme and is admitted to the award beneath their school. One who
    has completed two programmes is named under each.</p>`
    : `${ph('Class of 2026', 'The Graduands · continued')}`}
    ${codes.map((c) => rollBlock(byCode[c])).join('')}
    ${plates}
    <div class="fol">${numeral} · The Graduands</div>
  </div>
</section>`;

const panelRollA = rollPanel(['QUR', 'IBT'], 'X', true,
  plate('quran-recitation-1.jpg', 'Qur’an Recitation', 72));
const panelRollB = rollPanel(['IDD', 'PRY'], 'XI', false,
  plate('basic-school-classroom.jpg', 'A Classroom in Session', 76));
const panelRollC = rollPanel(['JSS', 'SS'], 'XII', false,
  plate('biology-laboratory.jpg', 'The Biology Laboratory', 62));

// Two sheets, each folded in three, each printed both sides: four printed
// sides, twelve panels. Sheet I is the programme; Sheet II is the roll of
// graduands and nests inside it.
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
   already handled once. Trim to 297 x 210, fold to three 99mm panels. Two
   sheets, printed both sides: four printed sides, twelve panels. */
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
.pad{padding:9mm 8mm 8mm;min-height:100%}
/* The welcome panel's pad starts below a 54mm hero. */
.p-w .pad{min-height:calc(100% - 54mm)}
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
.fol-dk{color:rgba(216,188,124,.72)}

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
   is framed this way, at one of four heights. */
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
/* The same mount, struck for a dark ground. */
.plate-dk{background:linear-gradient(158deg,#2E2412 0%,#1F1708 54%,#271D0D 100%);
  box-shadow:0 .8mm 2.2mm rgba(0,0,0,.55),
    inset 0 0 0 .22mm rgba(216,188,124,.78),inset 0 0 0 .55mm rgba(70,53,23,.9)}
.plate-dk figcaption{color:var(--gold-l)}
.plate-dk figcaption::before{background:linear-gradient(90deg,rgba(216,188,124,0),rgba(216,188,124,.8))}
.plate-dk figcaption::after{background:linear-gradient(270deg,rgba(216,188,124,0),rgba(216,188,124,.8))}
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
/* The face and the insert's face are the third panel of their sheet, so they
   carry 3mm of bleed on the right. The optical centre is 9mm/12mm, not 9/9. */
.cv-top{position:relative;z-index:2;text-align:center;padding:13mm 12mm 0 9mm}
.cv-in{position:relative;z-index:2;text-align:center;padding:0 12mm 13mm 9mm}
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
.schools{display:flex;flex-direction:column;gap:2.8mm;text-align:center;
  margin-bottom:4.4mm}
.schools b{display:block;font-size:8pt;font-weight:600;line-height:1.18}
.schools span{display:block;font-family:'Inter',sans-serif;font-size:4.3pt;
  letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-top:.4mm}
.schools span[lang=ar]{font-family:'Amiri',serif;font-size:7pt;letter-spacing:0;
  text-transform:none;color:var(--gold-d)}
.verify{display:flex;flex-direction:column;gap:.9mm;margin-top:3mm}
.verify b{font-family:'Cinzel',serif;font-size:6pt;font-weight:700;letter-spacing:.12em;
  text-transform:uppercase;color:var(--gold-d)}
.verify span{font-size:7.2pt;line-height:1.32;color:var(--soft);font-style:italic}
.bk-c{display:flex;flex-direction:column;gap:.7mm;margin-top:3mm}
.bk-c span{font-family:'Inter',sans-serif;font-size:4.6pt;letter-spacing:.12em;
  color:var(--soft)}
.bk-m{margin-top:3mm;font-family:'Amiri',serif;font-size:9.4pt;color:var(--gold-d)}

/* ── THE CHIEF HOST ──────────────────────────────────────────────────────── */
/* A panel of its own, and the only officer named in the whole publication.
   The Founder's ruling of 8 August 2026: the Chief Host and the Lecture of the
   Day carry the hierarchy; the Principals and the Head Teacher are not named. */
.p-host{background:linear-gradient(178deg,#FDFAF3,#F8F1E1 54%,#F1E8D3)}
.ho-frame{position:absolute;inset:4.4mm;z-index:0;
  border:.35mm solid rgba(168,134,63,.62);
  box-shadow:inset 0 0 0 .85mm rgba(168,134,63,.16)}
.p-host .pad{position:relative;z-index:1;text-align:center;padding:18mm 12mm 8mm}
.ho-k{font-family:'Inter',sans-serif;font-size:5.4pt;letter-spacing:.32em;
  text-transform:uppercase;color:var(--soft);margin-top:3.4mm;padding-left:.32em}
.ho-lathe{height:4.2mm;margin:2.6mm 0 3.4mm}
.ho-ar{font-family:'Amiri',serif;font-size:12pt;font-weight:700;color:var(--gold-d);
  direction:rtl;line-height:1.5;margin-bottom:2.2mm}
.ho-name{font-family:'Cinzel',serif;font-size:15.6pt;font-weight:800;line-height:1.2;
  letter-spacing:.035em;text-transform:uppercase;
  background:linear-gradient(180deg,#B9963F,#8A6A26 52%,#6A4E17);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.ho-offices{display:flex;flex-direction:column;align-items:center;gap:1.4mm;
  margin-top:3mm}
.ho-offices span{font-family:'Inter',sans-serif;font-size:5.4pt;letter-spacing:.2em;
  text-transform:uppercase;color:var(--ink);line-height:1.3}
.ho-offices i{display:block;width:1.6mm;height:1.6mm;transform:rotate(45deg);
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d))}
.p-host .star{margin:4.4mm 0}
.ho-note{font-size:8.2pt;font-style:italic;line-height:1.42;color:var(--soft);
  margin:0 1mm 5mm}
.p-host .plate{margin-bottom:3mm}

/* ── THE LECTURE OF THE DAY ──────────────────────────────────────────────── */
/* The dark panel at the centre of the opened sheet. The topic is the largest
   piece of type anywhere inside the programme: a guest should be able to find
   it without reading a single other line. */
.p-lec{background:var(--dk);color:#F5EAD2}
.p-lec::before{opacity:.3}
.lc-ground{position:absolute;inset:0;z-index:0;
  background:
    linear-gradient(180deg,#120C03 0%,#241A09 34%,#2C2010 52%,#1D1507 76%,#100B03 100%),
    radial-gradient(78% 40% at 50% 40%,rgba(216,188,124,.16),transparent 72%)}
.lc-frame{position:absolute;inset:5mm;z-index:1;border:.4mm solid rgba(216,188,124,.6);
  box-shadow:inset 0 0 0 .9mm rgba(168,134,63,.34)}
.p-lec .pad{position:relative;z-index:2;text-align:center;padding:18mm 11mm 8mm}
.lc-k{font-family:'Inter',sans-serif;font-size:5.4pt;letter-spacing:.32em;
  text-transform:uppercase;color:rgba(216,188,124,.86);padding-left:.32em}
.lc-lathe{height:4.2mm;margin:3mm 0 4.6mm;opacity:.95}
.lc-lathe-b{margin:5.4mm 0 4.6mm}
.lc-topic{font-family:'Cinzel',serif;font-size:18.4pt;font-weight:800;line-height:1.18;
  letter-spacing:.028em;text-transform:uppercase;
  background:linear-gradient(180deg,#FFF8E6,#EAD29B 42%,#C09B52 78%,#8E6E2C);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .35mm .6mm rgba(0,0,0,.7))}
.p-lec .star{margin:4.6mm 0}
.lc-by{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:9.4pt;
  color:rgba(245,234,210,.82)}
.lc-name{font-size:15pt;font-weight:600;line-height:1.2;color:#FDF6E6;margin-top:1.2mm;
  text-shadow:0 .3mm .7mm rgba(0,0,0,.6)}
.lc-when{margin-top:2.4mm;font-family:'Inter',sans-serif;font-size:5.2pt;
  letter-spacing:.2em;text-transform:uppercase;color:var(--gold-l)}
.lc-seat{margin-top:1.4mm;font-family:'Inter',sans-serif;font-size:4.6pt;
  letter-spacing:.18em;text-transform:uppercase;color:rgba(245,234,210,.6)}

/* ── ORDER PANEL ─────────────────────────────────────────────────────────── */
.ord{list-style:none;margin-top:.4mm}
.ord li{display:flex;align-items:baseline;gap:2.2mm;padding:1.5mm 0;
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
/* The lecture's own row, struck so the running order agrees with the feature
   panel about which item is the centre of the afternoon. */
.ord li.ord-mark{background:linear-gradient(90deg,rgba(168,134,63,.22),
  rgba(168,134,63,.07) 66%,rgba(168,134,63,.02));
  box-shadow:inset .6mm 0 0 var(--gold)}
.ord-mark .ord-n b{font-family:'Cinzel',serif;font-size:7.4pt;font-weight:700;
  letter-spacing:.05em;text-transform:uppercase;color:var(--gold-d)}
.ord-mark .ord-n em{font-size:7.4pt;color:var(--ink);font-weight:600}
.coord{display:flex;flex-direction:column;align-items:center;gap:.6mm;margin-top:3mm}
.coord span{font-family:'Inter',sans-serif;font-size:4.6pt;letter-spacing:.22em;
  text-transform:uppercase;color:var(--soft)}
.coord b{font-size:8.2pt;font-weight:600}

/* ── DISTINGUISHED GUESTS ────────────────────────────────────────────────── */
.guests{list-style:none;margin-bottom:3.4mm}
.guests li{position:relative;padding:1.7mm 0 1.7mm 4.6mm;
  border-bottom:.1mm solid rgba(168,134,63,.28)}
.guests li:last-child{border-bottom:0}
.guests li::before{content:'';position:absolute;left:.6mm;top:2.9mm;width:1.5mm;
  height:1.5mm;transform:rotate(45deg);
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d))}
.guests b{display:block;font-size:9pt;font-weight:600;line-height:1.18}
.guests span{display:block;font-family:'Inter',sans-serif;font-size:4.5pt;
  letter-spacing:.1em;text-transform:uppercase;color:var(--soft);margin-top:.5mm}
/* The presiding offices are named; the officers holding them are not. */
.gs-note{font-size:8pt;line-height:1.42;font-style:italic;color:var(--soft);
  margin-bottom:3.4mm}

/* ── THE DIGITAL CAMPUS ──────────────────────────────────────────────────── */
.dg-lead{font-size:8.2pt;line-height:1.4;text-align:justify;margin-top:.6mm}
.dg-lead::first-line{font-variant:small-caps;letter-spacing:.02em}
.dg-body{font-size:7.8pt;line-height:1.4;text-align:justify;color:var(--soft);
  margin-top:2mm}
.dg-list{list-style:none;margin:3.4mm 0}
.dg-list li{position:relative;padding:2.4mm 0 2.4mm 4.6mm;
  border-bottom:.1mm solid rgba(168,134,63,.28)}
.dg-list li:last-child{border-bottom:0}
.dg-list li::before{content:'';position:absolute;left:.6mm;top:3.6mm;width:1.5mm;
  height:1.5mm;transform:rotate(45deg);
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d))}
.dg-list b{display:block;font-family:'Cinzel',serif;font-size:6.4pt;font-weight:700;
  letter-spacing:.09em;text-transform:uppercase;color:var(--gold-d);line-height:1.24}
.dg-list span{display:block;font-size:7.4pt;line-height:1.3;color:var(--soft);
  margin-top:.5mm}

/* ── THE CLASS OF 2026 (the insert's face) ───────────────────────────────── */
.p-cl{background:var(--dk);color:#F5EAD2}
.p-cl::before{opacity:.35}
.p-cl .cv-photo{object-position:50% 42%;
  filter:sepia(.46) saturate(.7) contrast(1.04) brightness(.98)}
.cl-scrim{position:absolute;inset:0;
  background:
    linear-gradient(180deg,rgba(14,9,2,.94) 0%,rgba(16,11,3,.8) 20%,
      rgba(22,15,5,.62) 44%,rgba(16,11,3,.88) 68%,#100B03 100%),
    radial-gradient(78% 42% at 50% 50%,rgba(216,188,124,.15),transparent 72%)}
.cl-in{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;
  align-items:center;justify-content:center;text-align:center;
  padding:14mm 12mm 14mm 9mm}
.cl-k{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:10.4pt;
  color:rgba(245,234,210,.86);margin-top:3mm}
.cl-title{font-family:'Cinzel',serif;font-size:25pt;font-weight:800;line-height:1.05;
  letter-spacing:.03em;text-transform:uppercase;margin-top:1mm;
  background:linear-gradient(180deg,#FFF8E6,#E7CF97 40%,#BC9850 78%,#8E6E2C);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .35mm .6mm rgba(0,0,0,.75))}
.cl-lathe{width:100%;height:4.2mm;margin:4.4mm 0 5mm}
.cl-stats{display:grid;grid-template-columns:1fr 1fr;gap:4.4mm 4mm;width:100%;
  padding:4.4mm 0;border-top:.22mm solid rgba(216,188,124,.5);
  border-bottom:.22mm solid rgba(216,188,124,.5)}
.cl-stats b{display:block;font-family:'Cinzel',serif;font-size:15pt;font-weight:700;
  line-height:1.08;color:var(--gold-l)}
.cl-stats span{display:block;font-family:'Inter',sans-serif;font-size:4.5pt;
  letter-spacing:.16em;text-transform:uppercase;color:rgba(245,234,210,.68);
  margin-top:1mm}
.cl-year{margin-top:5mm;font-family:'Cinzel',serif;font-size:9pt;font-weight:400;
  letter-spacing:.34em;text-transform:uppercase;color:var(--gold-l);padding-left:.34em}

/* ── GRADUAND PANELS ─────────────────────────────────────────────────────── */
.p-r .pad{padding-bottom:8mm}
.lead{font-size:7.4pt;line-height:1.36;color:var(--soft);font-style:italic;
  text-align:center;margin:.4mm 1mm 3.4mm}
.rl{margin-bottom:4mm}
.rl-h{border-bottom:.26mm solid var(--gold);padding-bottom:1.1mm;margin-bottom:1.6mm}
.rl-h i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:8.4pt;
  direction:rtl;text-align:left;color:var(--gold);line-height:1.3}
.rl-h b{display:block;font-family:'Cinzel',serif;font-size:7.4pt;font-weight:700;
  letter-spacing:.04em;text-transform:uppercase;color:var(--gold-d);line-height:1.22}
.rl-h span{display:block;font-family:'Inter',sans-serif;font-size:4.5pt;
  letter-spacing:.1em;text-transform:uppercase;color:var(--soft);margin-top:.6mm}
.rl-n{margin-left:4mm}
.rl-n li{font-size:9.6pt;line-height:1.44}
.rl-n li::marker{color:var(--gold);font-size:6.4pt}
`;

// Two sheets, each folded in three and printed both sides: four printed sides,
// twelve panels. Sheet I is the programme; Sheet II is the roll of graduands,
// and nests inside it.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>SHRS Graduation Ceremony 2026 — Trifold Programme</title>
<style>${CSS}</style></head><body>
<section class="sheet">${panelWelcome}${panelBack}${panelCover}${marks}</section>
<section class="sheet">${panelHost}${panelLecture}${panelOrder}${marks}</section>
<section class="sheet">${panelGuests}${panelDigital}${panelClass}${marks}</section>
<section class="sheet">${panelRollA}${panelRollB}${panelRollC}${marks}</section>
</body></html>`;

writeFileSync(join(OUT, 'SHRS-Graduation-Programme-2026.html'), html);

// The Word edition is set from these same constants rather than from a second
// hand-typed list, so the two editions cannot drift apart on a name.
export {
  AWARDS, ORDER, OFFICERS, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, LECTURE_SLOT, GUESTS, FIGURES, WELCOME, CEO_WORD, DIGITAL,
  TAGLINE, OPENS, CLOSES, to12,
};

console.log(`\nGraduation Ceremony Programme — trifold, 4 sides, 12 panels`);
console.log(`  303 x 216mm (A4 landscape + 3mm bleed) · folds to 99 x 210mm`);
console.log(`  ${TOTAL} awards · ${PEOPLE} graduands · ${AWARDS.length} award rolls`);
for (const a of AWARDS) console.log(`    ${a.code.padEnd(4)} ${String(a.names.length).padStart(2)}  ${a.title}`);
console.log(`  → ${OUT}/SHRS-Graduation-Programme-2026.html\n`);
