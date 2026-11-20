---
src: js/deploy.js
does: Roll out tab: version strip and wizard, device table (Faculty > Campus > Device) with last roll-out status, and the dialogs for summary (roll out now or schedule), status (retry, cancel schedule), history, scheduled list, versions and two-step XLSX import; only Registered devices are selectable
exports: [FdrDeploy]
symbols: [eligible, statusIcon, openDialog, dialog, renderBar, deployRow, render, startRun, openSummary, openStatus, cancelSchedule, openHistory, openSchedule, openVersions, openImport, bind]
state: []
dom: ["#fdrDeployBar", "#fdrDeployHead", "#fdrDeployBody", "#fdrDeployTable", "#fdrVersionSelect", "#fdrDeploySelectAll"]
deps: [data.js#FdrData, state.js#FdrState, table.js#FdrTable, main.js#FdrApp, actions.js#FdrActions]
---
