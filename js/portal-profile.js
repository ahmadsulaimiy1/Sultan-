(function(){
  var loadingEl = document.querySelector('[data-portal-loading]');
  var errorEl = document.querySelector('[data-portal-error]');
  var errorMessageEl = document.querySelector('[data-portal-error-message]');
  var contentEl = document.querySelector('[data-portal-content]');
  var helloEl = document.querySelector('[data-portal-hello]');
  var logoutBtn = document.querySelector('[data-portal-logout]');
  var pctLabelEl = document.querySelector('[data-profile-pct-label]');
  var progressFillEl = document.querySelector('[data-profile-progress-fill]');
  var nextStepEl = document.querySelector('[data-profile-next-step]');
  var sectionFlagsEl = document.querySelector('[data-profile-section-flags]');
  var existingChildrenEl = document.querySelector('[data-profile-existing-children]');
  var prospectiveChildrenEl = document.querySelector('[data-profile-prospective-children]');
  var contactsWrap = document.querySelector('[data-profile-emergency-contacts]');
  var interestOptionsWrap = document.querySelector('[data-profile-interest-options]');
  var interestsForm = document.querySelector('[data-profile-interests-form]');
  var interestsResultEl = document.querySelector('[data-profile-interests-result]');

  var TITLES = ['Mr.', 'Mrs.', 'Miss', 'Dr.', 'Engr.', 'Prof.', 'Alhaji', 'Alhaja', 'Shaykh', 'Ustadh'];
  var SECTION_LABELS = {
    personal: 'Personal', contact: 'Contact', residential: 'Residential',
    professional: 'Professional', family: 'Family',
    emergencyContacts: 'Emergency Contacts', educationalInterests: 'Educational Interests',
  };
  var MIN_EMERGENCY_CONTACTS = 2;
  var MAX_EMERGENCY_CONTACTS = 4;

  function el(tag, className, text){
    var e = document.createElement(tag);
    if(className) e.className = className;
    if(text != null) e.textContent = text;
    return e;
  }

  var titleSelect = document.getElementById('p-title');
  TITLES.forEach(function(t){
    var opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    titleSelect.appendChild(opt);
  });

  function setFormValues(form, data){
    Array.prototype.forEach.call(form.elements, function(field){
      if(!field.name || !(field.name in data)) return;
      var value = data[field.name];
      if(value == null){ field.value = ''; return; }
      // date_of_birth may come back as a full ISO timestamp string —
      // <input type="date"> only accepts the YYYY-MM-DD portion.
      if(field.type === 'date') value = String(value).slice(0, 10);
      field.value = value;
    });
  }

  function renderCompletion(profile){
    pctLabelEl.textContent = profile.profileCompletionPct + '% complete';
    progressFillEl.style.width = profile.profileCompletionPct + '%';
    nextStepEl.textContent = profile.recommendedNextStep;
    sectionFlagsEl.innerHTML = '';
    Object.keys(SECTION_LABELS).forEach(function(key){
      var done = !!profile.sections[key];
      var flag = el('span', 'profile-section-flag' + (done ? ' is-done' : ''), (done ? '✓ ' : '○ ') + SECTION_LABELS[key]);
      sectionFlagsEl.appendChild(flag);
    });
  }

  function renderContacts(contacts){
    contactsWrap.innerHTML = '';
    var slots = Math.max(MIN_EMERGENCY_CONTACTS, contacts.length);
    for(var i = 1; i <= slots; i++){
      var existing = contacts.filter(function(c){ return c.order === i; })[0] || null;
      contactsWrap.appendChild(buildContactForm(i, existing));
    }
    if(slots < MAX_EMERGENCY_CONTACTS){
      var addBtn = el('button', 'portal-text-btn', '+ Add another emergency contact');
      addBtn.type = 'button';
      addBtn.addEventListener('click', function(){
        contactsWrap.appendChild(buildContactForm(slots + 1, null));
        if(slots + 1 >= MAX_EMERGENCY_CONTACTS) addBtn.remove();
        slots += 1;
      });
      contactsWrap.appendChild(addBtn);
    }
  }

  function buildContactForm(order, contact){
    var form = el('form', 'profile-contact-form');
    var head = el('div', 'profile-contact-head', 'Contact ' + order + (order <= MIN_EMERGENCY_CONTACTS ? ' (required)' : ' (optional)'));
    form.appendChild(head);

    var row1 = el('div', 'portal-field-row');
    var nameField = el('div', 'portal-field');
    nameField.appendChild(el('label', null, 'Full name'));
    var nameInput = document.createElement('input');
    nameInput.type = 'text'; nameInput.name = 'fullName'; nameInput.value = contact ? contact.fullName : '';
    nameField.appendChild(nameInput);
    row1.appendChild(nameField);

    var relField = el('div', 'portal-field');
    relField.appendChild(el('label', null, 'Relationship'));
    var relInput = document.createElement('input');
    relInput.type = 'text'; relInput.name = 'relationship'; relInput.value = contact ? contact.relationship : '';
    relField.appendChild(relInput);
    row1.appendChild(relField);
    form.appendChild(row1);

    var row2 = el('div', 'portal-field-row');
    var phoneField = el('div', 'portal-field');
    phoneField.appendChild(el('label', null, 'Phone'));
    var phoneInput = document.createElement('input');
    phoneInput.type = 'tel'; phoneInput.name = 'phone'; phoneInput.value = contact ? contact.phone : '';
    phoneField.appendChild(phoneInput);
    row2.appendChild(phoneField);

    var emailField = el('div', 'portal-field');
    emailField.appendChild(el('label', null, 'Email (optional)'));
    var emailInput = document.createElement('input');
    emailInput.type = 'email'; emailInput.name = 'email'; emailInput.value = contact ? (contact.email || '') : '';
    emailField.appendChild(emailInput);
    row2.appendChild(emailField);
    form.appendChild(row2);

    var submitBtn = el('button', 'portal-submit', 'Save Contact ' + order);
    submitBtn.type = 'submit';
    submitBtn.style.width = 'auto';
    form.appendChild(submitBtn);
    var resultEl = el('span', 'profile-form-result');
    form.appendChild(resultEl);

    form.addEventListener('submit', async function(e){
      e.preventDefault();
      submitBtn.disabled = true;
      resultEl.textContent = '';
      resultEl.className = 'profile-form-result';
      try{
        var res = await fetch('/api/portal/emergency-contacts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            order: order,
            fullName: nameInput.value.trim(),
            relationship: relInput.value.trim(),
            phone: phoneInput.value.trim(),
            email: emailInput.value.trim(),
          }),
        });
        var data = await res.json().catch(function(){ return {}; });
        if(!res.ok) throw new Error(data.error || 'Could not save that contact.');
        resultEl.textContent = 'Saved';
        resultEl.className = 'profile-form-result is-ok';
        await load();
      }catch(err){
        resultEl.textContent = (err && err.message) || 'Could not save that contact.';
        resultEl.className = 'profile-form-result is-error';
      }
      submitBtn.disabled = false;
    });

    return form;
  }

  function renderInterestOptions(options, selected){
    interestOptionsWrap.innerHTML = '';
    options.forEach(function(opt){
      var label = el('label', 'profile-interest-option');
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = opt.key;
      checkbox.checked = selected.indexOf(opt.key) !== -1;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(' ' + opt.label));
      interestOptionsWrap.appendChild(label);
    });
  }

  document.querySelectorAll('[data-profile-form]').forEach(function(form){
    form.addEventListener('submit', async function(e){
      e.preventDefault();
      var resultEl = form.querySelector('[data-profile-result]');
      var submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      resultEl.textContent = '';
      resultEl.className = 'profile-form-result';

      var payload = {};
      Array.prototype.forEach.call(form.elements, function(field){
        if(!field.name) return;
        payload[field.name] = field.value;
      });

      try{
        var res = await fetch('/api/portal/profile', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
        var data = await res.json().catch(function(){ return {}; });
        if(!res.ok) throw new Error(data.error || 'Could not save this section.');
        resultEl.textContent = 'Saved';
        resultEl.className = 'profile-form-result is-ok';
        renderCompletion(data);
        existingChildrenEl.textContent = data.existingChildrenCount;
        prospectiveChildrenEl.textContent = data.prospectiveChildrenCount;
      }catch(err){
        resultEl.textContent = (err && err.message) || 'Could not save this section.';
        resultEl.className = 'profile-form-result is-error';
      }
      submitBtn.disabled = false;
    });
  });

  interestsForm.addEventListener('submit', async function(e){
    e.preventDefault();
    var submitBtn = interestsForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    interestsResultEl.textContent = '';
    interestsResultEl.className = 'profile-form-result';
    var keys = Array.prototype.filter.call(interestOptionsWrap.querySelectorAll('input[type="checkbox"]'), function(cb){ return cb.checked; })
      .map(function(cb){ return cb.value; });
    try{
      var res = await fetch('/api/portal/educational-interests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ keys: keys }),
      });
      var data = await res.json().catch(function(){ return {}; });
      if(!res.ok) throw new Error(data.error || 'Could not save your educational interests.');
      interestsResultEl.textContent = 'Saved';
      interestsResultEl.className = 'profile-form-result is-ok';
      await load();
    }catch(err){
      interestsResultEl.textContent = (err && err.message) || 'Could not save your educational interests.';
      interestsResultEl.className = 'profile-form-result is-error';
    }
    submitBtn.disabled = false;
  });

  async function load(){
    try{
      var res = await fetch('/api/portal/profile', { headers: { 'accept': 'application/json' } });
      if(res.status === 401){
        window.location.href = '/portal/login/';
        return;
      }
      var profile = await res.json().catch(function(){ return {}; });
      if(!res.ok) throw new Error(profile.error || 'Could not load your profile.');

      helloEl.textContent = (profile.title ? profile.title + ' ' : '') + (profile.preferredName || profile.fullName);
      renderCompletion(profile);
      existingChildrenEl.textContent = profile.existingChildrenCount;
      prospectiveChildrenEl.textContent = profile.prospectiveChildrenCount;

      setFormValues(document.querySelector('[data-profile-form="personal"]'), profile);
      setFormValues(document.querySelector('[data-profile-form="contact"]'), profile);
      setFormValues(document.querySelector('[data-profile-form="residential"]'), profile);
      setFormValues(document.querySelector('[data-profile-form="professional"]'), profile);
      setFormValues(document.querySelector('[data-profile-form="family"]'), profile);

      renderContacts(profile.emergencyContacts || []);

      var interestsRes = await fetch('/api/portal/educational-interests');
      var interestsData = await interestsRes.json().catch(function(){ return {}; });
      if(interestsRes.ok) renderInterestOptions(interestsData.options || [], interestsData.selected || []);

      loadingEl.hidden = true;
      contentEl.hidden = false;
    }catch(err){
      loadingEl.hidden = true;
      errorMessageEl.textContent = (err && err.message) || 'Could not load your profile.';
      errorEl.hidden = false;
    }
  }

  logoutBtn.addEventListener('click', async function(){
    try{ await fetch('/api/portal/logout', { method: 'POST' }); }catch(err){}
    window.location.href = '/portal/login/';
  });

  load();
})();
