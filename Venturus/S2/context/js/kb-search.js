// kb-search.js — full-text search across every knowledge base document.
//
// Two jobs, one index:
//   1. Filter the graph — nodes whose file doesn't contain the term are hidden (or
//      dimmed), and matching nodes get a match-count badge.
//   2. Feed the results list — including the four shared documents, which are NOT
//      nodes. Without that group a term that only appears in the glossary would look
//      like "no results" even though the KB answers it.
//
// The index is just the raw Markdown lowercased: ~450 KB total, already in memory from
// the initial load, and a plain indexOf scan over it is instant at this size. No
// tokenising, so a search for "building controller" or "GET /devices" matches literally,
// which is what a reader of these documents expects.
//
// Public surface: window.KbSearch
(function() {
  'use strict';

  var MAX_SNIPPET = 150;
  var MAX_RESULTS_PER_GROUP = 8;

  var docs = [];       // { id, kind, title, subtitle, text, lower }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text == null ? '' : String(text);
    return div.innerHTML;
  }

  // Every occurrence of `term` in `lower`, as start offsets.
  function offsets(lower, term) {
    var out = [];
    var from = 0;
    var at;
    while ((at = lower.indexOf(term, from)) !== -1) {
      out.push(at);
      from = at + term.length;
    }
    return out;
  }

  // A readable window around the first hit, trimmed to whole words and with the match
  // wrapped in <mark>. Markdown syntax is left as-is: it is what the file says.
  function snippet(text, at, term) {
    var before = Math.max(0, at - Math.floor((MAX_SNIPPET - term.length) / 2));
    var after = Math.min(text.length, at + term.length + Math.floor((MAX_SNIPPET - term.length) / 2));
    var head = text.slice(before, at);
    var hit = text.slice(at, at + term.length);
    var tail = text.slice(at + term.length, after);

    if (before > 0) head = '…' + head.replace(/^\S*\s/, '');
    if (after < text.length) tail = tail.replace(/\s\S*$/, '') + '…';

    return escapeHtml(head).replace(/\n+/g, ' ') +
           '<mark>' + escapeHtml(hit) + '</mark>' +
           escapeHtml(tail).replace(/\n+/g, ' ');
  }

  window.KbSearch = {
    build: function(model) {
      docs = [];
      model.topics.forEach(function(topic) {
        docs.push({
          id: topic.id, kind: 'topic', title: topic.title,
          subtitle: topic.category, text: topic.text, lower: topic.text.toLowerCase()
        });
      });
      model.shared.forEach(function(doc) {
        docs.push({
          id: doc.id, kind: 'shared', title: doc.title,
          subtitle: 'Shared document', text: doc.text, lower: doc.text.toLowerCase()
        });
      });
    },

    // -> { term, topics: [...], shared: [...], counts: {id: n}, matchingIds: {id: true},
    //      totalMatches, totalDocs }
    run: function(rawTerm) {
      var term = (rawTerm || '').trim().toLowerCase();
      if (!term) return null;

      var result = { term: term, topics: [], shared: [], counts: {}, matchingIds: {}, totalMatches: 0, totalDocs: 0 };

      docs.forEach(function(doc) {
        var hits = offsets(doc.lower, term);
        if (!hits.length) return;
        var entry = {
          id: doc.id, kind: doc.kind, title: doc.title, subtitle: doc.subtitle,
          count: hits.length, snippet: snippet(doc.text, hits[0], term)
        };
        result.counts[doc.id] = hits.length;
        result.totalMatches += hits.length;
        result.totalDocs++;
        if (doc.kind === 'topic') {
          result.matchingIds[doc.id] = true;
          result.topics.push(entry);
        } else {
          result.shared.push(entry);
        }
      });

      function byCount(a, b) { return b.count - a.count; }
      result.topics.sort(byCount);
      result.shared.sort(byCount);
      return result;
    },

    MAX_RESULTS_PER_GROUP: MAX_RESULTS_PER_GROUP,

    // Wrap every occurrence of `term` in already-rendered HTML with <mark class="kb-hit">.
    // Walks text nodes so it can never corrupt the markup marked() produced, and skips
    // <code>/<pre> only where the term would break syntax highlighting — it doesn't, so
    // code blocks are searched too; that is where API names live.
    highlight: function(container, term) {
      if (!term) return 0;
      var needle = term.toLowerCase();
      var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
      var targets = [];
      var node;
      while ((node = walker.nextNode())) {
        if (node.nodeValue.toLowerCase().indexOf(needle) !== -1) targets.push(node);
      }

      var count = 0;
      targets.forEach(function(textNode) {
        var value = textNode.nodeValue;
        var lower = value.toLowerCase();
        var frag = document.createDocumentFragment();
        var from = 0;
        var at;
        while ((at = lower.indexOf(needle, from)) !== -1) {
          if (at > from) frag.appendChild(document.createTextNode(value.slice(from, at)));
          var mark = document.createElement('mark');
          mark.className = 'kb-hit';
          mark.textContent = value.slice(at, at + needle.length);
          frag.appendChild(mark);
          count++;
          from = at + needle.length;
        }
        if (from < value.length) frag.appendChild(document.createTextNode(value.slice(from)));
        textNode.parentNode.replaceChild(frag, textNode);
      });
      return count;
    }
  };
})();
