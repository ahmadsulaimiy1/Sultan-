/**
 * The public verification page must never badge an unrecognised state as valid.
 *
 *     node scripts/test-verify-page-badges.mjs     (needs a static server on :8901)
 *
 * WHY THIS EXISTS. render() in js/certificate-verify.js chose its badge with a
 * BLACKLIST — `integrityFailed || isRevoked ? 'revoked' : 'ok'` — so any status
 * the page had not been taught about rendered as the green "Genuine — active
 * credential". Adding ONE status to functions/api/certificates/verify.js was
 * therefore enough to make an unverified record look verified to the public,
 * and that is exactly what happened when 'multiple_matches' was introduced for
 * Student ID lookups: a lookup that matched several certificates, and is not a
 * verdict on any one of them, came back green.
 *
 * The endpoint's own source carries a note warning about this. A note is not a
 * gate. This drives the real page against every payload shape the endpoint can
 * return and asserts the badge class for each — including a status that does
 * not exist, which is the case that catches the next one added.
 *
 * Reinstating the blacklist makes the last case fail with badge=ok.
 */
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

// Each case: the payload the endpoint can return, and what the badge MUST be.
const CASES = [
  { name:'active certificate', body:{ ok:true, found:true, kind:'stage_certificate', status:'active',
      referenceNo:'SHRS-CERT-IDD-2026-000042-A775E', recipientName:'Muhammad Ismail Seriki',
      credentialType:'Certificate of Completion', issuedAt:'2026-08-08' }, expect:'ok' },
  { name:'revoked', body:{ ok:true, found:true, kind:'stage_certificate', status:'revoked',
      referenceNo:'X', recipientName:'Y', credentialType:'Z' }, expect:'revoked' },
  { name:'integrity failed', body:{ ok:true, found:true, kind:'stage_certificate', status:'integrity_check_failed',
      referenceNo:'X', recipientName:'Y', credentialType:'Z' }, expect:'revoked' },
  { name:'Student ID -> several credentials', body:{ ok:true, found:true, kind:'student_certificate_index',
      status:'multiple_matches', studentIdentityNo:'717455243759974', recipientName:'Muhammad Ismail Seriki',
      matchCount:2, matches:[
        { certificateNo:'SHRS-CERT-IBT-000012-AAAAA', credentialType:'Ibtida’iyyah', academicYear:'2023/2024', status:'active' },
        { certificateNo:'SHRS-CERT-IDD-000042-A775E', credentialType:'I’dadiyyah', academicYear:'2025/2026', status:'active' }] },
    expect:'index' },
  { name:'status this page has never seen', body:{ ok:true, found:true, kind:'stage_certificate',
      status:'suspended_pending_review', referenceNo:'X', recipientName:'Y', credentialType:'Z' }, expect:'unknown' },
  // Institutional Recovery Attestation (Founder's mandatory production
  // requirement, 2026-08-23). Genuine, but reached through an audited
  // human attestation rather than a live cryptographic recompute — it
  // must earn its OWN badge, never the plain 'ok' green (that would
  // overstate what was actually checked) and never 'revoked'/'unknown'
  // (that would falsely accuse a genuine, attested-real document).
  { name:'verified through institutional recovery', body:{ ok:true, found:true, kind:'stage_certificate',
      status:'active', verificationOutcome:'verified_institutional_recovery',
      referenceNo:'SHRS-CERT-IDD-2026-000042-56798', recipientName:'Y', credentialType:'Z',
      recoveryAttestation:{ reason:'Key lost to an undocumented rotation.',
        attestedBy:'Founder (Ahmad Sulaimiy)', attestedAt:'2026-08-23',
        governanceRef:'Governance Resolution Register 9.5' } }, expect:'recovery' },
  // The SAME status:'active' shape as the very first case, but now carrying
  // the new field explicitly saying 'verified' — must still earn the plain
  // green, proving the new field does not accidentally downgrade an
  // ordinary, fully cryptographically verified certificate.
  { name:'active certificate, new field present', body:{ ok:true, found:true, kind:'stage_certificate',
      status:'active', verificationOutcome:'verified',
      referenceNo:'SHRS-CERT-IBT-2026-000035-368DC', recipientName:'Y', credentialType:'Z' }, expect:'ok' },
];

let bad = 0;
for (const c of CASES) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  await p.route('**/api/certificates/verify*', r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(c.body) }));
  await p.goto('http://localhost:8901/verify-certificate/?ref=TEST', { waitUntil:'networkidle' });
  await p.waitForTimeout(700);
  const got = await p.evaluate(() => {
    const el = document.querySelector('.cert-verify-badge');
    return el ? { cls:[...el.classList].filter(c=>c!=='cert-verify-badge').join(','), text:el.textContent.trim().slice(0,60) } : null;
  });
  const ok = got && got.cls === c.expect;
  if (!ok) bad++;
  console.log(`  ${ok?'PASS':'FAIL'}  ${c.name.padEnd(36)} badge=${got?got.cls:'(none)'} expected=${c.expect}`);
  if (got) console.log(`        "${got.text}"`);
  await ctx.close();
}
await b.close();
console.log(bad ? `\n${bad} case(s) render the wrong badge` : '\nno unrecognised state renders as a genuine credential');
process.exit(bad ? 1 : 0);
