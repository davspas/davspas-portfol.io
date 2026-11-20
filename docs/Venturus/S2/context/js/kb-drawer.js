// kb-drawer.js — the reading drawer: renders a KB document, its table of contents,
// and the related-content cards that carry the graph's edges into the text.
//
// Behaviour is deliberately the same as the Requirements drawer
// (.davinci/plugins/proj-requirements-panel.js): docked to the right edge, resizable by
// dragging its left edge, width persisted, and `body { padding-right }` shifting the
// page instead of overlaying it — so the graph shrinks and stays visible while reading.
//
// It reuses that plugin's `.requirements-drawer__markdown` typography (a documented
// shared class) rather than restating Markdown styles, but owns its own `kb-drawer__*`
// shell so neither drawer can disturb the other's open/close state.
//
// Public surface: window.KbDrawer
(function() {
  'use strict';

  var WIDTH_KEY = 'davinci:kb-drawer-width';
  var MIN_WIDTH = 360;
  var DEFAULT_WIDTH = 560;

  var model = null;
  var current = null;        // { kind: 'topic'|'shared', id }
  var history = [];          // ids visited within the drawer, for the back button
  var searchTerm = '';
  var hits = [];             // <mark class="kb-hit"> elements, for prev/next
  var hitIndex = -1;
  var callbacks = {};
  var els = {};

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  // --- Shell ------------------------------------------------------------------

  function build() {
    var panel = document.createElement('aside');
    panel.className = 'kb-drawer';
    panel.id = 'kbDrawer';
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', 'Knowledge base document');
    panel.innerHTML =
      '<div class="kb-drawer__resizer" id="kbDrawerResizer"></div>' +
      '<div class="kb-drawer__header">' +
        '<div class="kb-drawer__heading">' +
          '<button class="kb-drawer__back" id="kbDrawerBack" type="button" hidden>' +
            '<sf-symbol name="chevron.left"></sf-symbol> Back' +
          '</button>' +
          '<h3 class="kb-drawer__title" id="kbDrawerTitle"></h3>' +
          '<div class="kb-drawer__chips" id="kbDrawerChips"></div>' +
        '</div>' +
        '<div class="kb-drawer__actions">' +
          '<div class="kb-drawer__hits" id="kbDrawerHits" hidden>' +
            '<button class="kb-drawer__hit-btn" id="kbDrawerHitPrev" type="button" aria-label="Previous match">' +
              '<sf-symbol name="chevron.up"></sf-symbol>' +
            '</button>' +
            '<span class="kb-drawer__hit-count" id="kbDrawerHitCount"></span>' +
            '<button class="kb-drawer__hit-btn" id="kbDrawerHitNext" type="button" aria-label="Next match">' +
              '<sf-symbol name="chevron.down"></sf-symbol>' +
            '</button>' +
          '</div>' +
          '<button class="kb-drawer__icon-btn" id="kbDrawerCopy" type="button" title="Copy raw Markdown">' +
            '<sf-symbol name="doc.on.doc"></sf-symbol>' +
          '</button>' +
          '<button class="kb-drawer__icon-btn" id="kbDrawerClose" type="button" aria-label="Close document">' +
            '<sf-symbol name="xmark"></sf-symbol>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="kb-drawer__body" id="kbDrawerBody"></div>';

    document.body.appendChild(panel);

    els.panel = panel;
    els.title = document.getElementById('kbDrawerTitle');
    els.chips = document.getElementById('kbDrawerChips');
    els.body = document.getElementById('kbDrawerBody');
    els.back = document.getElementById('kbDrawerBack');
    els.hits = document.getElementById('kbDrawerHits');
    els.hitCount = document.getElementById('kbDrawerHitCount');
  }

  function wire() {
    document.getElementById('kbDrawerClose').addEventListener('click', close);
    document.getElementById('kbDrawerCopy').addEventListener('click', copyMarkdown);
    document.getElementById('kbDrawerHitPrev').addEventListener('click', function() { stepHit(-1); });
    document.getElementById('kbDrawerHitNext').addEventListener('click', function() { stepHit(1); });
    els.back.addEventListener('click', goBack);
    setupResizer();
  }

  function setWidth(px) {
    document.body.style.setProperty('--kb-drawer-width', px + 'px');
  }

  function applyStoredWidth() {
    var stored;
    try { stored = localStorage.getItem(WIDTH_KEY); } catch (err) { stored = null; }
    var px = parseInt(stored, 10);
    setWidth(isFinite(px) && px >= MIN_WIDTH ? px : DEFAULT_WIDTH);
  }

  function setupResizer() {
    var resizer = document.getElementById('kbDrawerResizer');
    var dragging = false;

    function onMove(ev) {
      if (!dragging) return;
      var width = window.innerWidth - ev.clientX;
      setWidth(clampWidth(width));
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.body.classList.remove('is-resizing-kb-drawer');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      var current = document.body.style.getPropertyValue('--kb-drawer-width').trim();
      if (current) { try { localStorage.setItem(WIDTH_KEY, current); } catch (err) { /* ignore */ } }
      if (callbacks.onResize) callbacks.onResize();
    }
    resizer.addEventListener('mousedown', function(ev) {
      ev.preventDefault();
      dragging = true;
      document.body.classList.add('is-resizing-kb-drawer');
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function clampWidth(width) {
    return Math.max(MIN_WIDTH, Math.min(width, Math.round(window.innerWidth * 0.66)));
  }

  // --- Rendering --------------------------------------------------------------

  function renderMarkdown(md) {
    if (typeof marked !== 'undefined' && marked.parse) {
      return marked.parse(md, { gfm: true, breaks: false });
    }
    return '<pre>' + escapeHtml(md) + '</pre>';
  }

  function chip(text, variant, title) {
    return '<span class="kb-chip' + (variant ? ' kb-chip--' + variant : '') + '"' +
           (title ? ' title="' + escapeHtml(title) + '"' : '') + '>' + escapeHtml(text) + '</span>';
  }

  var STATUS_LABEL = { shipped: 'Shipped', partial: 'Partially shipped', 'design-only': 'Design-only' };
  var PLATFORM_LABEL = { kodiak: 'IT-managed', groundhog: 'Faculty-registered', both: 'IT-managed + Faculty-registered', neutral: '' };

  function renderChips(topic) {
    if (!topic) { els.chips.innerHTML = ''; return; }
    var html = '';
    html += chip(topic.category, 'category');
    html += chip(STATUS_LABEL[topic.status] || topic.status, 'status-' + topic.status);
    if (PLATFORM_LABEL[topic.platform]) html += chip(PLATFORM_LABEL[topic.platform], 'platform');
    if (topic.flagged) {
      html += chip('⚠ Flagged', 'flagged',
        topic.flagReason || 'Named in the KB index’s Staleness & gaps section');
    }
    topic.prototypes.forEach(function(name) {
      html += '<a class="kb-chip kb-chip--link" href="../' + encodeURIComponent(name) + '/" ' +
              'title="Open the ' + escapeHtml(name) + ' prototype">▸ ' + escapeHtml(name) + '</a>';
    });
    els.chips.innerHTML = html;
  }

  // Table of contents from the rendered DOM, not from the Markdown — that way the ids
  // it links to are the ids that actually exist on the headings.
  function renderToc(bodyEl) {
    var headings = bodyEl.querySelectorAll('.kb-drawer__markdown h2');
    if (headings.length < 3) return null;

    var nav = document.createElement('nav');
    nav.className = 'kb-toc';
    nav.innerHTML = '<span class="kb-toc__label">On this page</span>';
    var list = document.createElement('div');
    list.className = 'kb-toc__list';

    Array.prototype.forEach.call(headings, function(h) {
      if (!h.id) h.id = 'kb-' + slug(h.textContent);
      var link = document.createElement('button');
      link.type = 'button';
      link.className = 'kb-toc__link';
      link.textContent = h.textContent;
      link.addEventListener('click', function() {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      list.appendChild(link);
    });

    nav.appendChild(list);
    return nav;
  }

  // Related content: one card per graph neighbour, carrying the relationship prose the
  // file itself wrote, plus the neighbour's own one-line description. External
  // references (Room Booking Manager, Manage Infrastructure…) get muted, non-clickable cards — they are
  // related content with nowhere to navigate.
  function renderRelated(topic) {
    var section = document.createElement('section');
    section.className = 'kb-related';

    var neighbours = topic.neighbours.slice().sort(function(a, b) {
      return (model.byId[b].degree || 0) - (model.byId[a].degree || 0);
    });
    var externals = topic.refs.filter(function(ref) { return !ref.to; });

    if (!neighbours.length && !externals.length) return null;

    var html = '<h3 class="kb-related__title">Related content</h3><div class="kb-related__grid">';

    neighbours.forEach(function(id) {
      var other = model.byId[id];
      var relationship = model.relationship(topic.id, id);
      html +=
        '<button class="kb-card" type="button" data-topic="' + escapeHtml(id) + '">' +
          '<span class="kb-card__dot" style="background:' + KbGraph.categoryColor(other.category) + '"></span>' +
          '<span class="kb-card__title">' + escapeHtml(other.title) + '</span>' +
          '<span class="kb-card__meta">' + escapeHtml(other.category) + ' · ' +
            escapeHtml(STATUS_LABEL[other.status] || other.status) + '</span>' +
          '<span class="kb-card__summary">' + escapeHtml(other.summary || other.description) + '</span>' +
          (relationship
            ? '<span class="kb-card__relation">' + escapeHtml(relationship) + '</span>'
            : '') +
        '</button>';
    });

    externals.forEach(function(ref) {
      html +=
        '<div class="kb-card kb-card--external">' +
          '<span class="kb-card__dot kb-card__dot--external"></span>' +
          '<span class="kb-card__title">' + escapeHtml(ref.external) + '</span>' +
          '<span class="kb-card__meta">Outside the knowledge base</span>' +
          '<span class="kb-card__relation">' + escapeHtml(ref.label) + '</span>' +
        '</div>';
    });

    html += '</div>';
    section.innerHTML = html;

    section.addEventListener('click', function(ev) {
      var card = ev.target.closest('.kb-card[data-topic]');
      if (!card) return;
      openTopic(card.getAttribute('data-topic'), { push: true });
    });

    return section;
  }

  // Intra-KB links inside the rendered document select the target node instead of
  // navigating away — the graph is the point of the page.
  function wireInternalLinks(bodyEl) {
    bodyEl.querySelectorAll('a[href$=".md"], a[href*=".md#"]').forEach(function(link) {
      var href = link.getAttribute('href');
      var target = href.split('#')[0].split('/').pop().replace(/\.md$/, '');
      if (model.byId[target]) {
        link.classList.add('kb-link--topic');
        link.addEventListener('click', function(ev) {
          ev.preventDefault();
          openTopic(target, { push: true });
        });
        return;
      }
      var sharedId = target === 'README' ? 'index' : target;
      if (model.sharedById[sharedId]) {
        link.classList.add('kb-link--topic');
        link.addEventListener('click', function(ev) {
          ev.preventDefault();
          openShared(sharedId, { push: true });
        });
      }
    });
  }

  function paint(doc, opts) {
    var topic = opts.topic || null;

    els.title.textContent = doc.title;
    renderChips(topic);

    els.body.innerHTML = '';

    if (topic && topic.description) {
      var lede = document.createElement('p');
      lede.className = 'kb-drawer__lede';
      lede.textContent = topic.description;
      els.body.appendChild(lede);
    }

    var article = document.createElement('div');
    // `requirements-drawer__markdown` is the shared typography from
    // proj-requirements-panel.css — see this file's header note before renaming.
    article.className = 'requirements-drawer__markdown kb-drawer__markdown';
    article.innerHTML = renderMarkdown(doc.text);
    els.body.appendChild(article);

    var toc = renderToc(els.body);
    if (toc) els.body.insertBefore(toc, article);

    wireInternalLinks(article);

    if (topic) {
      var related = renderRelated(topic);
      if (related) els.body.appendChild(related);
    }

    applyHighlight(article);
    els.body.scrollTop = 0;
    els.back.hidden = history.length === 0;
  }

  // --- Search match navigation ------------------------------------------------

  function applyHighlight(article) {
    hits = [];
    hitIndex = -1;
    if (!searchTerm) { els.hits.hidden = true; return; }

    KbSearch.highlight(article, searchTerm);
    hits = Array.prototype.slice.call(article.querySelectorAll('mark.kb-hit'));
    els.hits.hidden = hits.length === 0;
    if (hits.length) {
      hitIndex = 0;
      markCurrentHit();
    }
    updateHitCount();
  }

  function markCurrentHit() {
    hits.forEach(function(hit, i) { hit.classList.toggle('kb-hit--current', i === hitIndex); });
    if (hits[hitIndex]) hits[hitIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function updateHitCount() {
    els.hitCount.textContent = hits.length ? (hitIndex + 1) + ' / ' + hits.length : '0';
  }

  function stepHit(delta) {
    if (!hits.length) return;
    hitIndex = (hitIndex + delta + hits.length) % hits.length;
    markCurrentHit();
    updateHitCount();
  }

  // --- Open / close -----------------------------------------------------------

  function open() {
    document.body.classList.add('has-kb-drawer-open');
    els.panel.setAttribute('aria-hidden', 'false');
    if (callbacks.onResize) setTimeout(callbacks.onResize, 220);   // after the width transition
  }

  function close() {
    document.body.classList.remove('has-kb-drawer-open');
    els.panel.setAttribute('aria-hidden', 'true');
    current = null;
    history = [];
    els.back.hidden = true;
    if (callbacks.onClose) callbacks.onClose();
    if (callbacks.onResize) setTimeout(callbacks.onResize, 220);
  }

  function pushHistory() {
    if (current) history.push(current);
  }

  function openTopic(id, options) {
    var topic = model.byId[id];
    if (!topic) return;
    if (options && options.push) pushHistory();
    current = { kind: 'topic', id: id };
    paint({ title: topic.title, text: topic.text }, { topic: topic });
    open();
    if (callbacks.onOpenTopic) callbacks.onOpenTopic(id);
  }

  function openShared(id, options) {
    var doc = model.sharedById[id];
    if (!doc) return;
    if (options && options.push) pushHistory();
    current = { kind: 'shared', id: id };
    paint({ title: doc.title, text: doc.text }, {});
    open();
    if (callbacks.onOpenShared) callbacks.onOpenShared(id);
  }

  function goBack() {
    var previous = history.pop();
    if (!previous) return;
    // Re-open without pushing, so Back walks backwards rather than in circles.
    if (previous.kind === 'topic') {
      current = previous;
      var topic = model.byId[previous.id];
      paint({ title: topic.title, text: topic.text }, { topic: topic });
      if (callbacks.onOpenTopic) callbacks.onOpenTopic(previous.id);
    } else {
      current = previous;
      var doc = model.sharedById[previous.id];
      paint({ title: doc.title, text: doc.text }, {});
      if (callbacks.onOpenShared) callbacks.onOpenShared(previous.id);
    }
  }

  function copyMarkdown() {
    if (!current) return;
    var doc = current.kind === 'topic' ? model.byId[current.id] : model.sharedById[current.id];
    if (!doc) return;
    var btn = document.getElementById('kbDrawerCopy');

    function flash(ok) {
      var original = btn.innerHTML;
      btn.innerHTML = ok
        ? '<sf-symbol name="checkmark"></sf-symbol>'
        : '<sf-symbol name="exclamationmark.triangle"></sf-symbol>';
      setTimeout(function() { btn.innerHTML = original; }, 1500);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(doc.text).then(function() { flash(true); }, function() { flash(false); });
      return;
    }
    // Fallback for non-secure contexts where the async clipboard API is unavailable.
    var ta = document.createElement('textarea');
    ta.value = doc.text;
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    flash(ok);
  }

  window.KbDrawer = {
    init: function(data, options) {
      model = data;
      callbacks = options || {};
      build();
      applyStoredWidth();
      wire();
    },
    openTopic: function(id) { openTopic(id, { push: false }); history = []; els.back.hidden = true; },
    openShared: function(id) { openShared(id, { push: false }); history = []; els.back.hidden = true; },
    close: close,
    isOpen: function() { return document.body.classList.contains('has-kb-drawer-open'); },
    currentId: function() { return current ? current.id : null; },

    // Re-render the open document with the new term highlighted.
    setSearchTerm: function(term) {
      searchTerm = (term || '').trim();
      if (!current) return;
      if (current.kind === 'topic') openTopic(current.id, { push: false });
      else openShared(current.id, { push: false });
    }
  };
})();
