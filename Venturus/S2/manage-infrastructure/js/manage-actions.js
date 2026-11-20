/**
 * Manage Actions Module
 * Context-aware manage dropdown + action drawers for server management.
 */
(function() {
    'use strict';

    var _node = null;    // Currently selected server nodeData
    var _action = null;  // Current action key
    var _idCounter = 5000;

    // ── Helpers (duplicated from new-node-drawer.js, private to this IIFE) ──

    function _genId(prefix) { _idCounter++; return prefix + '-' + _idCounter + '-' + Date.now(); }
    function _val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }

    function _ensureDataEntry(ds, site, project, level) {
        if (!ds[site]) ds[site] = {};
        if (!ds[site][project]) {
            var pk = project.toLowerCase().replace(/\s+/g, '-');
            if (level === 'Timetable Relay') {
                ds[site][project] = { id: 'site-' + site.toLowerCase() + '-' + pk + '-cdn', name: site, site: site, type: 'Campus', level: 'Campus', children: [] };
            } else {
                ds[site][project] = { id: 'site-' + site.toLowerCase() + '-' + pk, name: site, site: site, type: 'Campus', level: 'Campus', children: [{ id: 'project-' + pk + '-' + site.toLowerCase(), name: project, site: site, project: project, type: 'Faculty', level: 'Faculty', children: [] }] };
            }
        }
    }

    function _projectHasLS(site, project, ghdsHostname) {
        if (!ghdsHostname || typeof lineServersDataSets === 'undefined' || !lineServersDataSets[site]) return false;
        var e = lineServersDataSets[site][project];
        if (!e || !e.children || !e.children[0] || !e.children[0].children) return false;
        var servers = e.children[0].children;
        for (var i = 0; i < servers.length; i++) {
            if (servers[i].ghdsAssociation && ghdsHostnameFromAssociation(servers[i].ghdsAssociation) === ghdsHostname) return true;
        }
        return false;
    }

    function _findGHDSByName(site, name) {
        if (typeof ghdsServersData === 'undefined') return null;
        var sites = [site];
        if (site !== 'NORT') sites.push('NORT');
        for (var si = 0; si < sites.length; si++) {
            var s = sites[si];
            if (!ghdsServersData[s]) continue;
            for (var k in ghdsServersData[s]) { var e = ghdsServersData[s][k]; if (e && e.children) { for (var i = 0; i < e.children.length; i++) { var p = e.children[i]; if (p.children) { for (var j = 0; j < p.children.length; j++) { if (p.children[j].name === name) return p.children[j]; } } } } }
        }
        return null;
    }

    // ── Info box builder ──

    function _infoBox(title, pairs, collapsible) {
        var html = '<div class="manage-action__info' + (collapsible ? '' : '') + '">';
        html += '<div class="manage-action__info-title"' + (collapsible ? ' onclick="this.closest(\'.manage-action__info\').classList.toggle(\'manage-action__info--collapsed\')"' : '') + '>';
        if (collapsible) html += '<span class="collapse-arrow"><sf-symbol name="chevron.down" style="font-size:10px"></sf-symbol></span>';
        html += title + '</div>';
        html += '<div class="manage-action__info-body">';
        pairs.forEach(function(p) { html += '<div class="manage-action__info-label">' + p[0] + '</div><div class="manage-action__info-value">' + (p[1] || '-') + '</div>'; });
        html += '</div></div>';
        return html;
    }

    // ── Drawer lifecycle ──

    function _closeManagePopover() {
        var pop = document.getElementById('managePopover');
        if (pop) {
            pop.classList.remove('popover--open');
            pop.style.display = 'none';
            // Re-enable for next toggle
            setTimeout(function() { pop.style.display = ''; }, 100);
        }
    }

    function _openDrawer(action, title, confirmLabel, confirmDanger, cancelLabel) {
        _action = action;
        var drawer = document.getElementById('manageActionDrawer');
        var titleEl = document.getElementById('manageActionDrawerTitle');
        var confirmBtn = document.getElementById('manageActionConfirm');
        var cancelBtn = document.getElementById('manageActionCancel');
        if (titleEl) titleEl.textContent = title;
        if (confirmBtn) {
            confirmBtn.textContent = confirmLabel;
            confirmBtn.className = 'btn btn--medium ' + (confirmDanger ? 'btn--danger' : 'btn--primary');
        }
        if (cancelBtn) cancelBtn.textContent = cancelLabel || 'Cancel';
        _closeManagePopover();
        if (drawer) drawer.classList.add('drawer-overlay--open');
    }

    function _closeDrawer() {
        var drawer = document.getElementById('manageActionDrawer');
        if (drawer) drawer.classList.remove('drawer-overlay--open');
        var content = document.getElementById('manageActionDrawerContent');
        if (content) content.innerHTML = '';
        _closeRemoveAllArchiveConfirm();
        _action = null;
    }

    function _refreshAndSelect(nodeId) {
        if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
        if (nodeId) setTimeout(function() { if (typeof selectNode === 'function') selectNode(nodeId); }, 150);
    }

    // ── Menu building ──

    /**
     * Whether a server can be archived, and why not when it can't.
     * - The master Campus Hub (hub.atrium.test) is never archivable — every site's
     *   Proxy URLs and the NORT cross-site visibility hang off it.
     * - A Building Controller on a Relay, or a Relay serving Building Controllers, is blocked from
     *   EITHER side: the association has to be removed first (Relay -> LS and
     *   LS -> Relay both block).
     * - A Campus Hub still serving building controllers or Relay servers must keep serving
     *   them. Archived ones don't count (activeOnly). Campus Hub reuses `_ghdsAssociatedLineServers`, the same helper behind
     *   the panel's ASSOCIATED LINE SERVERS list, so the gate can never
     *   disagree with what the user is looking at.
     */
    function _archiveBlockReason(node) {
        if (node.level === 'Campus Hub' && String(node.name || '').toLowerCase() === MASTER_GHDS_HOSTNAME) {
            return MASTER_GHDS_HOSTNAME + ' is the master Campus Hub and can\'t be archived.';
        }
        if (node.level === 'Building Controller') {
            var cdn = (typeof findAssociatedCDNServers === 'function')
                ? findAssociatedCDNServers(node.name).filter(function(c) { return !c.archived; })[0]
                : null;
            return cdn ? 'Remove the Timetable Relay association (' + cdn.name + ') before archiving.' : null;
        }
        if (node.level === 'Campus Hub') {
            var lsCount = (typeof _ghdsAssociatedLineServers === 'function') ? _ghdsAssociatedLineServers(node, true).length : 0;
            var cdnCount = findCDNServersForGHDS(node.name).filter(function(c) { return !c.archived; }).length;
            return (lsCount + cdnCount > 0) ? 'Remove all associated Building Controllers and Timetable Relays before archiving.' : null;
        }
        var count = 0;
        if (node.level === 'Timetable Relay') {
            count = (node.associatedLineServers || []).length;
        }
        if (!count) return null;
        return 'Remove ' + (count === 1 ? 'the associated Building Controller' : 'all ' + count + ' associated Building Controllers') + ' before archiving.';
    }

    /**
     * Why an active Building Controller / Campus Hub can't be moved to another site, or null
     * when it can (FR-P2-23). The target must be another site selected in the
     * header — the drawer only offers sites visible in the tree. A queued CB
     * deploy blocks the move the same way it blocks archiving (FR-DS-07), and a
     * Campus Hub still serving building controllers or Relays would strand them on its old site.
     */
    function _moveBlockReason(node) {
        if (node.level === 'Building Controller' && node.cbDeployScheduled) {
            return 'Cancel the scheduled Timetable Release before moving.';
        }
        if (node.level === 'Campus Hub') {
            var lsCount = (typeof _ghdsAssociatedLineServers === 'function') ? _ghdsAssociatedLineServers(node).length : 0;
            var cdnCount = findCDNServersForGHDS(node.name).filter(function(c) { return !c.archived; }).length;
            if (lsCount + cdnCount > 0) return 'Remove all associated Building Controllers and Timetable Relays before moving.';
        }
        var targets = (typeof selectedSites !== 'undefined' ? selectedSites : []).filter(function(s) { return s !== node.site; });
        if (!targets.length) return 'Select another campus in the Campus filter to move this node.';
        return null;
    }

    /** The mirror of the above, from the Relay side. */
    function _manageCDNLSBlockReason(node) {
        var ghdsHostname = ghdsHostnameFromAssociation(node.ghdsAssociation);
        if (!ghdsHostname) return 'Assign a Campus Hub to this Relay node first.';
        // Building controllers on another Relay still open the drawer — listed disabled.
        if (getLineServersForCDN(node, { includeOtherCDN: true }).length) return null;
        return 'There are no Building Controllers on ' + ghdsHostname + '.';
    }

    /**
     * The same gate from the Campus Hub side. A Campus Hub serves the building controllers on its own
     * site (an NORT Campus Hub serves every site's — see `getLineServersForGHDS`), so
     * the list is only empty when that pool holds no active building controller at all.
     */
    function _manageGHDSLSBlockReason(node) {
        if (getLineServersForGHDS(node).length) return null;
        return node.site === 'NORT'
            ? 'There are no Building Controllers to associate.'
            : 'There are no Building Controllers on ' + node.site + '.';
    }

    function _buildMenu(node) {
        var items = [];

        if (node.level === 'Campus') {
            items.push({ type: 'label', text: 'Create' });
            items.push({ type: 'item', text: 'Building Controller', action: 'create-ls-site' });
            items.push({ type: 'item', text: 'Timetable Relay', action: 'create-cdn-site' });
            items.push({ type: 'item', text: 'Campus Hub', action: 'create-ghds-site' });
        } else if (node.level === 'Building Controller' && !node.archived) {
            // Active Building Controller
            items.push({ type: 'label', text: 'Manage' });
            items.push({ type: 'item', text: 'Faculties', action: 'manage-projects' });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Move' });
            items.push({ type: 'item', text: 'To available Campus', action: 'move-server', disabledReason: _moveBlockReason(node) });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Archive' });
            items.push({ type: 'item', text: 'Building Controller', action: 'archive-server', danger: true, disabledReason: _archiveBlockReason(node) });
        } else if (node.level === 'Building Controller' && node.archived) {
            items.push({ type: 'label', text: 'Unarchive' });
            items.push({ type: 'item', text: 'Building Controller', action: 'unarchive-server' });
        } else if (node.level === 'Campus Hub' && node.archived) {
            items.push({ type: 'label', text: 'Unarchive' });
            items.push({ type: 'item', text: 'Campus Hub', action: 'unarchive-server' });
        } else if (node.level === 'Timetable Relay' && node.archived) {
            items.push({ type: 'label', text: 'Unarchive' });
            items.push({ type: 'item', text: 'Timetable Relay', action: 'unarchive-server' });
        } else if (node.level === 'Campus Hub') {
            items.push({ type: 'label', text: 'Create' });
            items.push({ type: 'item', text: 'Building Controller', action: 'create-ls-ghds' });
            items.push({ type: 'item', text: 'Timetable Relay', action: 'create-cdn-ghds' });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Manage' });
            items.push({ type: 'item', text: 'Building Controllers', action: 'manage-ghds-ls', disabledReason: _manageGHDSLSBlockReason(node) });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Move' });
            items.push({ type: 'item', text: 'To available Campus', action: 'move-server', disabledReason: _moveBlockReason(node) });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Archive' });
            items.push({ type: 'item', text: 'Campus Hub', action: 'archive-server', danger: true, disabledReason: _archiveBlockReason(node) });
        } else if (node.level === 'Timetable Relay') {
            items.push({ type: 'label', text: 'Create' });
            items.push({ type: 'item', text: 'Building Controller', action: 'create-ls-cdn' });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Manage' });
            items.push({ type: 'item', text: 'Building Controllers', action: 'manage-cdn-ls', disabledReason: _manageCDNLSBlockReason(node) });
            items.push({ type: 'divider' });
            items.push({ type: 'label', text: 'Archive' });
            items.push({ type: 'item', text: 'Timetable Relay', action: 'archive-server', danger: true, disabledReason: _archiveBlockReason(node) });
        }

        _renderMenu(items);
    }

    function _renderMenu(items) {
        var menu = document.getElementById('manageMenu');
        if (!menu) return;
        menu.innerHTML = '';

        items.forEach(function(item) {
            var li = document.createElement('li');
            if (item.type === 'label') {
                li.className = 'popover__menu-label';
                li.textContent = item.text;
            } else if (item.type === 'divider') {
                li.className = 'popover__menu-divider';
            } else if (item.disabledReason) {
                // Blocked action: still listed so the action is discoverable, but
                // inert and carrying its reason as a tooltip.
                li.className = 'popover__menu-item popover__menu-item--disabled';
                li.title = item.disabledReason;
                li.innerHTML = '<span>' + item.text + '</span>';
            } else {
                li.className = 'popover__menu-item';
                if (item.danger) li.style.color = 'var(--color-fill-red)';
                li.innerHTML = '<span>' + item.text + '</span>';
                li.addEventListener('click', function() { _handleMenuClick(item.action); });
            }
            // Feature gate. `.davinci/davinci-users.json` hides
            // `[data-permission="<feature>"]` for the roles that lack it, and the
            // canvas re-applies the rules on mutation — which is what reaches these
            // rows at all, since the menu is rebuilt on every selection. A group's
            // label and divider carry the same marker as its item, so a gated group
            // never leaves an orphaned heading or a stray rule behind.
            if (item.permission) li.setAttribute('data-permission', item.permission);
            menu.appendChild(li);
        });

        // A menu whose EVERY entry belongs to one gated feature has to hide its
        // trigger too, or the role that cannot use the feature opens an empty
        // popover. Structural, so it needs no knowledge of who is impersonating —
        // and it must be cleared again, because the same trigger serves every menu.
        var trigger = document.getElementById('managePopoverTrigger');
        if (trigger) {
            var shared = items.length ? items[0].permission : null;
            var uniform = !!shared && items.every(function(i) { return i.permission === shared; });
            if (uniform) trigger.setAttribute('data-permission', shared);
            else trigger.removeAttribute('data-permission');
        }
    }

    function _handleMenuClick(action) {
        var c = document.getElementById('manageActionDrawerContent');
        if (!c) return;
        c.innerHTML = '';

        switch (action) {
            case 'create-ls-site':
            case 'create-cdn-site':
            case 'create-ghds-site':
                _closeManagePopover();
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.open(
                    action === 'create-ghds-site' ? 'ghds' : action === 'create-cdn-site' ? 'cdn' : 'line',
                    { site: _node.site }
                );
                return;
            case 'create-ls-ghds':
                _closeManagePopover();
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.openWithContext({
                    site: _node.site,
                    lockGHDS: true, focusSection: 'line',
                    prefill: { ghdsName: _node.name, ghdsId: _node.id }
                });
                return;
            case 'create-cdn-ghds':
                _closeManagePopover();
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.openWithContext({
                    site: _node.site,
                    lockGHDS: true, focusSection: 'cdn',
                    prefill: { ghdsName: _node.name, ghdsId: _node.id }
                });
                return;
            case 'create-ls-cdn':
                _closeManagePopover();
                var cdnGhdsName = _node.ghdsAssociation || '';
                var cdnGhdsNode = cdnGhdsName ? _findGHDSByName(_node.site, cdnGhdsName) : null;
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.openWithContext({
                    site: _node.site,
                    lockGHDS: true, lockCDN: true, focusSection: 'line',
                    prefill: {
                        ghdsName: cdnGhdsName,
                        ghdsId: cdnGhdsNode ? cdnGhdsNode.id : cdnGhdsName,
                        cdnName: _node.name,
                        cdnId: _node.id
                    }
                });
                return;
            case 'manage-projects':    _buildManageProjects(c); _openDrawer(action, 'Manage Faculties', 'Save', false, 'Close'); break;
            case 'manage-cdn-ls':      _buildManageLSForCDN(c); _openDrawer(action, 'Manage Building Controllers', 'Save', false, 'Close'); break;
            case 'manage-ghds-ls':     _buildManageLSForGHDS(c); _openDrawer(action, 'Manage Building Controllers', 'Save', false, 'Close'); break;
            case 'archive-server':     _showArchiveConfirm(); return;
            case 'move-server':
                _closeManagePopover();
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.openForMove(_node);
                return;
            case 'unarchive-server':
                _closeManagePopover();
                if (typeof NewServerDrawer !== 'undefined') NewServerDrawer.openForUnarchive(_node);
                return;
        }
    }

    // ── Shared checklist builder (search + select all + items) ──

    // Empty state shown when the search filter zeroes the list. Plural label
    // is derived from columnLabel ("Faculty" → "No Faculties available").
    function _plural(label) {
        return /y$/i.test(label) ? label.replace(/y$/i, 'ies') : label + 's';
    }
    function _buildChecklistEmptyState(columnLabel) {
        var label = _plural(columnLabel || 'Item');
        var wrap = document.createElement('div');
        wrap.className = 'manage-action__checklist-empty';
        wrap.style.display = 'none';
        wrap.innerHTML =
            '<div class="empty-state empty-state--no-background">' +
                '<sf-symbol class="empty-state__icon" name="tray"></sf-symbol>' +
                '<div class="empty-state__title">No ' + label + ' available</div>' +
            '</div>';
        return wrap;
    }

    /**
     * Build a searchable checklist into `container`.
     *
     * Two modes, one builder — four call sites (Faculties, Timetable Relays, Line
     * Nodes, and the legacy add-only list) previously carried near-identical
     * copies of this markup and wiring:
     *   - default: plain multi-select; rows already associated arrive `checked`
     *     + `disabled`.
     *   - `opts.addRemove`: unified add/remove. Every row is togglable and
     *     carries an ADDING / REMOVING tag against its initial state, which is
     *     stashed on the row as `data-original` for the exec handlers to diff.
     *
     * items: { code, checked, disabled, tag, indicator }
     * opts:  { columnLabel, addRemove, sortable }
     */
    function _buildChecklist(container, items, dataAttr, opts) {
        opts = opts || {};
        var columnLabel = opts.columnLabel || 'Faculty';
        var addRemove = !!opts.addRemove;

        // Search input with icon
        var searchWrap = document.createElement('div');
        searchWrap.className = 'manage-action__checklist-search';
        searchWrap.innerHTML =
            '<span class="manage-action__checklist-search-icon"><sf-symbol name="magnifyingglass" style="font-size:14px"></sf-symbol></span>' +
            '<input type="text" class="form-input" placeholder="Search ' + _plural(columnLabel) + '" data-checklist-filter>';
        container.appendChild(searchWrap);

        // Count row
        var metaRow = document.createElement('div');
        metaRow.className = 'manage-action__checklist-meta';
        var countEl = document.createElement('span');
        countEl.className = 'manage-action__checklist-count';
        metaRow.appendChild(countEl);
        container.appendChild(metaRow);

        // Header row with select-all checkbox + column label (+ sort)
        var headerRow = document.createElement('div');
        headerRow.className = 'manage-action__checklist-header';
        headerRow.innerHTML =
            '<label class="checkbox"><input type="checkbox" class="checkbox__input" data-checklist-select-all>' +
            '<span class="checkbox__box"></span><span class="checkbox__label">' + _plural(columnLabel) + '</span></label>' +
            (opts.sortable
                ? '<span class="manage-action__checklist-sort" data-sort-toggle title="Sort"><sf-symbol name="arrow.up.arrow.down" style="font-size:12px"></sf-symbol></span>'
                : '');
        container.appendChild(headerRow);

        // Checklist items
        var list = document.createElement('div');
        list.className = 'manage-action__checklist';

        items.forEach(function(item) {
            var div = document.createElement('div');
            div.className = 'manage-action__checklist-item' + (item.disabled ? ' manage-action__checklist-item--disabled' : '');
            div.setAttribute('data-checklist-code', item.code.toLowerCase());
            if (addRemove) div.setAttribute('data-original', item.checked ? '1' : '0');
            var html =
                '<label class="checkbox"><input type="checkbox" class="checkbox__input" value="' + item.code + '" ' + dataAttr + '="' + item.code + '"' +
                (item.checked ? ' checked' : '') + (item.disabled ? ' disabled' : '') + '>' +
                '<span class="checkbox__box"></span><span class="checkbox__label">' + item.code + '</span></label>';
            if (addRemove) html += '<span class="manage-action__status-tag" data-status-tag></span>';
            if (item.indicator) html += item.indicator;
            if (item.tag) html += '<span class="tag tag--medium tag--gray" style="margin-left:auto;">' + item.tag + '</span>';
            div.innerHTML = html;
            list.appendChild(div);
        });

        container.appendChild(list);

        // Empty state for "no search results" — hidden until filter zeroes the list.
        var emptyState = _buildChecklistEmptyState(columnLabel);
        container.appendChild(emptyState);
        // Nothing to pick at all (no candidates, not a filtered-out list): show it
        // straight away rather than an empty box.
        if (items.length === 0) emptyState.style.display = '';

        // Wire up interactions
        var filterInput = searchWrap.querySelector('[data-checklist-filter]');
        var selectAllCb = headerRow.querySelector('[data-checklist-select-all]');
        var sortBtn = headerRow.querySelector('[data-sort-toggle]');

        // Disabled rows can't be toggled, so Select All skips them in both modes:
        // in default mode they are pre-associated and immovable, in add/remove
        // mode they are blocked (a Building Controller on another Relay). Default mode also
        // leaves them out of the count; in add/remove mode a disabled row is
        // never checked, so every checked row counts.
        var togglableSelector = '.manage-action__checklist-item:not([style*="display: none"]):not(.manage-action__checklist-item--disabled) .checkbox__input';

        function updateCount() {
            var checked = list.querySelectorAll(addRemove
                ? '.manage-action__checklist-item:not([style*="display: none"]) .checkbox__input:checked'
                : '.manage-action__checklist-item:not([style*="display: none"]) .checkbox__input:checked:not(:disabled)').length;
            countEl.textContent = checked + ' ' + _plural(columnLabel) + ' Selected';
        }

        function updateTags() {
            if (!addRemove) return;
            list.querySelectorAll('.manage-action__checklist-item').forEach(function(item) {
                var cb = item.querySelector('.checkbox__input');
                var tagEl = item.querySelector('[data-status-tag]');
                if (!cb || !tagEl) return;
                var isOriginal = item.getAttribute('data-original') === '1';

                if (isOriginal && !cb.checked) {
                    tagEl.textContent = 'REMOVING';
                    tagEl.className = 'tag tag--tiny tag--danger';
                } else if (!isOriginal && cb.checked) {
                    tagEl.textContent = 'ADDING';
                    tagEl.className = 'tag tag--tiny tag--success';
                } else {
                    tagEl.textContent = '';
                    tagEl.className = 'manage-action__status-tag';
                }
            });
        }

        function updateSelectAll() {
            var visible = list.querySelectorAll(togglableSelector);
            var checkedCount = 0;
            for (var i = 0; i < visible.length; i++) {
                if (visible[i].checked) checkedCount++;
            }
            selectAllCb.checked = visible.length > 0 && checkedCount === visible.length;
            selectAllCb.indeterminate = checkedCount > 0 && checkedCount < visible.length;
            updateCount();
            updateTags();
        }

        function updateEmptyState() {
            var visibleCount = list.querySelectorAll('.manage-action__checklist-item:not([style*="display: none"])').length;
            emptyState.style.display = visibleCount === 0 ? '' : 'none';
        }

        filterInput.addEventListener('input', function() {
            var term = filterInput.value.toLowerCase();
            var rows = list.querySelectorAll('.manage-action__checklist-item');
            for (var i = 0; i < rows.length; i++) {
                var code = rows[i].getAttribute('data-checklist-code');
                rows[i].style.display = !term || code.indexOf(term) !== -1 ? '' : 'none';
            }
            updateSelectAll();
            updateEmptyState();
        });

        selectAllCb.addEventListener('change', function() {
            var visible = list.querySelectorAll(togglableSelector);
            for (var i = 0; i < visible.length; i++) {
                visible[i].checked = selectAllCb.checked;
            }
            selectAllCb.indeterminate = false;
            updateCount();
            updateTags();
        });

        list.addEventListener('change', function() {
            updateSelectAll();
        });

        if (sortBtn) {
            var sortAsc = true;
            sortBtn.addEventListener('click', function() {
                sortAsc = !sortAsc;
                var rows = Array.from(list.querySelectorAll('.manage-action__checklist-item'));
                rows.sort(function(a, b) {
                    var aCode = a.getAttribute('data-checklist-code');
                    var bCode = b.getAttribute('data-checklist-code');
                    return sortAsc ? aCode.localeCompare(bCode) : bCode.localeCompare(aCode);
                });
                rows.forEach(function(row) { list.appendChild(row); });
            });
        }

        updateSelectAll();
    }

    // ── Content builders ──

    // 1. Manage Faculties (Active Building Controller — unified add/remove)
    function _buildManageProjects(c) {
        var node = _node, site = node.site;
        var ghdsHostname = ghdsHostnameFromAssociation(node.ghdsAssociation);
        var current = (node.associatedProjects || []).slice();
        // Only projects the site has AND the building controller's ghDS grants (FR-P2-18),
        // so nothing can be added that a later ghDS change would remove. A project
        // already on the server stays listed so it can still be unchecked.
        var granted = ghdsGrantedProjects(ghdsHostname);
        var allProjects = (lineServersDataSets[site] ? Object.keys(lineServersDataSets[site]).sort() : [])
            .filter(function(code) { return granted.indexOf(code) !== -1 || current.indexOf(code) !== -1; });

        var items = allProjects.map(function(code) {
            var hasLS = ghdsHostname ? _projectHasLS(site, code, ghdsHostname) : false;
            return {
                code: code,
                checked: current.indexOf(code) !== -1,
                indicator: hasLS
                    ? '<span class="manage-action__checklist-indicator" title="Has building controllers on this Campus Hub">' + iconMap['Building Controller'] + '</span>'
                    : null
            };
        });
        _buildChecklist(c, items, 'data-manage-project', { columnLabel: 'Faculty', addRemove: true, sortable: true });
    }

    // 1c. Manage Building Controllers (Relay — unified add/remove). Replaces the old
    // add-only "Add Building Controller" action.
    // Building controllers already on ANOTHER Relay are listed but disabled, tagged with
    // that Relay, so the user knows which association to remove first (one Relay
    // per building controller — FR-P2-24).
    function _buildManageLSForCDN(c) {
        var cdn = _node;
        var current = cdn.associatedLineServers || [];
        var hasTaken = false;
        var items = getLineServersForCDN(cdn, { includeOtherCDN: true }).map(function(name) {
            var other = findAssociatedCDNServers(name).filter(function(x) { return x.id !== cdn.id; })[0];
            if (other) hasTaken = true;
            return {
                code: name,
                checked: current.indexOf(name) !== -1,
                disabled: !!other,
                tag: other ? other.name : null
            };
        });
        if (hasTaken) {
            var note = document.createElement('p');
            note.className = 'manage-action__confirm-message';
            note.textContent = 'A Building Controller belongs to one Timetable Relay. Building Controllers tagged with another '
                + 'Timetable Relay can\'t be added until they are removed from it.';
            c.appendChild(note);
        }
        _buildChecklist(c, items, 'data-manage-cdnls', { columnLabel: 'Building Controller', addRemove: true });
    }

    // 1d. Manage Building Controllers (Campus Hub — unified add/remove). Same affordance as
    // the Relay one, but a heavier write: a building controller has exactly ONE Campus Hub, so
    // checking a row here MOVES it off whatever Campus Hub it is on today, and
    // unchecking leaves it unassigned. Both directions run the `FR-P2-18`
    // cascade, so the drawer says so up front and each row already on another
    // Campus Hub carries that hostname as a tag.
    function _buildManageLSForGHDS(c) {
        var ghds = _node;
        var current = _ghdsAssociatedLineServers(ghds);

        var note = document.createElement('p');
        note.className = 'manage-action__confirm-message';
        note.textContent = 'A Building Controller has one Campus Hub. Adding one here moves it off the Campus Hub '
            + 'it is on today; removing one leaves it unassigned. Either way it loses the faculties the '
            + 'new Campus Hub does not grant, and any Relay membership it no longer shares a Campus Hub with.';
        c.appendChild(note);

        var items = getLineServersForGHDS(ghds).map(function(name) {
            var isCurrent = current.indexOf(name) !== -1;
            var ls = findLineServerRecord(name);
            var host = ls ? ghdsHostnameFromAssociation(ls.ghdsAssociation) : '';
            return {
                code: name,
                checked: isCurrent,
                // Only worth saying where it would be a move, not a plain add.
                tag: (!isCurrent && host) ? host : null
            };
        });
        _buildChecklist(c, items, 'data-manage-ghdsls', { columnLabel: 'Building Controller', addRemove: true });
    }

    /** Rows the user added / removed in an add/remove checklist. */
    function _checklistDiff() {
        var toAdd = [], toRemove = [];
        document.querySelectorAll('#manageActionDrawerContent .manage-action__checklist-item').forEach(function(item) {
            var cb = item.querySelector('.checkbox__input');
            if (!cb) return;
            var isOriginal = item.getAttribute('data-original') === '1';
            if (!isOriginal && cb.checked) toAdd.push(cb.value);
            if (isOriginal && !cb.checked) toRemove.push(cb.value);
        });
        return { toAdd: toAdd, toRemove: toRemove };
    }

    // 2. Archive Node — confirmation popover. Shared by all three server
    // types; the copy and the commit differ, the affordance does not.
    function _showArchiveConfirm() {
        _closeManagePopover();
        var node = _node;
        if (!node) return;

        // Refuse outright if the gate that greys the menu item was somehow
        // bypassed (stale menu against mutated data).
        var blocked = _archiveBlockReason(node);
        if (blocked) { showToast(blocked, 'error'); return; }

        // CB-deploy guard: a building controller scheduled for an upcoming Timetable Release
        // cannot be archived until the deploy is cancelled. (This validation
        // applies to archiving only — disabling Registry Sync is unrestricted,
        // and it is a Building Controller rule only.)
        if (node.level === 'Building Controller' && node.cbDeployScheduled) {
            showToast('This Building Controller is scheduled for a Timetable Release. Cancel the release before archiving.', 'error');
            return;
        }
        var body = document.getElementById('archiveConfirmBody');
        var pop = document.getElementById('archiveConfirmPopover');
        if (!body || !pop) return;

        var titleEl = document.getElementById('archiveConfirmTitle');
        if (titleEl) titleEl.textContent = 'Archive ' + node.level;
        // Buttons follow the confirmation pattern: Keep <Type> / Yes, <Action>.
        var cancelBtn = document.getElementById('archiveConfirmCancel');
        if (cancelBtn) cancelBtn.textContent = 'Keep ' + node.level;

        // Registry Sync is only turned off by archiving when it is on.
        var detail = node.level === 'Building Controller'
            ? (node.fsnApiCalls === false ? '' : 'This will turn off Registry Sync. ') +
                'The node will appear as archived in the tree view.'
            : 'The node will appear as archived in the tree view and can no longer be associated with new building controllers.';
        var copy = '<p style="color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); margin: 0;">' +
            'Are you sure you want to archive <strong>' + node.name + '</strong>? ' + detail + '</p>';

        _clearArchiveUnitsCheck();
        var confirmBtn = document.getElementById('archiveConfirmBtn');
        if (node.level === 'Building Controller') {
            // Devices check (FR-P2-29): loading first, then an informational
            // warning. Archiving is never blocked by units.
            body.innerHTML = '<div class="loader"><div class="loader__spinner loader__spinner--small"></div>' +
                '<span class="loader__text loader__text--small">Checking attached devices…</span></div>';
            if (confirmBtn) confirmBtn.disabled = true;
            _archiveUnitsTimer = setTimeout(function() {
                _archiveUnitsTimer = null;
                var warning = '';
                if (node.unitsCheckFailed) {
                    warning = _archiveWarning('Failed to check this Building Controller\'s devices. You can still archive it.');
                } else if (node.unitsCount > 0) {
                    warning = _archiveWarning('This Building Controller has devices registered to it.');
                }
                body.innerHTML = warning + copy;
                if (confirmBtn) confirmBtn.disabled = false;
            }, 900);
        } else {
            body.innerHTML = copy;
        }
        pop.style.display = 'block';
        pop.classList.add('popover--open');
    }

    var _archiveUnitsTimer = null;

    function _clearArchiveUnitsCheck() {
        if (_archiveUnitsTimer) { clearTimeout(_archiveUnitsTimer); _archiveUnitsTimer = null; }
        var btn = document.getElementById('archiveConfirmBtn');
        if (btn) btn.disabled = false;
    }

    function _archiveWarning(message) {
        return '<div class="proxy-changed-note" style="font-size: var(--font-size-xxs); margin-bottom: var(--space-s);">' +
            '<span class="proxy-changed-note__icon"><sf-symbol name="exclamationmark.triangle.fill" style="font-size:11px"></sf-symbol></span>' +
            '<span>' + message + '</span></div>';
    }

    function _closeArchiveConfirm() {
        _clearArchiveUnitsCheck();
        var pop = document.getElementById('archiveConfirmPopover');
        if (pop) {
            pop.style.display = 'none';
            pop.classList.remove('popover--open');
        }
    }

    // Manage Faculties "remove all" confirm popover, anchored on the drawer's
    // Save button. Removing every project leaves the building controller active with no
    // associations (it no longer archives it).
    function _showRemoveAllArchiveConfirm() {
        var body = document.getElementById('manageActionConfirmBody');
        var pop = document.getElementById('manageActionConfirmPopover');
        if (!body || !pop || !_node) return;
        body.innerHTML = '<p style="color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); margin: 0;">' +
            'This will remove all faculties from <strong>' + _node.name + '</strong>. ' +
            'The building controller will stay active with no associated faculties.</p>';
        pop.style.display = 'block';
        pop.classList.add('popover--open');
    }

    function _closeRemoveAllArchiveConfirm() {
        var pop = document.getElementById('manageActionConfirmPopover');
        if (pop) {
            pop.style.display = 'none';
            pop.classList.remove('popover--open');
        }
    }

    // Returns true when the Manage Faculties checklist would leave the server
    // with zero associated projects AND the server had at least one project to
    // start with — i.e. the user is actively removing the last project. An
    // already-orphan building controller (zero projects starting) doesn't trigger this
    // because there is nothing to "remove all" of.
    function _manageProjectsRemovesAll() {
        var items = document.querySelectorAll('#manageActionDrawerContent .manage-action__checklist-item');
        if (!items.length) return false;
        var anyChecked = false;
        var anyOriginal = false;
        for (var i = 0; i < items.length; i++) {
            var cb = items[i].querySelector('.checkbox__input');
            if (cb && cb.checked) anyChecked = true;
            if (items[i].getAttribute('data-original') === '1') anyOriginal = true;
        }
        return anyOriginal && !anyChecked;
    }

    // Confirmed from the Save-button popover: remove every project association
    // and leave the building controller active. With no projects it belongs to no tree
    // bucket, so `_parkAsOrphanLineServer` keeps it in the project-less bucket
    // (same place a project-less create or unarchive lands) rather than letting
    // it vanish.
    function _execRemoveAllProjects() {
        if (!_node) return;
        var node = _node, site = node.site;
        (node.associatedProjects || []).slice().forEach(function(proj) {
            _removeProjectAssociation(site, node, proj);
        });
        if (typeof _parkAsOrphanLineServer === 'function') _parkAsOrphanLineServer(node);
        _closeRemoveAllArchiveConfirm();
        _closeDrawer();
        _refreshAndSelect(node.id);
        showToast('All Faculties Removed from Building Controller');
    }

    // ── Action handlers ──

    function _handleConfirm(e) {
        switch (_action) {
            case 'manage-projects':
                if (_manageProjectsRemovesAll()) {
                    if (e && e.stopPropagation) e.stopPropagation();
                    _showRemoveAllArchiveConfirm();
                    return;
                }
                _execManageProjects(); break;
            case 'manage-cdn-ls':     _execManageLSForCDN(); break;
            case 'manage-ghds-ls':    _execManageLSForGHDS(); break;
        }
    }

    // Action 1: Manage Faculties (unified add/remove)
    function _execManageProjects() {
        var node = _node, site = node.site;
        var diff = _checklistDiff();
        var toAdd = diff.toAdd, toRemove = diff.toRemove;

        if (toAdd.length === 0 && toRemove.length === 0) { showToast('No changes to save'); return; }

        // Process additions
        toAdd.forEach(function(proj) {
            function addProject(srv) {
                srv.associatedProjects = srv.associatedProjects || [];
                if (srv.associatedProjects.indexOf(proj) === -1) {
                    srv.associatedProjects.push(proj);
                    srv.associatedProjects.sort();
                }
                srv.everAssociated = srv.everAssociated || [];
                if (srv.everAssociated.indexOf(proj) === -1) {
                    srv.everAssociated.push(proj);
                    srv.everAssociated.sort();
                }
            }
            forEachServerCopy(lineServersDataSets, node.id, addProject);
            // A project-less server has no per-project copy yet: its only record is
            // in the project-less bucket, which the new copies below are cloned from.
            forEachOrphanLineServerCopy(node.id, addProject);
            _ensureDataEntry(lineServersDataSets, site, proj, 'Building Controller');
            var children = lineServersDataSets[site][proj].children[0].children;
            if (!children.some(function(s) { return s.id === node.id; })) {
                var copy = Object.assign({}, node, { project: proj });
                // Each copy owns its project lists; sharing one array across copies
                // makes a later edit to one change them all.
                // Seeded with everything being added in this save, so the order the
                // copies are created in doesn't matter.
                function withAdded(list) {
                    var out = (list || []).slice();
                    toAdd.forEach(function(p) { if (out.indexOf(p) === -1) out.push(p); });
                    return out.sort();
                }
                copy.associatedProjects = withAdded(node.associatedProjects);
                copy.everAssociated = withAdded(node.everAssociated);
                children.push(copy);
            }
        });

        // Process removals — soft remove. Association is hidden from tree and
        // side panel, but everAssociated retains the project so archive flows
        // can still show the full history.
        toRemove.forEach(function(proj) {
            _removeProjectAssociation(site, node, proj);
        });

        // If this was an orphan building controller (created without projects) and the
        // user just added at least one project, drop it from the orphan bucket
        // — it's now a regular per-project building controller.
        if (toAdd.length > 0 && typeof orphanLineServersData !== 'undefined' && orphanLineServersData[site]) {
            orphanLineServersData[site] = orphanLineServersData[site].filter(function(o) {
                return o.id !== node.id;
            });
        }

        _closeDrawer();
        _refreshAndSelect(node.id);
        showToast('Faculties Updated for Building Controller');
    }

    // Action 2: Archive Node
    function _execArchiveServer() {
        var node = _node;
        if (!node) return;

        // The same gate that disabled the menu item runs again on confirm, in case
        // the data changed while the popover was open (FR-P2-27).
        var blocked = _archiveBlockReason(node);
        if (blocked) {
            _closeArchiveConfirm();
            showToast(blocked, 'error');
            return;
        }

        if (node.level === 'Campus Hub' || node.level === 'Timetable Relay') {
            _archiveStandaloneServer(node);
            return;
        }

        // Archiving removes the Asset Registry host. If Asset Registry refuses (units not RETIRED),
        // the server stays active with Registry Sync on (FR-P2-30).
        var fsnError = fsnHostRemovalError(node, 'archive');
        if (fsnError) {
            _closeArchiveConfirm();
            showToast(fsnError, 'error');
            return;
        }

        var site = node.site;
        // Archive across the full historical set so the archived view shows
        // every project ever associated with this building controller, not just the
        // ones still active at archive time.
        var historical = (node.everAssociated && node.everAssociated.length)
            ? node.everAssociated
            : (node.associatedProjects || []);
        var fullHistory = historical.slice().sort();
        fullHistory.forEach(function(proj) {
            _archiveServerForProject(site, node, proj, fullHistory);
        });
        // A server that was never associated with a project has no bucket to move
        // between: it lives once in the project-less set, so flag that record in
        // place (like Campus Hub/Relay) and force Asset Registry off, as archiving does everywhere.
        if (!fullHistory.length) {
            forEachOrphanLineServerCopy(node.id, function(srv) {
                srv.archived = true;
                srv.fsnApiCalls = false;
            });
        } else if (typeof orphanLineServersData !== 'undefined') {
            // A server whose projects were all removed sits in the project-less
            // bucket but still has history, so it is archived per project above;
            // drop the project-less record or it would keep showing as active.
            Object.keys(orphanLineServersData).forEach(function(s) {
                orphanLineServersData[s] = (orphanLineServersData[s] || []).filter(function(o) { return o.id !== node.id; });
            });
        }
        _closeArchiveConfirm();
        _refreshAndSelect(node.id);
        showToast('Building Controller Archived');
    }

    /**
     * Archive a Campus Hub or Relay server by flagging the record in place.
     *
     * Building controllers move between `lineServersDataSets` and `archivedServersData`
     * because they are stored once PER PROJECT and the archived view has to
     * replay that project history. Campus Hub and Relay records exist exactly once and
     * have no project dimension, so there is nothing to move: flipping `archived`
     * on the single record is the whole operation, and it keeps every association
     * that referenced the server intact for the unarchive.
     */
    function _archiveStandaloneServer(node) {
        var dataSource = node.level === 'Campus Hub' ? ghdsServersData : cdnServersData;
        forEachServerCopy(dataSource, node.id, function(srv) {
            srv.archived = true;
            srv.status = 'inactive';
        });
        _closeArchiveConfirm();
        _refreshAndSelect(node.id);
        showToast((node.level === 'Campus Hub' ? 'Campus Hub' : 'Timetable Relay') + ' Archived');
    }

    // Action 4: Manage Building Controllers for a Relay (unified add/remove)
    function _execManageLSForCDN() {
        var cdn = _node;
        var diff = _checklistDiff();
        if (!diff.toAdd.length && !diff.toRemove.length) { showToast('No changes to save'); return; }

        // One Relay per building controller (FR-P2-24): the list never offers one that is
        // on another Relay, but a stale drawer could — skip it rather than let it
        // sit on two Relays.
        diff.toAdd.forEach(function(name) {
            var onOther = findAssociatedCDNServers(name).some(function(other) { return other.id !== cdn.id; });
            var ls = findLineServerRecord(name);
            if (ls && !onOther) attachLineServerToCDN(cdn, ls);
        });
        diff.toRemove.forEach(function(name) { detachLineServerFromCDN(cdn, name); });

        _closeDrawer();
        _refreshAndSelect(cdn.id);
        showToast('Building Controllers Updated for Timetable Relay');
    }

    // Action 5: Manage Building Controllers for a Campus Hub (unified add/remove).
    // Where the Relay pair writes one membership list, this writes the line
    // server's single `ghdsAssociation` — so both directions are a re-home and
    // both go through the shared cascade in selection.js, the same one the Line
    // Node panel's Campus Hub dropdown runs on Save.
    function _execManageLSForGHDS() {
        var ghds = _node;
        var diff = _checklistDiff();
        if (!diff.toAdd.length && !diff.toRemove.length) { showToast('No changes to save'); return; }

        diff.toAdd.forEach(function(name) { moveLineServerToGHDS(name, ghds.name); });
        diff.toRemove.forEach(function(name) { moveLineServerToGHDS(name, ''); });

        _closeDrawer();
        _refreshAndSelect(ghds.id);
        showToast('Building Controllers Updated for Campus Hub');
    }

    // ── Archive/Unarchive helpers ──

    // Soft remove of a single project association. Used by the active
    // Manage Faculties flow when the user unchecks a project. Delegates to the
    // shared helper in selection.js — the Campus Hub-change cascade drops projects the
    // same way, and the two paths must leave identical residue.
    function _removeProjectAssociation(site, node, project) {
        removeLineServerFromProject(site, node, project);
    }

    // Hard archive of one project bucket. Caller passes the pre-computed
    // historical list so each archived copy gets its own slice — this keeps
    // associatedProjects consistent across the per-project archive copies.
    // Archiving turns the server's Configuration (Registry Sync) off (FR-P2-10);
    // the archived side panel shows the toggle off and disabled.
    function _archiveServerForProject(site, node, project, fullHistory) {
        var history = (fullHistory && fullHistory.length)
            ? fullHistory.slice()
            : ((node.everAssociated && node.everAssociated.length)
                ? node.everAssociated.slice()
                : (node.associatedProjects || []).slice());
        history.sort();

        // Remove from lineServersDataSets
        if (lineServersDataSets[site] && lineServersDataSets[site][project]) {
            var entry = lineServersDataSets[site][project];
            if (entry.children && entry.children[0] && entry.children[0].children) {
                entry.children[0].children = entry.children[0].children.filter(function(s) { return s.id !== node.id; });
            }
        }
        // Add to archivedServersData. Archiving forces Registry Sync off — an
        // archived building controller never keeps it on.
        _ensureDataEntry(archivedServersData, site, project, 'Building Controller');
        var archChildren = archivedServersData[site][project].children[0].children;
        if (!archChildren.some(function(s) { return s.id === node.id; })) {
            var copy = Object.assign({}, node, {
                project: project,
                archived: true,
                fsnApiCalls: false,
                associatedProjects: history.slice(),
                everAssociated: history.slice()
            });
            archChildren.push(copy);
        }
    }

    function _unarchiveServerForProject(site, node, project) {
        // Remove from archivedServersData
        if (archivedServersData[site] && archivedServersData[site][project]) {
            var entry = archivedServersData[site][project];
            if (entry.children && entry.children[0] && entry.children[0].children) {
                entry.children[0].children = entry.children[0].children.filter(function(s) { return s.id !== node.id && s.name !== node.name; });
            }
        }
        // Add to lineServersDataSets
        _ensureDataEntry(lineServersDataSets, site, project, 'Building Controller');
        var lsChildren = lineServersDataSets[site][project].children[0].children;
        if (!lsChildren.some(function(s) { return s.id === node.id; })) {
            var copy = Object.assign({}, node, { project: project, archived: undefined, status: 'active' });
            if (copy.associatedProjects.indexOf(project) === -1) copy.associatedProjects.push(project);
            copy.associatedProjects.sort();
            lsChildren.push(copy);
        }
        // Update associatedProjects on all active copies
        forEachServerCopy(lineServersDataSets, node.id, function(srv) {
            if (srv.associatedProjects.indexOf(project) === -1) {
                srv.associatedProjects.push(project);
                srv.associatedProjects.sort();
            }
        });
    }

    // ── Public API ──

    function init() {
        var closeBtn = document.getElementById('closeManageActionDrawer');
        var cancelBtn = document.getElementById('manageActionCancel');
        var confirmBtn = document.getElementById('manageActionConfirm');
        var drawer = document.getElementById('manageActionDrawer');

        if (closeBtn) closeBtn.addEventListener('click', _closeDrawer);
        if (cancelBtn) cancelBtn.addEventListener('click', _closeDrawer);
        if (confirmBtn) confirmBtn.addEventListener('click', _handleConfirm);
        if (drawer) drawer.addEventListener('click', function(e) { if (e.target === drawer) _closeDrawer(); });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && drawer && drawer.classList.contains('drawer-overlay--open')) {
                // With the Remove All Faculties confirmation open, Escape closes only that.
                var removeAllPop = document.getElementById('manageActionConfirmPopover');
                if (removeAllPop && removeAllPop.classList.contains('popover--open')) _closeRemoveAllArchiveConfirm();
                else _closeDrawer();
            }
        });

        var archiveConfirmBtn = document.getElementById('archiveConfirmBtn');
        var archiveCancelBtn = document.getElementById('archiveConfirmCancel');
        if (archiveConfirmBtn) archiveConfirmBtn.addEventListener('click', _execArchiveServer);
        if (archiveCancelBtn) archiveCancelBtn.addEventListener('click', _closeArchiveConfirm);

        var removeAllArchiveBtn = document.getElementById('manageActionConfirmArchiveBtn');
        var removeAllCancelBtn = document.getElementById('manageActionConfirmCancel');
        if (removeAllArchiveBtn) removeAllArchiveBtn.addEventListener('click', _execRemoveAllProjects);
        if (removeAllCancelBtn) removeAllCancelBtn.addEventListener('click', _closeRemoveAllArchiveConfirm);
    }

    function showMenu(nodeData) {
        _node = nodeData;
        var trigger = document.getElementById('managePopoverTrigger');
        if (!trigger) return;
        if (nodeData.level === 'Campus' || nodeData.level === 'Building Controller' || nodeData.level === 'Campus Hub' || nodeData.level === 'Timetable Relay') {
            trigger.style.display = '';
            _buildMenu(nodeData);
        } else {
            trigger.style.display = 'none';
        }
    }

    /**
     * A multi-node bulk selection has no single target, and every remaining
     * action (projects, Relays, create, archive) is per-server — so the Manage
     * menu has nothing to offer and stays hidden.
     */
    function showBulkMenu() {
        _node = null;
        var trigger = document.getElementById('managePopoverTrigger');
        if (trigger) trigger.style.display = 'none';
    }

    function hideMenu() {
        var trigger = document.getElementById('managePopoverTrigger');
        if (trigger) trigger.style.display = 'none';
        _node = null;
    }

    window.ManageActions = { init: init, showMenu: showMenu, showBulkMenu: showBulkMenu, hideMenu: hideMenu };
})();
