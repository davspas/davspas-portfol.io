---
src: js/actions.js
does: Handles row and select-all selection, status-gated bulk actions (approve and reject are deprecated and hidden; retire), the export dropdown, and the Add button.
symbols: [refresh, handleRowSelection, attachRowCheckboxes, handleSelectAll, attachSelectAll, updateSelectAllCheckbox, selectedUnits, hasEligible, updateActionButtons, applyStatus, handleApprove, handleReject, handleRevoke, handleAdd, toggleDropdown, handleExport, wireButtons]
exports: [window.UnitsActions]
dom: ["#selectAll", "#approveBtn", "#rejectBtn", "#revokeBtn", "#exportDropdown", "#addBtn", "#exportBtn"]
map-sig: v1 536778557
---
