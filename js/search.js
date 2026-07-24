(function(){
  var overlay = document.querySelector('[data-search-overlay]');
  var toggleBtns = document.querySelectorAll('[data-search-toggle]');
  if(!overlay || !toggleBtns.length) return;

  var input = overlay.querySelector('[data-search-input]');
  var resultsEl = overlay.querySelector('[data-search-results]');
  var closeBtn = overlay.querySelector('[data-search-close]');
  var indexUrl = overlay.getAttribute('data-search-index');
  var emptyText = overlay.getAttribute('data-search-empty') || '';
  var index = null;
  var indexPromise = null;

  function loadIndex(){
    if(!indexPromise){
      indexPromise = fetch(indexUrl).then(function(res){ return res.json(); })
        .then(function(data){ index = data; })
        .catch(function(){ index = []; });
    }
    return indexPromise;
  }

  function open(){
    overlay.hidden = false;
    document.body.classList.add('search-lock');
    input.value = '';
    resultsEl.innerHTML = '';
    loadIndex().then(runSearch);
    input.focus();
  }
  function close(){
    overlay.hidden = true;
    document.body.classList.remove('search-lock');
  }

  toggleBtns.forEach(function(btn){ btn.addEventListener('click', open); });
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(e){ if(e.target === overlay) close(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape' && !overlay.hidden) close(); });

  function render(items){
    resultsEl.innerHTML = '';
    if(!items.length){
      var empty = document.createElement('p');
      empty.className = 'search-empty';
      empty.textContent = emptyText;
      resultsEl.appendChild(empty);
      return;
    }
    items.slice(0, 12).forEach(function(item){
      var a = document.createElement('a');
      a.className = 'search-result';
      a.href = item.url;
      var title = document.createElement('span');
      title.className = 'search-result-title';
      title.textContent = item.title;
      var desc = document.createElement('span');
      desc.className = 'search-result-desc';
      desc.textContent = item.description;
      a.appendChild(title);
      a.appendChild(desc);
      resultsEl.appendChild(a);
    });
  }

  // Strips apostrophes/curly quotes so "quran" matches "Qur'an" and
  // similar real-world query vs. published-spelling mismatches.
  function normalize(s){
    return s.toLowerCase().replace(/['‘’]/g, '');
  }

  function runSearch(){
    var q = normalize(input.value.trim());
    if(!q){ resultsEl.innerHTML = ''; return; }
    if(!index){ return; }
    var matches = index
      .map(function(item){
        var titleIdx = normalize(item.title).indexOf(q);
        var descIdx = normalize(item.description).indexOf(q);
        var score = titleIdx === 0 ? 0 : titleIdx > -1 ? 1 : descIdx > -1 ? 2 : -1;
        return { item: item, score: score };
      })
      .filter(function(m){ return m.score > -1; })
      .sort(function(a, b){ return a.score - b.score; })
      .map(function(m){ return m.item; });
    render(matches);
  }

  input.addEventListener('input', runSearch);
})();
