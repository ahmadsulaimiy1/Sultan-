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

// ── Register normalisation: institution_name converges on displayName ──
// Three pipelines historically wrote three spellings; the public verifier
// shows the column verbatim. Both schema copies must carry an idempotent
// UPDATE per legacy spelling, targeting the registry displayName exactly.
const schemaSql = readFileSync(new URL('../sql/schema.sql', import.meta.url), 'utf-8');
const setupJs = readFileSync(new URL('../functions/api/portal/setup.js', import.meta.url), 'utf-8');
const UMBRELLA_PREFIX = 'Sultan Hanafi Royal Schools — ';
const NORMALISATIONS = [
  { legacy: `${UMBRELLA_PREFIX}School of Islamic & Arabic Studies`, target: INSTITUTIONS.islamic_arabic_studies.displayName },
  ...Object.values(INSTITUTIONS).filter((i) => i.rcFamily)
    .map((i) => ({ legacy: `${UMBRELLA_PREFIX}${i.displayName}`, target: i.displayName })),
];
for (const { legacy, target } of NORMALISATIONS) {
  const hasBoth = (text) =>
    text.includes(`SET institution_name = '${target}'`) && text.includes(`= '${legacy}'`);
  check(`both schema copies normalise '${legacy.slice(UMBRELLA_PREFIX.length)}' to the registry displayName`,
    hasBoth(schemaSql) && hasBoth(setupJs));
}

// ── The issuance scripts write what the registry says ──
// The RC-family batch script must take the school straight from
// RC_PROGRAMMES (golden-pinned to registry displayNames above) and never
// rebuild the umbrella-prefixed doubled form. The Islamic-stage script
// keeps its historical literal VERBATIM — it reproduces sha256-attested
// register files — and the schema normalisation covers its rows.
const rcScript = readFileSync(new URL('./issue-royal-college-batch.mjs', import.meta.url), 'utf-8');
check('RC batch script takes INSTITUTION_NAME from RC_PROGRAMMES[*].school',
  rcScript.includes('const INSTITUTION_NAME = RC_PROGRAMMES[PROGRAMME].school'));
check('RC batch script no longer builds the umbrella-prefixed doubled name',
  !rcScript.includes('Royal Schools — ${'));
const islamicScript = readFileSync(new URL('./issue-certificate-batch.mjs', import.meta.url), 'utf-8');
check('Islamic-stage script keeps its attested historical spelling verbatim',
  islamicScript.includes(`'${UMBRELLA_PREFIX}School of Islamic & Arabic Studies'`));

// ── Client institution pickers offer only registry dbNames ──
// The server resolves these with SELECT id FROM institutions WHERE
// name = $1 — a near-miss spelling matches nothing and silently degrades
// (a role grant loses its scope; an admission number falls back to GEN).
const adminCentre = readFileSync(new URL('../js/portal-admin-centre.js', import.meta.url), 'utf-8');
check("admin centre datalist no longer offers 'Nursery and Primary School'",
  !adminCentre.includes("'Nursery and Primary School'"));
check('admin centre datalist offers every registry dbName',
  INSTITUTION_SEED_NAMES.every((n) => adminCentre.includes(n)));
const registrarHtml = readFileSync(new URL('../portal/staff/registrar/index.html', import.meta.url), 'utf-8');
check('registrar page carries the shared registry-institution-names datalist',
  registrarHtml.includes('id="registry-institution-names"')
  && INSTITUTION_SEED_NAMES.every((n) => registrarHtml.includes(`<option value="${n}">`))
  && !registrarHtml.includes('value="Nursery and Primary School"'));
check('registrar enrol + lifecycle inputs use the datalist',
  registrarHtml.includes('data-enrol-institution list="registry-institution-names"')
  && registrarHtml.includes('data-lifecycle-institution list="registry-institution-names"'));

console.log(`\n${failures ? `${failures} FAILED` : 'the registry preserves every replaced literal'}`);
process.exit(failures ? 1 : 0);
