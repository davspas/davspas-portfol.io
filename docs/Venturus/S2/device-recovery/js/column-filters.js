/**
 * Column sort and filters for the station table (window.FdrColumnFilters).
 *   Device             cascader filter (Faculty > Campus > Device) + sort
 *   recovery profile checkbox filter + sort (the type of the unit's station)
 *   Updated at       period filter + sort
 *   Status           neither (it is a set of unit counts)
 * Header click sorts (ascending, descending, off); the filter icon opens a popover with Apply and Clear.
 * Same header markup as Manage Devices (the design system sort indicator and filter icon); popover from the proj-popover-editor plugin.
 */
(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;
    var T = window.FdrTable;

    var _open = null; // { wrapper, col }

    /* ── Options ── */

    function scope() { return T.inScope(); }

    function uniq(list) { return list.filter(function(v, i) { return list.indexOf(v) === i; }); }

    function cascaderOptions(level, path) {
        var us = scope();
        if (level === 'project') return uniq(us.map(function(u) { return u.project; })).map(function(x) { return { id: x, label: x }; });
        us = us.filter(function(u) { return u.project === path.project; });
        if (level === 'site') return uniq(us.map(function(u) { return u.site; })).map(function(x) { return { id: x, label: x }; });
        return us.filter(function(u) { return u.site === path.site; }).map(function(u) { return { id: u.id, label: u.serial }; });
    }

    function types() {
        return uniq(scope().map(function(u) { return u.fdrType || 'Not set'; })).sort();
    }

    /* ── Popover bodies ── */

    function unitBody() {
        return '<div class="col-filter-popover">'
            + '<div class="col-filter-section-label">Device</div>'
            + '<div class="proj-cascader" id="fdrColUnit"></div>'
            + '<p class="col-filter-hint">Pick a Faculty, then a Campus, then Devices. Leave a level empty to include all of it.</p>'
            + '</div>';
    }

    function typeBody() {
        var f = S.colFilter.types;
        var html = '<div class="col-filter-popover"><div class="col-filter-section-header"><span class="col-filter-section-label">recovery profile</span>'
            + '<span class="col-filter-quick-actions"><a href="#" class="col-filter-select-all">Select All</a><span class="col-filter-separator">|</span><a href="#" class="col-filter-select-none">None</a></span></div>'
            + '<div class="col-filter-list">';
        types().forEach(function(tp) {
            html += '<label class="checkbox col-filter-option"><input type="checkbox" class="checkbox__input col-type-cb" value="' + T.esc(tp) + '"'
                + (!f || f.indexOf(tp) !== -1 ? ' checked' : '') + '><span class="checkbox__box"></span><span class="checkbox__label">' + T.esc(tp) + '</span></label>';
        });
        return html + '</div></div>';
    }

    function updatedBody() {
        var html = '<div class="col-filter-popover"><div class="col-filter-list">';
        [['all', 'All'], ['today', 'Today'], ['7days', 'Last 7 days'], ['30days', 'Last 30 days'], ['never', 'Never updated']].forEach(function(o) {
            html += '<label class="radio"><input type="radio" name="fdr-col-updated" class="radio__input col-updated-radio" value="' + o[0] + '"'
                + (S.colFilter.updated === o[0] ? ' checked' : '') + '><span class="radio__circle"></span><span class="radio__label">' + o[1] + '</span></label>';
        });
        return html + '</div></div>';
    }

    var FOOTER = '<div class="col-filter-footer"><button type="button" class="btn btn--ghost btn--small col-filter-clear">Clear</button>'
        + '<button type="button" class="btn btn--primary btn--small col-filter-apply">Apply</button></div>';

    /* ── Open / close ── */

    function openPopover(col, trigger) {
        closePopover();
        var P = window.ProjPopoverEditor;
        var body = col === 'unit' ? unitBody() : col === 'type' ? typeBody() : updatedBody();
        var wrapper = P.create({ bodyHTML: body, footerHTML: FOOTER });
        P.position(wrapper, trigger);
        _open = { wrapper: wrapper, col: col };

        if (col === 'unit' && window.ProjCascader) {
            var f = S.colFilter.unit;
            ProjCascader.create('#fdrColUnit', {
                columns: [
                    { level: 'project', mode: 'single', placeholder: 'All faculties' },
                    { level: 'site', mode: 'single', placeholder: 'All campuses' },
                    { level: 'unit', mode: 'multi', placeholder: 'All devices', allLabel: 'All devices', countNoun: 'Device' }
                ],
                getOptions: cascaderOptions,
                value: { project: f ? f.project : null, site: f ? f.site : null, unit: f ? (f.units || []) : [] },
                placeholder: 'All devices'
            });
        }

        wrapper.addEventListener('click', function(e) {
            if (e.target.closest('.col-filter-apply')) apply(col, wrapper);
            else if (e.target.closest('.col-filter-clear')) clear(col);
            else if (e.target.closest('.col-filter-select-all') || e.target.closest('.col-filter-select-none')) {
                e.preventDefault();
                var on = !!e.target.closest('.col-filter-select-all');
                wrapper.querySelectorAll('.col-type-cb').forEach(function(cb) { cb.checked = on; });
            }
        });
        setTimeout(function() { document.addEventListener('click', outside); }, 0);
    }

    function closePopover() {
        if (_open) {
            if (_open.col === 'unit' && window.ProjCascader) ProjCascader.destroy('#fdrColUnit');
            window.ProjPopoverEditor.destroy(_open.wrapper);
            _open = null;
        }
        document.removeEventListener('click', outside);
    }

    function outside(e) {
        if (!_open) return;
        if (_open.wrapper.contains(e.target) || e.target.closest('.proj-cascader__popup') || e.target.closest('.filter-icon')) return;
        closePopover();
    }

    /* ── Apply / clear ── */

    function apply(col, wrapper) {
        var f = S.colFilter;
        if (col === 'unit') {
            var v = window.ProjCascader ? ProjCascader.getValue('#fdrColUnit') : {};
            var us = v.unit || [];
            f.unit = (v.project || v.site || us.length) ? { project: v.project || null, site: v.site || null, units: us } : null;
        } else if (col === 'type') {
            var checked = Array.prototype.map.call(wrapper.querySelectorAll('.col-type-cb:checked'), function(cb) { return cb.value; });
            f.types = checked.length === types().length ? null : checked;
        } else {
            var r = wrapper.querySelector('.col-updated-radio:checked');
            f.updated = r ? r.value : 'all';
        }
        commit();
    }

    function clear(col) {
        var f = S.colFilter;
        if (col === 'unit') f.unit = null;
        else if (col === 'type') f.types = null;
        else f.updated = 'all';
        commit();
    }

    function commit() {
        closePopover();
        // Rooms that the filter hides lose their tick, as when the Campuses filter changes.
        var shown = T.visible().map(function(u) { return u.id; });
        Array.from(S.selected).forEach(function(id) { if (shown.indexOf(id) === -1) S.selected.delete(id); });
        var shownDeploy = T.visibleDeploy().map(function(u) { return u.id; });
        Array.from(S.deploy.selected).forEach(function(id) { if (shownDeploy.indexOf(id) === -1) S.deploy.selected.delete(id); });
        window.FdrApp.render();
    }

    /* ── Header clicks ── */

    function bind() {
        document.addEventListener('click', function(e) {
            var th = e.target.closest('#fdrHead .table__header.sortable, #fdrDeployHead .table__header.sortable');
            if (!th) return;
            var col = th.dataset.column;
            if (e.target.closest('.filter-icon')) {
                if (_open && _open.col === col) { closePopover(); return; }
                openPopover(col, e.target.closest('.filter-icon'));
                return;
            }
            closePopover();
            if (S.sort.col !== col) { S.sort.col = col; S.sort.dir = 'asc'; }
            else if (S.sort.dir === 'asc') S.sort.dir = 'desc';
            else { S.sort.col = null; S.sort.dir = 'asc'; }
            window.FdrApp.render();
        });
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closePopover(); });
    }

    window.FdrColumnFilters = { bind: bind, close: closePopover };
})();
