---
src: js/tree-search.js
does: The subheader global search: matches every server in the estate (not just the rendered tree), renders the results dropdown, and reveals a picked result by relaxing only the filters that hide it.
symbols: [SEARCH_RESULT_MAX_TAGS, escapeSearchHtml, highlightSearchMatch, buildSearchIndex, add, searchServers, groupResultsByLevel, renderSearchProjects, renderSearchResultRow, _resultFromRow, renderSearchResults, handleSearch, _blockingFilters, navigateToSearchResult, initSearch, closeResults]
exports: [window._updateResetFiltersState]
dom: ["#searchResults", "#filterArchived", "#filterFSN", "#treeSearch", "#siteSelect", "#projectSelect"]
map-sig: v1 3914978394
---
