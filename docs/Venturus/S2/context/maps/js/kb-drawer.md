---
src: js/kb-drawer.js
does: The reading drawer, renders a KB document with its TOC, search-hit navigation and the related-content cards that carry graph edges into the text.
symbols: [escapeHtml, slug, build, wire, setWidth, applyStoredWidth, setupResizer, onMove, onUp, clampWidth, renderMarkdown, chip, renderChips, renderToc, renderRelated, wireInternalLinks, paint, applyHighlight, markCurrentHit, updateHitCount, stepHit, open, close, pushHistory, openTopic, openShared, goBack, copyMarkdown, flash]
exports: [window.KbDrawer]
dom: ["#kbDrawerTitle", "#kbDrawerChips", "#kbDrawerBody", "#kbDrawerBack", "#kbDrawerHits", "#kbDrawerHitCount", "#kbDrawerClose", "#kbDrawerCopy", "#kbDrawerHitPrev", "#kbDrawerHitNext", "#kbDrawerResizer"]
state: [WIDTH_KEY, MIN_WIDTH, DEFAULT_WIDTH, model, current, history, searchTerm, hits, hitIndex, callbacks, els, STATUS_LABEL, PLATFORM_LABEL]
deps: [kb-search.js#highlight, kb-graph.js#categoryColor, kb-data.js#model.relationship, marked#parse]
map-sig: v1 3120580985
---
