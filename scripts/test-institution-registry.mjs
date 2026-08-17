// The institution registry's behaviour pin. The canonical registry
// (functions/_lib/institutions.js) REPLACED literal maps in
// stage-certificates.js, identity-no.js and setup.js — this test
// carries those original literals as golden values, so any registry
// edit that would silently change issuance wording, numbering codes,
// seed rows or seal keys fails here first. Run: node scripts/test-institution-registry.mjs
import { readFileSync } from 'node:fs';
import {
  INSTITUTIONS, UMBRELLA, institutionForProgramme, institutionByDbName,
  INSTITUTIONS_BY_PROGRAMME, PORTAL_ROYAL_COLLEGE_CODES,
  SCHOOL_CODE_BY_INSTITUTION_NAME, UNIT_BY_INSTITUTION_NAME, INSTITUTION_SEED_NAMES,
} from '../functions/_lib/institutions.js';
import { PROGRAMMES } from '../functions/_lib/certificate-serial.js';
import { RC_PROGRAMMES } from '../functions/_lib/royal-college-certificate.js';

let failures = 0;
function check(name, ok) {
  console.log(`  ${ok ? 'ok   ' : 'FAIL '} ${name}`);
  if (!ok) failures += 1;
}
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Golden: the literal INSTITUTIONS_BY_PROGRAMME this registry replaced ──
const GOLDEN_IBP = {
  TMH: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  IBT: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  IDD: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  THN: { internalName: 'Islamic and Arabic Studies', displayName: 'Sultan Hanafi School of Islamic and Arabic Studies' },
  NUR: { internalName: 'Nursery and Primary', displayName: 'Sultan Hanafi Nursery and Primary School' },
  PRY: { internalName: 'Nursery and Primary', displayName: 'Sultan Hanafi Nursery and Primary School' },
};
check('INSTITUTIONS_BY_PROGRAMME is byte-identical to the replaced literal',
  deepEq(Object.fromEntries(Object.entries(INSTITUTIONS_BY_PROGRAMME).sort()), Object.fromEntries(Object.entries(GOLDEN_IBP).sort())));
check('PORTAL_ROYAL_COLLEGE_CODES is exactly NUR, PRY',
  deepEq([...PORTAL_ROYAL_COLLEGE_CODES].sort(), ['NUR', 'PRY']));

// ── Golden: identity-no.js numbering maps ──
check('admission-number school codes match the replaced literal',
  deepEq(SCHOOL_CODE_BY_INSTITUTION_NAME, Object.fromEntries(Object.entries({
    'Islamic and Arabic Studies': 'IAS', 'Nursery and Primary': 'NP',
    'Royal College': 'RC', "Qur'an College": 'QC',
  }).filter(([k]) => k in SCHOOL_CODE_BY_INSTITUTION_NAME)))
  && Object.keys(SCHOOL_CODE_BY_INSTITUTION_NAME).length === 4);
check('staff UNIT codes match the replaced literal (NP vs NPS preserved)',
  UNIT_BY_INSTITUTION_NAME['Nursery and Primary'] === 'NPS'
  && SCHOOL_CODE_BY_INSTITUTION_NAME['Nursery and Primary'] === 'NP'
  && UNIT_BY_INSTITUTION_NAME['Royal College'] === 'RC'
  && UNIT_BY_INSTITUTION_NAME['Islamic and Arabic Studies'] === 'IAS'
  && UNIT_BY_INSTITUTION_NAME["Qur'an College"] === 'QC'
  && Object.keys(UNIT_BY_INSTITUTION_NAME).length === 4);

// ── Golden: the institutions-table seed set ──
check('seed names are exactly the four institution rows',
  deepEq([...INSTITUTION_SEED_NAMES].sort(),
    ['Islamic and Arabic Studies', 'Nursery and Primary', "Qur'an College", 'Royal College']));

// ── Cross-registry agreement: certificate masters name the same schools ──
for (const [code, key] of [['JSS', 'royal_college'], ['SS', 'royal_college'],
  ['NUR', 'nursery_primary'], ['PRY', 'nursery_primary'], ['QUR', 'quran_college']]) {
  check(`RC_PROGRAMMES.${code}.school matches the registry displayName`,
    RC_PROGRAMMES[code] && RC_PROGRAMMES[code].school === INSTITUTIONS[key].displayName);
}

// ── Coverage: every issuable/renderable programme resolves ──
for (const code of [...Object.keys(PROGRAMMES), ...Object.keys(RC_PROGRAMMES)]) {
  check(`programme ${code} resolves to an institution`, !!institutionForProgramme(code));
}
check('institutionByDbName round-trips every seed name',
  INSTITUTION_SEED_NAMES.every((n) => institutionByDbName(n) && institutionByDbName(n).dbName === n));
check('umbrella names present (en + ar)', !!UMBRELLA.en && !!UMBRELLA.ar);

// ── The seal registry keys stay aligned with the seed names ──
const seals = readFileSync(new URL('../functions/_lib/document-seals.js', import.meta.url), 'utf-8');
for (const n of INSTITUTION_SEED_NAMES) {
  check(`document-seals.js carries the PRIN key for '${n}'`,
    seals.includes(`PRIN:${n}`) || seals.includes(`"PRIN:${n}"`) || seals.includes(`'PRIN:${n}'`));
}

console.log(`\n${failures ? `${failures} FAILED` : 'the registry preserves every replaced literal'}`);
process.exit(failures ? 1 : 0);
