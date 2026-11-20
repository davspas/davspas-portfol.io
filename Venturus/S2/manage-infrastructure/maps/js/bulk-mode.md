---
src: js/bulk-mode.js
does: Always-on bulk selection (Cmd/Shift+Click) for campuses and non-archived building controllers (archived are never selectable), with a bulk configuration panel that toggles Registry Sync across the effective building-controller set through the shared save/discard footer.
symbols: [isBulkActive, _kindForNode, handleNodeClick, toggleNode, selectRange, updateVisualSelection, updateUI, updateInfoBar, getEffectiveLSIds, formatBulkTitle, updatePanel, populateBulkSwitches, _updateBulkFSNNotice, _applyMixedSwitch, computeSharedValue, readSwitchState, captureBulkInitialState, isDirty, discard, setBulkSwitch, updateDisabledNodes, attachBulkTooltip, onBulkTipEnter, onBulkTipLeave, hideActiveBulkTooltip, save, applyConfiguration, clearSelection, clearRangePreview, previewRange, onTreeMouseOver, onTreeMouseOut, onKeyUp, onKeyDown, init]
exports: [window.BulkMode]
dom: ["#bulkSelectionClearBtn", "#bulkConfigPanel", "#detailsContent", "#detailsEmptyState", "#settingsPanelTitle", "#managePopoverTrigger", "#settingsPanelFooter", "#bulkFSNApiCalls", "#bulkFSNApiCallsNotice", "#bulkFSNApiCallsNoticeMessage", "#treeContainer"]
state: [bulkSelectedIds, lastBulkClickedId, bulkUserSet, bulkInitial]
map-sig: v1 195271215
---
