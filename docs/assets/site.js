var __siteScript = document.currentScript && document.currentScript.src;
// Progressive enhancement: cursor spotlight on cards + scroll reveal.
document.documentElement.classList.remove('no-js');

document.querySelectorAll('.card').forEach(function (card) {
  card.addEventListener('pointermove', function (e) {
    var r = card.getBoundingClientRect();
    card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
    card.style.setProperty('--my', (e.clientY - r.top) + 'px');
  });
});

var items = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.08 });
  items.forEach(function (el) { io.observe(el); });
} else {
  items.forEach(function (el) { el.classList.add('in'); });
}


// "Copy for AI": copies assets/portfolio-for-ai.md to the clipboard (and offers it as a download).
(function () {
  var buttons = document.querySelectorAll('[data-copy-ai]');
  if (!buttons.length || !__siteScript) return;
  var pt = /^pt/i.test(document.documentElement.lang);
  var T = pt ? {
    copied: 'Copiado para a área de transferência, pronto para colar em um chat de IA.', dl: 'Baixar .md',
    fail: 'Não foi possível copiar automaticamente.', wait: 'Quase pronto. Toque no botão novamente.', blocked: 'O navegador bloqueou a cópia.', done: '✓ Copiado'
  } : {
    copied: 'Copied to your clipboard, ready to paste into an AI chat.', dl: 'Download .md',
    fail: 'Could not copy automatically.', wait: 'Almost ready. Tap the button again.', blocked: 'Copy blocked by the browser.', done: '✓ Copied'
  };
  var mdUrl = new URL(pt ? 'portfolio-for-ai.pt-br.md' : 'portfolio-for-ai.md', __siteScript).href;
  var text = null;
  // Prefetch so the clipboard write happens synchronously inside the click (required by Safari/iOS).
  var ready = fetch(mdUrl).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
    .then(function (t) { text = t; }).catch(function () { text = null; });

  var toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var timer;
  function show(msg, withDownload) {
    toast.textContent = msg + ' ';
    if (withDownload) {
      var a = document.createElement('a');
      a.textContent = T.dl;
      a.href = mdUrl; a.download = pt ? 'david-smith-portfolio-para-ia.md' : 'david-smith-portfolio-for-ai.md';
      toast.appendChild(a);
    }
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 6000);
  }
  function legacyCopy(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;top:0;opacity:0';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta); return ok;
  }
  buttons.forEach(function (btn) {
    var label = btn.innerHTML;
    btn.addEventListener('click', function () {
      if (text === null) { // fetch failed (e.g. opened via file://): fall back to download
        ready.then(function () { text === null ? show(T.fail, true) : show(T.wait, false); });
        return;
      }
      var done = function () {
        btn.innerHTML = T.done;
        setTimeout(function () { btn.innerHTML = label; }, 2200);
        show(T.copied, true);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text) ? done() : show(T.blocked, true); });
      } else {
        legacyCopy(text) ? done() : show(T.blocked, true);
      }
    });
  });
})();

// Remember the language the visitor picks (read by the redirect script in each page's <head>).
document.querySelectorAll('.lang a[data-lang]').forEach(function (a) {
  a.addEventListener('click', function () {
    try { localStorage.setItem('lang', a.getAttribute('data-lang')); } catch (e) {}
  });
});


// Lightbox for images linked with data-lightbox (falls back to opening the image when JS is off).
(function () {
  var links = document.querySelectorAll('a[data-lightbox]'); if (!links.length) return;
  var box = document.createElement('div'); box.className = 'lbx'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<button type="button" aria-label="Close">×</button><img alt=""><p></p>'; document.body.appendChild(box);
  var img = box.querySelector('img'), cap = box.querySelector('p'), last = null;
  function close() { box.classList.remove('open'); img.removeAttribute('src'); if (last) last.focus(); }
  links.forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); last = a; img.src = a.href; img.alt = cap.textContent = a.getAttribute('data-lightbox') || ''; box.classList.add('open'); box.querySelector('button').focus(); }); });
  box.addEventListener('click', function (e) { if (e.target !== img) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && box.classList.contains('open')) close(); });
})();
