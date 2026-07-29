// Finance Officer: Debtors & Ageing Report (Imperial Digital Campus
// Directive, Priority 3) — "The Founder Dashboard must show:
// Outstanding balances, Ageing reports, Collection performance." This
// is the Finance Office's own operational view of the same underlying
// data the Founder Dashboard aggregates (functions/api/portal/founder/
// dashboard.js) — a per-student list rather than institution-wide
// totals, since a Finance Officer needs to know WHO owes what, not
// just how much in aggregate.
//
// "Days overdue" is computed at query time from due_date, not a stored
// status — there is no cron/background-worker infrastructure in this
// project to flip a stored "overdue" flag on a schedule (same reasoning
// as functions/_lib/permissions.js's delegation-expiry comment), so a
// computed value can never silently fall out of date.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';

export async function onRequestGet({ request, env }) {
  if (!env.SESSION_SECRET) return json({ error: 'Portal is not configured yet.' }, 500);
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return json({ error: 'Portal is not configured yet.' }, 500);
  }
  if (!session) return json({ error: 'Not signed in.' }, 401);
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, session.staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view the debtors report. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  try {
    const rows = (await sql`
      SELECT
        i.id, i.invoice_no, i.term, i.due_date, i.total_amount,
        s.full_name AS student_full_name, s.admission_no,
        inst.name AS institution_name,
        COALESCE(r.paid, 0)::numeric AS amount_paid,
        CASE WHEN i.due_date IS NOT NULL THEN GREATEST(0, (CURRENT_DATE - i.due_date))::int ELSE NULL END AS days_overdue
      FROM invoices i
      JOIN students s ON s.id = i.student_id
      JOIN institutions inst ON inst.id = i.institution_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid FROM receipts WHERE revoked_at IS NULL GROUP BY invoice_id
      ) r ON r.invoice_id = i.id
      WHERE i.status IN ('unpaid', 'partial')
      ORDER BY days_overdue DESC NULLS LAST, i.due_date ASC NULLS LAST`).rows;

    const debtors = rows.map((r) => {
      const totalAmount = Number(r.total_amount);
      const amountPaid = Number(r.amount_paid);
      const balance = totalAmount - amountPaid;
      const daysOverdue = r.days_overdue;
      let bucket = 'not_yet_due';
      if (daysOverdue != null) {
        if (daysOverdue > 90) bucket = '90_plus';
        else if (daysOverdue > 60) bucket = '61_90';
        else if (daysOverdue > 30) bucket = '31_60';
        else if (daysOverdue > 0) bucket = '0_30';
      }
      return {
        invoiceId: r.id, invoiceNo: r.invoice_no, term: r.term, dueDate: r.due_date,
        studentFullName: r.student_full_name, admissionNo: r.admission_no, institutionName: r.institution_name,
        totalAmount, amountPaid, balance, daysOverdue, ageingBucket: bucket,
      };
    });

    const summary = { not_yet_due: 0, '0_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };
    debtors.forEach((d) => { summary[d.ageingBucket] += d.balance; });

    return json({ debtors, ageingSummary: summary, totalOutstanding: debtors.reduce((s, d) => s + d.balance, 0) });
  } catch (err) {
    console.error('debtors report error', err);
    return json({ error: 'Could not load the debtors report: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
