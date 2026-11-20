/**
 * Manage Devices — Subheader controls (window.UnitsSubheader)
 *
 * Owns the single scope control — the proj-cascader plugin in `#unitsCascader`. Both modes
 * use one column: Campus (single-select). Also owns the navbar source-toggle listener, search
 * input, Approve/Reject group visibility, and the Registered-only info banner shown above the
 * table. Rendering is delegated to window.UnitsApp.refresh().
 */
(function() {
    'use strict';

    var State = window.UnitsState;
    var Data = window.UnitsData;

    var _cascaderInitialized = false;

    function app() { return window.UnitsApp; }

    /** Is a scope selected? Both modes need only a site. */
    function hasScope() {
        return !!State.selectedSite;
    }

    /* ── Cascader scope control ── */

    function columnsForMode() {
        return [{ level: 'site', mode: 'single', placeholder: 'Pick a Campus' }];
    }

    function valueForMode() {
        return { site: State.selectedSite };
    }

    function ensureCascader() {
        if (_cascaderInitialized || !window.ProjCascader) return;
        var container = document.getElementById('unitsCascader');
        if (!container) return;

        window.ProjCascader.create('#unitsCascader', {
            columns: columnsForMode(),
            value: valueForMode(),
            placeholder: 'Select a Campus',
            getOptions: function(level, path) {
                if (level === 'site') {
                    return Data.lineServers.map(function(site) {
                        return { id: site.id, label: site.name };
                    });
                }
                return [];
            },
            onChange: function(value) {
                State.selectedSite = value.site || null;
                State.write(State.STORAGE_KEY_SITE, State.selectedSite || '');
                State.selectedRows.clear();
                updateApproveRejectVisibility();
                if (app()) app().refresh({ loading: true });
            }
        });
        _cascaderInitialized = true;
    }

    /* ── Mode application ── */

    /** Configure the cascader for the active mode + sync dependent UI. */
    function applyMode() {
        var noSiteState = document.getElementById('noSiteState');
        var banner = document.getElementById('groundhogInfoBanner');
        var page = document.querySelector('.manage-devices-page');
        var isGroundhog = State.currentTypeFilter === 'Registered';

        if (window.ProjCascader) {
            ProjCascader.setColumns('#unitsCascader', columnsForMode());
            ProjCascader.setValue('#unitsCascader', valueForMode(), { silent: true });
        }

        // Empty-state copy: both modes scope by site only.
        if (noSiteState) {
            var title = noSiteState.querySelector('.empty-state__title');
            var subtitle = noSiteState.querySelector('.empty-state__subtitle');
            if (title) title.textContent = 'No campus selected';
            if (subtitle) subtitle.textContent = 'Select a campus above to view and manage devices';
        }

        // Registered-only info banner sits between the sub-header and the table. The page
        // class drives the sticky table-head offset (head clears the banner in Registered).
        if (banner) banner.style.display = isGroundhog ? 'flex' : 'none';
        if (page) page.classList.toggle('manage-devices-page--groundhog', isGroundhog);

        updateApproveRejectVisibility();
    }

    /**
     * Approve/Reject group.
     * DEPRECATED (Registered mode): the approve/reject workflow is occluded — the group is always
     * hidden. The underlying logic in js/actions.js (ACTION_SOURCES, applyStatus) is left
     * intact on purpose so the workflow can be re-enabled by restoring the original
     * `State.currentTypeFilter === 'Registered' && hasScope()` condition below.
     */
    function updateApproveRejectVisibility() {
        var group = document.getElementById('approveRejectGroup');
        if (!group) return;
        var visible = false; // deprecated — approve/reject occluded, logic retained
        group.style.display = visible ? '' : 'none';
    }

    /** Reveal search + revoke once a scope is chosen (any mode). */
    function updateScopeDependentControls() {
        var searchGroup = document.getElementById('searchGroup');
        var revokeBtn = document.getElementById('revokeBtn');
        var exportDataBtn = document.getElementById('exportDataBtn');
        var hasIt = hasScope();

        if (searchGroup) searchGroup.style.display = hasIt ? '' : 'none';
        if (revokeBtn) revokeBtn.style.display = hasIt ? '' : 'none';
        if (exportDataBtn) exportDataBtn.disabled = !hasIt;
    }

    /* ── Init ── */

    /** Navbar toggle ids are fixed by the plugin: 'groundhog' = Registered, 'kodiak' = Managed. */
    function toggleSource(type) { return type === 'Registered' ? 'groundhog' : 'kodiak'; }

    function restoreScope() {
        // Restore the single site (migrating the pre-cascader multi-site array if needed).
        var storedSite = State.read(State.STORAGE_KEY_SITE);
        if (storedSite) {
            State.selectedSite = storedSite;
        } else {
            var legacy = State.read(State.STORAGE_KEY_SITES_LEGACY);
            if (legacy) {
                try {
                    var arr = JSON.parse(legacy) || [];
                    State.selectedSite = arr[0] || null;
                } catch (_) {}
            }
        }

        State.write(State.STORAGE_KEY_SITE, State.selectedSite || '');
    }

    function init() {
        var searchInput = document.getElementById('searchInput');
        var sourceToggle = document.querySelector('.proj-source-toggle');

        // Restore persisted unit type (default Managed); force navbar toggle to match.
        var storedType = State.read(State.STORAGE_KEY_UNIT_TYPE);
        State.currentTypeFilter = State.VALID_UNIT_TYPES.indexOf(storedType) !== -1 ? storedType : 'Managed';
        if (sourceToggle && window.ProjSourceToggle) {
            ProjSourceToggle.setActive(sourceToggle, toggleSource(State.currentTypeFilter));
        }

        restoreScope();

        // Deep link (e.g. from Device Recovery): ?site=NORT&type=Managed&q=<asset tag>
        var deep = new URLSearchParams(window.location.search);
        var deepType = deep.get('type');
        if (State.VALID_UNIT_TYPES.indexOf(deepType) !== -1) {
            State.currentTypeFilter = deepType;
            State.write(State.STORAGE_KEY_UNIT_TYPE, deepType);
            if (sourceToggle && window.ProjSourceToggle) ProjSourceToggle.setActive(sourceToggle, toggleSource(deepType));
        }
        var deepSite = deep.get('site');
        if (State.VALID_SITES.indexOf(deepSite) !== -1) {
            State.selectedSite = deepSite;
            State.write(State.STORAGE_KEY_SITE, deepSite);
        }
        if (deep.get('q') && searchInput) searchInput.value = deep.get('q');

        ensureCascader();

        // Navbar source toggle drives the mode (carrying the single-site scope across).
        if (sourceToggle) {
            sourceToggle.addEventListener('proj-source-toggle:change', function(e) {
                State.currentTypeFilter = e.detail.source === 'groundhog' ? 'Registered' : 'Managed';
                State.write(State.STORAGE_KEY_UNIT_TYPE, State.currentTypeFilter);
                State.selectedRows.clear();
                if (window.UnitsGroupedTable) UnitsGroupedTable.resetSort();
                applyMode();
                if (app()) app().refresh({ loading: true });
            });
        }

        // Search
        if (searchInput) {
            searchInput.addEventListener('input', function() {
                if (app()) app().refresh();
            });
        }

        // Clear Filters link — clears the (mock) active header filters. Shown only while one or
        // more table-header filters are active; visibility is driven by UnitsGroupedTable.
        var clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function() {
                if (window.UnitsGroupedTable) UnitsGroupedTable.clearFilters();
            });
        }

        applyMode();
    }

    window.UnitsSubheader = {
        init: init,
        hasScope: hasScope,
        applyMode: applyMode,
        updateApproveRejectVisibility: updateApproveRejectVisibility,
        updateScopeDependentControls: updateScopeDependentControls
    };
})();
