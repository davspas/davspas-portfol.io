/* DaVinci Plugins — Project-level custom component behaviors */
/* Auto-loaded by canvas framework alongside MDS */
/* Each plugin component is registered below; this file loads them synchronously */
/* so they are available before `davinci:canvas:ready` fires. */

(function() {
  'use strict';

  // List of plugin JS files to load (relative to plugins/)
  var PLUGIN_SCRIPTS = [
    // Vendored markdown parser (marked v12.0.2). Both doc panels render through it,
    // so it must be global before either of them loads. Its UMD wrapper assigns to
    // `globalThis.marked`, which is what makes it survive the `new Function()`
    // evaluation below — a `var marked = …` bundle would stay function-scoped.
    'marked.min.js',
    'proj-multi-select.js',
    'proj-popover-editor.js',
    // proj-combobox builds on proj-popover-editor — keep it after.
    'proj-combobox.js',
    'proj-source-toggle.js',
    'proj-cascader.js',
    // Pure utility (window.ProjFieldError) — no DOM injection, so no init() call below.
    // Every prototype's validation code calls into it, so it loads early.
    'proj-field-error.js',
    // proj-qa-panel borrows this plugin's markdown typography and `marked` — keep it after.
    'proj-requirements-panel.js',
    'proj-qa-panel.js',
    // Same shape as proj-qa-panel (gated on error-cases.md); borrows the same typography.
    'proj-error-cases-panel.js',
    // Factory-only (ProjJsonDiff.create), so there is no init() call below. Loaded
    // here rather than per-prototype because any dialog
    // may use it from either prototype — auto-loading is what keeps that host-agnostic.
    'proj-json-diff.js',
    // Ribbon link to the Knowledge Base page. No panel, no file probe — but it still
    // injects into the ribbon, so it initializes on canvas:ready like the doc panels.
    'proj-kb-launcher.js',
    // Persona landing-page redirect; applied on canvas:ready below.
    'proj-access-gate.js',
    // Backdrop clicks never close a drawer. Registers its own listener on load, no init() call.
    'proj-drawer-lock.js'
  ];

  // Derive base path from this script's URL
  var basePath = '';
  if (document.currentScript && document.currentScript.src) {
    var src = document.currentScript.src;
    basePath = src.substring(0, src.lastIndexOf('/') + 1);
  }

  // Load each plugin synchronously so they're registered on `window` before
  // canvas:ready fires (canvas awaits this script's onload, which only resolves
  // after the IIFE completes — including the sync XHR loads below).
  // The Milan bundle (scripts/milan-optimize.py) inlines them ahead of this file instead.
  if (!window.ProjMilanBundle) PLUGIN_SCRIPTS.forEach(function(filename) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', basePath + filename, false); // sync
      xhr.send();
      if (xhr.status === 200 || xhr.status === 0) {
        // Use Function constructor to evaluate in global scope
        (new Function(xhr.responseText))();
      }
    } catch (err) {
      console.warn('Failed to load plugin: ' + filename, err);
    }
  });

  window.DaVinciPlugins = {
    init: function() {
      if (window.ProjMultiSelect) ProjMultiSelect.init();
      if (window.ProjSourceToggle) ProjSourceToggle.init();
      if (window.ProjCascader) ProjCascader.init();
      // Binds delegated document-level listeners only — no per-instance setup,
      // so selects rendered later (table rows, modals) work with no re-init.
      if (window.ProjCombobox) ProjCombobox.init();
      // The doc panels inject themselves into the prototype ribbon, which the canvas
      // renders asynchronously — so they initialize on canvas:ready instead. Both
      // init()s are idempotent and no-op until the ribbon exists; each injects
      // nothing when its markdown file (requirements.md / qa.md) is absent.
      if (window.ProjRequirementsPanel) {
        ProjRequirementsPanel.init();
        document.addEventListener('davinci:canvas:ready', function() {
          ProjRequirementsPanel.init();
        });
      }
      if (window.ProjQaPanel) {
        ProjQaPanel.init();
        document.addEventListener('davinci:canvas:ready', function() {
          ProjQaPanel.init();
        });
      }
      if (window.ProjErrorCasesPanel) {
        ProjErrorCasesPanel.init();
        document.addEventListener('davinci:canvas:ready', function() {
          ProjErrorCasesPanel.init();
        });
      }
      if (window.ProjAccessGate) {
        document.addEventListener('davinci:canvas:ready', function(e) {
          ProjAccessGate.apply(e.detail && e.detail.impersonatedUser);
        });
      }
      if (window.ProjKbLauncher) {
        ProjKbLauncher.init();
        document.addEventListener('davinci:canvas:ready', function() {
          ProjKbLauncher.init();
        });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      DaVinciPlugins.init();
    });
  } else {
    DaVinciPlugins.init();
  }
})();
