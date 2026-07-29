(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var helloEl = document.querySelector('[data-identity-hello]');
  var nameEl = document.querySelector('[data-identity-name]');
  var metaEl = document.querySelector('[data-identity-meta]');
  var officeEl = document.querySelector('[data-identity-office]');
  var institutionEl = document.querySelector('[data-identity-institution]');
  var reportsToEl = document.querySelector('[data-identity-reports-to]');
  var joinedEl = document.querySelector('[data-identity-joined]');
  var institutionsEl = document.querySelector('[data-identity-institutions]');
  var rolesEl = document.querySelector('[data-identity-roles]');
  var delegationsHeldCard = document.querySelector('[data-identity-delegations-held-card]');
  var delegationsHeldEl = document.querySelector('[data-identity-delegations-held]');
  var delegationsGivenCard = document.querySelector('[data-identity-delegations-given-card]');
  var delegationsGivenEl = document.querySelector('[data-identity-delegations-given]');
  var logoutBtn = document.querySelector('[data-portal-logout]');

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  function formatDate(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch(e){ return iso; }
  }

  function formatDateTime(iso){
    if(!iso) return '—';
    try{ return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch(e){ return iso; }
  }

  function renderRoles(roles){
    rolesEl.innerHTML = '';
    if(!roles.length){
      rolesEl.appendChild(el('p', 'identity-empty', 'No roles have been assigned yet — contact the ICT Office if this looks wrong.'));
      return;
    }
    roles.forEach(function(r){
      var row = el('div', 'identity-role-row');
      var left = document.createElement('div');
      left.appendChild(el('div', 'identity-role-name', r.roleName + ' (' + r.roleCode + ')'));
      var scopeParts = [];
      if(r.institution) scopeParts.push(r.institution.name);
      if(r.office) scopeParts.push(r.office.name);
      left.appendChild(el('div', 'identity-role-scope', scopeParts.length ? scopeParts.join(' · ') : 'School-wide'));
      row.appendChild(left);
      var badge = el('span', 'identity-role-badge' + (r.roleStatus === 'proposed' ? ' is-proposed' : ''), r.roleStatus === 'proposed' ? 'Proposed Role' : 'Established Role');
      row.appendChild(badge);
      rolesEl.appendChild(row);
    });
  }

  function renderDelegationsHeld(rows){
    if(!rows.length){
      delegationsHeldCard.hidden = true;
      return;
    }
    delegationsHeldCard.hidden = false;
    delegationsHeldEl.innerHTML = '';
    rows.forEach(function(d){
      var row = el('div', 'identity-delegation-row');
      var strong = el('strong', null, d.roleName + ' (' + d.roleCode + ')');
      row.appendChild(strong);
      row.appendChild(document.createTextNode(' — delegated by ' + (d.delegatedBy.fullName || 'a colleague') +
        (d.delegatedBy.positionTitle ? ' (' + d.delegatedBy.positionTitle + ')' : '') + '. ' + d.reason));
      row.appendChild(el('div', 'identity-delegation-meta', 'Active until ' + formatDateTime(d.endsAt)));
      delegationsHeldEl.appendChild(row);
    });
  }

  function renderDelegationsGiven(rows){
    if(!rows.length){
      delegationsGivenCard.hidden = true;
      return;
    }
    delegationsGivenCard.hidden = false;
    delegationsGivenEl.innerHTML = '';
    rows.forEach(function(d){
      var row = el('div', 'identity-delegation-row');
      var strong = el('strong', null, d.roleName + ' (' + d.roleCode + ')');
      row.appendChild(strong);
      row.appendChild(document.createTextNode(' — delegated to ' + (d.delegatedTo.fullName || 'a colleague') +
        (d.delegatedTo.positionTitle ? ' (' + d.delegatedTo.positionTitle + ')' : '') + '. ' + d.reason));
      row.appendChild(el('div', 'identity-delegation-meta', 'Active until ' + formatDateTime(d.endsAt)));
      delegationsGivenEl.appendChild(row);
    });
  }

  async function load(){
    try{
      var res = await fetch('/api/portal/staff/me');
      if(res.status === 401){
        window.location.href = '/portal/staff/login/';
        return;
      }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load your identity record.');

      var staff = data.staff;
      helloEl.textContent = 'Welcome, ' + (staff.preferredName || staff.fullName.split(' ')[0]);
      nameEl.textContent = staff.fullName;
      metaEl.textContent = [staff.staffNo, staff.positionTitle, staff.status.charAt(0).toUpperCase() + staff.status.slice(1)].filter(Boolean).join(' · ');
      officeEl.textContent = staff.office ? staff.office.name : '—';
      institutionEl.textContent = staff.institution ? staff.institution.name : 'School-wide';
      reportsToEl.textContent = staff.reportsTo ? (staff.reportsTo.fullName + (staff.reportsTo.positionTitle ? ' (' + staff.reportsTo.positionTitle + ')' : '')) : '—';
      joinedEl.textContent = formatDate(staff.dateJoined);

      var execPositionEl = document.querySelector('[data-identity-exec-position]');
      var execRolesEl = document.querySelector('[data-exec-stat-roles]');
      var execJoinedEl = document.querySelector('[data-exec-stat-joined]');
      var execDelHeldEl = document.querySelector('[data-exec-stat-delegations-held]');
      var execDelGivenEl = document.querySelector('[data-exec-stat-delegations-given]');
      if(execPositionEl) execPositionEl.textContent = [staff.positionTitle, staff.institution ? staff.institution.name : 'Sultan Hanafi Royal Schools'].filter(Boolean).join(' · ');
      if(execRolesEl) execRolesEl.textContent = (data.roles || []).length;
      if(execJoinedEl) execJoinedEl.textContent = formatDate(staff.dateJoined);
      if(execDelHeldEl) execDelHeldEl.textContent = (data.delegationsHeld || []).length;
      if(execDelGivenEl) execDelGivenEl.textContent = (data.delegationsGiven || []).length;

      institutionsEl.innerHTML = '';
      staff.institutions.forEach(function(inst){
        var chip = el('span', 'portal-programme-chip' + (inst.isPrimary ? ' is-primary' : ''), inst.name);
        institutionsEl.appendChild(chip);
      });

      renderRoles(data.roles);
      renderDelegationsHeld(data.delegationsHeld);
      renderDelegationsGiven(data.delegationsGiven);

      var idCardMount = document.querySelector('[data-id-card-mount]');
      if(idCardMount && window.SHRSIdCard){
        window.SHRSIdCard.render(idCardMount, {
          kind: 'staff',
          fullName: staff.fullName,
          identityNo: staff.identityNo,
          roleLabel: staff.positionTitle || 'Staff',
          subtitle: staff.institution ? staff.institution.name : 'Sultan Hanafi Royal Schools',
          status: staff.status ? staff.status.charAt(0).toUpperCase() + staff.status.slice(1) : null,
        });
      }

      loadingEl.hidden = true;
      contentEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load your identity record.';
      errorEl.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/staff/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/staff/login/';
  });

  load();
})();
