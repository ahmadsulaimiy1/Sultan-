// Graduation Approval Workflow — the "Smart Approval Engine" the
// Executive Directive (proceed-to-Stage-2) asked for, hardened per the
// Stage 2 Conditional Approval directive: an ordered, multi-office
// clearance chain that no document generation stage may bypass. This
// is the sequencing/state-machine layer functions/_lib/approvals.js
// does not provide (that file is a single-step, two-party primitive —
// see the design note above CREATE TABLE graduation_clearances in
// sql/schema.sql for the full audit that established this).
//
// STAGE_DEFINITIONS is the one place that names who may decide each
// stage. Two authorisation shapes are used, both reusing existing,
// audited mechanisms rather than inventing a third:
//   - authType: 'office' — functions/_lib/office-access.js's
//                          staffCanActOnOffice(sql, staffId, officeId).
//                          Used for offices that are real rows in
//                          `offices` (Academic Affairs, Examinations,
//                          Library, ICT).
//   - authType: 'area'   — functions/_lib/permissions.js's
//                          hasPermissionFor(sql, staffId, areaCode,
//                          permissionCode, institutionId). Used where a
//                          real role with real grants already exists
//                          (REG, FIN, PRIN/behaviour's VP+PRIN, EXE) or
//                          where the Executive Directive named an
//                          authority this codebase genuinely has no
//                          appointee for yet (VPAC, VPAD).
//
// VACANCY — the Conditional Approval directive's item 1 ("do not
// hard-code individuals; allow the workflow to pause at those stages
// until appointments are made; automatically activate once
// appointments exist"): this was already this engine's real behaviour
// (canDecideStage/recipientsForStage both resolve live staff_roles /
// office_appointments on every call, so appointing someone via the
// Institutional Administration Centre makes a stage decidable on the
// very next request, with no code change and no re-deployment). What
// was missing was making that vacancy VISIBLE rather than a silent
// empty queue — recipientsForStage() is now exported specifically so
// functions/api/portal/staff/graduation-clearances.js can compute and
// surface a per-stage `hasAppointee` flag ("Vacant — Awaiting
// Appointment" in the UI) instead of a stage just sitting mute.
//
// APPROVAL MATRIX — the Conditional Approval directive's item 2:
// Stage 2's award-based Founder trigger was correctly identified as an
// unsourced interpretation and has been removed. evaluateApprovalMatrix()
// below is the only thing that can now make the Founder stage globally
// required, and it reads entirely from the `graduation_approval_rules`
// table — administrators manage rows there via functions/api/portal/
// admin/approval-matrix.js, never a code change. A per-student
// escalation (the existing escalate_to_founder action) remains separate
// by design: it is a one-off decision about one graduate, not an
// institutional standing rule, and is recorded directly on that
// graduation_record rather than as a matrix row.
//
// 'registry' is authorised automatically the moment Registry marks a
// graduation_records row 'verified' (functions/api/portal/staff/
// registrar/graduation.js's mark_verified action calls
// initializeClearanceChain() below) — Registry does not click twice
// for the same meaning.
//
// 'library' is is_blocking: false and initialised 'not_applicable'
// because, per the Library office's own seed description, "No library
// catalogue system exists yet" — the literal, honest reading of
// "(future-ready)": the stage is real and present in the chain (and
// can still be manually cleared by a future Library appointee) but
// never blocks completion until real loan data exists. librarySignal()
// below already gives it something real to check the moment
// library_loans has rows in it.
import { hasPermissionFor } from './permissions.js';
import { staffCanActOnOffice } from './office-access.js';
import { logStaffEvent, requestAuditContext } from './audit.js';
import { notifyStaff, notifyStaffMany, staffForOffice, staffForRole, notifyGuardian, notifyEmail } from './notifications.js';

export const STAGE_DEFINITIONS = [
  {
    code: 'registry', label: 'Registry', sequence: 1, isBlocking: true, authType: 'auto',
    description: 'Registry data-quality verification — cleared automatically when the graduation record is marked verified.',
  },
  {
    code: 'academic', label: 'Academic Department', sequence: 2, isBlocking: true, authType: 'office', officeSlug: 'academic-affairs',
    description: 'Confirms the graduate has met the academic standard required for their programme.',
  },
  {
    code: 'examinations', label: 'Examinations & Records', sequence: 3, isBlocking: true, authType: 'office', officeSlug: 'examinations',
    description: 'Confirms results and assessment records are finalised and exam-integrity clear.',
  },
  {
    code: 'finance', label: 'Finance & Accounts', sequence: 4, isBlocking: true, authType: 'area', areaCode: 'finance', permissionCode: 'E', roleCodeHint: 'FIN',
    description: 'Confirms fees are cleared. The queue surfaces any real outstanding invoice for this student automatically.',
  },
  {
    code: 'disciplinary', label: 'Disciplinary Clearance', sequence: 5, isBlocking: true, authType: 'area', areaCode: 'behaviour', permissionCode: 'A',
    description: "Confirms no unresolved conduct matter — decided by whoever holds the existing Behaviour Management authority (VP Administration or the student's Principal). The queue surfaces any open/under-investigation Disciplinary Register case automatically.",
  },
  {
    code: 'library', label: 'Library Clearance', sequence: 6, isBlocking: false, authType: 'office', officeSlug: 'library',
    description: 'No library catalogue system exists yet (confirmed in the Library office\'s own record) — this stage is present and future-ready but never blocks completion today. The queue surfaces any real outstanding loan/fine automatically.',
  },
  {
    code: 'ict', label: 'ICT Clearance', sequence: 7, isBlocking: true, authType: 'office', officeSlug: 'digital-services',
    description: 'Confirms institutional email, portal account, issued devices, ID card, and access credentials are all accounted for. The queue surfaces real signals for each automatically.',
  },
  {
    code: 'principal', label: 'Principal', sequence: 8, isBlocking: true, authType: 'area', areaCode: 'graduation_records', permissionCode: 'A', institutionScoped: true, roleCodeHint: 'PRIN',
    description: "The student's own Principal/Head Teacher final academic-leadership sign-off.",
  },
  {
    code: 'vp_academic', label: 'Vice Principal (Academic)', sequence: 9, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'VPAC',
    description: 'Vice Principal (Academic) sign-off. Constitutionally vacant until an appointment exists — the stage pauses here, not skips, and activates automatically the moment someone is appointed via the Institutional Administration Centre.',
  },
  {
    code: 'vp_administration', label: 'Vice Principal (Administration)', sequence: 10, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'VPAD',
    description: 'Vice Principal (Administration) sign-off. Constitutionally vacant until an appointment exists — the stage pauses here, not skips, and activates automatically the moment someone is appointed via the Institutional Administration Centre.',
  },
  {
    code: 'founder', label: 'Founder & Head of Schools', sequence: 11, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'EXE', conditional: true,
    description: 'Founder & Head of Schools review — required only when the Graduation Approval Matrix (an admin-configurable rule table, never hardcoded) names the Constitution, Governance Charter, a Board Resolution, or an Executive Directive as requiring it, or a staff member manually escalates this specific record.',
  },
];

export const STAGE_BY_CODE = Object.fromEntries(STAGE_DEFINITIONS.map((s) => [s.code, s]));

// Exported so functions/_lib/document-signatories.js can resolve an
// office-authorised signatory (e.g. Examinations & Records, which has
// no `roles` table entry of its own — it is authorised the same
// office-appointment way 'academic'/'library'/'ict' are in
// STAGE_DEFINITIONS above) without duplicating this lookup.
export async function resolveOfficeId(sql, slug) {
  const res = await sql`SELECT id FROM offices WHERE slug = ${slug}`;
  return res.rows[0] ? res.rows[0].id : null;
}

// The Graduation Approval Matrix — the ONLY mechanism that can make the
// Founder stage (or, in principle, any future stage named in a rule
// row) globally required. Reads graduation_approval_rules; returns
// which stages are currently required and why, in the citation's own
// words (reference_text), never a guessed/invented citation.
export async function evaluateApprovalMatrix(sql, targetStageCode) {
  const res = await sql`
    SELECT trigger_type, reference_text FROM graduation_approval_rules
    WHERE target_stage_code = ${targetStageCode} AND applies_globally = true AND is_active = true AND trigger_type != 'manual_escalation'
    ORDER BY created_at ASC`;
  return {
    required: res.rows.length > 0,
    reasons: res.rows.map((r) => `${TRIGGER_LABEL[r.trigger_type] || r.trigger_type}${r.reference_text ? ' — ' + r.reference_text : ''}`),
  };
}

const TRIGGER_LABEL = {
  constitution: 'Constitution', governance_charter: 'Governance Charter',
  board_resolution: 'Board Resolution', executive_directive: 'Executive Directive',
  manual_escalation: 'Manual Escalation',
};

// Creates the full ordered set of graduation_clearances rows for a
// record — called once, the moment Registry marks the record
// 'verified'. Idempotent (ON CONFLICT DO NOTHING keyed on the unique
// (graduation_record_id, stage_code) pair) so re-verifying an already-
// initialised record is harmless. The Founder stage's requirement is
// resolved from the Approval Matrix here, not any per-record heuristic.
export async function initializeClearanceChain(sql, { graduationRecordId, verifiedByStaffId }) {
  const founderRule = await evaluateApprovalMatrix(sql, 'founder');
  if (founderRule.required) {
    await sql`
      UPDATE graduation_records SET requires_founder_review = true, founder_review_reason = ${founderRule.reasons.join('; ')}, updated_at = now()
      WHERE id = ${graduationRecordId}`;
  }

  for (const stage of STAGE_DEFINITIONS) {
    let status = 'pending';
    let isBlocking = stage.isBlocking;
    let decidedByStaffId = null;
    let decisionNote = null;
    let decidedAt = null;

    if (stage.code === 'registry') {
      status = 'cleared';
      decidedByStaffId = verifiedByStaffId;
      decisionNote = 'Auto-cleared: Registry data-quality verification completed.';
      decidedAt = 'now()';
    } else if (stage.code === 'library') {
      status = 'not_applicable';
    } else if (stage.code === 'founder') {
      if (!founderRule.required) { status = 'not_applicable'; isBlocking = false; }
    }

    if (decidedAt === 'now()') {
      await sql`
        INSERT INTO graduation_clearances (graduation_record_id, stage_code, sequence_position, is_blocking, status, decided_by_staff_id, decision_note, decided_at)
        VALUES (${graduationRecordId}, ${stage.code}, ${stage.sequence}, ${isBlocking}, ${status}, ${decidedByStaffId}, ${decisionNote}, now())
        ON CONFLICT (graduation_record_id, stage_code) DO NOTHING`;
    } else {
      await sql`
        INSERT INTO graduation_clearances (graduation_record_id, stage_code, sequence_position, is_blocking, status, decided_by_staff_id, decision_note)
        VALUES (${graduationRecordId}, ${stage.code}, ${stage.sequence}, ${isBlocking}, ${status}, ${decidedByStaffId}, ${decisionNote})
        ON CONFLICT (graduation_record_id, stage_code) DO NOTHING`;
    }
  }
  await notifyNextActionableStage(sql, graduationRecordId);
}

export async function getClearances(sql, graduationRecordId) {
  const res = await sql`
    SELECT * FROM graduation_clearances WHERE graduation_record_id = ${graduationRecordId} ORDER BY sequence_position ASC`;
  return res.rows;
}

// The single source of truth for "which stage is actionable right
// now" — the first stage (lowest sequence_position) whose status is
// 'pending' or 'correction_requested'. Strictly sequential: a later
// office can never act before every earlier BLOCKING stage has
// resolved, matching the Executive Directive's own top-to-bottom
// diagram and its "no shortcut should bypass mandatory approvals"
// instruction literally.
export function currentActionableStage(clearanceRows) {
  const sorted = [...clearanceRows].sort((a, b) => a.sequence_position - b.sequence_position);
  return sorted.find((r) => r.status === 'pending' || r.status === 'correction_requested') || null;
}

export function isChainComplete(clearanceRows) {
  return clearanceRows.every((r) => !r.is_blocking || r.status === 'cleared' || r.status === 'not_applicable');
}

// Resolves whether `staffId` may decide `stageCode` right now, and the
// student's institution for institution-scoped role checks.
export async function canDecideStage(sql, staffId, stageCode, institutionId) {
  const stage = STAGE_BY_CODE[stageCode];
  if (!stage) return false;
  if (stage.authType === 'office') {
    const officeId = await resolveOfficeId(sql, stage.officeSlug);
    if (officeId == null) return false;
    return staffCanActOnOffice(sql, staffId, officeId);
  }
  if (stage.authType === 'area') {
    const grant = await hasPermissionFor(sql, staffId, stage.areaCode, stage.permissionCode, institutionId ?? null);
    return grant.granted;
  }
  return false; // 'auto' stages are never manually decided
}

async function loadRecordContext(sql, graduationRecordId) {
  const res = await sql`
    SELECT gr.*, s.full_name, s.admission_no, s.id AS student_id, c.institution AS institution_name, ci.id AS institution_id
    FROM graduation_records gr
    JOIN students s ON s.id = gr.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE gr.id = ${graduationRecordId}`;
  return res.rows[0] || null;
}

// A real, non-blocking signal for the Finance stage: any invoice for
// this student that is not fully paid and not cancelled. Surfaced to
// the Finance Officer as information, not as an automatic block —
// Finance can still clear with a note (e.g. a payment plan in good
// standing) but never clears blind.
export async function financeSignal(sql, studentId) {
  const res = await sql`
    SELECT invoice_no, term, total_amount, status FROM invoices
    WHERE student_id = ${studentId} AND status IN ('unpaid', 'partial')
    ORDER BY due_date ASC NULLS LAST`;
  return res.rows;
}

// A real signal for Disciplinary Clearance: any open/under-investigation
// case that isn't a commendation (a positive record never blocks
// clearance). Backed by the new Disciplinary Register
// (disciplinary_cases) — even though today every case is entered
// manually, the office deciding this stage now sees actual case data,
// not a blind checkbox.
export async function disciplinarySignal(sql, studentId) {
  const res = await sql`
    SELECT id, case_type, severity, status, description, reported_at FROM disciplinary_cases
    WHERE student_id = ${studentId} AND status IN ('open', 'under_investigation') AND case_type != 'commendation'
    ORDER BY reported_at DESC`;
  return res.rows;
}

// A real signal for Library Clearance, backed by the new library_loans
// register — built ahead of any actual library catalogue system, per
// the Conditional Approval directive's item 4. Empty today for every
// student (no loans have been recorded yet); becomes real automatically
// the moment the Library begins recording loans.
export async function librarySignal(sql, studentId) {
  const res = await sql`
    SELECT id, item_title, status, due_at, fine_amount, fine_paid FROM library_loans
    WHERE student_id = ${studentId} AND (status IN ('on_loan', 'overdue', 'lost') OR (fine_amount > 0 AND fine_paid = false))
    ORDER BY borrowed_at DESC`;
  return res.rows;
}

// A real, composite signal for ICT Clearance covering everything named
// in the Conditional Approval directive's item 5: institutional email
// and portal account status are read directly from the existing,
// live student/guardian/auth records (never duplicated into a second
// table that could drift out of sync); issued devices, the ID card,
// and other access credentials are read from the new issued_devices
// register.
export async function ictSignal(sql, studentId) {
  const [deviceRes, studentRes] = await Promise.all([
    sql`SELECT id, asset_type, description, status FROM issued_devices WHERE student_id = ${studentId} AND status = 'issued' ORDER BY issued_at DESC`,
    sql`SELECT identity_no, status FROM students WHERE id = ${studentId}`,
  ]);
  const student = studentRes.rows[0] || {};
  return {
    outstandingAssets: deviceRes.rows,
    hasIdentityCard: !!student.identity_no,
    portalAccountStatus: student.status || null,
  };
}

// Which staff members are currently authorised to decide `stage` — the
// same computation used for two purposes: (1) who to notify when the
// stage becomes actionable, and (2) whether the stage is genuinely
// VACANT (no current holder at all) versus merely "not yet decided" —
// exported so functions/api/portal/staff/graduation-clearances.js can
// surface an honest "Vacant — Awaiting Appointment" state per the
// Conditional Approval directive's item 1, rather than a silently
// empty queue that looks identical to "someone just hasn't acted yet."
export async function recipientsForStage(sql, stage, institutionId) {
  if (stage.authType === 'office') {
    const officeId = await resolveOfficeId(sql, stage.officeSlug);
    return officeId == null ? [] : staffForOffice(sql, officeId);
  }
  if (stage.authType === 'area') {
    if (stage.areaCode === 'finance') return staffForRole(sql, 'FIN', null);
    if (stage.areaCode === 'behaviour') {
      const [vp, prin] = await Promise.all([staffForRole(sql, 'VP', null), staffForRole(sql, 'PRIN', institutionId)]);
      return [...new Set([...vp, ...prin])];
    }
    if (stage.roleCodeHint) return staffForRole(sql, stage.roleCodeHint, stage.code === 'principal' ? institutionId : null);
  }
  return [];
}

// Dashboard Integration (Conditional Approval directive item 6): the
// same "my queue" computation graduation-clearances.js's GET (no
// params) branch uses, scoped to a specific subset of stage codes —
// so a departmental office portal (Academic Affairs, Examinations,
// Finance, Library, ICT, a Principal's own office, the Executive
// office) can show its OWN graduation tasks inline, natively, rather
// than sending staff to the central Graduation Control Centre for
// every decision. See functions/api/portal/staff/office/[slug].js's
// OFFICE_GRADUATION_STAGES for which office maps to which stage(s).
export async function queueForStageCodes(sql, staffId, stageCodes) {
  if (!stageCodes || !stageCodes.length) return [];
  // Deliberately NOT filtered by stage_code in the WHERE clause: every
  // non-registry stage starts 'pending' at initializeClearanceChain(),
  // so filtering on stage_code before DISTINCT ON would surface a
  // later office's stage (e.g. Finance) before earlier blocking stages
  // (e.g. Academic, Examinations) have actually cleared. Computing the
  // true currently-actionable stage per record first (lowest
  // sequence_position still pending/correction_requested — the same
  // rule currentActionableStage() applies) and filtering to
  // `stageCodes` AFTER that is what keeps this office's queue honest.
  const res = await sql`
    SELECT DISTINCT ON (gc.graduation_record_id)
      gc.graduation_record_id, gc.stage_code, gc.status,
      gr.full_name, gr.preferred_certificate_name, gr.graduation_session, s.admission_no,
      c.institution AS institution_name, ci.id AS institution_id
    FROM graduation_clearances gc
    JOIN graduation_records gr ON gr.id = gc.graduation_record_id
    JOIN students s ON s.id = gr.student_id
    LEFT JOIN classes c ON c.id = s.class_id
    LEFT JOIN institutions ci ON ci.name = c.institution
    WHERE gc.status IN ('pending', 'correction_requested')
    ORDER BY gc.graduation_record_id, gc.sequence_position ASC`;

  const mine = [];
  for (const row of res.rows) {
    if (!stageCodes.includes(row.stage_code)) continue;
    if (await canDecideStage(sql, staffId, row.stage_code, row.institution_id ?? null)) {
      mine.push({
        recordId: row.graduation_record_id, fullName: row.full_name, preferredCertificateName: row.preferred_certificate_name,
        admissionNo: row.admission_no, institutionName: row.institution_name, graduationSession: row.graduation_session,
        stageCode: row.stage_code, stageLabel: STAGE_BY_CODE[row.stage_code]?.label || row.stage_code, status: row.status,
      });
    }
  }
  return mine;
}

async function notifyNextActionableStage(sql, graduationRecordId) {
  const [record, rows] = await Promise.all([loadRecordContext(sql, graduationRecordId), getClearances(sql, graduationRecordId)]);
  if (!record) return;
  const next = currentActionableStage(rows);
  if (!next) return;
  const stage = STAGE_BY_CODE[next.stage_code];
  if (!stage || stage.authType === 'auto') return;
  const recipients = await recipientsForStage(sql, stage, record.institution_id ?? null);
  if (!recipients.length) return;
  await notifyStaffMany(sql, recipients, {
    category: 'graduation_clearance',
    title: `Graduation clearance pending — ${stage.label}`,
    message: `${record.full_name} (${record.admission_no || 'no admission no.'}) is awaiting the ${stage.label} clearance.`,
    targetType: 'graduation_clearance', targetId: graduationRecordId,
    actionUrl: '/portal/staff/graduation-control/',
  });
}

// The one function every graduation-clearance-deciding endpoint calls.
// `action`: 'clear' | 'request_correction' | 'return_to_stage' |
// 'escalate_to_founder'. `auditContext` (optional, { ipAddress,
// userAgent } — see functions/_lib/audit.js's requestAuditContext())
// is threaded through to every logStaffEvent call so the audit trail
// records who/where/what-browser, not just who/what. Returns { ok, ... }
// or { error }.
export async function decideStage(sql, env, { graduationRecordId, stageCode, decidingStaffId, action, note, targetStageCode, auditContext }) {
  const ctx = auditContext || {};
  const record = await loadRecordContext(sql, graduationRecordId);
  if (!record) return { error: 'No graduation record found.' };

  if (action === 'escalate_to_founder') {
    const [canEdit, canApprove] = await Promise.all([
      hasPermissionFor(sql, decidingStaffId, 'graduation_records', 'E', record.institution_id ?? null),
      hasPermissionFor(sql, decidingStaffId, 'graduation_records', 'A', record.institution_id ?? null),
    ]);
    if (!canEdit.granted && !canApprove.granted) {
      return { error: 'Your role does not have authority to escalate a graduation record to the Founder.' };
    }
    const wasLocked = record.status === 'locked';
    await sql`
      UPDATE graduation_records SET requires_founder_review = true, founder_review_reason = ${note || null},
        status = ${wasLocked ? 'verified' : record.status}, locked_by_staff_id = ${wasLocked ? null : record.locked_by_staff_id}, locked_at = ${wasLocked ? null : record.locked_at},
        updated_at = now()
      WHERE id = ${graduationRecordId}`;
    await sql`
      UPDATE graduation_clearances SET status = 'pending', is_blocking = true, updated_at = now()
      WHERE graduation_record_id = ${graduationRecordId} AND stage_code = 'founder' AND status = 'not_applicable'`;
    await logStaffEvent(sql, {
      actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_clearance', targetId: graduationRecordId,
      reason: note || null, metadata: { action: 'escalate_to_founder', reopenedFromLocked: wasLocked },
      ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
      previousValue: { requiresFounderReview: false }, newValue: { requiresFounderReview: true, founderReviewReason: note || null },
    });
    await notifyNextActionableStage(sql, graduationRecordId);
    return { ok: true, escalated: true, reopenedFromLocked: wasLocked };
  }

  const rows = await getClearances(sql, graduationRecordId);
  const current = rows.find((r) => r.stage_code === stageCode);
  if (!current) return { error: 'No such clearance stage on this record.' };
  const actionable = currentActionableStage(rows);
  if (!actionable || actionable.stage_code !== stageCode) {
    return { error: `This stage is not currently actionable — earlier stages must clear first, or it has already been decided.` };
  }

  const canDecide = await canDecideStage(sql, decidingStaffId, stageCode, record.institution_id ?? null);
  if (!canDecide) return { error: 'Your role does not have authority to decide this clearance stage.' };

  if (action === 'clear') {
    await sql`
      UPDATE graduation_clearances SET status = 'cleared', decided_by_staff_id = ${decidingStaffId}, decision_note = ${note || null}, decided_at = now(), updated_at = now()
      WHERE id = ${current.id}`;
    await logStaffEvent(sql, {
      actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_clearance', targetId: graduationRecordId,
      reason: note || null, metadata: { action: 'clear', stage: stageCode },
      ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
      previousValue: { stage: stageCode, status: current.status }, newValue: { stage: stageCode, status: 'cleared' },
    });

    const updatedRows = await getClearances(sql, graduationRecordId);
    if (isChainComplete(updatedRows)) {
      await sql`UPDATE graduation_records SET status = 'locked', locked_by_staff_id = ${decidingStaffId}, locked_at = now(), updated_at = now() WHERE id = ${graduationRecordId}`;
      await logStaffEvent(sql, {
        actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_record', targetId: graduationRecordId,
        reason: 'All institutional clearances complete.', metadata: { action: 'document_lock' },
        ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
        previousValue: { status: record.status }, newValue: { status: 'locked' },
      });
      if (record.submitted_by_guardian_id) {
        await notifyGuardian(sql, record.submitted_by_guardian_id, `${record.full_name}'s graduation record has completed every institutional clearance and is now locked — ready for document generation.`);
      }
      return { ok: true, status: 'cleared', chainComplete: true };
    }

    await notifyNextActionableStage(sql, graduationRecordId);
    return { ok: true, status: 'cleared', chainComplete: false };
  }

  if (action === 'request_correction') {
    if (!note || !note.trim()) return { error: 'A correction note is required.' };
    await sql`
      UPDATE graduation_clearances SET status = 'correction_requested', decided_by_staff_id = ${decidingStaffId}, decision_note = ${note}, decided_at = now(), updated_at = now()
      WHERE id = ${current.id}`;
    await sql`
      UPDATE graduation_clearances SET status = 'pending', decided_by_staff_id = NULL, decision_note = NULL, decided_at = NULL, updated_at = now()
      WHERE graduation_record_id = ${graduationRecordId} AND sequence_position > ${current.sequence_position} AND status = 'cleared'`;
    await sql`
      UPDATE graduation_records SET status = 'under_review', correction_note = ${note}, updated_at = now()
      WHERE id = ${graduationRecordId}`;
    await logStaffEvent(sql, {
      actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_clearance', targetId: graduationRecordId,
      reason: note, metadata: { action: 'request_correction', stage: stageCode },
      ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
      previousValue: { stage: stageCode, status: current.status }, newValue: { stage: stageCode, status: 'correction_requested' },
    });
    if (record.submitted_by_guardian_id) {
      await notifyGuardian(sql, record.submitted_by_guardian_id, `The ${STAGE_BY_CODE[stageCode]?.label || stageCode} office has requested a correction on ${record.full_name}'s graduation record: "${note}"`);
      if (record.contact_email) {
        await notifyEmail(env, {
          to: record.contact_email, subject: 'Correction needed — Graduation Information Form',
          heading: 'A correction has been requested',
          bodyLines: [`The ${STAGE_BY_CODE[stageCode]?.label || stageCode} office reviewing ${record.full_name}'s graduation record has asked for a correction:`, `"${note}"`, 'Please sign in to the portal to update and resubmit.'],
          ctaLabel: 'Open the Graduation Form', ctaUrl: '/portal/graduation/',
        });
      }
    }
    return { ok: true, status: 'correction_requested' };
  }

  if (action === 'return_to_stage') {
    const target = rows.find((r) => r.stage_code === targetStageCode);
    if (!target || target.sequence_position >= current.sequence_position) {
      return { error: 'targetStageCode must name an earlier stage in the chain.' };
    }
    if (!note || !note.trim()) return { error: 'A reason is required to return this record to an earlier stage.' };
    await sql`
      UPDATE graduation_clearances SET status = 'pending', decided_by_staff_id = NULL, decision_note = NULL, decided_at = NULL, updated_at = now()
      WHERE graduation_record_id = ${graduationRecordId} AND sequence_position >= ${target.sequence_position} AND sequence_position <= ${current.sequence_position}`;
    await logStaffEvent(sql, {
      actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_clearance', targetId: graduationRecordId,
      reason: note, metadata: { action: 'return_to_stage', fromStage: stageCode, toStage: targetStageCode },
      ipAddress: ctx.ipAddress, userAgent: ctx.userAgent,
      previousValue: { stage: stageCode, status: current.status }, newValue: { returnedTo: targetStageCode },
    });
    await notifyNextActionableStage(sql, graduationRecordId);
    return { ok: true, status: 'returned', returnedTo: targetStageCode };
  }

  return { error: 'Unknown action.' };
}

// Bulk approval (Conditional Approval directive item 9) — decides the
// SAME stage/action across many records in one call, while every
// individual decision still runs through decideStage() and therefore
// still gets its own, individually-traceable staff_audit_log entry.
// There is no separate "bulk audit event" that could hide what
// actually happened to each record — bulk is a convenience for the
// caller, never a shortcut in what gets recorded.
export async function bulkDecideStage(sql, env, { graduationRecordIds, stageCode, decidingStaffId, action, note, auditContext }) {
  const results = [];
  for (const graduationRecordId of graduationRecordIds) {
    const result = await decideStage(sql, env, { graduationRecordId, stageCode, decidingStaffId, action, note, auditContext });
    results.push({ graduationRecordId, ...result });
  }
  return results;
}

export { requestAuditContext };
