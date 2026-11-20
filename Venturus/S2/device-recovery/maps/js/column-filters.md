---
src: js/column-filters.js
does: column sort (asc, desc, off) and filter popovers for Device (Faculty > Campus > Device cascader), Recovery profile and Updated at; Status has neither
exports: [FdrColumnFilters]
symbols: [cascaderOptions, stationBody, typeBody, updatedBody, openPopover, closePopover, apply, clear, commit, bind]
state: [_open]
dom: ["#fdrHead", "#fdrColStation"]
deps: [data.js#FdrData, state.js#FdrState, table.js#FdrTable, main.js#FdrApp]
---
