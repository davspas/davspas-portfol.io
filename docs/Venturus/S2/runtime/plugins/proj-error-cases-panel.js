// Error Cases Panel — displays a prototype's `error-cases.md`: the error, blocked and
// warning states that only appear for a specific seeded record or a non-obvious
// sequence, each with the flow to reach it. Rendered as HTML in a docked, resizable
// panel beside the page content.
//
// Read-only by design: cases are authored in the markdown file and committed, so
// every reviewer sees the same list.
//
// Mirrors proj-qa-panel, including gating: the ribbon button is only injected when
// `error-cases.md` actually exists for the current prototype.
(function() {
  'use strict';

  var WIDTH_KEY = 'davinci:error-cases-width';
  var QA_FILE = './error-cases.md';
  var MIN_WIDTH = 320;              // px
  var DEFAULT_WIDTH = 480;          // px

  var lastMarkdown = '';            // raw source of the last successful load
  var initialized = false;

  // --- Existence probe (HEAD, fall back to GET if HEAD is unsupported) ---

  function errorCasesFileExists() {
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
        console.warn('Error Cases: could not probe error-cases.md', err);
        return false;
      });
  }

  // --- DOM injection ---

  function injectRibbonButton() {
    if (document.getElementById('projErrorCasesBtn')) return;
    var cells = document.querySelectorAll('.prototype-ribbon__cell');
    var host = cells.length ? cells[cells.length - 1] : null;
    if (!host) return;

    var btn = document.createElement('button');
    btn.className = 'btn btn--small btn--secondary';
    btn.id = 'projErrorCasesBtn';
    btn.title = 'View hidden error cases';
    btn.innerHTML =
      '<sf-symbol name="exclamationmark.triangle"></sf-symbol>' +
      ' <span class="proj-error-cases-ribbon__label">Error Cases</span>';

    // Sits before Requirements / Change History in the right-hand cell.
    host.insertBefore(btn, host.firstChild);
  }

  function injectPanel() {
    if (document.getElementById('projErrorCasesDrawer')) return;

    var panel = document.createElement('aside');
    panel.className = 'proj-error-cases-drawer';
    panel.id = 'projErrorCasesDrawer';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Error Cases');
    panel.innerHTML =
      '<div class="proj-error-cases-drawer__resizer" id="projErrorCasesResizer"></div>' +
      '<div class="proj-error-cases-drawer__header">' +
        '<h3 class="proj-error-cases-drawer__title">Error Cases</h3>' +
        '<div class="proj-error-cases-drawer__actions">' +
          '<button class="btn btn--small btn--secondary" id="projErrorCasesCopyBtn" title="Copy error cases as Markdown">' +
            '<sf-symbol name="doc.on.doc"></sf-symbol>' +
            ' Copy' +
          '</button>' +
          '<button class="proj-error-cases-drawer__close" id="projErrorCasesClose" aria-label="Close Error Cases">' +
            '<sf-symbol name="xmark"></sf-symbol>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="proj-error-cases-drawer__body" id="projErrorCasesContent"></div>';

    document.body.appendChild(panel);
  }

  // --- Open / close ---

  function toggle() {
    if (document.body.classList.contains('has-proj-error-cases-open')) close();
    else open();
  }

  function open() {
    var panel = document.getElementById('projErrorCasesDrawer');
    if (!panel) return;

    // The Requirements and Q&A panels dock to the same edge and shift the body the
    // same way — only one docked panel can be open at a time.
    closeRequirementsPanel();
    closeQaPanel();

    document.body.classList.add('has-proj-error-cases-open');
    panel.setAttribute('aria-hidden', 'false');

    // Refresh on every open so edits to error-cases.md are reflected.
    loadCases();
  }

  function close() {
    var panel = document.getElementById('projErrorCasesDrawer');
    if (!panel) return;
    document.body.classList.remove('has-proj-error-cases-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  function closeRequirementsPanel() {
    if (!document.body.classList.contains('has-requirements-open')) return;
    document.body.classList.remove('has-requirements-open');
    var req = document.getElementById('requirementsDrawer');
    if (req) req.setAttribute('aria-hidden', 'true');
  }

  function closeQaPanel() {
    if (!document.body.classList.contains('has-proj-qa-open')) return;
    document.body.classList.remove('has-proj-qa-open');
    var qa = document.getElementById('projQaDrawer');
    if (qa) qa.setAttribute('aria-hidden', 'true');
  }

  // --- Load + render ---

  function loadCases() {
    var contentDiv = document.getElementById('projErrorCasesContent');
    if (!contentDiv) return;

    fetch(QA_FILE, { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('Error Cases file not found');
        return res.text();
      })
      .then(function(markdown) {
        lastMarkdown = markdown;
        setCopyEnabled(true);
        renderMarkdown(markdown, contentDiv);
      })
      .catch(function(err) {
        console.warn('Error Cases: could not load error-cases.md', err);
        lastMarkdown = '';
        setCopyEnabled(false);
        renderError(contentDiv);
      });
  }

  // Markdown typography is reused from the canvas Requirements panel by also
  // applying `requirements-drawer__markdown` — the two panels are visually
  // identical, so duplicating ~110 lines of heading/table/code rules here would
  // just be drift waiting to happen. `proj-error-cases-drawer__markdown` stays for any
  // Error Cases-specific tweaks.
  function renderMarkdown(markdown, contentDiv) {
    var html;
    if (typeof marked !== 'undefined' && marked.parse) {
      html = marked.parse(markdown, { gfm: true, breaks: false, headerIds: false, mangle: false });
    } else {
      html = '<pre>' + escapeHtml(markdown) + '</pre>';
    }
    contentDiv.innerHTML =
      '<div class="proj-error-cases-drawer__markdown requirements-drawer__markdown">' + html + '</div>';
  }

  function renderError(contentDiv) {
    contentDiv.innerHTML =
      '<div class="notification notification--info">' +
        '<div class="notification__icon">ℹ️</div>' +
        '<div class="notification__content">' +
          '<div class="notification__message"><strong>Error Cases Unavailable</strong></div>' +
          '<div class="notification__description">The error cases document could not be loaded.</div>' +
        '</div>' +
      '</div>' +
      '<div class="proj-error-cases-drawer__hint">' +
        '<h5 class="proj-error-cases-drawer__hint-title">Expected File Location</h5>' +
        '<p class="proj-error-cases-drawer__hint-path">./error-cases.md</p>' +
      '</div>';
  }

  // --- Copy raw Markdown ---

  function copyCases() {
    if (!lastMarkdown) return;
    copyToClipboard(lastMarkdown)
      .then(function() { flashCopied(true); })
      .catch(function(err) {
        console.warn('Error Cases: could not copy error cases', err);
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
    var btn = document.getElementById('projErrorCasesCopyBtn');
    if (!btn) return;
    var original = btn.innerHTML;
    btn.innerHTML = success
      ? '<sf-symbol name="checkmark"></sf-symbol> Copied'
      : '<sf-symbol name="exclamationmark.triangle"></sf-symbol> Failed';
    setTimeout(function() { btn.innerHTML = original; }, 1500);
  }

  function setCopyEnabled(enabled) {
    var btn = document.getElementById('projErrorCasesCopyBtn');
    if (btn) btn.disabled = !enabled;
  }

  // --- Events ---

  function wireEvents() {
    var btn = document.getElementById('projErrorCasesBtn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        toggle();
      });
    }

    var closeBtn = document.getElementById('projErrorCasesClose');
    if (closeBtn) closeBtn.addEventListener('click', close);

    var copyBtn = document.getElementById('projErrorCasesCopyBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyCases);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.body.classList.contains('has-proj-error-cases-open')) close();
    });

    // Opening Requirements or Q&A must close this panel — capture phase runs before
    // their own toggle handlers.
    document.addEventListener('click', function(e) {
      if (e.target.closest && e.target.closest('#requirementsBtn, #projQaBtn')) close();
    }, true);
  }

  // --- Resize (drag the panel's left edge) ---

  function setupResizer() {
    var resizer = document.getElementById('projErrorCasesResizer');
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
      document.body.classList.remove('is-resizing-proj-error-cases');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      persistWidth();
    }

    resizer.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      document.body.classList.add('is-resizing-proj-error-cases');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // The width var lives on <body> so it drives both the panel width and the
  // body's padding-right (which shifts the whole app left).
  function setWidth(px) {
    document.body.style.setProperty('--proj-error-cases-width', px + 'px');
  }

  function persistWidth() {
    var current = document.body.style.getPropertyValue('--proj-error-cases-width').trim();
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

  window.ProjErrorCasesPanel = {
    // Idempotent: safe to call again after a canvas re-render. Injects nothing
    // when the prototype has no error-cases.md.
    init: function() {
      if (initialized) return;
      if (!document.querySelector('.prototype-ribbon')) return; // canvas not rendered yet
      initialized = true;

      errorCasesFileExists().then(function(exists) {
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
