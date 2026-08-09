/* ==========================================================================
   SHRS — Application wizard
   Seven steps, validated per step, saved as you go, reviewable before submit.

   Where applications are delivered
   -------------------------------
   Set ENDPOINT below. It is posted as multipart/form-data, so document
   uploads travel with the application. The default is the same address the
   site's contact form already uses; point it at the Registrar's portal API
   when that endpoint is ready.
   ========================================================================== */
(function () {
  'use strict';

  var ENDPOINT = 'https://formsubmit.co/info@shroyalschools.com';
  var STORE = 'shrsApplicationDraft.v1';
  var MAX_MB = 8;
  var OK_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

  var form = document.getElementById('ap-form');
  if (!form) return;

  var steps = [].slice.call(form.querySelectorAll('.ap-step'));
  var rail = document.getElementById('ap-rail');
  var railItems = [].slice.call(rail.querySelectorAll('li'));
  var btnBack = document.getElementById('ap-back');
  var btnNext = document.getElementById('ap-next');
  var btnSubmit = document.getElementById('ap-submit');
  var saveNote = document.getElementById('ap-save-note');
  var current = 0;
  var files = {};

  /* ---------------- geography ---------------- */
  var geo = window.SHRS_GEO;
  function fillCountries(sel, preferred) {
    if (!sel || !geo) return;
    var html = '<option value="">Select a country</option>';
    (preferred || []).forEach(function (code) {
      geo.countries.forEach(function (c) {
        if (c.code === code) html += '<option value="' + c.code + '">' + c.name + '</option>';
      });
    });
    if (preferred && preferred.length) html += '<option disabled>──────────</option>';
    geo.countries.forEach(function (c) {
      html += '<option value="' + c.code + '">' + c.name + '</option>';
    });
    sel.innerHTML = html;
  }
  function fillDial(sel) {
    if (!sel || !geo) return;
    var html = '';
    geo.countries.forEach(function (c) {
      html += '<option value="+' + c.dial + '"' + (c.code === 'NG' ? ' selected' : '') + '>' +
              c.code + ' +' + c.dial + '</option>';
    });
    sel.innerHTML = html;
  }
  /* ---- cascading administrative divisions -------------------------------
     Level 1  country
     Level 2  primary division   (state / province / region / country)
     Level 3  secondary division (department / district / council) where the
              register has one
     Level 4  local government   (a verified list where we hold one, otherwise
              a free-text field, which is what honest forms do)
     ---------------------------------------------------------------------- */
  function buildCascade(countrySel, host) {
    if (!countrySel || !host) return;
    var pre = host.getAttribute('data-prefix') || 'addr';

    function sel(name, label, opts, chosen, required) {
      var h = '<div class="ap-f"><label for="' + name + '">' + label +
              (required ? ' <span class="req">*</span>' : ' <span class="opt">optional</span>') + '</label>' +
              '<select id="' + name + '" name="' + name + '"' + (required ? ' required' : '') + '>' +
              '<option value="">Select</option>';
      opts.forEach(function (o) {
        var v = o.name || o;
        h += '<option' + (v === chosen ? ' selected' : '') + '>' + v + '</option>';
      });
      return h + '</select><span class="err">Required.</span></div>';
    }
    function text(name, label, val, ph) {
      return '<div class="ap-f"><label for="' + name + '">' + label +
             ' <span class="opt">optional</span></label><input id="' + name + '" name="' + name +
             '" type="text" value="' + (val || '') + '" placeholder="' + ph + '"></div>';
    }
    function get(n) { var e = host.querySelector('[name="' + n + '"]'); return e ? e.value : ''; }

    function paint(keep) {
      var cc = countrySel.value;
      var prev = keep ? { r: get(pre + '_region'), r2: get(pre + '_region2'), lg: get(pre + '_lga') } : { r: '', r2: '', lg: '' };
      var primary = geo ? geo.primary(cc) : [];
      var out = '';

      if (primary.length) {
        out += sel(pre + '_region', geo.labelPrimary(cc), primary, prev.r, true);
      } else {
        out += '<div class="ap-f"><label for="' + pre + '_region">State, province or region <span class="req">*</span></label>' +
               '<input id="' + pre + '_region" name="' + pre + '_region" required value="' + (prev.r || '') +
               '" placeholder="State, province or region"><span class="err">Required.</span></div>';
      }

      var chosen = primary.filter(function (x) { return x.name === prev.r; })[0];
      var secondLabel = chosen ? geo.labelSecondary(cc, chosen.code) : null;
      if (chosen && secondLabel) {
        out += sel(pre + '_region2', secondLabel, geo.secondary(cc, chosen.code), prev.r2, false);
      }

      var lga = chosen ? geo.local(cc, chosen.code) : null;
      if (lga) {
        out += sel(pre + '_lga', 'Local government area', lga, prev.lg, false);
      } else {
        out += text(pre + '_lga', 'Local government, council or district', prev.lg,
                    'If your area uses one');
      }

      host.innerHTML = out;
      var p1 = host.querySelector('[name="' + pre + '_region"]');
      if (p1) p1.addEventListener('change', function () { paint(true); });
    }

    countrySel.addEventListener('change', function () { paint(false); });
    host.__repaint = function () { paint(true); };
    paint(false);
  }

  var PREFERRED = ['NG', 'GB', 'US', 'SA', 'AE', 'GH', 'ZA', 'CA'];
  [].slice.call(form.querySelectorAll('select[data-countries]')).forEach(function (s) {
    fillCountries(s, PREFERRED);
    if (s.getAttribute('data-countries') === 'default-ng') s.value = 'NG';
  });
  [].slice.call(form.querySelectorAll('select[data-dial]')).forEach(fillDial);
  [].slice.call(form.querySelectorAll('[data-cascade]')).forEach(function (wrap) {
    buildCascade(form.querySelector('#' + wrap.getAttribute('data-cascade')), wrap);
  });

  /* ---------------- optional second guardian ---------------- */
  var g2Toggle = document.getElementById('ap-g2-toggle');
  var g2Block = document.getElementById('ap-g2');
  if (g2Toggle && g2Block) {
    g2Toggle.addEventListener('change', function () {
      g2Block.hidden = !g2Toggle.checked;
    });
    g2Block.hidden = true;
  }

  /* ---------------- validation ---------------- */
  function fieldOf(el) { return el.closest('.ap-f') || el.closest('.ap-check') || el.parentElement; }

  function validateStep(i) {
    var scope = steps[i];
    var bad = null;
    // required inputs
    [].slice.call(scope.querySelectorAll('[required]')).forEach(function (el) {
      if (el.disabled || el.closest('[hidden]')) return;
      var ok = el.type === 'checkbox' ? el.checked : String(el.value || '').trim().length > 0;
      if (ok && el.type === 'email') ok = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(el.value.trim());
      var f = fieldOf(el);
      if (f) f.classList.toggle('is-invalid', !ok);
      if (!ok && !bad) bad = el;
    });
    // required radio groups
    [].slice.call(scope.querySelectorAll('[data-required-group]')).forEach(function (grp) {
      var name = grp.getAttribute('data-required-group');
      var ok = !!form.querySelector('input[name="' + name + '"]:checked');
      grp.classList.toggle('is-invalid', !ok);
      var msg = grp.querySelector('.err');
      if (msg) msg.style.display = ok ? 'none' : 'block';
      if (!ok && !bad) bad = grp;
    });
    // required documents
    [].slice.call(scope.querySelectorAll('.ap-doc[data-required]')).forEach(function (d) {
      var key = d.getAttribute('data-key');
      var ok = !!files[key];
      d.classList.toggle('is-invalid', !ok);
      var msg = d.querySelector('.err');
      if (msg) msg.style.display = ok ? 'none' : 'block';
      if (!ok && !bad) bad = d;
    });
    if (bad) {
      bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (bad.focus) try { bad.focus({ preventScroll: true }); } catch (e) {}
    }
    return !bad;
  }

  form.addEventListener('input', function (e) {
    var f = fieldOf(e.target);
    if (f && f.classList.contains('is-invalid')) f.classList.remove('is-invalid');
    scheduleSave();
  });
  form.addEventListener('change', function () { scheduleSave(); });

  /* ---------------- step movement ---------------- */
  function show(i, skipValidate, noScroll) {
    if (i > current && !skipValidate) { for (var k = current; k < i; k++) if (!validateStep(k)) return; }
    current = Math.max(0, Math.min(i, steps.length - 1));
    steps.forEach(function (s, n) { s.classList.toggle('is-active', n === current); });
    railItems.forEach(function (li, n) {
      li.classList.toggle('is-current', n === current);
      li.classList.toggle('is-done', n < current);
      var b = li.querySelector('button');
      if (b) { b.disabled = n > current; b.setAttribute('aria-current', n === current ? 'step' : 'false'); }
    });
    rail.style.setProperty('--ap-progress', current);
    btnBack.hidden = current === 0;
    btnNext.hidden = current === steps.length - 1;
    btnSubmit.hidden = current !== steps.length - 1;
    if (current === steps.length - 1) buildReview();
    if (noScroll) return;
    var card = document.querySelector('.ap-card');
    var top = card.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: top, behavior: 'smooth' });
  }

  btnNext.addEventListener('click', function () { if (validateStep(current)) show(current + 1, true); });
  btnBack.addEventListener('click', function () { show(current - 1, true); });
  railItems.forEach(function (li, n) {
    var b = li.querySelector('button');
    if (b) b.addEventListener('click', function () { if (n <= current) show(n, true); });
  });

  /* ---------------- documents ---------------- */
  [].slice.call(form.querySelectorAll('.ap-doc')).forEach(function (doc) {
    var key = doc.getAttribute('data-key');
    var input = doc.querySelector('input[type=file]');
    var btn = doc.querySelector('.ap-doc-btn');
    var nameEl = doc.querySelector('.ap-doc-file');
    var thumb = doc.querySelector('.ap-doc-thumb');
    var clear = doc.querySelector('.ap-doc-clear');
    var err = doc.querySelector('.err');

    function accept(file) {
      if (!file) return;
      if (OK_TYPES.indexOf(file.type) === -1 && !/\.(jpe?g|png|webp|heic|pdf)$/i.test(file.name)) {
        err.textContent = 'Please upload a JPG, PNG, WEBP, HEIC or PDF.'; err.style.display = 'block'; return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        err.textContent = 'That file is larger than ' + MAX_MB + ' MB. Please upload a smaller scan.';
        err.style.display = 'block'; return;
      }
      err.style.display = 'none';
      files[key] = file;
      doc.classList.add('is-filled'); doc.classList.remove('is-invalid');
      nameEl.textContent = file.name + '  ·  ' + Math.round(file.size / 1024) + ' KB';
      if (/^image\//.test(file.type)) {
        var r = new FileReader();
        r.onload = function (ev) { thumb.src = ev.target.result; };
        r.readAsDataURL(file);
      } else { thumb.removeAttribute('src'); }
      btn.textContent = 'Replace';
    }

    btn.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { accept(input.files[0]); });
    clear.addEventListener('click', function () {
      delete files[key]; input.value = ''; thumb.removeAttribute('src');
      doc.classList.remove('is-filled'); btn.textContent = 'Choose file';
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      doc.addEventListener(ev, function (e) { e.preventDefault(); doc.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      doc.addEventListener(ev, function (e) { e.preventDefault(); doc.classList.remove('is-over'); });
    });
    doc.addEventListener('drop', function (e) {
      if (e.dataTransfer && e.dataTransfer.files.length) accept(e.dataTransfer.files[0]);
    });
  });

  /* ---------------- draft saving ---------------- */
  var saveTimer = null;
  function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 700); }
  function save() {
    try {
      var d = {};
      new FormData(form).forEach(function (v, k) { if (typeof v === 'string') d[k] = v; });
      d.__step = current;
      localStorage.setItem(STORE, JSON.stringify(d));
      if (saveNote) { saveNote.innerHTML = 'Draft saved &middot; <b>' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + '</b>'; }
    } catch (e) { /* private mode */ }
  }
  function restore() {
    var raw; try { raw = localStorage.getItem(STORE); } catch (e) { return; }
    if (!raw) return;
    var d; try { d = JSON.parse(raw); } catch (e) { return; }
    Object.keys(d).forEach(function (k) {
      if (k === '__step') return;
      var els = form.querySelectorAll('[name="' + k + '"]');
      els.forEach(function (el) {
        if (el.type === 'radio' || el.type === 'checkbox') { if (el.value === d[k]) el.checked = true; }
        else el.value = d[k];
      });
    });
    // repaint dependent region selects with restored values
    [].slice.call(form.querySelectorAll('[data-cascade]')).forEach(function (wrap) {
      var pre = wrap.getAttribute('data-prefix') || 'addr';
      ['_region', '_region2', '_lga'].forEach(function (k) {
        var t = wrap.querySelector('[name="' + pre + k + '"]');
        if (t && d[pre + k]) t.value = d[pre + k];
      });
      if (wrap.__repaint) wrap.__repaint();
      ['_region', '_region2', '_lga'].forEach(function (k) {
        var t = wrap.querySelector('[name="' + pre + k + '"]');
        if (t && d[pre + k]) t.value = d[pre + k];
      });
    });
    if (g2Toggle && g2Block) g2Block.hidden = !g2Toggle.checked;
    if (saveNote) saveNote.innerHTML = 'Draft restored &middot; <b>continue where you left off</b>';
  }

  /* ---------------- review ---------------- */
  var REVIEW = [
    { step: 0, title: 'Programme', keys: [['institution', 'Institution'], ['entry_class', 'Entry class'], ['entry_term', 'Intended start'], ['attendance', 'Attendance']] },
    { step: 1, title: 'The student', keys: [['student_name', 'Full name'], ['student_preferred', 'Known as'], ['student_dob', 'Date of birth'], ['student_gender', 'Gender'], ['student_nationality', 'Nationality'], ['student_birth_country', 'Country of birth'], ['student_language', 'First language']] },
    { step: 2, title: 'Family and contact', keys: [['g1_name', 'Parent or guardian'], ['g1_relationship', 'Relationship'], ['g1_email', 'Email'], ['g1_phone', 'Telephone'], ['g2_name', 'Second guardian'], ['addr_line1', 'Address'], ['addr_city', 'City'], ['addr_region', 'State or province'], ['addr_region2', 'District'], ['addr_lga', 'Local government'], ['addr_country', 'Country'], ['emg_name', 'Emergency contact']] },
    { step: 3, title: 'Academic history', keys: [['prev_school', 'Present or last school'], ['prev_country', 'School country'], ['prev_class', 'Class completed'], ['prev_language', 'Language of instruction'], ['prev_reason', 'Reason for leaving'], ['needs', 'Learning support'], ['medical', 'Medical notes']] },
    { step: 3, title: 'Fees and support', keys: [['prev_tuition', 'Previous school fees'], ['income_band', 'Household income band'], ['bursary', 'Bursary consideration']] },
    { step: 5, title: 'Additional information', keys: [['heard', 'How you heard of us'], ['sibling', 'Sibling at SHRS'], ['contact_pref', 'Preferred contact'], ['notes', 'Anything else']] }
  ];

  function buildReview() {
    var host = document.getElementById('ap-review');
    if (!host) return;
    var fd = new FormData(form);
    var out = '';
    REVIEW.forEach(function (block) {
      var rows = '';
      block.keys.forEach(function (pair) {
        var v = fd.get(pair[0]);
        if (typeof v !== 'string') v = '';
        v = v.trim();
        if (pair[0] === 'g1_phone') v = (fd.get('g1_dial') || '') + ' ' + v;
        if (COUNTRY_FIELDS.indexOf(pair[0]) !== -1) v = countryName(v);
        if (!v) return;
        rows += '<dt>' + pair[1] + '</dt><dd>' + esc(v) + '</dd>';
      });
      if (!rows) return;
      out += '<div class="ap-rev-block"><h4>' + block.title +
             '<button type="button" data-goto="' + block.step + '">Edit</button></h4><dl>' + rows + '</dl></div>';
    });
    var docRows = '';
    [].slice.call(form.querySelectorAll('.ap-doc')).forEach(function (d) {
      var k = d.getAttribute('data-key');
      var label = d.querySelector('b').textContent;
      docRows += '<dt>' + label + '</dt><dd>' + (files[k] ? esc(files[k].name) : '— not attached —') + '</dd>';
    });
    out += '<div class="ap-rev-block"><h4>Documents<button type="button" data-goto="4">Edit</button></h4><dl>' + docRows + '</dl></div>';
    host.innerHTML = out;
    [].slice.call(host.querySelectorAll('[data-goto]')).forEach(function (b) {
      b.addEventListener('click', function () { show(parseInt(b.getAttribute('data-goto'), 10), true); });
    });
  }
  var COUNTRY_FIELDS = ['student_nationality', 'student_birth_country', 'addr_country', 'prev_country'];
  function countryName(code) {
    if (!geo || !code) return code;
    for (var i = 0; i < geo.countries.length; i++) if (geo.countries[i].code === code) return geo.countries[i].name;
    return code;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------------- submit ---------------- */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(current)) return;

    var ref = 'SHRS-' + new Date().getFullYear() + '-' +
              Math.random().toString(36).slice(2, 7).toUpperCase();

    var fd = new FormData(form);
    fd.append('_subject', 'Admission application — ' + (fd.get('student_name') || 'new applicant') + ' (' + ref + ')');
    fd.append('_template', 'table');
    fd.append('_captcha', 'false');
    fd.append('reference', ref);
    Object.keys(files).forEach(function (k) { fd.append(k, files[k], files[k].name); });

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Submitting…';

    fetch(ENDPOINT, { method: 'POST', body: fd })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r; })
      .then(function () {
        try { localStorage.removeItem(STORE); } catch (e2) {}
        done(ref);
      })
      .catch(function () {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Submit application';
        var box = document.getElementById('ap-submit-error');
        if (box) {
          box.hidden = false;
          box.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      });
  });

  function done(ref) {
    document.getElementById('ap-form').hidden = true;
    rail.hidden = true;
    var d = document.getElementById('ap-done');
    d.hidden = false;
    document.getElementById('ap-ref').textContent = ref;
    d.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------------- boot ---------------- */
  restore();
  show(0, true, true);
})();

/* ==========================================================================
   Chrome motion — header lift and the slow footer rise.
   Separate IIFE so a fault here can never break the wizard itself.
   ========================================================================== */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* header gains a deeper shadow once the page has moved */
  var bar = document.querySelector('.ap-topbar');
  if (bar) {
    var stuck = false;
    var onScroll = function () {
      var want = window.scrollY > 12;
      if (want !== stuck) { stuck = want; bar.classList.toggle('is-stuck', want); }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* footer rises once, slowly, when it comes into view */
  var foot = document.querySelector('.ap-foot');
  if (foot) {
    if (reduce || !('IntersectionObserver' in window)) {
      foot.classList.add('is-in');
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { foot.classList.add('is-in'); io.disconnect(); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });
      io.observe(foot);
    }
  }
})();
