// kb-main.js — page entry point. Loads the knowledge base, builds the graph, and wires
// the toolbar, search, floating shared-document buttons, tooltip and drawer together.
//
// DaVinci canvas-ready init pattern: the page content is a template the canvas injects,
// so nothing here can run until `davinci:canvas:ready` fires.
(function() {
  'use strict';

  var model = null;
  var els = {};
  var searchDebounce = null;
  var lastResult = null;

  var LEGEND_KEY = 'davinci:kb-legend';

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  // --- Toolbar ----------------------------------------------------------------

  function renderLayoutButtons() {
    els.layouts.innerHTML = KbGraph.LAYOUTS.map(function(mode, i) {
      return '<button class="kb-layout-btn' + (i === 0 ? ' kb-layout-btn--active' : '') + '" ' +
             'type="button" data-layout="' + mode.id + '" title="' + escapeHtml(mode.hint) + '">' +
             '<sf-symbol name="' + mode.icon + '"></sf-symbol> ' + escapeHtml(mode.label) +
             '</button>';
    }).join('');

    els.layouts.addEventListener('click', function(ev) {
      var btn = ev.target.closest('.kb-layout-btn');
      if (!btn) return;
      var id = btn.getAttribute('data-layout');
      Array.prototype.forEach.call(els.layouts.children, function(child) {
        child.classList.toggle('kb-layout-btn--active', child === btn);
      });
      var mode = KbGraph.setLayout(id, true);
      renderLegend(mode);
    });
  }

  // The legend explains the ACTIVE layout: colours always mean category, but the lanes
  // mean something different in each mode, so both are spelled out. It is dismissable —
  // it sits over the bottom-right of the canvas, which is exactly where a large graph
  // needs room — and the choice is remembered.
  function renderLegend(mode) {
    var swatches = model.categories.map(function(cat) {
      return '<span class="kb-legend__item">' +
               '<span class="kb-legend__dot" style="background:' + KbGraph.categoryColor(cat) + '"></span>' +
               escapeHtml(cat) +
             '</span>';
    }).join('');

    els.legend.innerHTML =
      '<button class="kb-legend__close" id="kbLegendClose" type="button" aria-label="Hide legend">' +
        '<sf-symbol name="xmark"></sf-symbol>' +
      '</button>' +
      '<div class="kb-legend__row kb-legend__row--hint">' +
        '<sf-symbol name="info.circle"></sf-symbol> ' + escapeHtml(mode.hint) +
      '</div>' +
      '<div class="kb-legend__row">' + swatches + '</div>' +
      '<div class="kb-legend__row kb-legend__row--meta">' +
        '<span class="kb-legend__item">Node size = number of connections</span>' +
        '<span class="kb-legend__item"><span class="kb-legend__flag">!</span> Flagged in Staleness &amp; gaps</span>' +
        '<span class="kb-legend__item">Double-click a node to isolate it</span>' +
      '</div>';

    // Rebuilt on every layout change, so the handler is re-attached here rather than
    // delegated — there is exactly one button and it lives for one render.
    document.getElementById('kbLegendClose').addEventListener('click', function() {
      setLegendVisible(false);
    });
  }

  function setLegendVisible(visible) {
    els.legend.hidden = !visible;
    els.legendToggle.setAttribute('aria-pressed', visible ? 'true' : 'false');
    try { localStorage.setItem(LEGEND_KEY, visible ? 'show' : 'hide'); } catch (err) { /* ignore */ }
  }

  function applyStoredLegendVisibility() {
    var stored;
    try { stored = localStorage.getItem(LEGEND_KEY); } catch (err) { stored = null; }
    setLegendVisible(stored !== 'hide');
  }

  // --- Tooltip ----------------------------------------------------------------

  var STATUS_LABEL = { shipped: 'Shipped', partial: 'Partially shipped', 'design-only': 'Design-only' };

  function showTooltip(topic, node) {
    if (!topic) { els.tooltip.hidden = true; return; }

    var count = lastResult ? lastResult.counts[topic.id] : 0;
    els.tooltip.innerHTML =
      '<div class="kb-tooltip__title">' + escapeHtml(topic.title) + '</div>' +
      '<div class="kb-tooltip__meta">' + escapeHtml(topic.category) + ' · ' +
        escapeHtml(STATUS_LABEL[topic.status] || topic.status) + ' · ' +
        topic.degree + (topic.degree === 1 ? ' link' : ' links') +
        (count ? ' · ' + count + ' match' + (count === 1 ? '' : 'es') : '') +
      '</div>' +
      '<div class="kb-tooltip__summary">' + escapeHtml(topic.summary || topic.description) + '</div>' +
      (topic.flagged
        ? '<div class="kb-tooltip__flag">⚠ ' + escapeHtml(topic.flagReason) + '</div>'
        : '');

    els.tooltip.hidden = false;

    // Position beside the node, kept inside the stage.
    var stageRect = els.stage.getBoundingClientRect();
    var nodeRect = node.g.getBoundingClientRect();
    var tipRect = els.tooltip.getBoundingClientRect();
    var left = nodeRect.right - stageRect.left + 14;
    var top = nodeRect.top - stageRect.top;
    if (left + tipRect.width > stageRect.width - 12) {
      left = nodeRect.left - stageRect.left - tipRect.width - 14;
    }
    top = Math.max(8, Math.min(top, stageRect.height - tipRect.height - 8));
    els.tooltip.style.left = Math.max(8, left) + 'px';
    els.tooltip.style.top = top + 'px';
  }

  // --- Search -----------------------------------------------------------------

  function renderResults(result) {
    if (!result) { els.results.hidden = true; els.results.innerHTML = ''; return; }

    if (!result.totalDocs) {
      els.results.innerHTML =
        '<div class="kb-results__empty">No document contains “' + escapeHtml(result.term) + '”.</div>';
      els.results.hidden = false;
      return;
    }

    function groupHtml(title, entries, kind) {
      if (!entries.length) return '';
      var shown = entries.slice(0, KbSearch.MAX_RESULTS_PER_GROUP);
      var rows = shown.map(function(entry) {
        return '<button class="kb-result" type="button" data-kind="' + kind + '" data-id="' + escapeHtml(entry.id) + '">' +
                 '<span class="kb-result__head">' +
                   '<span class="kb-result__title">' + escapeHtml(entry.title) + '</span>' +
                   '<span class="kb-result__count">' + entry.count + '</span>' +
                 '</span>' +
                 '<span class="kb-result__meta">' + escapeHtml(entry.subtitle) + '</span>' +
                 '<span class="kb-result__snippet">' + entry.snippet + '</span>' +
               '</button>';
      }).join('');
      var more = entries.length > shown.length
        ? '<div class="kb-results__more">+ ' + (entries.length - shown.length) + ' more</div>'
        : '';
      return '<div class="kb-results__group"><div class="kb-results__group-title">' +
             escapeHtml(title) + '</div>' + rows + more + '</div>';
    }

    els.results.innerHTML =
      groupHtml('Topics', result.topics, 'topic') +
      // Shared documents are not nodes, so filtering the graph can never surface them.
      // Without this group a glossary-only term reads as "nothing found".
      groupHtml('Shared documents', result.shared, 'shared');
    els.results.hidden = false;
  }

  function runSearch(term) {
    lastResult = KbSearch.run(term);
    KbDrawer.setSearchTerm(term);

    if (!lastResult) {
      KbGraph.setFilter(null, {});
      els.status.textContent = '';
      els.clear.hidden = true;
      renderResults(null);
      return;
    }

    els.clear.hidden = false;
    KbGraph.setFilter(lastResult.matchingIds, lastResult.counts);
    els.status.textContent = lastResult.totalDocs
      ? lastResult.totalMatches + ' match' + (lastResult.totalMatches === 1 ? '' : 'es') +
        ' in ' + lastResult.totalDocs + ' document' + (lastResult.totalDocs === 1 ? '' : 's')
      : 'No matches';
    renderResults(lastResult);
  }

  function clearSearch() {
    els.input.value = '';
    runSearch('');
    els.input.focus();
  }

  // --- Wiring -----------------------------------------------------------------

  function wire() {
    els.input.addEventListener('input', function() {
      clearTimeout(searchDebounce);
      var value = els.input.value;
      searchDebounce = setTimeout(function() { runSearch(value); }, 160);
    });

    els.input.addEventListener('focus', function() {
      if (lastResult) els.results.hidden = false;
    });

    els.clear.addEventListener('click', clearSearch);

    els.results.addEventListener('click', function(ev) {
      var row = ev.target.closest('.kb-result');
      if (!row) return;
      var id = row.getAttribute('data-id');
      if (row.getAttribute('data-kind') === 'topic') {
        KbGraph.select(id);
        KbGraph.focus(id);
        KbDrawer.openTopic(id);
      } else {
        KbDrawer.openShared(id);
      }
      els.results.hidden = true;
    });

    // Clicking anywhere outside the search cluster dismisses the results list.
    document.addEventListener('click', function(ev) {
      if (els.results.hidden) return;
      if (ev.target.closest('.kb-toolbar__search') || ev.target.closest('.kb-results')) return;
      els.results.hidden = true;
    });

    els.hideToggle.addEventListener('change', function() {
      KbGraph.setHideNonMatching(els.hideToggle.checked);
    });

    els.legendToggle.addEventListener('click', function() {
      setLegendVisible(els.legend.hidden);
    });

    document.getElementById('kbZoomIn').addEventListener('click', KbGraph.zoomIn);
    document.getElementById('kbZoomOut').addEventListener('click', KbGraph.zoomOut);
    document.getElementById('kbZoomFit').addEventListener('click', KbGraph.fit);

    els.floating.addEventListener('click', function(ev) {
      var btn = ev.target.closest('.kb-floating__btn');
      if (!btn) return;
      var id = btn.getAttribute('data-shared');
      Array.prototype.forEach.call(els.floating.children, function(child) {
        child.classList.toggle('kb-floating__btn--active', child === btn);
      });
      KbGraph.select(null);
      KbDrawer.openShared(id);
    });

    // Escape unwinds one layer at a time: results list → isolate → drawer.
    document.addEventListener('keydown', function(ev) {
      if (ev.key !== 'Escape') return;
      if (!els.results.hidden) { els.results.hidden = true; return; }
      if (KbGraph.clearIsolate()) return;
      if (KbDrawer.isOpen()) KbDrawer.close();
    });
  }

  function markActiveFloating(id) {
    Array.prototype.forEach.call(els.floating.children, function(child) {
      child.classList.toggle('kb-floating__btn--active', child.getAttribute('data-shared') === id);
    });
  }

  // --- Boot -------------------------------------------------------------------

  function showError(err) {
    document.getElementById('kbLoading').hidden = true;
    document.getElementById('kbError').hidden = false;
    document.getElementById('kbErrorText').textContent =
      'The knowledge base could not be read. ' + (err && err.message ? err.message : '');
    console.error('KB:', err);
  }

  function init() {
    els.stage = document.getElementById('kbStage');
    els.layouts = document.getElementById('kbLayouts');
    els.legend = document.getElementById('kbLegend');
    els.tooltip = document.getElementById('kbTooltip');
    els.results = document.getElementById('kbResults');
    els.input = document.getElementById('kbSearchInput');
    els.clear = document.getElementById('kbSearchClear');
    els.status = document.getElementById('kbSearchStatus');
    els.floating = document.getElementById('kbFloating');
    els.hideToggle = document.getElementById('kbHideNonMatching');
    els.legendToggle = document.getElementById('kbLegendToggle');
    if (!els.stage) return;   // canvas hasn't injected the page content yet

    KbData.load().then(function(data) {
      model = data;

      KbGraph.init({
        onSelect: function(id) {
          markActiveFloating(null);
          KbDrawer.openTopic(id);
        },
        onHover: showTooltip,
        onIsolate: function() { /* classes handled inside the graph */ }
      });

      KbSearch.build(model);
      KbDrawer.init(model, {
        onClose: function() {
          KbGraph.select(null);
          markActiveFloating(null);
          KbGraph.fit();
        },
        onOpenTopic: function(id) { KbGraph.select(id); },
        onOpenShared: function(id) { markActiveFloating(id); },
        onResize: function() { KbGraph.fit(); }
      });

      renderLayoutButtons();
      KbGraph.setData(model);
      renderLegend(KbGraph.LAYOUTS[0]);
      applyStoredLegendVisibility();
      wire();

      document.getElementById('kbLoading').hidden = true;
      console.log('✓ Knowledge Base: ' + model.topics.length + ' topics, ' +
                  model.edges.length + ' relationships, ' + model.shared.length + ' shared documents');
    }).catch(showError);
  }

  /* DaVinci canvas-ready init pattern (with fallback), as used by the other prototypes.
     The listener is registered immediately rather than from inside a DOMContentLoaded
     handler: `davinci:canvas:ready` can fire at any point after the canvas finishes its
     async render, and nesting the registration means missing it whenever the canvas wins
     that race. The timer is the fallback for a page where the event never arrives. */
  (function() {
    var initialized = false;
    function safeInit() {
      if (initialized) return;
      if (!document.getElementById('kbStage')) return;   // page content not injected yet
      initialized = true;
      try { init(); } catch (err) { showError(err); }
    }
    document.addEventListener('davinci:canvas:ready', safeInit);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(safeInit, 100);
      });
    } else {
      setTimeout(safeInit, 100);
    }
  })();
})();
