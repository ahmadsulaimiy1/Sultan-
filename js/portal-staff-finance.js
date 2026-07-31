(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatCurrency(amount){
    return '₦' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 0 });
  }

  function formatDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function showResult(el, ok, message){
    el.hidden = false;
    el.className = 'registrar-form-result ' + (ok ? 'is-ok' : 'is-error');
    el.textContent = message;
  }

  // --- Fee Structures ---
  var fsForm = document.querySelector('[data-fs-form]');
  var fsResultEl = document.querySelector('[data-fs-result]');
  var fsListEl = document.querySelector('[data-fs-list]');

  async function loadFeeStructures(){
    try{
      var res = await fetch('/api/portal/staff/finance/fee-structures');
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load fee structures.');
      fsListEl.innerHTML = '';
      if(!data.feeStructures.length){
        fsListEl.appendChild(el('p', 'portal-empty', 'No fee structures configured yet.'));
        return data.feeStructures;
      }
      var grouped = {};
      data.feeStructures.forEach(function(fs){
        var key = fs.institutionName + ' — ' + (fs.classLabel || 'Institution-wide') + ' — ' + fs.studentCategory;
        (grouped[key] = grouped[key] || []).push(fs);
      });
      Object.keys(grouped).forEach(function(key){
        var group = el('div', 'registrar-timeline-row');
        group.appendChild(el('div', 'registrar-timeline-type', key));
        grouped[key].forEach(function(fs){
          var row = el('div', 'finance-invoice-row');
          row.appendChild(el('span', 'finance-invoice-no', fs.label + (fs.applicableGender ? ' (' + fs.applicableGender + ' only)' : '')));
          row.appendChild(el('span', 'finance-invoice-amount', formatCurrency(fs.amount)));
          group.appendChild(row);
        });
        fsListEl.appendChild(group);
      });
      return data.feeStructures;
    }catch(err){
      fsListEl.innerHTML = '';
      fsListEl.appendChild(el('p', 'portal-empty', (err && err.message) || 'Could not load fee structures.'));
      return [];
    }
  }

  fsForm.addEventListener('submit', async function(e){
    e.preventDefault();
    try{
      var res = await fetch('/api/portal/staff/finance/fee-structures', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          institutionName: document.querySelector('[data-fs-institution]').value,
          classLabel: document.querySelector('[data-fs-class-label]').value,
          studentCategory: document.querySelector('[data-fs-category]').value,
          feeType: document.querySelector('[data-fs-fee-type]').value,
          label: document.querySelector('[data-fs-label]').value,
          amount: Number(document.querySelector('[data-fs-amount]').value),
          applicableGender: document.querySelector('[data-fs-gender]').value || null,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save that fee structure.');
      showResult(fsResultEl, true, 'Fee structure saved.');
      fsForm.reset();
      loadFeeStructures();
    }catch(err){
      showResult(fsResultEl, false, (err && err.message) || 'Could not save that fee structure.');
    }
  });

  // --- Create Invoice ---
  var invoiceLookupForm = document.querySelector('[data-invoice-lookup-form]');
  var invoiceFsChecklistEl = document.querySelector('[data-invoice-fs-checklist]');
  var invoiceForm = document.querySelector('[data-invoice-form]');
  var invoiceResultEl = document.querySelector('[data-invoice-result]');
  var currentInvoiceAdmissionNo = null;

  invoiceLookupForm.addEventListener('submit', async function(e){
    e.preventDefault();
    currentInvoiceAdmissionNo = document.querySelector('[data-invoice-admission-no]').value.trim();
    var category = document.querySelector('[data-invoice-category]').value;
    var allFs = await loadFeeStructures();
    var matches = allFs.filter(function(fs){ return fs.studentCategory === category; });
    invoiceFsChecklistEl.innerHTML = '';
    if(!matches.length){
      invoiceFsChecklistEl.appendChild(el('p', 'portal-empty', 'No fee structures configured for that category yet — add some above first.'));
      invoiceForm.hidden = true;
      return;
    }
    matches.forEach(function(fs){
      var label = el('label', null);
      label.style.display = 'flex'; label.style.gap = '8px'; label.style.alignItems = 'center'; label.style.padding = '4px 0';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = fs.id; cb.setAttribute('data-invoice-fs-checkbox', '');
      label.appendChild(cb);
      label.appendChild(document.createTextNode(fs.institutionName + ' · ' + (fs.classLabel || 'Institution-wide') + ' · ' + fs.label + ' — ' + formatCurrency(fs.amount) + (fs.applicableGender ? ' (' + fs.applicableGender + ' only)' : '')));
      invoiceFsChecklistEl.appendChild(label);
    });
    invoiceForm.hidden = false;
  });

  invoiceForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var feeStructureIds = Array.prototype.slice.call(document.querySelectorAll('[data-invoice-fs-checkbox]:checked')).map(function(cb){ return Number(cb.value); });
    var customLabel = document.querySelector('[data-invoice-custom-label]').value.trim();
    var customAmount = Number(document.querySelector('[data-invoice-custom-amount]').value);
    var customItems = customLabel && customAmount > 0 ? [{ label: customLabel, amount: customAmount, feeType: 'custom' }] : [];
    var category = document.querySelector('[data-invoice-category]').value;

    try{
      var res = await fetch('/api/portal/staff/finance/invoices', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'create', admissionNo: currentInvoiceAdmissionNo, term: document.querySelector('[data-invoice-term]').value,
          studentCategory: category, dueDate: document.querySelector('[data-invoice-due-date]').value || null,
          feeStructureIds: feeStructureIds, customItems: customItems,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not create that invoice.');
      showResult(invoiceResultEl, true, 'Invoice ' + data.invoiceNo + ' created — subtotal ' + formatCurrency(data.subtotal) +
        (data.scholarshipDiscount > 0 ? ', scholarship discount ' + formatCurrency(data.scholarshipDiscount) : '') +
        ', total ' + formatCurrency(data.totalAmount) + '.');
      invoiceForm.reset();
      invoiceForm.hidden = true;
      invoiceFsChecklistEl.innerHTML = '';
    }catch(err){
      showResult(invoiceResultEl, false, (err && err.message) || 'Could not create that invoice.');
    }
  });

  // --- Record Payment ---
  var receiptForm = document.querySelector('[data-receipt-form]');
  var receiptResultEl = document.querySelector('[data-receipt-result]');

  receiptForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var invoiceNo = document.querySelector('[data-receipt-invoice-no]').value.trim();
    try{
      var lookupRes = await fetch('/api/portal/staff/finance/invoices?status=unpaid');
      var lookupData = await lookupRes.json();
      var invoice = (lookupData.invoices || []).find(function(i){ return i.invoiceNo === invoiceNo; });
      if(!invoice){
        var lookupRes2 = await fetch('/api/portal/staff/finance/invoices?status=partial');
        var lookupData2 = await lookupRes2.json();
        invoice = (lookupData2.invoices || []).find(function(i){ return i.invoiceNo === invoiceNo; });
      }
      if(!invoice) throw new Error('No unpaid or partially-paid invoice found with that number.');

      var res = await fetch('/api/portal/staff/finance/receipts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'record', invoiceId: invoice.id,
          amount: Number(document.querySelector('[data-receipt-amount]').value),
          paymentMethod: document.querySelector('[data-receipt-method]').value,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not record that payment.');

      receiptResultEl.hidden = false;
      receiptResultEl.className = 'registrar-form-result is-ok registrar-cert-issued';
      var text = el('div', 'registrar-cert-issued-text');
      text.appendChild(el('strong', null, 'Receipt ' + data.receiptNo + ' generated.'));
      text.appendChild(document.createElement('br'));
      var link = document.createElement('a');
      link.href = data.verifyUrl; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = 'Public verification page →';
      text.appendChild(link);
      text.appendChild(document.createElement('br'));
      text.appendChild(document.createTextNode('Invoice status: ' + data.invoiceStatus));
      receiptResultEl.innerHTML = '';
      receiptResultEl.appendChild(text);
      var img = document.createElement('img');
      img.className = 'registrar-cert-qr'; img.width = 96; img.height = 96;
      img.src = data.qrUrl; img.alt = 'Receipt verification QR code';
      receiptResultEl.appendChild(img);
      receiptForm.reset();
    }catch(err){
      showResult(receiptResultEl, false, (err && err.message) || 'Could not record that payment.');
    }
  });

  // --- Scholarships ---
  var scholarshipForm = document.querySelector('[data-scholarship-form]');
  var scholarshipResultEl = document.querySelector('[data-scholarship-result]');

  scholarshipForm.addEventListener('submit', async function(e){
    e.preventDefault();
    try{
      var res = await fetch('/api/portal/staff/finance/scholarships', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'grant',
          admissionNo: document.querySelector('[data-scholarship-admission-no]').value.trim(),
          scholarshipType: document.querySelector('[data-scholarship-type]').value,
          discountPercent: document.querySelector('[data-scholarship-percent]').value ? Number(document.querySelector('[data-scholarship-percent]').value) : null,
          discountAmount: document.querySelector('[data-scholarship-amount]').value ? Number(document.querySelector('[data-scholarship-amount]').value) : null,
          sponsorName: document.querySelector('[data-scholarship-sponsor]').value || null,
          term: document.querySelector('[data-scholarship-term]').value || null,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not grant that scholarship.');
      showResult(scholarshipResultEl, true, 'Scholarship granted — it will apply to invoices created from now on.');
      scholarshipForm.reset();
    }catch(err){
      showResult(scholarshipResultEl, false, (err && err.message) || 'Could not grant that scholarship.');
    }
  });

  // --- Payment Plan ---
  var planForm = document.querySelector('[data-plan-form]');
  var planResultEl = document.querySelector('[data-plan-result]');

  planForm.addEventListener('submit', async function(e){
    e.preventDefault();
    try{
      var res = await fetch('/api/portal/staff/finance/payment-plans', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          invoiceId: Number(document.querySelector('[data-plan-invoice-id]').value),
          planType: document.querySelector('[data-plan-type]').value,
          installmentCount: Number(document.querySelector('[data-plan-count]').value),
          firstDueDate: document.querySelector('[data-plan-first-due]').value,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not create that payment plan.');
      showResult(planResultEl, true, 'Payment plan created.');
      planForm.reset();
    }catch(err){
      showResult(planResultEl, false, (err && err.message) || 'Could not create that payment plan.');
    }
  });

  // --- Debtors & Ageing Report ---
  var debtorsSummaryEl = document.querySelector('[data-debtors-summary]');
  var debtorsListEl = document.querySelector('[data-debtors-list]');
  var debtorsRefreshBtn = document.querySelector('[data-debtors-refresh]');
  var revenueSummaryEl = document.querySelector('[data-revenue-summary]');
  var executiveAlertsEl = document.querySelector('[data-executive-alerts]');

  var AGEING_LABEL = { not_yet_due: 'Not Yet Due', '0_30': '0–30 Days', '31_60': '31–60 Days', '61_90': '61–90 Days', '90_plus': '90+ Days' };

  function statTile(label, value){
    var tile = el('div', 'portal-stat');
    tile.appendChild(el('div', 'label', label));
    tile.appendChild(el('div', 'value', value));
    return tile;
  }

  async function loadDebtors(){
    try{
      var res = await fetch('/api/portal/staff/finance/debtors');
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load the debtors report.');

      debtorsSummaryEl.innerHTML = '';
      debtorsSummaryEl.appendChild(statTile('Total Outstanding', formatCurrency(data.totalOutstanding)));
      Object.keys(AGEING_LABEL).forEach(function(bucket){
        debtorsSummaryEl.appendChild(statTile(AGEING_LABEL[bucket], formatCurrency(data.ageingSummary[bucket] || 0)));
      });

      if(revenueSummaryEl && data.revenue){
        revenueSummaryEl.innerHTML = '';
        revenueSummaryEl.appendChild(statTile('Total Invoiced', formatCurrency(data.revenue.totalInvoiced)));
        revenueSummaryEl.appendChild(statTile('Total Collected', formatCurrency(data.revenue.totalCollected)));
        revenueSummaryEl.appendChild(statTile('Collection Rate', data.revenue.collectionRatePercent != null ? data.revenue.collectionRatePercent + '%' : 'No invoices yet'));
        revenueSummaryEl.appendChild(statTile('Outstanding', formatCurrency(data.totalOutstanding)));
      }

      if(executiveAlertsEl){
        var severelyOverdue = data.debtors.filter(function(d){ return d.daysOverdue > 90; });
        executiveAlertsEl.innerHTML = '';
        if(!severelyOverdue.length){
          executiveAlertsEl.appendChild(el('p', 'portal-empty', 'No invoices are more than 90 days overdue.'));
        }else{
          executiveAlertsEl.appendChild(el('p', 'registrar-hint', severelyOverdue.length + ' invoice(s) are more than 90 days overdue — see the Outstanding Collections list below for names and amounts.'));
        }
      }

      debtorsListEl.innerHTML = '';
      if(!data.debtors.length){
        debtorsListEl.appendChild(el('p', 'portal-empty', 'No outstanding invoices — every issued invoice is fully paid.'));
        return;
      }
      data.debtors.forEach(function(d){
        var row = el('div', 'finance-invoice-row');
        row.appendChild(el('span', 'finance-invoice-no', d.invoiceNo + ' — ' + d.studentFullName));
        row.appendChild(el('span', 'finance-invoice-term', d.institutionName + ' · ' + d.term));
        row.appendChild(el('span', 'finance-status-badge is-' + (d.daysOverdue > 0 ? 'unpaid' : 'partial'), d.daysOverdue != null ? d.daysOverdue + 'd overdue' : 'Due ' + formatDate(d.dueDate)));
        row.appendChild(el('span', 'finance-invoice-amount', formatCurrency(d.balance)));
        debtorsListEl.appendChild(row);
      });
    }catch(err){
      debtorsListEl.innerHTML = '';
      debtorsListEl.appendChild(el('p', 'portal-empty', (err && err.message) || 'Could not load the debtors report.'));
    }
  }

  debtorsRefreshBtn.addEventListener('click', loadDebtors);

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  (async function init(){
    try{
      var res = await fetch('/api/portal/staff/me');
      if(res.status === 401){
        window.location.href = '/portal/staff/login/';
        return;
      }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load your staff session.');
      loadingEl.hidden = true;
      contentEl.hidden = false;
      if(window.SHRSExecArrival){
        window.SHRSExecArrival.play({
          key: 'finance',
          icon: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M12 7.5v9M9.3 9.8c0-1.1 1.1-2 2.7-2s2.7.9 2.7 2-1.1 1.6-2.7 2c-1.6.4-2.7 1-2.7 2.1s1.1 2 2.7 2 2.7-.9 2.7-2" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
          title: 'Finance Office',
          tagline: 'Treasury & Institutional Resources',
          greeting: 'Treasury status updated.',
        });
      }
      loadFeeStructures();
      loadDebtors();
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Finance Office.';
      errorEl.hidden = false;
    }
  })();
})();
