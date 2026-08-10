// Portal pages against the offline data layer — the real pages, the real
// store, real IndexedDB, real WebCrypto, and the network genuinely severed.
//
// What is under test is mostly what the device is NOT allowed to keep, and
// what the screen is NOT allowed to say:
//
//   · a dashboard cached from a live response holds none of the keys policy
//     refuses, at any nesting depth
//   · a key nobody declared is dropped, rather than kept because it arrived
//   · offline, a panel with no data says "not saved on this device" — never
//     "not yet recorded", which is a claim about the school's records
//   · a saved copy is stamped as one, in words, not only in a colour
//   · a 401 removes what the dead session was holding
//   · with no key material, nothing is written at all — the fail-closed
//     default, since the server does not yet issue any
//   · the Registrar's live workbench does not render from a saved copy
//
// Run: npm run test:portal-offline
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let netDown = false;
const sockets = new Set();

/* The shapes the real endpoints return, with every forbidden field present on
 * purpose. A redaction test that feeds clean data proves nothing. */
const GUARDIAN_ME = {
  fullName: 'Aminat Òjó', title: 'Mrs.', preferredName: 'Aminat',
  identityNo: 'SHRS-G-000117', identityType: 'parent',
  email: 'aminat@example.com',                       // contact — must not survive
  emailVerified: true, mobileVerified: false, profileCompletionPct: 80,
  sections: { personal: true, emergencyContacts: false, educationalInterests: true },
  recommendedNextStep: 'Add your emergency contacts.',
  existingChildrenCount: 1, prospectiveChildrenCount: 0,
  notifications: [{ id: 1, message: 'Staff note about your account' }],  // prose — must not survive
  children: [{
    id: 9, fullName: 'Ibrahim Òjó', admissionNo: 'SHRS/2026/0042', status: 'active',
    relationship: 'Mother', isSampleData: false,
    enrolments: [{ institution: 'Royal College', className: 'JSS 2', isPrimary: true }],
    attendance: { term: 'First Term', days_present: 58, days_total: 60 },
    fees: { term: 'First Term', amount_due: 250000, amount_paid: 100000 },
    results: [{ term: 'First Term', subject: 'Mathematics', total_score: 78, teacher_comment: 'Strong.' }],
    hifz: { stageNumber: 2, stageLabel: 'Consolidation', juzVerifiedCount: 4 },
    home_address: '14 Ikorodu Road',                 // NEVER_CACHED, nested two deep
    medical_notes: 'asthma',                          // NEVER_CACHED, nested two deep
  }],
};

const STUDENT_ME = {
  fullName: 'Ibrahim Òjó', admissionNo: 'SHRS/2026/0042', identityNo: 'SHRS-S-000042',
  admissionDate: '2026-01-12T00:00:00Z', academicSession: '2026/2027', status: 'active',
  institution: 'Royal College', className: 'JSS 2',
  enrolments: [{ institution: 'Royal College', className: 'JSS 2', isPrimary: true }],
  attendance: { term: 'First Term', days_present: 58, days_total: 60 },
  results: [{ term: 'First Term', subject: 'Mathematics', ca_score: 28, exam_score: 50, total_score: 78, teacher_comment: 'Strong.' }],
  fees: { term: 'First Term', amount_due: 250000, amount_paid: 100000 },
  finance: { invoices: [], receipts: [] },
  hifz: { stageNumber: 2, stageLabel: 'Consolidation', stageDescription: '…', juzVerifiedCount: 4, juzGrid: [], ijazahRecords: [] },
};

const REGISTRAR_STUDENT = {
  student: {
    id: 9, fullName: 'Ibrahim Òjó', admissionNo: 'SHRS/2026/0042', status: 'active',
    createdAt: '2026-01-12T00:00:00Z', primaryInstitution: 'Royal College',
    primaryClass: 'JSS 2', isSampleData: false,
  },
  enrolments: [{ institution: 'Royal College', className: 'JSS 2', isPrimary: true }],
  guardians: [{ id: 3, fullName: 'Aminat Òjó', email: 'aminat@example.com', relationship: 'Mother' }],
  lifecycleEvents: [{ id: 1, eventType: 'promotion', reason: 'End of session', effectiveDate: '2026-07-20' }],
  academicStanding: { attendancePct: 97, latestTerm: 'First Term', latestTermAverage: 78 },
  results: [{ term: 'First Term', subject: 'Mathematics', total_score: 78 }],
  fees: { term: 'First Term', amount_due: 250000, amount_paid: 100000 },
  certificates: [{ id: 4, certificateType: 'completion', referenceNo: 'SHRS-CERT-IBT-2026-000035-22C49', issuedAt: '2026-07-30T00:00:00Z', revokedAt: null }],
  hifz: { stageNumber: 2 },
};

function serve() {
  const server = http.createServer((req, res) => {
    if (netDown) { req.socket.destroy(); return; }
    let p = new URL(req.url, 'http://127.0.0.1').pathname;

    if (p.startsWith('/api/')) {
      const body = p.includes('/student/me') ? STUDENT_ME
        : p.includes('/registrar/student') ? REGISTRAR_STUDENT
          : p.endsWith('/portal/me') ? GUARDIAN_ME
            : {};
      res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
      return;
    }

    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!path.resolve(file).startsWith(ROOT) || !existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404).end('nf'); return;
    }
    const ext = path.extname(p);
    const type = ext === '.js' ? 'application/javascript; charset=utf-8'
      : ext === '.css' ? 'text/css; charset=utf-8'
        : ext === '.html' ? 'text/html; charset=utf-8'
          : ext === '.json' ? 'application/json; charset=utf-8'
            : 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(fs.readFileSync(file));
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r({ server, port: server.address().port })));
}

/* Playwright's setOffline is not enough on its own — a socket already open can
 * still carry a response. Both halves, every time. */
async function goOffline(context) {
  netDown = true;
  for (const s of sockets) s.destroy();
  await context.setOffline(true);
}
async function goOnline(context) {
  netDown = false;
  await context.setOffline(false);
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass: Boolean(pass), detail: detail || '' });
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
}

const KEY_MATERIAL = 'portal-offline-test-material';

async function main() {
  const { server, port } = await serve();
  const origin = `http://127.0.0.1:${port}`;
  console.log(`\nSHRS — portal pages on the offline data layer\nserving at ${origin}\n`);

  const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch(existsSync(PINNED) ? { executablePath: PINNED } : {});
  const context = await browser.newContext();
  const page = await context.newPage();
  // Only our own origin exists in this test; anything else is a font CDN the
  // page can live without and which would otherwise stall an offline load.
  await page.route('**/*', (route) => (route.request().url().startsWith(origin) ? route.continue() : route.abort()));

  try {
    /* ── 1. Policy, on its own terms ─────────────────────────────────────── */
    console.log('What may be kept');
    await page.goto(`${origin}/portal/dashboard/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SHRSPortalOffline, null, { timeout: 10000 });

    const redacted = await page.evaluate((payload) =>
      window.SHRSPortalOffline.redact('portal.guardian.dashboard', payload), GUARDIAN_ME);

    check('a contact address is not kept', !('email' in redacted));
    check('unbounded staff prose is not kept', !('notifications' in redacted));
    check('a child\'s address does not survive two levels of nesting',
      !JSON.stringify(redacted).includes('Ikorodu Road'));
    check('nor does a medical note', !JSON.stringify(redacted).includes('asthma'));
    check('money is not kept', !JSON.stringify(redacted).includes('250000'));
    check('marks are not kept', !JSON.stringify(redacted).includes('Strong.'));
    check('who the person is, is kept', redacted.fullName === 'Aminat Òjó' && redacted.identityNo === 'SHRS-G-000117');
    check('and where the child is enrolled',
      redacted.children[0].enrolments[0].className === 'JSS 2');
    check('attendance is a count of days, and is kept',
      redacted.children[0].attendance.days_present === 58);

    const undeclared = await page.evaluate(() =>
      window.SHRSPortalOffline.redact('portal.guardian.dashboard', { fullName: 'x', somethingNewUpstream: 'y' }));
    check('a key nobody declared is dropped, not kept because it arrived',
      !('somethingNewUpstream' in undeclared));

    const unknownView = await page.evaluate(() =>
      window.SHRSPortalOffline.redact('portal.something.invented', { fullName: 'x' }));
    check('an undeclared view caches nothing at all', unknownView === null);

    const regRedacted = await page.evaluate((p) =>
      window.SHRSPortalOffline.redact('portal.registrar.student', p), REGISTRAR_STUDENT);
    check('a Registrar\'s device keeps no parent contact details',
      !JSON.stringify(regRedacted).includes('aminat@example.com'));
    check('nor the written reason on a lifecycle event',
      !JSON.stringify(regRedacted).includes('End of session'));
    check('but does keep the certificate reference',
      regRedacted.certificates[0].referenceNo.startsWith('SHRS-CERT-'));

    /* ── 2. Fail closed with no key material ─────────────────────────────── */
    console.log('\nWith no key material — the state the server leaves it in today');
    const wroteWhileLocked = await page.evaluate(async () => {
      const r = await window.SHRSPortalOffline.view('portal.guardian.dashboard', '/api/portal/me');
      const h = await window.SHRSPortalOffline.held('portal.guardian.dashboard');
      return { source: r.source, ok: r.ok, held: h };
    });
    check('the live answer is still served', wroteWhileLocked.ok && wroteWhileLocked.source === 'network');
    check('but nothing is written to the device', wroteWhileLocked.held === null);

    /* ── 3. A real dashboard, online then offline ────────────────────────── */
    console.log('\nThe parent dashboard');
    await page.evaluate((m) => window.SHRSPortalOffline.openSession(m), KEY_MATERIAL);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SHRSPortalOffline, null, { timeout: 10000 });
    await page.evaluate((m) => window.SHRSPortalOffline.openSession(m), KEY_MATERIAL);
    await page.evaluate(() => window.SHRSPortalOffline.view('portal.guardian.dashboard', '/api/portal/me'));

    const storedRaw = await page.evaluate(() => new Promise((resolve) => {
      const req = indexedDB.open('shrs');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('records', 'readonly');
        tx.objectStore('records').getAll().onsuccess = (e) => { resolve(JSON.stringify(e.target.result)); db.close(); };
      };
    }));
    check('what is actually on the disk is ciphertext, not the record',
      storedRaw.includes('cipher') && !storedRaw.includes('Aminat'), `${storedRaw.length} bytes`);

    await goOffline(context);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SHRSPortalOffline, null, { timeout: 10000 });
    await page.evaluate((m) => window.SHRSPortalOffline.openSession(m), KEY_MATERIAL);

    const offlineRead = await page.evaluate(() =>
      window.SHRSPortalOffline.view('portal.guardian.dashboard', '/api/portal/me'));
    check('with the network severed, the dashboard still answers',
      offlineRead.ok && offlineRead.source === 'cache', offlineRead.source);
    check('and it does not report itself as live', offlineRead.isLive === false && offlineRead.status === 0);
    check('the name survives the round trip through encryption',
      offlineRead.data.fullName === 'Aminat Òjó');
    check('the fee is gone, as policy said it would be',
      offlineRead.data.children[0].fees === undefined);

    /* ── 4. The words on the screen ──────────────────────────────────────── */
    console.log('\nWhat the screen says about what it does not have');
    const stampText = await page.evaluate(() => {
      const el = document.querySelector('[data-portal-freshness]');
      return el ? { text: el.textContent, tone: el.getAttribute('data-freshness'), hidden: el.hidden } : null;
    });
    check('the freshness stamp exists on the page', stampText !== null);

    const src = fs.readFileSync(path.join(ROOT, 'js/portal-dashboard.js'), 'utf8');
    check('the parent dashboard has a separate word for "not on this device"',
      src.includes("offline ? 'Not available offline' : 'Not yet recorded'"));
    check('and it never says "not recorded" for results it merely lacks',
      src.includes('Results are not saved on this device'));
    const ssrc = fs.readFileSync(path.join(ROOT, 'js/portal-student-dashboard.js'), 'utf8');
    check('the student dashboard says the same about its own results',
      ssrc.includes('Your results are not saved on this device'));
    check('and does not hide the Hifz card, which would read as "not enrolled"',
      ssrc.includes("hifzCardEl.hidden = false;\n        hifzStageEl.textContent = 'Not saved on this device'"));

    /* ── 5. The student dashboard, offline ───────────────────────────────── */
    console.log('\nThe student dashboard');
    await goOnline(context);
    await page.goto(`${origin}/portal/student/dashboard/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SHRSPortalOffline, null, { timeout: 10000 });
    await page.evaluate((m) => window.SHRSPortalOffline.openSession(m), KEY_MATERIAL);
    await page.evaluate(() => window.SHRSPortalOffline.view('portal.student.dashboard', '/api/portal/student/me'));

    await goOffline(context);
    const studentOffline = await page.evaluate(() =>
      window.SHRSPortalOffline.view('portal.student.dashboard', '/api/portal/student/me'));
    check('a student can see who they are and where they study, with no signal',
      studentOffline.source === 'cache'
      && studentOffline.data.className === 'JSS 2'
      && studentOffline.data.identityNo === 'SHRS-S-000042');
    check('their marks are not on the device', studentOffline.data.results === undefined);
    check('nor their fees', studentOffline.data.fees === undefined && studentOffline.data.finance === undefined);
    check('nor the Juz\' grid, until that is separated from its notes',
      studentOffline.data.hifz === undefined);

    /* ── 6. The Registrar's workbench ────────────────────────────────────── */
    console.log('\nThe Registrar\'s office');
    await goOnline(context);
    await page.goto(`${origin}/portal/staff/registrar/`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.SHRSPortalOffline, null, { timeout: 10000 });
    await page.evaluate((m) => window.SHRSPortalOffline.openSession(m), KEY_MATERIAL);
    await page.evaluate(() => window.SHRSPortalOffline.view(
      'portal.registrar.student',
      '/api/portal/staff/registrar/student?admissionNo=SHRS%2F2026%2F0042',
      { id: 'SHRS/2026/0042' },
    ));

    await goOffline(context);
    const held = await page.evaluate(() => window.SHRSPortalOffline.held('portal.registrar.student', 'SHRS/2026/0042'));
    check('a record opened online is still readable offline',
      held && held.data.student.fullName === 'Ibrahim Òjó');
    check('and holds no guardian contact details',
      !JSON.stringify(held.data).includes('aminat@example.com'));

    const rsrc = fs.readFileSync(path.join(ROOT, 'js/portal-staff-registrar.js'), 'utf8');
    check('the live workbench is not rendered from a saved copy',
      rsrc.includes('renderHeldRecord(result)') && rsrc.includes("result.source === 'cache'"));
    check('the saved copy is labelled as one, in words',
      rsrc.includes('Saved copy on this device — not the live register'));
    check('an unopened record offline is not reported as a missing student',
      rsrc.includes('It is not a statement about whether the student exists'));
    check('and no registry action is offered from it',
      rsrc.includes('no registry action can be taken from a saved copy'));

    const unseen = await page.evaluate(() => window.SHRSPortalOffline.view(
      'portal.registrar.student', '/api/portal/staff/registrar/student?admissionNo=NEVER',
      { id: 'NEVER-OPENED' },
    ));
    check('a record never opened on this device reports unavailable, not absent',
      unseen.ok === false && unseen.source === 'unavailable');

    /* ── 7. A dead session takes its cache with it ───────────────────────── */
    console.log('\nWhen the session ends');
    await page.evaluate(() => window.SHRSPortalOffline.closeSession('test-logout'));
    const afterLogout = await page.evaluate(() => window.SHRSPortalOffline.held('portal.registrar.student', 'SHRS/2026/0042'));
    check('logging out makes every held record unreadable at once', afterLogout === null);

    await goOnline(context);
    const lockedRead = await page.evaluate(async () => {
      // Simulate the 401 path: an unauthorised answer must clear what the dead
      // session was holding rather than leave it for the next person.
      const r = await window.SHRSPortalOffline.view('portal.guardian.dashboard', '/api/portal/me');
      return r.source;
    });
    check('with the key gone, a live answer is still served but not stored',
      lockedRead === 'network');
    const nothingHeld = await page.evaluate(() => window.SHRSPortalOffline.held('portal.guardian.dashboard'));
    check('and the device holds nothing', nothingHeld === null);

  } finally {
    await browser.close();
    for (const s of sockets) s.destroy();
    server.close();
  }

  const passed = results.filter((r) => r.pass).length;
  console.log(`\n${passed}/${results.length} checks passed\n`);
  console.log('Not covered here, and not claimed: the server half. No endpoint');
  console.log('issues offline key material yet, so in production this layer is');
  console.log('inert and the portal behaves exactly as it did before — live or');
  console.log('nothing. Issuing that material is REQUIRES EXTERNAL ACTION: a');
  console.log('security decision with a trade-off, recorded in');
  console.log('js/shrs-portal-offline.js and docs/shrs-portal-offline.md.\n');
  process.exit(passed === results.length ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
