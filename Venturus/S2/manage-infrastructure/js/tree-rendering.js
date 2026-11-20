
/**
 * Create a tree node element
 */
function createTreeNode(node, level = 0) {
    const hasChildren = node.children && node.children.length > 0;

    const li = document.createElement('li');
    li.className = `tree__item tree__item--level-${level}`;
    li.dataset.nodeId = node.id;

    // Special row: empty state when filters remove all building controllers
    if (node.level === 'LS Empty State') {
        li.classList.add('tree__ls-empty');
        var lsEmptyTitle = node.emptyTitle || 'No Building Controllers Match Filters';
        var lsEmptySubtitle = node.emptySubtitle || 'Adjust the filters to see results';
        li.innerHTML = `
            <div class="tree__ls-empty-content">
                <sf-symbol name="tray"></sf-symbol>
                <p class="tree__ls-empty-title">${lsEmptyTitle}</p>
                <p class="tree__ls-empty-subtitle">${lsEmptySubtitle}</p>
            </div>
        `;
        return li;
    }

    // Create node container
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'tree__node';
    nodeDiv.dataset.nodeId = node.id;

    // Toggle button (chevron) - hide for Campus level (locked as expanded)
    const toggle = document.createElement('button');

    // Determine if this node can have children based on level
    let canHaveChildren = false;

    if (node.level === 'Campus') {
        canHaveChildren = true;
    } else if (node.level === 'Node Category') {
        canHaveChildren = true;
    } else {
        canHaveChildren = false;
    }

    const shouldShowToggle = hasChildren || canHaveChildren;
    toggle.className = `tree__toggle ${!shouldShowToggle ? 'tree__toggle--hidden' : ''}`;
    toggle.innerHTML = '▶';
    toggle.setAttribute('aria-label', 'Toggle');

    // Icon — section headers use the icon matching their section type
    const icon = document.createElement('span');
    icon.className = 'tree__icon';
    if (node.level === 'Node Category') {
        icon.innerHTML = node.sectionType === 'ghds' ? iconMap['Campus Hub'] : iconMap['Timetable Relay'];
    } else {
        icon.innerHTML = iconMap[node.level] || '';
    }

    // Line / Campus Hub / Relay servers on a hostname that predates the hub.atrium.test
    // rule are flagged orange (icon + hostname text).
    if ((node.level === 'Building Controller' || node.level === 'Campus Hub' || node.level === 'Timetable Relay') && isHostnameOutdated(node.name)) {
        nodeDiv.classList.add('tree__node--outdated');
    }

    // Label
    const label = document.createElement('span');
    label.className = 'tree__label';
    label.textContent = node.name;

    // Section header styling
    if (node.level === 'Node Category') {
        nodeDiv.classList.add('tree__node--section-header');
    }

    // Archived badge (MDS tag component)
    if (node.archived) {
        nodeDiv.classList.add('tree__node--archived');
        const badge = document.createElement('span');
        badge.className = 'tag tag--tiny tag--gray';
        badge.textContent = 'Archived';
        label.appendChild(document.createTextNode(' '));
        label.appendChild(badge);
    }

    // Assemble node
    nodeDiv.appendChild(toggle);
    nodeDiv.appendChild(icon);
    nodeDiv.appendChild(label);

    // NORT tag for cross-site Campus Hub servers (blue tag)
    if (node.level === 'Campus Hub' && node.isApplServer) {
        var applTag = document.createElement('span');
        applTag.className = 'tree__appl-tag tag tag--tiny tag--primary';
        applTag.textContent = 'NORT';
        nodeDiv.appendChild(applTag);
    }

    // Inline project tags for building controllers (right-aligned)
    if (node.level === 'Building Controller') {
        if (node.associatedProjects && node.associatedProjects.length > 0) {
            var sorted = node.associatedProjects.slice().sort();

            // When the Faculties filter is narrowed, the visible tag strip
            // shows only in-filter projects (matches the filter's footprint).
            // Out-of-filter projects fold into the overflow popover alongside
            // any width-hidden tags. Filter-not-narrowed = no behavior change.
            var avail = (typeof getAvailableProjectsForSites === 'function')
                ? getAvailableProjectsForSites(Array.isArray(selectedSites) ? selectedSites : [])
                : [];
            var isFilterNarrowed = Array.isArray(selectedProjects)
                && avail.length > 0
                && selectedProjects.length < avail.length;
            var inFilter = isFilterNarrowed
                ? sorted.filter(function(p) { return selectedProjects.indexOf(p) !== -1; })
                : sorted;
            var outOfFilterCount = sorted.length - inFilter.length;

            var projectsContainer = document.createElement('span');
            projectsContainer.className = 'tree__projects';
            inFilter.forEach(function(p) {
                var tag = document.createElement('span');
                tag.className = 'tree__project-tag tag tag--tiny tag--gray';
                tag.textContent = p;
                projectsContainer.appendChild(tag);
            });
            nodeDiv.appendChild(projectsContainer);

            // Overflow badge with popover (sibling of .tree__projects, not inside it)
            var overflow = document.createElement('span');
            overflow.className = 'tree__projects-overflow';
            overflow.innerHTML = '<span class="tree__projects-overflow-badge"></span>';
            // Stash the out-of-filter count so trimOverflowTags() can fold it
            // into the badge total alongside width-hidden tags.
            overflow.dataset.outOfFilter = String(outOfFilterCount);
            var popover = document.createElement('span');
            popover.className = 'tree__projects-popover';
            // Popover always carries the full sorted set so users see the
            // complete project membership on hover, regardless of why tags
            // were folded (width or filter).
            sorted.forEach(function(p) {
                var ptag = document.createElement('span');
                ptag.className = 'tag tag--tiny tag--gray';
                ptag.textContent = p;
                popover.appendChild(ptag);
            });
            overflow.appendChild(popover);
            nodeDiv.appendChild(overflow);
        } else {
            // Building controller with no project associations — render the
            // empty-state hint where the project tags would go.
            var emptyTag = document.createElement('span');
            emptyTag.className = 'tree__projects-empty';
            emptyTag.textContent = 'No Faculties selected';
            nodeDiv.appendChild(emptyTag);
        }
    }

    // Configuration indicator for building controllers (Registry Sync)
    if (node.level === 'Building Controller') {
        var indicators = document.createElement('span');
        indicators.className = 'tree__indicators';

        // Reflects the server's actual Registry Sync value. Archived line
        // servers always read Disabled — archiving forces Asset Registry off and the seed
        // is kept in step (see _forceArchivedFSNOff in config-data.js).
        var fsnOn = node.fsnApiCalls !== false;

        var fsnInd = document.createElement('span');
        fsnInd.className = 'tree__indicator tree__indicator--fsn' + (fsnOn ? ' tree__indicator--enabled' : '');
        fsnInd.title = 'Registry Sync: ' + (fsnOn ? 'Enabled' : 'Disabled');
        indicators.appendChild(fsnInd);

        nodeDiv.appendChild(indicators);
    }

    li.appendChild(nodeDiv);

    // Create children container - always create for levels that can have children
    if (hasChildren || canHaveChildren) {
        const childrenUl = document.createElement('ul');
        childrenUl.className = 'tree__children';

        if (hasChildren) {
            node.children.forEach(child => {
                childrenUl.appendChild(createTreeNode(child, level + 1));
            });
        } else if (canHaveChildren) {
            // Add MDS empty state message for levels without children
            const emptyLi = document.createElement('li');
            emptyLi.className = 'tree__empty-state';
            emptyLi.innerHTML = `
                <div class="empty-state">
                    <sf-symbol class="empty-state__icon" name="tray"></sf-symbol>
                    <h3 class="empty-state__title">No ${getChildLevelName(node.level, node)}</h3>
                    <p class="empty-state__subtitle">There are no ${getChildLevelName(node.level, node)} available for this ${node.level.toLowerCase()}</p>
                </div>
            `;
            childrenUl.appendChild(emptyLi);
        }

        li.appendChild(childrenUl);
    }

    return li;
}

/**
 * Get the child level name for empty state messages
 */
function getChildLevelName(parentLevel, node) {
    if (parentLevel === 'Node Category' && node) {
        return node.sectionType === 'ghds' ? 'Campus Hub nodes' : 'Relay nodes';
    }
    const childLevelMap = {
        'Campus': 'building controllers',
        'Node Category': 'servers',
        'Building Controller': 'items',
        'Campus Hub': 'items',
        'Timetable Relay': 'items'
    };
    return childLevelMap[parentLevel] || 'items';
}

/**
 * Render the tree
 */
function renderTree() {
    const container = document.getElementById('treeContainer');
    if (!container || !lineServersData) return;

    // Clear existing tree
    container.innerHTML = '';

    const ul = document.createElement('ul');
    ul.className = 'tree';

    // `lineServersData` is an array (one root per selected site) when
    // multi-site selection is active. Single-node form is preserved as a
    // fallback for any legacy callers.
    var roots = Array.isArray(lineServersData) ? lineServersData : [lineServersData];
    roots.forEach(function(root) { ul.appendChild(createTreeNode(root)); });

    container.appendChild(ul);

    _updateOutdatedHostnameLegend(roots);
}

/**
 * Show the inline "Hostname outdated" indicator in the shortcuts hint bar only
 * when the currently rendered tree has at least one outdated Line / Campus Hub / Relay
 * hostname.
 */
function _updateOutdatedHostnameLegend(roots) {
    var legend = document.getElementById('hostnameOutdatedLegend');
    if (!legend) return;

    function walk(node) {
        if (!node) return false;
        if ((node.level === 'Building Controller' || node.level === 'Campus Hub' || node.level === 'Timetable Relay') && isHostnameOutdated(node.name)) return true;
        return (node.children || []).some(walk);
    }

    var hasOutdated = (roots || []).some(walk);
    legend.style.display = hasOutdated ? 'inline-flex' : 'none';
}

function trimOverflowTags() {
    var containers = document.querySelectorAll('.tree__projects');
    containers.forEach(function(c) {
        var tags = c.querySelectorAll('.tree__project-tag');
        var overflow = c.parentElement.querySelector('.tree__projects-overflow');
        if (!overflow) return;

        // Out-of-filter projects were folded into the popover at render time
        // and stashed on the overflow element as a count. Roll them into the
        // badge total alongside any width-hidden tags below.
        var outOfFilter = parseInt(overflow.dataset.outOfFilter || '0', 10);

        // Reset: show all tags, hide badge
        tags.forEach(function(t) { t.style.display = ''; });
        overflow.classList.remove('tree__projects-overflow--visible');

        var badge = overflow.querySelector('.tree__projects-overflow-badge');
        var widthHidden = 0;

        if (tags.length > 0) {
            // Show badge temporarily to measure container with badge space reserved
            if (badge) badge.textContent = '+0';
            overflow.classList.add('tree__projects-overflow--visible');

            var maxW = c.clientWidth;
            if (maxW > 0) {
                for (var i = 0; i < tags.length; i++) {
                    if (tags[i].offsetLeft + tags[i].offsetWidth > maxW) {
                        for (var j = i; j < tags.length; j++) {
                            tags[j].style.display = 'none';
                            widthHidden++;
                        }
                        break;
                    }
                }
            }
        }

        var total = widthHidden + outOfFilter;
        if (total > 0) {
            if (badge) badge.textContent = '+' + total;
            overflow.classList.add('tree__projects-overflow--visible');
        } else {
            overflow.classList.remove('tree__projects-overflow--visible');
        }
    });
}

/**
 * Toggle tree node expansion
 */
function toggleNode(nodeElement) {
    const toggle = nodeElement.querySelector('.tree__toggle');
    const children = nodeElement.parentElement.querySelector('.tree__children');

    // Only toggle if toggle button is visible (not hidden)
    if (children && toggle && !toggle.classList.contains('tree__toggle--hidden')) {
        const isExpanded = children.classList.contains('tree__children--expanded');

        if (isExpanded) {
            children.classList.remove('tree__children--expanded');
            toggle.classList.remove('tree__toggle--expanded');
        } else {
            children.classList.add('tree__children--expanded');
            toggle.classList.add('tree__toggle--expanded');
            requestAnimationFrame(trimOverflowTags);
        }
    }
}

/**
 * Which branches are currently open, keyed by node id. Expansion lives only in
 * the DOM, so every rebuild would otherwise collapse the tree under the user.
 */
function captureTreeExpansion() {
    var open = {};
    document.querySelectorAll('#treeContainer .tree__children--expanded').forEach(function(ul) {
        var item = ul.parentElement;
        if (item && item.dataset && item.dataset.nodeId) open[item.dataset.nodeId] = true;
    });
    return open;
}

/**
 * Re-open the captured branches. An empty snapshot means first render, where
 * the site roots are the default-open scaffolding; after that a collapsed site
 * root stays collapsed. Nodes absent from the snapshot stay collapsed, which is
 * what a newly appearing branch should do.
 */
function restoreTreeExpansion(open) {
    var firstRender = !open || Object.keys(open).length === 0;
    document.querySelectorAll('#treeContainer .tree__item').forEach(function(item) {
        var children = item.querySelector(':scope > .tree__children');
        if (!children) return;
        var shouldOpen = firstRender
            ? item.classList.contains('tree__item--level-0')
            : !!open[item.dataset.nodeId];
        if (!shouldOpen) return;
        children.classList.add('tree__children--expanded');
        var toggle = item.querySelector(':scope > .tree__node > .tree__toggle');
        if (toggle) toggle.classList.add('tree__toggle--expanded');
    });
}

/**
 * Find node data by ID
 */
function findNodeById(nodeId, node = lineServersData) {
    if (!node) return null;

    // Top-level call may pass an array of site roots when multi-site is active.
    if (Array.isArray(node)) {
        for (const root of node) {
            const result = findNodeById(nodeId, root);
            if (result) return result;
        }
        return null;
    }

    if (node.id === nodeId) {
        return node;
    }

    if (node.children) {
        for (const child of node.children) {
            const result = findNodeById(nodeId, child);
            if (result) {
                return result;
            }
        }
    }

    return null;
}

/**
 * Update sidebar title based on selected node level
 */
function updateSidebarTitle(level) {
    const titleElement = document.querySelector('.settings-panel__title');
    if (!titleElement) return;

    const titleMap = {
        'Campus': 'Campus Details',
        'Faculty': 'Faculty Details',
        'Building Controller': 'Building Controller Details',
        'Campus Hub': 'Campus Hub Details',
        'Timetable Relay': 'Timetable Relay Details',
        'Node Category': 'Node Category'
    };

    titleElement.textContent = titleMap[level] || 'Node Details';
}
