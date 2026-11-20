---
src: index.html
does: Page shell for the Knowledge Base graph, toolbar, SVG stage, floating shared-document strip, legend and load/error states.
regions: ["#app", "#page-content", "#kbRoot", "#kbSearchInput", "#kbSearchClear", "#kbSearchStatus", "#kbLayouts", "#kbHideNonMatching", "#kbLegendToggle", "#kbZoomOut", "#kbZoomIn", "#kbZoomFit", "#kbStage", "#kbSvg", "#kbViewport", "#kbLanes", "#kbEdges", "#kbNodes", "#kbFloating", "#kbLegend", "#kbTooltip", "#kbResults", "#kbLoading", "#kbError", "#kbErrorText"]
scripts: ["../../.davinci/assets/canvas/davinci-canvas.js", "js/kb-data.js", "js/kb-graph.js", "js/kb-search.js", "js/kb-drawer.js", "js/kb-main.js"]
components: [sf-symbol]
dynamic: [kbLayouts -> kb-main.js#renderLayoutButtons, kbLegend -> kb-main.js#renderLegend, kbTooltip -> kb-main.js#showTooltip, kbResults -> kb-main.js#renderResults, kbLanes/kbEdges/kbNodes -> kb-graph.js#renderLanes/renderEdges/renderNodes, kbDrawer -> kb-drawer.js#build]
map-sig: v1 2069364989
---
