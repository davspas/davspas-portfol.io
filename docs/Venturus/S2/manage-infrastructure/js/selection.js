/**
 * Every Building Controller tree node under a Campus node that is currently VISIBLE —
 * archived ones excluded (they are never bulk/cascade targets); otherwise the set the tree renders under the active
 * filters (Faculties, Registry Sync, Show Archived). The tree is the single
 * source of truth for what's selectable, so the site cascade highlight, the
 * site Asset Registry toggle state, and the Asset Registry Save cascade all read from here.
 */
function _lineServerNodesForSite(siteId) {
    if (typeof findNodeById !== 'function') return [];
    var node = findNodeById(siteId);
    if (!node) return [];
    var nodes = [];
    (function walk(n) {
        if (!n) return;
        if (n.level === 'Building Controller' && !n.archived) nodes.push(n);
        if (n.children) n.children.forEach(walk);
    })(node);
    return nodes;
}

/** Ids of `_lineServerNodesForSite` — used for the highlight cascade + count. */
function _lineServerIdsForSite(siteId) {
    return _lineServerNodesForSite(siteId).map(function(n) { return n.id; });
}

/**
 * A site's rendered tree node, by site name. `lineServersData` holds one root
 * node per selected site. Returns null when the site isn't currently in view.
 */
function _siteTreeNode(siteName) {
    if (typeof lineServersData === 'undefined' || !Array.isArray(lineServersData)) return null;
    for (var i = 0; i < lineServersData.length; i++) {
        var n = lineServersData[i];
        if (n && n.level === 'Campus' && (n.site === siteName || n.name === siteName)) return n;
    }
    return null;
}

/**
 * Select a tree node (single selection only)
 * @param {string} nodeId - The ID of the node to select
 */
function selectNode(nodeId) {
    const nodeElement = document.querySelector(`.tree__node[data-node-id="${nodeId}"]`);
    if (!nodeElement) return;

    const nodeData = findNodeById(nodeId);

    // Clear all previous selections
    const allSelected = document.querySelectorAll('.tree__node--selected');
    allSelected.forEach(node => node.classList.remove('tree__node--selected'));

    // Set new selection
    nodeElement.classList.add('tree__node--selected');
    selectedNodeId = nodeId;
    selectedNodeIds = [nodeId];
    lastClickedNodeId = nodeId;

    // Campus → visually cascade the highlight down to every visible building controller
    // under it (non-archived). Cascaded LSs are NOT pushed into
    // selectedNodeIds — the Campus panel still drives off selectedNodeId, and the
    // Asset Registry cascade on Save walks the site's LSs via _applySiteFSNToLineServers.
    if (nodeData && nodeData.level === 'Campus') {
        _lineServerIdsForSite(nodeId).forEach(function(lsId) {
            var el = document.querySelector('.tree__node[data-node-id="' + lsId + '"]');
            if (el) el.classList.add('tree__node--selected');
        });
    }

    // A Campus selection cascades the highlight across all its building controllers, so
    // surface the Clear Selection button (same affordance as bulk) to let the
    // user drop the selection back to the empty state. Hidden for LS/Campus Hub/Relay.
    var clearBtn = document.getElementById('bulkSelectionClearBtn');
    if (clearBtn) clearBtn.style.display = (nodeData && nodeData.level === 'Campus') ? 'flex' : 'none';

    // Update sidebar title and details panel
    if (nodeData) {
        updateSidebarTitle(nodeData.level);

        if (nodeData.level === 'Campus') {
            updateSiteInfo(nodeData);
        } else if (nodeData.level === 'Building Controller') {
            updateLineServerInfo(nodeData);
        } else if (nodeData.level === 'Campus Hub') {
            updateGHDSServerInfo(nodeData);
        } else if (nodeData.level === 'Timetable Relay') {
            updateCDNServerInfo(nodeData);
        } else {
            hideAllServerInfo();
        }

        // Show manage menu for server nodes
        if (typeof ManageActions !== 'undefined') ManageActions.showMenu(nodeData);
    }
}

/**
 * Toggle settings category expand/collapse
 */
function toggleCategory(categoryElement) {
    const isExpanded = categoryElement.classList.contains('settings-category--expanded');
    if (isExpanded) {
        categoryElement.classList.remove('settings-category--expanded');
    } else {
        categoryElement.classList.add('settings-category--expanded');
    }
}

/**
 * Initialize settings panel interactions (category toggle)
 */
function initSettingsPanel() {
    const settingsBody = document.getElementById('settingsBody');
    if (!settingsBody) return;

    settingsBody.addEventListener('click', (e) => {
        const header = e.target.closest('.settings-category__header');
        if (header) {
            const isSubsection = header.classList.contains('settings-category__header--subsection');
            if (isSubsection) {
                e.stopPropagation();
                const subsection = header.closest('.settings-category__subsection');
                if (subsection) toggleCategory(subsection);
            } else {
                const category = header.closest('.settings-category');
                if (category) toggleCategory(category);
            }
        }
    });

    var pgmSwitch = document.getElementById('infoPGMService');
    if (pgmSwitch) {
        pgmSwitch.addEventListener('change', function() {
            var label = pgmSwitch.closest('.switch').querySelector('.switch__label');
            if (label) label.textContent = pgmSwitch.checked ? 'On' : 'Off';
        });
    }

    ['infoFSNApiCalls', 'siteFSNApiCalls'].forEach(function(id) {
        var sw = document.getElementById(id);
        if (!sw) return;
        sw.addEventListener('change', function() {
            var label = sw.closest('.switch').querySelector('.switch__label');
            if (label) label.textContent = sw.checked ? 'Enabled' : 'Disabled';
            _clearPanelFieldError(sw);
        });
    });

}

/**
 * Update Building Controller Info fields when a building controller is selected
 * @param {object} nodeData - The selected building controller node data
 */
function updateLineServerInfo(nodeData) {
    // Show details content, hide empty state
    const detailsEmptyState = document.getElementById('detailsEmptyState');
    const detailsContent = document.getElementById('detailsContent');
    const settingsPanelFooter = document.getElementById('settingsPanelFooter');
    const lineServerSection = document.getElementById('lineServerInfoSection');
    const lineServerConfigSection = document.getElementById('lineServerConfigSection');
    const ghdsServerSection = document.getElementById('ghdsServerInfoSection');
    const cdnServerSection = document.getElementById('cdnServerInfoSection');
    const assocGHDSSection = document.getElementById('lineServerAssociatedGHDS');
    const assocCDNSection = document.getElementById('lineServerAssociatedCDN');

    if (detailsEmptyState) detailsEmptyState.style.display = 'none';
    if (detailsContent) detailsContent.style.display = 'block';
    if (settingsPanelFooter) settingsPanelFooter.style.display = 'flex';
    if (lineServerSection) lineServerSection.style.display = 'block';
    if (lineServerConfigSection) lineServerConfigSection.style.display = 'block';
    var siteConfigSec = document.getElementById('siteConfigSection');
    if (siteConfigSec) siteConfigSec.style.display = 'none';
    if (ghdsServerSection) ghdsServerSection.style.display = 'none';
    if (cdnServerSection) cdnServerSection.style.display = 'none';
    if (assocGHDSSection) assocGHDSSection.style.display = 'none';
    if (assocCDNSection) assocCDNSection.style.display = 'none';
    var ghdsAssocLS = document.getElementById('ghdsAssociatedLSSection');
    var cdnAssocLS = document.getElementById('cdnAssociatedLSSection');
    if (ghdsAssocLS) ghdsAssocLS.style.display = 'none';
    if (cdnAssocLS) cdnAssocLS.style.display = 'none';
    var ghdsAssocCDN = document.getElementById('ghdsAssociatedCDNSection');
    var cdnAssocGHDS = document.getElementById('cdnAssociatedGHDSSection');
    if (ghdsAssocCDN) ghdsAssocCDN.style.display = 'none';
    if (cdnAssocGHDS) cdnAssocGHDS.style.display = 'none';

    // Populate read-only info display fields
    const ipAddressInfo = document.getElementById('infoIPAddress');
    const serverIDInfo = document.getElementById('infoServerID');
    const associatedProjectsInfo = document.getElementById('infoAssociatedProjects');

    if (ipAddressInfo) ipAddressInfo.value = nodeData.ip || '';
    if (serverIDInfo) serverIDInfo.textContent = nodeData.id || '-';
    if (associatedProjectsInfo) {
        renderProjectTags(associatedProjectsInfo, nodeData);
    }

    // Campus Hub Association — an editable dropdown. The read-only ASSOCIATED Campus Hub
    // SERVER section below still carries the navigable detail view.
    _populateGHDSSelect('infoGHDSSelect', nodeData);
    _refreshLineGHDSNote(nodeData);

    // Relay Association — an editable dropdown scoped to the Campus Hub above. A line
    // server has at most one Relay (FR-P2-24); the read-only ASSOCIATED Relay
    // SERVER section below carries its detail view.
    _populateCDNSelect(nodeData);

    // Proxy URL (required, editable; re-derived automatically when Hostname or Campus Hub changes).
    var infoProxyURLInput = document.getElementById('infoProxyURL');
    if (infoProxyURLInput) infoProxyURLInput.value = nodeData.proxyURL || '';
    var infoProxyNote = document.getElementById('infoProxyNote');
    if (infoProxyNote) infoProxyNote.textContent = '';

    // Populate editable fields
    const serverTypeSelect = document.getElementById('infoServerType');
    const descriptionInput = document.getElementById('infoDescription');
    const locationInput = document.getElementById('infoLocation');
    const pgmSwitch = document.getElementById('infoPGMService');

    // Hostname (editable — but locked once projects are associated, since they
    // reference the server by name. The only hostname lock — Campus Hub and Relay are
    // always editable.)
    const hostnameInput = document.getElementById('infoHostname');
    const hostnameNote = document.getElementById('infoHostnameNote');
    const hostnameHint = document.getElementById('infoHostnameHint');
    var hostnameLocked = _lineHostnameLocked(nodeData);
    if (hostnameInput) {
        hostnameInput.value = nodeData.name || '';
        hostnameInput.disabled = hostnameLocked;
    }
    // When locked, the format hint is irrelevant (the field can't be edited) —
    // show only the lock note in its place.
    if (hostnameHint) hostnameHint.style.display = hostnameLocked ? 'none' : 'block';
    if (hostnameNote) {
        hostnameNote.style.display = hostnameLocked ? 'block' : 'none';
        hostnameNote.textContent = 'Hostname cannot be updated when Building Controller contains associated faculties.';
    }

    if (serverTypeSelect) serverTypeSelect.value = nodeData.serverType || '';
    if (descriptionInput) descriptionInput.value = nodeData.description || '';
    if (locationInput) locationInput.value = nodeData.location || '';

    // Alert Service — independent of the Relay association
    _applyLinePGMState(nodeData.pgmService === 'on');

    // Energy Saver and Exam Lockdown checkboxes
    var komodoCheckbox = document.getElementById('infoKomodo');
    var redPandaCheckbox = document.getElementById('infoRedPanda');
    if (komodoCheckbox) komodoCheckbox.checked = nodeData.komodo || false;
    if (redPandaCheckbox) redPandaCheckbox.checked = nodeData.redPanda || false;

    // Configuration switch. Archived building controllers always show Asset Registry
    // API Calls off, with the toggle disabled — archiving forces it off and it
    // cannot be turned back on until the server is unarchived.
    var fsnApiCallsSwitch = document.getElementById('infoFSNApiCalls');
    if (fsnApiCallsSwitch) {
        var fsnArchived = nodeData.archived === true;
        fsnApiCallsSwitch.disabled = fsnArchived;
        fsnApiCallsSwitch.checked = fsnArchived ? false : (nodeData.fsnApiCalls !== false);
        var fLabel = fsnApiCallsSwitch.closest('.switch').querySelector('.switch__label');
        if (fLabel) fLabel.textContent = fsnApiCallsSwitch.checked ? 'Enabled' : 'Disabled';
        var fsnNote = document.getElementById('infoFSNApiCallsNote');
        if (fsnNote) fsnNote.textContent = fsnArchived
            ? 'Archived building controllers cannot use Registry Sync. Unarchive to change this.'
            : 'Grant Building Controllers access to communicate with Asset Registry.';
    }

    // Show/hide and populate associated Campus Hub server section
    if (assocGHDSSection) {
        const ghdsData = findAssociatedGHDSServer(nodeData);
        if (ghdsData) {
            assocGHDSSection.style.display = 'block';

            const assocGHDSHostname = document.getElementById('assocGHDSHostname');
            const assocGHDSIP = document.getElementById('assocGHDSIP');
            const assocGHDSServerID = document.getElementById('assocGHDSServerID');
            const assocGHDSDescription = document.getElementById('assocGHDSDescription');
            const assocGHDSLocation = document.getElementById('assocGHDSLocation');
            const assocGHBridgeService = document.getElementById('assocGHBridgeService');

            if (assocGHDSHostname) {
                var assocGHDSInTree = isGHDSServerInTree(ghdsData);
                createNavigableValue(assocGHDSHostname, ghdsData.name || '-', function() {
                    navigateToServer(ghdsData.id);
                }, !assocGHDSInTree ? { disabled: true, tooltip: 'This Campus Hub node belongs to ' + ghdsData.site + ' and is not in the current campus tree' } : null);
            }
            if (assocGHDSIP) assocGHDSIP.textContent = ghdsData.ip || '-';
            if (assocGHDSServerID) assocGHDSServerID.textContent = ghdsData.id || '-';
            var assocGHDSProxyURL = document.getElementById('assocGHDSProxyURL');
            _renderProxyURL(assocGHDSProxyURL, ghdsData.proxyURL);

            // Campus field with blue tag when cross-site
            var assocGHDSSiteEl = document.getElementById('assocGHDSSite');
            if (assocGHDSSiteEl) {
                var isCrossSiteAssoc = ghdsData.site && ghdsData.site !== nodeData.site;
                if (isCrossSiteAssoc) {
                    assocGHDSSiteEl.innerHTML = '';
                    var assocTag = document.createElement('span');
                    assocTag.className = 'tag tag--medium tag--primary';
                    assocTag.textContent = ghdsData.site;
                    assocGHDSSiteEl.appendChild(assocTag);
                } else {
                    assocGHDSSiteEl.innerHTML = '';
                    assocGHDSSiteEl.textContent = ghdsData.site || nodeData.site || '-';
                }
            }
            if (assocGHDSDescription) assocGHDSDescription.textContent = ghdsData.description || '-';
            if (assocGHDSLocation) assocGHDSLocation.textContent = ghdsData.location || '-';
            if (assocGHBridgeService) assocGHBridgeService.textContent = ghdsData.bridgeService ? 'ON' : 'OFF';
        } else {
            assocGHDSSection.style.display = 'none';
        }
    }

    // Show/hide and populate the associated Relay server — the read-only mirror
    // of ASSOCIATED Campus Hub SERVER above. A Relay always sits on the building controller's
    // own site, so its hostname link never needs the not-in-tree state.
    if (assocCDNSection) {
        var cdnData = findAssociatedCDNServers(nodeData.name)[0];
        if (cdnData) {
            assocCDNSection.style.display = 'block';
            var assocCDNHostname = document.getElementById('assocCDNHostname');
            if (assocCDNHostname) {
                createNavigableValue(assocCDNHostname, cdnData.name || '-', function() {
                    navigateToServer(cdnData.id);
                });
            }
            _renderProxyURL(document.getElementById('assocCDNProxyURL'), cdnData.proxyURL);
            var cdnText = {
                assocCDNIP: cdnData.ip,
                assocCDNServerID: cdnData.id,
                assocCDNSite: cdnData.site || nodeData.site,
                assocCDNDescription: cdnData.description,
                assocCDNLocation: cdnData.location
            };
            Object.keys(cdnText).forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.textContent = cdnText[id] || '-';
            });
        } else {
            assocCDNSection.style.display = 'none';
        }
    }

    captureEditableSnapshot('line');
    _showPanelHostnameErrorIfOutdated('infoHostname');
    _showPanelRequiredErrorsOnOpen();
    _syncProxyOpenButtons();
}

// --- Campus Hub Association dropdowns (Building Controller + Relay panels) ---

/**
 * Fill a panel's Campus Hub Association `<select>` with every Campus Hub reachable from the
 * server's site (site-local + NORT, archived excluded — see
 * `getGHDSServersForSite` in config-data.js) and select the current one.
 *
 * The two panels store the association in DIFFERENT formats: a building controller keeps
 * `"<hostname> (<Type>)"`, a Relay keeps the bare hostname (findCDNServersForGHDS
 * compares it with `===`). Option *values* are therefore always the bare
 * hostname, and each panel's commit re-applies its own format.
 *
 * A server pointing at a Campus Hub that is archived or out of scope keeps a
 * disabled option for it, so the panel never silently reads as "Not assigned".
 */
function _populateGHDSSelect(selectId, nodeData) {
    var sel = document.getElementById(selectId);
    if (!sel) return;
    var current = ghdsHostnameFromAssociation(nodeData.ghdsAssociation);
    var options = (typeof getGHDSServersForSite === 'function')
        ? getGHDSServersForSite(nodeData.site) : [];

    sel.innerHTML = '';
    var none = document.createElement('option');
    none.value = '';
    none.textContent = 'Not assigned';
    sel.appendChild(none);

    var matched = false;
    options.forEach(function(g) {
        var opt = document.createElement('option');
        opt.value = g.name;
        opt.textContent = (g.site === 'NORT' && nodeData.site !== 'NORT') ? g.name + ' (NORT)' : g.name;
        if (g.name === current) matched = true;
        sel.appendChild(opt);
    });

    if (current && !matched) {
        var orphan = document.createElement('option');
        orphan.value = current;
        orphan.textContent = current + ' (unavailable)';
        orphan.disabled = true;
        sel.appendChild(orphan);
    }
    sel.value = current;
}

/**
 * Fill the Building Controller panel's Relay Association dropdown with the non-archived
 * Relay servers on the Campus Hub currently picked in the Campus Hub dropdown — a Relay only
 * serves building controllers on its own Campus Hub. The building controller's Relay is selected when
 * it is on that Campus Hub; otherwise the field falls back to "Not assigned", which is
 * what Save would leave after the Campus Hub move detaches it.
 */
function _populateCDNSelect(nodeData, selectedId) {
    var sel = document.getElementById('infoCDNSelect');
    if (!sel) return;
    var note = document.getElementById('infoCDNNote');
    // An archived building controller is out of service, so it can't take a Relay.
    if (nodeData.archived) {
        sel.innerHTML = '<option value="">Not assigned</option>';
        sel.value = '';
        sel.disabled = true;
        if (note) note.textContent = 'Archived Building Controllers cannot be associated with Timetable Relays.';
        return;
    }
    var ghdsHostname = (document.getElementById('infoGHDSSelect') || {}).value || '';
    var current = findAssociatedCDNServers(nodeData.name)[0];
    var want = selectedId !== undefined ? selectedId : (current ? current.id : '');
    var options = ghdsHostname
        ? findCDNServersForGHDS(ghdsHostname).filter(function(c) { return !c.archived && c.site === nodeData.site; })
        : [];

    sel.innerHTML = '';
    // Same rule as the creation drawer (updateLineCDNOptions): with no Relay to
    // pick, the field is disabled and says why in its placeholder.
    if (!options.length) {
        var empty = document.createElement('option');
        empty.value = '';
        empty.textContent = ghdsHostname ? 'No Relay nodes for this Campus Hub' : 'Select a Campus Hub first';
        sel.appendChild(empty);
        sel.value = '';
        sel.disabled = true;
        if (note) note.textContent = '';
        return;
    }
    sel.disabled = false;
    var none = document.createElement('option');
    none.value = '';
    none.textContent = 'Not assigned';
    sel.appendChild(none);
    var matched = false;
    options.slice().sort(function(a, b) { return a.name.localeCompare(b.name); }).forEach(function(c) {
        var opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.name;
        if (c.id === want) matched = true;
        sel.appendChild(opt);
    });
    sel.value = matched ? want : '';

    if (note) note.textContent = '';
}

/**
 * Warn on the Building Controller panel when the selected Campus Hub would strand its
 * associations: projects the new Campus Hub doesn't grant access to, and Relay
 * memberships on a different Campus Hub. Both are dropped on Save — say so before the
 * user commits, not after.
 */
function _refreshLineGHDSNote(nodeData) {
    var note = document.getElementById('infoGHDSNote');
    var sel = document.getElementById('infoGHDSSelect');
    if (!note || !sel) return;
    var cdns = _staleCDNsForLineServer(nodeData.name, sel.value);
    note.textContent = cdns.length
        ? 'Saving will detach it from its Timetable Relay.'
        : '';
}

/**
 * Warn on the Relay panel for the mirror case: the Relay's building controllers all sit on
 * its current Campus Hub, so moving the Relay detaches them.
 */
function _refreshCDNGHDSNote(nodeData) {
    var note = document.getElementById('cdnGHDSNote');
    var sel = document.getElementById('cdnGHDSSelect');
    if (!note || !sel) return;
    var stale = _staleLineServersForCDN(nodeData, sel.value);
    note.textContent = stale.length
        ? 'Saving will detach any Building Controllers attached to this Relay node.'
        : '';
}

/**
 * Relay servers a building controller belongs to that would no longer be valid if it
 * moved to `newGHDSHostname` — i.e. every associated Relay on a different Campus Hub.
 */
function _staleCDNsForLineServer(hostname, newGHDSHostname) {
    if (!hostname) return [];
    return findAssociatedCDNServers(hostname).filter(function(cdn) {
        return ghdsHostnameFromAssociation(cdn.ghdsAssociation) !== newGHDSHostname;
    });
}

/**
 * Building controller hostnames on a Relay that would no longer be valid if the Relay moved
 * to `newGHDSHostname`.
 */
function _staleLineServersForCDN(cdnNode, newGHDSHostname) {
    return (cdnNode.associatedLineServers || []).filter(function(name) {
        var ls = findLineServerRecord(name);
        var host = ls ? ghdsHostnameFromAssociation(ls.ghdsAssociation) : '';
        return host !== newGHDSHostname;
    });
}

// --- Building Controller Proxy URL derivation (panel) ---

/**
 * The Campus Hub hostname the selected building controller's Proxy URL derives from. Read
 * live from the panel dropdown, which the user can now change mid-edit — the
 * value is no longer fixed when the panel is painted.
 */
function _panelProxyGHDSHostname() {
    var sel = document.getElementById('infoGHDSSelect');
    return sel ? sel.value : '';
}

// --- Timetable Relay Proxy URL derivation (panel) ---
//
// The Relay mirror of the block above. Only the derivation differs
// (deriveCDNProxyURL).

/**
 * The Campus Hub hostname the selected Relay's Proxy URL derives from. Read live from
 * the panel dropdown, whose option values are bare hostnames.
 */
function _cdnPanelProxyGHDSHostname() {
    var sel = document.getElementById('cdnGHDSSelect');
    return sel ? sel.value : '';
}

// --- Automatic Proxy URL (panel, both types) ---
//
// The Proxy URL follows its Hostname and Campus Hub Association automatically: when
// either changes it is re-derived and written into the field. When it can't be
// derived (unparseable hostname, no Campus Hub) the old value stays and is flagged
// outdated until the user types a new one (`isProxyURLOutdated`). The field
// stays editable, and a hand-typed value holds until a source field changes.

var PANEL_PROXY_IDS = {
    line: { host: 'infoHostname', ghds: 'infoGHDSSelect', proxy: 'infoProxyURL' },
    cdn: { host: 'cdnHostname', ghds: 'cdnGHDSSelect', proxy: 'cdnProxyURL' }
};

// { hostname, ghds, proxy } when the Proxy URL was last set — on load, by the
// automatic update, or by the user typing it. Only the open panel's kind is held.
var _panelProxyBaseline = null;
// The value the automatic update last wrote, so the "Proxy URL updated" warning
// shows only while the field still holds it (typing a URL by hand clears it).
var _panelProxyAutoValue = null;

function _panelProxyInputs(kind) {
    var ids = PANEL_PROXY_IDS[kind];
    var v = function(id) { return (document.getElementById(id) || {}).value || ''; };
    return { hostname: v(ids.host), ghds: kind === 'cdn' ? _cdnPanelProxyGHDSHostname() : _panelProxyGHDSHostname(), proxy: v(ids.proxy) };
}

function _resetPanelProxyBaseline() {
    _panelProxyBaseline = (_snapshotServerType === 'line' || _snapshotServerType === 'cdn')
        ? _panelProxyInputs(_snapshotServerType)
        : null;
}

/** Re-derive the open panel's Proxy URL after a source field changed. */
function _autoUpdatePanelProxy(kind) {
    if (_snapshotServerType !== kind) return;
    var input = document.getElementById(PANEL_PROXY_IDS[kind].proxy);
    if (!input) return;
    var current = _panelProxyInputs(kind);
    var derived = (kind === 'cdn' ? deriveCDNProxyURL : deriveLineServerProxyURL)(current.hostname.trim(), current.ghds.trim());
    if (!derived) return;
    input.value = derived;
    _clearPanelFieldError(input);
    _resetPanelProxyBaseline();
    _panelProxyAutoValue = derived;
}

/**
 * Warn under the Proxy URL while it holds a value the automatic update wrote
 * over the one the panel loaded with. Gone again once the URL is back to its
 * loaded value, typed by hand, saved or discarded. A seed server that loaded
 * with no URL is simply filled in — there was nothing to replace.
 */
function _refreshPanelProxyChangedNote() {
    ['line', 'cdn'].forEach(function(kind) {
        var note = document.getElementById(kind === 'cdn' ? 'cdnProxyNote' : 'infoProxyNote');
        if (!note) return;
        var message = '';
        var s = _editableSnapshot;
        if (_snapshotServerType === kind && s && _panelProxyAutoValue) {
            var cur = _panelProxyInputs(kind);
            var original = s.proxyURL || '';
            if (original && cur.proxy === _panelProxyAutoValue && cur.proxy !== original) {
                var norm = function(v) { return String(v || '').trim().toLowerCase(); };
                message = proxyURLChangedMessage(norm(cur.hostname) !== norm(s.hostname), norm(cur.ghds) !== norm(s.ghdsHostname));
            }
        }
        if (!message && _panelProxyNotDerived(kind)) message = proxyURLOutdatedMessage(_panelProxyInputs(kind).ghds);
        renderProxyChangedNote(note, message);
    });
}

/**
 * Warn under the Campus Hub Hostname while it differs from the saved one: on Save,
 * propagateGHDSRename rewrites the Proxy URL of every Building Controller on this Campus Hub.
 * Nothing to warn about when no Line or Timetable Relay is connected.
 */
function _refreshGHDSHostnameRenameNote() {
    var note = document.getElementById('ghdsHostnameNote');
    if (!note) return;
    var message = '';
    var s = _editableSnapshot;
    if (_snapshotServerType === 'ghds' && s) {
        var norm = function(v) { return String(v || '').trim().toLowerCase(); };
        var current = (document.getElementById('ghdsHostname') || {}).value || '';
        if (norm(current) && norm(current) !== norm(s.hostname)) {
            var ghdsNode = null;
            forEachServerCopy(ghdsServersData, selectedNodeId, function(srv) { if (!ghdsNode) ghdsNode = srv; });
            var connected = ghdsNode ? _ghdsConnectedServers(ghdsNode) : { lineServers: 0, cdnServers: 0 };
            if (connected.lineServers && connected.cdnServers) {
                message = 'Changing the Hostname changes the Proxy URL of the connected Building Controllers and Timetable Relays.';
            } else if (connected.cdnServers) {
                message = 'Changing the Hostname changes the Proxy URL of the connected Timetable Relays.';
            } else if (connected.lineServers) {
                message = 'Changing the Hostname changes the Proxy URL of the connected Building Controllers.';
            }
        }
    }
    renderProxyChangedNote(note, message);
}

// Proxy URL fields that carry an "open in a new tab" icon button. Building Controller
// and Relay only — the Campus Hub Proxy URL field was removed.
var PROXY_OPEN_FIELDS = [
    { input: 'infoProxyURL', btn: 'infoProxyURLOpen' },
    { input: 'cdnProxyURL', btn: 'cdnProxyURLOpen' }
];

// The URL each open button points at — captured at the settle points below, NOT
// from the live field. An unsaved edit never changes where the icon goes.
var _proxyOpenURLs = {};

/**
 * Point each open button at the field's currently *saved* URL and enable it only
 * when there is one. Called when a server is selected, on Save, on Discard and
 * on an explicit Reset — never on `input`, so typing in the field neither
 * re-targets nor enables/disables the icon.
 */
function _syncProxyOpenButtons() {
    PROXY_OPEN_FIELDS.forEach(function(f) {
        var input = document.getElementById(f.input);
        var btn = document.getElementById(f.btn);
        if (!input || !btn) return;
        var url = input.value.trim();
        _proxyOpenURLs[f.input] = url;
        btn.disabled = !url;
        btn.classList.toggle('navigate-icon-btn--disabled', !url);
    });
}

/**
 * Wire the Proxy URL open buttons. Each opens the URL captured at the last
 * settle point (same `window.open` call `_renderProxyURL` makes for the
 * read-only mirror fields), so a half-typed URL is never opened.
 */
function initProxyOpenButtons() {
    PROXY_OPEN_FIELDS.forEach(function(f) {
        var btn = document.getElementById(f.btn);
        if (!btn) return;
        btn.addEventListener('click', function() {
            var url = _proxyOpenURLs[f.input];
            if (url) window.open(url, '_blank', 'noopener');
        });
    });
    _syncProxyOpenButtons();
}

/**
 * Update Campus Hub Info fields when a Campus Hub server is selected
 * @param {object} nodeData - The selected Campus Hub server node data
 */
function updateGHDSServerInfo(nodeData) {
    const detailsEmptyState = document.getElementById('detailsEmptyState');
    const detailsContent = document.getElementById('detailsContent');
    const settingsPanelFooter = document.getElementById('settingsPanelFooter');
    const lineServerSection = document.getElementById('lineServerInfoSection');
    const ghdsServerSection = document.getElementById('ghdsServerInfoSection');
    const cdnServerSection = document.getElementById('cdnServerInfoSection');
    const assocGHDSSection = document.getElementById('lineServerAssociatedGHDS');
    const assocCDNSection = document.getElementById('lineServerAssociatedCDN');

    if (detailsEmptyState) detailsEmptyState.style.display = 'none';
    if (detailsContent) detailsContent.style.display = 'block';
    if (settingsPanelFooter) settingsPanelFooter.style.display = 'flex';
    if (lineServerSection) lineServerSection.style.display = 'none';
    if (ghdsServerSection) ghdsServerSection.style.display = 'block';
    if (cdnServerSection) cdnServerSection.style.display = 'none';
    if (assocGHDSSection) assocGHDSSection.style.display = 'none';
    if (assocCDNSection) assocCDNSection.style.display = 'none';
    var lsConfigSec = document.getElementById('lineServerConfigSection');
    if (lsConfigSec) lsConfigSec.style.display = 'none';
    var siteConfigSecG = document.getElementById('siteConfigSection');
    if (siteConfigSecG) siteConfigSecG.style.display = 'none';
    var cdnAssocLS2 = document.getElementById('cdnAssociatedLSSection');
    if (cdnAssocLS2) cdnAssocLS2.style.display = 'none';
    var cdnAssocGHDS2 = document.getElementById('cdnAssociatedGHDSSection');
    if (cdnAssocGHDS2) cdnAssocGHDS2.style.display = 'none';

    // Hostname (editable at any time — a rename is rewritten into every record
    // that references this Campus Hub on Save, see propagateGHDSRename)
    var ghdsHostnameInput = document.getElementById('ghdsHostname');
    if (ghdsHostnameInput) ghdsHostnameInput.value = nodeData.name || '';

    // IP Address (editable)
    var ghdsIPInput = document.getElementById('ghdsIPAddress');
    if (ghdsIPInput) ghdsIPInput.value = nodeData.ip || '';

    // Node ID (read-only)
    var serverIDInfo = document.getElementById('ghdsServerID');
    if (serverIDInfo) serverIDInfo.textContent = nodeData.id || '-';

    // Faculties this Campus Hub grants its building controllers access to (read-only). Shown
    // because it is what the Building Controller panel's Campus Hub dropdown enforces — a move
    // to a Campus Hub missing a project drops that project (FR-P2-18), which reads as
    // arbitrary unless the grant is visible somewhere.
    var ghdsProjectsEl = document.getElementById('ghdsAssociatedProjects');
    if (ghdsProjectsEl) {
        ghdsProjectsEl.innerHTML = '';
        var granted = (nodeData.associatedProjects || []).slice().sort();
        if (granted.length === 0) {
            var none = document.createElement('span');
            none.className = 'info-projects-empty';
            none.textContent = 'No Faculties available';
            ghdsProjectsEl.appendChild(none);
        } else {
            granted.forEach(function(code) {
                var tag = document.createElement('span');
                tag.className = 'tag tag--medium tag--gray';
                tag.textContent = code;
                ghdsProjectsEl.appendChild(tag);
            });
        }
    }

    // Campus field with blue NORT tag when cross-site (Campus Hub server's site is
    // not part of the user's current selection — typical for NORT Campus Hub rows
    // referenced by non-NORT building controllers).
    var ghdsSiteEl = document.getElementById('ghdsSite');
    if (ghdsSiteEl) {
        ghdsSiteEl.innerHTML = '';
        var sitesInScope = Array.isArray(selectedSites) ? selectedSites : [];
        var isCrossSite = nodeData.site && sitesInScope.length > 0 && sitesInScope.indexOf(nodeData.site) === -1;
        ghdsSiteEl.textContent = nodeData.site || '-';
        if (isCrossSite) {
            ghdsSiteEl.innerHTML = '';
            var siteText = document.createTextNode(nodeData.site + ' ');
            var tag = document.createElement('span');
            tag.className = 'tag tag--medium tag--primary';
            tag.textContent = nodeData.site;
            ghdsSiteEl.appendChild(tag);
        }
    }

    // Populate editable fields
    const descriptionInput = document.getElementById('ghdsDescription');
    const locationInput = document.getElementById('ghdsLocation');

    if (descriptionInput) descriptionInput.value = nodeData.description || '';
    if (locationInput) locationInput.value = nodeData.location || '';

    // Bridge Service switch
    const bridgeServiceSwitch = document.getElementById('ghBridgeService');
    if (bridgeServiceSwitch) bridgeServiceSwitch.checked = nodeData.bridgeService || false;

    // Associated Building Controllers section
    var ghdsLSSection = document.getElementById('ghdsAssociatedLSSection');
    var ghdsLSList = document.getElementById('ghdsAssociatedLSList');
    if (ghdsLSSection && ghdsLSList) {
        var lsList = _ghdsAssociatedLineServers(nodeData);
        if (lsList.length > 0) {
            ghdsLSSection.style.display = 'block';
            renderAssociatedLineServerList(ghdsLSList, lsList);
        } else {
            ghdsLSSection.style.display = 'none';
        }
    }

    // Associated Timetable Relays section
    var ghdsCDNSection = document.getElementById('ghdsAssociatedCDNSection');
    var ghdsCDNList = document.getElementById('ghdsAssociatedCDNList');
    if (ghdsCDNSection && ghdsCDNList) {
        var cdnNodes = findCDNServersForGHDS(nodeData.name);
        if (cdnNodes.length > 0) {
            ghdsCDNSection.style.display = 'block';
            renderAssociatedCDNServerList(ghdsCDNList, cdnNodes);
        } else {
            ghdsCDNSection.style.display = 'none';
        }
    }

    captureEditableSnapshot('ghds');
    _showPanelHostnameErrorIfOutdated('ghdsHostname');
    _showPanelRequiredErrorsOnOpen();
    _syncProxyOpenButtons();
}
function updateCDNServerInfo(nodeData) {
    const detailsEmptyState = document.getElementById('detailsEmptyState');
    const detailsContent = document.getElementById('detailsContent');
    const settingsPanelFooter = document.getElementById('settingsPanelFooter');
    const lineServerSection = document.getElementById('lineServerInfoSection');
    const ghdsServerSection = document.getElementById('ghdsServerInfoSection');
    const cdnServerSection = document.getElementById('cdnServerInfoSection');
    const assocGHDSSection = document.getElementById('lineServerAssociatedGHDS');
    const assocCDNSection = document.getElementById('lineServerAssociatedCDN');

    if (detailsEmptyState) detailsEmptyState.style.display = 'none';
    if (detailsContent) detailsContent.style.display = 'block';
    if (settingsPanelFooter) settingsPanelFooter.style.display = 'flex';
    if (lineServerSection) lineServerSection.style.display = 'none';
    if (ghdsServerSection) ghdsServerSection.style.display = 'none';
    if (cdnServerSection) cdnServerSection.style.display = 'block';
    if (assocGHDSSection) assocGHDSSection.style.display = 'none';
    if (assocCDNSection) assocCDNSection.style.display = 'none';
    var lsConfigSec2 = document.getElementById('lineServerConfigSection');
    if (lsConfigSec2) lsConfigSec2.style.display = 'none';
    var siteConfigSecC = document.getElementById('siteConfigSection');
    if (siteConfigSecC) siteConfigSecC.style.display = 'none';
    var ghdsAssocLS2 = document.getElementById('ghdsAssociatedLSSection');
    if (ghdsAssocLS2) ghdsAssocLS2.style.display = 'none';
    var ghdsAssocCDN2 = document.getElementById('ghdsAssociatedCDNSection');
    if (ghdsAssocCDN2) ghdsAssocCDN2.style.display = 'none';

    // Hostname (editable — no other record references a Relay by hostname)
    var cdnHostnameInput = document.getElementById('cdnHostname');
    if (cdnHostnameInput) cdnHostnameInput.value = nodeData.name || '';

    // IP Address (editable)
    var cdnIPInput = document.getElementById('cdnIPAddress');
    if (cdnIPInput) cdnIPInput.value = nodeData.ip || '';

    // Node ID (read-only)
    var serverIDInfo = document.getElementById('cdnServerID');
    if (serverIDInfo) serverIDInfo.textContent = nodeData.id || '-';

    // Campus Hub Association — editable dropdown, same as the Building Controller panel. A
    // Relay stores the BARE hostname (no ` (<Type>)` suffix).
    _populateGHDSSelect('cdnGHDSSelect', nodeData);
    _refreshCDNGHDSNote(nodeData);

    // Proxy URL (required, editable; re-derived automatically when Hostname or Campus Hub changes).
    var cdnProxyURLInput = document.getElementById('cdnProxyURL');
    if (cdnProxyURLInput) cdnProxyURLInput.value = nodeData.proxyURL || '';
    var cdnProxyNote = document.getElementById('cdnProxyNote');
    if (cdnProxyNote) cdnProxyNote.textContent = '';

    // Populate editable fields
    const descriptionInput = document.getElementById('cdnDescription');
    const locationInput = document.getElementById('cdnLocation');

    if (descriptionInput) descriptionInput.value = nodeData.description || '';
    if (locationInput) locationInput.value = nodeData.location || '';

    // Associated Building Controllers section
    var cdnLSSection = document.getElementById('cdnAssociatedLSSection');
    var cdnLSList = document.getElementById('cdnAssociatedLSList');
    if (cdnLSSection && cdnLSList) {
        var lsList = nodeData.associatedLineServers;
        if (lsList && lsList.length > 0) {
            cdnLSSection.style.display = 'block';
            renderAssociatedLineServerList(cdnLSList, lsList);
        } else {
            cdnLSSection.style.display = 'none';
        }
    }

    // Associated Campus Hub section
    var cdnGHDSSection = document.getElementById('cdnAssociatedGHDSSection');
    if (cdnGHDSSection) {
        var ghdsText = nodeData.ghdsAssociation || '';
        var ghdsData = ghdsText ? findGHDSServerByHostname(ghdsText) : null;
        if (ghdsData) {
            cdnGHDSSection.style.display = 'block';

            var cdnGHDSHostname = document.getElementById('cdnAssocGHDSHostname');
            var cdnGHDSIP = document.getElementById('cdnAssocGHDSIP');
            var cdnGHDSServerID = document.getElementById('cdnAssocGHDSServerID');
            var cdnGHDSSite = document.getElementById('cdnAssocGHDSSite');
            var cdnGHDSDesc = document.getElementById('cdnAssocGHDSDescription');
            var cdnGHDSLocation = document.getElementById('cdnAssocGHDSLocation');
            var cdnGHDSBridge = document.getElementById('cdnAssocGHDSBridgeService');

            if (cdnGHDSHostname) {
                var assocCDNGHDSInTree = isGHDSServerInTree(ghdsData);
                createNavigableValue(cdnGHDSHostname, ghdsData.name || '-', function() {
                    navigateToServer(ghdsData.id);
                }, !assocCDNGHDSInTree ? { disabled: true, tooltip: 'This Campus Hub node belongs to ' + ghdsData.site + ' and is not in the current campus tree' } : null);
            }
            if (cdnGHDSIP) cdnGHDSIP.textContent = ghdsData.ip || '-';
            if (cdnGHDSServerID) cdnGHDSServerID.textContent = ghdsData.id || '-';
            var cdnGHDSProxyURL = document.getElementById('cdnAssocGHDSProxyURL');
            _renderProxyURL(cdnGHDSProxyURL, ghdsData.proxyURL);
            if (cdnGHDSSite) {
                cdnGHDSSite.innerHTML = '';
                var isCrossSiteAssoc = ghdsData.site && ghdsData.site !== nodeData.site;
                if (isCrossSiteAssoc) {
                    var tag = document.createElement('span');
                    tag.className = 'tag tag--medium tag--primary';
                    tag.textContent = ghdsData.site;
                    cdnGHDSSite.appendChild(tag);
                } else {
                    cdnGHDSSite.textContent = ghdsData.site || '-';
                }
            }
            if (cdnGHDSDesc) cdnGHDSDesc.textContent = ghdsData.description || '-';
            if (cdnGHDSLocation) cdnGHDSLocation.textContent = ghdsData.location || '-';
            if (cdnGHDSBridge) cdnGHDSBridge.textContent = ghdsData.bridgeService ? 'ON' : 'OFF';
        } else {
            cdnGHDSSection.style.display = 'none';
        }
    }

    captureEditableSnapshot('cdn');
    _showPanelHostnameErrorIfOutdated('cdnHostname');
    _showPanelRequiredErrorsOnOpen();
    _syncProxyOpenButtons();
}

/**
 * Paint the Building Controller panel's Alert switch. Alert can be enabled on any Line
 * Node, with or without a Relay, so the switch is never disabled by the Relay.
 */
function _applyLinePGMState(pgmOn) {
    var pgmSwitch = document.getElementById('infoPGMService');
    if (!pgmSwitch) return;
    var pgmLabel = pgmSwitch.closest('.switch').querySelector('.switch__label');
    pgmSwitch.disabled = false;
    pgmSwitch.checked = !!pgmOn;
    if (pgmLabel) pgmLabel.textContent = pgmSwitch.checked ? 'On' : 'Off';
}

/**
 * Check if a building controller has associated Relay servers
 * @param {string} lineServerName - The name of the building controller
 * @returns {boolean}
 */
function checkLineServerHasCDN(lineServerName) {
    return findAssociatedCDNServers(lineServerName).length > 0;
}

/**
 * Find associated Campus Hub server for a building controller
 * @param {object} lineServerData - The building controller node data
 * @returns {object|null}
 */
function findAssociatedGHDSServer(lineServerData) {
    if (!lineServerData.ghdsAssociation || lineServerData.ghdsAssociation === 'Not assigned') {
        return null;
    }

    for (const site in ghdsServersData) {
        for (const project in ghdsServersData[site]) {
            const siteData = ghdsServersData[site][project];
            if (siteData.children) {
                for (const projectNode of siteData.children) {
                    if (projectNode.children) {
                        for (const ghdsServer of projectNode.children) {
                            if (lineServerData.ghdsAssociation.indexOf(ghdsServer.name) === 0) {
                                return ghdsServer;
                            }
                        }
                    }
                }
            }
        }
    }

    return null;
}

/**
 * The stored Relay record for an id.
 *
 * `findNodeById` returns the RENDERED node, which `buildAllServersTree` builds
 * with `Object.assign({}, cdn, { children: [] })` — a clone whose `children` is a
 * fresh array. Writing an association onto that clone updates the panel for one
 * repaint and is then thrown away. Every association write therefore has to
 * resolve the backing record first.
 */
function findCDNRecordById(cdnId) {
    if (!cdnId || typeof cdnServersData === 'undefined') return null;
    var found = null;
    Object.keys(cdnServersData).forEach(function(site) {
        var siteData = cdnServersData[site];
        if (found || !siteData) return;
        Object.keys(siteData).forEach(function(key) {
            var entry = siteData[key];
            if (found || !entry || !entry.children) return;
            entry.children.forEach(function(cdn) {
                if (!found && cdn.level === 'Timetable Relay' && cdn.id === cdnId) found = cdn;
            });
        });
    });
    return found;
}

/**
 * The first stored record for a building controller hostname, across every dataset
 * (active, archived, project-less). Unlike `findLineServerByName` this walks the
 * DATA, not the rendered tree, so it still resolves servers filtered out of view
 * — which the association cascades need, since they must stay consistent
 * regardless of what the user is currently looking at.
 */
function findLineServerRecord(hostname) {
    if (!hostname) return null;
    var found = null;

    function scan(dataSource) {
        if (found || !dataSource) return;
        Object.keys(dataSource).forEach(function(site) {
            var siteData = dataSource[site];
            if (found || !siteData) return;
            Object.keys(siteData).forEach(function(key) {
                var entry = siteData[key];
                if (found || !entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    (projNode.children || []).forEach(function(ls) {
                        if (!found && ls.level === 'Building Controller' && ls.name === hostname) found = ls;
                    });
                });
            });
        });
    }

    scan(typeof lineServersDataSets !== 'undefined' ? lineServersDataSets : null);
    scan(typeof archivedServersData !== 'undefined' ? archivedServersData : null);
    if (!found && typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            (orphanLineServersData[site] || []).forEach(function(ls) {
                if (!found && ls.name === hostname) found = ls;
            });
        });
    }
    return found;
}

/**
 * Find all associated Relay servers for a building controller
 * @param {string} lineServerName - The name of the building controller
 * @returns {Array}
 */
function findAssociatedCDNServers(lineServerName) {
    var results = [];
    for (const site in cdnServersData) {
        for (const project in cdnServersData[site]) {
            const siteData = cdnServersData[site][project];
            if (siteData.children) {
                for (const cdnNode of siteData.children) {
                    if (cdnNode.level === 'Timetable Relay' && cdnNode.associatedLineServers) {
                        if (cdnNode.associatedLineServers.indexOf(lineServerName) !== -1) {
                            results.push(cdnNode);
                        }
                    }
                }
            }
        }
    }
    return results;
}

/**
 * Building controller hostnames currently pointing at a Campus Hub server — the stored
 * `associatedLineServers` list plus a live scan of every building controller whose
 * `ghdsAssociation` names it (active, archived, and project-less). One source
 * for both the panel's ASSOCIATED LINE SERVERS section and the Hostname lock,
 * so what the user sees is exactly what blocks the rename.
 *
 * `activeOnly` drops building controllers that exist only as archived: an archived
 * server is out of service, so it must not block archiving the Campus Hub.
 */
function _ghdsAssociatedLineServers(ghdsNode, activeOnly) {
    var names = [];
    var archivedNames = [];
    var liveNames = [];
    if (!ghdsNode || !ghdsNode.name) return names;
    var host = ghdsNode.name;
    function add(name) {
        if (name && names.indexOf(name) === -1) names.push(name);
    }
    (ghdsNode.associatedLineServers || []).forEach(add);

    function scan(dataSource, bucket) {
        if (!dataSource) return;
        Object.keys(dataSource).forEach(function(site) {
            var siteData = dataSource[site];
            if (!siteData) return;
            Object.keys(siteData).forEach(function(key) {
                var entry = siteData[key];
                if (!entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    (projNode.children || []).forEach(function(ls) {
                        if (ls.ghdsAssociation && ls.ghdsAssociation.indexOf(host) === 0) { add(ls.name); bucket.push(ls.name); }
                    });
                });
            });
        });
    }
    scan(typeof lineServersDataSets !== 'undefined' ? lineServersDataSets : null, liveNames);
    scan(typeof archivedServersData !== 'undefined' ? archivedServersData : null, archivedNames);
    if (typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            (orphanLineServersData[site] || []).forEach(function(ls) {
                if (ls.ghdsAssociation && ls.ghdsAssociation.indexOf(host) === 0) {
                    add(ls.name);
                    // An archived project-less server is flagged in place; it is out of service.
                    (ls.archived ? archivedNames : liveNames).push(ls.name);
                }
            });
        });
    }
    if (activeOnly) {
        // Archived data is the only place a name may be archived; a name that
        // is also live elsewhere still counts.
        names = names.filter(function(n) {
            return archivedNames.indexOf(n) === -1 || liveNames.indexOf(n) !== -1;
        });
    }
    return names;
}

/**
 * A building controller's Hostname is locked while any project is associated with it:
 * projects reference the server by name, so a rename from the panel would break
 * them. Mirrors the ghDS rule in `_ghdsAssociatedLineServers` — same shape, a
 * different association axis.
 *
 * Only CURRENT projects count, so a project-less (orphan) building controller stays
 * renameable. Archived servers are never locked: the stored project history is
 * not a live reference, so the Hostname stays editable while archived.
 */
function _lineHostnameLocked(nodeData) {
    return !!nodeData && !nodeData.archived && (nodeData.associatedProjects || []).length > 0;
}

/**
 * A field the user cannot edit never blocks Save and never shows an error — it
 * is not a problem they can act on from this panel. Editability is read straight
 * off the DOM so the lock rules and the validation rules cannot drift apart.
 */
function _panelFieldEditable(el) {
    return !!el && !el.disabled;
}

/**
 * Connected servers a Campus Hub rename touches: Building Controllers (active and archived,
 * via `_ghdsAssociatedLineServers`) and Timetable Relays (via `findCDNServersForGHDS`,
 * de-duplicated by name).
 */
function _ghdsConnectedServers(ghdsNode) {
    var cdnNames = {};
    findCDNServersForGHDS(ghdsNode.name).forEach(function(c) { cdnNames[c.name] = true; });
    return {
        lineServers: _ghdsAssociatedLineServers(ghdsNode).length,
        cdnServers: Object.keys(cdnNames).length
    };
}

function findCDNServersForGHDS(ghdsHostname) {
    var results = [];
    if (!ghdsHostname) return results;
    for (var site in cdnServersData) {
        for (var project in cdnServersData[site]) {
            var siteData = cdnServersData[site][project];
            if (siteData.children) {
                for (var i = 0; i < siteData.children.length; i++) {
                    var node = siteData.children[i];
                    if (node.level === 'Timetable Relay' && node.ghdsAssociation === ghdsHostname) {
                        results.push(node);
                    }
                }
            }
        }
    }
    return results;
}

/**
 * Update Campus panel when the site node is selected. The Campus panel now
 * surfaces only the Configuration section (Registry Sync cascade); Campus Info
 * (site name + site type) was moved off — Node Type is per-line-server and
 * lives on the Building Controller panel.
 */
function updateSiteInfo(nodeData) {
    var detailsEmptyState = document.getElementById('detailsEmptyState');
    var detailsContent = document.getElementById('detailsContent');
    var settingsPanelFooter = document.getElementById('settingsPanelFooter');
    var lineServerSection = document.getElementById('lineServerInfoSection');
    var ghdsServerSection = document.getElementById('ghdsServerInfoSection');
    var cdnServerSection = document.getElementById('cdnServerInfoSection');
    var assocGHDSSection = document.getElementById('lineServerAssociatedGHDS');
    var assocCDNSection = document.getElementById('lineServerAssociatedCDN');

    if (detailsEmptyState) detailsEmptyState.style.display = 'none';
    if (detailsContent) detailsContent.style.display = 'block';
    if (settingsPanelFooter) settingsPanelFooter.style.display = 'flex';
    if (lineServerSection) lineServerSection.style.display = 'none';
    if (ghdsServerSection) ghdsServerSection.style.display = 'none';
    if (cdnServerSection) cdnServerSection.style.display = 'none';
    if (assocGHDSSection) assocGHDSSection.style.display = 'none';
    if (assocCDNSection) assocCDNSection.style.display = 'none';
    var lsConfigSec3 = document.getElementById('lineServerConfigSection');
    if (lsConfigSec3) lsConfigSec3.style.display = 'none';
    var siteConfigSecS = document.getElementById('siteConfigSection');
    if (siteConfigSecS) siteConfigSecS.style.display = 'block';
    var ghdsAssocLS3 = document.getElementById('ghdsAssociatedLSSection');
    var cdnAssocLS3 = document.getElementById('cdnAssociatedLSSection');
    if (ghdsAssocLS3) ghdsAssocLS3.style.display = 'none';
    if (cdnAssocLS3) cdnAssocLS3.style.display = 'none';
    var ghdsAssocCDN3 = document.getElementById('ghdsAssociatedCDNSection');
    var cdnAssocGHDS3 = document.getElementById('cdnAssociatedGHDSSection');
    if (ghdsAssocCDN3) ghdsAssocCDN3.style.display = 'none';
    if (cdnAssocGHDS3) cdnAssocGHDS3.style.display = 'none';

    // Registry Sync (site level) — reflects the site's visible building controllers
    // (non-archived, within the current filter scope): enabled (all on),
    // disabled (all off / none), or mixed (some on, some off).
    var siteFSN = document.getElementById('siteFSNApiCalls');
    if (siteFSN) {
        _applySiteFSNToggleUI(_siteFSNState(nodeData.site || nodeData.name));
    }
    _updateSiteFSNNotice(nodeData.site || nodeData.name);

    // A Campus selection is a bulk configuration of its building controllers, so the
    // header mirrors the bulk panel: "Bulk Configuration (N Building Controllers)".
    var siteLSIds = _lineServerIdsForSite(nodeData.id);
    var siteTitleEl = document.getElementById('settingsPanelTitle');
    if (siteTitleEl) {
        var lsCount = siteLSIds.length;
        siteTitleEl.textContent = 'Bulk Configuration (' + lsCount + ' Building Controller' + (lsCount === 1 ? '' : 's') + ')';
    }

    captureEditableSnapshot('site');
}

/**
 * The set of project codes within `lineServersDataSets[siteName]` that the
 * Faculties filter narrows the site to. Returns null when the filter is at its
 * default (all projects selected) so callers can skip the bucket check.
 */
function _siteScopedProjects(siteName) {
    var ds = (typeof lineServersDataSets !== 'undefined') ? lineServersDataSets[siteName] : null;
    if (!ds) return null;
    var avail = (typeof getAvailableProjectsForSites === 'function')
        ? getAvailableProjectsForSites([siteName])
        : Object.keys(ds);
    var sel = Array.isArray(selectedProjects) ? selectedProjects : [];
    var inDs = {};
    Object.keys(ds).forEach(function(pc) { inDs[pc] = true; });
    // Count only the selected projects that actually belong to THIS site.
    // Comparing the global selection count against this site's available count
    // wrongly reads a site as "not narrowed" when another site contributes more
    // selected projects — which surfaced an empty site's Asset Registry toggle as Enabled
    // instead of Unavailable. Return the per-site intersection (may be [] → the
    // site has zero building controllers in scope and correctly reads as empty).
    var scoped = sel.filter(function(pc) { return inDs[pc]; });
    if (avail.length === 0 || scoped.length >= avail.length) return null;
    return scoped;
}

/**
 * Read the tree-section Registry Sync filter dropdown. Returns 'all' (no
 * narrowing), 'enabled' (only LSs with fsnApiCalls truthy), or 'disabled'
 * (only LSs with fsnApiCalls explicitly false). Defaults to 'all' when the
 * dropdown is missing.
 */
function _siteFSNFilter() {
    var el = document.getElementById('filterFSN');
    var v = el ? el.value : 'all';
    return (v === 'enabled' || v === 'disabled') ? v : 'all';
}

/**
 * Refresh the site-panel notification copy so the user understands which line
 * servers the site-level Asset Registry toggle will cascade to. The copy varies by:
 *   - Whether the active filters narrow the site to zero building controllers (the
 *     toggle is unavailable — there's nothing to cascade to).
 *   - Whether the header has multiple sites selected ("this site" → "a site /
 *     that site" wording, since the user is browsing across sites).
 *   - Whether any tree filter (Faculties or Registry Sync) is narrowed
 *     (cascade is limited to the visible building controllers).
 */
function _updateSiteFSNNotice(siteName) {
    var el = document.getElementById('siteFSNApiCallsNotice');
    if (!el) return;
    if (_siteFSNState(siteName) === 'empty') {
        el.textContent = 'No building controllers match the current filters, so Registry Sync cannot be changed for this campus. Adjust the Faculties or Registry Sync filter to enable changes.';
        return;
    }
    var narrowed = !!_siteScopedProjects(siteName) || _siteFSNFilter() !== 'all';
    var multiSite = Array.isArray(selectedSites) && selectedSites.length > 1;
    if (narrowed) {
        el.textContent = multiSite
            ? 'Changing Registry Sync on a campus updates only the building controllers in that campus that match the current filters.'
            : 'Changing Registry Sync here updates only the building controllers in this campus that match the current filters.';
    } else {
        el.textContent = multiSite
            ? 'Changing Registry Sync on a campus updates every building controller in that campus. Use the filters to limit changes to a specific subset.'
            : 'Changing Registry Sync here updates every building controller in this campus. Use the filters to limit changes to a specific subset.';
    }
}

/**
 * The aggregate Registry Sync state of a site's visible building controllers (non-archived,
 * within the current tree filters): 'enabled' (all on), 'disabled'
 * (all off), 'mixed' (some on, some off), or 'empty' (filters narrow the site
 * to zero building controllers — toggle is unavailable). Reads the rendered tree, so
 * it tracks exactly the set the highlight cascade and Save cascade touch.
 */
function _siteFSNState(siteName) {
    var siteNode = _siteTreeNode(siteName);
    if (!siteNode) return 'empty';
    var lsNodes = _lineServerNodesForSite(siteNode.id);
    if (lsNodes.length === 0) return 'empty';
    var anyOn = false, anyOff = false;
    lsNodes.forEach(function(ls) {
        if (ls.fsnApiCalls === false) anyOff = true; else anyOn = true;
    });
    if (anyOn && anyOff) return 'mixed';
    return anyOn ? 'enabled' : 'disabled';
}

/**
 * Reflect the Asset Registry state on the site-level toggle: 'mixed' shows the
 * indeterminate (amber) state; 'empty' disables the input entirely (the
 * Faculties filter has narrowed the site to zero building controllers, so there is
 * nothing to cascade to); otherwise it's a normal on/off switch.
 */
function _applySiteFSNToggleUI(state) {
    var el = document.getElementById('siteFSNApiCalls');
    if (!el) return;
    el.disabled = (state === 'empty');
    el.indeterminate = (state === 'mixed');
    el.checked = (state === 'enabled');
    var label = el.closest('.switch').querySelector('.switch__label');
    if (label) {
        label.textContent = state === 'empty' ? 'Unavailable'
            : state === 'mixed' ? 'Mixed'
            : state === 'enabled' ? 'Enabled' : 'Disabled';
    }
}

/**
 * Read the current Asset Registry value of the site-level toggle from the DOM. Returns
 * 'empty' when the toggle is disabled (no building controllers in scope), so snapshot
 * and dirty-state checks treat the row as non-editable.
 */
function _currentSiteFSNState() {
    var el = document.getElementById('siteFSNApiCalls');
    if (!el) return 'disabled';
    if (el.disabled) return 'empty';
    if (el.indeterminate) return 'mixed';
    return el.checked ? 'enabled' : 'disabled';
}

/**
 * Cascade an Registry Sync value to every VISIBLE, non-archived building controller of
 * the site, exactly the set the tree shows under the current filters. Writes
 * through to whichever source dataset each server lives in (active →
 * lineServersDataSets, project-less → orphanLineServersData) so the value
 * survives a re-render. Archived building controllers are never a target.
 * Turning Asset Registry off removes each Asset Registry host; those Asset Registry refuses (FR-P2-30) are
 * skipped and returned as { name, site, error }, the rest are disabled.
 */
function _applySiteFSNToLineServers(siteName, value) {
    var refused = [];
    refused.written = 0;
    var siteNode = _siteTreeNode(siteName);
    if (!siteNode) return refused;
    var seen = {};
    _lineServerNodesForSite(siteNode.id).forEach(function(lsNode) {
        // A building controller in several projects appears once per project; count it once.
        if (seen[lsNode.id]) return;
        seen[lsNode.id] = true;
        if (!value) {
            var refusal = fsnRefusalDetail(lsNode, 'disable');
            if (refusal) { refused.push(refusal); return; }
        }
        refused.written++;
        var lsId = lsNode.id;
        forEachServerCopy(lineServersDataSets, lsId, function(srv) { srv.fsnApiCalls = value; });
        if (typeof forEachOrphanLineServerCopy === 'function') {
            forEachOrphanLineServerCopy(lsId, function(srv) { srv.fsnApiCalls = value; });
        }
    });
    return refused;
}

/**
 * Hide all server info sections (for non-server nodes like Campus, Faculty)
 */
function hideAllServerInfo() {
    var panelTitle = document.getElementById('settingsPanelTitle');
    if (panelTitle) panelTitle.textContent = 'Building Controller Details';
    // Nothing is selected, so nothing can be dirty: Manage and Create Node are usable again.
    if (typeof _setGlobalActionsEnabled === 'function') _setGlobalActionsEnabled(true);
    const detailsEmptyState = document.getElementById('detailsEmptyState');
    const detailsContent = document.getElementById('detailsContent');
    const settingsPanelFooter = document.getElementById('settingsPanelFooter');
    const lineServerSection = document.getElementById('lineServerInfoSection');
    const ghdsServerSection = document.getElementById('ghdsServerInfoSection');
    const cdnServerSection = document.getElementById('cdnServerInfoSection');
    const assocGHDSSection = document.getElementById('lineServerAssociatedGHDS');
    const assocCDNSection = document.getElementById('lineServerAssociatedCDN');

    if (detailsEmptyState) detailsEmptyState.style.display = 'flex';
    if (detailsContent) detailsContent.style.display = 'none';
    if (settingsPanelFooter) settingsPanelFooter.style.display = 'none';
    if (lineServerSection) lineServerSection.style.display = 'none';
    if (ghdsServerSection) ghdsServerSection.style.display = 'none';
    if (cdnServerSection) cdnServerSection.style.display = 'none';
    if (assocGHDSSection) assocGHDSSection.style.display = 'none';
    if (assocCDNSection) assocCDNSection.style.display = 'none';
    var lsConfigSec4 = document.getElementById('lineServerConfigSection');
    if (lsConfigSec4) lsConfigSec4.style.display = 'none';
    var siteConfigSecH = document.getElementById('siteConfigSection');
    if (siteConfigSecH) siteConfigSecH.style.display = 'none';
    var ghdsAssocLS4 = document.getElementById('ghdsAssociatedLSSection');
    var cdnAssocLS4 = document.getElementById('cdnAssociatedLSSection');
    if (ghdsAssocLS4) ghdsAssocLS4.style.display = 'none';
    if (cdnAssocLS4) cdnAssocLS4.style.display = 'none';

    // Hide manage menu
    if (typeof ManageActions !== 'undefined') ManageActions.hideMenu();

    // No selection → no Clear Selection affordance.
    var clearBtn = document.getElementById('bulkSelectionClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
}

// --- Associated Faculties Tags + Add Faculty ---

/**
 * Get archived project codes for a server by hostname on a given site
 * Scans archivedServersData for entries matching the server name
 */
function getArchivedProjectsForServer(site, serverName) {
    var archived = {};
    if (typeof archivedServersData === 'undefined' || !archivedServersData[site]) return archived;
    var siteData = archivedServersData[site];
    Object.keys(siteData).forEach(function(proj) {
        var entry = siteData[proj];
        if (!entry.children) return;
        entry.children.forEach(function(projNode) {
            if (!projNode.children) return;
            projNode.children.forEach(function(srv) {
                if (srv.name === serverName) archived[proj] = true;
            });
        });
    });
    return archived;
}

/**
 * Change the subheader project selection to match the server's associated projects
 */
function selectServerProjects(nodeData) {
    var activeProjects = nodeData.associatedProjects || [];
    if (activeProjects.length === 0) return;

    var dropdown = document.getElementById('projectSelectDropdown');
    if (!dropdown) return;

    // Uncheck all, then check only matching projects
    var checkboxes = dropdown.querySelectorAll('.checkbox__input[value]');
    selectedProjects = [];
    checkboxes.forEach(function(cb) {
        if (cb.id && cb.id.indexOf('SelectAll') !== -1) return;
        var label = cb.closest('.checkbox');
        if (label && label.style.display === 'none') return;
        if (activeProjects.indexOf(cb.value) !== -1) {
            cb.checked = true;
            selectedProjects.push(cb.value);
        } else {
            cb.checked = false;
        }
    });

    // Update Select All state
    var selectAll = dropdown.querySelector('#selectAllProjects');
    if (selectAll) {
        var total = 0, checked = 0;
        checkboxes.forEach(function(cb) {
            if (cb.id && cb.id.indexOf('SelectAll') !== -1) return;
            var label = cb.closest('.checkbox');
            if (label && label.style.display === 'none') return;
            total++;
            if (cb.checked) checked++;
        });
        selectAll.checked = checked === total;
        selectAll.indeterminate = checked > 0 && checked < total;
    }

    updateProjectSelectLabel();

    // Refresh tree and re-select the same node
    var nodeId = nodeData.id;
    if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
    if (nodeId) setTimeout(function() { if (typeof selectNode === 'function') selectNode(nodeId); }, 150);
}

/**
 * Render project tags into a container.
 * Active servers: show associatedProjects (tag--primary).
 * Archived servers: show ALL projects (active + archived) the server was ever on.
 */
function renderProjectTags(container, nodeData) {
    container.innerHTML = '';
    var projects;

    if (nodeData.archived) {
        // Archived building controllers show every project ever associated. Prefer
        // the explicit everAssociated history; fall back to the legacy union
        // of associatedProjects + archivedServersData keys for older nodes
        // that predate the field.
        if (nodeData.everAssociated && nodeData.everAssociated.length) {
            projects = nodeData.everAssociated.slice().sort();
        } else {
            var allProjects = {};
            (nodeData.associatedProjects || []).forEach(function(p) { allProjects[p] = true; });
            var archivedMap = getArchivedProjectsForServer(nodeData.site, nodeData.name);
            Object.keys(archivedMap).forEach(function(p) { allProjects[p] = true; });
            projects = Object.keys(allProjects).sort();
        }
    } else {
        projects = nodeData.associatedProjects && nodeData.associatedProjects.length > 0
            ? nodeData.associatedProjects.slice().sort() : (nodeData.project ? [nodeData.project] : []);
    }

    if (projects.length === 0) {
        var empty = document.createElement('span');
        empty.className = 'info-projects-empty';
        empty.textContent = 'No Faculties selected';
        container.appendChild(empty);
        return;
    }
    projects.forEach(function(code) {
        var tag = document.createElement('span');
        tag.className = 'tag tag--medium tag--gray';
        tag.textContent = code;
        container.appendChild(tag);
    });
}

/**
 * Check if a building controller hostname is fully archived (not active in any project)
 *
 * A project-less building controller lives in `orphanLineServersData`, not under any
 * project bucket, so scanning `lineServersDataSets` alone reports it as archived
 * — which would hide it from the Relay association checklist even though it is a
 * perfectly live server.
 */
function isServerFullyArchived(site, serverName) {
    // Check if the server exists in any active project
    if (lineServersDataSets[site]) {
        var keys = Object.keys(lineServersDataSets[site]);
        for (var i = 0; i < keys.length; i++) {
            var entry = lineServersDataSets[site][keys[i]];
            if (entry.children) {
                for (var j = 0; j < entry.children.length; j++) {
                    var projNode = entry.children[j];
                    if (projNode.children) {
                        for (var k = 0; k < projNode.children.length; k++) {
                            if (projNode.children[k].name === serverName) return false;
                        }
                    }
                }
            }
        }
    }
    if (typeof orphanLineServersData !== 'undefined' && orphanLineServersData[site]) {
        for (var o = 0; o < orphanLineServersData[site].length; o++) {
            if (orphanLineServersData[site][o].name === serverName) return !!orphanLineServersData[site][o].archived;
        }
    }
    return true; // Not found in active data
}

/**
 * Collect building controllers attached to the same Campus Hub as the Relay server
 * Excludes fully archived servers
 */
function getLineServersForCDN(nodeData, opts) {
    opts = opts || {};
    var ghdsHost = nodeData.ghdsAssociation || '';
    if (!ghdsHost) return [];

    var cdnSite = nodeData.site || '';

    // Find the Campus Hub server to get its associated building controllers
    for (var site in ghdsServersData) {
        for (var proj in ghdsServersData[site]) {
            var data = ghdsServersData[site][proj];
            if (data.children && data.children[0] && data.children[0].children) {
                for (var i = 0; i < data.children[0].children.length; i++) {
                    var ghds = data.children[0].children[i];
                    if (ghds.name === ghdsHost) {
                        // Live scan, active servers only: includes building controllers created or
                        // unarchived on this Campus Hub after load, and never an archived one.
                        var all = _ghdsAssociatedLineServers(ghds, true).slice().sort();
                        // Filter out fully archived servers, and any building controller
                        // already on ANOTHER Relay — one Relay per building controller
                        // (FR-P2-24), so it has to leave that one first.
                        // `opts.includeOtherCDN` keeps those, for lists that
                        // show them disabled with the Relay they are on.
                        return all.filter(function(name) {
                            if (isServerFullyArchived(cdnSite || site, name)) return false;
                            if (opts.includeOtherCDN) return true;
                            return findAssociatedCDNServers(name).every(function(c) { return c.id === nodeData.id; });
                        });
                    }
                }
            }
        }
    }
    return [];
}

/**
 * Building controller hostnames a Campus Hub server is allowed to serve — the candidate pool
 * behind the Campus Hub panel's Manage → Building Controllers drawer, and the mirror of
 * `getLineServersForCDN`.
 *
 * A building controller may point at a Campus Hub on its own site or at an NORT one (see
 * `getGHDSServersForSite`), so the reverse mapping is: a site-local Campus Hub offers
 * its own site's building controllers, an NORT Campus Hub offers every site's. Archived line
 * servers are out of service and excluded, matching the Relay side.
 */
function getLineServersForGHDS(ghdsNode) {
    var names = [];
    if (!ghdsNode || !ghdsNode.name) return names;

    // null scope = NORT, which every site's building controllers can point at.
    var scope = ghdsNode.site === 'NORT' ? null : ghdsNode.site;
    function inScope(site) { return scope === null || site === scope; }
    function add(name) { if (name && names.indexOf(name) === -1) names.push(name); }

    if (typeof lineServersDataSets !== 'undefined') {
        Object.keys(lineServersDataSets).forEach(function(site) {
            if (!inScope(site)) return;
            Object.keys(lineServersDataSets[site] || {}).forEach(function(key) {
                var entry = lineServersDataSets[site][key];
                if (!entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    (projNode.children || []).forEach(function(ls) {
                        if (ls.level === 'Building Controller' && !ls.archived) add(ls.name);
                    });
                });
            });
        });
    }
    if (typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            if (!inScope(site)) return;
            (orphanLineServersData[site] || []).forEach(function(ls) {
                if (!ls.archived) add(ls.name);
            });
        });
    }
    return names.sort();
}

// --- Save / Discard Changes Logic ---

// Stores the original values of editable fields when a server is selected
var _editableSnapshot = null;
var _snapshotServerType = null;

// Which fields the user has focused, keyed by element id. Governs whether a blur
// may raise a message — never whether the Save gate blocks. Reset whenever the
// panel goes pristine (see `_clearAllPanelFieldErrors`).
var _panelFieldTouched = {};

/**
 * Capture a snapshot of current editable field values
 * Called when a server is selected to store the "clean" state
 */
function captureEditableSnapshot(serverType) {
    _snapshotServerType = serverType;
    _clearAllPanelFieldErrors();

    if (serverType === 'line') {
        _editableSnapshot = {
            hostname: (document.getElementById('infoHostname') || {}).value || '',
            ip: (document.getElementById('infoIPAddress') || {}).value || '',
            serverType: (document.getElementById('infoServerType') || {}).value || '',
            ghdsHostname: (document.getElementById('infoGHDSSelect') || {}).value || '',
            cdnId: (document.getElementById('infoCDNSelect') || {}).value || '',
            proxyURL: (document.getElementById('infoProxyURL') || {}).value || '',
            description: (document.getElementById('infoDescription') || {}).value || '',
            location: (document.getElementById('infoLocation') || {}).value || '',
            pgmService: (document.getElementById('infoPGMService') || {}).checked ? 'on' : 'off',
            komodo: (document.getElementById('infoKomodo') || {}).checked || false,
            redPanda: (document.getElementById('infoRedPanda') || {}).checked || false,
            fsnApiCalls: (document.getElementById('infoFSNApiCalls') || {}).checked || false
        };
    } else if (serverType === 'ghds') {
        _editableSnapshot = {
            hostname: (document.getElementById('ghdsHostname') || {}).value || '',
            ip: (document.getElementById('ghdsIPAddress') || {}).value || '',
            description: (document.getElementById('ghdsDescription') || {}).value || '',
            location: (document.getElementById('ghdsLocation') || {}).value || '',
            bridgeService: (document.getElementById('ghBridgeService') || {}).checked || false
        };
    } else if (serverType === 'cdn') {
        _editableSnapshot = {
            hostname: (document.getElementById('cdnHostname') || {}).value || '',
            ip: (document.getElementById('cdnIPAddress') || {}).value || '',
            ghdsHostname: (document.getElementById('cdnGHDSSelect') || {}).value || '',
            proxyURL: (document.getElementById('cdnProxyURL') || {}).value || '',
            description: (document.getElementById('cdnDescription') || {}).value || '',
            location: (document.getElementById('cdnLocation') || {}).value || ''
        };
    } else if (serverType === 'site') {
        _editableSnapshot = {
            fsnState: _currentSiteFSNState()
        };
    }

    // The as-loaded value of every validated field, so the Save gate can tell
    // an edited field from one that was already invalid (see `_panelFieldChanged`).
    if (_editableSnapshot) {
        _editableSnapshot.fields = {};
        (PANEL_FIELD_RULES[serverType] || []).forEach(function(rule) {
            var el = document.getElementById(rule.id);
            _editableSnapshot.fields[rule.id] = el ? el.value : '';
        });
    }
    _resetPanelProxyBaseline();
    _panelProxyAutoValue = null;
    _refreshPanelProxyChangedNote();
    _refreshGHDSHostnameRenameNote();

    _setSaveDiscardEnabled(false);
    // A fresh snapshot means nothing is pending, so the scope-wide actions are
    // safe to use again.
    _setGlobalActionsEnabled(true);
}

/**
 * Restore editable fields to snapshot values
 */
function restoreEditableSnapshot() {
    if (!_editableSnapshot || !_snapshotServerType) return;

    if (_snapshotServerType === 'line') {
        var hn = document.getElementById('infoHostname');
        var ip = document.getElementById('infoIPAddress');
        var st = document.getElementById('infoServerType');
        var gh = document.getElementById('infoGHDSSelect');
        var px = document.getElementById('infoProxyURL');
        var d = document.getElementById('infoDescription');
        var l = document.getElementById('infoLocation');
        var p = document.getElementById('infoPGMService');
        var k = document.getElementById('infoKomodo');
        var r = document.getElementById('infoRedPanda');
        var f = document.getElementById('infoFSNApiCalls');
        if (hn) hn.value = _editableSnapshot.hostname;
        if (ip) ip.value = _editableSnapshot.ip;
        if (st) st.value = _editableSnapshot.serverType || '';
        if (gh) gh.value = _editableSnapshot.ghdsHostname || '';
        var restoreNode = selectedNodeId ? findNodeById(selectedNodeId) : null;
        if (restoreNode) _populateCDNSelect(restoreNode, _editableSnapshot.cdnId || '');
        if (px) px.value = _editableSnapshot.proxyURL;
        if (d) d.value = _editableSnapshot.description;
        if (l) l.value = _editableSnapshot.location;
        if (p) _applyLinePGMState(_editableSnapshot.pgmService === 'on');
        if (k) k.checked = _editableSnapshot.komodo;
        if (r) r.checked = _editableSnapshot.redPanda;
        if (f) {
            f.checked = _editableSnapshot.fsnApiCalls;
            var fLabel = f.closest('.switch').querySelector('.switch__label');
            if (fLabel) fLabel.textContent = f.checked ? 'Enabled' : 'Disabled';
        }
    } else if (_snapshotServerType === 'ghds') {
        var hn = document.getElementById('ghdsHostname');
        var ip = document.getElementById('ghdsIPAddress');
        var d = document.getElementById('ghdsDescription');
        var l = document.getElementById('ghdsLocation');
        var b = document.getElementById('ghBridgeService');
        if (hn) hn.value = _editableSnapshot.hostname;
        if (ip) ip.value = _editableSnapshot.ip;
        if (d) d.value = _editableSnapshot.description;
        if (l) l.value = _editableSnapshot.location;
        if (b) b.checked = _editableSnapshot.bridgeService;
    } else if (_snapshotServerType === 'cdn') {
        var hn = document.getElementById('cdnHostname');
        var ip = document.getElementById('cdnIPAddress');
        var gh = document.getElementById('cdnGHDSSelect');
        var px = document.getElementById('cdnProxyURL');
        var d = document.getElementById('cdnDescription');
        var l = document.getElementById('cdnLocation');
        if (hn) hn.value = _editableSnapshot.hostname;
        if (ip) ip.value = _editableSnapshot.ip;
        if (gh) gh.value = _editableSnapshot.ghdsHostname || '';
        if (px) px.value = _editableSnapshot.proxyURL;
        if (d) d.value = _editableSnapshot.description;
        if (l) l.value = _editableSnapshot.location;
    } else if (_snapshotServerType === 'site') {
        _applySiteFSNToggleUI(_editableSnapshot.fsnState);
    }

    // Values were restored programmatically, so no input events fired — clear the
    // Proxy URL note, re-flag an outdated hostname and empty required fields, and repaint warnings + open
    // buttons by hand.
    _clearAllPanelFieldErrors();
    if (_snapshotServerType === 'line') {
        var lineProxyNote = document.getElementById('infoProxyNote');
        if (lineProxyNote) lineProxyNote.textContent = '';
        _showPanelHostnameErrorIfOutdated('infoHostname');
    } else if (_snapshotServerType === 'ghds') {
        _showPanelHostnameErrorIfOutdated('ghdsHostname');
    } else if (_snapshotServerType === 'cdn') {
        var cdnProxyNote = document.getElementById('cdnProxyNote');
        if (cdnProxyNote) cdnProxyNote.textContent = '';
        _showPanelHostnameErrorIfOutdated('cdnHostname');
    }
    _resetPanelProxyBaseline();
    _panelProxyAutoValue = null;
    _refreshPanelProxyChangedNote();
    _refreshGHDSHostnameRenameNote();
    _showPanelRequiredErrorsOnOpen();
    _refreshAssociationNotes();
    _syncProxyOpenButtons();
}

/**
 * Repaint whichever Campus Hub-change warning belongs to the open panel. Cheap enough
 * to call unconditionally at every settle point.
 */
function _refreshAssociationNotes() {
    if (!selectedNodeId) return;
    var node = findNodeById(selectedNodeId);
    if (!node) return;
    if (_snapshotServerType === 'line') _refreshLineGHDSNote(node);
    else if (_snapshotServerType === 'cdn') _refreshCDNGHDSNote(node);
}

/**
 * Get the display name of the currently selected server
 */
function getSelectedServerName() {
    if (!selectedNodeId) return 'server';
    var node = findNodeById(selectedNodeId);
    return node ? node.name : 'server';
}

/**
 * Handle Save button click — commit all changes to data, then refresh
 */
function handleSaveClick(e) {
    // Bulk selection uses the same Save button to commit its configuration.
    if (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive && BulkMode.isBulkActive()) {
        BulkMode.save();
        return;
    }
    if (!_validatePanelRequiredFields()) return;
    // Asset Registry host removal (turning Asset Registry off, or renaming an Asset Registry-enabled server) can
    // be refused; nothing is saved when it is (FR-P2-30).
    var fsnError = _panelFSNRefusal();
    if (fsnError) {
        showToast(fsnError, 'error');
        return;
    }
    // A Campus Hub change that would strand associations asks first. The popover's
    // confirm button calls _commitPanelSave directly, so this gate runs once.
    if (_confirmGHDSChangeIfNeeded()) {
        // MDS closes every open .popover on any document click that didn't land
        // inside one — the click that just opened this would close it again on
        // the way up.
        if (e && e.stopPropagation) e.stopPropagation();
        return;
    }
    _commitPanelSave();
}

/**
 * The Asset Registry refusal the open Building Controller panel's Save would hit, or null. Turning
 * Registry Sync off removes the Asset Registry host, and so does changing the hostname of
 * an Asset Registry-enabled server (the host is deleted and re-created).
 */
function _panelFSNRefusal() {
    if (_snapshotServerType !== 'line' || !selectedNodeId) return null;
    var node = findNodeById(selectedNodeId);
    var fsnOff = !((document.getElementById('infoFSNApiCalls') || {}).checked);
    var hostname = ((document.getElementById('infoHostname') || {}).value || '').trim();
    var renamed = !!_editableSnapshot && hostname !== _editableSnapshot.hostname;
    if (fsnOff) return fsnHostRemovalError(node, 'disable');
    if (renamed) return fsnHostRemovalError(node, 'hostname');
    return null;
}

/**
 * The Campus Hub association about to be saved, and the associations it would strand.
 * Returns null when the open panel has no Campus Hub dropdown or nothing changed.
 */
function _pendingGHDSChange() {
    if (!_editableSnapshot) return null;
    var node = selectedNodeId ? findNodeById(selectedNodeId) : null;
    if (!node) return null;

    if (_snapshotServerType === 'line') {
        var next = (document.getElementById('infoGHDSSelect') || {}).value || '';
        if (next === (_editableSnapshot.ghdsHostname || '')) return null;
        var cdns = _staleCDNsForLineServer(node.name, next).map(function(c) { return c.name; });
        if (!cdns.length) return null;
        return {
            names: cdns,
            message: 'Changing the Campus Hub will remove the associated Relay node, ' +
                'because a Relay node can only serve Building Controllers on its own Campus Hub.'
        };
    }
    if (_snapshotServerType === 'cdn') {
        var nextCDN = (document.getElementById('cdnGHDSSelect') || {}).value || '';
        if (nextCDN === (_editableSnapshot.ghdsHostname || '')) return null;
        var lss = _staleLineServersForCDN(node, nextCDN);
        if (!lss.length) return null;
        return {
            names: lss,
            message: 'Changing the Campus Hub will detach all associated Building Controllers, ' +
                'because a Relay node can only serve Building Controllers on its own Campus Hub.'
        };
    }
    return null;
}

/** "a", "a and b", "a, b and c" — with each name bolded. */
function _joinNames(names) {
    var bold = names.map(function(n) { return '<strong>' + n + '</strong>'; });
    if (bold.length === 1) return bold[0];
    return bold.slice(0, -1).join(', ') + ' and ' + bold[bold.length - 1];
}

/**
 * What a pending Campus Hub Hostname change touches: the connected Building Controllers and Relay
 * Nodes ({ lineServers, cdnServers }). Null when the open panel is not a Campus Hub
 * with a changed Hostname and at least one connected server. The master Campus Hub
 * (hub.atrium.test) is never confirmed: it is shared by every site.
 */
function _pendingGHDSRename() {
    if (_snapshotServerType !== 'ghds' || !_editableSnapshot || !selectedNodeId) return null;
    var norm = function(v) { return String(v || '').trim().toLowerCase(); };
    var current = (document.getElementById('ghdsHostname') || {}).value || '';
    if (!norm(current) || norm(current) === norm(_editableSnapshot.hostname)) return null;
    if (norm(_editableSnapshot.hostname) === norm(MASTER_GHDS_HOSTNAME)) return null;
    var ghdsNode = null;
    forEachServerCopy(ghdsServersData, selectedNodeId, function(srv) { if (!ghdsNode) ghdsNode = srv; });
    var connected = ghdsNode ? _ghdsConnectedServers(ghdsNode) : { lineServers: 0, cdnServers: 0 };
    if (!connected.lineServers && !connected.cdnServers) return null;
    return connected;
}

/** Popover copy for the confirm buttons: Keep Editing / Yes, Save. */
function _setGHDSConfirmButtons(rename) {
    var cancel = document.getElementById('ghdsChangeConfirmCancel');
    var ok = document.getElementById('ghdsChangeConfirmBtn');
    var title = document.querySelector('#ghdsChangeConfirmPopover .popover__confirm-title');
    if (cancel) cancel.textContent = rename ? 'Keep Editing' : 'Cancel';
    if (ok) ok.textContent = rename ? 'Yes, Save' : 'Save Changes';
    if (title) title.textContent = rename ? 'Change Hostname' : 'Change Campus Hub';
    if (ok && !rename) ok.disabled = false;
}

/**
 * Open the Campus Hub Hostname popconfirm: a loading state while the connected Line
 * Nodes are looked up, then a warning, a counter and a collapsible list.
 */
function _confirmGHDSRename(pending) {
    var body = document.getElementById('ghdsChangeConfirmBody');
    var pop = document.getElementById('ghdsChangeConfirmPopover');
    if (!body || !pop) return false;
    _setGHDSConfirmButtons(true);
    var counts = _countServersLabel([].concat(
        new Array(pending.lineServers).fill({ type: 'Building Controller' }),
        new Array(pending.cdnServers).fill({ type: 'Timetable Relay' })));
    body.innerHTML =
        '<div class="proxy-changed-note" style="font-size: var(--font-size-xxs); margin-bottom: var(--space-s);">' +
        '<span class="proxy-changed-note__icon"><sf-symbol name="exclamationmark.triangle.fill" style="font-size:11px"></sf-symbol></span>' +
        '<span>Changing the hostname changes the Proxy URL of <strong>' + counts +
        '</strong> connected to this Campus Hub. ' +
        'Those whose Proxy URL isn\'t generated automatically must be updated manually.</span></div>';
    pop.style.display = 'block';
    pop.classList.add('popover--open');
    return true;
}

/**
 * Open the strand-warning popover when the pending Save needs it.
 * Returns true when the Save was intercepted.
 */
function _confirmGHDSChangeIfNeeded() {
    var rename = _pendingGHDSRename();
    if (rename) return _confirmGHDSRename(rename);
    var pending = _pendingGHDSChange();
    if (!pending) return false;
    var body = document.getElementById('ghdsChangeConfirmBody');
    var pop = document.getElementById('ghdsChangeConfirmPopover');
    if (!body || !pop) return false;
    _setGHDSConfirmButtons(false);
    body.innerHTML = '<p style="color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); margin: 0;">' +
        pending.message + '</p>';
    pop.style.display = 'block';
    pop.classList.add('popover--open');
    return true;
}

function _closeGHDSChangeConfirm() {
    var ok = document.getElementById('ghdsChangeConfirmBtn');
    if (ok) ok.disabled = false;
    var pop = document.getElementById('ghdsChangeConfirmPopover');
    if (!pop) return;
    pop.style.display = 'none';
    pop.classList.remove('popover--open');
}

// Building Controllers a Campus Hub rename left with a Proxy URL to fix by hand, announced once
// the "updated" toast has gone up.
var _renameNeedsManualProxy = [];

// Building controllers a Campus save wrote Asset Registry to, so the save toast can say how many.
// null when the save was not a Campus Asset Registry cascade.
var _siteCascadeWritten = null;

/** The actual Save, past validation and any confirmation. */
function _commitPanelSave() {
    _closeGHDSChangeConfirm();
    var savedType = _snapshotServerType;
    commitEditableFields();
    var typeLabels = { line: 'Building Controller', ghds: 'Campus Hub', cdn: 'Timetable Relay', site: 'Campus' };
    var label = typeLabels[_snapshotServerType] || 'Node';
    if (_siteCascadeWritten !== null) {
        // A Campus save is a bulk Asset Registry change: report it like one, and say nothing
        // when Asset Registry refused every server (the failure toast already did).
        var written = _siteCascadeWritten;
        _siteCascadeWritten = null;
        if (written > 0) showToast('Registry Sync applied to ' + written + ' Building Controller' + (written === 1 ? '' : 's'));
    } else {
        showToast(label + ' updated.');
    }
    notifyProxyURLsNeedingUpdate(_renameNeedsManualProxy);
    _renameNeedsManualProxy = [];
    captureEditableSnapshot(_snapshotServerType);

    // The Proxy URL open button's target settles here, against the freshly
    // captured snapshot, never while the user is typing.
    if (savedType === 'line') {
        var lineProxyNote = document.getElementById('infoProxyNote');
        if (lineProxyNote) lineProxyNote.textContent = '';
    } else if (savedType === 'cdn') {
        var cdnProxyNote = document.getElementById('cdnProxyNote');
        if (cdnProxyNote) cdnProxyNote.textContent = '';
    }
    _refreshAssociationNotes();
    _syncProxyOpenButtons();

    // Refresh tree to reflect changes (e.g. Node Type indicator) and re-select
    var nodeId = selectedNodeId;
    if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
    if (nodeId) {
        setTimeout(function() { if (typeof selectNode === 'function') selectNode(nodeId); }, 100);
    }
}

/**
 * Save-time backstop over the same rules the Save button is gated on. The gate
 * should already have kept the button disabled, so reaching a violation here
 * means a value was written programmatically without firing `input`. This is
 * also what FOCUSES the offending field and raises the toast — the gate stays
 * silent by design.
 */
function _validatePanelRequiredFields() {
    var violation = _firstPanelViolation();
    if (!violation) return true;

    var el = violation.el;
    if (violation.kind === 'required') {
        ProjFieldError.required(el, { label: violation.rule.label });
        if (typeof showToast !== 'undefined') showToast(violation.rule.label + ' is required.', 'error');
    } else if (violation.kind === 'outdated') {
        var outdatedMsg = _panelProxyOutdatedMessage(violation.rule.proxy);
        _showPanelFieldError(el, outdatedMsg);
        if (typeof showToast !== 'undefined') showToast(outdatedMsg, 'error');
    } else if (violation.kind === 'suffix') {
        _showPanelFieldError(el, 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
        if (typeof showToast !== 'undefined') showToast('Hostname must end with ' + SERVER_HOSTNAME_SUFFIX + '.', 'error');
    } else if (violation.kind === 'invalid') {
        ProjFieldError.invalid(el, { label: violation.rule.label });
        if (typeof showToast !== 'undefined') showToast('Enter a valid ' + violation.rule.label + '.', 'error');
    } else {
        var label = violation.rule.label;
        ProjFieldError.duplicate(el, { label: label });
        if (typeof showToast !== 'undefined') showToast(label + ' already in use. Please, try again with a different ' + label + '.', 'error');
    }
    el.focus();
    return false;
}

/**
 * Whether a hostname is taken by a server other than the one being edited.
 * Covers building controllers (active, archived, project-less), Campus Hub and Relay servers —
 * the same scope as the Create Node form's duplicate check.
 *
 * Self-exclusion keys off the server's *previous* hostname, not its node id: a
 * server exists as several copies (one per project, plus the read-only copies
 * nested under Relay nodes) that share a name but not always an id, and all of
 * them are renamed together on Save.
 */
function _hostnameInUse(hostname, previousHostname) {
    return _serverFieldInUse('name', hostname, previousHostname);
}

/**
 * `_hostnameInUse` for any server field — `field` is 'name' or 'ip'. Self-
 * exclusion works the same way: every copy of the edited server still carries
 * the previous value, and they all change together on Save.
 */
function _serverFieldInUse(field, value, previousValue) {
    if (!value) return false;
    var target = String(value).toLowerCase();
    var self = String(previousValue || '').toLowerCase();
    var found = false;

    function check(srv) {
        if (found || !srv || !srv[field]) return;
        var current = String(srv[field]).toLowerCase();
        if (current === self) return;
        if (current === target) found = true;
    }

    function walk(dataSource, level) {
        if (!dataSource) return;
        Object.keys(dataSource).forEach(function(site) {
            var siteData = dataSource[site];
            if (!siteData) return;
            Object.keys(siteData).forEach(function(key) {
                var entry = siteData[key];
                if (!entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    if (projNode.level === level) check(projNode);
                    (projNode.children || []).forEach(check);
                });
            });
        });
    }

    walk(typeof lineServersDataSets !== 'undefined' ? lineServersDataSets : null, 'Building Controller');
    walk(typeof archivedServersData !== 'undefined' ? archivedServersData : null, 'Building Controller');
    walk(typeof ghdsServersData !== 'undefined' ? ghdsServersData : null, 'Campus Hub');
    walk(typeof cdnServersData !== 'undefined' ? cdnServersData : null, 'Timetable Relay');
    if (typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            (orphanLineServersData[site] || []).forEach(check);
        });
    }
    return found;
}

/**
 * Commit editable field values back to the actual node data in all data sources
 */
function commitEditableFields() {
    if (!selectedNodeId || !_snapshotServerType) return;

    if (_snapshotServerType === 'line') {
        var hostname = ((document.getElementById('infoHostname') || {}).value || '').trim();
        var ip = ((document.getElementById('infoIPAddress') || {}).value || '').trim();
        var serverType = (document.getElementById('infoServerType') || {}).value || '';
        var ghdsHostname = (document.getElementById('infoGHDSSelect') || {}).value || '';
        var proxyURL = (document.getElementById('infoProxyURL') || {}).value || '';
        var description = (document.getElementById('infoDescription') || {}).value || '';
        var location = (document.getElementById('infoLocation') || {}).value || '';
        var pgm = (document.getElementById('infoPGMService') || {}).checked ? 'on' : 'off';
        var komodo = (document.getElementById('infoKomodo') || {}).checked || false;
        var redPanda = (document.getElementById('infoRedPanda') || {}).checked || false;
        var fsnApiCalls = (document.getElementById('infoFSNApiCalls') || {}).checked || false;

        var previousGHDS = _editableSnapshot ? (_editableSnapshot.ghdsHostname || '') : '';
        var ghdsChanged = ghdsHostname !== previousGHDS;

        // The stored association keeps its ` (<Type>)` suffix. Rebuild it from
        // the dropdown's bare hostname, tracking the Node Type the user has
        // selected — Relay records store the bare hostname instead, so the two
        // formats are produced in their own branches.
        var ghdsAssociation = ghdsHostname
            ? lineServerGHDSAssociationLabel(ghdsHostname, serverType)
            : '';

        // Proxy URL is persisted as the field holds it: the panel already
        // re-derived it when Hostname or Campus Hub changed (`_autoUpdatePanelProxy`).

        // Moving to another Campus Hub strands every Relay membership on the old one and
        // every project the new one doesn't grant, so those go first.
        if (ghdsChanged) {
            // Cascade under the name the server still has in every list; the rename below rewrites them.
            _applyLineServerGHDSChange(findNodeById(selectedNodeId), previousGHDS, ghdsHostname,
                (_editableSnapshot && _editableSnapshot.hostname) || hostname);
        }

        function _writeLine(srv) {
            srv.name = hostname;
            srv.ip = ip;
            srv.serverType = serverType;
            srv.ghdsAssociation = ghdsAssociation;
            // A URL typed over the one a Campus Hub rename left stale ends the flag.
            if (_editableSnapshot && proxyURL !== _editableSnapshot.proxyURL) srv.proxyOutdated = false;
            srv.proxyURL = proxyURL;
            srv.description = description;
            srv.location = location;
            srv.pgmService = pgm;
            srv.komodo = komodo;
            srv.redPanda = redPanda;
            // Archived copies keep their Configuration editable — persist the
            // toggle value like any other copy.
            srv.fsnApiCalls = fsnApiCalls;
        }
        forEachServerCopy(lineServersDataSets, selectedNodeId, _writeLine);
        forEachServerCopy(archivedServersData, selectedNodeId, _writeLine);
        forEachOrphanLineServerCopy(selectedNodeId, _writeLine);

        var oldHostname = _editableSnapshot ? _editableSnapshot.hostname : '';
        if (oldHostname && hostname !== oldHostname) {
            propagateLineServerRename(oldHostname, hostname);
        }

        // Relay Association (FR-P2-24): at most one Relay, so leaving the old one
        // and joining the new one is a single swap. Runs after the rename so
        // every Relay list already carries the new hostname.
        var cdnId = (document.getElementById('infoCDNSelect') || {}).value || '';
        var previousCDN = _editableSnapshot ? (_editableSnapshot.cdnId || '') : '';
        if (cdnId !== previousCDN) {
            findAssociatedCDNServers(hostname).forEach(function(cdn) { detachLineServerFromCDN(cdn, hostname); });
            var newCDN = cdnId ? findCDNRecordById(cdnId) : null;
            var lsRecord = findLineServerRecord(hostname);
            if (newCDN && lsRecord) attachLineServerToCDN(newCDN, lsRecord);
        }
    } else if (_snapshotServerType === 'ghds') {
        var hostname = ((document.getElementById('ghdsHostname') || {}).value || '').trim();
        var ip = ((document.getElementById('ghdsIPAddress') || {}).value || '').trim();
        var description = (document.getElementById('ghdsDescription') || {}).value || '';
        var location = (document.getElementById('ghdsLocation') || {}).value || '';
        var bridgeService = (document.getElementById('ghBridgeService') || {}).checked || false;

        forEachServerCopy(ghdsServersData, selectedNodeId, function(srv) {
            srv.name = hostname;
            srv.ip = ip;
            srv.description = description;
            srv.location = location;
            srv.bridgeService = bridgeService;
        });

        var oldGHDSHostname = _editableSnapshot ? _editableSnapshot.hostname : '';
        if (oldGHDSHostname && hostname !== oldGHDSHostname) {
            _renameNeedsManualProxy = propagateGHDSRename(oldGHDSHostname, hostname);
        }
    } else if (_snapshotServerType === 'cdn') {
        var hostname = ((document.getElementById('cdnHostname') || {}).value || '').trim();
        var ip = ((document.getElementById('cdnIPAddress') || {}).value || '').trim();
        var ghdsHostname = (document.getElementById('cdnGHDSSelect') || {}).value || '';
        var proxyURL = (document.getElementById('cdnProxyURL') || {}).value || '';
        var description = (document.getElementById('cdnDescription') || {}).value || '';
        var location = (document.getElementById('cdnLocation') || {}).value || '';

        var previousCDNGHDS = _editableSnapshot ? (_editableSnapshot.ghdsHostname || '') : '';
        var cdnNode = findNodeById(selectedNodeId);

        // Proxy URL is persisted as the field holds it: the panel already
        // re-derived it when Hostname or Campus Hub changed (`_autoUpdatePanelProxy`).

        forEachServerCopy(cdnServersData, selectedNodeId, function(srv) {
            srv.name = hostname;
            srv.ip = ip;
            // Relay servers store the BARE hostname — no ` (<Type>)` suffix.
            srv.ghdsAssociation = ghdsHostname;
            if (_editableSnapshot && proxyURL !== _editableSnapshot.proxyURL) srv.proxyOutdated = false;
            srv.proxyURL = proxyURL;
            srv.description = description;
            srv.location = location;
        });

        // Detach the building controllers the move stranded. Runs after the write above
        // so the Relay already reports its new Campus Hub.
        if (ghdsHostname !== previousCDNGHDS && cdnNode) {
            _applyCDNGHDSChange(cdnNode, ghdsHostname);
        }
    } else if (_snapshotServerType === 'site') {
        var node = findNodeById(selectedNodeId);
        if (node) {
            var siteName = node.site || node.name;

            // Cascade the site-level Registry Sync toggle to every visible
            // building controller of the site. Only applies when the user actually
            // changed it to a definite on/off value (a still-"mixed" toggle
            // leaves servers as they are). Archived building controllers are never
            // part of the site scope.
            var prevState = _editableSnapshot ? _editableSnapshot.fsnState : undefined;
            var curState = _currentSiteFSNState();
            if (curState !== prevState && curState !== 'mixed' && curState !== 'empty') {
                var refused = _applySiteFSNToLineServers(siteName, curState === 'enabled');
                _siteCascadeWritten = refused.written;
                notifyFSNFailures(refused);
            }
            if (curState !== prevState && curState !== 'mixed' && curState !== 'empty') {
                if (typeof reRenderTree === 'function') reRenderTree();
            }
        }
    }
}

// --- Association cascades ---
//
// Campus Hub associations are stored as hostname strings on both sides: a building controller
// (or Relay) names its Campus Hub, and the Campus Hub keeps a reciprocal `associatedLineServers`
// list. Nothing keeps the two halves in step automatically, so every write that
// moves an association has to fix both ends — and clean up whatever the move
// invalidated. These helpers are the only place that happens.

/**
 * Detach a building controller from a Relay, on both sides of the record: the Relay's flat
 * `associatedLineServers` list (what the side panel renders) and its nested
 * child copy (what the tree renders). Dropping only one leaves the two views
 * disagreeing about the same association.
 */
function detachLineServerFromCDN(cdnNode, hostname) {
    var cdn = (cdnNode && findCDNRecordById(cdnNode.id)) || cdnNode;
    if (!cdn) return;
    cdn.associatedLineServers = (cdn.associatedLineServers || []).filter(function(n) { return n !== hostname; });
    cdn.children = (cdn.children || []).filter(function(c) { return c.name !== hostname; });
}

/**
 * Attach a building controller to a Relay, writing both representations described above.
 * The nested copy mirrors the shape of the seed data's `cdn-ls-*` nodes: enough
 * for the tree and the associated-servers list, not a full building controller record.
 */
function attachLineServerToCDN(cdnNode, lineServer) {
    var cdn = (cdnNode && findCDNRecordById(cdnNode.id)) || cdnNode;
    if (!cdn || !lineServer) return;
    if (!cdn.associatedLineServers) cdn.associatedLineServers = [];
    if (cdn.associatedLineServers.indexOf(lineServer.name) === -1) {
        cdn.associatedLineServers.push(lineServer.name);
    }
    if (!cdn.children) cdn.children = [];
    if (!cdn.children.some(function(c) { return c.name === lineServer.name; })) {
        cdn.children.push({
            id: 'cdn-ls-' + cdn.id + '-' + lineServer.id,
            name: lineServer.name,
            site: lineServer.site,
            associatedProjects: (lineServer.associatedProjects || []).slice(),
            type: 'Building Controller',
            level: 'Building Controller',
            ip: lineServer.ip,
            status: lineServer.status || 'active',
            ghdsAssociation: lineServer.ghdsAssociation || '',
            children: []
        });
    }
}

/**
 * Soft-remove one project association from a building controller. The server disappears
 * from that project's branch of the tree and from its own project tags, but
 * `everAssociated` keeps the project so the archive views can still replay the
 * full history (FR-DS-02). `archivedServersData` is untouched — the server
 * itself is not archived, only the association is dropped.
 *
 * Shared with `manage-actions.js`, whose Manage Faculties flow removes projects
 * the same way; both must agree or the two paths leave different residue.
 */
function removeLineServerFromProject(site, node, project) {
    if (typeof lineServersDataSets !== 'undefined' && lineServersDataSets[site] && lineServersDataSets[site][project]) {
        var entry = lineServersDataSets[site][project];
        if (entry.children && entry.children[0] && entry.children[0].children) {
            entry.children[0].children = entry.children[0].children.filter(function(s) { return s.id !== node.id; });
        }
    }
    forEachServerCopy(lineServersDataSets, node.id, function(srv) {
        srv.associatedProjects = (srv.associatedProjects || []).filter(function(p) { return p !== project; });
    });
}

/**
 * The projects on a building controller that a Campus Hub does **not** grant access to.
 *
 * A project is available to a building controller only where the Campus and the Campus Hub both
 * offer it — the Campus Hub's `associatedProjects` is that grant (see
 * `ghdsGrantedProjects` / `_backfillGHDSProjects` in config-data.js). Moving a
 * building controller to a Campus Hub that doesn't carry one of its projects leaves that
 * association pointing at something the new Campus Hub can't serve, so it goes.
 */
function _staleProjectsForLineServer(node, newGHDSHostname) {
    var granted = (typeof ghdsGrantedProjects === 'function') ? ghdsGrantedProjects(newGHDSHostname) : [];
    return (node.associatedProjects || []).filter(function(p) { return granted.indexOf(p) === -1; });
}

/**
 * Park a building controller in the project-less bucket so it stays visible in the tree.
 *
 * A building controller is stored once per associated project; strip the last one and
 * there is no copy left anywhere and the server silently vanishes. The orphan
 * bucket is where `insertLineServer` puts a project-less create and where
 * unarchive restores one, and `buildAllServersTree` surfaces it with the
 * "No Faculties selected" hint.
 */
function _parkAsOrphanLineServer(node) {
    if (typeof orphanLineServersData === 'undefined') return;
    var site = node.site;
    if (!orphanLineServersData[site]) orphanLineServersData[site] = [];
    if (orphanLineServersData[site].some(function(s) { return s.id === node.id; })) return;
    orphanLineServersData[site].push(Object.assign({}, node, {
        project: null,
        associatedProjects: [],
        children: []
    }));
}

/**
 * Move a building controller between Campus Hub servers: swap it out of the old Campus Hub's
 * reciprocal list into the new one's, drop the projects the new Campus Hub doesn't
 * grant, drop the Relay memberships the move invalidated (a Relay only serves line
 * servers on its own Campus Hub) and settle Alert. The building controller's own
 * `ghdsAssociation` is written by the caller.
 */
function _applyLineServerGHDSChange(node, oldGHDSHostname, newGHDSHostname, hostname) {
    if (!hostname) return;

    var oldGHDS = oldGHDSHostname ? findGHDSServerByHostname(oldGHDSHostname) : null;
    if (oldGHDS && oldGHDS.associatedLineServers) {
        oldGHDS.associatedLineServers = oldGHDS.associatedLineServers.filter(function(n) { return n !== hostname; });
    }
    var newGHDS = newGHDSHostname ? findGHDSServerByHostname(newGHDSHostname) : null;
    if (newGHDS) {
        if (!newGHDS.associatedLineServers) newGHDS.associatedLineServers = [];
        if (newGHDS.associatedLineServers.indexOf(hostname) === -1) newGHDS.associatedLineServers.push(hostname);
    }

    // Faculties the new Campus Hub doesn't grant. Done BEFORE the caller writes the
    // remaining fields, so a server that loses its last project is already in
    // the orphan bucket and still picks those writes up.
    // An archived server keeps its project history intact; only an active one loses projects.
    if (node && !node.archived) {
        var staleProjects = _staleProjectsForLineServer(node, newGHDSHostname);
        if (staleProjects.length) {
            var remaining = (node.associatedProjects || []).filter(function(p) { return staleProjects.indexOf(p) === -1; });
            if (remaining.length === 0) _parkAsOrphanLineServer(node);
            staleProjects.forEach(function(project) {
                removeLineServerFromProject(node.site, node, project);
            });
            forEachOrphanLineServerCopy(node.id, function(srv) { srv.associatedProjects = remaining.slice(); });
            // The panel's own copy drives the repaint that follows Save.
            node.associatedProjects = remaining.slice();
        }
    }

    _staleCDNsForLineServer(hostname, newGHDSHostname).forEach(function(cdn) {
        detachLineServerFromCDN(cdn, hostname);
    });
}

/**
 * The mirror case: a Relay moved to another Campus Hub, so every building controller on it that
 * stayed behind is detached. The Relay's own `ghdsAssociation` is written by the
 * caller.
 */
function _applyCDNGHDSChange(cdnNode, newGHDSHostname) {
    var stale = _staleLineServersForCDN(cdnNode, newGHDSHostname);
    stale.forEach(function(name) { detachLineServerFromCDN(cdnNode, name); });
}

/**
 * Re-home a building controller onto another Campus Hub — or onto none — from outside its own
 * side panel. Both directions of the Campus Hub panel's Manage → Building Controllers drawer
 * go through here: an add moves the server onto this Campus Hub, a remove clears its
 * association, which is the same "Not assigned" state the Building Controller panel's
 * dropdown offers.
 *
 * `commitEditableFields` does this inline for the panel path, in the same order:
 * run the cascade first, then write the association onto every stored copy. The
 * Proxy URL — this drawer path has no field, so it re-derives here — is rewritten
 * when the stored value is empty or still matches what the OLD Campus Hub generated;
 * any other value is left as it stands.
 */
function moveLineServerToGHDS(hostname, newGHDSHostname) {
    var ls = findLineServerRecord(hostname);
    if (!ls) return;

    var oldGHDSHostname = ghdsHostnameFromAssociation(ls.ghdsAssociation);
    if (oldGHDSHostname === newGHDSHostname) return;

    var storedProxyURL = ls.proxyURL || '';
    var wasDerived = !storedProxyURL
        || storedProxyURL === deriveLineServerProxyURL(hostname, oldGHDSHostname);
    var newProxyURL = deriveLineServerProxyURL(hostname, newGHDSHostname);

    // Reciprocal lists, projects the new Campus Hub doesn't grant, Relay memberships the
    // move invalidated, and Alert — all before the writes below, so a server that
    // loses its last project is already parked as an orphan and still picks them up.
    _applyLineServerGHDSChange(ls, oldGHDSHostname, newGHDSHostname, hostname);

    var association = newGHDSHostname
        ? lineServerGHDSAssociationLabel(newGHDSHostname, ls.serverType)
        : '';

    function write(srv) {
        srv.ghdsAssociation = association;
        if (!wasDerived) return;
        // With no Campus Hub there is nothing to derive from, so a derived URL goes
        // with it rather than being left pointing at the old server. A hostname
        // the new Campus Hub's rule cannot parse leaves the field as-is (`FR-P2-14a`).
        if (!newGHDSHostname) { srv.proxyURL = ''; srv.proxyOutdated = false; }
        else if (newProxyURL) { srv.proxyURL = newProxyURL; srv.proxyOutdated = false; }
    }
    forEachServerCopy(lineServersDataSets, ls.id, write);
    forEachServerCopy(archivedServersData, ls.id, write);
    forEachOrphanLineServerCopy(ls.id, write);
}

/**
 * Iterate all copies of a server by ID across a data source and apply a callback
 */
function forEachServerCopy(dataSource, nodeId, callback) {
    if (!dataSource) return;
    Object.keys(dataSource).forEach(function(site) {
        var siteData = dataSource[site];
        if (!siteData) return;
        Object.keys(siteData).forEach(function(key) {
            var entry = siteData[key];
            if (!entry || !entry.children) return;
            entry.children.forEach(function(projNode) {
                if (projNode.id === nodeId) { callback(projNode); return; }
                if (projNode.children) {
                    projNode.children.forEach(function(srv) {
                        if (srv.id === nodeId) callback(srv);
                    });
                }
            });
        });
    });
}

// Walks the project-less building controller bucket (flat array per site) and applies
// the callback to any copy matching nodeId. Mirrors forEachServerCopy for the
// shape used by orphanLineServersData.
function forEachOrphanLineServerCopy(nodeId, callback) {
    if (typeof orphanLineServersData === 'undefined') return;
    Object.keys(orphanLineServersData).forEach(function(site) {
        (orphanLineServersData[site] || []).forEach(function(srv) {
            if (srv.id === nodeId) callback(srv);
        });
    });
}

/**
 * Rewrite every reference to a renamed building controller. Associations are stored as
 * hostname strings, not ids, so a rename that only touched the building controller's
 * own copies would leave Campus Hub/Relay pointing at a server that no longer exists.
 * Covers the `associatedLineServers` lists on Campus Hub and Relay servers plus the
 * read-only building controller copies nested under Relay nodes.
 */
function propagateLineServerRename(oldName, newName) {
    function replaceInList(arr) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i] === oldName) arr[i] = newName;
        }
    }

    function walkServers(dataSource) {
        if (!dataSource) return;
        Object.keys(dataSource).forEach(function(site) {
            var siteData = dataSource[site];
            if (!siteData) return;
            Object.keys(siteData).forEach(function(key) {
                var entry = siteData[key];
                if (!entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    if (projNode.associatedLineServers) replaceInList(projNode.associatedLineServers);
                    (projNode.children || []).forEach(function(srv) {
                        if (srv.associatedLineServers) replaceInList(srv.associatedLineServers);
                        // Building controller copies nested under a Relay node
                        if (srv.level === 'Building Controller' && srv.name === oldName) srv.name = newName;
                        (srv.children || []).forEach(function(child) {
                            if (child.level === 'Building Controller' && child.name === oldName) child.name = newName;
                        });
                    });
                });
            });
        });
    }

    walkServers(ghdsServersData);
    walkServers(cdnServersData);
}

/**
 * Rewrite every reference to a renamed Campus Hub server. Building controllers store the
 * association as `<hostname> (<Type>)` and Relay servers as the bare hostname,
 * so only the hostname prefix is swapped and any suffix is preserved. The
 * prefix must be the WHOLE hostname (bare, or followed by the ` (<Type>)`
 * suffix) so renaming `x.campus.test` never touches `x.campus.test.cn`. Line
 * servers (active, archived, project-less) and Relay servers are all rewritten.
 */
function propagateGHDSRename(oldName, newName) {
    var needsManual = [];
    var seen = {};
    // Every connected Line and Timetable Relay is affected. One whose Proxy URL is generated
    // follows the new hostname; one whose URL is not (typed by hand, or a hostname
    // the generator can't parse) keeps it and is flagged `proxyOutdated` so the
    // tree and the panel ask for a manual update.
    function rename(srv) {
        var assoc = srv && srv.ghdsAssociation;
        if (assoc && (assoc === oldName || assoc.indexOf(oldName + ' ') === 0)) {
            var isCDN = srv.level === 'Timetable Relay';
            var tracked = srv.level === 'Building Controller' || isCDN;
            var automatic = tracked && isProxyURLAutomatic(srv, oldName);
            var manual = tracked && proxyURLNeedsManualUpdate(srv, oldName);
            srv.ghdsAssociation = newName + assoc.slice(oldName.length);
            if (automatic) {
                srv.proxyURL = (isCDN ? deriveCDNProxyURL : deriveLineServerProxyURL)(srv.name, newName);
                srv.proxyOutdated = false;
            } else if (manual) {
                srv.proxyOutdated = true;
                // Keyed by type + name: Relay records nest Building Controller copies.
                var key = srv.level + '|' + srv.name;
                if (!seen[key]) {
                    seen[key] = true;
                    needsManual.push({ type: srv.level, name: srv.name, site: srv.site, proxyURL: srv.proxyURL });
                }
            }
        }
    }

    function walk(dataSource) {
        if (!dataSource) return;
        Object.keys(dataSource).forEach(function(site) {
            var siteData = dataSource[site];
            if (!siteData) return;
            Object.keys(siteData).forEach(function(key) {
                var entry = siteData[key];
                if (!entry || !entry.children) return;
                entry.children.forEach(function(projNode) {
                    rename(projNode);
                    (projNode.children || []).forEach(function(srv) {
                        rename(srv);
                        (srv.children || []).forEach(rename);
                    });
                });
            });
        });
    }

    walk(typeof lineServersDataSets !== 'undefined' ? lineServersDataSets : null);
    walk(typeof archivedServersData !== 'undefined' ? archivedServersData : null);
    walk(typeof cdnServersData !== 'undefined' ? cdnServersData : null);
    if (typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            (orphanLineServersData[site] || []).forEach(rename);
        });
    }
    return needsManual;
}

/**
 * Close the Discard Changes confirmation popover. MDS opens popovers by
 * setting BOTH the `popover--open` class AND inline `style.display = "block"`,
 * so closing requires resetting both — clearing only the class leaves the
 * popover visible via the inline style.
 */
function _closeDiscardConfirmPopover() {
    var popover = document.getElementById('discardConfirmPopover');
    if (!popover) return;
    popover.style.display = 'none';
    popover.classList.remove('popover--open');
}

/**
 * Handle discard confirmation — restore snapshot and close popover
 */
function handleDiscardConfirm() {
    _closeDiscardConfirmPopover();
    // Bulk selection reverts its pending switch edits instead of a snapshot.
    if (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive && BulkMode.isBulkActive()) {
        BulkMode.discard();
        _setSaveDiscardEnabled(false);
        _setGlobalActionsEnabled(true);
        return;
    }
    restoreEditableSnapshot();
    _setSaveDiscardEnabled(false);
    _setGlobalActionsEnabled(true);
}

/**
 * Initialize Save/Discard button event listeners
 */
function initSaveDiscardButtons() {
    var saveBtn = document.getElementById('saveBtn');
    var discardConfirmBtn = document.getElementById('discardConfirmBtn');
    var discardConfirmCancel = document.getElementById('discardConfirmCancel');

    if (saveBtn) saveBtn.addEventListener('click', handleSaveClick);
    if (discardConfirmBtn) discardConfirmBtn.addEventListener('click', handleDiscardConfirm);
    if (discardConfirmCancel) discardConfirmCancel.addEventListener('click', _closeDiscardConfirmPopover);

    var ghdsChangeConfirmBtn = document.getElementById('ghdsChangeConfirmBtn');
    var ghdsChangeConfirmCancel = document.getElementById('ghdsChangeConfirmCancel');
    if (ghdsChangeConfirmBtn) ghdsChangeConfirmBtn.addEventListener('click', _commitPanelSave);
    if (ghdsChangeConfirmCancel) ghdsChangeConfirmCancel.addEventListener('click', _closeGHDSChangeConfirm);

    // Validation messages on the details panels. The Save gate reads the same
    // rules independently (`_panelIsValid`), so this layer only decides WHEN a
    // message is allowed on screen.
    _allPanelFieldRules().forEach(function(rule) {
        var input = document.getElementById(rule.id);
        if (!input) return;

        function paint(violation) {
            if (!violation) { _clearPanelFieldError(input); return; }
            if (violation.kind === 'required') ProjFieldError.required(input, { label: rule.label });
            else if (violation.kind === 'outdated') _showPanelFieldError(input, _panelProxyOutdatedMessage(rule.proxy));
            else if (violation.kind === 'suffix') _showPanelFieldError(input, 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
            else if (violation.kind === 'invalid') ProjFieldError.invalid(input, { label: rule.label });
            else ProjFieldError.duplicate(input, { label: rule.label });
        }

        input.addEventListener('focus', function() { _panelFieldTouched[rule.id] = true; });

        // On leaving a field the user has visited, say everything that is wrong.
        input.addEventListener('blur', function() {
            if (!_panelFieldTouched[rule.id]) return;
            paint(_panelFieldViolation(rule));
            _refreshSaveDiscardState();
        });

        // While typing, messages soften but never harden: an emptied field is
        // normal mid-edit so `required` stays quiet, but a duplicate keeps its
        // message for as long as it is still a duplicate. Clearing it while the
        // gate still blocks Save is what makes the button look stuck.
        var liveEvent = rule.choice ? 'change' : 'input';
        input.addEventListener(liveEvent, function() {
            _panelFieldTouched[rule.id] = true;
            var violation = _panelFieldViolation(rule);
            if (!violation || violation.kind !== 'required') paint(violation);
            _refreshSaveDiscardState();
        });
    });

    // Dirty-state tracking — disable Save/Discard until any editable field changes
    var dirtyTextIds = ['infoHostname', 'infoIPAddress', 'infoProxyURL', 'infoDescription', 'infoLocation',
                        'ghdsHostname', 'ghdsIPAddress', 'ghdsDescription', 'ghdsLocation',
                        'cdnHostname', 'cdnIPAddress', 'cdnProxyURL', 'cdnDescription', 'cdnLocation'];
    var dirtyToggleIds = ['infoPGMService', 'infoKomodo', 'infoRedPanda',
                          'infoFSNApiCalls', 'siteFSNApiCalls', 'ghBridgeService'];
    var dirtySelectIds = ['infoServerType', 'infoGHDSSelect', 'infoCDNSelect', 'cdnGHDSSelect'];

    dirtyTextIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', _refreshSaveDiscardState);
    });
    dirtyToggleIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', _refreshSaveDiscardState);
    });
    dirtySelectIds.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('change', _refreshSaveDiscardState);
    });

    // Proxy URL follows its Hostname automatically, re-derived when the user
    // leaves the field (`change`, not every keystroke — a half-typed hostname
    // would flash the outdated error). The Campus Hub dropdowns re-derive below.
    ['line', 'cdn'].forEach(function(kind) {
        var host = document.getElementById(PANEL_PROXY_IDS[kind].host);
        if (host) host.addEventListener('change', function() {
            _autoUpdatePanelProxy(kind);
            _refreshSaveDiscardState();
        });
        // A hand-typed URL is the new baseline. Capture phase, so the baseline
        // moves before the bubbling listeners above re-check the Save gate.
        var proxy = document.getElementById(PANEL_PROXY_IDS[kind].proxy);
        if (proxy) proxy.addEventListener('input', function() {
            if (_snapshotServerType !== kind) return;
            _resetPanelProxyBaseline();
            _panelProxyAutoValue = null;
        }, true);
    });

    // Campus Hub Association dropdowns repaint their "saving will detach…" warning.
    var lsGHDSSelect = document.getElementById('infoGHDSSelect');
    if (lsGHDSSelect) {
        lsGHDSSelect.addEventListener('change', function() {
            if (_snapshotServerType !== 'line') return;
            _refreshAssociationNotes();
            // The Relay list is scoped to this Campus Hub — re-scope it, keeping the
            // pick only if it is still on the new Campus Hub.
            var lsNode = selectedNodeId ? findNodeById(selectedNodeId) : null;
            var cdnSel = document.getElementById('infoCDNSelect');
            if (lsNode) _populateCDNSelect(lsNode, cdnSel ? cdnSel.value : '');
            _autoUpdatePanelProxy('line');
            _refreshSaveDiscardState();
        });
    }
    var lsCDNSelect = document.getElementById('infoCDNSelect');
    if (lsCDNSelect) {
        lsCDNSelect.addEventListener('change', function() {
            if (_snapshotServerType !== 'line') return;
            _refreshSaveDiscardState();
        });
    }
    var cdnGHDSSelect = document.getElementById('cdnGHDSSelect');
    if (cdnGHDSSelect) {
        cdnGHDSSelect.addEventListener('change', function() {
            if (_snapshotServerType !== 'cdn') return;
            _refreshAssociationNotes();
            _autoUpdatePanelProxy('cdn');
            _refreshSaveDiscardState();
        });
    }

    initProxyOpenButtons();

    // Start in the clean (disabled) state
    _setSaveDiscardEnabled(false);
}

/*
 * Details-panel field errors — thin wrappers over the shared ProjFieldError
 * plugin so the copy and markup match every other prototype.
 */
function _showPanelFieldError(field, message) {
    ProjFieldError.show(field, message);
}

function _clearPanelFieldError(field) {
    ProjFieldError.clear(field);
}

function _clearAllPanelFieldErrors() {
    // The panel is pristine again, so forget which fields the user had visited.
    // Without this, selecting server B after touching server A's Description
    // would flag B's empty Description on a blur the user never meant as an edit.
    _panelFieldTouched = {};
    var ids = ['infoHostname', 'infoIPAddress', 'infoServerType', 'infoProxyURL', 'infoDescription', 'infoLocation',
               'infoFSNApiCalls',
               'ghdsHostname', 'ghdsIPAddress', 'ghdsDescription', 'ghdsLocation',
               'cdnHostname', 'cdnIPAddress', 'cdnProxyURL', 'cdnDescription', 'cdnLocation'];
    ids.forEach(function(id) {
        var el = document.getElementById(id);
        if (el) _clearPanelFieldError(el);
    });
}

/**
 * Every rule the panels enforce, per panel type, in panel reading order — the
 * order decides which field Save focuses when more than one is wrong.
 *
 * This is the SINGLE table behind all three consumers: the Save gate, the
 * Save-time backstop, and the blur/input messages. It replaces two hand-kept
 * lists that had drifted (Node Type was required at Save but had no blur
 * handler, so its error could be raised and never cleared).
 *
 * The suffix rule covers all three types, ghDS included (FR-P2-21) — the seed
 * ghDS hostnames are still on hub.atrium.test, see the hostname rule (requirements FR-P2-21).
 * The site panel has no required fields, hence no entry.
 */
var PANEL_FIELD_RULES = {
    line: [
        { id: 'infoServerType',  label: 'Node Type', choice: true },
        { id: 'infoHostname',    label: 'Hostname', suffix: true, unique: 'name' },
        { id: 'infoIPAddress',   label: 'IP Address', ip: true, unique: 'ip' },
        { id: 'infoProxyURL', label: 'Proxy URL', proxy: 'line' },
        { id: 'infoDescription', label: 'Description' },
        { id: 'infoLocation',    label: 'Location' }
    ],
    ghds: [
        { id: 'ghdsHostname',    label: 'Hostname', suffix: true, unique: 'name' },
        { id: 'ghdsIPAddress',   label: 'IP Address', ip: true, unique: 'ip' },
        { id: 'ghdsDescription', label: 'Description' },
        { id: 'ghdsLocation',    label: 'Location' }
    ],
    cdn: [
        { id: 'cdnHostname',     label: 'Hostname', suffix: true, unique: 'name' },
        { id: 'cdnIPAddress',    label: 'IP Address', ip: true, unique: 'ip' },
        { id: 'cdnProxyURL',     label: 'Proxy URL', proxy: 'cdn' },
        { id: 'cdnDescription',  label: 'Description' },
        { id: 'cdnLocation',     label: 'Location' }
    ]
};

/** The rules for the panel currently open. */
function _panelFieldRules() {
    return PANEL_FIELD_RULES[_snapshotServerType] || [];
}

/**
 * Every rule across all three panels, for binding listeners once at init. Field
 * ids are unique per panel, so a rule maps to exactly one element.
 */
function _allPanelFieldRules() {
    return PANEL_FIELD_RULES.line
        .concat(PANEL_FIELD_RULES.ghds)
        .concat(PANEL_FIELD_RULES.cdn);
}

/**
 * How `rule`'s field is currently wrong: `{ el, rule, kind }` with kind
 * 'required' | 'outdated' | 'suffix' | 'invalid' | 'duplicate', or null when it is fine. A locked field
 * is always null — see `_panelFieldEditable`.
 */
function _panelFieldViolation(rule) {
    var el = document.getElementById(rule.id);
    if (!_panelFieldEditable(el)) return null;
    var value = (el.value || '').trim();
    if (!value) return { el: el, rule: rule, kind: 'required' };
    if (rule.proxy && _panelProxyOutdated(rule.proxy)) return { el: el, rule: rule, kind: 'outdated' };
    if (rule.suffix && isHostnameOutdated(value)) return { el: el, rule: rule, kind: 'suffix' };
    if (rule.ip && !isValidIPv4(value)) return { el: el, rule: rule, kind: 'invalid' };
    if (rule.unique) {
        // `unique` names the server field to check: 'name' (hostname) or 'ip'.
        var previous = _editableSnapshot ? _editableSnapshot[rule.unique === 'name' ? 'hostname' : 'ip'] : '';
        if (_serverFieldInUse(rule.unique, value, previous)) return { el: el, rule: rule, kind: 'duplicate' };
    }
    return null;
}

/**
 * Whether the open panel's Proxy URL is outdated: a source field changed and
 * the URL couldn't be re-derived, and the user hasn't typed a new one yet (see
 * `_autoUpdatePanelProxy`, `isProxyURLOutdated`). `kind` is 'line' or 'cdn'.
 */
function _panelProxyOutdated(kind) {
    if (_snapshotServerType !== kind) return false;
    return _panelProxyStaleAfterGHDSRename(kind);
}

/**
 * A source field changed and the URL couldn't be re-derived: the field keeps
 * its old value. That's a warning under the field, not an error — the URL is
 * filled in, so Save stays available (see `_refreshPanelProxyChangedNote`).
 */
function _panelProxyNotDerived(kind) {
    if (_snapshotServerType !== kind) return false;
    return isProxyURLOutdated(_panelProxyBaseline, _panelProxyInputs(kind), kind);
}

/**
 * A Campus Hub rename flags a Line or Timetable Relay whose Proxy URL isn't generated
 * (`proxyOutdated`). It stays outdated while the field still holds the stale
 * URL it loaded with; typing a new one (or re-deriving it) clears it.
 */
function _panelProxyStaleAfterGHDSRename(kind) {
    if ((kind !== 'line' && kind !== 'cdn') || !_editableSnapshot || !selectedNodeId) return false;
    var node = findNodeById(selectedNodeId);
    if (!node || !node.proxyOutdated) return false;
    var cur = String((document.getElementById(kind === 'cdn' ? 'cdnProxyURL' : 'infoProxyURL') || {}).value || '').trim();
    return cur !== '' && cur === String(_editableSnapshot.proxyURL || '').trim();
}

/** The outdated message for the open panel's Proxy URL field. */
function _panelProxyOutdatedMessage(kind) {
    if (_panelProxyStaleAfterGHDSRename(kind)) return proxyURLOutdatedAfterGHDSRenameMessage();
    return proxyURLOutdatedMessage(_panelProxyInputs(kind).ghds);
}

/**
 * Paint or clear the Proxy URL "outdated" message as the fields it is built
 * from change. Runs on every Save-state refresh, so it follows the Hostname,
 * the Campus Hub dropdown, typing in the Proxy URL and Discard alike. Leaves any other message
 * (an empty-field error) where it is.
 */
function _refreshPanelProxyOutdated() {
    _panelFieldRules().forEach(function(rule) {
        if (!rule.proxy) return;
        var el = document.getElementById(rule.id);
        if (!el) return;
        var violation = _panelFieldViolation(rule);
        if (violation && violation.kind === 'outdated') _showPanelFieldError(el, _panelProxyOutdatedMessage(rule.proxy));
        else if (!violation) _clearPanelFieldError(el);
    });
}

/**
 * Whether `rule`'s field differs from its value when the panel was loaded. A
 * format rule (suffix, IP, duplicate) only blocks Save on a changed field: every
 * seed ghDS carries a legacy hostname, and gating on it would make an unrelated
 * edit — an IP, a Description — impossible to save. An empty required field
 * blocks regardless, and says so on open (`_showPanelRequiredErrorsOnOpen`).
 */
function _panelFieldChanged(rule) {
    var el = document.getElementById(rule.id);
    var fields = _editableSnapshot && _editableSnapshot.fields;
    if (!el || !fields || !(rule.id in fields)) return true;
    return el.value !== fields[rule.id];
}

/**
 * The first rule the panel breaks, in reading order, or null. An unchanged
 * field only counts when it is empty — see `_panelFieldChanged`.
 */
function _firstPanelViolation() {
    var rules = _panelFieldRules();
    for (var i = 0; i < rules.length; i++) {
        var violation = _panelFieldViolation(rules[i]);
        if (!violation) continue;
        // Outdated is caused by OTHER fields changing, so the Proxy URL itself is
        // unchanged by definition — it blocks regardless.
        if (violation.kind === 'required' || violation.kind === 'outdated' || _panelFieldChanged(rules[i])) return violation;
    }
    return null;
}

/**
 * Whether the panel could be saved as it stands. Deliberately ignores whether
 * the user has visited a field: Save reads as unavailable the moment a required
 * field is empty or an edited value is invalid. Only an empty required field
 * says so on open; every other message still waits for a blur.
 */
function _panelIsValid() {
    // Bulk selection has no text fields; its own dirty check is the whole gate.
    if (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive && BulkMode.isBulkActive()) return true;
    return _firstPanelViolation() === null;
}

/**
 * Compare current panel field values to the captured snapshot.
 * Returns true when any field differs (panel is "dirty").
 */
function _isPanelDirty() {
    // Bulk selection tracks its own dirty state (bulk switch vs. data union).
    if (typeof BulkMode !== 'undefined' && BulkMode.isBulkActive && BulkMode.isBulkActive()) {
        return BulkMode.isDirty ? BulkMode.isDirty() : false;
    }
    if (!_editableSnapshot || !_snapshotServerType) return false;
    var s = _editableSnapshot;
    var v = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var c = function(id) { var el = document.getElementById(id); return el ? !!el.checked : false; };

    if (_snapshotServerType === 'line') {
        return v('infoHostname') !== s.hostname
            || v('infoIPAddress') !== s.ip
            || v('infoServerType') !== (s.serverType || '')
            || v('infoGHDSSelect') !== (s.ghdsHostname || '')
            || v('infoCDNSelect') !== (s.cdnId || '')
            || v('infoProxyURL') !== s.proxyURL
            || v('infoDescription') !== s.description
            || v('infoLocation') !== s.location
            || (c('infoPGMService') ? 'on' : 'off') !== s.pgmService
            || c('infoKomodo') !== s.komodo
            || c('infoRedPanda') !== s.redPanda
            || c('infoFSNApiCalls') !== s.fsnApiCalls;
    }
    if (_snapshotServerType === 'ghds') {
        return v('ghdsHostname') !== s.hostname
            || v('ghdsIPAddress') !== s.ip
            || v('ghdsDescription') !== s.description
            || v('ghdsLocation') !== s.location
            || c('ghBridgeService') !== s.bridgeService;
    }
    if (_snapshotServerType === 'cdn') {
        return v('cdnHostname') !== s.hostname
            || v('cdnIPAddress') !== s.ip
            || v('cdnGHDSSelect') !== (s.ghdsHostname || '')
            || v('cdnProxyURL') !== s.proxyURL
            || v('cdnDescription') !== s.description
            || v('cdnLocation') !== s.location;
    }
    if (_snapshotServerType === 'site') {
        return _currentSiteFSNState() !== s.fsnState;
    }
    return false;
}

/**
 * Set Save AND Discard together. Used at the settle points where the panel is
 * clean (both off). The dirty case is driven by `_refreshSaveDiscardState`,
 * where the two buttons can differ — an invalid edit still needs discarding.
 * The Discard button is also a popover trigger — disabling it prevents the popover from opening.
 */
function _setSaveDiscardEnabled(enabled) {
    var saveBtn = document.getElementById('saveBtn');
    var discardBtn = document.getElementById('discardBtn');
    if (saveBtn) saveBtn.disabled = !enabled;
    if (discardBtn) discardBtn.disabled = !enabled;
}

/**
 * Re-evaluate the footer and the scope-wide actions. Called on every editable
 * field change, and on every settle point via the paths that reset the snapshot.
 *
 * Save needs BOTH a change to commit and a valid record — an invalid value
 * disables it whether or not the user has visited the field, so the button never
 * invites a click it would only reject. Discard needs only a change: a dirty but
 * invalid panel must still be revertible, so Discard tracks dirtiness alone.
 */
function _refreshSaveDiscardState() {
    var dirty = _isPanelDirty();
    var saveBtn = document.getElementById('saveBtn');
    var discardBtn = document.getElementById('discardBtn');
    if (saveBtn) saveBtn.disabled = !(dirty && _panelIsValid());
    if (discardBtn) discardBtn.disabled = !dirty;
    _setGlobalActionsEnabled(!dirty);
    _refreshPanelProxyOutdated();
    _refreshPanelProxyChangedNote();
    _refreshGHDSHostnameRenameNote();
}

/**
 * Manage and Create Node both rebuild the tree and re-select a node, which
 * would silently throw away pending panel edits — so they stand down until the
 * edit is saved or discarded. Disabling the Manage button also keeps its popover
 * shut, the same way the Discard button's disabled state does.
 */
function _setGlobalActionsEnabled(enabled) {
    var manageBtn = document.getElementById('manageBtn');
    var newServerBtn = document.getElementById('newServerBtn');
    if (manageBtn) manageBtn.disabled = !enabled;
    if (newServerBtn) newServerBtn.disabled = !enabled;
}

/**
 * Show the outdated-hostname error on load if the field's value is outdated.
 * Skips a locked field: some seed servers carry a legacy hostname AND the
 * projects that lock it, and flagging a greyed-out box the user cannot fix is
 * just noise. Guarding here covers all four call sites.
 */
/**
 * Flag every empty required field on open, so a Save that is disabled from the
 * start says why. Seed records leave Proxy URL empty on 31 building controllers; without
 * this their Save reads as broken. Locked fields are skipped, as above.
 */
function _showPanelRequiredErrorsOnOpen() {
    _panelFieldRules().forEach(function(rule) {
        var violation = _panelFieldViolation(rule);
        if (violation && violation.kind === 'required') ProjFieldError.required(violation.el, { label: rule.label });
        else if (violation && violation.kind === 'outdated') _showPanelFieldError(violation.el, _panelProxyOutdatedMessage(rule.proxy));
    });
}

function _showPanelHostnameErrorIfOutdated(id) {
    var el = document.getElementById(id);
    if (!_panelFieldEditable(el)) return;
    if (isHostnameOutdated((el.value || '').trim())) {
        _showPanelFieldError(el, 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
    }
}

/**
 * Create a navigable value element: hostname text + icon button
 */
/**
 * Whether a Campus Hub server is reachable in the currently rendered tree, used to
 * decide if its navigate link should be enabled. A Campus Hub server is in the tree
 * when its site is among the selected sites, or when it's an NORT Campus Hub — NORT
 * Campus Hub servers are always surfaced (under NORT when NORT is selected, otherwise
 * cross-site under any site whose building controllers reference them).
 */
function isGHDSServerInTree(ghds) {
    if (!ghds || !ghds.site) return false;
    if (Array.isArray(selectedSites) && selectedSites.indexOf(ghds.site) !== -1) return true;
    // An NORT Campus Hub shows under another site only while one of that site's visible
    // building controllers references it, so ask the rendered tree.
    return ghds.site === 'NORT' && !!document.querySelector('.tree__node[data-node-id="' + ghds.id + '"]');
}

/**
 * Render a Proxy URL into an info-item value as a clickable navigable link
 * (link icon, opens the URL in a new tab), matching the existing
 * style. Falls back to a plain '-' when there is no value.
 */
function _renderProxyURL(el, url) {
    if (!el) return;
    if (url) {
        createNavigableValue(el, url, function() {
            window.open(url, '_blank', 'noopener');
        });
    } else {
        el.textContent = '-';
    }
}

function createNavigableValue(container, text, onNavigate, options) {
    container.innerHTML = '';
    var wrapper = document.createElement('span');
    wrapper.className = 'navigable-value';
    var label = document.createElement('span');
    label.textContent = text;
    wrapper.appendChild(label);

    var isDisabled = options && options.disabled;

    if (isDisabled && options.tooltip) {
        var trigger = document.createElement('span');
        trigger.className = 'popover__trigger';
        var btn = document.createElement('button');
        btn.className = 'navigate-icon-btn navigate-icon-btn--disabled';
        btn.disabled = true;
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 64 64"><path d="M10.2778022,59.8435913 L49.3266594,59.8435913 C56.0730331,59.8435913 59.4264397,56.4763517 59.4264397,49.8462199 L59.4264397,10.5584835 C59.4264397,3.92835165 56.0730331,0.561098902 49.3266594,0.561098902 L10.2778022,0.561098902 C3.56551649,0.561098902 0.178021978,3.91443957 0.178021978,10.5584835 L0.178021978,49.8462199 C0.178021978,56.4902638 3.56551649,59.8435913 10.2778022,59.8435913 Z M10.3599561,54.6313583 C7.1448132,54.6313583 5.35615386,52.9450992 5.35615386,49.5934484 L5.35615386,10.8112747 C5.35615386,7.49373628 7.1448132,5.77338463 10.3599561,5.77338463 L49.2445056,5.77338463 C52.4318243,5.77338463 54.2483078,7.49373628 54.2483078,10.8112747 L54.2483078,49.5934484 C54.2483078,52.9450992 52.4318243,54.6313583 49.2445056,54.6313583 L10.3599561,54.6313583 Z M39.8739561,38.1288133 C41.3084177,38.1288133 42.2512748,37.0494726 42.2512748,35.5669451 L42.2512748,20.3998022 C42.2512748,18.4806594 41.206088,17.7425275 39.5668352,17.7425275 L24.2903737,17.7425275 C22.7737583,17.7425275 21.7967473,18.6783956 21.7967473,20.0787693 C21.7967473,21.4931209 22.8078462,22.428989 24.3586154,22.428989 L30.2174506,22.428989 L34.9612088,21.9241319 L29.9762638,26.6152088 L18.1114945,38.4458242 C17.640066,38.9172528 17.312044,39.5321539 17.312044,40.195055 C17.312044,41.6365056 18.2549011,42.5793627 19.6963517,42.5793627 C20.4686374,42.5793627 21.0834726,42.2854946 21.5208132,41.8482198 L33.3785935,29.9903737 L37.9945056,25.0395825 L37.5237363,30.0679121 L37.5237363,35.6351869 C37.5237363,37.1518682 38.4596704,38.1288133 39.8739561,38.1288133 Z" transform="translate(2 2)"/></svg>';
        trigger.appendChild(btn);

        var popover = document.createElement('div');
        popover.className = 'popover popover--top popover--dark';
        popover.style.display = 'none';
        popover.style.minWidth = '20rem';
        popover.innerHTML = '<div class="popover__content"><div class="popover__body"><p>' + options.tooltip + '</p></div></div><div class="popover__arrow"></div>';
        trigger.appendChild(popover);

        var hideTimeout;
        btn.addEventListener('mouseenter', function() { clearTimeout(hideTimeout); popover.style.display = 'block'; });
        btn.addEventListener('mouseleave', function() { hideTimeout = setTimeout(function() { popover.style.display = 'none'; }, 200); });
        popover.addEventListener('mouseenter', function() { clearTimeout(hideTimeout); });
        popover.addEventListener('mouseleave', function() { popover.style.display = 'none'; });

        wrapper.appendChild(trigger);
    } else {
        var btn = document.createElement('button');
        btn.className = 'navigate-icon-btn';
        btn.title = 'Go to node';
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 64 64"><path d="M10.2778022,59.8435913 L49.3266594,59.8435913 C56.0730331,59.8435913 59.4264397,56.4763517 59.4264397,49.8462199 L59.4264397,10.5584835 C59.4264397,3.92835165 56.0730331,0.561098902 49.3266594,0.561098902 L10.2778022,0.561098902 C3.56551649,0.561098902 0.178021978,3.91443957 0.178021978,10.5584835 L0.178021978,49.8462199 C0.178021978,56.4902638 3.56551649,59.8435913 10.2778022,59.8435913 Z M10.3599561,54.6313583 C7.1448132,54.6313583 5.35615386,52.9450992 5.35615386,49.5934484 L5.35615386,10.8112747 C5.35615386,7.49373628 7.1448132,5.77338463 10.3599561,5.77338463 L49.2445056,5.77338463 C52.4318243,5.77338463 54.2483078,7.49373628 54.2483078,10.8112747 L54.2483078,49.5934484 C54.2483078,52.9450992 52.4318243,54.6313583 49.2445056,54.6313583 L10.3599561,54.6313583 Z M39.8739561,38.1288133 C41.3084177,38.1288133 42.2512748,37.0494726 42.2512748,35.5669451 L42.2512748,20.3998022 C42.2512748,18.4806594 41.206088,17.7425275 39.5668352,17.7425275 L24.2903737,17.7425275 C22.7737583,17.7425275 21.7967473,18.6783956 21.7967473,20.0787693 C21.7967473,21.4931209 22.8078462,22.428989 24.3586154,22.428989 L30.2174506,22.428989 L34.9612088,21.9241319 L29.9762638,26.6152088 L18.1114945,38.4458242 C17.640066,38.9172528 17.312044,39.5321539 17.312044,40.195055 C17.312044,41.6365056 18.2549011,42.5793627 19.6963517,42.5793627 C20.4686374,42.5793627 21.0834726,42.2854946 21.5208132,41.8482198 L33.3785935,29.9903737 L37.9945056,25.0395825 L37.5237363,30.0679121 L37.5237363,35.6351869 C37.5237363,37.1518682 38.4596704,38.1288133 39.8739561,38.1288133 Z" transform="translate(2 2)"/></svg>';
        btn.addEventListener('click', onNavigate);
        wrapper.appendChild(btn);
    }

    container.appendChild(wrapper);
}

/**
 * Navigate to a server node in the tree by ID
 * Expands collapsed parent sections and scrolls into view
 */
function navigateToServer(nodeId) {
    var nodeEl = document.querySelector('.tree__node[data-node-id="' + nodeId + '"]');
    if (!nodeEl) {
        showToast('Node not visible in current view', 'warning');
        return;
    }

    var parent = nodeEl.closest('.tree__item');
    while (parent) {
        var children = parent.parentElement;
        if (children && children.classList.contains('tree__children') && !children.classList.contains('tree__children--expanded')) {
            children.classList.add('tree__children--expanded');
            var parentItem = children.parentElement;
            if (parentItem) {
                var toggle = parentItem.querySelector(':scope > .tree__node .tree__toggle');
                if (toggle) toggle.classList.add('tree__toggle--expanded');
            }
        }
        parent = children ? children.closest('.tree__item') : null;
    }

    nodeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    selectNode(nodeId);
}

/**
 * Find a Campus Hub server by hostname across all sites
 */
function findGHDSServerByHostname(hostname) {
    if (!hostname) return null;
    for (var site in ghdsServersData) {
        for (var proj in ghdsServersData[site]) {
            var data = ghdsServersData[site][proj];
            if (data.children) {
                for (var i = 0; i < data.children.length; i++) {
                    var projNode = data.children[i];
                    if (projNode.children) {
                        for (var j = 0; j < projNode.children.length; j++) {
                            var srv = projNode.children[j];
                            if (hostname.indexOf(srv.name) === 0 || srv.name === hostname) return srv;
                        }
                    }
                }
            }
        }
    }
    return null;
}

/**
 * Find a building controller node in the tree by hostname
 */
function findLineServerByName(hostname, node) {
    if (!node) node = lineServersData;
    if (!node) return null;
    // Top-level may pass an array of site roots (multi-site selection).
    if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
            var result = findLineServerByName(hostname, node[i]);
            if (result) return result;
        }
        return null;
    }
    if (node.name === hostname && node.level === 'Building Controller') return node;
    if (node.children) {
        for (var i = 0; i < node.children.length; i++) {
            var result = findLineServerByName(hostname, node.children[i]);
            if (result) return result;
        }
    }
    return null;
}

/**
 * Whether the header's "Show Archived Nodes" filter is on. Same read
 * `buildAllServersTree` makes, and it defaults to on when the checkbox is
 * missing so a prototype page without the filter never hides anything.
 */
function _showArchivedFilterOn() {
    var el = document.getElementById('filterArchived');
    return el ? el.checked : true;
}

/**
 * Render associated building controllers as a clickable list
 */
function renderAssociatedLineServerList(container, hostnames) {
    container.innerHTML = '';
    if (!hostnames || hostnames.length === 0) {
        container.innerHTML = '<div class="associated-server-item" style="color: var(--color-glyph-gray-secondary);">No building controllers associated</div>';
        return;
    }

    var siteGroups = {};
    hostnames.forEach(function(name) {
        var site = _findLineServerSite(name);
        if (!site) return;
        if (!siteGroups[site]) siteGroups[site] = [];
        siteGroups[site].push(name);
    });

    var sites = Object.keys(siteGroups).sort();
    var needsHeaders = sites.length > 1;

    var sitesInScope = Array.isArray(selectedSites) ? selectedSites : [];
    // Archived building controllers only exist in the tree while "Show Archived
    // Nodes" is on, so with the filter off their links have nowhere to go.
    var showArchived = _showArchivedFilterOn();

    sites.forEach(function(site) {
        if (needsHeaders) {
            var header = document.createElement('div');
            header.className = 'associated-servers-site-header';
            header.textContent = site;
            container.appendChild(header);
        }
        // A linked server is "cross-site" when its site isn't currently
        // selected in the header — clicking it can't navigate within the
        // present tree, so we surface a tooltip and disable the link.
        var isCrossSite = sitesInScope.length > 0 && sitesInScope.indexOf(site) === -1;
        siteGroups[site].slice().sort().forEach(function(name) {
            var item = document.createElement('div');
            item.className = 'associated-server-item';
            // Cross-site wins over archived: the site isn't rendered at all, so
            // the archived filter is beside the point.
            var linkState = null;
            if (isCrossSite) {
                linkState = { disabled: true, tooltip: 'This building controller belongs to ' + site + ' and is not in the current campus tree' };
            } else if (!showArchived && isServerFullyArchived(site, name)) {
                linkState = { disabled: true, tooltip: 'This building controller is archived. Turn on "Show Archived Nodes" in the filters to view it' };
            }
            createNavigableValue(item, name, function() {
                var lsNode = findLineServerByName(name);
                if (lsNode) {
                    navigateToServer(lsNode.id);
                } else {
                    showToast('Node not visible in current view', 'warning');
                }
            }, linkState);
            // Same tag as the tree row, so it is clear which ones are out of service.
            if (isServerFullyArchived(site, name)) {
                var badge = document.createElement('span');
                badge.className = 'tag tag--tiny tag--gray';
                badge.textContent = 'Archived';
                item.appendChild(document.createTextNode(' '));
                item.appendChild(badge);
            }
            container.appendChild(item);
        });
    });
}

function _findLineServerSite(hostname) {
    for (var site in lineServersDataSets) {
        for (var proj in lineServersDataSets[site]) {
            var entry = lineServersDataSets[site][proj];
            if (!entry.children) continue;
            for (var i = 0; i < entry.children.length; i++) {
                var projNode = entry.children[i];
                if (!projNode.children) continue;
                for (var j = 0; j < projNode.children.length; j++) {
                    if (projNode.children[j].name === hostname) return site;
                }
            }
        }
    }
    for (var site in archivedServersData) {
        for (var proj in archivedServersData[site]) {
            var entry = archivedServersData[site][proj];
            if (!entry.children) continue;
            for (var i = 0; i < entry.children.length; i++) {
                var projNode = entry.children[i];
                if (!projNode.children) continue;
                for (var j = 0; j < projNode.children.length; j++) {
                    if (projNode.children[j].name === hostname) return site;
                }
            }
        }
    }
    // Faculty-less building controllers live in their own bucket, one array per site.
    if (typeof orphanLineServersData !== 'undefined') {
        for (var orphanSite in orphanLineServersData) {
            var orphans = orphanLineServersData[orphanSite] || [];
            for (var o = 0; o < orphans.length; o++) {
                if (orphans[o].name === hostname) return orphanSite;
            }
        }
    }
    return null;
}

function renderAssociatedCDNServerList(container, cdnNodes) {
    container.innerHTML = '';
    if (!cdnNodes || cdnNodes.length === 0) {
        container.innerHTML = '<div class="associated-server-item" style="color: var(--color-glyph-gray-secondary);">No Relay nodes associated</div>';
        return;
    }
    cdnNodes.slice().sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); }).forEach(function(cdn) {
        var item = document.createElement('div');
        item.className = 'associated-server-item';
        createNavigableValue(item, cdn.name || '-', function() {
            navigateToServer(cdn.id);
        });
        container.appendChild(item);
    });
}
