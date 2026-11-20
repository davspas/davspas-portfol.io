// Requirements Panel — displays a prototype's `requirements.md` (the formal
// requirements document) rendered as HTML in a docked, resizable panel beside the
// page content.
//
// Read-only by design: requirements are authored in the markdown file and committed,
// so every reviewer in every browser sees the same document.
//
// Originally `assets/canvas/requirements-system.js` (DaVinciRequirements). It lived
// in the canvas asset tree, which is replaced on every plugin top-up, so it was lost
// in the migration to the .davinci/ layout. Rebuilt here as a workspace plugin using
// the self-injecting proj-qa-panel pattern: no canvas part templates are touched, and
// the ribbon button is only injected when `requirements.md` actually exists.
//
// This plugin also owns two things `proj-qa-panel` borrows: the vendored `marked`
// parser (loaded ahead of both panels by plugins.js) and the
// `requirements-drawer__markdown` typography in the accompanying CSS. Renaming either
// breaks the Q&A panel.
(function() {
  'use strict';

  var WIDTH_KEY = 'davinci:requirements-width';
  var REQUIREMENTS_FILE = './requirements.md';
  var MIN_WIDTH = 320;              // px
  var DEFAULT_WIDTH = 480;          // px

  var lastMarkdown = '';            // raw source of the last successful load
  var initialized = false;

  // --- Existence probe (HEAD, fall back to GET if HEAD is unsupported) ---

  function requirementsFileExists() {
    // The Milan bundle lists the shipped doc files, so a missing one costs no request.
    if (window.ProjMilanBundle) return Promise.resolve(ProjMilanBundle.hasDocFile(REQUIREMENTS_FILE));
    return fetch(REQUIREMENTS_FILE, { method: 'HEAD', cache: 'no-store' })
      .then(function(res) {
        if (res.ok) return true;
        if (res.status === 405 || res.status === 501) {
          return fetch(REQUIREMENTS_FILE, { cache: 'no-store' }).then(function(r) { return r.ok; });
        }
        return false;
      })
      .catch(function(err) {
        console.warn('Requirements: could not probe requirements.md', err);
        return false;
      });
  }

  // --- DOM injection ---

  function injectRibbonButton() {
    if (document.getElementById('requirementsBtn')) return;
    var cells = document.querySelectorAll('.prototype-ribbon__cell');
    var host = cells.length ? cells[cells.length - 1] : null;
    if (!host) return;

    var btn = document.createElement('button');
    btn.className = 'btn btn--small btn--secondary';
    btn.id = 'requirementsBtn';
    btn.title = 'View requirements';
    btn.innerHTML =
      '<sf-symbol name="doc.text"></sf-symbol>' +
      ' <span class="proj-requirements-ribbon__label">Requirements</span>';

    // Both panels inject after an async file probe, so insertion order is racy —
    // the CSS pins the visual order with flexbox `order` instead.
    host.appendChild(btn);
  }

  function injectPanel() {
    if (document.getElementById('requirementsDrawer')) return;

    var panel = document.createElement('aside');
    panel.className = 'requirements-drawer';
    panel.id = 'requirementsDrawer';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Requirements');
    panel.innerHTML =
      '<div class="requirements-drawer__resizer" id="requirementsResizer"></div>' +
      '<div class="requirements-drawer__header">' +
        '<h3 class="requirements-drawer__title">Requirements</h3>' +
        '<div class="requirements-drawer__actions">' +
          '<button class="btn btn--small btn--secondary" id="copyRequirementsBtn" title="Copy requirements as Markdown">' +
            '<sf-symbol name="doc.on.doc"></sf-symbol>' +
            ' Copy' +
          '</button>' +
          '<button class="requirements-drawer__close" id="closeRequirementsDrawer" aria-label="Close requirements">' +
            '<sf-symbol name="xmark"></sf-symbol>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="requirements-drawer__body" id="requirementsContent"></div>';

    document.body.appendChild(panel);
  }

  // --- Open / close ---

  function toggle() {
    if (document.body.classList.contains('has-requirements-open')) close();
    else open();
  }

  function open() {
    var panel = document.getElementById('requirementsDrawer');
    if (!panel) return;

    // The Q&A panel docks to the same edge and shifts the body the same way —
    // only one docked panel can be open at a time.
    if (window.ProjQaPanel) ProjQaPanel.close();

    document.body.classList.add('has-requirements-open');
    panel.setAttribute('aria-hidden', 'false');

    // Refresh on every open so edits to requirements.md are reflected.
    loadRequirements();
  }

  function close() {
    var panel = document.getElementById('requirementsDrawer');
    if (!panel) return;
    document.body.classList.remove('has-requirements-open');
    panel.setAttribute('aria-hidden', 'true');
  }

  // --- Load + render ---

  function loadRequirements() {
    var contentDiv = document.getElementById('requirementsContent');
    if (!contentDiv) return;

    fetch(REQUIREMENTS_FILE, { cache: 'no-store' })
      .then(function(res) {
        if (!res.ok) throw new Error('Requirements file not found');
        return res.text();
      })
      .then(function(markdown) {
        lastMarkdown = markdown;
        setCopyEnabled(true);
        renderMarkdown(markdown, contentDiv);
      })
      .catch(function(err) {
        console.warn('Requirements: could not load requirements.md', err);
        lastMarkdown = '';
        setCopyEnabled(false);
        renderError(contentDiv);
      });
  }

  function renderMarkdown(markdown, contentDiv) {
    var html;
    if (typeof marked !== 'undefined' && marked.parse) {
      html = marked.parse(markdown, { gfm: true, breaks: false, headerIds: false, mangle: false });
    } else {
      // Fallback: show as preformatted text if the parser failed to load.
      html = '<pre>' + escapeHtml(markdown) + '</pre>';
    }
    contentDiv.innerHTML = '<div class="requirements-drawer__markdown">' + html + '</div>';
  }

  function renderError(contentDiv) {
    contentDiv.innerHTML =
      '<div class="notification notification--info">' +
        '<div class="notification__icon">ℹ️</div>' +
        '<div class="notification__content">' +
          '<div class="notification__message"><strong>Requirements Unavailable</strong></div>' +
          '<div class="notification__description">The requirements document could not be loaded.</div>' +
        '</div>' +
      '</div>' +
      '<div class="requirements-drawer__hint">' +
        '<h5 class="requirements-drawer__hint-title">Expected File Location</h5>' +
        '<p class="requirements-drawer__hint-path">./requirements.md</p>' +
      '</div>';
  }

  // --- Copy raw Markdown ---

  function copyRequirements() {
    if (!lastMarkdown) return;
    copyToClipboard(lastMarkdown)
      .then(function() { flashCopied(true); })
      .catch(function(err) {
        console.warn('Requirements: could not copy requirements', err);
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
    var btn = document.getElementById('copyRequirementsBtn');
    if (!btn) return;
    var original = btn.innerHTML;
    btn.innerHTML = success
      ? '<sf-symbol name="checkmark"></sf-symbol> Copied'
      : '<sf-symbol name="exclamationmark.triangle"></sf-symbol> Failed';
    setTimeout(function() { btn.innerHTML = original; }, 1500);
  }

  function setCopyEnabled(enabled) {
    var btn = document.getElementById('copyRequirementsBtn');
    if (btn) btn.disabled = !enabled;
  }

  // --- Events ---

  function wireEvents() {
    var btn = document.getElementById('requirementsBtn');
    if (btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        toggle();
      });
    }

    var closeBtn = document.getElementById('closeRequirementsDrawer');
    if (closeBtn) closeBtn.addEventListener('click', close);

    var copyBtn = document.getElementById('copyRequirementsBtn');
    if (copyBtn) copyBtn.addEventListener('click', copyRequirements);

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.body.classList.contains('has-requirements-open')) close();
    });
  }

  // --- Resize (drag the panel's left edge) ---

  function setupResizer() {
    var resizer = document.getElementById('requirementsResizer');
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
      document.body.classList.remove('is-resizing-requirements');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      persistWidth();
    }

    resizer.addEventListener('mousedown', function(e) {
      e.preventDefault();
      dragging = true;
      document.body.classList.add('is-resizing-requirements');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // The width var lives on <body> so it drives both the panel width and the
  // body's padding-right (which shifts the whole app left).
  function setWidth(px) {
    document.body.style.setProperty('--requirements-width', px + 'px');
  }

  function persistWidth() {
    var current = document.body.style.getPropertyValue('--requirements-width').trim();
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

  window.ProjRequirementsPanel = {
    // Idempotent: safe to call again after a canvas re-render. Injects nothing
    // when the prototype has no requirements.md.
    init: function() {
      if (initialized) return;
      if (!document.querySelector('.prototype-ribbon')) return; // canvas not rendered yet
      initialized = true;

      requirementsFileExists().then(function(exists) {
        if (!exists) return; // no button, no panel
        injectRibbonButton();
        injectPanel();
        applyStoredWidth();
        wireEvents();
        setupResizer();
        console.log('✓ Requirements panel initialized');
      });
    },
    open: open,
    close: close,
    toggle: toggle
  };
})();
