---
src: js/manage-actions.js
does: the panel-header Manage dropdown and its context-aware actions (Move included), the three checklist drawers over one shared checklist, archive/unarchive for all three server types, and the create flows
symbols: [_genId, _val, _ensureDataEntry, _projectHasLS, _findGHDSByName, _infoBox, _closeManagePopover, _openDrawer, _closeDrawer, _refreshAndSelect, _archiveBlockReason, _moveBlockReason, _manageCDNLSBlockReason, _manageGHDSLSBlockReason, _buildMenu, _renderMenu, _handleMenuClick, _buildChecklistEmptyState, _buildChecklist, updateCount, updateTags, updateSelectAll, updateEmptyState, _buildManageProjects, _buildManageLSForCDN, _buildManageLSForGHDS, _checklistDiff, _showArchiveConfirm, _closeArchiveConfirm, _showRemoveAllArchiveConfirm, _closeRemoveAllArchiveConfirm, _manageProjectsRemovesAll, _execRemoveAllProjects, _handleConfirm, _execManageProjects, _execArchiveServer, _archiveStandaloneServer, _execManageLSForCDN, _execManageLSForGHDS, _removeProjectAssociation, _archiveServerForProject, _unarchiveServerForProject, init, showMenu, showBulkMenu, hideMenu]
exports: [window.ManageActions]
dom: ["#managePopover", "#manageActionDrawer", "#manageActionDrawerTitle", "#manageActionConfirm", "#manageActionCancel", "#manageActionDrawerContent", "#manageMenu", "#managePopoverTrigger", "#archiveConfirmBody", "#archiveConfirmPopover", "#manageActionConfirmBody", "#manageActionConfirmPopover", "#closeManageActionDrawer", "#archiveConfirmBtn", "#archiveConfirmCancel", "#manageActionConfirmArchiveBtn", "#manageActionConfirmCancel"]
state: [_node, _idCounter]
map-sig: v1 952568549
---
