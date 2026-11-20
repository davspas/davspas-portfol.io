
/**
 * Load building controllers data for the given sites/projects/serverType.
 * Builds one subtree per site and stores them as an array on `lineServersData`.
 * The renderer treats `lineServersData` as either a single node (legacy) or
 * an array of site root nodes; consumers iterate accordingly.
 */
function loadLineServersData(sites, projects, serverType) {
    if (!sites || !sites.length) {
        lineServersData = null;
        return false;
    }
    // An empty `projects` array (user unchecked every project in the filter)
    // is allowed — buildAllServersTree pushes the "No Building Controllers Match
    // Filters" empty-state row in the LS section and keeps Campus Hub/Relay sections,
    // matching the behavior of the other filters when they zero out.
    var siteList = Array.isArray(sites) ? sites : [sites];
    var projectList = Array.isArray(projects) ? projects : [];
    var trees = siteList.map(function(s) { return buildAllServersTree(s, projectList); }).filter(Boolean);
    lineServersData = trees.length > 0 ? trees : null;
    return lineServersData !== null;
}

/**
 * Build tree structure for All Nodes:
 * Campus → [Building Controllers (flat)] + [Campus Hubs section] + [Timetable Relays section]
 * Building controllers are the main focus; Campus Hub and Relay are separate collapsible sections.
 */
function buildAllServersTree(site, projects) {
    var siteNode = {
        id: 'site-' + site.toLowerCase() + '-all',
        name: site, site: site, type: 'Campus', level: 'Campus', children: []
    };

    // 1. Collect unique Building Controllers (active) — uses ID as key so each physical server appears once
    var lsMap = {};
    projects.forEach(function(pc) {
        if (!lineServersDataSets[site] || !lineServersDataSets[site][pc]) return;
        var lData = lineServersDataSets[site][pc];
        if (!lData.children) return;
        lData.children.forEach(function(projNode) {
            if (!projNode.children) return;
            projNode.children.forEach(function(ls) {
                if (!lsMap[ls.id]) lsMap[ls.id] = Object.assign({}, ls, { children: [] });
            });
        });
    });

    // 1a. Faculty-less building controllers (created with no projects). They live in
    // orphanLineServersData and are always surfaced in the tree so the user
    // can manage them.
    if (typeof orphanLineServersData !== 'undefined' && orphanLineServersData[site]) {
        orphanLineServersData[site].forEach(function(ls) {
            if (!lsMap[ls.id]) lsMap[ls.id] = Object.assign({}, ls, { children: [] });
        });
    }

    // 1b. Collect archived Building Controllers (only from selected projects)
    if (archivedServersData[site]) {
        projects.forEach(function(pc) {
            if (!archivedServersData[site][pc]) return;
            var aData = archivedServersData[site][pc];
            if (!aData.children) return;
            aData.children.forEach(function(projNode) {
                if (!projNode.children) return;
                projNode.children.forEach(function(aLs) {
                    // Archived building controllers always carry Registry Sync off (the
                    // seed is forced off at load and archiving forces it off), so
                    // the node's fsnApiCalls value renders the Disabled indicator.
                    if (!lsMap[aLs.id]) lsMap[aLs.id] = Object.assign({}, aLs, { children: [], archived: true });
                });
            });
        });
    }

    // 2. Collect unique Campus Hub servers
    var ghdsNodes = [];
    var ghdsAdded = {};
    if (ghdsServersData[site]) {
        Object.keys(ghdsServersData[site]).forEach(function(key) {
            var gData = ghdsServersData[site][key];
            if (!gData.children) return;
            gData.children.forEach(function(projNode) {
                if (!projNode.children) return;
                projNode.children.forEach(function(ghds) {
                    if (!ghdsAdded[ghds.name]) {
                        ghdsAdded[ghds.name] = true;
                        ghdsNodes.push(Object.assign({}, ghds, { children: [] }));
                    }
                });
            });
        });
    }

    // 2b. Include NORT Campus Hub servers referenced by this site's building controllers —
    // but only when NORT itself isn't already shown in the tree. If NORT is
    // among the selected sites, the referenced server already appears under
    // NORT, so we keep it there only and avoid duplicating it under this site.
    var applInTree = Array.isArray(selectedSites) && selectedSites.indexOf('NORT') !== -1;
    if (site !== 'NORT' && !applInTree && ghdsServersData['NORT']) {
        var applGhdsMap = {};
        Object.keys(ghdsServersData['NORT']).forEach(function(key) {
            var gData = ghdsServersData['NORT'][key];
            if (!gData.children) return;
            gData.children.forEach(function(projNode) {
                if (!projNode.children) return;
                projNode.children.forEach(function(ghds) {
                    applGhdsMap[ghds.name] = ghds;
                });
            });
        });
        Object.keys(lsMap).forEach(function(lsId) {
            var ls = lsMap[lsId];
            if (!ls.ghdsAssociation) return;
            var hostname = ls.ghdsAssociation.split(' (')[0];
            if (applGhdsMap[hostname] && !ghdsAdded[hostname]) {
                ghdsAdded[hostname] = true;
                ghdsNodes.push(Object.assign({}, applGhdsMap[hostname], { children: [], isApplServer: true }));
            }
        });
    }

    // 3. Collect unique Relay servers (leaf nodes — no LS children in tree)
    var cdnNodes = [];
    var cdnAdded = {};
    if (cdnServersData[site]) {
        Object.keys(cdnServersData[site]).forEach(function(key) {
            var cData = cdnServersData[site][key];
            if (!cData.children) return;
            cData.children.forEach(function(cdn) {
                if (cdn.level === 'Timetable Relay' && !cdnAdded[cdn.name]) {
                    cdnAdded[cdn.name] = true;
                    cdnNodes.push(Object.assign({}, cdn, { children: [] }));
                }
            });
        });
    }

    // 4. Read filter state. `showArchived` covers all three server types — the
    // header checkbox reads "Show Archived Nodes", not building controllers only.
    var fArchived = document.getElementById('filterArchived');
    var showArchived = fArchived ? fArchived.checked : true;
    var fFSN = document.getElementById('filterFSN');
    var fsnFilter = fFSN ? fFSN.value : 'all';

    // 4a. Drop archived Campus Hub / Relay servers unless the filter reveals them, and
    // sink the survivors to the bottom of their section (same ordering rule the
    // building controller list uses below).
    function _partitionArchived(nodes) {
        if (!showArchived) return nodes.filter(function(n) { return !n.archived; });
        var active = [], archived = [];
        nodes.forEach(function(n) { (n.archived ? archived : active).push(n); });
        return active.concat(archived);
    }
    ghdsNodes = _partitionArchived(ghdsNodes);
    cdnNodes = _partitionArchived(cdnNodes);

    // Faculty-axis filter — when the user has narrowed the Faculties multi-select
    // (in the tree section header), include only building controllers whose project set
    // intersects `selectedProjects`. Active LS use `associatedProjects`; archived
    // LS use `everAssociated` so historically-removed projects still surface
    // an archived row when their project is in the filter (matches FR-DS-05).
    // When `selectedProjects` covers every available project (the no-op state),
    // the clause is skipped and orphans are kept; once narrowed, orphans are
    // dropped (they have no project to match).
    var availableProjects = (typeof getAvailableProjectsForSites === 'function')
        ? getAvailableProjectsForSites(Array.isArray(selectedSites) ? selectedSites : [site])
        : [];
    var projectFilterActive = Array.isArray(selectedProjects)
        && availableProjects.length > 0
        && selectedProjects.length < availableProjects.length;

    // 5. Add building controllers as direct site children (active first, archived at bottom)
    var activeLs = [], archivedLs = [];
    Object.keys(lsMap).forEach(function(lsId) {
        var ls = lsMap[lsId];
        if (ls.archived && !showArchived) return;
        if (fsnFilter === 'enabled' && !ls.fsnApiCalls) return;
        if (fsnFilter === 'disabled' && ls.fsnApiCalls) return;
        if (projectFilterActive) {
            var bag = ls.archived
                ? (ls.everAssociated || ls.associatedProjects || [])
                : (ls.associatedProjects || []);
            if (bag.length === 0) return; // orphans dropped when filter is narrowed
            var hit = false;
            for (var pi = 0; pi < bag.length; pi++) {
                if (selectedProjects.indexOf(bag[pi]) !== -1) { hit = true; break; }
            }
            if (!hit) return;
        }
        if (ls.archived) archivedLs.push(ls);
        else activeLs.push(ls);
    });
    activeLs.forEach(function(ls) { siteNode.children.push(ls); });
    archivedLs.forEach(function(ls) { siteNode.children.push(ls); });

    // 5b. Empty-state placeholder when no building controllers show. Distinguish a
    // genuinely empty site (no building controllers in the data at all) from one whose
    // building controllers are merely hidden by the active filters — the copy differs.
    if (activeLs.length === 0 && archivedLs.length === 0) {
        var siteHasAnyLS = false;
        if (lineServersDataSets[site]) {
            Object.keys(lineServersDataSets[site]).forEach(function(pc) {
                var d = lineServersDataSets[site][pc];
                (d.children || []).forEach(function(pn) {
                    if ((pn.children || []).length) siteHasAnyLS = true;
                });
            });
        }
        if (archivedServersData[site]) {
            Object.keys(archivedServersData[site]).forEach(function(pc) {
                var d = archivedServersData[site][pc];
                (d.children || []).forEach(function(pn) {
                    if ((pn.children || []).length) siteHasAnyLS = true;
                });
            });
        }
        if (typeof orphanLineServersData !== 'undefined' && orphanLineServersData[site] && orphanLineServersData[site].length) {
            siteHasAnyLS = true;
        }
        siteNode.children.push({
            id: 'ls-empty-' + site.toLowerCase(),
            name: 'No Building Controllers Match Filters',
            site: site, type: 'LS Empty State', level: 'LS Empty State',
            emptyTitle: siteHasAnyLS ? 'No Building Controllers Match Filters' : 'No Data',
            emptySubtitle: siteHasAnyLS ? 'Adjust the filters to see results' : 'This Campus has no data yet',
            children: []
        });
    }

    // 6. Add Campus Hub section (collapsible group)
    if (ghdsNodes.length > 0) {
        siteNode.children.push({
            id: 'ghds-section-' + site.toLowerCase(),
            name: 'Campus Hubs',
            site: site, type: 'Node Category', level: 'Node Category',
            sectionType: 'ghds',
            children: ghdsNodes
        });
    }

    // 7. Add Relay section (collapsible group)
    if (cdnNodes.length > 0) {
        siteNode.children.push({
            id: 'cdn-section-' + site.toLowerCase(),
            name: 'Timetable Relays',
            site: site, type: 'Node Category', level: 'Node Category',
            sectionType: 'cdn',
            children: cdnNodes
        });
    }

    if (siteNode.children.length === 0) return null;
    return siteNode;
}

/**
 * Check if at least one Campus is selected
 */
function checkSelections() {
    return Array.isArray(selectedSites) && selectedSites.length > 0;
}

/**
 * Update search input state based on selections
 */
function updateSearchState() {
    const searchInput = document.getElementById('treeSearch');
    const hasSelections = checkSelections();
    
    if (searchInput) {
        searchInput.disabled = !hasSelections;
        if (!hasSelections) {
            searchInput.value = '';
            const resultsContainer = document.getElementById('searchResults');
            if (resultsContainer) {
                resultsContainer.innerHTML = '';
                resultsContainer.classList.remove('tree-search__results--visible');
            }
        }
    }
}

/**
 * Re-render tree without resetting layout or selection.
 * Used by filters to rebuild the tree in-place.
 */
/**
 * The single tree rebuild: snapshot which branches are open, re-render, put them
 * back. Both rebuild paths go through here so a save or a filter change never
 * collapses the tree under the user. `renderTree` clears the container itself,
 * so the capture has to happen first.
 */
function _rebuildTreeDOM() {
    var treeContainer = document.getElementById('treeContainer');
    if (!treeContainer) return false;
    var open = captureTreeExpansion();
    renderTree();
    restoreTreeExpansion(open);
    requestAnimationFrame(trimOverflowTags);
    return true;
}

function reRenderTree() {
    if (!Array.isArray(selectedSites) || selectedSites.length === 0) return;

    // Campuses haven't changed here — Faculties MS reconciliation only runs when
    // the site set itself changes (driven by updateLayoutVisibility). Calling
    // syncProjectsFilterForSites from this hot path was triggering setSelected
    // on the MS, whose onChange would re-enter reRenderTree → infinite loop.

    loadLineServersData(selectedSites, selectedProjects, currentServerType);
    _rebuildTreeDOM();
}

/**
 * Show or hide the building controllers layout based on selections
 */
function updateLayoutVisibility() {
    const noSelectionState = document.getElementById('noSelectionState');
    const lineServersLayout = document.getElementById('lineServersLayout');
    const subheaderActions = document.getElementById('subheaderActions');
    const subheaderScopeDivider = document.getElementById('subheaderScopeDivider');
    const subheaderProjectSelect = document.getElementById('projectSelect');
    const subheaderSearchWrapper = document.getElementById('subheaderSearchWrapper');

    if (!noSelectionState || !lineServersLayout) {
        return;
    }

    const hasSelections = checkSelections();

    // Update search state
    updateSearchState();

    // Show/hide subheader actions (Export + Create Node) and the scope band
    // (Faculties filter + Search bar with their leading divider) based on site
    // selection. All hide together when no site is picked.
    const scopeDisplay = hasSelections ? '' : 'none';
    if (subheaderActions) subheaderActions.style.display = scopeDisplay;
    if (subheaderScopeDivider) subheaderScopeDivider.style.display = scopeDisplay;
    if (subheaderProjectSelect) subheaderProjectSelect.style.display = scopeDisplay;
    if (subheaderSearchWrapper) subheaderSearchWrapper.style.display = scopeDisplay;

    if (hasSelections) {
        // Reconcile the Faculties multi-select against the new site set. The
        // helper preserves user-narrowed picks, auto-adds newly-in-scope
        // projects, and drops out-of-scope ones.
        syncProjectsFilterForSites(selectedSites);

        const dataLoaded = loadLineServersData(selectedSites, selectedProjects, currentServerType);

        if (dataLoaded) {
            noSelectionState.style.display = 'none';
            lineServersLayout.style.display = 'flex';

            // Rebuild synchronously, preserving expansion. Nothing is selected
            // by default — the details panel stays on its empty state until the
            // user picks an item in the tree.
            _rebuildTreeDOM();

            // The timer is vestigial: it predates the synchronous rebuild above
            // and only clears the selection now. About six callers re-select via
            // their own setTimeout after this returns, so removing it means
            // re-timing all of them — left for a follow-up.
            setTimeout(() => {
                selectedNodeId = null;
                if (typeof hideAllServerInfo === 'function') hideAllServerInfo();
            }, 50);
        } else {
            noSelectionState.style.display = 'flex';
            lineServersLayout.style.display = 'none';
        }
    } else {
        noSelectionState.style.display = 'flex';
        lineServersLayout.style.display = 'none';
    }
}

/**
 * Build the union of every project across the given sites (active + archived).
 * Used by `buildAllServersTree` (to decide whether the Faculties filter is
 * narrowed) and by `syncProjectsFilterForSites` (to feed the multi-select).
 */
function getAvailableProjectsForSites(sites) {
    var seen = {};
    var out = [];
    if (!Array.isArray(sites)) return out;
    sites.forEach(function(site) {
        if (typeof lineServersDataSets !== 'undefined' && lineServersDataSets[site]) {
            Object.keys(lineServersDataSets[site]).forEach(function(p) {
                if (!seen[p]) { seen[p] = true; out.push(p); }
            });
        }
        if (typeof archivedServersData !== 'undefined' && archivedServersData[site]) {
            Object.keys(archivedServersData[site]).forEach(function(p) {
                if (!seen[p]) { seen[p] = true; out.push(p); }
            });
        }
    });
    return out.sort();
}

// Tracks which projects were available the last time `syncProjectsFilterForSites`
// ran, so newly-in-scope projects can auto-join the user's selection while
// previously-narrowed selections stick.
var _lastAvailableProjects = null;

// Re-entry guard for the Faculties multi-select. The plugin's setSelected
// always fires its onChange — without this flag, the programmatic push from
// syncProjectsFilterForSites would re-enter the user's onChange (which calls
// reRenderTree), creating an infinite loop and rebuilding the MS dropdown
// DOM + the entire tree on every checkbox click. The Faculties MS onChange
// handler reads this and short-circuits when set.
var _suppressProjectsOnChange = false;

// The same guard for the Campus multi-select, used when the global search adds a
// site to reveal a result. It has to be a SEPARATE flag: the search path calls
// syncProjectsFilterForSites, which sets and clears the Faculties flag itself, so
// sharing one would re-arm the Campus MS half way through the sequence.
var _suppressSitesOnChange = false;

/**
 * Reconcile `selectedProjects` and the Faculties multi-select against a new
 * site selection. Preserves user-narrowed picks that are still in scope,
 * auto-adds projects that weren't available on the previous render, and
 * drops out-of-scope items.
 */
function syncProjectsFilterForSites(sites) {
    var available = getAvailableProjectsForSites(sites);
    var prev = _lastAvailableProjects;

    var newSelected;
    if (!prev) {
        // First run for this session — default state: all projects selected.
        newSelected = available.slice();
    } else {
        var current = Array.isArray(selectedProjects) ? selectedProjects : [];
        var keep = current.filter(function(p) { return available.indexOf(p) !== -1; });
        var freshlyAvailable = available.filter(function(p) { return prev.indexOf(p) === -1; });
        // Union, preserving order from `available` for stable display.
        var union = {};
        keep.concat(freshlyAvailable).forEach(function(p) { union[p] = true; });
        newSelected = available.filter(function(p) { return union[p]; });
    }

    selectedProjects = newSelected;
    _lastAvailableProjects = available;

    // Push the items + selection into the MS host. The plugin handles the no-op
    // case if the host hasn't mounted yet (init-search.js mounts it on init).
    // The guard suppresses the plugin's onChange firing back into our handler
    // (which would call reRenderTree and re-enter this function — see comment
    // on `_suppressProjectsOnChange`).
    if (window.ProjMultiSelect && document.getElementById('projectSelect')) {
        var items = available.map(function(p) { return { id: p, label: p }; });
        _suppressProjectsOnChange = true;
        try {
            window.ProjMultiSelect.setItems('#projectSelect', items);
            window.ProjMultiSelect.setSelected('#projectSelect', selectedProjects.slice());
        } catch (e) { /* MS not yet mounted on first call — init-search handles it */ }
        _suppressProjectsOnChange = false;
    }
}

/**
 * Update project select label based on selections
 */
function updateProjectSelectLabel() {
    const trigger = document.getElementById('projectSelectTrigger');
    if (!trigger) return; // Multi-select is hidden
    
    const label = trigger.querySelector('.project-multi-select__label');
    if (!label) return;
    
    if (selectedProjects.length === 0) {
        label.textContent = 'Select Faculties';
    } else if (selectedProjects.length === 1) {
        label.textContent = selectedProjects[0];
    } else {
        label.textContent = `${selectedProjects.length} faculties selected`;
    }
}

/**
 * Update available projects based on selected site
 */
function updateAvailableProjects(site) {
    const dropdown = document.getElementById('projectSelectDropdown');
    if (dropdown) {
        // Only update project checkboxes, not the "Select All" checkbox
        const checkboxLabels = dropdown.querySelectorAll('.checkbox:not(.checkbox--select-all)');

        checkboxLabels.forEach(label => {
            const checkbox = label.querySelector('.checkbox__input');
            const projectCode = checkbox.value;

            // Check if this project exists for the selected site
            const isAvailable = site && lineServersDataSets[site] && lineServersDataSets[site][projectCode];

            if (isAvailable) {
                label.style.display = '';
            } else {
                label.style.display = 'none';
                // Uncheck if it was checked
                if (checkbox.checked) {
                    checkbox.checked = false;
                    selectedProjects = selectedProjects.filter(p => p !== projectCode);
                }
            }
        });
    }

    updateProjectSelectLabel();
}

/**
 * Show toast notification using MDS notification system.
 *
 * `options.action` ({ label, onClick }) adds a link after the message, and keeps
 * the toast on screen until it is closed or the link is used — a toast that
 * carries a task shouldn't vanish after four seconds.
 */
function showToast(message, type, options) {
    type = type || 'success';
    options = options || {};
    // Semantic MDS notification icons (from monalisa-design-system notifications.html).
    var icons = {
        success: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 64 64" fill="currentColor"><path d="M23.0257412,59.1307272 C24.5026589,59.1307272 25.6648942,58.4873366 26.4984,57.2080166 L59.0437413,5.97056472 C59.6946354,4.96856471 59.9212236,4.1790353 59.9212236,3.38950589 C59.9212236,1.51757647 58.6852236,0.244941177 56.7766589,0.244941177 C55.4093648,0.244941177 54.641506,0.705670589 53.8154824,2.02898824 L22.8721412,51.3199977 L6.81741178,30.2898353 C5.94741177,29.1126353 5.10649413,28.6154118 3.84134118,28.6154118 C1.92536471,28.6154118 0.550588236,29.9536236 0.550588236,31.8621177 C0.550588236,32.6665412 0.894282354,33.5440236 1.55258824,34.3849412 L19.421153,57.1349507 C20.4887294,58.5022377 21.5414118,59.1307272 23.0257412,59.1307272 Z" transform="translate(2 2.353)"/></svg>',
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 64 64" fill="currentColor"><path d="M1.60500048,58.4772309 C2.91892453,59.7518284 5.05097517,59.7518284 6.33360808,58.4772309 L30.041279,34.7222663 L53.7962664,58.4772309 C55.0315828,59.7518284 57.2029752,59.7518284 58.4856081,58.4772309 C59.7601904,57.1553155 59.7601904,55.0232284 58.4856081,53.7799221 L34.7305448,30.0329246 L58.4856081,6.32525365 C59.7601904,5.04262074 59.7994563,2.87122833 58.4856081,1.59664605 C57.1636335,0.353354908 55.0315828,0.353354908 53.7962664,1.59664605 L30.041279,25.3436587 L6.33360808,1.59664605 C5.05097517,0.353354908 2.87958276,0.314013136 1.60500048,1.59664605 C0.361709338,2.9105701 0.361709338,5.04262074 1.60500048,6.32525365 L25.3519372,30.0329246 L1.60500048,53.7799221 C0.361709338,55.0232284 0.322367566,57.1946223 1.60500048,58.4772309 Z" transform="translate(2 2)"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 64 64" fill="currentColor"><path d="M7.76688351,54.1104467 L51.8532525,54.1104467 C56.6832525,54.1104467 59.6145147,50.7374214 59.6145147,46.3800816 C59.6145147,45.0556428 59.227136,43.6586156 58.5013108,42.3883282 L36.4373884,3.95708739 C34.95667,1.39427185 32.4239709,0.083300971 29.8131554,0.083300971 C27.1961651,0.083300971 24.6333496,1.39427185 23.1827476,3.95708739 L1.11865049,42.3883282 C0.362592234,43.6887612 0.00582524273,45.0556428 0.00582524273,46.3800816 C0.00582524273,50.7374214 2.93717476,54.1104467 7.76688351,54.1104467 Z M7.80317477,49.6260409 C5.82195147,49.6260409 4.59294176,48.0759403 4.59294176,46.373936 C4.59294176,45.8099185 4.73257282,45.1370214 5.04195146,44.5668583 L27.0697573,6.11778642 C27.6633496,5.08194176 28.7533107,4.60398059 29.8131554,4.60398059 C30.8367088,4.60398059 31.8965535,5.08194176 32.5202622,6.11778642 L54.5483011,44.5970098 C54.8576215,45.1671671 54.9968448,45.8099185 54.9968448,46.373936 C54.9968448,48.0759403 53.7683011,49.6260409 51.7867865,49.6260409 L7.80317477,49.6260409 Z M29.8069806,34.925534 C31.153136,34.925534 31.9381457,34.1584078 31.9682622,32.6670874 L32.3909418,17.6636505 C32.4210583,16.2326214 31.2681263,15.1400389 29.7768641,15.1400389 C28.2252525,15.1400389 27.1627865,16.2025049 27.1929612,17.6334758 L27.5552913,32.6670874 C27.5854661,34.1282331 28.3704758,34.925534 29.8069806,34.925534 Z M29.8069806,44.17027 C31.4563399,44.17027 32.851602,42.8771476 32.851602,41.2160972 C32.851602,39.5427962 31.4865146,38.2619418 29.8069806,38.2619418 C28.1336797,38.2619418 26.7322428,39.5729127 26.7322428,41.2160972 C26.7322428,42.847002 28.1637962,44.17027 29.8069806,44.17027 Z" transform="translate(2 4.913)"/></svg>'
    };
    var labels = { success: '', error: '', warning: 'Warning:' };

    var notification = document.createElement('div');
    notification.className = 'notification notification--' + type + ' app-toast';
    notification.style.position = 'fixed';
    notification.style.top = 'var(--space-l)';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.zIndex = '10000';
    notification.style.minWidth = '30rem';
    // `plain` uses a plain toast: bold title, no "Warning:" label, no icon.
    var labelHtml = labels[type] && !options.plain ? '<strong>' + labels[type] + '</strong> ' : '';
    notification.innerHTML =
        (options.plain ? '' : '<div class="notification__icon">' + icons[type] + '</div>') +
        '<div class="notification__content"><div class="notification__message">' +
        labelHtml + message +
        (options.action ? ' <button type="button" class="btn btn--link btn--small toast__action" style="margin-left: var(--space-xs); display: inline-flex; padding: 0; min-width: 0; height: auto; vertical-align: baseline;">' + options.action.label + '</button>' : '') +
        '</div></div>' +
        '<button class="notification__close" aria-label="Close"' + (options.plain ? ' style="font-size: 2.4rem; line-height: 1;"' : '') + '>×</button>';

    document.body.appendChild(notification);
    _restackToasts();

    function dismiss() {
        notification.remove();
        _restackToasts();
    }
    var closeBtn = notification.querySelector('.notification__close');
    closeBtn.addEventListener('click', dismiss);

    var actionLink = notification.querySelector('.toast__action');
    if (actionLink) {
        actionLink.addEventListener('click', function(e) {
            e.preventDefault();
            dismiss();
            options.action.onClick();
        });
    } else {
        setTimeout(dismiss, 4000);
    }
}

/** Plural-aware "2 Building Controllers and 1 Timetable Relay" for a list of `{ type }` items. */
function _countServersLabel(list) {
    var ls = list.filter(function(i) { return i.type !== 'Timetable Relay'; }).length;
    var cdn = list.length - ls;
    var parts = [];
    if (ls) parts.push(ls + (ls === 1 ? ' Building Controller' : ' Building Controllers'));
    if (cdn) parts.push(cdn + (cdn === 1 ? ' Timetable Relay' : ' Timetable Relays'));
    return parts.join(' and ');
}

/**
 * After a Campus Hub rename: tell the user which Line and Timetable Relays still hold a
 * Proxy URL they have to update by hand. `list` is [{ type, name, site, proxyURL }];
 * nothing is shown when it is empty. The warning toast opens a details modal with
 * a table of those servers and a Copy button.
 */
function notifyProxyURLsNeedingUpdate(list) {
    if (!list || !list.length) return;
    showToast(
        _countServersLabel(list) + (list.length === 1 ? ' needs' : ' need') + ' its Proxy URL updated manually.',
        'warning',
        { plain: true, action: { label: 'Details', onClick: function() { showProxyURLUpdateDetails(list); } } }
    );
}

/** The details modal behind `notifyProxyURLsNeedingUpdate`. */
function showProxyURLUpdateDetails(list) {
    showServerDetailsModal({
        id: 'proxyUpdateDetailsModal',
        title: 'Proxy URLs to update',
        intro: 'These nodes\' Proxy URLs aren\'t generated automatically, so they still point at the old Campus Hub hostname. ' +
            'Open each one and enter its new Proxy URL.',
        columns: ['Type', 'Node', 'Campus', 'Current Proxy URL'],
        rows: list.map(function(item) {
            return [item.type || 'Building Controller', item.name, item.site, item.proxyURL];
        })
    });
}

/**
 * After a bulk (or Campus-cascade) Registry Sync change: tell the user which Line
 * Nodes Asset Registry refused. `list` is [{ name, site, error }]; nothing is shown when
 * it is empty. The warning toast opens a details modal with each server and the
 * error Asset Registry returned for it.
 */
function notifyFSNFailures(list) {
    if (!list || !list.length) return;
    var n = list.length;
    showToast(
        'Unable to update ' + n + (n === 1 ? ' Building Controller' : ' Building Controllers') + ' Registry Sync status',
        'warning',
        { plain: true, action: { label: 'Details', onClick: function() { showFSNFailureDetails(list); } } }
    );
}

/** The details modal behind `notifyFSNFailures`. */
function showFSNFailureDetails(list) {
    showServerDetailsModal({
        id: 'fsnFailureDetailsModal',
        title: 'Unable to update ' + _countServersLabel(list.map(function() { return {}; })) + ' Registry Sync status',
        titleIcon: true,
        intro: 'Asset Registry refused the change for these Building Controllers, so they were left as they were. ' +
            'The other selected Building Controllers were updated.',
        columns: ['Building Controller', 'Campus', 'Details'],
        rows: list.map(function(item) { return [item.name, item.site, item.error]; })
    });
}

var SORT_INDICATOR = '<span class="sort-indicator"><span class="sort-indicator__inner" aria-hidden="true"><span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up"><svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path></svg></span><span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down"><svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path></svg></span></span></span>';

/**
 * Shared details modal: an intro line, a table and a Copy list button.
 * `rows` is an array of arrays aligned with `columns`.
 */
function showServerDetailsModal(cfg) {
    var existing = document.getElementById(cfg.id);
    if (existing) existing.remove();

    function esc(v) {
        var d = document.createElement('div');
        d.textContent = v == null ? '' : String(v);
        return d.innerHTML;
    }
    var rows = cfg.rows.map(function(cells) {
        return '<tr class="table__row">' + cells.map(function(c) {
            return '<td class="table__cell">' + esc(c) + '</td>';
        }).join('') + '</tr>';
    }).join('');

    var overlay = document.createElement('div');
    overlay.id = cfg.id;
    overlay.className = 'modal-overlay modal-overlay--open';
    // Above the docked right-edge panels (z-index 1000), like the drawers.
    overlay.style.zIndex = '1100';
    overlay.innerHTML =
        '<div class="modal modal--large">' +
            '<div class="modal__header">' +
                '<h3 class="modal__title">' +
                    (cfg.titleIcon ? '<span style="display:inline-flex; vertical-align: middle; margin-right: var(--space-xs); color: var(--color-glyph-red);"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v6.2"/><circle cx="12" cy="16.6" r="0.6" fill="currentColor"/></svg></span>' : '') +
                    esc(cfg.title) + '</h3>' +
                '<button class="modal__close" aria-label="Close"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 64 64" fill="currentColor"><path d="M1.60500048,58.4772309 C2.91892453,59.7518284 5.05097517,59.7518284 6.33360808,58.4772309 L30.041279,34.7222663 L53.7962664,58.4772309 C55.0315828,59.7518284 57.2029752,59.7518284 58.4856081,58.4772309 C59.7601904,57.1553155 59.7601904,55.0232284 58.4856081,53.7799221 L34.7305448,30.0329246 L58.4856081,6.32525365 C59.7601904,5.04262074 59.7994563,2.87122833 58.4856081,1.59664605 C57.1636335,0.353354908 55.0315828,0.353354908 53.7962664,1.59664605 L30.041279,25.3436587 L6.33360808,1.59664605 C5.05097517,0.353354908 2.87958276,0.314013136 1.60500048,1.59664605 C0.361709338,2.9105701 0.361709338,5.04262074 1.60500048,6.32525365 L25.3519372,30.0329246 L1.60500048,53.7799221 C0.361709338,55.0232284 0.322367566,57.1946223 1.60500048,58.4772309 Z" transform="translate(2 2)"/></svg></button>' +
            '</div>' +
            '<div class="modal__body">' +
                (cfg.intro ? '<p style="color: var(--color-glyph-gray-secondary); font-size: var(--font-size-xxs); margin: 0 0 var(--space-m);">' +
                    esc(cfg.intro) +
                '</p>' : '') +
                '<div class="table-container"><table class="table">' +
                    '<thead class="table__head"><tr class="table__row">' +
                        cfg.columns.map(function(c, i) { return '<th class="table__header sortable" data-sort="manual" data-column="col' + i + '">' + esc(c) + SORT_INDICATOR + '</th>'; }).join('') +
                    '</tr></thead>' +
                    '<tbody class="table__body">' + rows + '</tbody>' +
                '</table></div>' +
            '</div>' +
            '<div class="modal__footer">' +
                '<button class="btn btn--secondary btn--medium" data-role="close">Close</button>' +
                '<button class="btn btn--primary btn--medium" data-role="copy">Copy list</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(overlay);

    function close() {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) close(); });
    overlay.querySelector('.modal__close').addEventListener('click', close);
    overlay.querySelector('[data-role="close"]').addEventListener('click', close);

    // Sorting is wired here: MDS only binds the headers present at page load.
    // Click toggles asc → desc; the indicator's up/down carets mark the direction.
    var tbody = overlay.querySelector('tbody');
    overlay.querySelectorAll('th.sortable').forEach(function(th, col) {
        th.addEventListener('click', function() {
            var asc = !th.classList.contains('sort-asc');
            overlay.querySelectorAll('th.sortable').forEach(function(o) {
                o.classList.remove('sort-asc', 'sort-desc');
                o.querySelectorAll('.sort-indicator__icon').forEach(function(i) { i.classList.remove('active'); });
            });
            th.classList.add(asc ? 'sort-asc' : 'sort-desc');
            th.querySelector(asc ? '.sort-indicator__up' : '.sort-indicator__down').classList.add('active');
            var trs = Array.prototype.slice.call(tbody.rows);
            trs.sort(function(a, b) {
                var r = a.cells[col].textContent.localeCompare(b.cells[col].textContent, undefined, { numeric: true });
                return asc ? r : -r;
            });
            trs.forEach(function(tr) { tbody.appendChild(tr); });
        });
    });

    // Tab-separated, so it pastes straight into a spreadsheet.
    var text = [cfg.columns.join('\t')].concat(cfg.rows.map(function(cells) {
        return cells.join('\t');
    })).join('\n');
    var copyBtn = overlay.querySelector('[data-role="copy"]');
    copyBtn.addEventListener('click', function() {
        var done = function(ok) {
            copyBtn.textContent = ok ? 'Copied' : 'Copy failed';
            setTimeout(function() { copyBtn.textContent = 'Copy list'; }, 1500);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() { done(true); }, function() { done(false); });
            return;
        }
        // Non-secure contexts (file://) have no async clipboard API.
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.top = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
    });
}

/**
 * Toasts share one fixed spot, so two shown together (e.g. a bulk change's
 * success and its Asset Registry refusal) would overlap. Stack them top to bottom in the
 * order they were shown, and close the gap when one goes away.
 */
function _restackToasts() {
    var offset = 0;
    document.querySelectorAll('.app-toast').forEach(function(t) {
        t.style.top = 'calc(var(--space-l) + ' + offset + 'px)';
        offset += t.offsetHeight + 8;
    });
}

/*
 * Attach a monalisa dark hover tooltip to an element, replacing the plain
 * `title` attribute. The popover is body-appended and fixed-positioned above the
 * trigger (same component as the tree's bulk tooltip). Idempotent per element.
 * The text is read live from `dataset.tooltipText`, so callers can update it as
 * state changes (e.g. why a button is disabled). Works on aria-disabled buttons
 * since they still receive hover events.
 */
function attachTooltip(el, text) {
    if (!el) return;
    if (text != null && !el.dataset.tooltipText) el.dataset.tooltipText = text;
    if (el.dataset.tooltipBound) return;
    el.dataset.tooltipBound = '1';
    el.removeAttribute('title');
    var tip = null;

    function hide() {
        if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
        tip = null;
    }

    function show() {
        var msg = el.dataset.tooltipText || '';
        if (!msg) return;
        hide();
        tip = document.createElement('div');
        tip.className = 'popover popover--dark popover--open proj-tooltip';
        var content = document.createElement('div');
        content.className = 'popover__content';
        var body = document.createElement('div');
        body.className = 'popover__body';
        var p = document.createElement('p');
        p.textContent = msg;
        body.appendChild(p);
        content.appendChild(body);
        var arrow = document.createElement('div');
        arrow.className = 'popover__arrow';
        tip.appendChild(content);
        tip.appendChild(arrow);
        document.body.appendChild(tip);

        var r = el.getBoundingClientRect();
        var t = tip.getBoundingClientRect();
        var top = r.top - t.height - 8;
        if (top < 8) top = r.bottom + 8;
        var left = r.left + r.width / 2 - t.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - t.width - 8));
        tip.style.top = top + 'px';
        tip.style.left = left + 'px';
    }

    el.addEventListener('mouseenter', show);
    el.addEventListener('mouseleave', hide);
    el.addEventListener('click', hide);
}

/**
 * Show (or, with an empty `message`, clear) the orange warning under a Proxy URL
 * field that the automatic update replaced (FR-P2-25). `note` is the field's
 * `.setting-note` on the panels or `.form-help` in the Create drawer.
 */
function renderProxyChangedNote(note, message) {
    if (!note) return;
    note.classList.toggle('proxy-changed-note', !!message);
    note.innerHTML = message
        ? '<span class="proxy-changed-note__icon"><sf-symbol name="exclamationmark.triangle.fill" style="font-size:11px"></sf-symbol></span>' + message
        : '';
}
