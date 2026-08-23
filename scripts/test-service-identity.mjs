/**
 * Does the StromeX Autonomous Engineering Service Identity (AESI) really
 * stay inside the line the Founder's ruling drew (Governance Resolution
 * Register 9.2/9.10) — full autonomy where granted, and certificate
 * issuance / finance / safeguarding writes / any delete refused no
 * matter what the grants table says?
 *
 *     node scripts/test-service-identity.mjs
 *
 * An in-memory stub stands in for the two new tables plus the token
 * hashing — no real database, no real credential ever created here.
 */
import { hasPermissionForServiceIdentity } from '../functions/_lib/permissions.js';
import {
  generateServiceIdentityToken, hashServiceIdentityToken,
} from '../functions/_lib/service-identity.js';

let failures = 0;
const check = (name, ok, detail = '') => {
  if (ok) { console.log(`  ok    ${name}`); return; }
  failures++;
  console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
};

function makeStubSql(grantRows) {
  return async (strings, ...values) => {
    const q = strings.join('?');
    if (/SELECT area_code, permission_code, institution_id FROM service_identity_grants/.test(q)) {
      const serviceIdentityId = values[0];
      return {
        rows: grantRows
          .filter((g) => g.serviceIdentityId === serviceIdentityId && !g.revoked)
          .map((g) => ({ area_code: g.areaCode, permission_code: g.permissionCode, institution_id: g.institutionId ?? null })),
      };
    }
    throw new Error(`unexpected query in stub: ${q}`);
  };
}

// ── The denylist wins even when the grants table says otherwise ────────
// This is the whole point: a seeding mistake or a future bug must not be
// able to hand a machine identity a human-reserved action.
{
  const sql = makeStubSql([
    { serviceIdentityId: 1, areaCode: 'certificates', permissionCode: 'C' },
    { serviceIdentityId: 1, areaCode: 'finance', permissionCode: 'C' },
    { serviceIdentityId: 1, areaCode: 'finance', permissionCode: 'E' },
    { serviceIdentityId: 1, areaCode: 'safeguarding', permissionCode: 'C' },
    { serviceIdentityId: 1, areaCode: 'student_records', permissionCode: 'D' },
  ]);
  for (const [area, code] of [
    ['certificates', 'C'], ['finance', 'C'], ['finance', 'E'],
    ['safeguarding', 'C'], ['student_records', 'D'],
  ]) {
    const result = await hasPermissionForServiceIdentity(sql, 1, area, code, null);
    check(`${area}:${code} is refused even though the grants table grants it`,
      result.granted === false && !!result.denyReason, JSON.stringify(result));
  }
}

// ── A delete is refused in ANY area, not just the ones named above ─────
{
  const sql = makeStubSql([{ serviceIdentityId: 1, areaCode: 'student_records', permissionCode: 'D' }]);
  const result = await hasPermissionForServiceIdentity(sql, 1, 'student_records', 'D', null);
  check('a delete permission is refused in an area not on the explicit denylist too',
    result.granted === false, JSON.stringify(result));
}

// ── A genuinely granted, non-denylisted permission resolves true ───────
{
  const sql = makeStubSql([{ serviceIdentityId: 2, areaCode: 'teacher_performance', permissionCode: 'V' }]);
  const result = await hasPermissionForServiceIdentity(sql, 2, 'teacher_performance', 'V', null);
  check('a real, non-denylisted grant resolves granted:true',
    result.granted === true && result.via.source === 'service_identity', JSON.stringify(result));
}

// ── No grant at all still fails closed, exactly like the human engine ──
{
  const sql = makeStubSql([]);
  const result = await hasPermissionForServiceIdentity(sql, 3, 'teacher_performance', 'V', null);
  check('a service identity with zero grants is refused, not defaulted open',
    result.granted === false, JSON.stringify(result));
}

// ── Institution scoping is respected the same way the human engine does ─
{
  const sql = makeStubSql([{ serviceIdentityId: 4, areaCode: 'teacher_performance', permissionCode: 'V', institutionId: 7 }]);
  const same = await hasPermissionForServiceIdentity(sql, 4, 'teacher_performance', 'V', 7);
  const other = await hasPermissionForServiceIdentity(sql, 4, 'teacher_performance', 'V', 9);
  check('a grant scoped to institution 7 authorises institution 7', same.granted === true);
  check('the same grant does NOT authorise a different institution', other.granted === false);
}

// ── Token hashing: deterministic, and never reversible from the hash ───
{
  const token = generateServiceIdentityToken();
  const h1 = hashServiceIdentityToken(token);
  const h2 = hashServiceIdentityToken(token);
  check('the token has the expected AESI prefix', token.startsWith('aesi_'));
  check('hashing the same token twice gives the same hash (a lookup will find it)', h1 === h2);
  check('the hash never contains the plaintext token', !h1.includes(token));
  check('two freshly generated tokens are never equal', token !== generateServiceIdentityToken());
}

console.log(`\n${failures ? `${failures} FAILED` : 'AESI never crosses the line Governance Resolution Register 9.2 drew, and its grants resolve exactly like a human\'s'}`);
process.exit(failures ? 1 : 0);
