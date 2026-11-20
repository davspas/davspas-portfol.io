---
src: js/ui-helpers.js
does: Tree data assembly and layout orchestration: builds a subtree per selected campus, toggles the body between empty-state and tree/panel layout, reconciles the Faculties filter across campus changes, and owns showToast and the single tree-rebuild path.
symbols: [loadLineServersData, buildAllServersTree, _partitionArchived, checkSelections, updateSearchState, _rebuildTreeDOM, reRenderTree, updateLayoutVisibility, getAvailableProjectsForSites, _lastAvailableProjects, _suppressProjectsOnChange, _suppressSitesOnChange, syncProjectsFilterForSites, updateProjectSelectLabel, updateAvailableProjects, showToast, attachTooltip, hide, show, renderProxyChangedNote]
dom: ["#filterArchived", "#filterFSN", "#treeSearch", "#searchResults", "#treeContainer", "#noSelectionState", "#lineServersLayout", "#subheaderActions", "#subheaderScopeDivider", "#projectSelect", "#subheaderSearchWrapper", "#projectSelectTrigger", "#projectSelectDropdown"]
map-sig: v1 514146566
---
