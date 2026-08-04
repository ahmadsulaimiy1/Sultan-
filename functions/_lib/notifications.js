// Staff Notifications — genuinely new (confirmed by audit before this
// file was written: the existing `notifications` table is guardian-
// only, and no staff notification feed or helper existed anywhere in
// this codebase). Mirrors that table's own minimalism rather than
// inventing a heavier system — see sql/schema.sql's comment on
// `staff_notifications` for the full reasoning, especially on 'sms'/
// 'whatsapp' being accepted-but-never-sent channel values: recording
// the intent now means a real provider can be added later with zero
// changes to any calling code, but no message is delivered via those
// two channels today. Every function here is best-effort and never
// throws — a notification failure must never break the workflow
// action that triggered it, the same discipline functions/_lib/
// email.js's sendEmail() and web-push.js's sendWebPush() already
// follow.
import { sendEmail } from './email.js';

export async function notifyStaff(sql, { staffId, category, title, message, targetType, targetId, actionUrl }) {
  try {
    await sql`
      INSERT INTO staff_notifications (staff_id, category, title, message, target_type, target_id, action_url, channel)
      VALUES (${staffId}, ${category}, ${title}, ${message}, ${targetType ?? null}, ${targetId ?? null}, ${actionUrl ?? null}, 'portal')`;
    return { sent: true };
  } catch (err) {
    console.error('notifyStaff error', err);
    return { sent: false, reason: 'error' };
  }
}

// Notifies every staff member currently able to act on `staffIds` —
// callers resolve the actual recipient list (by office or by role)
// before calling this; kept dumb on purpose so it has no opinion about
// who "should" be notified, only about how a notification is recorded.
export async function notifyStaffMany(sql, staffIds, fields) {
  const results = await Promise.all(staffIds.map((staffId) => notifyStaff(sql, { ...fields, staffId })));
  return results.filter((r) => r.sent).length;
}

export async function staffForOffice(sql, officeId) {
  const res = await sql`
    SELECT DISTINCT staff_id FROM (
      SELECT staff_id FROM office_appointments WHERE office_id = ${officeId} AND ended_at IS NULL
      UNION
      SELECT staff_id FROM staff_roles WHERE office_id = ${officeId} AND is_active = true AND revoked_at IS NULL
      UNION
      SELECT delegate_staff_id AS staff_id FROM delegations WHERE office_id = ${officeId} AND revoked_at IS NULL AND now() BETWEEN starts_at AND ends_at
    ) x`;
  return res.rows.map((r) => r.staff_id);
}

export async function staffForRole(sql, roleCode, institutionId) {
  const res = institutionId != null
    ? await sql`SELECT DISTINCT staff_id FROM staff_roles WHERE role_code = ${roleCode} AND is_active = true AND revoked_at IS NULL AND (institution_id = ${institutionId} OR institution_id IS NULL)`
    : await sql`SELECT DISTINCT staff_id FROM staff_roles WHERE role_code = ${roleCode} AND is_active = true AND revoked_at IS NULL`;
  return res.rows.map((r) => r.staff_id);
}

// Reuses the EXISTING guardian-facing `notifications` table
// (sql/schema.sql — guardian_id, message, created_at, read_at) rather
// than building a second guardian notification system next to it.
export async function notifyGuardian(sql, guardianId, message) {
  try {
    await sql`INSERT INTO notifications (guardian_id, message) VALUES (${guardianId}, ${message})`;
    return { sent: true };
  } catch (err) {
    console.error('notifyGuardian error', err);
    return { sent: false, reason: 'error' };
  }
}

// Best-effort email alongside a portal notification. Never throws —
// sendEmail() itself already returns { sent: false, reason:
// 'not_configured' } rather than throwing when RESEND_API_KEY/
// EMAIL_FROM_ADDRESS aren't set (true in this project's sandbox), so
// this is honest about delivery without ever risking the caller's
// workflow action on an email provider being unavailable.
export async function notifyEmail(env, { to, subject, heading, bodyLines, ctaLabel, ctaUrl }) {
  if (!to) return { sent: false, reason: 'no_address' };
  const html = `
    <div style="font-family:'Georgia',serif;max-width:520px;margin:0 auto;padding:32px 28px;background:#FCFAF6;border:1px solid #E4D6B8;">
      <p style="font-size:0.68rem;letter-spacing:0.12em;text-transform:uppercase;color:#8a6d2f;margin:0 0 10px;">Sultan Hanafi Royal Schools — Graduation Approval Workflow</p>
      <h1 style="font-size:1.3rem;color:#1D1108;margin:0 0 16px;">${heading}</h1>
      ${bodyLines.map((line) => `<p style="font-size:0.92rem;color:#2b2116;line-height:1.6;margin:0 0 10px;">${line}</p>`).join('')}
      ${ctaUrl ? `<p style="margin:20px 0 0;"><a href="${ctaUrl}" style="display:inline-block;background:#1D1108;color:#E9CE8A;padding:10px 20px;text-decoration:none;font-size:0.82rem;letter-spacing:0.04em;">${ctaLabel || 'Open the Portal'}</a></p>` : ''}
    </div>`;
  const text = [heading, '', ...bodyLines, ctaUrl ? `\n${ctaLabel || 'Open the Portal'}: ${ctaUrl}` : ''].join('\n');
  try {
    return await sendEmail(env, { to, subject, html, text });
  } catch (err) {
    console.error('notifyEmail error', err);
    return { sent: false, reason: 'error' };
  }
}
