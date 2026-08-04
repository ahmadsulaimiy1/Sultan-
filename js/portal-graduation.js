(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var childrenWrap = document.querySelector('[data-graduation-children]');
  var template = document.getElementById('graduation-child-template');
  if(!childrenWrap || !template) return;

  var TEXT_FIELDS = [
    'fullLegalName', 'preferredCertificateName', 'gender', 'dateOfBirth', 'nationality',
    'stateOfOrigin', 'lgaOfOrigin', 'residentialAddress', 'contactEmail', 'contactPhone',
    'arabicName', 'quranMemorisationLevel', 'ijazahStatus', 'islamiyyahLevel', 'arabicProficiency',
    'preferredIslamicTitle', 'academicAwards', 'conductAwards', 'quranAwards', 'leadershipAwards',
    'sportsAwards', 'otherHonours', 'alumniWhatsapp', 'alumniLinkedin', 'alumniOccupation',
    'alumniUniversityApplyingTo', 'alumniCareerInterests',
  ];

  var STATUS_LABEL = {
    draft: 'Not yet submitted', submitted: 'Submitted — awaiting Registry review',
    under_review: 'Under review by the Registry', verified: 'Verified by the Registry',
    locked: 'Locked — finalised for document issuance',
  };

  function editable(record){
    if(!record) return true;
    if(record.status === 'draft' || record.status === 'submitted') return true;
    if(record.status === 'under_review' && record.correctionNote) return true;
    return false;
  }

  function renderChild(child){
    var node = template.content.firstElementChild.cloneNode(true);
    var record = child.record;

    node.querySelector('[data-gc-name]').textContent = child.fullName;
    node.querySelector('[data-gc-meta]').textContent =
      (child.institutionName || 'Institution not on file') + (child.className ? ' · ' + child.className : '');

    var badge = node.querySelector('[data-gc-status-badge]');
    var status = record ? record.status : 'draft';
    badge.textContent = STATUS_LABEL[status] || status;
    badge.classList.add('is-' + status);

    if(record && record.correctionNote){
      var banner = node.querySelector('[data-gc-correction]');
      banner.hidden = false;
      banner.textContent = 'The Registry has requested a correction: "' + record.correctionNote + '" — please update the relevant field(s) below and resubmit.';
    }

    var form = node.querySelector('[data-gc-form]');
    var canEdit = editable(record);

    if(!canEdit){
      form.hidden = true;
      var note = node.querySelector('[data-gc-readonly-note]');
      note.hidden = false;
      note.textContent = status === 'locked'
        ? 'This record is locked. If something needs to change, please contact the Registry directly — it can no longer be edited from this form.'
        : 'This record is currently being reviewed and can\'t be edited from this form right now. If the Registry needs anything from you, they will request a correction here.';
      childrenWrap.appendChild(node);
      return;
    }

    if(record){
      TEXT_FIELDS.forEach(function(field){
        var input = form.querySelector('[name="' + field + '"]');
        if(!input || record[field] == null) return;
        var value = String(record[field]);
        // date_of_birth is a DATE column — normalise to YYYY-MM-DD for the
        // <input type="date">, whatever string shape the SQL client returns it as.
        if(field === 'dateOfBirth' && value.length > 10) value = value.slice(0, 10);
        input.value = value;
      });
      var confirmBox = form.querySelector('[name="nameSpellingConfirmed"]');
      if(confirmBox) confirmBox.checked = !!record.nameSpellingConfirmed;
    }

    var resultEl = form.querySelector('[data-gc-result]');
    var saveBtn = form.querySelector('[data-gc-save]');

    function collectPayload(action){
      var payload = { action: action, studentId: child.studentId, graduationSession: child.graduationSession };
      TEXT_FIELDS.forEach(function(field){
        var input = form.querySelector('[name="' + field + '"]');
        var value = input ? input.value.trim() : '';
        if(value) payload[field] = value;
      });
      var confirmBox = form.querySelector('[name="nameSpellingConfirmed"]');
      payload.nameSpellingConfirmed = !!(confirmBox && confirmBox.checked);
      return payload;
    }

    async function submitAction(action){
      resultEl.hidden = true;
      if(action === 'submit'){
        var fullNameInput = form.querySelector('[name="fullLegalName"]');
        if(!fullNameInput.value.trim()){
          resultEl.hidden = false;
          resultEl.className = 'registrar-form-result graduation-form-result is-error';
          resultEl.textContent = 'Full legal name is required before submitting.';
          return;
        }
      }
      try{
        var res = await fetch('/api/portal/graduation-records', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(collectPayload(action)),
        });
        var data = await res.json().catch(function(){ return {}; });
        if(res.status === 401){
          window.location.href = '/portal/login/?next=/portal/graduation/';
          return;
        }
        if(!res.ok) throw new Error(data.error || 'Could not save this information right now.');
        resultEl.hidden = false;
        resultEl.className = 'registrar-form-result graduation-form-result is-ok';
        resultEl.textContent = action === 'submit'
          ? 'Submitted to the Registry — you can still update this until they begin reviewing it.'
          : 'Draft saved.';
        badge.textContent = STATUS_LABEL[data.status] || data.status;
        badge.className = 'graduation-status-badge is-' + data.status;
      }catch(err){
        resultEl.hidden = false;
        resultEl.className = 'registrar-form-result graduation-form-result is-error';
        resultEl.textContent = (err && err.message) || 'Could not save this information right now.';
      }
    }

    saveBtn.addEventListener('click', function(){ submitAction('save'); });
    form.addEventListener('submit', function(e){ e.preventDefault(); submitAction('submit'); });

    childrenWrap.appendChild(node);
  }

  (async function init(){
    try{
      var res = await fetch('/api/portal/graduation-records');
      if(res.status === 401){
        window.location.href = '/portal/login/?next=/portal/graduation/';
        return;
      }
      var data = await res.json();
      if(!res.ok) throw new Error(data.error || 'Could not load your graduation information.');

      loadingEl.hidden = true;
      contentEl.hidden = false;

      if(!data.children || !data.children.length){
        childrenWrap.appendChild((function(){
          var p = document.createElement('p');
          p.className = 'registrar-approvals-empty';
          p.textContent = 'No children are linked to your account yet — contact the Registry if this looks wrong.';
          return p;
        })());
        return;
      }

      data.children.forEach(renderChild);
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load your graduation information.';
      errorEl.hidden = false;
    }
  })();
})();
