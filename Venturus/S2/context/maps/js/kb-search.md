---
src: js/kb-search.js
does: One full-text index over every KB document, feeding both the graph filter and the results list.
symbols: [escapeHtml, offsets, snippet, byCount]
exports: [window.KbSearch]
state: [MAX_SNIPPET, MAX_RESULTS_PER_GROUP, docs]
deps: [kb-data.js#model.topics, kb-data.js#model.shared]
map-sig: v1 2576998582
---
