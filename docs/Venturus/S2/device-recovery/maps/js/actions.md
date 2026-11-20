---
src: js/actions.js
does: confirmation pop-confirm, mock send (per device) with partial and Room Booking Manager-down outcomes, result banner and success toast, bounded polling, send button state
exports: [FdrActions]
symbols: [unitsById, summarize, plural, notify, clearNotice, openConfirm, closeConfirm, nowIso, send, tick, startPolling, stopPolling, updateBar, bind]
state: [_pollTimer, _pending]
dom: ["#fdrResult", "#fdrConfirm", "#fdrModalTitle", "#fdrModalBody", "#fdrModalConfirm", "#fdrSelectionBar", "#fdrSendBtn", "#fdrSendLabel"]
deps: [data.js#FdrData, state.js#FdrState, table.js#FdrTable, main.js#FdrApp]
map-sig: v1 1700191077
---
