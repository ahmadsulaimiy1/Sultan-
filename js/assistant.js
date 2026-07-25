(function(){
  var root = document.querySelector('[data-assistant]');
  if(!root || !window.ASSISTANT_CONFIG) return;
  var config = window.ASSISTANT_CONFIG;
  var strings = config.strings;
  var speechLang = config.speechLang || (config.lang === 'ar' ? 'ar-SA' : 'en-US');

  var panel = root.querySelector('[data-assistant-panel]');
  var headEl = root.querySelector('[data-assistant-head]');
  var messagesEl = root.querySelector('[data-assistant-messages]');
  var startersEl = root.querySelector('[data-assistant-starters]');
  var toggleBtn = root.querySelector('[data-assistant-toggle]');
  var closeBtn = root.querySelector('[data-assistant-close]');
  var minimizeBtn = root.querySelector('[data-assistant-minimize]');
  var fullscreenBtn = root.querySelector('[data-assistant-fullscreen]');
  var newChatBtn = root.querySelector('[data-assistant-new]');
  var form = root.querySelector('[data-assistant-form]');
  var input = root.querySelector('[data-assistant-input]');
  var sendBtn = root.querySelector('[data-assistant-send]');
  var stopBtn = root.querySelector('[data-assistant-stop]');
  var micBtn = root.querySelector('[data-assistant-mic]');
  var speakToggleBtn = root.querySelector('[data-assistant-speak-toggle]');
  var contactToggleBtn = root.querySelector('[data-assistant-contact-toggle]');
  var uploadBtn = root.querySelector('[data-assistant-upload-btn]');
  var uploadInput = root.querySelector('[data-assistant-upload]');
  var attachmentEl = root.querySelector('[data-assistant-attachment]');
  var attachmentLabelEl = root.querySelector('[data-assistant-attachment-label]');
  var attachmentRemoveBtn = root.querySelector('[data-assistant-attachment-remove]');

  var MAX_USER_TURNS = 40;
  var MAX_ATTACHMENT_CHARS = 6000;
  var MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
  var WHATSAPP_NUMBER = '2348073747650';
  var PREFS_KEY = 'shrsPersonalisation';
  var headSubEl = root.querySelector('.assistant-head-sub');
  var OFFICE_LABELS = {
    en: {
      admissions: 'Admissions Office', parent: 'Parent Services', student: 'Student Affairs',
      academic: 'Academic Office', quran: "Qur'an College Office",
    },
    ar: {
      admissions: 'مكتب القبول', parent: 'خدمات أولياء الأمور', student: 'شؤون الطلاب',
      academic: 'المكتب الأكاديمي', quran: 'مكتب كلية القرآن',
    },
  };

  function currentOffice(){
    try{
      var raw = window.localStorage.getItem(PREFS_KEY);
      if(!raw) return null;
      var prefs = JSON.parse(raw);
      return (prefs && prefs.aiOffice) || null;
    }catch(err){ return null; }
  }

  function updateOfficeBadge(){
    if(!headSubEl) return;
    var office = currentOffice();
    var labels = OFFICE_LABELS[config.lang] || OFFICE_LABELS.en;
    headSubEl.textContent = (office && labels[office]) ? labels[office] : 'Sultan Hanafi Royal Schools';
  }
  updateOfficeBadge();
  document.addEventListener('sultan:personalisation-changed', updateOfficeBadge);

  var history = [];
  var pendingAttachment = null;
  var activeController = null;
  var speakEnabled = false;
  var recognizing = false;
  var recognition = null;
  var scriptCache = {};

  function broadcastCovering(){
    var covering = !panel.hidden && !panel.classList.contains('is-minimized');
    document.dispatchEvent(new CustomEvent('sultan:chat-covering', { detail: { covering: covering } }));
  }

  function open(){
    panel.hidden = false;
    panel.classList.remove('is-minimized');
    toggleBtn.setAttribute('aria-expanded', 'true');
    if(!messagesEl.childElementCount) renderStarters();
    input.focus();
    broadcastCovering();
  }
  function close(){
    panel.hidden = true;
    panel.classList.remove('is-minimized', 'is-fullscreen');
    fullscreenBtn.classList.remove('is-active');
    fullscreenBtn.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('assistant-fullscreen-lock');
    toggleBtn.setAttribute('aria-expanded', 'false');
    broadcastCovering();
  }
  toggleBtn.addEventListener('click', function(){ panel.hidden ? open() : close(); });
  closeBtn.addEventListener('click', close);

  minimizeBtn.addEventListener('click', function(){
    var minimizing = !panel.classList.contains('is-minimized');
    panel.classList.toggle('is-minimized', minimizing);
    minimizeBtn.setAttribute('aria-pressed', String(minimizing));
    if(minimizing){
      panel.classList.remove('is-fullscreen');
      fullscreenBtn.classList.remove('is-active');
      fullscreenBtn.setAttribute('aria-pressed', 'false');
      document.body.classList.remove('assistant-fullscreen-lock');
    }
    broadcastCovering();
  });
  headEl.addEventListener('click', function(e){
    if(e.target.closest('.assistant-head-actions')) return;
    if(panel.classList.contains('is-minimized')){
      panel.classList.remove('is-minimized');
      minimizeBtn.setAttribute('aria-pressed', 'false');
      broadcastCovering();
    }
  });
  fullscreenBtn.addEventListener('click', function(){
    var entering = !panel.classList.contains('is-fullscreen');
    panel.classList.toggle('is-fullscreen', entering);
    fullscreenBtn.classList.toggle('is-active', entering);
    fullscreenBtn.setAttribute('aria-pressed', String(entering));
    document.body.classList.toggle('assistant-fullscreen-lock', entering);
    if(entering){
      panel.classList.remove('is-minimized');
      minimizeBtn.setAttribute('aria-pressed', 'false');
    }
    broadcastCovering();
  });

  function scrollToBottom(){
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(text, who){
    var div = document.createElement('div');
    div.className = 'assistant-msg assistant-msg-' + (who || 'bot');
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function addNotice(text){
    var div = document.createElement('div');
    div.className = 'assistant-msg assistant-msg-notice';
    div.textContent = text;
    messagesEl.appendChild(div);
    scrollToBottom();
    return div;
  }

  function lastUserText(){
    for(var i = history.length - 1; i >= 0; i--){
      if(history[i].role === 'user' && typeof history[i].content === 'string' && history[i].content.trim()){
        return history[i].content.trim();
      }
    }
    return '';
  }

  function whatsappHref(){
    var q = lastUserText();
    var text = q ? (strings.whatsappPrefill + ' ' + q) : strings.whatsappPrefill;
    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text.slice(0, 700));
  }

  function addEscalationLink(){
    var a = document.createElement('a');
    a.className = 'assistant-escalate';
    a.href = whatsappHref();
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = strings.continueOnWhatsapp;
    messagesEl.appendChild(a);
    scrollToBottom();
    return a;
  }

  function renderStarters(){
    startersEl.innerHTML = '';
    if(!config.starters || !config.starters.length) return;
    addMessage(strings.greeting, 'bot');
    config.starters.forEach(function(s){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'assistant-chip';
      btn.textContent = s.label;
      btn.addEventListener('click', function(){
        startersEl.innerHTML = '';
        sendMessage(s.prompt);
      });
      startersEl.appendChild(btn);
    });
  }

  function setBusy(busy){
    input.disabled = busy;
    sendBtn.hidden = busy;
    stopBtn.hidden = !busy;
    uploadBtn.disabled = busy;
    micBtn.disabled = busy;
  }

  function userTurnCount(){
    var n = 0;
    for(var i = 0; i < history.length; i++){ if(history[i].role === 'user') n++; }
    return n;
  }

  function speak(text){
    if(!speakEnabled || !window.speechSynthesis) return;
    try{
      window.speechSynthesis.cancel();
      var utter = new SpeechSynthesisUtterance(text);
      utter.lang = speechLang;
      window.speechSynthesis.speak(utter);
    }catch(err){ /* speech synthesis unavailable — silently skip */ }
  }

  function buildOutgoingContent(text){
    if(!pendingAttachment) return text;
    var blocks = [{ type: 'text', text: text || (pendingAttachment.kind === 'image' ? '(see attached image)' : '(see attached document)') }];
    if(pendingAttachment.kind === 'text'){
      blocks.push({ type: 'text', text: 'Attached file "' + pendingAttachment.label + '":\n' + pendingAttachment.text });
    } else if(pendingAttachment.kind === 'image'){
      blocks.push({ type: 'image', source: { type: 'base64', media_type: pendingAttachment.mediaType, data: pendingAttachment.data } });
    }
    return blocks;
  }

  function sendMessage(text){
    text = (text || '').trim();
    if(!text && !pendingAttachment) return;
    if(userTurnCount() >= MAX_USER_TURNS){
      addNotice(strings.longConversation);
      addEscalationLink();
      return;
    }

    var displayText = text || (pendingAttachment ? '[' + pendingAttachment.label + ']' : '');
    addMessage(displayText, 'user');

    history.push({ role: 'user', content: buildOutgoingContent(text) });
    clearAttachment();
    input.value = '';
    autosize();
    streamReply();
  }

  async function streamReply(){
    activeController = new AbortController();
    setBusy(true);
    var botEl = addMessage(strings.thinking + '…', 'bot');
    botEl.classList.add('assistant-msg-pending');
    var full = '';

    try{
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ lang: config.lang, office: currentOffice(), messages: history }),
        signal: activeController.signal,
      });

      if(!res.ok || !res.body){
        var errPayload = null;
        try{ errPayload = await res.json(); }catch(e){}
        throw new Error((errPayload && errPayload.error) || strings.errorGeneric);
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var startedStreaming = false;

      while(true){
        var chunk = await reader.read();
        if(chunk.done) break;
        var piece = decoder.decode(chunk.value, { stream: true });
        if(!piece) continue;
        if(!startedStreaming){
          startedStreaming = true;
          botEl.classList.remove('assistant-msg-pending');
          botEl.textContent = '';
        }
        full += piece;
        botEl.textContent = full;
        scrollToBottom();
      }

      if(full.trim()){
        history.push({ role: 'assistant', content: full });
        speak(full);
      } else {
        botEl.remove();
      }
    }catch(err){
      if(err && err.name === 'AbortError'){
        if(full.trim()){
          history.push({ role: 'assistant', content: full });
        } else {
          botEl.remove();
        }
      } else {
        botEl.classList.remove('assistant-msg-pending');
        botEl.classList.add('assistant-msg-error');
        botEl.textContent = (err && err.message) || strings.errorGeneric;
        addEscalationLink();
      }
    } finally {
      setBusy(false);
      activeController = null;
      input.focus();
    }
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    sendMessage(input.value);
  });
  input.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !e.shiftKey){
      e.preventDefault();
      sendMessage(input.value);
    }
  });
  function autosize(){
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  }
  input.addEventListener('input', autosize);

  stopBtn.addEventListener('click', function(){
    if(activeController) activeController.abort();
    if(window.speechSynthesis) window.speechSynthesis.cancel();
  });

  newChatBtn.addEventListener('click', function(){
    if(activeController) activeController.abort();
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    history = [];
    clearAttachment();
    messagesEl.innerHTML = '';
    input.value = '';
    autosize();
    renderStarters();
  });

  // --- Voice output toggle ---
  function updateSpeakToggleLabel(){
    speakToggleBtn.textContent = speakEnabled ? strings.speakToggleOn : strings.speakToggleOff;
    speakToggleBtn.setAttribute('aria-pressed', String(speakEnabled));
  }
  updateSpeakToggleLabel();
  speakToggleBtn.addEventListener('click', function(){
    speakEnabled = !speakEnabled;
    if(!speakEnabled && window.speechSynthesis) window.speechSynthesis.cancel();
    updateSpeakToggleLabel();
  });

  // --- Voice input ---
  var SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(SpeechRecognitionCtor){
    recognition = new SpeechRecognitionCtor();
    recognition.lang = speechLang;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.addEventListener('result', function(e){
      var transcript = '';
      for(var i = 0; i < e.results.length; i++){
        transcript += e.results[i][0].transcript;
      }
      input.value = transcript;
      autosize();
    });
    recognition.addEventListener('end', function(){
      recognizing = false;
      micBtn.classList.remove('is-listening');
      micBtn.setAttribute('aria-pressed', 'false');
    });
    recognition.addEventListener('error', function(){
      recognizing = false;
      micBtn.classList.remove('is-listening');
      micBtn.setAttribute('aria-pressed', 'false');
    });

    micBtn.addEventListener('click', function(){
      if(recognizing){
        recognition.stop();
        return;
      }
      try{
        recognition.start();
        recognizing = true;
        micBtn.classList.add('is-listening');
        micBtn.setAttribute('aria-pressed', 'true');
      }catch(err){ /* already started or blocked — ignore */ }
    });
  } else {
    micBtn.addEventListener('click', function(){
      addNotice(strings.micUnsupported);
    });
  }

  // --- Document / image attachment ---
  function setAttachment(label, kind, payload){
    pendingAttachment = Object.assign({ label: label, kind: kind }, payload);
    attachmentLabelEl.textContent = label;
    attachmentEl.hidden = false;
  }
  function clearAttachment(){
    pendingAttachment = null;
    attachmentEl.hidden = true;
    attachmentLabelEl.textContent = '';
    uploadInput.value = '';
  }
  attachmentRemoveBtn.addEventListener('click', clearAttachment);
  uploadBtn.addEventListener('click', function(){ uploadInput.click(); });

  function loadScriptOnce(src){
    if(scriptCache[src]) return scriptCache[src];
    scriptCache[src] = new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = function(){ reject(new Error('load failed')); };
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }

  function readAsText(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
  function readAsArrayBuffer(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }
  function readAsDataURL(file){
    return new Promise(function(resolve, reject){
      var reader = new FileReader();
      reader.onload = function(){ resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function extractPdfText(file){
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    var buffer = await readAsArrayBuffer(file);
    var doc = await window.pdfjsLib.getDocument({ data: buffer }).promise;
    var text = '';
    for(var i = 1; i <= doc.numPages && text.length < MAX_ATTACHMENT_CHARS; i++){
      var page = await doc.getPage(i);
      var content = await page.getTextContent();
      text += content.items.map(function(it){ return it.str; }).join(' ') + '\n';
    }
    return text;
  }

  async function extractDocxText(file){
    await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
    var buffer = await readAsArrayBuffer(file);
    var result = await window.mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  uploadInput.addEventListener('change', async function(){
    var file = uploadInput.files && uploadInput.files[0];
    if(!file) return;

    if(file.size > MAX_ATTACHMENT_BYTES){
      addNotice(strings.uploadTooLarge);
      uploadInput.value = '';
      return;
    }

    var name = file.name || 'attachment';
    var lower = name.toLowerCase();
    var reading = addNotice(strings.uploadReading);

    try{
      if(file.type.indexOf('image/') === 0){
        var dataUrl = await readAsDataURL(file);
        var base64 = dataUrl.split(',')[1];
        setAttachment(name, 'image', { mediaType: file.type, data: base64 });
      } else if(file.type === 'text/plain' || lower.endsWith('.txt')){
        var text = await readAsText(file);
        setAttachment(name, 'text', { text: text.slice(0, MAX_ATTACHMENT_CHARS) });
      } else if(file.type === 'application/pdf' || lower.endsWith('.pdf')){
        var pdfText = await extractPdfText(file);
        setAttachment(name, 'text', { text: pdfText.slice(0, MAX_ATTACHMENT_CHARS) });
      } else if(lower.endsWith('.docx') || file.type.indexOf('wordprocessingml') !== -1){
        var docxText = await extractDocxText(file);
        setAttachment(name, 'text', { text: docxText.slice(0, MAX_ATTACHMENT_CHARS) });
      } else {
        addNotice(strings.uploadUnsupported);
        uploadInput.value = '';
        reading.remove();
        return;
      }
      reading.remove();
    }catch(err){
      reading.remove();
      addNotice(strings.uploadReadError);
      uploadInput.value = '';
    }
  });

  // --- On-demand lead capture (real staff handoff, not gated behind a decision tree) ---
  function renderContactForm(){
    var waLink = document.createElement('a');
    waLink.className = 'assistant-escalate';
    waLink.href = whatsappHref();
    waLink.target = '_blank';
    waLink.rel = 'noopener';
    waLink.textContent = strings.continueOnWhatsapp;
    messagesEl.appendChild(waLink);

    var wrap = document.createElement('div');
    wrap.className = 'assistant-msg assistant-msg-bot';
    var form = document.createElement('form');
    form.className = 'assistant-contact-form';
    form.innerHTML =
      '<input type="text" name="full_name" placeholder="' + strings.namePlaceholder + '" required />' +
      '<input type="text" name="contact" placeholder="' + strings.contactPlaceholder + '" required />' +
      '<input type="hidden" name="_subject" value="' + strings.emailSubject + '" />' +
      '<input type="hidden" name="_template" value="table" />' +
      '<input type="hidden" name="_captcha" value="false" />' +
      '<input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />' +
      '<button type="submit" class="btn btn-gold">' + strings.sendLabel + '</button>';

    form.addEventListener('submit', function(e){
      e.preventDefault();
      var btn = form.querySelector('button');
      var originalLabel = btn.textContent;
      btn.disabled = true;
      btn.textContent = strings.sendingLabel;
      var fd = new FormData(form);
      fd.append('language', config.lang);
      fd.append('submitted_at', new Date().toISOString());
      var endpoint = config.endpoint.replace('formsubmit.co/', 'formsubmit.co/ajax/');
      fetch(endpoint, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } })
        .then(function(res){
          if(!res.ok) throw new Error('bad status ' + res.status);
          form.remove();
          addMessage(strings.sentConfirmation, 'bot');
        })
        .catch(function(){
          btn.disabled = false;
          btn.textContent = originalLabel;
          addMessage(strings.sendError, 'bot');
        });
    });
    wrap.appendChild(form);
    messagesEl.appendChild(wrap);
    scrollToBottom();
  }
  contactToggleBtn.addEventListener('click', function(){
    if(!messagesEl.childElementCount) renderStarters();
    renderContactForm();
  });
})();
