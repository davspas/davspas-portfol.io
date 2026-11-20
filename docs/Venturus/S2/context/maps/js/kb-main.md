---
src: js/kb-main.js
does: Page entry point, loads the KB, wires graph/search/drawer together, and owns the toolbar, legend, tooltip and results list.
symbols: [escapeHtml, renderLayoutButtons, renderLegend, setLegendVisible, applyStoredLegendVisibility, showTooltip, renderResults, groupHtml, runSearch, clearSearch, wire, markActiveFloating, showError, init, safeInit]
dom: ["#kbLegendClose", "#kbZoomIn", "#kbZoomOut", "#kbZoomFit", "#kbLoading", "#kbError", "#kbErrorText", "#kbStage", "#kbLayouts", "#kbLegend", "#kbTooltip", "#kbResults", "#kbSearchInput", "#kbSearchClear", "#kbSearchStatus", "#kbFloating", "#kbHideNonMatching", "#kbLegendToggle"]
state: [model, els, searchDebounce, lastResult, LEGEND_KEY, STATUS_LABEL]
deps: [kb-data.js#load, kb-graph.js#init/setData/setLayout/setFilter/select/focus/clearIsolate, kb-search.js#build/run, kb-drawer.js#init/openTopic/openShared/setSearchTerm]
map-sig: v1 2405742758
---
