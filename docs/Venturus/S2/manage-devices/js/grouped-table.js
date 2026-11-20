/**
 * Manage Devices — Table view (window.UnitsGroupedTable)
 *
 * Renders the unit table for the active mode (only ONE site is selected, so there is no
 * site-level grouping):
 *   - Managed:    flat list of Device rows. Rows = Managed-type units only.
 *   - Registered: flat list of Device rows. Rows = Registered units for the selected site.
 * Both modes share the same 10 columns (no Type column) and a flat layout.
 *
 * Scope comes from the subheader: UnitsState.selectedSite. No pagination — all matching rows render.
 */
(function() {
    'use strict';

    var State = window.UnitsState;
    var Data = window.UnitsData;

    var _onAfterRender = null;    // retained so self-triggered re-renders re-bind handlers
    var _sortColumn = null;       // active sort column key
    var _sortDirection = 'asc';

    // MDS sort-indicator block (caret-up / caret-down) — used in every sortable header.
    var SORT_INDICATOR = '<span class="sort-indicator"><span class="sort-indicator__inner" aria-hidden="true">'
        + '<span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path></svg></span>'
        + '<span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path></svg></span>'
        + '</span></span>';

    // MDS filter-icon block (outline default + filled active). Placeholder per MDS — clicking it
    // toggles the header's `filter-active` class (outline → filled blue) without triggering sort.
    var FILTER_ICON = '<span class="filter-icon">'
        + '<sf-symbol class="filter-icon__default" name="line.3.horizontal.decrease.circle" style="font-size:14px"></sf-symbol>'
        + '<sf-symbol class="filter-icon__active" name="line.3.horizontal.decrease.circle.fill" style="font-size:14px"></sf-symbol>'
        + '</span>';

    /* ── Shared cell/header helpers ── */

    function selectAllHeader() {
        return '<th class="table__header" style="width: 40px;">'
            + '<label class="checkbox"><input type="checkbox" class="checkbox__input" id="selectAll">'
            + '<span class="checkbox__box"></span></label></th>';
    }

    // Building Controller-complemented columns — populated from the building controller (Building Controller), so they can be
    // empty for an Asset Registry-registered unit no building controller has reported yet. Their headers carry a
    // help icon explaining this.
    var GHLS_COLUMNS = { project: 1, lineName: 1, station: 1, stationIP: 1, lastHeardFrom: 1 };
    var GHLS_HELP_TEXT = 'Information provided by the Building Controller. Empty until the device is registered with a controller.';

    // No MDS/plugin tooltip component exists, so a lightweight CSS hover tooltip is used
    // (`data-tooltip` + `.mu-help-icon::after`) — reliable/instant, unlike the native `title`.
    function helpIcon() {
        return '<span class="mu-help-icon" tabindex="0" role="img" aria-label="' + GHLS_HELP_TEXT + '"'
            + ' data-tooltip="' + GHLS_HELP_TEXT + '"><sf-symbol name="questionmark.circle"></sf-symbol></span>';
    }

    /** Sortable + filterable header (MDS sort-indicator; data-sort="manual" so MDS keeps CSS, skips
     * auto-sort). Filter-icon comes before the sorter per MDS. Building Controller-complemented columns also get a
     * help icon after the label. */
    function sortableHeader(column, label) {
        // Help icon only in Registered — those columns are the Building Controller complement there; in Managed
        // the same columns come from Room Booking Manager, so the "empty until a building controller reports" hint doesn't apply.
        var showHelp = GHLS_COLUMNS[column] && State.currentTypeFilter === 'Registered';
        var help = showHelp ? helpIcon() : '';
        return '<th class="table__header sortable filterable' + (_colFilters[column] ? ' filter-active' : '') + '" data-sort="manual" data-column="' + column + '">'
            + label + help + ' ' + FILTER_ICON + ' ' + SORT_INDICATOR + '</th>';
    }

    function rowCheckboxCell(unit) {
        return '<td class="table__cell"><label class="checkbox">'
            + '<input type="checkbox" class="checkbox__input row-checkbox" data-serial="' + unit.serialNumber + '"'
            + (State.selectedRows.has(unit.serialNumber) ? ' checked' : '') + '>'
            + '<span class="checkbox__box"></span></label></td>';
    }

    function statusCell(unit) {
        return '<td class="table__cell"><span class="tag tag--tiny tag--' + Data.getStatusTagVariant(unit.status) + '">'
            + unit.status + '</span></td>';
    }

    // A Registered unit whose Building Controller building controller is unreachable: it is Asset Registry-registered and
    // assigned to a building controller (`lineServer` set), but that server can't be read, so none of
    // the five Building Controller-complemented columns have a value. Devices with no assigned building controller
    // (`lineServer` empty) just show empty cells — this only applies in Registered.
    function isComplementUnreadable(unit) {
        return unit.type === 'Registered' && !!unit.lineServer
            && !unit.project && !unit.lineName && !unit.station && !unit.stationIP && !unit.lastHeardFrom;
    }

    // Single error cell spanning the five sequential Building Controller columns
    // (Faculty → Floor → Room → Device IP → Last Seen).
    function complementErrorCell(unit) {
        var server = Data.getLineServerName(unit.lineServer) || 'the Building Controller';
        return '<td class="table__cell mu-complement-error" colspan="5">'
            + '<span class="mu-complement-error__msg">'
            + '<sf-symbol name="exclamationmark.circle"></sf-symbol>'
            + ' Information cannot be read from Building Controller ' + server
            + '</span></td>';
    }

    /* ── Filtering ── */

    var _colFilters = {};         // column -> Set of allowed display values (absent = no filter)
    var _filterScope = null;      // "type|campus" the column filters belong to
    var BLANK = '(blank)';

    /** Display/filter value of a unit for a column (dates collapse to their day). */
    function cellValue(unit, column) {
        var v = unit[column];
        if (v === undefined || v === null || v === '') return BLANK;
        if (column === 'updatedAt' || column === 'lastHeardFrom') return String(v).slice(0, 10);
        return String(v);
    }

    function matchesSearch(unit, term) {
        if (!term) return true;
        return Object.keys(unit).some(function(k) {
            return unit[k] && unit[k].toString().toLowerCase().indexOf(term) !== -1;
        });
    }

    function passesColumnFilters(unit) {
        return Object.keys(_colFilters).every(function(col) {
            return _colFilters[col].has(cellValue(unit, col));
        });
    }

    /** Units of one type within the selected campus + search, BEFORE column filters. */
    function scoped(type, searchTerm) {
        var term = (searchTerm || '').toLowerCase().trim();
        var scope = type + '|' + (State.selectedSite || '');
        if (_filterScope !== scope) { _colFilters = {}; _filterScope = scope; }
        return Data.units.filter(function(unit) {
            if (unit.type !== type) return false;
            if (State.selectedSite && unit.site !== State.selectedSite) return false;
            return matchesSearch(unit, term);
        });
    }

    /** IT-managed rows: Managed-type devices, campus + search + column filters. */
    function filterKodiak(searchTerm) {
        return scoped('Managed', searchTerm).filter(passesColumnFilters);
    }

    /** Faculty-registered rows: Registered-type devices, campus + search + column filters. */
    function filterGroundhog(searchTerm) {
        return scoped('Registered', searchTerm).filter(passesColumnFilters);
    }

    function currentSearchTerm() {
        var input = document.getElementById('searchInput');
        return input ? input.value : '';
    }

    /** Re-run the active mode's filter and re-render (used by header filters). */
    function recompute() {
        var term = currentSearchTerm();
        State.currentData = State.currentTypeFilter === 'Registered' ? filterGroundhog(term) : filterKodiak(term);
        render();
    }

    /** Distinct values for a column among the devices that match everything EXCEPT its own filter. */
    function columnValues(column) {
        var term = currentSearchTerm();
        var type = State.currentTypeFilter === 'Registered' ? 'Registered' : 'Managed';
        var base = scoped(type, term).filter(function(unit) {
            return Object.keys(_colFilters).every(function(col) {
                return col === column || _colFilters[col].has(cellValue(unit, col));
            });
        });
        var seen = {};
        base.forEach(function(u) { seen[cellValue(u, column)] = (seen[cellValue(u, column)] || 0) + 1; });
        // The selected values must stay listed even if they no longer match anything.
        if (_colFilters[column]) _colFilters[column].forEach(function(v) { if (!(v in seen)) seen[v] = 0; });
        return Object.keys(seen).sort(function(a, b) {
            if (a === BLANK) return 1; if (b === BLANK) return -1;
            return a.localeCompare(b, undefined, { numeric: true });
        }).map(function(v) { return { value: v, count: seen[v] }; });
    }

    /** Sort a unit array in place by the active sort column. */
    function sortUnits(units) {
        if (!_sortColumn) return units;
        var col = _sortColumn;
        var dir = _sortDirection === 'asc' ? 1 : -1;
        return units.sort(function(a, b) {
            var aVal = a[col] || '';
            var bVal = b[col] || '';
            if (col === 'updatedAt' || col === 'lastHeardFrom') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else {
                var aNum = parseFloat(aVal);
                var bNum = parseFloat(bVal);
                if (!isNaN(aNum) && !isNaN(bNum)) { aVal = aNum; bVal = bNum; }
                else { aVal = aVal.toString().toLowerCase(); bVal = bVal.toString().toLowerCase(); }
            }
            if (aVal < bVal) return -1 * dir;
            if (aVal > bVal) return 1 * dir;
            return 0;
        });
    }

    /* ── Header rows ── */

    function buildHead() {
        var cols = selectAllHeader()
            + sortableHeader('serialNumber', 'Asset Tag')
            + sortableHeader('status', 'Status')
            + sortableHeader('project', 'Faculty')
            + sortableHeader('lineName', 'Floor')
            + sortableHeader('station', 'Room')
            + sortableHeader('stationIP', 'Device IP')
            + sortableHeader('lastHeardFrom', 'Last Seen')
            + sortableHeader('updatedBy', 'Updated by')
            + sortableHeader('updatedAt', 'Updated at');
        return '<tr class="table__row">' + cols + '</tr>';
    }

    /* ── Device rows ── */

    function unitRow(unit) {
        // Unreadable Building Controller complement → collapse the five sequential columns into one
        // error cell naming the unreachable building controller.
        var middleCells = isComplementUnreadable(unit)
            ? complementErrorCell(unit)
            : '<td class="table__cell">' + (unit.project || '-') + '</td>'
                + '<td class="table__cell">' + (unit.lineName || '-') + '</td>'
                + '<td class="table__cell">' + (unit.station || '-') + '</td>'
                + '<td class="table__cell">' + (unit.stationIP || '-') + '</td>'
                + '<td class="table__cell">' + (unit.lastHeardFrom || '-') + '</td>';
        return '<tr class="table__row table__row--unit">'
            + rowCheckboxCell(unit)
            + '<td class="table__cell">' + unit.serialNumber + '</td>'
            + statusCell(unit)
            + middleCells
            + '<td class="table__cell">' + (unit.updatedBy || '-') + '</td>'
            + '<td class="table__cell">' + (unit.updatedAt || '-') + '</td>'
            + '</tr>';
    }

    /* ── Render ── */

    /**
     * Render the flat table for the active mode.
     * @param {Function} onAfterRender - re-attach row/select-all handlers post-render.
     */
    function render(onAfterRender) {
        if (typeof onAfterRender === 'function') _onAfterRender = onAfterRender;

        var table = document.getElementById('unitsTable');
        var emptyFilterState = document.getElementById('emptyFilterState');
        if (!table) return;

        table.querySelector('.table__head').innerHTML = buildHead();

        var units = State.currentData;
        var tableBody = table.querySelector('#tableBody');

        if (!units.length) {
            tableBody.innerHTML = '';
            if (emptyFilterState) emptyFilterState.style.display = 'flex';
            attachSort(table);      // keep header filters usable so the user can undo a filter
            syncClearFiltersBtn();
            return;
        }
        if (emptyFilterState) emptyFilterState.style.display = 'none';

        tableBody.innerHTML = renderFlat(units);

        attachSort(table);
        applySortIndicators(table);
        syncClearFiltersBtn();
        if (typeof _onAfterRender === 'function') _onAfterRender();
    }

    /** Both modes: flat list of unit rows (single site selected → no grouping). */
    function renderFlat(units) {
        return sortUnits(units).map(unitRow).join('');
    }

    /* ── Header filters ── */

    var _filterPop = null;        // open column-filter popover element
    var _filterPopColumn = null;

    function anyColumnFilter() { return Object.keys(_colFilters).length > 0; }

    /** Show/hide the subheader "Results are filtered … Clear Filters" group. */
    function syncClearFiltersBtn() {
        var status = document.getElementById('filterStatus');
        if (!status) return;
        status.style.display = anyColumnFilter() ? 'flex' : 'none';
    }

    /** Clear every column filter, close the popover and re-render. */
    function clearFilters() {
        _colFilters = {};
        closeFilterPopover();
        if (State.currentData) recompute(); else syncClearFiltersBtn();
    }

    function closeFilterPopover() {
        if (_filterPop && _filterPop.parentNode) _filterPop.parentNode.removeChild(_filterPop);
        _filterPop = null; _filterPopColumn = null;
        document.removeEventListener('mousedown', onDocDown, true);
        document.removeEventListener('keydown', onDocKey, true);
    }
    function onDocDown(e) {
        if (_filterPop && !_filterPop.contains(e.target) && !e.target.closest('.filter-icon')) closeFilterPopover();
    }
    function onDocKey(e) { if (e.key === 'Escape') closeFilterPopover(); }

    function escapeHtml(t) {
        return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /** Open (or toggle) the value checklist for one column header. */
    function openFilterPopover(header) {
        var column = header.dataset.column;
        if (_filterPop && _filterPopColumn === column) { closeFilterPopover(); return; }
        closeFilterPopover();

        var options = columnValues(column);
        var pop = document.createElement('div');
        pop.className = 'mu-col-filter';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-label', 'Filter ' + (header.textContent || '').trim());
        var selected = _colFilters[column];
        pop.innerHTML =
            '<div class="mu-col-filter__actions">'
            + '<button type="button" class="btn btn--link" data-act="all">Select all</button>'
            + '<button type="button" class="btn btn--link" data-act="none">Clear</button></div>'
            + '<div class="mu-col-filter__list">'
            + options.map(function(o) {
                var checked = !selected || selected.has(o.value);
                return '<label class="checkbox mu-col-filter__item">'
                    + '<input type="checkbox" class="checkbox__input" value="' + escapeHtml(o.value) + '"' + (checked ? ' checked' : '') + '>'
                    + '<span class="checkbox__box"></span>'
                    + '<span class="checkbox__label">' + escapeHtml(o.value) + ' <span class="mu-col-filter__count">' + o.count + '</span></span></label>';
            }).join('')
            + '</div>';
        document.body.appendChild(pop);

        var r = header.getBoundingClientRect();
        var width = pop.offsetWidth;
        pop.style.top = Math.min(r.bottom + 4, window.innerHeight - pop.offsetHeight - 8) + 'px';
        pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8)) + 'px';

        function apply() {
            var boxes = pop.querySelectorAll('input[type=checkbox]');
            var chosen = new Set();
            boxes.forEach(function(b) { if (b.checked) chosen.add(b.value); });
            if (chosen.size === boxes.length) delete _colFilters[column];      // everything allowed = no filter
            else _colFilters[column] = chosen;                                 // may be empty → no rows match
            recompute();
        }
        pop.addEventListener('change', function(e) { if (e.target.matches('input[type=checkbox]')) { apply(); reopen(); } });
        pop.addEventListener('click', function(e) {
            var act = e.target.closest('[data-act]');
            if (!act) return;
            pop.querySelectorAll('input[type=checkbox]').forEach(function(b) { b.checked = act.dataset.act === 'all'; });
            apply(); reopen();
        });
        // render() rebuilds <thead>; keep the popover open on the fresh header with scroll position kept.
        function reopen() {
            var list = pop.querySelector('.mu-col-filter__list');
            var top = list ? list.scrollTop : 0;
            var h = document.querySelector('#unitsTable .table__header[data-column="' + column + '"]');
            closeFilterPopover();
            if (h) { openFilterPopover(h); var l = _filterPop && _filterPop.querySelector('.mu-col-filter__list'); if (l) l.scrollTop = top; }
        }

        _filterPop = pop; _filterPopColumn = column;
        document.addEventListener('mousedown', onDocDown, true);
        document.addEventListener('keydown', onDocKey, true);
    }

    /** Wire click-to-sort on sortable headers; the filter icon opens that column's filter instead. */
    function attachSort(table) {
        table.querySelectorAll('.table__header.sortable').forEach(function(header) {
            header.addEventListener('click', function(e) {
                if (e.target.closest('.filter-icon')) {
                    e.stopPropagation();
                    openFilterPopover(this);
                    return;
                }
                if (e.target.closest('.mu-help-icon')) return;  // help icon: hint only, no sort
                var column = this.dataset.column;
                if (_sortColumn === column) {
                    _sortDirection = _sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    _sortColumn = column;
                    _sortDirection = 'asc';
                }
                closeFilterPopover();
                render();
            });
        });
    }

    /** Drive MDS sort-indicator state (header sorted-asc/desc + active caret). */
    function applySortIndicators(table) {
        table.querySelectorAll('.table__header.sortable').forEach(function(h) {
            h.classList.remove('sorted-asc', 'sorted-desc');
            var up = h.querySelector('.sort-indicator__up');
            var down = h.querySelector('.sort-indicator__down');
            if (up) up.classList.remove('active');
            if (down) down.classList.remove('active');
            if (h.dataset.column === _sortColumn) {
                h.classList.add(_sortDirection === 'asc' ? 'sorted-asc' : 'sorted-desc');
                var active = _sortDirection === 'asc' ? up : down;
                if (active) active.classList.add('active');
            }
        });
    }

    /** Reset sort (called when switching modes, since contents differ). */
    function resetSort() {
        _sortColumn = null;
        _sortDirection = 'asc';
        _colFilters = {};
        closeFilterPopover();
    }

    window.UnitsGroupedTable = {
        render: render,
        filterKodiak: filterKodiak,
        filterGroundhog: filterGroundhog,
        resetSort: resetSort,
        clearFilters: clearFilters
    };
})();
