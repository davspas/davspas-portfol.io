---
src: js/tree-rendering.js
does: Tree DOM construction: builds each node's markup (toggle, icon, label, inline faculty tags, config indicators), the empty-state rows, the overflow-tag trimming pass, and the node finder used across modules.
symbols: [createTreeNode, getChildLevelName, renderTree, _updateOutdatedHostnameLegend, walk, trimOverflowTags, toggleNode, captureTreeExpansion, restoreTreeExpansion, findNodeById, updateSidebarTitle]
dom: ["#treeContainer", "#hostnameOutdatedLegend"]
map-sig: v1 178509303
---
