---
src: js/subheader.js
does: pins the navbar source toggle to IT-managed with Faculty-registered disabled; wires the Campuses and Faculties multi-selects and the Group by campus switch
exports: [FdrSubheader]
symbols: [lockSourceToggle, init, pruneSelection]
state: []
dom: ["#fdrSites", "#fdrProjects", "#fdrGroup"]
deps: [data.js#FdrData, state.js#FdrState, main.js#FdrApp]
map-sig: v1 2337303463
---
