/**
 * Manage Devices — Actions & selection (window.UnitsActions)
 * Row/select-all selection, bulk status actions (approve/reject/revoke),
 * export dropdown, and add placeholder. Re-renders via window.UnitsApp.refresh().
 */
(function() {
    'use strict';

    var State = window.UnitsState;
    var Data = window.UnitsData;

    function refresh(opts) {
        if (window.UnitsApp) window.UnitsApp.refresh(opts);
    }

    /* ── Selection ── */

    function handleRowSelection(e) {
        var serial = e.target.dataset.serial;
        if (e.target.checked) State.selectedRows.add(serial);
        else State.selectedRows.delete(serial);
        updateSelectAllCheckbox();
        updateActionButtons();
    }

    function attachRowCheckboxes() {
        document.querySelectorAll('.row-checkbox').forEach(function(cb) {
            cb.addEventListener('change', handleRowSelection);
        });
    }

    function handleSelectAll(e) {
        var checked = e.target.checked;
        State.currentData.forEach(function(unit) {
            if (checked) State.selectedRows.add(unit.serialNumber);
            else State.selectedRows.delete(unit.serialNumber);
        });
        refresh();
        updateActionButtons();
    }

    function attachSelectAll() {
        var selectAll = document.getElementById('selectAll');
        if (selectAll) selectAll.addEventListener('change', handleSelectAll);
    }

    function updateSelectAllCheckbox() {
        var selectAll = document.getElementById('selectAll');
        if (!selectAll) return;
        var visible = State.currentData.length;
        var selectedVisible = State.currentData.filter(function(u) {
            return State.selectedRows.has(u.serialNumber);
        }).length;
        selectAll.checked = visible > 0 && selectedVisible === visible;
        selectAll.indeterminate = selectedVisible > 0 && selectedVisible < visible;
    }

    // Per-action gating: which current statuses a bulk action may be applied to (per the
    // Device Status Lifecycle diagram — Approve→READY, then PROVISIONED/ACTIVE happen outside
    // Atrium via cert issuance; ACTIVE cannot be revoked).
    //   Approve: PENDING APPROVAL → READY
    //   Reject:  PENDING APPROVAL → RETIRED
    //   Retire:  PENDING APPROVAL / READY / PROVISIONED → RETIRED  (ACTIVE excluded)
    var ACTION_SOURCES = {
        approve: ['PENDING APPROVAL'],
        reject: ['PENDING APPROVAL'],
        revoke: ['PENDING APPROVAL', 'READY', 'PROVISIONED']
    };

    /** Selected unit objects (looked up from the dataset by serial). */
    function selectedUnits() {
        return Data.units.filter(function(u) { return State.selectedRows.has(u.serialNumber); });
    }

    /** Does the current selection contain ≥1 unit eligible for the given action? */
    function hasEligible(action) {
        var sources = ACTION_SOURCES[action];
        return selectedUnits().some(function(u) { return sources.indexOf(u.status) !== -1; });
    }

    function updateActionButtons() {
        var buttons = {
            approve: document.getElementById('approveBtn'),
            reject: document.getElementById('rejectBtn'),
            revoke: document.getElementById('revokeBtn')
        };
        Object.keys(buttons).forEach(function(action) {
            var btn = buttons[action];
            if (btn) btn.disabled = !hasEligible(action);
        });
    }

    /* ── Bulk status actions ── */

    /** Apply newStatus only to selected units whose current status is eligible for the action. */
    function applyStatus(action, newStatus, label) {
        var sources = ACTION_SOURCES[action];
        var affected = selectedUnits().filter(function(u) { return sources.indexOf(u.status) !== -1; });
        if (!affected.length) return;
        affected.forEach(function(unit) {
            unit.status = newStatus;
            State.selectedRows.delete(unit.serialNumber); // clear only the rows we acted on
        });
        refresh({ loading: true });
        updateActionButtons();
        console.log(label + ' ' + affected.length + ' unit(s):', affected.map(function(u) { return u.serialNumber; }));
    }

    function handleApprove() { applyStatus('approve', 'READY', 'Approved'); }     // Approve → READY
    function handleReject() { applyStatus('reject', 'RETIRED', 'Rejected'); }     // Reject → RETIRED
    function handleRevoke() { applyStatus('revoke', 'RETIRED', 'Retired'); }      // Retire → RETIRED

    function handleAdd() {
        if (window.UnitsAddUnits) UnitsAddUnits.open();
    }

    /* ── Export dropdown ── */

    function toggleDropdown(id) {
        var dropdown = document.getElementById(id);
        var isVisible = dropdown.style.display === 'block';
        document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.style.display = 'none'; });
        dropdown.style.display = isVisible ? 'none' : 'block';
    }

    function handleExport(type) {
        console.log('Export ' + type + ' clicked');
        var dropdown = document.getElementById('exportDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }

    /** Wire the always-present action buttons + export dropdown once at init. */
    function wireButtons() {
        var approveBtn = document.getElementById('approveBtn');
        var rejectBtn = document.getElementById('rejectBtn');
        var revokeBtn = document.getElementById('revokeBtn');
        var addBtn = document.getElementById('addBtn');
        var exportBtn = document.getElementById('exportBtn');

        if (approveBtn) approveBtn.addEventListener('click', handleApprove);
        if (rejectBtn) rejectBtn.addEventListener('click', handleReject);
        if (revokeBtn) revokeBtn.addEventListener('click', handleRevoke);
        if (addBtn) addBtn.addEventListener('click', handleAdd);

        if (exportBtn) exportBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleDropdown('exportDropdown');
        });
        document.querySelectorAll('[data-export]').forEach(function(item) {
            item.addEventListener('click', function(e) {
                handleExport(e.currentTarget.dataset.export);
            });
        });
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.dropdown-wrapper')) {
                document.querySelectorAll('.dropdown-menu').forEach(function(m) { m.style.display = 'none'; });
            }
        });
    }

    window.UnitsActions = {
        wireButtons: wireButtons,
        attachRowCheckboxes: attachRowCheckboxes,
        attachSelectAll: attachSelectAll,
        updateSelectAllCheckbox: updateSelectAllCheckbox,
        updateActionButtons: updateActionButtons
    };
})();
