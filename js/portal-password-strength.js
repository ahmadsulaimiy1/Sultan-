// Live password strength meter — attaches automatically to any input
// with a data-password-strength attribute (registration's password
// field, all three set-password pages' new-password field, and the
// Personalisation Centre's change-password newPassword field). Not
// applied to "current password" or login fields, since strength only
// means something when someone is choosing a new one.
(function(){
  var CRITERIA = [
    { test: function(v){ return v.length >= 12; }, label: '12+ characters' },
    { test: function(v){ return /[A-Z]/.test(v); }, label: 'Uppercase letter' },
    { test: function(v){ return /[a-z]/.test(v); }, label: 'Lowercase letter' },
    { test: function(v){ return /[0-9]/.test(v); }, label: 'Number' },
    { test: function(v){ return /[^A-Za-z0-9]/.test(v); }, label: 'Special character' },
  ];
  var LABELS = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  var COLORS = ['#b23b3b', '#c17a2e', '#c1a52e', '#5a8f4f', '#2f6f4f'];

  function buildMeter(input){
    if(input.dataset.pwMeterBuilt) return;
    input.dataset.pwMeterBuilt = '1';

    var meter = document.createElement('div');
    meter.className = 'pw-strength-meter';
    meter.innerHTML =
      '<div class="pw-strength-track"><div class="pw-strength-fill"></div></div>' +
      '<div class="pw-strength-label"></div>' +
      '<ul class="pw-strength-checklist"></ul>';

    var host = input.closest('.pw-toggle-wrap') || input;
    host.parentNode.insertBefore(meter, host.nextSibling);

    var fill = meter.querySelector('.pw-strength-fill');
    var label = meter.querySelector('.pw-strength-label');
    var list = meter.querySelector('.pw-strength-checklist');
    CRITERIA.forEach(function(c){
      var li = document.createElement('li');
      li.textContent = c.label;
      list.appendChild(li);
    });
    var items = list.querySelectorAll('li');

    function update(){
      var value = input.value || '';
      var score = 0;
      CRITERIA.forEach(function(c, i){
        var met = value.length > 0 && c.test(value);
        if(met) score++;
        items[i].classList.toggle('is-met', met);
        items[i].textContent = (met ? '✔ ' : '') + c.label;
      });
      if(!value){
        meter.hidden = true;
        return;
      }
      meter.hidden = false;
      var idx = Math.max(0, score - 1);
      fill.style.width = (score / CRITERIA.length * 100) + '%';
      fill.style.background = COLORS[idx];
      label.textContent = LABELS[idx];
      label.style.color = COLORS[idx];
    }

    meter.hidden = true;
    input.addEventListener('input', update);
  }

  function scan(root){
    var inputs = root.querySelectorAll ? root.querySelectorAll('[data-password-strength]') : [];
    for(var i = 0; i < inputs.length; i++){ buildMeter(inputs[i]); }
  }

  scan(document);

  var observer = new MutationObserver(function(mutations){
    for(var i = 0; i < mutations.length; i++){
      var added = mutations[i].addedNodes;
      for(var j = 0; j < added.length; j++){
        var node = added[j];
        if(node.nodeType !== 1) continue;
        if(node.matches && node.matches('[data-password-strength]')) buildMeter(node);
        else scan(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
