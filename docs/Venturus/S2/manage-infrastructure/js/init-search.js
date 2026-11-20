
/**
 * Initialize the page
 */
function init() {
    const treeContainer = document.getElementById('treeContainer');

    // Check if container exists, if not wait and retry
    if (!treeContainer) {
        setTimeout(init, 100);
        return;
    }

    // The Campus multi-select host (`#siteSelect`) is rendered by the canvas
    // from the subheader htmlContent in canvas-navigation-data.json. The
    // subheader can render after page-content, so wait for it explicitly —
    // without this gate, the Campus multi-select init silently skips and the
    // user can't pick any sites.
    if (!document.getElementById('siteSelect')) {
        setTimeout(init, 100);
        return;
    }

    // Add event delegation for tree interactions
    treeContainer.addEventListener('click', (e) => {
        const toggle = e.target.closest('.tree__toggle');
        const node = e.target.closest('.tree__node');

        if (toggle && !toggle.classList.contains('tree__toggle--hidden')) {
            // Toggle expansion
            e.stopPropagation();
            toggleNode(node);
        } else if (node) {
            // Modified clicks on bulk-disabled nodes are ignored (tooltip still shows on hover)
            if (node.classList.contains('tree__node--bulk-disabled')) {
                // Modified clicks are ignored; a plain click falls through below,
                // which ends the bulk selection and selects this row.
                if (e.metaKey || e.ctrlKey || e.shiftKey) {
                    e.preventDefault();
                    return;
                }
            }
            // Node Category nodes only toggle expand/collapse, no panel change
            const nodeId = node.dataset.nodeId;
            const nodeData = findNodeById(nodeId);
            if (nodeData && nodeData.level === 'Node Category') {
                toggleNode(node);
            } else if (e.metaKey || e.ctrlKey || e.shiftKey) {
                // Bulk mode via Cmd/Shift+Click
                if (typeof BulkMode !== 'undefined') {
                    BulkMode.handleNodeClick(nodeId, e);
                }
            } else {
                // Single click — exit bulk mode if active
                if (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive()) {
                    BulkMode.clearSelection();
                }
                selectNode(nodeId);
            }
        }
    });

    // Set up listener for site multi-select. The subheader hosts an empty
    // <div id="siteSelect"> that we initialize as a ProjMultiSelect (same
    // plugin used for the projects multi-select). The plugin updates the
    // global `selectedSites` array via onChange.
    const siteSelect = document.getElementById('siteSelect');

    if (siteSelect && window.ProjMultiSelect) {
        // Discover all sites that have servers in the data (active OR archived).
        var siteSet = {};
        if (typeof lineServersDataSets !== 'undefined') Object.keys(lineServersDataSets).forEach(function(s) { siteSet[s] = true; });
        if (typeof archivedServersData !== 'undefined') Object.keys(archivedServersData).forEach(function(s) { siteSet[s] = true; });
        var siteItems = Object.keys(siteSet).sort().map(function(s) { return { id: s, label: s }; });

        window.ProjMultiSelect.create('#siteSelect', {
            mode: 'flat',
            items: siteItems,
            selected: [],
            searchable: true,
            showSelectAllControls: true,
            allLabel: 'All Campuses',
            placeholder: 'Select campuses…',
            onChange: function(ids) {
                // Suppressed while the global search adds a site to reveal a
                // result — that path renders and re-selects itself, and
                // updateLayoutVisibility would clear the selection instead.
                if (typeof _suppressSitesOnChange !== 'undefined' && _suppressSitesOnChange) return;
                selectedSites = ids.slice().sort();
                // The picked nodes may belong to sites that just left the tree.
                if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
                updateLayoutVisibility();
            }
        });
    }

    // Faculties multi-select — lives in the tree section header (not the page
    // subheader, which stays focused on Campuses + actions). The MS items are
    // the union of every project across the currently-selected sites; the
    // sync helper in ui-helpers.js keeps `selectedProjects` reconciled with
    // the user's picks across site changes.
    var projectSelect = document.getElementById('projectSelect');
    if (projectSelect && window.ProjMultiSelect) {
        window.ProjMultiSelect.create('#projectSelect', {
            mode: 'flat',
            items: [],          // populated by syncProjectsFilterForSites on first site selection
            selected: [],
            searchable: true,
            showSelectAllControls: true,
            allLabel: 'All Faculties',
            placeholder: 'Filter by Faculties…',
            onChange: function(ids) {
                // Programmatic updates from syncProjectsFilterForSites set this
                // guard so the plugin's setSelected → notifyChange doesn't
                // re-enter reRenderTree (which would then call sync again,
                // looping forever). Skip the body when suppressed.
                if (typeof _suppressProjectsOnChange !== 'undefined' && _suppressProjectsOnChange) return;
                selectedProjects = ids.slice();
                // Bulk mode never updates selectedNodeId, so only a plain single selection is kept.
                var prevNodeId = (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive()) ? null : selectedNodeId;
                if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
                if (typeof reRenderTree === 'function') reRenderTree();
                if (typeof window._updateResetFiltersState === 'function') window._updateResetFiltersState();
                // Re-select previously selected node if still in the tree.
                if (prevNodeId) {
                    var nodeInDom = document.querySelector('.tree__node[data-node-id="' + prevNodeId + '"]');
                    if (nodeInDom) { selectNode(prevNodeId); return; }
                }
                // Prior selection filtered out — fall back to the empty state
                // rather than auto-selecting a site.
                selectedNodeId = null;
                if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
            }
        });
    }

    // Initial check
    updateLayoutVisibility();

    // Initialize settings panel
    initSettingsPanel();

    // Initialize search
    initSearch();

    // Tree filters — re-render tree on change, preserving selection
    ['filterArchived'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', function() {
            // Bulk mode never updates selectedNodeId, so only a plain single selection is kept.
            var prevNodeId = (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive()) ? null : selectedNodeId;
            var prevNode = prevNodeId ? findNodeById(prevNodeId) : null;
            var wasArchived = prevNode && prevNode.archived;
            var archivedJustDisabled = id === 'filterArchived' && !el.checked;

            if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
            reRenderTree();

            if (prevNodeId && !(wasArchived && archivedJustDisabled)) {
                var nodeInDom = document.querySelector('.tree__node[data-node-id="' + prevNodeId + '"]');
                if (nodeInDom) {
                    selectNode(prevNodeId);
                    return;
                }
            }
            // Fallback: prior selection gone → empty state (no auto-select)
            selectedNodeId = null;
            if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
        });
    });

    // Asset Registry dropdown filter
    ['filterFSN'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', function() {
            // Bulk mode never updates selectedNodeId, so only a plain single selection is kept.
            var prevNodeId = (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive()) ? null : selectedNodeId;
            if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
            reRenderTree();
            if (prevNodeId) {
                var nodeInDom = document.querySelector('.tree__node[data-node-id="' + prevNodeId + '"]');
                if (nodeInDom) { selectNode(prevNodeId); return; }
            }
            selectedNodeId = null;
            if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
        });
    });

    // Reset filters button — enabled when any filter differs from default
    initResetFiltersButton();

    // Initialize new server drawer
    if (typeof NewServerDrawer !== 'undefined') {
        NewServerDrawer.init();
    }

    // Initialize manage actions
    if (typeof ManageActions !== 'undefined') {
        ManageActions.init();
    }

    // Initialize export
    if (typeof ExportServers !== 'undefined') {
        ExportServers.init();
    }

    // Initialize bulk mode
    if (typeof BulkMode !== 'undefined') {
        BulkMode.init();
    }

    // Initialize save/discard buttons
    initSaveDiscardButtons();
}

/**
 * Reset Filters button — enabled when any filter differs from default,
 * clicking restores defaults and re-renders tree.
 */
function initResetFiltersButton() {
    var btn = document.getElementById('resetFiltersBtn');
    if (!btn) return;

    var DEFAULTS = {
        filterFSN: 'all',
        filterArchived: false    // unchecked by default
    };

    function _projectsAllSelected() {
        // The Faculties multi-select is "default" when every available project
        // is selected (the no-op state). The available set comes from the data,
        // not the plugin — ProjMultiSelect has no getItems().
        if (!window.ProjMultiSelect || !document.getElementById('projectSelect')) return true;
        try {
            var items = getAvailableProjectsForSites(selectedSites) || [];
            var selected = window.ProjMultiSelect.getSelected('#projectSelect') || [];
            if (items.length === 0) return true;
            return selected.length === items.length;
        } catch (e) { return true; }
    }

    function isDefault() {
        var fsn = document.getElementById('filterFSN');
        var archived = document.getElementById('filterArchived');
        return (!fsn || fsn.value === DEFAULTS.filterFSN)
            && (!archived || archived.checked === DEFAULTS.filterArchived)
            && _projectsAllSelected();
    }

    function updateBtnState() {
        btn.disabled = isDefault();
    }

    // Expose so the Faculties multi-select onChange (in init-search.js) and
    // syncProjectsFilterForSites (in ui-helpers.js) can refresh button state
    // immediately on selection changes — no click-polling hack required.
    window._updateResetFiltersState = updateBtnState;

    // Update on any filter change. The Faculties multi-select drives this via
    // its onChange (calls window._updateResetFiltersState) — both the user
    // path and the programmatic sync path are covered.
    ['filterFSN', 'filterArchived'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', updateBtnState);
    });

    btn.addEventListener('click', function() {
        if (btn.disabled) return;
        var fsn = document.getElementById('filterFSN');
        var archived = document.getElementById('filterArchived');
        if (fsn) fsn.value = DEFAULTS.filterFSN;
        if (archived) archived.checked = DEFAULTS.filterArchived;

        // Reset the Faculties multi-select to "all selected" alongside the
        // other filters. Wrap setSelected with the guard so the plugin's
        // onChange doesn't trigger a redundant reRenderTree — the explicit
        // call below is the single render for this click.
        if (window.ProjMultiSelect && document.getElementById('projectSelect')) {
            try {
                var allIds = (getAvailableProjectsForSites(selectedSites) || []).slice();
                _suppressProjectsOnChange = true;
                window.ProjMultiSelect.setSelected('#projectSelect', allIds);
                selectedProjects = allIds.slice();
            } finally { _suppressProjectsOnChange = false; }
        }

        // Bulk mode never updates selectedNodeId, so only a plain single selection is kept.
        var prevNodeId = (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive()) ? null : selectedNodeId;
        if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
        reRenderTree();
        if (prevNodeId) {
            var nodeInDom = document.querySelector('.tree__node[data-node-id="' + prevNodeId + '"]');
            if (nodeInDom) { selectNode(prevNodeId); updateBtnState(); return; }
        }
        selectedNodeId = null;
        if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
        updateBtnState();
    });

    updateBtnState();
}

