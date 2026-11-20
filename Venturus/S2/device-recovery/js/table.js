(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;

    var COUNTER_DEFS = [
        { key: 'attention',    label: 'Need attention (Failed)', tone: 'red',    icon: 'xmark.circle.fill' },
        { key: 'unregistered', label: 'Not registered yet',      tone: 'gray',   icon: 'circle' },
        { key: 'progress',     label: 'In progress',             tone: 'blue',   icon: 'arrow.triangle.2.circlepath' },
        { key: 'cannot',       label: 'Cannot register',         tone: 'orange', icon: 'exclamationmark.triangle.fill' },
        { key: 'registered',   label: 'Registered',              tone: 'green',  icon: 'checkmark.circle.fill' }
    ];
    var BUCKET_RANK = { attention: 0, unavailable: 1, unregistered: 2, progress: 3, cannot: 4, registered: 5 };
    /* the design system sort indicator and filter icon, as in Manage Devices headers. */
    var SORT_INDICATOR = '<span class="sort-indicator"><span class="sort-indicator__inner" aria-hidden="true">'
        + '<span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path></svg></span>'
        + '<span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path></svg></span>'
        + '</span></span>';

    // the design system filter-icon block (outline default + filled active). Placeholder per the design system — clicking it
    // toggles the header's `filter-active` class (outline → filled blue) without triggering sort.
    var FILTER_ICON = '<span class="filter-icon">'
        + '<sf-symbol class="filter-icon__default" name="line.3.horizontal.decrease.circle" style="font-size:14px"></sf-symbol>'
        + '<sf-symbol class="filter-icon__active" name="line.3.horizontal.decrease.circle.fill" style="font-size:14px"></sf-symbol>'
        + '</span>';
    var CANNOT_REASON = 'The recovery profile is not set, so the Room Booking Manager does not register this device.';

    /* Same stamp as Manage Devices "Updated at": the ISO timestamp as stored (e.g. 2025-12-01T14:23:15.000Z). */
    function fmt(iso) { return iso ? new Date(iso).toISOString() : '-'; }
    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
    function esc(t) { return String(t).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function statusChip(status) {
        var m = D.STATUS[status];
        return '<span class="fdr-status fdr-status--' + m.tone + '"><sf-symbol name="' + m.icon + '"></sf-symbol>' + m.label + '</span>';
    }

    /* One fixed slot per status so counts line up row to row (empty slots stay blank). */
    function countChips(units) {
        var c = D.unitCounts(units);
        return D.UNIT_ORDER.map(function(k) {
            var m = D.STATUS[k];
            if (!c[k]) return '<span class="fdr-count fdr-count--empty" aria-hidden="true"></span>';
            return '<span class="fdr-count fdr-count--' + m.tone + '" title="' + m.label + '"><sf-symbol name="' + m.icon + '"></sf-symbol>' + c[k] + '</span>';
        }).join('');
    }

    function tip(text, inner, mod) {
        return '<span class="fdr-tip' + (mod ? ' ' + mod : '') + '" data-tooltip="' + text + '">' + inner + '</span>';
    }

    /* ── Scope, search, filters, sort ── */

    /* Devices in the selected Campuses and Faculties (before counter, column filters and search). */
    function inScope() {
        return D.units.filter(function(u) { return S.projects.indexOf(u.project) !== -1 && S.sites.indexOf(u.site) !== -1; });
    }

    function matchesSearch(u) {
        var t = S.search.trim().toLowerCase();
        if (!t) return true;
        return (u.serial + ' ' + u.site + ' ' + u.project).toLowerCase().indexOf(t) !== -1;
    }

    function passesColumnFilters(u) {
        var f = S.colFilter;
        if (f.unit) {
            if (f.unit.project && u.project !== f.unit.project) return false;
            if (f.unit.site && u.site !== f.unit.site) return false;
            if (f.unit.units && f.unit.units.length && f.unit.units.indexOf(u.id) === -1) return false;
        }
        if (f.types && f.types.indexOf(u.fdrType || 'Not set') === -1) return false;
        if (f.updated !== 'all') {
            var t = u.updatedAt;
            if (f.updated === 'never') return !t;
            if (!t) return false;
            var age = (Date.now() - new Date(t).getTime()) / 86400000;
            if (f.updated === 'today' && age > 1) return false;
            if (f.updated === '7days' && age > 7) return false;
            if (f.updated === '30days' && age > 30) return false;
        }
        return true;
    }

    function activeColumnFilters() {
        var f = S.colFilter;
        return { unit: !!f.unit, type: !!f.types, updated: f.updated !== 'all' };
    }
    function hasColumnFilters() { var a = activeColumnFilters(); return a.unit || a.type || a.updated; }
    function clearColumnFilters() { S.colFilter = { unit: null, types: null, updated: 'all' }; }

    /* Registration tab: scope + counter + column filters + search. */
    function visible() {
        return inScope().filter(function(u) {
            if (S.counter && D.bucket(u) !== S.counter) return false;
            return passesColumnFilters(u) && matchesSearch(u);
        });
    }

    /* Roll out tab: scope + column filters + search (no counters there). */
    function visibleDeploy() {
        return inScope().filter(function(u) { return passesColumnFilters(u) && matchesSearch(u); });
    }

    function sortValue(u, col) {
        if (col === 'unit') return u.serial.toLowerCase();
        if (col === 'type') return (u.fdrType || '').toLowerCase();
        if (col === 'updated') return u.updatedAt ? new Date(u.updatedAt).getTime() : 0;
        if (col === 'version') return D.installedVersion(u) || 0;
        if (col === 'deployed') { var d = u.deploy; return d ? new Date(d.at || d.scheduledFor || 0).getTime() : 0; }
        return 0;
    }
    function compareBy(col, dir) {
        var k = dir === 'asc' ? 1 : -1;
        return function(a, b) { var x = sortValue(a, col), y = sortValue(b, col); return x < y ? -k : x > y ? k : 0; };
    }

    function headerCell(col, label, filterable) {
        var sorted = S.sort.col === col;
        var cls = 'table__header sortable' + (filterable ? ' filterable' : '') + (sorted ? ' sorted-' + S.sort.dir : '') + (activeColumnFilters()[col] ? ' filter-active' : '');
        var ind = SORT_INDICATOR;
        if (sorted) { var c = S.sort.dir === 'asc' ? 'sort-indicator__up' : 'sort-indicator__down'; ind = ind.replace(c, c + ' active'); }
        return '<th class="' + cls + '" data-sort="manual" data-column="' + col + '">' + label + (filterable ? ' ' + FILTER_ICON : '') + ' ' + ind + '</th>';
    }

    function sortUnits(list, defaultCompare) {
        if (S.sort.col) return list.slice().sort(compareBy(S.sort.col, S.sort.dir));
        return defaultCompare ? list.slice().sort(defaultCompare) : list.slice();
    }

    /* ── Grouping: Faculty (when several are selected) > Campus (switch) > Device ──
       rowHtml(u, depth) draws a unit row; totals(units) the group's totals cell;
       the label spans `labelSpan` columns and `restSpan` columns follow the totals. */
    function groupedRows(list, o) {
        var multiProject = S.projects.length > 1;
        var projects = {}, order = [];
        list.forEach(function(u) {
            if (!projects[u.project]) { projects[u.project] = { sites: {}, order: [], units: [] }; order.push(u.project); }
            var p = projects[u.project];
            if (!p.sites[u.site]) { p.sites[u.site] = []; p.order.push(u.site); }
            p.sites[u.site].push(u); p.units.push(u);
        });
        if (S.sort.col === 'unit') {
            var k = S.sort.dir === 'asc' ? 1 : -1;
            var byName = function(a, b) { return a.localeCompare(b) * k; };
            order.sort(byName);
            order.forEach(function(p) { projects[p].order.sort(byName); });
        }
        function groupRow(kind, key, label, units, indent) {
            var collapsed = S.collapsedGroups.has(key);
            return '<tr class="table__row fdr-group fdr-group--' + kind + '" data-indent="' + indent + '"><td class="table__cell" colspan="' + o.labelSpan + '"><button type="button" class="fdr-chevron" data-toggle-group="' + esc(key) + '" aria-expanded="' + !collapsed + '" aria-label="' + (collapsed ? 'Expand' : 'Collapse') + ' ' + esc(label) + '"><sf-symbol name="chevron.right"></sf-symbol></button>'
                + (kind === 'project' ? '<strong>' + esc(label) + '</strong>' : (indent ? esc(label) : '<strong>' + esc(label) + '</strong>')) + ' · ' + plural(units.length, 'device', 'devices') + '</td>'
                + '<td class="table__cell">' + o.totals(units) + '</td><td class="table__cell" colspan="' + o.restSpan + '"></td></tr>';
        }
        var html = '';
        order.forEach(function(proj) {
            var p = projects[proj];
            var pKey = 'P:' + proj;
            if (multiProject) {
                html += groupRow('project', pKey, proj, p.units, 0);
                if (S.collapsedGroups.has(pKey)) return;
            }
            if (S.groupBySite) {
                p.order.forEach(function(site) {
                    var sKey = 'S:' + proj + '|' + site;
                    html += groupRow('site', sKey, site, p.sites[site], multiProject ? 1 : 0);
                    if (!S.collapsedGroups.has(sKey)) html += p.sites[site].map(function(u) { return o.rowHtml(u); }).join('');
                });
            } else {
                html += p.units.map(function(u) { return o.rowHtml(u); }).join('');
            }
        });
        return html;
    }

    /* ── Registration tab ── */

    function isSelectable(u) { return !D.isCannotRegister(u) && !u.unavailable && !S.readonly; }

    function renderCounters() {
        var scope = inScope();
        var counts = {};
        scope.forEach(function(u) { var b = D.bucket(u); counts[b] = (counts[b] || 0) + 1; });
        var defs = COUNTER_DEFS.slice();
        if (counts.unavailable) defs.push({ key: 'unavailable', label: 'Unavailable', tone: 'orange', icon: 'exclamationmark.triangle.fill' });
        document.getElementById('fdrCounters').innerHTML = defs.map(function(d) {
            var n = counts[d.key] || 0;
            return '<button type="button" class="fdr-counter fdr-counter--' + d.tone + (S.counter === d.key ? ' fdr-counter--active' : '')
                + '" data-counter="' + d.key + '" aria-pressed="' + (S.counter === d.key) + '">'
                + '<span class="fdr-counter__head"><sf-symbol class="fdr-counter__icon" name="' + d.icon + '"></sf-symbol><span class="fdr-counter__value">' + n + '</span></span><span class="fdr-counter__label">' + d.label + '</span></button>';
        }).join('');
    }

    function factoryUrl(u) {
        var q = new URLSearchParams({ site: u.site, type: 'Managed', q: u.serial });
        return '../manage-devices/?' + q.toString();
    }

    function factoryBtn(u) {
        var label = 'See in Manage Devices';
        return tip(label, '<a class="btn btn--secondary btn--small btn--icon" href="' + esc(factoryUrl(u)) + '" target="_blank" rel="noopener" aria-label="' + label + '"><sf-symbol name="arrow.up.right.square"></sf-symbol></a>');
    }

    function sendBtn(attrs, tooltip) {
        return tip(tooltip, '<button type="button" class="btn btn--secondary btn--small btn--icon" aria-label="Send Recovery Request"' + attrs + '><sf-symbol name="arrow.triangle.2.circlepath"></sf-symbol></button>');
    }

    function actionCell(u) {
        var group = function(inner) { return '<td class="table__cell fdr-action"><div class="fdr-action__group">' + inner + '</div></td>'; };
        if (S.readonly) return group(factoryBtn(u));
        var bucket = D.bucket(u);
        var send = '<span class="fdr-action__spacer"></span>';
        if (bucket === 'cannot') send = sendBtn(' disabled', 'Send Recovery Request. Unavailable: ' + CANNOT_REASON);
        else if (bucket === 'unavailable') send = sendBtn(' disabled', 'Send Recovery Request. Unavailable: status could not be read.');
        else if (u.status === 'FAILED' || u.status === 'UNREGISTERED') send = S.sending
            ? sendBtn(' disabled', 'Send Recovery Request. A send is in progress.')
            : sendBtn(' data-send-unit="' + u.id + '"', 'Send Recovery Request');
        else if (bucket === 'progress') send = sendBtn(' disabled', 'Send Recovery Request. In progress: already queued, nothing to send.');
        return group(factoryBtn(u) + send);
    }

    function unitRow(u) {
        var bucket = D.bucket(u);
        var sel = S.selected.has(u.id);
        var cb = S.readonly ? '' : '<label class="checkbox"><input type="checkbox" class="checkbox__input fdr-row-check" data-unit="' + u.id + '"'
            + (sel ? ' checked' : '') + (isSelectable(u) ? '' : ' disabled') + ' aria-label="Select ' + esc(u.serial) + '"><span class="checkbox__box"></span></label>';
        var typeTag = '<span class="tag tag--tiny ' + (bucket === 'cannot' ? 'tag--warning' : 'tag--gray') + '">' + esc(u.fdrType || 'Not set') + '</span>';
        var status;
        if (u.unavailable) status = statusChip('UNAVAILABLE') + '<div class="fdr-sub">Status unavailable for this device. <button type="button" class="fdr-linkbtn" data-retry="' + u.id + '">Retry</button></div>';
        else if (bucket === 'cannot') status = tip(CANNOT_REASON + ' Set it in Manage Devices.', '<span class="fdr-status fdr-status--orange fdr-cannot" tabindex="0"><sf-symbol name="exclamationmark.triangle.fill"></sf-symbol>Cannot register</span>', 'fdr-tip--start');
        else status = statusChip(u.status);
        var sub = S.groupBySite ? '' : '<div class="fdr-sub">' + esc(u.project) + ' · ' + esc(u.site) + '</div>';
        return '<tr class="table__row fdr-unit' + (sel ? ' fdr-unit--selected' : '') + (S.focus.unit === u.serial ? ' fdr-unit--focus' : '') + '" id="unit-' + u.serial + '">'
            + '<td class="table__cell">' + cb + '</td>'
            + '<td class="table__cell"><span class="fdr-name__text">' + esc(u.serial) + '</span>' + sub + '</td>'
            + '<td class="table__cell">' + typeTag + '</td>'
            + '<td class="table__cell">' + status + '</td>'
            + '<td class="table__cell">' + fmt(u.updatedAt) + '</td>'
            + actionCell(u) + '</tr>';
    }

    function renderTable(list) {
        var allSel = list.filter(isSelectable);
        var allChecked = allSel.length && allSel.every(function(u) { return S.selected.has(u.id); });
        document.getElementById('fdrHead').innerHTML = '<tr class="table__row"><th class="table__header fdr-col-check">'
            + (S.readonly ? '' : '<label class="checkbox"><input type="checkbox" class="checkbox__input" id="fdrSelectAll" aria-label="Select all devices"' + (allChecked ? ' checked' : '') + '><span class="checkbox__box"></span></label>')
            + '</th>' + headerCell('unit', 'Device', true) + headerCell('type', 'Recovery profile', true) + '<th class="table__header">Status</th>' + headerCell('updated', 'Updated at', true)
            + '<th class="table__header fdr-col-action"></th></tr>';
        var sorted = sortUnits(list, function(a, b) { return BUCKET_RANK[D.bucket(a)] - BUCKET_RANK[D.bucket(b)]; });
        document.getElementById('fdrTable').classList.toggle('fdr-grouped', S.groupBySite || S.projects.length > 1);
        document.getElementById('fdrBody').innerHTML = groupedRows(sorted, {
            labelSpan: 3, restSpan: 2, rowHtml: unitRow,
            totals: function(units) { return '<span class="fdr-counts">' + countChips(units) + '</span>'; }
        });
    }

    function bind() {
        document.addEventListener('click', function(e) {
            var t = e.target.closest('[data-counter],[data-toggle-group],[data-send-unit],[data-retry]');
            if (!t) return;
            if (t.dataset.counter) {
                S.counter = S.counter === t.dataset.counter ? null : t.dataset.counter;
                window.FdrApp.render();
            } else if (t.dataset.toggleGroup) {
                var g = t.dataset.toggleGroup;
                if (S.collapsedGroups.has(g)) S.collapsedGroups.delete(g); else S.collapsedGroups.add(g);
                window.FdrApp.render();
            } else if (t.dataset.sendUnit) {
                window.FdrActions.openConfirm([t.dataset.sendUnit], t);
            } else if (t.dataset.retry) {
                var u = D.units.filter(function(x) { return x.id === t.dataset.retry; })[0];
                t.disabled = true; t.textContent = 'Retrying…';
                setTimeout(function() { u.unavailable = false; S.demo = ''; window.FdrApp.render(); }, 900);
            }
        });
        document.addEventListener('change', function(e) {
            var t = e.target;
            if (t.id === 'fdrSelectAll') {
                visible().filter(isSelectable).forEach(function(u) { if (t.checked) S.selected.add(u.id); else S.selected.delete(u.id); });
                window.FdrApp.render();
            } else if (t.classList.contains('fdr-row-check')) {
                if (t.checked) S.selected.add(t.dataset.unit); else S.selected.delete(t.dataset.unit);
                window.FdrApp.render();
            }
        });
    }

    window.FdrTable = {
        bind: bind,
        render: function(list) { renderCounters(); renderTable(list); },
        visible: visible,
        visibleDeploy: visibleDeploy,
        inScope: inScope,
        groupedRows: groupedRows,
        headerCell: headerCell,
        sortUnits: sortUnits,
        hasColumnFilters: hasColumnFilters,
        clearColumnFilters: clearColumnFilters,
        activeColumnFilters: activeColumnFilters,
        passesColumnFilters: passesColumnFilters,
        esc: esc, fmt: fmt, plural: plural, tip: tip, factoryBtn: factoryBtn
    };
})();
