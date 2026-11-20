
/* ============================================
   GLOBAL SEARCH (subheader) — results dropdown
   ============================================

   The dropdown mirrors the tree's own vocabulary so a result reads the same as
   the row it will select: `<SITE> › <hostname>` with the matched substring in
   bold, the building controller's project tags, and the server ID. Each server-type
   group carries a header row naming its columns — without it the number on the
   right reads as a count rather than the server's ID (rdar://182306037). */

// How many project tags fit on a result row before folding into a `+N` badge.
const SEARCH_RESULT_MAX_TAGS = 2;

function escapeSearchHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
}

/**
 * Wrap every occurrence of `query` in `text` with a bold span. Both sides are
 * escaped as they're assembled, so the returned string is safe to inject.
 */
function highlightSearchMatch(text, query) {
    const source = String(text == null ? '' : text);
    if (!query) return escapeSearchHtml(source);

    const haystack = source.toLowerCase();
    const needle = query.toLowerCase();
    let html = '';
    let cursor = 0;
    let hit = haystack.indexOf(needle, cursor);

    while (hit !== -1) {
        html += escapeSearchHtml(source.slice(cursor, hit));
        html += '<strong class="search-results__match">'
            + escapeSearchHtml(source.slice(hit, hit + needle.length))
            + '</strong>';
        cursor = hit + needle.length;
        hit = haystack.indexOf(needle, cursor);
    }

    return html + escapeSearchHtml(source.slice(cursor));
}

/**
 * Every server in the estate, ignoring every tree filter — the whole point of
 * the global search is to reach a server without first guessing which filter is
 * hiding it. Picking a hidden result relaxes only what blocks it; see
 * `navigateToSearchResult`.
 *
 * Rebuilt per query, never cached: create, archive, unarchive, rename and ghDS
 * moves all mutate the seed datasets in place, so a cached index goes stale.
 *
 * Order matters. Active building controllers are indexed before archived ones and later
 * passes skip ids already seen, mirroring how `buildAllServersTree` resolves the
 * same collision — a building controller archived for one project but still active for
 * another must read as ACTIVE, or the relaxer would needlessly switch Show
 * Archived on to reveal a row that was never hidden.
 */
function buildSearchIndex() {
    var index = [];
    var seen = {};

    function add(node, site, level, archived) {
        var key = level + '::' + node.id;
        if (seen[key]) return;
        seen[key] = true;
        index.push({
            id: node.id,
            name: node.name,
            level: level,
            site: node.site || site,
            archived: archived,
            projects: node.associatedProjects || [],
            // Read by _blockingFilters only: the Faculties and Asset Registry gates in
            // buildAllServersTree key off exactly these two fields.
            everAssociated: node.everAssociated || [],
            fsnApiCalls: node.fsnApiCalls
        });
    }

    forEachSeedServer(lineServersDataSets, 'Building Controller', function(ls, site) {
        add(ls, site, 'Building Controller', false);
    });

    if (typeof orphanLineServersData !== 'undefined') {
        Object.keys(orphanLineServersData).forEach(function(site) {
            (orphanLineServersData[site] || []).forEach(function(ls) {
                add(ls, site, 'Building Controller', !!ls.archived);
            });
        });
    }

    // Archived seed records carry no `archived` key — buildAllServersTree stamps
    // it when it merges them, so the index has to stamp it too.
    if (typeof archivedServersData !== 'undefined') {
        forEachSeedServer(archivedServersData, 'Building Controller', function(ls, site) {
            add(ls, site, 'Building Controller', true);
        });
    }

    forEachSeedServer(ghdsServersData, 'Campus Hub', function(gh, site) {
        add(gh, site, 'Campus Hub', !!gh.archived);
    });
    forEachSeedServer(cdnServersData, 'Timetable Relay', function(cdn, site) {
        add(cdn, site, 'Timetable Relay', !!cdn.archived);
    });

    return index;
}

/**
 * Match the index by hostname, ID, site and project. The `level::id` key already
 * collapses both duplication axes in the data: a building controller is stored once per
 * associated project, and an archived one once per historical project.
 */
function searchServers(query) {
    var lowerQuery = query.toLowerCase();
    return buildSearchIndex().filter(function(r) {
        return [r.name, r.id, r.site, (r.projects || []).join(' ')]
            .join(' ')
            .toLowerCase()
            .indexOf(lowerQuery) !== -1;
    });
}

/**
 * Group search results by level
 */
function groupResultsByLevel(results) {
    const grouped = {};

    results.forEach(result => {
        if (!grouped[result.level]) {
            grouped[result.level] = [];
        }
        grouped[result.level].push(result);
    });

    return grouped;
}

/**
 * Faculty tags for a result row, capped at SEARCH_RESULT_MAX_TAGS so every row
 * stays one line. The folded remainder is reachable on hover via `title`.
 */
function renderSearchProjects(projects) {
    if (!projects || projects.length === 0) return '';

    const sorted = projects.slice().sort();
    const shown = sorted.slice(0, SEARCH_RESULT_MAX_TAGS);
    const hidden = sorted.length - shown.length;

    let html = shown.map(function(p) {
        return '<span class="tag tag--tiny tag--gray search-results__project-tag" title="'
            + escapeSearchHtml(p) + '">' + escapeSearchHtml(p) + '</span>';
    }).join('');

    if (hidden > 0) {
        html += '<span class="search-results__projects-more" title="'
            + escapeSearchHtml(sorted.join(', ')) + '">+' + hidden + '</span>';
    }

    return html;
}

/**
 * One result row: `<SITE> › <hostname>` + project tags + ID.
 */
function renderSearchResultRow(result, query, showProjects) {
    // The master Campus Hub is shared across every site, so it carries no site
    // prefix — the same reason the tree tags it rather than nesting it.
    const isSharedMaster = result.level === 'Campus Hub'
        && typeof MASTER_GHDS_HOSTNAME !== 'undefined'
        && result.name === MASTER_GHDS_HOSTNAME;
    const sitePrefix = (!isSharedMaster && result.site)
        ? '<span class="search-results__site">' + escapeSearchHtml(result.site) + '</span>'
          + '<span class="search-results__separator"><sf-symbol name="chevron.right"></sf-symbol></span>'
        : '';
    const archivedTag = result.archived
        ? '<span class="tag tag--tiny tag--gray search-results__archived">Archived</span>'
        : '';

    // The row carries everything the relaxer needs to decide which filters hide
    // this server. Stamped on the element rather than kept in a module array so
    // the debounce can replace the results mid-click without stranding the
    // handler on a stale record.
    return `
        <div class="search-results__item" data-node-id="${escapeSearchHtml(result.id)}" role="option" tabindex="-1"
             data-level="${escapeSearchHtml(result.level)}"
             data-site="${escapeSearchHtml(result.site || '')}"
             data-archived="${result.archived ? '1' : '0'}"
             data-fsn="${result.fsnApiCalls === false ? '0' : '1'}"
             data-projects="${escapeSearchHtml((result.projects || []).join(','))}"
             data-ever="${escapeSearchHtml((result.everAssociated || []).join(','))}">
            <span class="search-results__label">
                ${sitePrefix}
                <span class="search-results__name">${highlightSearchMatch(result.name, query)}</span>
                ${archivedTag}
            </span>
            <span class="search-results__cell search-results__cell--projects">${showProjects ? renderSearchProjects(result.projects) : ''}</span>
            <span class="search-results__cell search-results__cell--id">${escapeSearchHtml(result.id)}</span>
        </div>
    `;
}

/** Rebuild a search record from the row's data attributes. */
function _resultFromRow(el) {
    var csv = function(v) { return v ? v.split(',') : []; };
    return {
        id: el.dataset.nodeId,
        level: el.dataset.level,
        site: el.dataset.site || '',
        archived: el.dataset.archived === '1',
        fsnApiCalls: el.dataset.fsn !== '0',
        projects: csv(el.dataset.projects),
        everAssociated: csv(el.dataset.ever)
    };
}

/**
 * Render search results
 */
function renderSearchResults(results, query) {
    const resultsContainer = document.getElementById('searchResults');

    if (!results) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('tree-search__results--visible');
        return;
    }

    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="search-results">'
            + '<div class="search-results__empty">No results found</div>'
            + '</div>';
        resultsContainer.classList.add('tree-search__results--visible');
        return;
    }

    const grouped = groupResultsByLevel(results);
    // Only building controllers carry project associations, so only their group gets a
    // Faculties column — Campus Hub and Relay groups show the ID column alone.
    const levelOrder = [
        { level: 'Building Controller', label: 'Building Controllers', projects: true },
        { level: 'Campus Hub', label: 'Campus Hubs', projects: false },
        { level: 'Timetable Relay', label: 'Timetable Relays', projects: false }
    ];

    let html = '<div class="search-results" role="listbox">';
    html += '<div class="search-results__count">' + results.length
        + (results.length === 1 ? ' result found:' : ' results found:') + '</div>';

    levelOrder.forEach(group => {
        const rows = grouped[group.level];
        if (!rows || rows.length === 0) return;

        html += `
            <div class="search-results__group">
                <div class="search-results__group-header">
                    <span class="search-results__group-label">
                        <span class="search-results__group-icon">${iconMap[group.level] || ''}</span>
                        ${group.label}
                    </span>
                    <span class="search-results__cell search-results__cell--projects">${group.projects ? 'Faculties' : ''}</span>
                    <span class="search-results__cell search-results__cell--id">ID</span>
                </div>
                <div class="search-results__items">
        `;

        rows.forEach(result => {
            html += renderSearchResultRow(result, query, group.projects);
        });

        html += `
                </div>
            </div>
        `;
    });

    html += '</div>';

    resultsContainer.innerHTML = html;
    resultsContainer.classList.add('tree-search__results--visible');
}

/**
 * Handle search input
 */
function handleSearch(query) {
    const resultsContainer = document.getElementById('searchResults');

    if (query.length < 3) {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('tree-search__results--visible');
        return;
    }

    renderSearchResults(searchServers(query), query);
}

/**
 * Which active filters hide `result` from the tree. Only ever consulted when the
 * node is NOT already rendered, so a cross-site NORT ghDS (which renders under
 * whichever site references it) never reaches here and never drags NORT into the
 * site selection.
 *
 * The Faculties filter is deliberately NOT decided here: whether it is narrowed
 * depends on `getAvailableProjectsForSites(selectedSites)`, and the site set is
 * about to change. It is evaluated in `navigateToSearchResult` once sites settle.
 */
function _blockingFilters(result) {
    var blocking = { site: false, archived: false, fsn: false };

    blocking.site = !!result.site
        && (!Array.isArray(selectedSites) || selectedSites.indexOf(result.site) === -1);

    var archivedFilter = document.getElementById('filterArchived');
    blocking.archived = !!result.archived && !!archivedFilter && !archivedFilter.checked;

    if (result.level === 'Building Controller') {
        var fsnFilter = document.getElementById('filterFSN');
        var mode = fsnFilter ? fsnFilter.value : 'all';
        blocking.fsn = (mode === 'enabled' && result.fsnApiCalls === false)
                    || (mode === 'disabled' && result.fsnApiCalls !== false);
    }

    return blocking;
}

/**
 * Reveal a search result and select it, relaxing only the filters that hide it.
 * Filters are widened, never narrowed — the rest of the user's setup is left
 * alone, and Reset Filters is the way back.
 */
function navigateToSearchResult(result) {
    // Already rendered? Then nothing is hiding it and no filter needs touching.
    if (document.querySelector('.tree__node[data-node-id="' + result.id + '"]')) {
        navigateToServer(result.id);
        return;
    }

    var blocking = _blockingFilters(result);

    // Set the filter properties directly. Dispatching `change` would make the
    // listeners in init-search.js each fire their own rebuild + navigate.
    if (blocking.archived) document.getElementById('filterArchived').checked = true;
    if (blocking.fsn) document.getElementById('filterFSN').value = 'all';

    if (blocking.site) {
        selectedSites = selectedSites.concat([result.site]).sort();
        // setSelected always notifies, and the Campus onChange runs
        // updateLayoutVisibility — async, and it clears the selection we are
        // about to make. Suppress it and drive the render ourselves below.
        _suppressSitesOnChange = true;
        try {
            window.ProjMultiSelect.setSelected('#siteSelect', selectedSites.slice());
        } finally {
            _suppressSitesOnChange = false;
        }
        syncProjectsFilterForSites(selectedSites);
    }

    // Faculties last, now that the site set (and so the available project pool)
    // has settled. Mirrors the narrowing test in buildAllServersTree.
    if (result.level === 'Building Controller') {
        var available = (typeof getAvailableProjectsForSites === 'function')
            ? (getAvailableProjectsForSites(selectedSites) || []) : [];
        var narrowed = Array.isArray(selectedProjects)
            && available.length > 0
            && selectedProjects.length < available.length;
        var bag = result.archived
            ? (result.everAssociated.length ? result.everAssociated : result.projects)
            : result.projects;
        var visible = bag.some(function(p) { return selectedProjects.indexOf(p) !== -1; });

        if (narrowed && !visible) {
            // An orphan has no project to add, so the only relaxation that can
            // reveal it is dropping the narrowing entirely.
            var widened = bag.length === 0
                ? available.slice()
                : selectedProjects.concat(bag.filter(function(p) { return available.indexOf(p) !== -1; }));
            selectedProjects = available.filter(function(p) { return widened.indexOf(p) !== -1; });
            _suppressProjectsOnChange = true;
            try {
                window.ProjMultiSelect.setSelected('#projectSelect', selectedProjects.slice());
            } finally {
                _suppressProjectsOnChange = false;
            }
        }
    }

    // One render. reRenderTree is synchronous and keeps the selection, unlike
    // updateLayoutVisibility.
    if (typeof BulkMode !== 'undefined') BulkMode.clearSelection();
    reRenderTree();

    navigateToServer(result.id);
    if (typeof window._updateResetFiltersState === 'function') window._updateResetFiltersState();
}

/**
 * Initialize search functionality
 */
function initSearch() {
    const searchInput = document.getElementById('treeSearch');
    const resultsContainer = document.getElementById('searchResults');
    let searchTimeout = null;

    if (!searchInput || !resultsContainer) {
        return;
    }

    function closeResults() {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.remove('tree-search__results--visible');
    }

    // Handle input with debounce
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            handleSearch(e.target.value);
        }, 300);
    });

    // Escape closes the dropdown without clearing the query
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeResults();
    });

    // Handle result clicks
    resultsContainer.addEventListener('click', (e) => {
        const resultItem = e.target.closest('.search-results__item');
        if (resultItem) {
            // Search spans the whole estate, so the picked server may be hidden
            // by the current filters. navigateToSearchResult relaxes whatever
            // blocks it, then expands every collapsed ancestor and selects it.
            navigateToSearchResult(_resultFromRow(resultItem));

            // Clear search
            searchInput.value = '';
            closeResults();
        }
    });

    // Close results when clicking outside. Scoped to `.tree-search-wrapper`
    // (the element that actually carries the input and the dropdown) so that
    // clicking back into the field doesn't dismiss the results.
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tree-search-wrapper')) {
            closeResults();
        }
    });
}
