// Bulk Selection Mode for Building Controller Configuration
(function() {
    'use strict';

    var bulkSelectedIds = [];
    var lastBulkClickedId = null;
    var bulkInitial = { fsn: null };  // null = mixed/indeterminate
    // Tracks switches the user has changed in the current bulk session, so
    // their pending edits survive when items are added/removed from the selection.
    var bulkUserSet = { fsn: false };

    function isBulkActive() {
        return bulkSelectedIds.length > 1;
    }

    function _kindForNode(node) {
        if (!node) return null;
        // Archived building controllers are out of service and never bulk-selectable.
        if (node.level === 'Building Controller') return node.archived ? null : 'ls';
        if (node.level === 'Campus') return 'site';
        return null;
    }

    function handleNodeClick(nodeId, event) {
        var nodeData = findNodeById(nodeId);
        if (!nodeData) return;

        var clickedKind = _kindForNode(nodeData);
        if (!clickedKind) return;  // Campus Hub, Relay, Node Category, etc.

        // First bulk click: include the currently selected single node IF it
        // is bulk-eligible (Campus or Building Controller). Cross-kind sets are allowed.
        if (bulkSelectedIds.length === 0 && selectedNodeId) {
            var currentNode = findNodeById(selectedNodeId);
            if (currentNode && _kindForNode(currentNode)) {
                bulkSelectedIds.push(selectedNodeId);
            }
        }

        if (event.shiftKey && (lastBulkClickedId || selectedNodeId)) {
            var fromId = lastBulkClickedId || selectedNodeId;
            selectRange(fromId, nodeId);
        } else if (event.metaKey || event.ctrlKey) {
            toggleNode(nodeId);
        } else if (event.shiftKey) {
            // Shift with no anchor and nothing selected: just pick the clicked node.
            if (bulkSelectedIds.indexOf(nodeId) === -1) bulkSelectedIds.push(nodeId);
            updateVisualSelection();
        } else {
            return false;
        }

        lastBulkClickedId = nodeId;
        updateUI();
        return true;
    }

    function toggleNode(nodeId) {
        var idx = bulkSelectedIds.indexOf(nodeId);
        if (idx !== -1) {
            bulkSelectedIds.splice(idx, 1);
        } else {
            bulkSelectedIds.push(nodeId);
        }
        updateVisualSelection();
    }

    // Ids of the visible (not inside a collapsed branch), bulk-eligible nodes, in tree order.
    function _visibleEligibleIds() {
        var allNodes = document.querySelectorAll('.tree__node[data-node-id]');
        var ids = [];
        for (var i = 0; i < allNodes.length; i++) {
            var nId = allNodes[i].dataset.nodeId;
            var nodeData = findNodeById(nId);
            // Cross-kind ranges allowed — include any bulk-eligible visible node.
            if (!nodeData || !_kindForNode(nodeData)) continue;
            var item = allNodes[i].closest('.tree__item');
            var isVisible = true;
            if (item) {
                var parent = item.parentElement;
                while (parent && parent.classList) {
                    if (parent.classList.contains('tree__children') && !parent.classList.contains('tree__children--expanded')) {
                        isVisible = false;
                        break;
                    }
                    parent = parent.parentElement;
                }
            }
            if (isVisible) ids.push(nId);
        }
        return ids;
    }

    // The nodes a Shift range from `fromId` to `toId` covers. When the anchor is not itself
    // a visible, bulk-eligible node (a Campus Hub, a Relay, an archived server, a hidden row) there is
    // no range to draw, so it is just the clicked node.
    function _rangeBetween(fromId, toId) {
        var ids = _visibleEligibleIds();
        var from = ids.indexOf(fromId), to = ids.indexOf(toId);
        if (to === -1) return [];
        if (from === -1) return [toId];
        return ids.slice(Math.min(from, to), Math.max(from, to) + 1);
    }

    function selectRange(fromId, toId) {
        _rangeBetween(fromId, toId).forEach(function(id) {
            if (bulkSelectedIds.indexOf(id) === -1) bulkSelectedIds.push(id);
        });
        updateVisualSelection();
    }

    function updateVisualSelection() {
        document.querySelectorAll('.tree__node--selected').forEach(function(el) {
            el.classList.remove('tree__node--selected');
        });
        bulkSelectedIds.forEach(function(id) {
            var el = document.querySelector('.tree__node[data-node-id="' + id + '"]');
            if (el) el.classList.add('tree__node--selected');
        });
        // Campuses in the bulk set cascade their `.tree__node--selected` highlight
        // down to every visible building controller under them (non-archived) —
        // purely visual, so the user sees the apply scope of the Asset Registry cascade.
        bulkSelectedIds.forEach(function(id) {
            var node = findNodeById(id);
            if (node && node.level === 'Campus' && typeof _lineServerIdsForSite === 'function') {
                _lineServerIdsForSite(id).forEach(function(lsId) {
                    var el = document.querySelector('.tree__node[data-node-id="' + lsId + '"]');
                    if (el) el.classList.add('tree__node--selected');
                });
            }
        });
    }

    function updateUI() {
        updateInfoBar();
        updatePanel();
        updateDisabledNodes();
    }

    function updateInfoBar() {
        var clearBtn = document.getElementById('bulkSelectionClearBtn');
        if (!clearBtn) return;
        clearBtn.style.display = bulkSelectedIds.length > 1 ? 'flex' : 'none';
    }

    /**
     * The set of Building Controller ids the bulk Save will touch: union of
     * directly-picked building controllers and every visible line
     * server under any picked Campus. De-duplicated so a Campus + one of its LSs
     * in the same bulk doesn't double-write.
     */
    function getEffectiveLSIds() {
        var set = {};
        bulkSelectedIds.forEach(function(id) {
            var n = findNodeById(id);
            if (!n) return;
            if (n.level === 'Campus' && typeof _lineServerIdsForSite === 'function') {
                _lineServerIdsForSite(id).forEach(function(lsId) { set[lsId] = true; });
            } else if (n.level === 'Building Controller') {
                set[id] = true;
            }
        });
        return Object.keys(set);
    }

    /**
     * Title reflects the effective Building Controller count — the union of directly
     * picked building controllers and every visible building controller
     * under any picked Campus (what Save will touch). Campuses/LS breakdown is
     * intentionally collapsed into a single line-server count so it matches the
     * single-site panel header.
     */
    function formatBulkTitle() {
        var count = getEffectiveLSIds().length;
        return 'Bulk Configuration (' + count + ' Building Controller' + (count === 1 ? '' : 's') + ')';
    }

    function updatePanel() {
        var bulkPanel = document.getElementById('bulkConfigPanel');
        var detailsContent = document.getElementById('detailsContent');
        var emptyState = document.getElementById('detailsEmptyState');
        var panelTitle = document.getElementById('settingsPanelTitle');
        var manageBtn = document.getElementById('managePopoverTrigger');
        var panelFooter = document.getElementById('settingsPanelFooter');

        if (isBulkActive()) {
            // Reset user-touched flags when the bulk panel re-opens (fresh session).
            if (bulkPanel && bulkPanel.style.display === 'none') {
                bulkUserSet.fsn = false;
            }
            var effectiveIds = getEffectiveLSIds();
            if (detailsContent) detailsContent.style.display = 'none';
            if (emptyState) emptyState.style.display = 'none';
            if (bulkPanel) bulkPanel.style.display = '';
            if (panelTitle) panelTitle.textContent = formatBulkTitle();
            // The Manage menu is hidden in bulk (showBulkMenu hides it).
            if (typeof ManageActions !== 'undefined' && ManageActions.showBulkMenu) {
                ManageActions.showBulkMenu(effectiveIds.length);
            } else if (manageBtn) {
                manageBtn.style.display = 'none';
            }
            // Bulk uses the standard Save / Discard Changes footer (dirty-state
            // driven). Save commits the bulk config; Discard reverts the switches.
            if (panelFooter) panelFooter.style.display = 'flex';
            populateBulkSwitches();
        } else {
            if (bulkPanel) bulkPanel.style.display = 'none';
            // If single selection, restore normal behavior: the one remaining node becomes
            // the ordinary selection and bulk state ends (so the next modified click folds
            // the selected node back in, and a plain click behaves normally).
            if (bulkSelectedIds.length === 1) {
                var onlyId = bulkSelectedIds[0];
                bulkSelectedIds = [];
                lastBulkClickedId = null;
                bulkUserSet.fsn = false;
                updateInfoBar();
                updateDisabledNodes();
                selectNode(onlyId);
            } else if (bulkSelectedIds.length === 0) {
                // Nothing picked and nothing selected: the selected node (if any) was just toggled off.
                selectedNodeId = null;
                if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
            }
        }
    }

    function populateBulkSwitches() {
        var fsnValues = [];

        // Drive the tri-state off the *effective* LS set so a Campus bulk and a
        // mixed Campus+LS bulk both reflect the union of LSs Apply will touch.
        // Archived building controllers are never bulk-selectable, so every server
        // here can take Asset Registry.
        var effective = getEffectiveLSIds();
        effective.forEach(function(lsId) {
            var ls = findNodeById(lsId);
            if (!ls) return;
            fsnValues.push(ls.fsnApiCalls !== false);
        });
        var fsnSwitch = document.getElementById('bulkFSNApiCalls');
        if (fsnSwitch) fsnSwitch.disabled = false;

        // Initial state always reflects the data union for the current selection,
        // so the Save button compares pending edits against actual saved state.
        bulkInitial.fsn = computeSharedValue(fsnValues);

        // Only refresh the visual state of switches the user has not changed.
        // Switches the user already toggled keep their pending value across
        // selection changes (otherwise their edit would be silently discarded).
        if (!bulkUserSet.fsn) {
            setBulkSwitch('bulkFSNApiCalls', fsnValues);
        }

        if (typeof _clearPanelFieldError === 'function') {
            var fs = document.getElementById('bulkFSNApiCalls');
            if (fs) _clearPanelFieldError(fs);
        }
        _updateBulkFSNNotice();
        if (typeof _refreshSaveDiscardState === 'function') _refreshSaveDiscardState();
    }

    /**
     * Show the Asset Registry cascade notice on the bulk panel only when at least one
     * Campus is directly picked (the cascade explanation matters then). Copy
     * mirrors the per-site notice's narrowed/default split, computed against
     * the union of available projects across the bulk-selected sites.
     */
    function _updateBulkFSNNotice() {
        var notice = document.getElementById('bulkFSNApiCallsNotice');
        if (!notice) return;

        var siteNames = bulkSelectedIds.map(function(id) {
            var n = findNodeById(id);
            return n && n.level === 'Campus' ? (n.site || n.name) : null;
        }).filter(Boolean);

        if (siteNames.length === 0) {
            notice.style.display = 'none';
            return;
        }

        // "Narrowed" means the same thing here as on the site panel: EITHER the
        // Faculties filter or the Registry Sync filter is limiting the visible
        // set. Checking only Faculties (as this did before) made the notice
        // claim it would touch "every building controller" while an active Asset Registry filter
        // was silently excluding some.
        var narrowed = false;
        if (typeof getAvailableProjectsForSites === 'function') {
            // Per picked site: the global selection also holds projects of the other
            // sites in the header, so compare each site's own projects with it.
            var sel = Array.isArray(selectedProjects) ? selectedProjects : [];
            siteNames.forEach(function(sn) {
                var avail = getAvailableProjectsForSites([sn]) || [];
                if (avail.some(function(p) { return sel.indexOf(p) === -1; })) narrowed = true;
            });
        }
        if (!narrowed && typeof _siteFSNFilter === 'function') {
            narrowed = _siteFSNFilter() !== 'all';
        }

        var msg = document.getElementById('bulkFSNApiCallsNoticeMessage');
        if (msg) {
            msg.textContent = narrowed
                ? 'Changing Registry Sync on a campus updates only the building controllers in that campus that match the current filters.'
                : 'Changing Registry Sync on a campus updates every building controller in that campus. Use the filters to limit changes to a specific subset.';
        }
        notice.style.display = '';
    }

    function _applyMixedSwitch(switchId) {
        var sw = document.getElementById(switchId);
        if (!sw) return;
        sw.checked = false;
        sw.indeterminate = true;
        var label = sw.closest('.switch').querySelector('.switch__label');
        if (label) label.textContent = 'Mixed';
    }

    function computeSharedValue(values) {
        if (!values.length) return null;
        var allTrue = values.every(function(v) { return v; });
        if (allTrue) return true;
        var allFalse = values.every(function(v) { return !v; });
        if (allFalse) return false;
        return null;
    }

    function readSwitchState(id) {
        var sw = document.getElementById(id);
        if (!sw) return null;
        if (sw.indeterminate) return null;
        return sw.checked;
    }

    function captureBulkInitialState() {
        bulkInitial.fsn = readSwitchState('bulkFSNApiCalls');
    }

    /**
     * True when the bulk Asset Registry switch differs from the captured data union —
     * drives the shared Save / Discard Changes footer while bulk is active.
     */
    function isDirty() {
        // With no building controller to write to there is nothing to save or discard.
        if (getEffectiveLSIds().length === 0) return false;
        return readSwitchState('bulkFSNApiCalls') !== bulkInitial.fsn;
    }

    /**
     * Revert the bulk switches to the current data union (undo pending edits)
     * without applying anything. Mirrors the single-panel Discard Changes.
     */
    function discard() {
        bulkUserSet.fsn = false;
        populateBulkSwitches();
    }

    function setBulkSwitch(switchId, values) {
        var sw = document.getElementById(switchId);
        if (!sw) return;
        var label = sw.closest('.switch').querySelector('.switch__label');

        if (values.length === 0) {
            sw.checked = false;
            sw.indeterminate = false;
            if (label) label.textContent = 'Disabled';
            return;
        }

        var allTrue = values.every(function(v) { return v; });
        var allFalse = values.every(function(v) { return !v; });

        if (allTrue) {
            sw.checked = true;
            sw.indeterminate = false;
            if (label) label.textContent = 'Enabled';
        } else if (allFalse) {
            sw.checked = false;
            sw.indeterminate = false;
            if (label) label.textContent = 'Disabled';
        } else {
            sw.checked = false;
            sw.indeterminate = true;
            if (label) label.textContent = 'Mixed';
        }
    }

    function updateDisabledNodes() {
        document.querySelectorAll('.tree__node--bulk-disabled').forEach(function(el) {
            el.classList.remove('tree__node--bulk-disabled');
            el.removeAttribute('title');
            if (el.dataset.bulkTooltipBound) {
                el.removeEventListener('mouseenter', onBulkTipEnter);
                el.removeEventListener('mouseleave', onBulkTipLeave);
                delete el.dataset.bulkTooltipBound;
                delete el.dataset.bulkTooltipText;
            }
        });
        hideActiveBulkTooltip();

        if (bulkSelectedIds.length === 0) return;

        document.querySelectorAll('.tree__node[data-node-id]').forEach(function(el) {
            var nId = el.dataset.nodeId;
            var nodeData = findNodeById(nId);
            if (!nodeData) return;

            if (_kindForNode(nodeData)) return;  // bulk-eligible stays enabled

            // Campus Hub / Relay / Node Category / archived LS / etc. cannot be bulk-selected.
            el.classList.add('tree__node--bulk-disabled');
            attachBulkTooltip(el, (nodeData.level === 'Building Controller' && nodeData.archived)
                ? 'Archived building controllers cannot be selected in bulk mode'
                : 'Only campuses and building controllers can be selected in bulk mode');
        });
    }

    var activeBulkTip = null;

    function attachBulkTooltip(el, text) {
        el.dataset.bulkTooltipText = text;
        el.addEventListener('mouseenter', onBulkTipEnter);
        el.addEventListener('mouseleave', onBulkTipLeave);
        el.dataset.bulkTooltipBound = '1';
    }

    function onBulkTipEnter(e) {
        hideActiveBulkTooltip();
        var node = e.currentTarget;
        var text = node.dataset.bulkTooltipText || '';
        var tip = document.createElement('div');
        tip.className = 'popover popover--bottom popover--dark popover--open tree-bulk-tooltip';
        tip.innerHTML = '<div class="popover__content"><div class="popover__body"><p>' + text + '</p></div></div><div class="popover__arrow"></div>';
        document.body.appendChild(tip);

        var rect = node.getBoundingClientRect();
        var tipRect = tip.getBoundingClientRect();
        // Bottom-left aligned to the hovered element
        var top = rect.bottom + 6;
        var left = rect.left;
        // Clamp to viewport
        left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
        if (top + tipRect.height > window.innerHeight - 8) {
            top = rect.top - tipRect.height - 6;
        }
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
        activeBulkTip = tip;
    }

    function onBulkTipLeave() {
        hideActiveBulkTooltip();
    }

    function hideActiveBulkTooltip() {
        if (activeBulkTip && activeBulkTip.parentNode) {
            activeBulkTip.parentNode.removeChild(activeBulkTip);
        }
        activeBulkTip = null;
    }

    /** Save entry point for the shared footer. */
    function save() {
        applyConfiguration();
    }

    function applyConfiguration() {
        var fsnSwitch = document.getElementById('bulkFSNApiCalls');
        if (!fsnSwitch) return;

        // Effective LS set = directly-picked LSs ∪ every visible LS under any
        // picked Campus (de-duplicated). One unified path for site, ls, and
        // mixed bulks.
        var effective = getEffectiveLSIds();
        if (effective.length === 0) return;

        // Only write Asset Registry when the user actually moved the switch: an untouched
        // switch reads `checked === false` while the union is Mixed, and writing
        // it blindly would silently disable Asset Registry across the whole selection.
        var fsnState = readSwitchState('bulkFSNApiCalls');
        var fsnChanged = fsnState !== null && fsnState !== bulkInitial.fsn;

        var count = 0;
        var refused = [];
        if (fsnChanged) {
            effective.forEach(function(lsId) {
                // Turning Asset Registry off removes the Asset Registry host, which Asset Registry can refuse
                // (FR-P2-30). Each server is handled independently: refused ones
                // are reported with Asset Registry's reason, the others are disabled.
                if (!fsnState) {
                    var refusal = fsnRefusalDetail(findNodeById(lsId), 'disable');
                    if (refusal) { refused.push(refusal); return; }
                }
                forEachServerCopy(lineServersDataSets, lsId, function(srv) {
                    srv.fsnApiCalls = fsnState;
                });
                // Faculty-less copies live in their own dataset — write through
                // so an orphan LS picked in bulk (or cascaded from a Campus) gets
                // the same value.
                if (typeof forEachOrphanLineServerCopy === 'function') {
                    forEachOrphanLineServerCopy(lsId, function(srv) {
                        srv.fsnApiCalls = fsnState;
                    });
                }
                count++;
            });
        }

        notifyFSNFailures(refused);
        if (count > 0) {
            showToast('Registry Sync applied to ' + count + ' Building Controller' + (count === 1 ? '' : 's'));
            reRenderTree();
            clearSelection();
        }
    }

    function clearSelection() {
        bulkSelectedIds = [];
        lastBulkClickedId = null;
        bulkUserSet.fsn = false;
        clearRangePreview();
        updateVisualSelection();
        updateInfoBar();
        updateDisabledNodes();

        var bulkPanel = document.getElementById('bulkConfigPanel');
        if (bulkPanel) bulkPanel.style.display = 'none';

        // Clear to the panel empty state — nothing is auto-selected (matches the
        // no-auto-select-on-load behavior). Callers that need a specific node
        // re-select it after this returns.
        selectedNodeId = null;
        if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
    }

    // ── Shift+hover range preview ───────────────────────────────────
    // Paint `.tree__node--range-preview` on the would-be range while Shift
    // is held during hover. Doesn't mutate bulkSelectedIds — Shift+Click
    // (handled in handleNodeClick) is what commits the range.

    function clearRangePreview() {
        document.querySelectorAll('.tree__node--range-preview').forEach(function(el) {
            el.classList.remove('tree__node--range-preview');
        });
    }

    function previewRange(toId) {
        var fromId = lastBulkClickedId || selectedNodeId;
        if (!fromId) return;
        clearRangePreview();
        _rangeBetween(fromId, toId).forEach(function(id) {
            var el = document.querySelector('.tree__node[data-node-id="' + id + '"]');
            if (el) el.classList.add('tree__node--range-preview');
        });
    }

    function onTreeMouseOver(e) {
        if (!e.shiftKey) return;
        var node = e.target.closest('.tree__node[data-node-id]');
        if (!node) return;
        var nId = node.dataset.nodeId;
        var nodeData = findNodeById(nId);
        if (!nodeData || !_kindForNode(nodeData)) return;
        previewRange(nId);
    }

    function onTreeMouseOut(e) {
        // Clear when the mouse leaves the tree container or the node.
        var related = e.relatedTarget;
        if (related && related.closest && related.closest('#treeContainer')) {
            // Still inside the tree — only clear when leaving a row entirely
            // (mouseover on the next row will repaint).
            return;
        }
        clearRangePreview();
    }

    function onKeyUp(e) {
        if (e.key === 'Shift') clearRangePreview();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape' && isBulkActive()) {
            clearSelection();
        }
    }

    function init() {
        var clearBtn = document.getElementById('bulkSelectionClearBtn');
        if (clearBtn) clearBtn.addEventListener('click', clearSelection);

        // Bulk switch change listener (update label, clear in-use error)
        ['bulkFSNApiCalls'].forEach(function(id) {
            var sw = document.getElementById(id);
            if (sw) {
                sw.addEventListener('change', function() {
                    var label = sw.closest('.switch').querySelector('.switch__label');
                    if (label) label.textContent = sw.checked ? 'Enabled' : 'Disabled';
                    sw.indeterminate = false;
                    if (typeof _clearPanelFieldError === 'function') _clearPanelFieldError(sw);
                    bulkUserSet.fsn = true;
                    if (typeof _refreshSaveDiscardState === 'function') _refreshSaveDiscardState();
                });
            }
        });

        // Shift+hover range preview, Shift release + ESC handlers
        var treeContainer = document.getElementById('treeContainer');
        if (treeContainer) {
            treeContainer.addEventListener('mouseover', onTreeMouseOver);
            treeContainer.addEventListener('mouseout', onTreeMouseOut);
        }
        document.addEventListener('keyup', onKeyUp);
        document.addEventListener('keydown', onKeyDown);
    }

    window.BulkMode = {
        init: init,
        handleNodeClick: handleNodeClick,
        clearSelection: clearSelection,
        isBulkActive: isBulkActive,
        isDirty: isDirty,
        save: save,
        discard: discard,
        updateVisualSelection: updateVisualSelection,
        getSelectedIds: function() { return bulkSelectedIds; }
    };
})();
