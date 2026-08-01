// Graduation Approval Workflow — the "Smart Approval Engine" the
// Executive Directive (proceed-to-Stage-2) asked for: an ordered,
// multi-office clearance chain that no document generation stage may
// bypass. This is the sequencing/state-machine layer functions/_lib/
// approvals.js does not provide (that file is a single-step, two-party
// primitive — see the design note above CREATE TABLE graduation_
// clearances in sql/schema.sql for the full audit that established
// this).
//
// STAGE_DEFINITIONS is the one place that names who may decide each
// stage. Two authorisation shapes are used, both reusing existing,
// audited mechanisms rather than inventing a third:
//   - authType: 'role'   — functions/_lib/permissions.js's
//                          hasPermissionFor(sql, staffId, areaCode,
//                          permissionCode, institutionId). Used where a
//                          real role with real grants already exists
//                          (REG, FIN, PRIN/behaviour's VP+PRIN, EXE) or
//                          where the Executive Directive named an
//                          authority this codebase genuinely has no
//                          appointee for yet (VPAC, VPAD — both
//                          'proposed' roles with zero staff_roles
//                          grants until someone appoints one via the
//                          existing Institutional Administration
//                          Centre; see docs/shrs-graduation-
//                          documentation-system-architecture.md).
//   - authType: 'office' — functions/_lib/office-access.js's
//                          staffCanActOnOffice(sql, staffId, officeId).
//                          Used for offices that are real rows in
//                          `offices` (Academic Affairs, Examinations,
//                          Library, ICT) but have no dedicated
//                          permission-matrix role and, per the current
//                          seed data, no appointed staff either — the
//                          same honest "vacant until appointed"
//                          situation, using the mechanism this
//                          codebase already built for exactly this
//                          (Institutional Messaging's office routing).
//
// 'registry' is authorised automatically the moment Registry marks a
// graduation_records row 'verified' (functions/api/portal/staff/
// registrar/graduation.js's mark_verified action calls
// initializeClearanceChain() below) — Registry does not click twice
// for the same meaning.
//
// 'library' is is_blocking: false and initialised 'not_applicable'
// because, per the Library office's own seed description, "No library
// catalogue system exists yet" — this is the literal, honest reading
// of the Executive Directive's own "(future-ready)" label: the stage
// is real and present in the chain (and can still be manually cleared
// by a future Library appointee, for their own record-keeping) but
// never blocks completion until a real catalogue exists to check
// against.
//
// 'founder' is conditional: only blocking when graduation_records.
// requires_founder_review is true. No specific Governance Charter
// article mandates Founder sign-off on an ordinary graduation — this
// project sets the flag automatically when the graduate carries a
// named award (any *_awards/other_honours field is non-empty) or a
// Registry/Principal staff member explicitly escalates via the
// escalate_to_founder action. This is a documented interpretation,
// flagged here and in the architecture doc for the client to confirm
// or override — not a claimed citation.
import { hasPermissionFor } from './permissions.js';
import { staffCanActOnOffice } from './office-access.js';
import { logStaffEvent } from './audit.js';
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
    code: 'finance', label: 'Finance & Accounts', sequence: 4, isBlocking: true, authType: 'area', areaCode: 'finance', permissionCode: 'E',
    description: 'Confirms fees are cleared. The queue surfaces any real outstanding invoice for this student automatically.',
  },
  {
    code: 'disciplinary', label: 'Disciplinary Clearance', sequence: 5, isBlocking: true, authType: 'area', areaCode: 'behaviour', permissionCode: 'A',
    description: "Confirms no unresolved conduct matter — decided by whoever holds the existing Behaviour Management authority (VP Administration or the student's Principal).",
  },
  {
    code: 'library', label: 'Library Clearance', sequence: 6, isBlocking: false, authType: 'office', officeSlug: 'library',
    description: 'No library catalogue system exists yet (confirmed in the Library office\'s own record) — this stage is present and future-ready but never blocks completion today.',
  },
  {
    code: 'ict', label: 'ICT Clearance', sequence: 7, isBlocking: true, authType: 'office', officeSlug: 'digital-services',
    description: 'Confirms no outstanding institutional equipment/system-access matter.',
  },
  {
    code: 'principal', label: 'Principal', sequence: 8, isBlocking: true, authType: 'area', areaCode: 'graduation_records', permissionCode: 'A', institutionScoped: true,
    description: "The student's own Principal/Head Teacher/Ra'ees/Mudeer final academic-leadership sign-off.",
  },
  {
    code: 'vp_academic', label: 'Vice Principal (Academic)', sequence: 9, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'VPAC',
    description: 'Vice Principal (Academic) sign-off. Role defined, no appointment holder yet — see the Institutional Administration Centre to appoint one.',
  },
  {
    code: 'vp_administration', label: 'Vice Principal (Administration)', sequence: 10, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'VPAD',
    description: 'Vice Principal (Administration) sign-off. Role defined, no appointment holder yet — see the Institutional Administration Centre to appoint one.',
  },
  {
    code: 'founder', label: 'Founder & CEO', sequence: 11, isBlocking: true, authType: 'area', areaCode: 'graduation_clearances', permissionCode: 'A', roleCodeHint: 'EXE', conditional: true,
    description: 'Founder & CEO review — only required for graduates flagged requires_founder_review (a named award, or an explicit escalation).',
  },
];

const STAGE_BY_CODE = Object.fromEntries(STAGE_DEFINITIONS.map((s) => [s.code, s]));

async function resolveOfficeId(sql, slug) {
  const res = await sql`SELECT id FROM offices WHERE slug = ${slug}`;
  return res.rows[0] ? res.rows[0].id : null;
}

// Creates the full ordered set of graduation_clearances rows for a
// record — called once, the moment Registry marks the record
// 'verified'. Idempotent (ON CONFLICT DO NOTHING keyed on the unique
// (graduation_record_id, stage_code) pair) so re-verifying an already-
// initialised record is harmless.
export async function initializeClearanceChain(sql, { graduationRecordId, verifiedByStaffId, requiresFounderReview }) {
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
      if (!requiresFounderReview) { status = 'not_applicable'; isBlocking = false; }
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

async function recipientsForStage(sql, stage, institutionId) {
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
// 'escalate_to_founder'. Returns { ok, ... } or { error }.
export async function decideStage(sql, env, { graduationRecordId, stageCode, decidingStaffId, action, note, targetStageCode }) {
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
    });

    const updatedRows = await getClearances(sql, graduationRecordId);
    if (isChainComplete(updatedRows)) {
      await sql`UPDATE graduation_records SET status = 'locked', locked_by_staff_id = ${decidingStaffId}, locked_at = now(), updated_at = now() WHERE id = ${graduationRecordId}`;
      await logStaffEvent(sql, {
        actorStaffId: decidingStaffId, eventType: 'sensitive_action', targetType: 'graduation_record', targetId: graduationRecordId,
        reason: 'All institutional clearances complete.', metadata: { action: 'document_lock' },
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
    });
    await notifyNextActionableStage(sql, graduationRecordId);
    return { ok: true, status: 'returned', returnedTo: targetStageCode };
  }

  return { error: 'Unknown action.' };
}

export { STAGE_BY_CODE };
