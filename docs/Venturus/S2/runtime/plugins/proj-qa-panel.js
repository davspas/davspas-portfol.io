// Q&A Panel — displays a prototype's `qa.md` (open questions about the design,
// derived from its requirements or from the gaps in them) rendered as HTML in a
// docked, resizable panel beside the page content.
//
// Read-only by design: questions are authored in the markdown file and committed,
// so every reviewer in every browser sees the same list. There is no in-browser
// composer and no local storage.
//
// Mirrors the canvas requirements-system.js pattern, including gating: the ribbon
// button is only injected when `qa.md` actually exists for the current prototype.
(function() {
  'use strict';

  var WIDTH_KEY = 'davinci:qa-width';
  var QA_FILE = './qa.md';
  var MIN_WIDTH = 320;              // px
  var DEFAULT_WIDTH = 480;          // px

  var lastMarkdown = '';            // raw source of the last successful load
  var initialized = false;

  // --- Existence probe (HEAD, fall back to GET if HEAD is unsupported) ---

  function qaFileExists() {
    // The Milan bundle lists the shipped doc files, so a missing one costs no request.
    if (window.ProjMilanBundle) return Promise.resolve(ProjMilanBundle.hasDocFile(QA_FILE));
    return fetch(QA_FILE, { method: 'HEAD', cache: 'no-store' })
      .then(function(res) {
        if (res.ok) return true;
        if (res.status === 405 || res.status === 501) {
          return fetch(QA_FILE, { cache: 'no-store' }).then(function(r) { return r.ok; });
        }
        return false;
      })
      .catch(function(err) {
        console.warn('Q&A: could not probe qa.md', err);
        return false;
      });
  }

  // --- DOM injection ---

  function injectRibbonButton() {
    if (document.getElementById('projQaBtn')) return;
    var cells = document.querySelectorAll('.prototype-ribbon__cell');
    var host = cells.length ? cells[cells.length - 1] : null;
    if (!host) return;

    var btn = document.createElement('button');
    btn.className = 'btn btn--small btn--secondary';
    btn.id = 'projQaBtn';
    btn.title = 'View open questions';
    btn.innerHTML =
      '<sf-symbol name="questionmark.bubble"></sf-symbol>' +
      ' <span class="proj-qa-ribbon__label">Q&amp;A</span>';

    // Sits before Requirements / Change History in the right-hand cell.
    host.insertBefore(btn, host.firstChild);
  }

  function injectPanel() {
    if (document.getElementById('projQaDrawer')) return;

    var panel = document.createElement('aside');
    panel.className = 'proj-qa-drawer';
    panel.id = 'projQaDrawer';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Q&A');
    panel.innerHTML =
      '<div class="proj-qa-drawer__resizer" id="projQaResizer"></div>' +
      '<div class="proj-qa-drawer__header">' +
        '<h3 class="proj-qa-drawer__title">Q&amp;A</h3>' +
        '<div class="proj-qa-drawer__actions">' +
          '<button class="btn btn--small btn--secondary" id="projQaCopyBtn" title="Copy questions as Markdown">' +
            '<sf-symbol name="doc.on.doc"></sf-symbol>' +
            ' Copy' +
          '</button>' +
          '<button class="proj-qa-drawer__close" id="projQaClose" aria-label="Close Q&amp;A">' +
            '<sf-symbol name="xmark"></sf-symbol>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="proj-qa-drawer__body" id="projQaContent"></div>';

    document.body.appendChild(panel);
  }

  // --- Open / close ---

  function toggle() {
    if (document.body.classList.contains('has-proj-qa-open')) close();
    else open();
  }

  function open() {
    var panel = document.getElementById('projQaDrawer');
    if (!panel) return;

    // The Requirements panel docks to the same edge and shifts the body the same
    // way — only one docked panel can be open at a time.
    closeRequirementsPanel();

    document.body.classList.add('has-proj-qa-open');
    panel.setAttribute('aria-hidden', 'false');

    // Refresh on every open so edits to qa.md are reflected.
    loadQuestions();
  }

  function close() {
    var panel = document.getElementById('projQaDrawer');
    if (!panel) return;
    document.body.classList.remove('has-proj-qa-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function closeRequirementsPanel() {
    if (!document.body.classList.contains('has-requirements-open')) return;
    document.body.classList.remove('has-requirements-open');
    var req = document.getElementById('requirementsDrawer');
    if (req) req.setAttribute('aria-hidden', 'true');
  }

  // --- Load + render ---

  function loadQuestions() {
    var contentDiv = document.getElementById('projQaContent');
    if (!contentDiv) return;

    fetch(QA_FILE, { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('Q&A file not found');
        return res.text();
      })
      .then(function(markdown) {
        lastMarkdown = markdown;
        setCopyEnabled(true);
        renderMarkdown(markdown, contentDiv);
      })
      .catch(function(err) {
        console.warn('Q&A: could not load qa.md', err);
        lastMarkdown = '';
        setCopyEnabled(false);
        renderError(contentDiv);
      });
  }

  // Markdown typography is reused from the canvas Requirements panel by also
  // applying `requirements-drawer__markdown` — the two panels are visually
  // identical, so duplicating ~110 lines of heading/table/code rules here would
  // just be drift waiting to happen. `proj-qa-drawer__markdown` stays for any
  // Q&A-specific tweaks.
  function renderMarkdown(markdown, contentDiv) {
    var html;
    if (typeof marked !== 'undefined' && marked.parse) {
      html = marked.parse(markdown, { gfm: true, breaks: false, headerIds: false, mangle: false });
    } else {
      html = '<pre>' + escapeHtml(markdown) + '</pre>';
    }
    contentDiv.innerHTML =
      '<div class="proj-qa-drawer__markdown requirements-drawer__markdown">' + html + '</div>';
  }

  function renderError(contentDiv) {
    contentDiv.innerHTML =
      '<div class="notification notification--info">' +
        '<div class="notification__icon">ℹ️</div>' +
        '<div class="notification__content">' +
          '<div class="notification__message"><strong>Questions Unavailable</strong></div>' +
          '<div class="notification__description">The Q&amp;A document could not be loaded.</div>' +
        '</div>' +
      '</div>' +
      '<div class="proj-qa-drawer__hint">' +
        '<h5 class="proj-qa-drawer__hint-title">Expected File Location</h5>' +
        '<p class="proj-qa-drawer__hint-path">./qa.md</p>' +
      '</div>';
  }

  // --- Copy raw Markdown ---

  function copyQuestions() {
    if (!lastMarkdown) return;
    copyToClipboard(lastMarkdown)
      .then(function() { flashCopied(true); })
      .catch(function(err) {
        console.warn('Q&A: could not copy questions', err);
        flashCopied(false);
      });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // Fallback for non-secure contexts (e.g. file://) where the async API is unavailable
    return new Promise(function(resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      ok ? resolve() : reject(new Error('execCommand copy failed'));
    });
  }

  function flashCopied(success) {
    var btn = document.getElementById('projQaCopyBtn');
    if (!btn) return;
    var original = btn.innerHTML;
    btn.innerHTML = success
      ? '<sf-symbol name="checkmark"></sf-symbol> Copied'
      : '<sf-symbol name="exclamationmark.triangle"></sf-symbol> Failed';
    setTimeout(function() { btn.innerHTML = original; }, 1500);
  }

  function setCopyEnabled(enabled) {
    var btn = document.getElementById('projQaCopyBtn');
    if (btn) btn.disabled = !enabled;
  }

  // --- Events ---

  function wireEvents() {
    var btn = document.getElementById('projQaBtn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        toggle();
      });
    }

    var closeBtn = document.getElementById('projQaClose');
    if (closeBtn) closeBtn.addEventListener('click', close);

    var copyBtn = document.getElementById('projQaCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyQuestions);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.body.classList.contains('has-proj-qa-open')) close();
    });

    // Opening Requirements must close this panel — capture phase runs before the
    // canvas's own toggle handler.
    document.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('#requirementsBtn')) close();
    }, true);
  }

  // --- Resize (drag the panel's left edge) ---

  function setupResizer() {
    var resizer = document.getElementById('projQaResizer');
    if (!resizer) return;
    var dragging = false;

    function onMouseMove(e) {
      if (!dragging) return;
      // Panel is docked to the viewport's right edge; width grows as the pointer
      // moves left.
      var width = window.innerWidth - e.clientX;
      var max = Math.round(window.innerWidth * 0.6);
      width = Math.max(MIN_WIDTH, Math.min(width, max));
      setWidth(width);
    }

    function onMouseUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('is-resizing-proj-qa');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      persistWidth();
    }

    resizer.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      document.body.classList.add('is-resizing-proj-qa');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // The width var lives on <body> so it drives both the panel width and the
  // body's padding-right (which shifts the whole app left).
  function setWidth(px) {
    document.body.style.setProperty('--proj-qa-width', px + 'px');
  }

  function persistWidth() {
    var current = document.body.style.getPropertyValue('--proj-qa-width').trim();
    if (current) {
      try { localStorage.setItem(WIDTH_KEY, current); } catch (err) { /* ignore */ }
    }
  }

  function applyStoredWidth() {
    var stored;
    try { stored = localStorage.getItem(WIDTH_KEY); } catch (err) { stored = null; }
    var px = parseInt(stored, 10);
    setWidth(isFinite(px) && px >= MIN_WIDTH ? px : DEFAULT_WIDTH);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  window.ProjQaPanel = {
    // Idempotent: safe to call again after a canvas re-render. Injects nothing
    // when the prototype has no qa.md.
    init: function() {
      if (initialized) return;
      if (!document.querySelector('.prototype-ribbon')) return; // canvas not rendered yet
      initialized = true;

      qaFileExists().then(function(exists) {
        if (!exists) return; // no button, no panel
        injectRibbonButton();
        injectPanel();
        applyStoredWidth();
        wireEvents();
        setupResizer();
      });
    },
    open: open,
    close: close,
    toggle: toggle
  };
})();
