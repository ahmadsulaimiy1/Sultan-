/* SHRS OFFLINE POLICY — the single place every offline limit is decided.
 *
 * STATUS: PROPOSED, AWAITING THE FOUNDER'S APPROVAL (directive §6, 9 Aug 2026:
 * "Present these limits before silently choosing them.")
 *
 * Nothing else in the codebase may hard-code an offline limit. Every cap, every
 * lifetime, every excluded field is named here, with the reasoning attached, so
 * that changing institutional policy is a one-line edit reviewed in one place
 * rather than an archaeology exercise across a sync engine.
 *
 * The values below are deliberately CONSERVATIVE. These are children's records
 * on a device that can be lost in a Lagos market. Where a limit was arguable,
 * it was set at the protective end, because the cost of being wrong is
 * asymmetric: too little offline reach is an inconvenience to a Registrar; too
 * much is a child's home address in a stranger's hands.
 */

export const POLICY_STATUS = 'APPROVED — the Founder, 9 August 2026';
export const POLICY_VERSION = 2;
/* Approved unchanged, with one amendment: the guardian's phone number is
 * removed from the offline allowlist. The Founder's reasoning, recorded because
 * a future reader will otherwise re-add it as an obvious convenience —
 *
 *   "A Registrar can see it when online, but there's no strong reason to retain
 *    a parent's personal number on a device after connectivity disappears. If
 *    an emergency workflow genuinely requires it, make that a deliberate,
 *    narrowly scoped exception later."
 *
 * So it is not merely absent, it is refused. Any future emergency-contact
 * feature must be argued for on its own terms and scoped to that workflow,
 * not smuggled in by widening the student allowlist. */

/* ── 1. DATA SCOPE — what a Registrar can reach offline ────────────────────
 *
 * CACHE ON ACCESS, NEVER BULK-SYNC. A record becomes available offline only
 * because the Registrar actually opened it online. The alternative — mirroring
 * the registry to the device — would put every child in the school on every
 * staff phone to save a round-trip on the handful of records anyone actually
 * works with in a day. The directive says it plainly (§21): do not download
 * the whole database to every device.
 */
export const SCOPE = {
  strategy: 'cache-on-access',
  // The working set. Fifty is roughly a fortnight of a Registrar's real
  // caseload; beyond that the oldest is evicted, not merely hidden.
  maxStudentRecords: 50,
  maxCertificateRecords: 200,   // certificates are small and read far more often
  maxDocuments: 20,
  // Bulk-syncing an entire class list is the one exception, because a class
  // register is the unit a Registrar actually works in, and it is a list of
  // names and IDs — not a set of full records.
  allowClassRosterPrefetch: true,
  maxPrefetchedRosters: 6,
};

/* ── 2. SENSITIVE FIELDS — never written to a device, at any size ──────────
 *
 * This list does more work than the encryption does. Encryption protects
 * against a casual finder; it does not protect against an unlocked device in
 * the window before expiry. The only field that cannot leak is the field that
 * was never written.
 *
 * Each exclusion is here because its exposure harms a CHILD, not because it is
 * merely confidential. None of them is needed to do Registrar work offline.
 */
export const NEVER_CACHED_FIELDS = [
  // Safeguarding — the entire point of CP-01. A cached safeguarding flag on a
  // lost phone can identify a child at risk to the person they are at risk from.
  'safeguarding_notes', 'safeguarding_flag', 'dsl_notes', 'child_protection_status',
  // Medical.
  'medical_notes', 'allergies', 'medical_conditions', 'sick_bay_notes', 'medication',
  // Behavioural and disciplinary — following a child around on a device.
  'disciplinary_records', 'behaviour_notes', 'incident_reports',
  // Where the child physically is.
  'home_address', 'residential_address', 'pickup_arrangements',
  // Money.
  'payment_method', 'card_details', 'bank_details', 'outstanding_balance',
  // Anything that is a credential.
  'password_hash', 'session_token', 'otp_code', 'recovery_code', 'api_key',
  'trust_token', 'content_hash_secret',
  // Unstructured staff commentary — unbounded content, unknowable sensitivity.
  'staff_private_notes', 'internal_remarks',
];

/* What a cached student record MAY hold — an allowlist, so a new column added
 * upstream is excluded by default rather than cached by accident. This is the
 * direction of failure that matters: a field nobody thought about must not
 * silently land on a device. */
export const CACHEABLE_STUDENT_FIELDS = [
  'id', 'identity_no', 'admission_no', 'full_name', 'full_name_ar',
  'sex', 'date_of_birth', 'class_name', 'programme_code', 'enrolment_status',
  // guardian_name identifies who to ask for; guardian_phone is how to reach
  // them, and that is the part that must not survive on a lost device. The
  // Registrar sees the number online, where the server can decide whether they
  // still should. See the amendment note at POLICY_STATUS.
  'guardian_name', 'photo_url', 'updated_at',
];

export const CACHEABLE_CERTIFICATE_FIELDS = [
  'serial_no', 'certificate_no', 'student_identity_no', 'student_full_name',
  'student_full_name_ar', 'programme_code', 'programme_label_en', 'academic_year',
  'issued_at', 'status', 'revoked_at', 'content_hash_prefix',
];
// Note the absence of grade_en / grade_ar. A certificate certifies completion;
// the grade belongs to the Transcript and has never appeared on the public
// attestation. It does not become cacheable by being useful.

/* ── 3. LIFETIMES — two separate clocks, deliberately ─────────────────────
 *
 * They answer different questions and the shorter one is the real guarantee.
 *
 *   offlineSessionMs — how long cached data can still be READ without going
 *   back online. Twelve hours covers a full working day including a power cut,
 *   and bounds what a lost device yields to a single day rather than a week.
 *
 *   recordRetentionMs — how long the encrypted record survives on disk at all.
 *   Seven days, so a Registrar who reconnects on Monday does not re-download
 *   everything they read on Friday.
 *
 * Data becomes UNREADABLE at twelve hours. It is DESTROYED at seven days.
 */
export const LIFETIMES = {
  offlineSessionMs: 12 * 60 * 60 * 1000,
  recordRetentionMs: 7 * 24 * 60 * 60 * 1000,
  // Documents the user deliberately downloaded are theirs for longer — they
  // chose to keep them, and they are documents the school issued to them.
  documentRetentionMs: 30 * 24 * 60 * 60 * 1000,
  // A certificate manifest older than this must refuse to answer rather than
  // guess (Phase 6). The revocation window is exactly this long.
  certificateManifestMaxAgeMs: 24 * 60 * 60 * 1000,
};

/* ── 4. STORAGE CEILINGS — hard caps with LRU eviction ────────────────────
 * A device that fills up is a device whose browser silently evicts the whole
 * origin, taking the outbound queue with it. Staying well under the quota is a
 * data-loss control, not tidiness.
 */
export const STORAGE = {
  maxRecordBytes: 25 * 1024 * 1024,
  maxDocumentBytes: 50 * 1024 * 1024,
  // Refuse to cache anything new above this and warn, rather than thrashing.
  warnAtPercent: 80,
  evictionPolicy: 'least-recently-accessed',
};

/* ── 5. SYNCHRONISATION CADENCE ───────────────────────────────────────────
 * Frequent enough that a Registrar rarely sees a stale stamp; sparse enough
 * that a phone on Nigerian mobile data is not doing this constantly.
 */
export const SYNC = {
  onAppOpen: true,
  onReconnect: true,
  onFocusAfterMs: 5 * 60 * 1000,
  whileActiveEveryMs: 15 * 60 * 1000,
  // Exponential, capped. A failing server must not be hammered by every device.
  retryBackoffMs: [30_000, 120_000, 480_000, 1_800_000],
  maxRetries: 4,
};

/* ── 6. REVOCATION AND EXPIRY — what happens, precisely ───────────────────
 *
 * The honest position first: a device that never reconnects cannot learn it
 * has been revoked. No client-side design changes that. The real guarantee is
 * therefore LIFETIMES.offlineSessionMs — twelve hours — and everything below
 * is what happens the moment the device is reachable again.
 *
 * trust_version already exists in the schema from the identity work. It is the
 * mechanism: an administrator revoking access bumps it, and any mismatch seen
 * on reconnect purges the device before a single record is synced.
 */
export const REVOCATION = {
  // The FIRST call on reconnect, before any data moves in either direction.
  checkTrustVersionBeforeSync: true,
  onTrustVersionMismatch: 'purge-all-portal-data-immediately',
  onSessionExpiredOffline: 'deny-read-and-require-reconnect',
  onLogout: 'purge-all-portal-data-immediately',
  // Fail closed, always. An expired authorisation offline shows a locked state,
  // never the data with a warning attached.
  failOpen: false,
};

/* ── 7. DEVICE LOSS ───────────────────────────────────────────────────────
 * Stated as a threat model rather than a reassurance, because the mitigations
 * are real but partial and the Registrar should know which is which.
 */
export const DEVICE_LOSS = {
  encryptedAtRest: true,
  keyDerivedFrom: 'session-secret',        // never persisted in plaintext
  keyPersisted: false,                      // lost on logout/expiry by construction
  // What an attacker actually gets, honestly:
  //   • Locked device, or >12h after last auth → nothing readable.
  //   • Unlocked device within 12h → the allowlisted fields above, for up to
  //     50 students. No safeguarding, medical, disciplinary, address or
  //     financial data, because none of it was ever written.
  //   • Administrator revokes → purged on the device's next connection.
  adminCanRevoke: true,
  revocationTakesEffect: 'on next connection',
};

/* ── 8. WHAT IS NEVER QUEUED OFFLINE ──────────────────────────────────────
 * The directive (§12) permits queued mutations but bars irreversible and
 * security-sensitive ones without explicit safeguards. These are the ones that
 * are never deferred — they require a live server and are refused offline with
 * a plain explanation.
 */
export const NEVER_QUEUED_OPERATIONS = [
  'certificate.issue',            // consumes a permanent, never-reused number
  'certificate.revoke',           // a public statement about a real document
  'student.identity.assign',      // a permanent number, for life
  'payment.record', 'payment.refund',
  'user.password.change', 'user.role.change', 'user.revoke',
  'record.delete',
];

/* ── 9. PORTAL VIEWS — what a whole dashboard may keep ────────────────────
 *
 * Sections 1–2 govern RECORDS: a row of the students table, a certificate. A
 * portal dashboard is not a row. It is an assembled answer — identity, plus
 * enrolments, plus attendance, plus marks, plus money — and the temptation is
 * to cache the whole envelope because it arrived as one object. That is
 * precisely how a fee balance and a term result end up on a device without
 * anyone deciding they should.
 *
 * So each view is named here with a TOP-LEVEL KEY ALLOWLIST, and everything
 * else in the response is dropped before it is written. A new key added to an
 * endpoint upstream is excluded by default, exactly as a new column is.
 *
 * THE APPROVED SET IS DELIBERATELY SMALL. It is the part that answers "who am
 * I, where am I enrolled, am I in good standing" — which is what makes a
 * dashboard worth opening with no signal. Marks, fees and Hifz detail are
 * listed separately, as PROPOSED, and are NOT cached until the Founder says
 * so. Turning one on is a single-line edit here and nowhere else.
 */
export const PORTAL_VIEWS = {
  'portal.guardian.dashboard': {
    keys: [
      'fullName', 'title', 'preferredName', 'identityNo', 'identityType',
      'emailVerified', 'mobileVerified', 'profileCompletionPct',
      'existingChildrenCount', 'prospectiveChildrenCount', 'children',
      // `sections` is a handful of booleans about which parts of a profile are
      // filled in, and `recommendedNextStep` is the sentence generated from
      // them. Neither carries a value the person entered — only whether they
      // entered one. The onboarding panel is unusable without them.
      'sections', 'recommendedNextStep',
    ],
    // Applied to each entry of `children`, which is the only nested list here.
    // `attendance` is here for the same reason it is in the student's own view:
    // it is a count of days, with no free text and nothing about anyone else.
    childKeys: [
      'id', 'fullName', 'admissionNo', 'status', 'relationship', 'enrolments',
      'className', 'institution', 'attendance', 'isSampleData',
    ],
    // `email` is absent for the same reason guardian_phone is: it is a way to
    // reach a person, and a lost device should not carry one. `notifications`
    // is absent because it is unbounded staff-authored prose — the same
    // objection as internal_remarks, arriving by a different route.
  },
  'portal.student.dashboard': {
    keys: [
      'fullName', 'admissionNo', 'identityNo', 'admissionDate', 'academicSession',
      'status', 'institution', 'className', 'enrolments', 'attendance',
    ],
  },
  'portal.registrar.student': {
    keys: ['student', 'enrolments', 'certificates'],
    // `guardians` (names and email addresses), `lifecycleEvents` (free-text
    // reasons for a withdrawal), `results`, `fees` and `hifz` are all absent.
    // A Registrar reads those online, where the server can still decide
    // whether they should.
  },
};

/* Named, priced, and switched off. Each entry says what would be cached and
 * what it would cost if the device were lost. Nothing here is written to a
 * device while its `approved` flag is false — the code reads this list, so
 * there is no second place to forget. */
export const PORTAL_VIEW_EXTENSIONS = [
  {
    key: 'results', views: ['portal.student.dashboard', 'portal.registrar.student'],
    approved: false,
    gains: 'A student could read their own term results with no signal.',
    costs: 'A lost, unlocked phone shows a child\'s marks and a teacher\'s written comment about them.',
  },
  {
    key: 'fees', views: ['portal.student.dashboard', 'portal.registrar.student'],
    approved: false,
    gains: 'Fee standing visible offline.',
    costs: 'This is money owed. NEVER_CACHED_FIELDS already refuses outstanding_balance; caching the fee row would be the same data by another name.',
  },
  {
    key: 'finance', views: ['portal.student.dashboard'],
    approved: false,
    gains: 'Invoice and receipt history offline.',
    costs: 'As above, and larger.',
  },
  {
    key: 'hifz', views: ['portal.student.dashboard'],
    approved: false,
    gains: 'The Juz\' grid — genuinely the thing a Qur\'an College student checks most.',
    costs: 'The grid carries muhaffiz notes and assessment commentary about a child. The grid alone might be defensible; it would need separating from the notes first, which is a change to the endpoint, not to this list.',
  },
];

function extensionApproved(view, key) {
  const ext = PORTAL_VIEW_EXTENSIONS.find((e) => e.key === key && e.views.includes(view));
  return ext ? ext.approved === true : false;
}

/** True if `key` may be written to a device for `view`. */
export function isViewKeyCacheable(view, key) {
  const spec = PORTAL_VIEWS[view];
  if (!spec) return false;                      // an undeclared view caches nothing
  if (NEVER_CACHED_FIELDS.includes(key)) return false;
  if (spec.keys.includes(key)) return true;
  return extensionApproved(view, key);
}

/**
 * Strips an assembled dashboard response down to what policy permits.
 *
 * Recursive over objects and arrays for the NEVER_CACHED_FIELDS sweep, because
 * a forbidden field does not become permitted by being nested one level deeper
 * than anyone looked.
 */
export function redactViewForCache(view, payload) {
  const spec = PORTAL_VIEWS[view];
  if (!spec || !payload || typeof payload !== 'object') return null;

  const scrub = (value) => {
    if (Array.isArray(value)) return value.map(scrub);
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        if (NEVER_CACHED_FIELDS.includes(k)) continue;
        out[k] = scrub(v);
      }
      return out;
    }
    return value;
  };

  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!isViewKeyCacheable(view, k)) continue;
    if (k === 'children' && Array.isArray(v) && spec.childKeys) {
      out[k] = v.map((child) => {
        const c = {};
        for (const [ck, cv] of Object.entries(child || {})) {
          if (spec.childKeys.includes(ck) && !NEVER_CACHED_FIELDS.includes(ck)) c[ck] = scrub(cv);
        }
        return c;
      });
      continue;
    }
    out[k] = scrub(v);
  }
  return out;
}

/* Convenience: the shape the UI needs to show the connectivity state. */
export const SYNC_STATES = /** @type {const} */ ([
  'pending', 'syncing', 'synced', 'failed', 'conflict',
]);

export function isCacheable(entity, field) {
  if (NEVER_CACHED_FIELDS.includes(field)) return false;
  // A portal view is an entity too, as far as the store is concerned, so it is
  // answered here rather than by a second rule somewhere else.
  if (PORTAL_VIEWS[entity]) return isViewKeyCacheable(entity, field);
  if (entity === 'student') return CACHEABLE_STUDENT_FIELDS.includes(field);
  if (entity === 'certificate') return CACHEABLE_CERTIFICATE_FIELDS.includes(field);
  return false;   // allowlist by default — an unknown entity caches nothing
}

/** Strips a server record down to what policy permits on a device. */
export function redactForCache(entity, record) {
  if (PORTAL_VIEWS[entity]) return redactViewForCache(entity, record) || {};
  const out = {};
  for (const [k, v] of Object.entries(record || {})) {
    if (isCacheable(entity, k)) out[k] = v;
  }
  return out;
}
