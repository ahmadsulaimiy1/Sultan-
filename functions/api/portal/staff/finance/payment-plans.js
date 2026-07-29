// Finance Officer: instalment plans (Imperial Digital Campus
// Directive, Priority 3) — "Allow monthly / termly / annual" per the
// directive. Instalment amounts are split as evenly as possible across
// the plan's invoice balance, with any leftover kobo/naira folded into
// the final instalment so the sum always reconciles exactly to the
// invoice total. Marking an instalment paid is a manual Finance
// Officer action performed when recording the matching receipt
// (functions/api/portal/staff/finance/receipts.js) — there is no
// payment gateway to auto-detect which instalment a transfer covers.
import { getSql } from '../../../../_lib/db.js';
import { readStaffSessionFromRequest } from '../../../../_lib/session.js';
import { json, readJsonBody } from '../../../../_lib/http.js';
import { hasPermissionFor } from '../../../../_lib/permissions.js';
import { logStaffEvent } from '../../../../_lib/audit.js';

async function requireStaffSession(request, env) {
  if (!env.SESSION_SECRET) return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  let session;
  try {
    session = readStaffSessionFromRequest(request, env.SESSION_SECRET);
  } catch (err) {
    return { error: json({ error: 'Portal is not configured yet.' }, 500) };
  }
  if (!session) return { error: json({ error: 'Not signed in.' }, 401) };
  return { staffId: session.staffId };
}

function addMonths(dateStr, months) {
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export async function onRequestGet({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const grant = await hasPermissionFor(sql, staffId, 'finance', 'V', null);
  if (!grant.granted) {
    return json({ error: "Your role does not have authority to view payment plans. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
  }

  const url = new URL(request.url);
  const invoiceId = Number(url.searchParams.get('invoiceId'));
  if (!invoiceId) return json({ error: 'invoiceId query parameter is required.' }, 400);

  try {
    const planRes = await sql`SELECT * FROM payment_plans WHERE invoice_id = ${invoiceId}`;
    const plan = planRes.rows[0];
    if (!plan) return json({ plan: null, installments: [] });

    const installmentsRes = await sql`SELECT * FROM payment_plan_installments WHERE payment_plan_id = ${plan.id} ORDER BY sequence`;
    return json({
      plan: { id: plan.id, invoiceId: plan.invoice_id, planType: plan.plan_type, installmentCount: plan.installment_count, createdAt: plan.created_at },
      installments: installmentsRes.rows.map((i) => ({
        id: i.id, sequence: i.sequence, dueDate: i.due_date, amount: Number(i.amount), status: i.status, paidReceiptId: i.paid_receipt_id,
      })),
    });
  } catch (err) {
    console.error('payment-plans read error', err);
    return json({ error: 'Could not load that payment plan: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const { staffId, error } = await requireStaffSession(request, env);
  if (error) return error;
  const sql = getSql(env);
  if (!sql) return json({ error: 'Portal is not configured yet — no database is linked.' }, 500);

  const body = await readJsonBody(request);
  const invoiceId = Number(body.invoiceId);
  const planType = ['monthly', 'termly', 'custom'].includes(body.planType) ? body.planType : 'monthly';
  const installmentCount = Number(body.installmentCount);
  const firstDueDate = body.firstDueDate;
  if (!invoiceId || !(installmentCount >= 2) || !firstDueDate) {
    return json({ error: 'invoiceId, an installmentCount of at least 2, and firstDueDate are required.' }, 400);
  }

  try {
    const grant = await hasPermissionFor(sql, staffId, 'finance', 'C', null);
    if (!grant.granted) {
      return json({ error: "Your role does not have authority to set up payment plans. This is a Finance Officer function — no Finance Officer account has been issued yet. See docs/finance-platform.md." }, 403);
    }

    const invoiceRes = await sql`SELECT total_amount, status FROM invoices WHERE id = ${invoiceId}`;
    const invoice = invoiceRes.rows[0];
    if (!invoice) return json({ error: 'No invoice found with that id.' }, 404);
    if (invoice.status === 'cancelled') return json({ error: 'This invoice was cancelled — a payment plan cannot be created for it.' }, 400);

    const existing = await sql`SELECT id FROM payment_plans WHERE invoice_id = ${invoiceId}`;
    if (existing.rows.length) return json({ error: 'A payment plan already exists for this invoice.' }, 400);

    const total = Number(invoice.total_amount);
    const baseAmount = Math.floor((total / installmentCount) * 100) / 100;
    const lastAmount = Math.round((total - baseAmount * (installmentCount - 1)) * 100) / 100;

    const planRes = await sql`
      INSERT INTO payment_plans (invoice_id, plan_type, installment_count, created_by_staff_id)
      VALUES (${invoiceId}, ${planType}, ${installmentCount}, ${staffId})
      RETURNING id`;
    const planId = planRes.rows[0].id;

    const monthStep = planType === 'termly' ? 4 : 1; // termly ≈ every 4 months; monthly/custom step by 1
    for (let seq = 1; seq <= installmentCount; seq++) {
      const dueDate = addMonths(firstDueDate, (seq - 1) * monthStep);
      const amount = seq === installmentCount ? lastAmount : baseAmount;
      await sql`
        INSERT INTO payment_plan_installments (payment_plan_id, sequence, due_date, amount)
        VALUES (${planId}, ${seq}, ${dueDate}, ${amount})`;
    }

    await logStaffEvent(sql, {
      actorStaffId: staffId, eventType: 'sensitive_action', targetType: 'payment_plan', targetId: planId,
      reason: body.reason || null, metadata: { invoiceId, planType, installmentCount, firstDueDate },
    });

    return json({ ok: true, planId });
  } catch (err) {
    console.error('payment-plans write error', err);
    return json({ error: 'Could not save that payment plan: ' + (err && err.message ? err.message : 'unknown error') }, 500);
  }
}
