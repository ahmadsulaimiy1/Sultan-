// Shared "My Fees" renderer (Finance Platform, Imperial Digital Campus
// Directive Priority 3) — used by both the guardian dashboard (once
// per child) and the student's own dashboard, so a family sees the
// identical fee picture regardless of which portal they're in.
// Renders only real invoice/receipt data returned by
// functions/_lib/finance-summary.js — if a student has no invoices yet
// (the Finance Officer hasn't issued one), this shows nothing rather
// than a fabricated "no fees" state, leaving the legacy fee_status
// stat tile (still populated from the older single-snapshot system)
// as the only fee display for that student.
(function (global) {
  var STATUS_LABEL = { unpaid: 'Unpaid', partial: 'Partially Paid', paid: 'Paid', cancelled: 'Cancelled' };
  var METHOD_LABEL = { cash: 'Cash', bank_transfer: 'Bank Transfer', cheque: 'Cheque', pos: 'POS', other: 'Other' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatCurrency(n) {
    return '₦' + Number(n || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch (e) { return iso; }
  }

  function render(container, finance) {
    if (!container) return;
    if (!finance || !finance.invoices || !finance.invoices.length) {
      container.innerHTML = '';
      container.hidden = true;
      return;
    }
    container.hidden = false;

    var balanceHtml = '<div class="finance-balance-row">' +
      '<span class="label">Current Balance</span>' +
      '<span class="value' + (finance.currentBalance > 0 ? ' is-due' : ' is-clear') + '">' +
        (finance.currentBalance > 0 ? formatCurrency(finance.currentBalance) + ' due' : 'Paid in full') +
      '</span></div>';

    var scholarshipHtml = '';
    if (finance.scholarship) {
      var s = finance.scholarship;
      var desc = s.scholarshipType === 'full' ? 'Full Scholarship'
        : s.scholarshipType === 'sponsored' ? 'Sponsored' + (s.sponsorName ? ' by ' + esc(s.sponsorName) : '')
        : 'Partial Scholarship' + (s.discountPercent != null ? ' (' + s.discountPercent + '% off)' : s.discountAmount != null ? ' (' + formatCurrency(s.discountAmount) + ' off)' : '');
      scholarshipHtml = '<div class="finance-note is-scholarship">🎓 ' + desc + '</div>';
    }

    var planHtml = '';
    if (finance.paymentPlan && finance.paymentPlan.nextDueDate) {
      planHtml = '<div class="finance-note">Payment plan (' + esc(finance.paymentPlan.planType) + '): next instalment ' +
        formatCurrency(finance.paymentPlan.nextAmount) + ' due ' + formatDate(finance.paymentPlan.nextDueDate) + '</div>';
    }

    var invoicesHtml = '<div class="finance-section"><h4>Invoices</h4>' +
      finance.invoices.map(function (inv) {
        return '<div class="finance-invoice-row">' +
          '<span class="finance-invoice-no">' + esc(inv.invoiceNo) + '</span>' +
          '<span class="finance-invoice-term">' + esc(inv.term) + '</span>' +
          '<span class="finance-status-badge is-' + esc(inv.status) + '">' + esc(STATUS_LABEL[inv.status] || inv.status) + '</span>' +
          '<span class="finance-invoice-amount">' + formatCurrency(inv.totalAmount) + '</span>' +
        '</div>';
      }).join('') +
      '</div>';

    var receiptsHtml = '';
    if (finance.receipts && finance.receipts.length) {
      receiptsHtml = '<div class="finance-section"><h4>Payment History</h4>' +
        finance.receipts.filter(function (r) { return !r.revoked; }).map(function (r) {
          return '<div class="finance-receipt-row">' +
            '<a href="/verify-receipt/?ref=' + encodeURIComponent(r.receiptNo) + '" target="_blank" rel="noopener">' + esc(r.receiptNo) + '</a>' +
            '<span>' + formatCurrency(r.amount) + '</span>' +
            '<span>' + esc(METHOD_LABEL[r.paymentMethod] || r.paymentMethod) + '</span>' +
            '<span>' + formatDate(r.paidAt) + '</span>' +
          '</div>';
        }).join('') +
        '</div>';
    }

    container.innerHTML =
      '<div class="portal-child-head"><h2>My Fees</h2></div>' +
      '<div class="finance-summary">' + balanceHtml + scholarshipHtml + planHtml + invoicesHtml + receiptsHtml + '</div>';
  }

  global.SHRSFinance = { render: render };
})(window);
