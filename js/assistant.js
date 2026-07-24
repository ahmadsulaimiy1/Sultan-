(function(){
  var root = document.querySelector('[data-assistant]');
  if(!root || !window.ASSISTANT_CONFIG) return;
  var config = window.ASSISTANT_CONFIG;
  var panel = root.querySelector('[data-assistant-panel]');
  var messagesEl = root.querySelector('[data-assistant-messages]');
  var optionsEl = root.querySelector('[data-assistant-options]');
  var toggleBtn = root.querySelector('[data-assistant-toggle]');
  var closeBtn = root.querySelector('[data-assistant-close]');

  var context = { language: config.lang };
  var stepCount = 0;

  function open(){
    panel.hidden = false;
    toggleBtn.setAttribute('aria-expanded', 'true');
    if(!messagesEl.childElementCount) goTo(config.start);
  }
  function close(){
    panel.hidden = true;
    toggleBtn.setAttribute('aria-expanded', 'false');
  }
  toggleBtn.addEventListener('click', function(){ panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);

  function addMessage(text, who){
    var div = document.createElement('div');
    div.className = 'assistant-msg assistant-msg-' + (who || 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addLinks(links){
    if(!links) return;
    links.forEach(function(l){
      var a = document.createElement('a');
      a.href = l.href;
      a.textContent = l.label;
      a.className = 'assistant-link';
      if(l.href.indexOf('http') === 0){ a.target = '_blank'; a.rel = 'noopener'; }
      messagesEl.appendChild(a);
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function renderOptions(options){
    optionsEl.innerHTML = '';
    options.forEach(function(opt){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'assistant-chip';
      btn.textContent = opt.label;
      btn.addEventListener('click', function(){
        addMessage(opt.label, 'user');
        if(opt.set) Object.assign(context, opt.set);
        optionsEl.innerHTML = '';
        if(opt.action === 'contactForm'){
          renderContactForm();
        } else if(opt.next){
          stepCount++;
          if(stepCount > 10){ goTo(config.fallback); return; }
          goTo(opt.next);
        }
      });
      optionsEl.appendChild(btn);
    });
  }

  function goTo(nodeId){
    var node = config.nodes[nodeId];
    if(!node) return;
    addMessage(node.message, 'bot');
    addLinks(node.links);
    if(node.options) renderOptions(node.options);
  }

  function renderContactForm(){
    optionsEl.innerHTML = '';
    var s = config.strings;
    var form = document.createElement('form');
    form.className = 'assistant-contact-form';
    form.innerHTML =
      '<input type="text" name="full_name" placeholder="' + s.namePlaceholder + '" required />' +
      '<input type="text" name="contact" placeholder="' + s.contactPlaceholder + '" required />' +
      '<input type="hidden" name="_subject" value="' + s.emailSubject + '" />' +
      '<input type="hidden" name="_template" value="table" />' +
      '<input type="hidden" name="_captcha" value="false" />' +
      '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />' +
      '<button type="submit" class="btn btn-gold">' + s.sendLabel + '</button>';

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button');
      var originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = s.sendingLabel;
      var fd = new FormData(form);
      Object.keys(context).forEach(function(k){ fd.append(k, context[k]); });
      fd.append('submitted_at', new Date().toISOString());
      var endpoint = config.endpoint.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      fetch(endpoint, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function(res){
          if(!res.ok) throw new Error('bad status ' + res.status);
          form.remove();
          addMessage(s.sentConfirmation, 'bot');
        })
        .catch(function(){
          btn.disabled = false;
          btn.textContent = originalLabel;
          addMessage(s.sendError, 'bot');
        });
    });
    optionsEl.appendChild(form);
  }
})();
