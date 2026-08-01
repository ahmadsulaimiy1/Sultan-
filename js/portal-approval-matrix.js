(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  var stageSelectEl = document.querySelector('[data-am-stage]');
  var triggerSelectEl = document.querySelector('[data-am-trigger]');
  var referenceEl = document.querySelector('[data-am-reference]');
  var addBtn = document.querySelector('[data-am-add]');
  var addStatusEl = document.querySelector('[data-am-add-status]');
  var tbodyEl = document.querySelector('[data-am-tbody]');

  var TRIGGER_LABEL = {
    constitution: 'Constitution', governance_charter: 'Governance Charter',
    board_resolution: 'Board Resolution', executive_directive: 'Executive Directive',
  };

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function renderRules(rules){
    tbodyEl.innerHTML = '';
    if(!rules.length){
      var tr = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 6; td.textContent = 'No rules have been added yet — every stage is decided purely on its normal chain of authority, with no institution-wide Founder requirement in force.';
      tr.appendChild(td);
      tbodyEl.appendChild(tr);
      return;
    }
    rules.forEach(function(r){
      var tr = document.createElement('tr');
      tr.appendChild(el('td', null, r.targetStageCode));
      tr.appendChild(el('td', null, TRIGGER_LABEL[r.triggerType] || r.triggerType));
      tr.appendChild(el('td', null, r.referenceText || '—'));
      tr.appendChild(el('td', null, r.createdByName || '—'));
      var statusTd = document.createElement('td');
      var pill = el('span', 'gcc-status-pill' + (r.isActive ? '' : ' is-locked'), r.isActive ? 'Active' : ('Deactivated ' + formatDate(r.deactivatedAt)));
      statusTd.appendChild(pill);
      tr.appendChild(statusTd);
      var actionTd = document.createElement('td');
      if(r.isActive){
        var deactivateBtn = el('button', 'registrar-btn', 'Deactivate');
        deactivateBtn.type = 'button';
        deactivateBtn.addEventListener('click', function(){ deactivateRule(r.id); });
        actionTd.appendChild(deactivateBtn);
      }
      tr.appendChild(actionTd);
      tbodyEl.appendChild(tr);
    });
  }

  async function load(){
    try{
      var res = await fetch('/api/portal/admin/approval-matrix');
      if(res.status === 401){ window.location.href = '/portal/staff/login/'; return; }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load the Approval Matrix.');

      stageSelectEl.innerHTML = '';
      data.stages.forEach(function(s){
        var opt = document.createElement('option');
        opt.value = s.code; opt.textContent = s.label;
        stageSelectEl.appendChild(opt);
      });

      renderRules(data.rules || []);

      loadingEl.hidden = true;
      contentEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load the Approval Matrix.';
      errorEl.hidden = false;
    }
  }

  addBtn.addEventListener('click', async function(){
    addStatusEl.textContent = '';
    addBtn.disabled = true;
    addStatusEl.textContent = 'Saving…';
    try{
      var res = await fetch('/api/portal/admin/approval-matrix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_rule', targetStageCode: stageSelectEl.value,
          triggerType: triggerSelectEl.value, referenceText: referenceEl.value.trim() || null,
        }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not add that rule.');
      referenceEl.value = '';
      addStatusEl.textContent = 'Rule added.';
      load();
    }catch(err){
      addStatusEl.textContent = (err && err.message) || 'Could not add that rule.';
    }finally{
      addBtn.disabled = false;
    }
  });

  async function deactivateRule(ruleId){
    if(!window.confirm('Deactivate this rule? The affected stage will no longer be institutionally required by it.')) return;
    try{
      var res = await fetch('/api/portal/admin/approval-matrix', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate_rule', ruleId: ruleId }),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not deactivate that rule.');
      load();
    }catch(err){
      window.alert((err && err.message) || 'Could not deactivate that rule.');
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  load();
})();
