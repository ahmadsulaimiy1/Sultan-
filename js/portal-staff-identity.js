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

  var sigTypeRadios = document.querySelectorAll('[data-sig-type-radio]');
  var sigTypedFields = document.querySelector('[data-sig-typed-fields]');
  var sigImageFields = document.querySelector('[data-sig-image-fields]');
  var sigTypedNameEl = document.querySelector('[data-sig-typed-name]');
  var sigImageInputEl = document.querySelector('[data-sig-image-input]');
  var sigTitleLineEl = document.querySelector('[data-sig-title-line]');
  var sigPreviewEl = document.querySelector('[data-sig-preview]');
  var sigSaveBtn = document.querySelector('[data-sig-save]');
  var sigStatusEl = document.querySelector('[data-sig-status]');
  var pendingImageData = null;

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
        // The Founder & CEO is a real staff record, not a distinct
        // account type — the only reliable, non-fabricated signal that
        // this is specifically the Founder & CEO's card is holding the
        // EXE (CEO / Executive Leadership) role, per role-permission-
        // matrix.md §3.
        var isFounder = (data.roles || []).some(function(r){ return r.roleCode === 'EXE'; });
        var OFFICE_THEME_BY_SLUG = {
          'registrar': 'registrar', 'finance': 'finance',
          'principal-royal-college': 'principal', 'head-teacher': 'headteacher',
          'raees': 'raees', 'mudeer': 'mudeer',
        };
        var themeKey = isFounder ? 'founder'
          : (staff.office && OFFICE_THEME_BY_SLUG[staff.office.slug])
            || (staff.department ? 'educator' : null);
        window.SHRSIdCard.render(idCardMount, {
          kind: isFounder ? 'founder' : 'staff',
          themeKey: themeKey,
          fullName: staff.fullName,
          identityNo: staff.identityNo,
          roleLabel: staff.positionTitle || 'Staff',
          subtitle: staff.institution ? staff.institution.name : 'Sultan Hanafi Royal Schools',
          status: staff.status ? staff.status.charAt(0).toUpperCase() + staff.status.slice(1) : null,
          details: [
            { label: 'Staff No.', value: staff.staffNo },
            { label: 'Department', value: staff.department ? staff.department.name : null },
            { label: 'Date Joined', value: formatDate(staff.dateJoined) },
          ],
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

  function currentSigType(){
    var checked = document.querySelector('[data-sig-type-radio]:checked');
    return checked ? checked.value : 'typed';
  }

  function renderSigFieldVisibility(){
    var type = currentSigType();
    sigTypedFields.hidden = type !== 'typed';
    sigImageFields.hidden = type !== 'uploaded_image';
  }

  function renderSigPreview(){
    var type = currentSigType();
    sigPreviewEl.innerHTML = '';
    if(type === 'typed' && sigTypedNameEl.value.trim()){
      sigPreviewEl.hidden = false;
      var span = document.createElement('span');
      span.className = 'signature-script';
      span.textContent = sigTypedNameEl.value.trim();
      sigPreviewEl.appendChild(span);
    } else if(type === 'uploaded_image' && pendingImageData){
      sigPreviewEl.hidden = false;
      var img = document.createElement('img');
      img.src = pendingImageData;
      img.alt = 'Signature preview';
      sigPreviewEl.appendChild(img);
    } else {
      sigPreviewEl.hidden = true;
    }
  }

  sigTypeRadios.forEach(function(r){
    r.addEventListener('change', function(){ renderSigFieldVisibility(); renderSigPreview(); });
  });
  sigTypedNameEl.addEventListener('input', renderSigPreview);
  sigImageInputEl.addEventListener('change', function(){
    var file = sigImageInputEl.files && sigImageInputEl.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){ pendingImageData = reader.result; renderSigPreview(); };
    reader.readAsDataURL(file);
  });

  async function loadSignature(){
    try{
      var res = await fetch('/api/portal/staff/my-signature');
      var data = await res.json();
      if(!res.ok || !data.signature) return;
      var sig = data.signature;
      sigTypeRadios.forEach(function(r){ r.checked = r.value === sig.signatureType; });
      if(sig.typedName) sigTypedNameEl.value = sig.typedName;
      if(sig.titleLine) sigTitleLineEl.value = sig.titleLine;
      renderSigFieldVisibility();
      if(sig.signatureType === 'typed') renderSigPreview();
      else if(sig.hasImage){
        sigPreviewEl.hidden = false;
        sigPreviewEl.textContent = 'An uploaded signature image is on file. Upload a new one to replace it.';
      }
    }catch(err){ /* honest no-op — signature panel simply stays blank */ }
  }

  sigSaveBtn.addEventListener('click', async function(){
    var type = currentSigType();
    sigStatusEl.textContent = '';
    if(type === 'typed' && !sigTypedNameEl.value.trim()){
      sigStatusEl.textContent = 'Enter your full name for a typed signature.';
      return;
    }
    if(type === 'uploaded_image' && !pendingImageData){
      sigStatusEl.textContent = 'Choose an image to upload.';
      return;
    }
    sigSaveBtn.disabled = true;
    sigStatusEl.textContent = 'Saving…';
    try{
      var payload = { signatureType: type, titleLine: sigTitleLineEl.value.trim() || null };
      if(type === 'typed') payload.typedName = sigTypedNameEl.value.trim();
      if(type === 'uploaded_image') payload.imageData = pendingImageData;
      var res = await fetch('/api/portal/staff/my-signature', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not save your signature.');
      sigStatusEl.textContent = 'Signature saved.';
    }catch(err){
      sigStatusEl.textContent = (err && err.message) || 'Could not save your signature.';
    }finally{
      sigSaveBtn.disabled = false;
    }
  });

  renderSigFieldVisibility();
  loadSignature();
  load();
})();
