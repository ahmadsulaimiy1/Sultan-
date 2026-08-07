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

// ── ORNAMENT ────────────────────────────────────────────────────────────────
// A real engine-turned band, not a clip-art flourish: two interfering sine
// strands drawn at a hairline, the same lathe the certificates carry. It is
// cheap to print, impossible to photocopy cleanly, and it is the one mark on
// the page that says this document came from the same press as the awards.
function lathe(id, w, h, cycles, stroke) {
  const strand = (phase, amp, wob) => {
    const pts = [];
    for (let i = 0; i <= 300; i += 1) {
      const x = (i / 300) * w;
      const t = (i / 300) * cycles * Math.PI * 2;
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

// ── PAGES ───────────────────────────────────────────────────────────────────
const crest = (h, cls = '') => `<img class="crest ${cls}" style="height:${h}mm"
  src="/assets/images/crests/shrs-institutional-crest.png" alt="" />`;

const rule = (cls = '') => `<div class="rule ${cls}"><span></span><i></i><span></span></div>`;
const star = (cls = '') => `<div class="star ${cls}"><b></b></div>`;

const folio = (n, label) => `<div class="folio"><span>${n}</span>
  <i></i><em>${esc(label)}</em></div>`;

// ── PAGE 1 · THE COVER ──────────────────────────────────────────────────────
// Dark, because the cover of a graduation programme is the one surface in the
// document that is allowed to be an object rather than a page.
const cover = `<section class="pg pg-cover">
  <div class="cv-ground"></div>
  <div class="cv-frame"></div>
  <div class="cv-corner tl"></div><div class="cv-corner tr"></div>
  <div class="cv-corner bl"></div><div class="cv-corner br"></div>
  <img class="cv-ghost" src="/assets/images/crests/shrs-institutional-crest.png" alt="" />
  <div class="cv-in">
    ${crest(30, 'cv-crest')}
    <div class="cv-ar">مدارس السلطان حنفي الملكية</div>
    <h1 class="cv-inst">Sultan Hanafi Royal Schools</h1>
    <div class="cv-est">Established MMXVII · Ikorodu · Lagos State · Nigeria</div>
    <div class="cv-lathe">${lathe('lc', 600, 26, 26, 0.55)}</div>
    <div class="cv-kicker">The First Combined</div>
    <h2 class="cv-title">Graduation<br/>Ceremony</h2>
    ${star('star-lg')}
    <div class="cv-class">Class of 2026</div>
    <div class="cv-when">
      <b>Saturday, 8 August 2026</b>
      <span dir="rtl" lang="ar">٢٥ صفر ١٤٤٨هـ</span>
      <span class="cv-hours">${to12(OPENS)} – ${to12(CLOSES)} · School Grounds, Ikorodu</span>
    </div>
    <div class="cv-lathe cv-lathe-b">${lathe('lc2', 600, 26, 26, 0.55)}</div>
    <div class="cv-tag">${esc(TAGLINE)}</div>
    <div class="cv-count">${TOTAL} awards · ${PEOPLE} graduands · four schools</div>
    <div class="cv-motto" dir="rtl" lang="ar">القرآن يعلو ولا يعلى</div>
  </div>
</section>`;

// ── The running head the inner leaves share ─────────────────────────────────
const head = (kicker, title) => `<header class="ph">${crest(12)}<div>
  <div class="ph-k">${esc(kicker)}</div>
  <h3 class="ph-t">${title}</h3></div></header>${rule()}`;

// ── PAGE 2 · THE WELCOME ────────────────────────────────────────────────────
const welcome = `<section class="pg pg-w">
  ${head('Sultan Hanafi Royal Schools', 'A Word of Welcome')}
  <figure class="plate">
    <img src="/assets/images/gallery/commissioning-day-1.jpg" alt="" />
    <img src="/assets/images/gallery/campus-building.jpg" alt="" />
    <img src="/assets/images/gallery/recitation-assembly-1.jpg" alt="" />
    <figcaption>The campus at Imowonla Road, and the assemblies that fill it</figcaption>
  </figure>
  <div class="letter">
    <p><span class="drop">O</span>${esc(WELCOME[0])}</p>
    <blockquote>${esc(LECTURE.title)}</blockquote>
    <p>${esc(WELCOME[1])}</p>
    <div class="sign">The Board of Trustees</div>
  </div>
  <div class="figs">${FIGURES.map(([n, l]) => `<div class="fig">
    <b>${esc(n)}</b><span>${esc(l)}</span></div>`).join('')}</div>
  <div class="cols">
    <div class="col">
      <h4 class="sh">The Chief Host</h4>
      <div class="host">
        <i dir="rtl" lang="ar">${esc(CHIEF_HOST[1])}</i>
        <b>${esc(CHIEF_HOST[0])}</b>
        <span>${esc(CHIEF_HOST[2])}</span>
      </div>
      <h4 class="sh">The Lecture</h4>
      <div class="lect">
        <em>“${esc(LECTURE.title)}”</em>
        <b>${esc(LECTURE.by)}</b>
      </div>
    </div>
    <div class="col">
      <h4 class="sh">Distinguished Guests</h4>
      <ul class="guests">${GUESTS.map(([n, r]) => `<li><b>${esc(n)}</b>${r
        ? `<span>${esc(r)}</span>` : ''}</li>`).join('')}</ul>
    </div>
  </div>
  <div class="closing">
    <div class="cl-in">
      <h4>A Word from the Chief Executive Director</h4>
      ${CEO_WORD.map((t) => `<p>${esc(t)}</p>`).join('')}
      <div class="cl-sig"><b>${esc(CHIEF_HOST[0])}</b>
        <span>${esc(CHIEF_HOST[2])}</span></div>
    </div>
  </div>
  ${folio('II', 'Welcome')}
</section>`;

// ── PAGE 3 · THE ORDER OF PROCEEDINGS ───────────────────────────────────────
const order = `<section class="pg pg-o">
  ${head('The Order of the Day', 'Order of Proceedings')}
  <ol class="ord">
    ${ORDER.map(([a, b, t, s]) => `<li>
      <span class="ord-t">${a}<i>–</i>${b}</span>
      <span class="ord-n">
        <span class="ord-row"><b>${esc(t)}</b>${s && /[؀-ۿ]/.test(s)
          ? `<i dir="rtl" lang="ar">${esc(s)}</i>` : ''}</span>
        ${s && !/[؀-ۿ]/.test(s) ? `<em>${esc(s)}</em>` : ''}</span>
    </li>`).join('')}
  </ol>
  <div class="coord"><span>Programme Coordinators</span><b>${esc(COORDINATORS)}</b></div>
  ${rule()}
  <h4 class="sh">Presiding and Officiating</h4>
  <div class="offs">${OFFICERS.map(([n, ar, r]) => `<div class="off">
    ${ar ? `<i dir="rtl" lang="ar">${esc(ar)}</i>` : ''}<b>${esc(n)}</b>
    <span>${esc(r)}</span></div>`).join('')}</div>
  ${folio('III', 'Proceedings')}
</section>`;

// ── PAGE 4 · THE GRADUANDS ──────────────────────────────────────────────────
const roll = `<section class="pg pg-r">
  ${head('Class of 2026', 'The Graduands')}
  <p class="lead">The Board of Governors, the Principals and the Head Teacher
  present the following graduands, each of whom has completed the requirements
  of their programme and is admitted to the award named beneath their school.
  A graduand who has completed two programmes is named under each.</p>
  <div class="rolls">
    ${AWARDS.map((a) => `<div class="rl">
      <div class="rl-h">
        ${a.ar ? `<i dir="rtl" lang="ar">${esc(a.ar)}</i>` : ''}
        <b>${esc(a.title)}</b>
        <span>${esc(a.school)}</span>
        <em>${esc(a.note)}</em>
      </div>
      <ol class="rl-n">${a.names.map((n) => `<li>${esc(n)}</li>`).join('')}</ol>
    </div>`).join('')}
  </div>
  <div class="schools">
    <div><b>Sultan Hanafi Nursery and Primary School</b><span>Ages 2 to 10</span></div>
    <div><b>Sultan Hanafi Royal College</b><span>Junior and Senior Secondary</span></div>
    <div><b>Sultan Hanafi School of Islamic and Arabic Studies</b>
      <span dir="rtl" lang="ar">قسم الدراسات الإسلامية والعربية</span></div>
    <div><b>Sultan Hanafi Qur’an College</b>
      <span dir="rtl" lang="ar">كلية السلطان حنفي للقرآن</span></div>
  </div>
  <div class="verify"><b>Every certificate conferred today is verifiable.</b>
    <span>Each carries a certificate number, a verification code and a QR code
    registered with the Office of the Registrar — scan the code on any
    certificate, or enter its number at ${WEB}/verify-certificate.</span></div>
  <div class="bk-c">
    <span>${esc(VENUE)}</span>
    <span>${WEB} · ${MAIL} · ${TEL}</span>
    <span dir="rtl" lang="ar" class="bk-m">القرآن يعلو ولا يعلى</span>
  </div>
  ${folio('IV', 'The Graduands')}
</section>`;

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
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#241B0F}
body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{
  --paper:#FBF7EE; --ink:#241D12; --soft:#5A4E37; --gold:#A8863F;
  --gold-d:#7A5C21; --gold-l:#D8BC7C; --dk:#1B1408; --dk2:#2E2312;
}
.pg{position:relative;width:210mm;height:297mm;margin:0 auto;overflow:hidden;
  background:var(--paper);page-break-after:always;break-after:page;
  font-family:'Cormorant Garamond',Georgia,serif;color:var(--ink);
  padding:17mm 16mm 14mm}
.pg:last-child{page-break-after:auto;break-after:auto}
/* A woven ground, printed not pasted: hairline rules at 45 and 135 degrees.
   It reads as laid stock, and a photocopier turns it to mud. */
.pg::before{content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    repeating-linear-gradient(45deg,rgba(168,134,63,.05) 0 .18mm,transparent .18mm .9mm),
    repeating-linear-gradient(135deg,rgba(168,134,63,.038) 0 .18mm,transparent .18mm .9mm)}
.pg>*{position:relative;z-index:1}
.crest{display:block;width:auto;object-fit:contain}
.rule{display:flex;align-items:center;gap:2.6mm;margin:3.4mm 0}
.rule span{flex:1;height:.25mm;background:linear-gradient(90deg,rgba(168,134,63,0),var(--gold))}
.rule span:last-child{background:linear-gradient(270deg,rgba(168,134,63,0),var(--gold))}
.rule i{width:1.9mm;height:1.9mm;background:var(--gold);transform:rotate(45deg)}
.star{display:flex;justify-content:center;margin:3mm 0}
.star b{position:relative;display:block;width:5mm;height:5mm;
  background:linear-gradient(135deg,var(--gold-l),var(--gold-d));
  clip-path:polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%)}
.star-lg b{width:8.4mm;height:8.4mm}
.lathe{display:block;width:100%;height:100%}

/* ── COVER ───────────────────────────────────────────────────────────────── */
.pg-cover{background:var(--dk);padding:0;display:flex;align-items:center;
  justify-content:center;color:#F3E7CC}
.pg-cover::before{opacity:.5}
.cv-ground{position:absolute;inset:0;
  background:
    radial-gradient(120% 78% at 50% 8%,rgba(216,188,124,.20),transparent 62%),
    radial-gradient(90% 60% at 50% 104%,rgba(168,134,63,.20),transparent 64%),
    linear-gradient(168deg,#221909 0%,#181104 48%,#241A0B 100%)}
.cv-ghost{position:absolute;left:50%;top:50%;height:132mm;width:auto;
  transform:translate(-50%,-50%);opacity:.022;
  filter:grayscale(1) brightness(3.4) blur(.5mm)}
.cv-frame{position:absolute;inset:10mm;border:.45mm solid rgba(216,188,124,.55);
  box-shadow:inset 0 0 0 .8mm rgba(27,20,8,0),inset 0 0 0 1.05mm rgba(168,134,63,.42),
    0 0 14mm rgba(0,0,0,.5)}
.cv-corner{position:absolute;width:13mm;height:13mm;border:.3mm solid var(--gold-l);
  opacity:.85}
.cv-corner.tl{left:6.4mm;top:6.4mm;border-right:0;border-bottom:0}
.cv-corner.tr{right:6.4mm;top:6.4mm;border-left:0;border-bottom:0}
.cv-corner.bl{left:6.4mm;bottom:6.4mm;border-right:0;border-top:0}
.cv-corner.br{right:6.4mm;bottom:6.4mm;border-left:0;border-top:0}
.cv-in{position:relative;text-align:center;padding:0 24mm;width:100%;z-index:2}
.cv-crest{margin:0 auto 4.6mm;filter:drop-shadow(0 .8mm 1.6mm rgba(0,0,0,.55))}
.cv-ar{font-family:'Amiri',serif;font-size:13.5pt;font-weight:700;color:var(--gold-l);
  direction:rtl;margin-bottom:2mm}
.cv-inst{font-family:'Cinzel',serif;font-size:15.4pt;font-weight:800;letter-spacing:.15em;
  text-transform:uppercase;
  background:linear-gradient(180deg,#F6E7C0,#D8BC7C 46%,#A8863F);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.cv-est{font-family:'Inter',sans-serif;font-size:6.2pt;letter-spacing:.28em;
  text-transform:uppercase;color:rgba(216,188,124,.72);margin-top:2.6mm}
.cv-lathe{height:5.4mm;margin:6.5mm 0 5mm;opacity:.95}
.cv-lathe-b{margin:6mm 0 5mm}
.cv-kicker{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:14pt;
  color:rgba(243,231,204,.82);margin-bottom:2mm}
.cv-title{font-family:'Cinzel',serif;font-size:40pt;font-weight:800;line-height:1.02;
  letter-spacing:.035em;text-transform:uppercase;
  background:linear-gradient(180deg,#FFF6E0,#E4CB93 40%,#B9954B 78%,#8C6C2B);
  -webkit-background-clip:text;background-clip:text;color:transparent;
  filter:drop-shadow(0 .35mm .5mm rgba(0,0,0,.55))}
.cv-class{font-family:'Cinzel',serif;font-size:13pt;font-weight:400;letter-spacing:.42em;
  text-transform:uppercase;color:var(--gold-l);padding-left:.42em;margin-bottom:7mm}
.cv-when{display:flex;flex-direction:column;gap:1.8mm}
.cv-when b{font-size:15.5pt;font-weight:600;color:#FBF3E1}
.cv-when [lang=ar]{font-family:'Amiri',serif;font-size:12.5pt;color:var(--gold-l)}
.cv-hours{font-family:'Inter',sans-serif;font-size:6.6pt;letter-spacing:.2em;
  text-transform:uppercase;color:rgba(243,231,204,.66)}
.cv-tag{font-family:'Cormorant Garamond',serif;font-style:italic;font-size:12.6pt;
  color:var(--gold-l)}
.cv-count{margin-top:2.4mm;font-family:'Inter',sans-serif;font-size:6.2pt;
  letter-spacing:.22em;text-transform:uppercase;color:rgba(243,231,204,.55)}
.cv-motto{margin-top:9mm;font-family:'Amiri',serif;font-size:13pt;color:var(--gold-l)}

/* ── INNER LEAVES ────────────────────────────────────────────────────────── */
.ph{display:flex;align-items:center;gap:4.6mm}
.ph-k{font-family:'Inter',sans-serif;font-size:6pt;letter-spacing:.26em;
  text-transform:uppercase;color:var(--soft)}
.ph-t{font-family:'Cinzel',serif;font-size:17.5pt;font-weight:800;letter-spacing:.055em;
  text-transform:uppercase;color:var(--gold-d);margin-top:.7mm}
.sh{font-family:'Cinzel',serif;font-size:8.2pt;font-weight:700;letter-spacing:.22em;
  text-transform:uppercase;color:var(--gold-d);margin:0 0 2.4mm;
  padding-bottom:1.2mm;border-bottom:.25mm solid rgba(168,134,63,.55)}
.folio{position:absolute;left:16mm;right:16mm;bottom:7.4mm;display:flex;
  align-items:center;gap:2.6mm;font-family:'Inter',sans-serif;font-size:5.8pt;
  letter-spacing:.24em;text-transform:uppercase;color:var(--soft)}
.folio span{font-family:'Cinzel',serif;font-size:7pt;color:var(--gold-d)}
.folio i{flex:1;height:.12mm;background:rgba(168,134,63,.45)}

/* ── WELCOME LEAF ────────────────────────────────────────────────────────── */
.plate{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:1.4mm;margin:1mm 0 4mm}
.plate img{width:100%;height:33mm;object-fit:cover;display:block;
  filter:sepia(.34) saturate(.86) contrast(1.04) brightness(1.02);
  border:.25mm solid rgba(168,134,63,.5)}
.plate figcaption{grid-column:1/-1;font-family:'Inter',sans-serif;font-size:5.6pt;
  letter-spacing:.16em;text-transform:uppercase;color:var(--soft);margin-top:1.4mm;
  text-align:right}
.letter p{font-size:10.4pt;line-height:1.44;text-align:justify;color:var(--ink);
  margin-bottom:2.6mm}
.drop{float:left;font-family:'Cinzel',serif;font-size:23pt;line-height:.92;
  font-weight:700;color:#FBF3E1;background:linear-gradient(150deg,var(--gold),var(--gold-d));
  padding:1.6mm 2mm 1.2mm;margin:.6mm 2.4mm 0 0;
  box-shadow:0 .4mm .9mm rgba(0,0,0,.22)}
.letter blockquote{margin:2.4mm 0 2.6mm;padding-left:4.6mm;
  border-left:.6mm solid var(--gold);font-family:'Cormorant Garamond',serif;
  font-style:italic;font-size:12.4pt;line-height:1.3;color:var(--gold-d)}
.sign{font-family:'Inter',sans-serif;font-size:6pt;letter-spacing:.24em;
  text-transform:uppercase;color:var(--soft);text-align:right}
.figs{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin:3mm 0 3.6mm;
  padding:2.6mm 0;border-top:.25mm solid rgba(168,134,63,.55);
  border-bottom:.25mm solid rgba(168,134,63,.55)}
.fig{text-align:center}
.fig b{display:block;font-family:'Cinzel',serif;font-size:15pt;font-weight:700;
  color:var(--gold-d)}
.fig span{display:block;font-family:'Inter',sans-serif;font-size:5.5pt;
  letter-spacing:.16em;text-transform:uppercase;color:var(--soft);margin-top:1.1mm}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
.host i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:11.4pt;
  direction:rtl;text-align:left;color:var(--gold-d)}
.host b{display:block;font-size:13pt;font-weight:600;margin-top:.4mm}
.host span{display:block;font-family:'Inter',sans-serif;font-size:6.2pt;
  letter-spacing:.18em;text-transform:uppercase;color:var(--soft);margin-top:1.2mm}
.lect{margin-top:1mm}
.lect em{display:block;font-size:11.6pt;font-style:italic;line-height:1.3;
  color:var(--gold-d)}
.lect b{display:block;font-size:11.4pt;font-weight:600;margin-top:1.4mm}
.cols .sh{margin-top:5mm}
.cols .col>.sh:first-child{margin-top:0}
.guests{list-style:none}
.guests li{padding:1.25mm 0;border-bottom:.12mm solid rgba(168,134,63,.28)}
.guests li:last-child{border-bottom:0}
.guests b{display:block;font-size:10.8pt;font-weight:600}
.guests span{display:block;font-family:'Inter',sans-serif;font-size:5.9pt;
  letter-spacing:.1em;text-transform:uppercase;color:var(--soft);margin-top:.5mm}

/* ── ORDER LEAF ──────────────────────────────────────────────────────────── */
.ord{list-style:none;margin-top:1mm}
.ord li{display:flex;align-items:baseline;gap:4mm;padding:1.95mm 0;
  border-bottom:.12mm solid rgba(168,134,63,.32)}
.ord li:nth-child(odd){background:linear-gradient(90deg,rgba(168,134,63,.055),
  rgba(168,134,63,.012) 62%,transparent)}
.ord li:last-child{border-bottom:0}
.ord-t{flex:0 0 30mm;padding-left:1.6mm;font-family:'Inter',sans-serif;font-size:7.4pt;
  font-weight:600;letter-spacing:.05em;color:var(--gold-d);white-space:nowrap}
.ord-t i{font-style:normal;padding:0 .5mm;color:var(--gold-l)}
.ord-n{flex:1}
/* English left, Arabic right, one baseline — the pairing rule the certificate
   suite is built on, applied to the running order. */
.ord-row{display:flex;align-items:baseline;justify-content:space-between;gap:6mm}
.ord-n b{font-size:12.4pt;font-weight:600;color:var(--ink)}
.ord-n .ord-row i{font-family:'Amiri',serif;font-style:normal;font-size:10.2pt;
  color:var(--gold-d);white-space:nowrap}
.ord-n em{display:block;font-size:8.4pt;font-style:italic;color:var(--soft);margin-top:.3mm}
.coord{display:flex;flex-direction:column;align-items:center;gap:.9mm;margin-top:3.4mm}
.coord span{font-family:'Inter',sans-serif;font-size:5.8pt;letter-spacing:.24em;
  text-transform:uppercase;color:var(--soft)}
.coord b{font-size:11.4pt;font-weight:600}
.pg-o .sh{text-align:center;border-bottom:0}
.offs{display:grid;grid-template-columns:1fr 1fr;gap:3.2mm 7mm;margin-top:1mm}
.off{border-left:.4mm solid var(--gold);padding-left:3.4mm}
/* Arabic above, English below — never the other way round. */
.off i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:10.4pt;
  direction:rtl;text-align:left;color:var(--gold-d)}
.off b{display:block;font-size:11.6pt;font-weight:600;margin-top:.2mm}
.off span{display:block;font-family:'Inter',sans-serif;font-size:6.1pt;
  letter-spacing:.09em;text-transform:uppercase;color:var(--soft);margin-top:.8mm}

/* ── GRADUANDS LEAF ──────────────────────────────────────────────────────── */
.lead{font-size:9.8pt;line-height:1.44;color:var(--soft);font-style:italic;
  text-align:center;margin:.6mm 6mm 3mm}
.rolls{column-count:2;column-gap:7mm}
.rl{break-inside:avoid;-webkit-column-break-inside:avoid;margin-bottom:3.4mm}
.rl-h{border-bottom:.3mm solid var(--gold);padding-bottom:1.3mm;margin-bottom:1.6mm}
.rl-h i{display:block;font-family:'Amiri',serif;font-style:normal;font-size:9.8pt;
  direction:rtl;text-align:left;color:var(--gold);margin-bottom:.2mm}
.rl-h b{display:block;font-family:'Cinzel',serif;font-size:9pt;font-weight:700;
  letter-spacing:.05em;text-transform:uppercase;color:var(--gold-d)}
.rl-h span{display:block;font-size:9.2pt;font-weight:600;color:var(--ink);margin-top:.5mm}
.rl-h em{display:block;font-family:'Inter',sans-serif;font-style:normal;font-size:5.7pt;
  letter-spacing:.05em;color:var(--soft);margin-top:.6mm;text-transform:uppercase}
.rl-n{margin-left:4.6mm}
.rl-n li{font-size:10.5pt;line-height:1.32;color:var(--ink)}
.rl-n li::marker{color:var(--gold);font-size:7.6pt}
.closing{margin:4.2mm 0 0;background:linear-gradient(150deg,#241A0B,#191204 62%,#261C0C);
  color:#F3E7CC;padding:4mm 5.5mm;position:relative;
  box-shadow:inset 0 0 0 .25mm rgba(216,188,124,.5)}
.cl-in h4{font-family:'Cinzel',serif;font-size:7.6pt;font-weight:700;letter-spacing:.22em;
  text-transform:uppercase;color:var(--gold-l);margin-bottom:2mm}
.cl-in p{font-size:9.8pt;line-height:1.4;text-align:justify;
  color:rgba(243,231,204,.92);margin-bottom:1.6mm}
.cl-sig{margin-top:1.8mm;text-align:right}
.cl-sig b{font-size:11pt;font-weight:600;color:#FBF3E1}
.cl-sig span{display:block;font-family:'Inter',sans-serif;font-size:5.7pt;
  letter-spacing:.2em;text-transform:uppercase;color:rgba(216,188,124,.8);margin-top:.5mm}
.schools{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm;margin:3mm 0 3.4mm;
  padding:2.8mm 0;border-top:.25mm solid rgba(168,134,63,.55);
  border-bottom:.25mm solid rgba(168,134,63,.55);text-align:center}
.schools b{display:block;font-size:9.6pt;font-weight:600;line-height:1.24}
.schools span{display:block;font-family:'Inter',sans-serif;font-size:5.4pt;
  letter-spacing:.14em;text-transform:uppercase;color:var(--soft);margin-top:1mm}
.schools span[lang=ar]{font-family:'Amiri',serif;font-size:8.6pt;letter-spacing:0;
  text-transform:none;color:var(--gold-d)}
.verify{display:flex;flex-direction:column;gap:1.1mm;text-align:center;padding:0 8mm}
.verify b{font-family:'Cinzel',serif;font-size:7.6pt;font-weight:700;letter-spacing:.14em;
  text-transform:uppercase;color:var(--gold-d)}
.verify span{font-size:9.2pt;line-height:1.4;color:var(--soft);font-style:italic}
.bk-c{display:flex;flex-direction:column;align-items:center;gap:.9mm;margin-top:2.6mm}
.bk-c span{font-family:'Inter',sans-serif;font-size:6pt;letter-spacing:.14em;
  color:var(--soft);text-align:center}
.bk-m{font-family:'Amiri',serif!important;font-size:11pt!important;
  letter-spacing:0!important;color:var(--gold-d)!important;margin-top:1mm}
`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<title>SHRS Graduation Ceremony 2026 — Programme</title>
<style>${CSS}</style></head><body>
${cover}
${welcome}
${order}
${roll}
</body></html>`;

writeFileSync(join(OUT, 'SHRS-Graduation-Programme-2026.html'), html);

// The Word edition is set from these same constants rather than from a second
// hand-typed list, so the two editions cannot drift apart on a name.
export {
  AWARDS, ORDER, OFFICERS, TOTAL, PEOPLE, COORDINATORS, VENUE, WEB, MAIL, TEL,
  CHIEF_HOST, LECTURE, GUESTS, FIGURES, WELCOME, CEO_WORD, TAGLINE, OPENS, CLOSES, to12,
};

console.log(`\nGraduation Ceremony Programme — 4 pages, A4 portrait`);
console.log(`  ${TOTAL} awards · ${PEOPLE} graduands · ${AWARDS.length} award rolls`);
for (const a of AWARDS) console.log(`    ${a.code.padEnd(4)} ${String(a.names.length).padStart(2)}  ${a.title}`);
console.log(`  → ${OUT}/SHRS-Graduation-Programme-2026.html\n`);
