// Shared per-student Finance Platform summary (Imperial Digital
// Campus Directive, Priority 3) — used by both the guardian dashboard
// (functions/api/portal/me.js, once per child) and the student's own
// dashboard (functions/api/portal/student/me.js). Kept in one place so
// "what does a family see about their own fees" stays identical
// regardless of which portal they're viewing it from.
export async function loadStudentFinanceSummary(sql, studentId) {
  const [invoicesRes, scholarshipRes, receiptsRes] = await Promise.all([
    sql`
      SELECT i.*, COALESCE(r.paid, 0)::numeric AS amount_paid
      FROM invoices i
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid FROM receipts WHERE revoked_at IS NULL GROUP BY invoice_id
      ) r ON r.invoice_id = i.id
      WHERE i.student_id = ${studentId} AND i.status != 'cancelled'
      ORDER BY i.created_at DESC`,
    sql`
      SELECT * FROM scholarships
      WHERE student_id = ${studentId} AND is_active = true AND revoked_at IS NULL
      ORDER BY term NULLS LAST LIMIT 1`,
    sql`
      SELECT rc.receipt_no, rc.amount, rc.payment_method, rc.paid_at, rc.revoked_at, i.invoice_no
      FROM receipts rc JOIN invoices i ON i.id = rc.invoice_id
      WHERE i.student_id = ${studentId}
      ORDER BY rc.paid_at DESC LIMIT 20`,
  ]);

  const invoices = invoicesRes.rows.map((r) => ({
    id: r.id, invoiceNo: r.invoice_no, term: r.term, dueDate: r.due_date, status: r.status,
    totalAmount: Number(r.total_amount), scholarshipDiscount: Number(r.scholarship_discount),
    amountPaid: Number(r.amount_paid), balance: Number(r.total_amount) - Number(r.amount_paid),
  }));

  const currentBalance = invoices.reduce((sum, inv) => sum + Math.max(0, inv.balance), 0);

  const scholarshipRow = scholarshipRes.rows[0];
  const scholarship = scholarshipRow ? {
    scholarshipType: scholarshipRow.scholarship_type,
    discountPercent: scholarshipRow.discount_percent != null ? Number(scholarshipRow.discount_percent) : null,
    discountAmount: scholarshipRow.discount_amount != null ? Number(scholarshipRow.discount_amount) : null,
    sponsorName: scholarshipRow.sponsor_name,
  } : null;

  let paymentPlan = null;
  const activeInvoice = invoices.find((inv) => inv.status === 'unpaid' || inv.status === 'partial');
  if (activeInvoice) {
    const planRes = await sql`SELECT * FROM payment_plans WHERE invoice_id = ${activeInvoice.id}`;
    const plan = planRes.rows[0];
    if (plan) {
      const nextRes = await sql`
        SELECT * FROM payment_plan_installments
        WHERE payment_plan_id = ${plan.id} AND status != 'paid'
        ORDER BY sequence LIMIT 1`;
      const next = nextRes.rows[0];
      paymentPlan = {
        planType: plan.plan_type, installmentCount: plan.installment_count,
        nextDueDate: next ? next.due_date : null, nextAmount: next ? Number(next.amount) : null,
      };
    }
  }

  const receipts = receiptsRes.rows.map((r) => ({
    receiptNo: r.receipt_no, invoiceNo: r.invoice_no, amount: Number(r.amount),
    paymentMethod: r.payment_method, paidAt: r.paid_at, revoked: !!r.revoked_at,
  }));

  return { invoices, currentBalance, scholarship, paymentPlan, receipts };
}
