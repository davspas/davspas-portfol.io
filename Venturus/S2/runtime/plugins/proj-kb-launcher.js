// Knowledge Base Launcher — owns the Knowledge Base slot in the prototype ribbon.
//
// Two shapes, depending on where it is:
//   · on any prototype   → a "Knowledge Base" link into the graph page
//   · on the KB page     → a "Back to prototypes" return button in the same slot
//
// Unlike proj-requirements-panel / proj-qa-panel this plugin owns no panel: the KB is a
// full page, not a drawer, so both shapes are links. It follows the same self-injecting
// pattern as those two — no canvas part template is touched, and the button is appended
// to the last `.prototype-ribbon__cell` on `davinci:canvas:ready`.
//
// Visual order inside that cell is pinned by CSS `order` (see proj-kb-launcher.css),
// because all three doc buttons inject asynchronously and DOM order is racy.
(function() {
  'use strict';

  // Relative to any `prototypes/<name>/index.html`. Resolves identically in the
  // workspace, in a Milan zip and on GitHub Pages, since all three keep the
  // `prototypes/<name>/` layout.
  var KB_URL = '../context/index.html';

  // Where the return button goes when there is no history to go back to — the workspace
  // entry point (`homeUrl` in canvas-navigation-data.json), reached from the KB page.
  var HOME_URL = '../manage-infrastructure/';

  var initialized = false;

  function isKnowledgeBasePage() {
    return document.body.classList.contains('kb-page');
  }

  function ribbonCell() {
    var cells = document.querySelectorAll('.prototype-ribbon__cell');
    return cells.length ? cells[cells.length - 1] : null;
  }

  function injectLaunchButton() {
    if (document.getElementById('kbBtn')) return;
    var host = ribbonCell();
    if (!host) return;

    var link = document.createElement('a');
    link.className = 'btn btn--small btn--secondary';
    link.id = 'kbBtn';
    link.href = KB_URL;
    link.title = 'Browse the Atrium knowledge base';
    link.innerHTML =
      '<sf-symbol name="point.3.connected.trianglepath.dotted"></sf-symbol>' +
      ' <span class="proj-kb-ribbon__label">Knowledge Base</span>';

    host.appendChild(link);
  }

  // Returns to whichever prototype the reader came from. The href is the workspace home
  // so the control still works with a middle-click, an empty history, or a direct link
  // into the KB — the click handler just prefers going back where that is meaningful.
  function injectBackButton() {
    if (document.getElementById('kbBackBtn')) return;
    var host = ribbonCell();
    if (!host) return;

    var link = document.createElement('a');
    link.className = 'btn btn--small btn--secondary';
    link.id = 'kbBackBtn';
    link.href = HOME_URL;
    link.title = 'Return to the prototype you came from';
    link.innerHTML =
      '<sf-symbol name="chevron.left"></sf-symbol>' +
      ' <span class="proj-kb-ribbon__label">Back to prototypes</span>';

    link.addEventListener('click', function(ev) {
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;  // let the browser open it
      if (!cameFromAnotherPrototype()) return;                                  // fall through to href
      ev.preventDefault();
      history.back();
    });

    host.appendChild(link);
  }

  function cameFromAnotherPrototype() {
    var ref = document.referrer;
    if (!ref) return false;
    try {
      var from = new URL(ref);
      if (from.origin !== window.location.origin) return false;
      // Coming from the KB page itself (a reload, or an in-page link) is not a "back".
      return from.pathname !== window.location.pathname;
    } catch (err) {
      return false;
    }
  }

  window.ProjKbLauncher = {
    // Idempotent: safe to call again after a canvas re-render.
    init: function() {
      if (initialized) return;
      if (!document.querySelector('.prototype-ribbon')) return; // canvas not rendered yet
      initialized = true;

      if (isKnowledgeBasePage()) {
        injectBackButton();
        console.log('✓ Knowledge Base: return button initialized');
      } else {
        injectLaunchButton();
        console.log('✓ Knowledge Base launcher initialized');
      }
    }
  };
})();
