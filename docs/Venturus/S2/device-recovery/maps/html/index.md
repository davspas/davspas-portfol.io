---
src: index.html
regions: {"#fdrRibbon": info ribbon, "[data-fdr-tab]": tabs, "#fdrResult": result, "#fdrCounters": counters, "#fdrContent": Registration table, "#fdrDeploy": Roll out pane, "#fdrEmpty": empty, "#fdrLoading": loading}
components: [table, notification, popover, btn, checkbox, empty-state, loader, form-input, sf-symbol]
scripts: [../runtime/assets/canvas/davinci-canvas.js, js/data.js, js/state.js, js/table.js, js/column-filters.js, js/actions.js, js/deploy.js, js/subheader.js, js/main.js]
dynamic: {"#fdrRibbon": main.js, "#fdrResult": actions.js, "#fdrCounters": table.js, "#fdrHead": table.js, "#fdrBody": table.js, "#fdrDeployBar": deploy.js, "#fdrDeployHead": deploy.js, "#fdrDeployBody": deploy.js}
map-sig: v1 2632613102
---
