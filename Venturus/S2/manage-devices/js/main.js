/**
 * Manage Devices — Entry point (window.UnitsApp)
 *
 * Wires modules together and owns the single refresh() that re-filters and re-renders
 * the active view (both modes: a flat unit list for the selected site). Uses the
 * DaVinci canvas-ready init pattern.
 */
(function() {
    'use strict';

    var State = window.UnitsState;
    var Subheader = window.UnitsSubheader;
    var Actions = window.UnitsActions;
    var Grouped = window.UnitsGroupedTable;

    var LOADING_DELAY = 500;  // mock request latency (ms)
    var _loadingTimer = null;

    /**
     * Re-filter for the active mode + scope, then render the active view.
     * Shows the "no scope" empty state until a site is chosen.
     * Pass { loading: true } to mock a request: show the spinner for LOADING_DELAY, then render.
     */
    function refresh(opts) {
        var loadingState = document.getElementById('loadingState');
        var tableContainer = document.querySelector('.table-container');
        var noSiteState = document.getElementById('noSiteState');
        var emptyFilterState = document.getElementById('emptyFilterState');

        Subheader.updateScopeDependentControls();

        // Cancel any in-flight mock load before deciding what to show.
        if (_loadingTimer) { clearTimeout(_loadingTimer); _loadingTimer = null; }

        if (!Subheader.hasScope()) {
            if (loadingState) loadingState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'none';
            if (emptyFilterState) emptyFilterState.style.display = 'none';
            if (noSiteState) noSiteState.style.display = 'flex';
            return;
        }

        if (opts && opts.loading) {
            // Mock a request: spinner now, render after the delay (search value is read fresh then).
            if (noSiteState) noSiteState.style.display = 'none';
            if (emptyFilterState) emptyFilterState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'none';
            if (loadingState) loadingState.style.display = 'flex';
            _loadingTimer = setTimeout(function() {
                _loadingTimer = null;
                renderUnits();
            }, LOADING_DELAY);
            return;
        }

        renderUnits();
    }

    /** Filter for the active mode + scope and render the table (no loading delay). */
    function renderUnits() {
        var loadingState = document.getElementById('loadingState');
        var tableContainer = document.querySelector('.table-container');
        var noSiteState = document.getElementById('noSiteState');
        var searchInput = document.getElementById('searchInput');
        var term = searchInput ? searchInput.value : '';

        if (loadingState) loadingState.style.display = 'none';
        if (noSiteState) noSiteState.style.display = 'none';
        if (tableContainer) tableContainer.style.display = 'block';

        State.currentData = State.currentTypeFilter === 'Registered'
            ? Grouped.filterGroundhog(term)
            : Grouped.filterKodiak(term);
        Grouped.render(afterRender);

        Actions.updateSelectAllCheckbox();
    }

    /** Re-attach per-render handlers after the table body/head is rebuilt. */
    function afterRender() {
        Actions.attachRowCheckboxes();
        Actions.attachSelectAll();
        Actions.updateSelectAllCheckbox();
        Actions.updateActionButtons();
    }

    function init() {
        // Subheader title (in case canvas didn't set it from nav data).
        var subheaderTitle = document.querySelector('.sub-header__subtitle');
        if (subheaderTitle && !subheaderTitle.textContent.trim()) {
            subheaderTitle.textContent = 'Manage Devices';
        }

        Actions.wireButtons();
        Subheader.init();
        if (window.UnitsAddUnits) UnitsAddUnits.init();

        refresh({ loading: true });
        console.log('✓ Manage Devices page initialized');
    }

    window.UnitsApp = { init: init, refresh: refresh };

    /* DaVinci canvas-ready init pattern (with fallback). */
    (function() {
        var initialized = false;
        function safeInit() {
            if (initialized) return;
            initialized = true;
            try { init(); } catch (err) { console.error('Init failed:', err); }
        }
        document.addEventListener('davinci:canvas:ready', safeInit);
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(function() {
                    if (!initialized && document.querySelector('.main-container')) safeInit();
                }, 100);
            });
        } else {
            setTimeout(function() {
                if (!initialized && document.querySelector('.main-container')) safeInit();
            }, 100);
        }
    })();
})();
