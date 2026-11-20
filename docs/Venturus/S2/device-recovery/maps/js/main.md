---
src: js/main.js
does: canvas-ready init and the single render() that switches loading, empty and content states for both tabs, info ribbon, filter status, tab switching and Manage Devices arrival
exports: [FdrApp]
symbols: [show, renderRibbon, renderFilterStatus, render, init, safeInit]
state: [_timer, _focusScrolled]
dom: ["#fdrRibbon", "#fdrFilterStatus", "#fdrClearFilters", "#fdrEmpty", "#fdrLoading", "#fdrContent", "#fdrDeploy", "#fdrCounters", "[data-fdr-tab]", "#fdrSearch" (in the subheader)]
deps: [data.js#FdrData, state.js#FdrState, table.js#FdrTable, actions.js#FdrActions, deploy.js#FdrDeploy, subheader.js#FdrSubheader, column-filters.js#FdrColumnFilters]
map-sig: v1 3997207060
---
