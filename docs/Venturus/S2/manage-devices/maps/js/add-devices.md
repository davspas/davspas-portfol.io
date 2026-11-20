---
src: js/add-devices.js
does: Add Devices wizard on proj-wizard, provide asset tags, then review and validate, then commit devices of the page-locked type to the chosen Campus.
symbols: [siteList, siteName, titleText, footerNote, normalize, validateSerial, existingType, parseSerials, buildRows, buildUploadPanel, buildManualPanel, createCascader, destroyCascader, buildStep1, step1Footer, selectAllHeader, sortableHeader, buildStep2, step2Footer, summaryText, showStep1, wireStep1, selectSampleFile, updateNext, goToStep2, goToStep1, wireStep2, renderReviewTable, attachRowCheckboxes, updateSummary, updateSelectAll, updateCommitButton, applySortIndicators, commitUnits, notifyCommitSuccess, notifyConflicts, redirectPageToWizardSelection, init, hasPendingInput, buildCloseConfirmPopover, showCloseConfirm, hideCloseConfirm, open]
exports: [window.UnitsAddUnits]
dom: ["#addCascader", "#addCancelBtn", "#addNextBtn", "#addSerialInput", "#addDownloadTemplate", "#addDropzone", "#addReviewRowsTemplate", "#addReviewSearch", "#addShowErrors", "#addPrevBtn", "#addCommitBtn", "#addReviewSelectAll", "#addReviewBody", "#addSummary", "#addCloseConfirmPopover", "#addReviewTable", "#unitsCascader"]
map-sig: v1 367740095
---
