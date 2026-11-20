---
src: js/main.js
does: Entry point that wires modules and owns refresh(), which re-filters and renders the flat devices list with a mock loading spinner.
symbols: [refresh, renderUnits, afterRender, init, safeInit]
exports: [window.UnitsApp]
dom: ["#loadingState", "#noSiteState", "#emptyFilterState", "#searchInput"]
map-sig: v1 2620282225
---
