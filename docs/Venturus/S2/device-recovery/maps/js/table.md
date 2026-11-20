---
src: js/table.js
does: scope, search and counter filtering; renders counters and the device table grouped Faculty > Campus > Device; the shared grouping helper the Roll out tab reuses; delegated click and change handlers
exports: [FdrTable]
symbols: [fmt, esc, plural, statusChip, countChips, tip, inScope, matchesSearch, passesColumnFilters, visible, visibleDeploy, headerCell, sortUnits, groupedRows, isSelectable, renderCounters, factoryBtn, actionCell, unitRow, renderTable, bind]
state: []
dom: ["#fdrCounters", "#fdrHead", "#fdrBody", "#fdrSelectAll", "#fdrTable"]
deps: [data.js#FdrData, state.js#FdrState, main.js#FdrApp, actions.js#FdrActions]
map-sig: v1 1419202026
---
