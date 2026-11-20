/**
 * New Node Drawer Module - Unified Form
 * Single-page form for creating a Building Controller with optional Campus Hub and Relay servers.
 * Campus Hub/Relay sections expand via toggle switches.
 */
(function() {
    'use strict';

    var lineServerEnabled = true;
    var ghdsEnabled = false;
    var cdnEnabled = false;
    var formSelectedProjects = [];
    var cdnSelectedLineServers = [];
    // Ids the Relay line-server list offered last time, so a rebuild can tell a row that
    // is new (pre-check it) from one the user unchecked (leave it unchecked).
    var _cdnOptionIds = [];
    // Faculties the Create/Unarchive form offered for the chosen Campus Hub (its grant).
    var _offeredFormProjects = [];
    // Form signature taken just after the drawer finished opening; Close asks only if it changed.
    var _dirtyBaseline = null;
    var formSelectedCDNs = [];

    function init() {
        var drawer = document.getElementById('newServerDrawer');
        if (!drawer) return;

        // Open drawer from the subheader Create Node button. The site is
        // picked inside the drawer via the in-drawer Campus dropdown; entries
        // from Manage actions / Unarchive bypass that field by passing
        // entryPoint via openWithFocus / openWithContext / openForUnarchive.
        var newServerBtn = document.getElementById('newServerBtn');
        if (newServerBtn) {
            newServerBtn.addEventListener('click', _openFromSubheaderClick);
        }

        // Close drawer (X button closes directly)
        var closeBtn = document.getElementById('closeNewServerDrawer');
        if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

        // Cancel button: if form is dirty, let MDS popover handle the toggle;
        // if clean, close drawer directly (prevent MDS toggle)
        var cancelBtn = document.getElementById('cancelNewServer');
        var cancelPopover = document.getElementById('cancelNewServerPopover');
        var cancelConfirmBtn = document.getElementById('cancelNewServerConfirm');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function(e) {
                if (!_isFormDirty()) {
                    e.stopPropagation();
                    if (cancelPopover) cancelPopover.classList.remove('popover--open');
                    closeDrawer();
                }
            });
        }
        if (cancelConfirmBtn) {
            cancelConfirmBtn.addEventListener('click', function() {
                closeDrawer();
            });
        }

        var cancelKeepBtn = document.getElementById('cancelNewServerKeep');
        if (cancelKeepBtn) {
            cancelKeepBtn.addEventListener('click', function() {
                if (cancelPopover) {
                    cancelPopover.style.display = 'none';
                    cancelPopover.classList.remove('popover--open');
                }
            });
        }

        // Click outside to close
        drawer.addEventListener('click', function(e) {
            if (e.target === drawer) closeDrawer();
        });

        // Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && drawer.classList.contains('drawer-overlay--open')) {
                if (cancelPopover && cancelPopover.classList.contains('popover--open')) {
                    // MDS opens popovers with the class AND an inline display; reset both.
                    cancelPopover.style.display = 'none';
                    cancelPopover.classList.remove('popover--open');
                } else {
                    closeDrawer();
                }
            }
        });

        // Save
        var saveBtn = document.getElementById('saveNewServer');
        if (saveBtn) saveBtn.addEventListener('click', function() { handleSave(); });

        // Building Controller toggle
        var toggleLS = document.getElementById('toggleLineServer');
        if (toggleLS) {
            toggleLS.addEventListener('change', function() {
                lineServerEnabled = toggleLS.checked;
                toggleSection('lineServerFormSection', lineServerEnabled);
                syncCDNGHDSFromLineServer();
                updateSaveButtonState();
            });
        }

        // Campus Hub toggle
        var toggleGHDS = document.getElementById('toggleGHDS');
        if (toggleGHDS) {
            toggleGHDS.addEventListener('change', function() {
                ghdsEnabled = toggleGHDS.checked;
                toggleSection('ghdsFormSection', ghdsEnabled);
                updateGHDSAssociation();
                updateCDNGHDSAssociation();
                updateCDNLineServerOptions();
                updateAvailableFormProjects(getFormSite());
                _autoUpdateDrawerProxies();
                updateSaveButtonState();
            });
        }

        // Relay toggle
        var toggleCDN = document.getElementById('toggleCDN');
        if (toggleCDN) {
            toggleCDN.addEventListener('change', function() {
                cdnEnabled = toggleCDN.checked;
                toggleSection('cdnFormSection', cdnEnabled);
                updateCDNLineServerOptions();
                updateCDNAssociation();
                syncLineGHDSFromCDN();
                updatePGMState();
                _autoUpdateDrawerProxies();
                updateSaveButtonState();
            });
        }

        // In-drawer Campus dropdown (visible only on the subheader entry path).
        // Changing it re-scopes every site-dependent field — same chain that
        // openDrawer runs on first open.
        var siteSelect = document.getElementById('newServerSite');
        if (siteSelect) {
            siteSelect.addEventListener('change', function() {
                var site = getFormSite();
                if (site) {
                    updateAvailableFormProjects(site);
                    updateGHDSOptions();
                    updateCDNGHDSOptions();
                    updateCDNLineServerOptions();
                    updateLineCDNOptions();
                    updatePGMState();
                    if (_moveMode) _applyMoveSiteDefaults();
                    _autoUpdateDrawerProxies();
                }
                _updateFormLockState();
                updateSaveButtonState();
            });
        }

        // Form dependencies
        initFormDependencies();
    }

    /**
     * Open the drawer.
     *   - Subheader entry: pass `opts.entryPoint = 'subheader'` and `site = null`;
     *     the drawer renders the in-drawer Campus dropdown populated from the
     *     header `selectedSites`.
     *   - Manage entry: pass the resolved site as the first arg; the drawer
     *     hides the Campus field and updates the title to "Create New Node
     *     for <site>".
     *   - Unarchive entry: pass the archived server's site and
     *     `opts.entryPoint = 'unarchive'`; the field is hidden and the
     *     unarchive flow swaps the title afterward.
     */
    function openDrawer(site, opts) {
        var drawer = document.getElementById('newServerDrawer');
        if (!drawer) return;
        opts = opts || {};
        var entryPoint = opts.entryPoint || (site ? 'manage' : 'subheader');
        resetForm();
        populateDrawerSiteOptions(site, { entryPoint: entryPoint, excludeSite: opts.excludeSite });
        var resolvedSite = getFormSite();
        if (resolvedSite) {
            updateAvailableFormProjects(resolvedSite);
            updateGHDSOptions();
            updateCDNGHDSOptions();
            updateCDNLineServerOptions();
            updateLineCDNOptions();
            updatePGMState();
        }
        _updateFormLockState();
        updateSaveButtonState();
        drawer.classList.add('drawer-overlay--open');
        // The entry-point and Unarchive/Move prefills finish within ~100 ms; whatever the
        // form holds after that is the "unedited" state Close compares against.
        _dirtyBaseline = null;
        setTimeout(function() { _dirtyBaseline = _formSignature(); }, 250);
    }

    /**
     * Subheader Create Node button click: open the drawer in subheader
     * entry mode. The drawer renders the in-drawer Campus dropdown populated
     * from `selectedSites`; the user picks the site there.
     * If 0 sites are selected the button is hidden by updateLayoutVisibility,
     * so this never opens an empty drawer.
     */
    function _openFromSubheaderClick(e) {
        if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
        var sites = (typeof selectedSites !== 'undefined' && Array.isArray(selectedSites)) ? selectedSites : [];
        if (sites.length === 0) return;
        openDrawer(null, { entryPoint: 'subheader' });
    }

    function closeDrawer() {
        _resetUnarchiveMode();
        _clearAllFieldErrors();
        var cancelPopover = document.getElementById('cancelNewServerPopover');
        if (cancelPopover) cancelPopover.classList.remove('popover--open');
        var drawer = document.getElementById('newServerDrawer');
        if (drawer) {
            drawer.classList.remove('drawer-overlay--open');
        }
    }

    /**
     * Toggle expandable section visibility
     */
    function toggleSection(sectionId, open) {
        var section = document.getElementById(sectionId);
        if (!section) return;

        if (open) {
            section.classList.add('new-server-form__expandable--open');
        } else {
            section.classList.remove('new-server-form__expandable--open');
        }
    }

    /**
     * Update Campus Hub Association field based on toggle state
     */
    function updateGHDSAssociation() {
        var ghdsSelect = document.getElementById('newLineGHDS');
        var ghdsHelp = document.getElementById('newLineGHDSHelp');
        if (!ghdsSelect) return;

        if (ghdsEnabled) {
            ghdsSelect.disabled = true;
            ghdsSelect.innerHTML = '<option value="__new__">New Campus Hub (from this form)</option>';
            if (ghdsHelp) ghdsHelp.textContent = 'Will be associated with the Campus Hub node being created';
        } else {
            ghdsSelect.disabled = false;
            updateGHDSOptions();
        }
    }

    /**
     * Update Relay Association field on Building Controller form based on Relay toggle state
     */
    function updateCDNAssociation() {
        var cdnHelp = document.getElementById('newLineCDNHelp');

        if (cdnEnabled) {
            _setLineCDNOptions([{ id: '__new__', label: 'New Timetable Relay (from this form)' }], { selected: '__new__', disabled: true });
            if (cdnHelp) cdnHelp.textContent = 'Will be associated with the Relay node being created';
        } else {
            updateLineCDNOptions();
            if (cdnHelp) cdnHelp.textContent = '';
        }
    }

    /**
     * Toggle the .new-server-form--site-locked class on the form root based
     * on whether `getFormSite()` returns a non-empty value. While locked,
     * the three toggle sections are dimmed and click-blocked (CSS rule in
     * wizard.css). The Campus field stays interactive so the user can pick.
     */
    function _updateFormLockState() {
        var form = document.querySelector('#newServerDrawer .new-server-form');
        if (!form) return;
        if (getFormSite()) {
            form.classList.remove('new-server-form--site-locked');
        } else {
            form.classList.add('new-server-form--site-locked');
        }
    }

    /**
     * Get the drawer's resolved site value from the in-drawer Campus dropdown.
     */
    function getFormSite() {
        var siteEl = document.getElementById('newServerSite');
        return siteEl ? siteEl.value : '';
    }

    /**
     * Render the in-drawer Campus field based on entry point.
     *   - 'subheader' with 2+ sites in scope: options = current `selectedSites`;
     *      placeholder selected, user must pick.
     *   - 'subheader' with exactly one site in scope: field hidden and title
     *      swapped to "Create New Node for <site>" — same shape as 'manage'.
     *      The site is implied so the dropdown adds no value.
     *   - 'manage' / 'unarchive': field hidden. A single <option> for the
     *      passed-in site is set so getFormSite() returns the right value
     *      (Unarchive may pass a site that isn't in `selectedSites`).
     *   - 'manage' rewrites the drawer title to "Create New Node for <site>".
     *     'unarchive' leaves the title untouched (the unarchive flow swaps it).
     */
    function populateDrawerSiteOptions(site, opts) {
        opts = opts || {};
        var entryPoint = opts.entryPoint || (site ? 'manage' : 'subheader');
        var select = document.getElementById('newServerSite');
        var wrapper = document.getElementById('newServerSiteField');
        var form = document.querySelector('#newServerDrawer .new-server-form');
        var titleEl = document.querySelector('#newServerDrawer .drawer__title');
        if (!select) return;

        // Toggle a form-root modifier so CSS can drop the first toggle section's
        // top border when the Campus field is hidden (the divider only makes sense
        // when the Campus field is above it).
        function _setSiteHidden(hidden) {
            if (wrapper) wrapper.style.display = hidden ? 'none' : '';
            if (form) form.classList.toggle('new-server-form--no-site', hidden);
        }

        select.innerHTML = '';

        var siteHelp = document.getElementById('newServerSiteHelp');
        if (siteHelp) {
            siteHelp.textContent = entryPoint === 'move'
                ? 'Choose where to move this node. The list shows the other campuses currently selected. Update the Campus filter in the header to add more.'
                : 'Choose where to add this node. The list shows the campuses currently selected. Update the Campus filter in the header to add more.';
        }

        // 'move': the Campus IS the edit (FR-P2-23). Always shown, never pre-picked
        // — the rest of the form stays locked until a target is chosen — and
        // lists every header-selected site except the one the server is on.
        if (entryPoint === 'move') {
            _setSiteHidden(false);
            var movePlaceholder = document.createElement('option');
            movePlaceholder.value = '';
            movePlaceholder.textContent = 'Select a campus';
            select.appendChild(movePlaceholder);
            var targets = (typeof selectedSites !== 'undefined' && Array.isArray(selectedSites))
                ? selectedSites.filter(function(s) { return s !== opts.excludeSite; }).sort()
                : [];
            targets.forEach(function(s) {
                var opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            });
            select.disabled = false;
            return;
        }

        if (entryPoint === 'subheader') {
            var sites = (typeof selectedSites !== 'undefined' && Array.isArray(selectedSites))
                ? selectedSites.slice().sort()
                : [];

            // Exactly one site selected → behave like a 'manage' entry: hide
            // the dropdown and surface the site in the drawer title. The
            // dropdown adds no value when there's only one option.
            if (sites.length === 1) {
                _setSiteHidden(true);
                var implied = document.createElement('option');
                implied.value = sites[0];
                implied.textContent = sites[0];
                implied.selected = true;
                select.appendChild(implied);
                select.disabled = true;
                if (titleEl) titleEl.textContent = 'Create New Node for ' + sites[0];
                return;
            }

            _setSiteHidden(false);

            var placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Select a campus';
            select.appendChild(placeholder);
            sites.forEach(function(s) {
                var opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            });
            select.disabled = false;
            if (titleEl) titleEl.textContent = 'Create New Node';
            return;
        }

        // 'manage' or 'unarchive': field hidden, single locked option.
        _setSiteHidden(true);
        var resolved = site || '';
        var locked = document.createElement('option');
        locked.value = resolved;
        locked.textContent = resolved || '—';
        locked.selected = true;
        select.appendChild(locked);
        select.disabled = true;

        if (entryPoint === 'manage' && titleEl) {
            titleEl.textContent = resolved
                ? 'Create New Node for ' + resolved
                : 'Create New Node';
        }
    }

    /**
     * Update Campus Hub dropdown options based on site
     */
    function updateGHDSOptions(archivedHostname) {
        var ghdsSelect = document.getElementById('newLineGHDS');
        if (!ghdsSelect || ghdsEnabled) return;

        var site = getFormSite();
        ghdsSelect.innerHTML = '<option value="">Select a Campus Hub</option>';

        if (site) {
            var ghdsServers = getGHDSServersForSite(site);
            ghdsServers.forEach(function(server) {
                var opt = document.createElement('option');
                opt.value = server.id;
                opt.textContent = server.site === 'NORT' && site !== 'NORT' ? server.name + ' (NORT)' : server.name;
                ghdsSelect.appendChild(opt);
            });
            _appendArchivedGHDSOption(ghdsSelect, archivedHostname);
        }

        var ghdsHelp = document.getElementById('newLineGHDSHelp');
        if (ghdsHelp) {
            ghdsHelp.textContent = site && site !== 'NORT'
                ? 'Filtered by selected campus. NORT nodes also included.'
                : 'Filtered by selected campus';
        }
    }

    /**
     * Update Relay Campus Hub Association field based on Campus Hub toggle state
     */
    function updateCDNGHDSAssociation() {
        var cdnGHDS = document.getElementById('newCDNGHDS');
        var cdnGHDSHelp = document.getElementById('newCDNGHDSHelp');
        if (!cdnGHDS) return;

        if (ghdsEnabled) {
            cdnGHDS.disabled = true;
            cdnGHDS.innerHTML = '<option value="__new__">New Campus Hub (from this form)</option>';
            if (cdnGHDSHelp) cdnGHDSHelp.textContent = 'Will be associated with the Campus Hub node being created';
        } else {
            syncCDNGHDSFromLineServer();
        }
    }

    /**
     * Sync Relay Campus Hub field from Building Controller Campus Hub selection.
     * When a Campus Hub is selected on the Building Controller, Relay inherits it (disabled).
     * When cleared, Relay Campus Hub restores its own dropdown options.
     */
    function syncCDNGHDSFromLineServer() {
        var cdnGHDS = document.getElementById('newCDNGHDS');
        var cdnGHDSHelp = document.getElementById('newCDNGHDSHelp');
        if (!cdnGHDS || ghdsEnabled) return;

        var lineGHDS = document.getElementById('newLineGHDS');
        var lineVal = lineGHDS ? lineGHDS.value : '';

        // Don't override Relay if LS Campus Hub is inherited (disabled = Relay was the source)
        if (lineGHDS && lineGHDS.disabled) return;

        if (lineVal && lineServerEnabled) {
            var lineText = lineGHDS.options[lineGHDS.selectedIndex].text;
            cdnGHDS.innerHTML = '<option value="' + lineVal + '" selected>' + lineText + '</option>';
            cdnGHDS.disabled = true;
            if (cdnGHDSHelp) cdnGHDSHelp.textContent = 'Inherited from Building Controller Campus Hub selection';
        } else {
            cdnGHDS.disabled = false;
            updateCDNGHDSOptions();
            if (cdnGHDSHelp) cdnGHDSHelp.textContent = 'Campus Hub node this Relay is connected to';
        }
        updateCDNLineServerOptions();
    }

    /**
     * Sync Building Controller Campus Hub field from Relay Campus Hub selection.
     * When a Campus Hub is selected on the Relay, LS inherits it (disabled).
     * When cleared or Relay disabled, LS Campus Hub restores its own dropdown.
     */
    function syncLineGHDSFromCDN() {
        var lineGHDS = document.getElementById('newLineGHDS');
        var lineGHDSHelp = document.getElementById('newLineGHDSHelp');
        if (!lineGHDS || ghdsEnabled || !lineServerEnabled) return;

        // Don't override if LS already has a user-selected value (not disabled = user chose it)
        if (lineGHDS.value && !lineGHDS.disabled) return;

        var cdnGHDS = document.getElementById('newCDNGHDS');
        var cdnVal = cdnGHDS ? cdnGHDS.value : '';

        if (cdnVal && cdnEnabled) {
            var cdnText = cdnGHDS.options[cdnGHDS.selectedIndex].text;
            lineGHDS.innerHTML = '<option value="' + cdnVal + '" selected>' + cdnText + '</option>';
            lineGHDS.disabled = true;
            if (lineGHDSHelp) lineGHDSHelp.textContent = 'Inherited from Relay Campus Hub selection';
        } else {
            lineGHDS.disabled = false;
            updateGHDSOptions();
            if (lineGHDSHelp) {
                var site = getFormSite();
                lineGHDSHelp.textContent = site && site !== 'NORT'
                    ? 'Filtered by selected campus. NORT nodes also included.'
                    : 'Filtered by selected campus';
            }
        }
        updateLineCDNOptions();
        updateAvailableFormProjects(getFormSite());
        updateSaveButtonState();
    }

    /**
     * Update Relay Campus Hub dropdown options based on site
     */
    function updateCDNGHDSOptions(archivedHostname) {
        var cdnGHDS = document.getElementById('newCDNGHDS');
        if (!cdnGHDS || ghdsEnabled) return;

        var site = getFormSite();
        cdnGHDS.innerHTML = '<option value="">Select a Campus Hub</option>';

        if (site) {
            var ghdsServers = getGHDSServersForSite(site);
            ghdsServers.forEach(function(server) {
                var opt = document.createElement('option');
                opt.value = server.id;
                opt.textContent = server.site === 'NORT' && site !== 'NORT' ? server.name + ' (NORT)' : server.name;
                cdnGHDS.appendChild(opt);
            });
            _appendArchivedGHDSOption(cdnGHDS, archivedHostname);
        }
    }

    // ── Archived Campus Hub on Unarchive ──
    // A server being unarchived may point at a Campus Hub that has since been archived
    // too. The option lists exclude archived Campus Hub (getGHDSServersForSite), so the
    // stored association is added back as a DISABLED "(Archived)" option: the
    // user sees what it was, can't pick it again, and Save stays blocked with an
    // error until an active Campus Hub is chosen.
    var _archivedGHDSShown = { newLineGHDS: false, newCDNGHDS: false };

    function _appendArchivedGHDSOption(select, hostname) {
        if (!hostname || typeof findGHDSServerByHostname !== 'function') return;
        var srv = findGHDSServerByHostname(hostname);
        if (!srv || !srv.archived || srv.name !== hostname) return;
        var opt = document.createElement('option');
        opt.value = srv.id || srv.name;
        opt.textContent = srv.name + ' (Archived)';
        opt.disabled = true;
        opt.setAttribute('data-archived', 'true');
        select.appendChild(opt);
    }

    function _selectedGHDSArchived(selectId) {
        var sel = document.getElementById(selectId);
        var opt = sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex] : null;
        return !!(opt && opt.getAttribute('data-archived') === 'true');
    }

    function _archivedGHDSMessage(selectId) {
        var sel = document.getElementById(selectId);
        var name = ghdsHostnameFromAssociation(sel.options[sel.selectedIndex].textContent);
        return 'Campus Hub ' + name + ' is archived. Select another Campus Hub or unarchive it first.';
    }

    /** Paint or clear the archived-GHDS error on both Campus Hub dropdowns. */
    function _refreshArchivedGHDSError() {
        Object.keys(_archivedGHDSShown).forEach(function(id) {
            if (_selectedGHDSArchived(id)) {
                _showFieldError(id, _archivedGHDSMessage(id));
                _archivedGHDSShown[id] = true;
            } else if (_archivedGHDSShown[id]) {
                _clearFieldError(id);
                _archivedGHDSShown[id] = false;
            }
        });
    }

    /** Save-time backstop for the gate above. */
    function _checkGHDSNotArchived(selectIds) {
        for (var i = 0; i < selectIds.length; i++) {
            if (!_selectedGHDSArchived(selectIds[i])) continue;
            _showFieldError(selectIds[i], _archivedGHDSMessage(selectIds[i]));
            _archivedGHDSShown[selectIds[i]] = true;
            document.getElementById(selectIds[i]).focus();
            return false;
        }
        return true;
    }

    /**
     * Check if a site is Standalone Campus by looking at its Campus Hub server types
     */
    function isSiteFATP(site) {
        if (typeof ghdsServersData === 'undefined' || !ghdsServersData[site]) return false;
        var siteData = ghdsServersData[site];
        for (var proj in siteData) {
            var siteNode = siteData[proj];
            if (siteNode && siteNode.children) {
                for (var i = 0; i < siteNode.children.length; i++) {
                    var projNode = siteNode.children[i];
                    if (projNode.children) {
                        for (var j = 0; j < projNode.children.length; j++) {
                            if (projNode.children[j].serverType === 'fatp') return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    // getGHDSServersForSite / getCDNServersForSite now live in config-data.js —
    // the side-panel association dropdowns and the association drawers need the
    // same lists, and all of them must exclude archived servers identically.

    /**
     * Update Relay dropdown options on Building Controller form based on site
     */
    function updateLineCDNOptions() {
        if (cdnEnabled) return;

        var site = getFormSite();
        if (ghdsEnabled) {
            _setLineCDNOptions([], { placeholder: 'No Relay nodes available', disabled: true });
            return;
        }

        // Bare hostname: an NORT option reads "<host> (NORT)" off-site, while a
        // Relay stores its Campus Hub bare.
        var ghdsHostname = getSelectedGHDSHostname();
        if (!ghdsHostname) {
            _setLineCDNOptions([], { placeholder: 'Select a Campus Hub first', disabled: true });
            return;
        }

        var items = [];
        if (site) {
            getCDNServersForSite(site).forEach(function(server) {
                if (server.ghdsAssociation === ghdsHostname) items.push({ id: server.id, label: server.name });
            });
        }
        if (items.length) _setLineCDNOptions(items, {});
        else _setLineCDNOptions([], { placeholder: 'No Relay nodes for this Campus Hub', disabled: true });
    }

    /**
     * Fill the Building Controller section's Relay Association dropdown. A building controller has
     * at most ONE Relay (FR-P2-24), so this is a plain single select; the chosen
     * id is mirrored into `formSelectedCDNs` (0 or 1 entries), which is what
     * save, Alert and move read.
     *   opts: { placeholder, selected, disabled }
     */
    function _setLineCDNOptions(items, opts) {
        var sel = document.getElementById('newLineCDN');
        if (!sel) return;
        opts = opts || {};
        sel.innerHTML = '';
        if (!opts.selected) {
            var none = document.createElement('option');
            none.value = '';
            none.textContent = opts.placeholder || 'Not assigned';
            sel.appendChild(none);
        }
        items.forEach(function(item) {
            var opt = document.createElement('option');
            opt.value = item.id;
            opt.textContent = item.label;
            sel.appendChild(opt);
        });
        sel.value = opts.selected || '';
        sel.disabled = !!opts.disabled;
        formSelectedCDNs = sel.value ? [sel.value] : [];
    }

    /**
     * Find a Relay server node by its ID in cdnServersData for a given site
     */
    function findCDNServerById(site, id) {
        if (typeof cdnServersData === 'undefined' || !cdnServersData[site]) return null;
        var siteData = cdnServersData[site];
        for (var key in siteData) {
            var entry = siteData[key];
            if (entry && entry.children) {
                for (var i = 0; i < entry.children.length; i++) {
                    if (entry.children[i].id === id) return entry.children[i];
                }
            }
        }
        return null;
    }

    /**
     * Alert service is available on every Building Controller, with or without a Relay, so
     * the switch is always enabled. Kept as a hook for the callers that used to
     * gate it on the Relay association.
     */
    function updatePGMState() {
        var pgmSwitch = document.getElementById('newLinePGM');
        if (!pgmSwitch) return;
        pgmSwitch.disabled = false;
    }

    /**
     * Check if a project has building controllers connected to a specific Campus Hub
     */
    function projectHasLineServersForGHDS(site, project, ghdsHostname) {
        if (!ghdsHostname || typeof lineServersDataSets === 'undefined' || !lineServersDataSets[site]) return false;
        var entry = lineServersDataSets[site][project];
        if (!entry || !entry.children || !entry.children[0] || !entry.children[0].children) return false;
        var servers = entry.children[0].children;
        for (var i = 0; i < servers.length; i++) {
            if (servers[i].ghdsAssociation && ghdsHostnameFromAssociation(servers[i].ghdsAssociation) === ghdsHostname) return true;
        }
        return false;
    }

    /**
     * Get the hostname of the currently selected Campus Hub on the Building Controller form.
     * Returns '' if none selected, '__new__' if creating new Campus Hub.
     */
    function getSelectedGHDSHostname() {
        if (ghdsEnabled) return '__new__';
        var ghdsSelect = document.getElementById('newLineGHDS');
        if (!ghdsSelect || !ghdsSelect.value) return '';
        var opt = ghdsSelect.options[ghdsSelect.selectedIndex];
        return opt ? ghdsHostnameFromAssociation(opt.textContent) : '';
    }

    /**
     * The Campus Hub hostname the Proxy URL derives from. Same as
     * getSelectedGHDSHostname, except that when the Campus Hub section is toggled on
     * the association is a server being created in this same form, so the
     * hostname comes from its (possibly still-being-typed) Hostname field.
     */
    function getProxySourceGHDSHostname() {
        var selected = getSelectedGHDSHostname();
        if (selected !== '__new__') return selected;
        return val('newGHDSHostname');
    }

    /**
     * The Campus Hub hostname the Relay Proxy URL derives from. The Relay Campus Hub dropdown is
     * keyed by Campus Hub *id* (unlike the Building Controller one, keyed by hostname), so the
     * hostname is read off the option text — which also covers the "inherited
     * from Building Controller Campus Hub selection" case, where the option is cloned from the
     * Building Controller dropdown and may carry an ` (NORT)` suffix. When the Campus Hub
     * section is toggled on, the association is a server being created in this
     * same form, so the hostname comes from its Hostname field as it is typed.
     */
    function getCDNProxySourceGHDSHostname() {
        if (ghdsEnabled) return val('newGHDSHostname');
        var sel = document.getElementById('newCDNGHDS');
        if (!sel || !sel.value) return '';
        var opt = sel.options[sel.selectedIndex];
        return opt ? ghdsHostnameFromAssociation(opt.textContent) : '';
    }

    // ── Automatic / outdated Proxy URL ──
    // The Proxy URL follows its Hostname and Campus Hub automatically (see
    // isProxyURLOutdated in config-data.js). `_proxyBaseline` is the Hostname /
    // Campus Hub / Proxy URL each section had when its Proxy URL was last set — an
    // Unarchive or Move prefill, the automatic update, or the user typing it.
    // null until then: a fresh Create has nothing to be outdated against.
    var _proxyBaseline = { line: null, cdn: null };
    var PROXY_FIELD_IDS = { line: 'newLineProxyURL', cdn: 'newCDNProxyURL' };
    var PROXY_NOTE_IDS = { line: 'newLineProxyHelp', cdn: 'newCDNProxyHelp' };
    // { value, message } when the automatic update replaced an existing URL; the
    // warning shows while the field still holds `value`.
    var _proxyChange = { line: null, cdn: null };

    function _currentProxyInputs(kind) {
        return kind === 'cdn'
            ? { hostname: val('newCDNHostname'), ghds: getCDNProxySourceGHDSHostname(), proxy: val('newCDNProxyURL') }
            : { hostname: val('newLineHostname'), ghds: getProxySourceGHDSHostname(), proxy: val('newLineProxyURL') };
    }

    function _setProxyBaseline(kind) {
        _proxyBaseline[kind] = _currentProxyInputs(kind);
    }

    /** Whether `kind`'s Proxy URL is outdated — see isProxyURLOutdated. */
    function _drawerProxyOutdated(kind) {
        if (kind === 'line' && !lineServerEnabled) return false;
        if (kind === 'cdn' && !cdnEnabled) return false;
        return isProxyURLOutdated(_proxyBaseline[kind], _currentProxyInputs(kind), kind);
    }

    /**
     * Show the "Proxy URL updated" warning while the field holds the replacement.
     * When a source field changed and the URL couldn't be re-derived, the old
     * value stays and an "outdated" warning shows instead. Both are warnings:
     * the field is filled in, so Save stays available.
     */
    function _refreshDrawerProxyChangedNote() {
        ['line', 'cdn'].forEach(function(kind) {
            var change = _proxyChange[kind];
            var showIt = change && val(PROXY_FIELD_IDS[kind]) === change.value;
            if (change && !showIt) _proxyChange[kind] = null;
            var message = showIt ? change.message : '';
            if (!message && _drawerProxyOutdated(kind)) message = proxyURLOutdatedMessage(_currentProxyInputs(kind).ghds);
            renderProxyChangedNote(document.getElementById(PROXY_NOTE_IDS[kind]), message);
        });
    }

    /**
     * Re-derive each section's Proxy URL whose Hostname or Campus Hub changed since it
     * was last set, and write it into the field. Leaves the field alone when it
     * can't be derived — the outdated error then asks for a manual entry — and
     * when the sources are unchanged, so a hand-typed URL holds. Called on the
     * source fields' `change` events, never per keystroke: a half-typed hostname
     * would derive a wrong URL. The value is written without an `input` event, so
     * the required error is cleared here and the caller re-gates Save.
     */
    function _autoUpdateDrawerProxies() {
        ['line', 'cdn'].forEach(function(kind) {
            var input = document.getElementById(PROXY_FIELD_IDS[kind]);
            if (!input) return;
            var current = _currentProxyInputs(kind);
            var base = _proxyBaseline[kind];
            if (base && base.hostname === current.hostname && base.ghds === current.ghds) return;
            var derived = (kind === 'cdn' ? deriveCDNProxyURL : deriveLineServerProxyURL)(current.hostname, current.ghds);
            if (!derived) {
                // The old warning described a URL that is no longer current.
                _proxyChange[kind] = null;
                return;
            }
            // Replacing a URL that was already there is worth a warning; filling
            // an empty field is not. A source change that re-derives the same
            // URL still replaces the cause the warning names.
            var previous = (input.value || '').trim();
            if (previous && (previous !== derived || _proxyChange[kind])) {
                _proxyChange[kind] = {
                    value: derived,
                    message: proxyURLChangedMessage(!base || base.hostname !== current.hostname, !base || base.ghds !== current.ghds)
                };
            }
            input.value = derived;
            _clearFieldError(input.id);
            _setProxyBaseline(kind);
        });
    }

    /**
     * Populate project checkboxes based on selected site and Campus Hub.
     * Faculties are disabled until a Campus Hub is selected.
     * Uses ProjMultiSelect plugin for the dropdown UI.
     */
    function updateAvailableFormProjects(site) {
      var helpText = document.getElementById('newLineProjectsHelp');
      var hasPlugin = !!window.ProjMultiSelect;
      if (!hasPlugin) return;

      formSelectedProjects = [];
      _offeredFormProjects = [];

      // No site or data — disable
      if (!site || typeof lineServersDataSets === 'undefined' || !lineServersDataSets[site]) {
        ensureProjectMultiSelect();
        window.ProjMultiSelect.setItems('#newLineProjectSelect', []);
        window.ProjMultiSelect.setSelected('#newLineProjectSelect', []);
        window.ProjMultiSelect.setDisabled('#newLineProjectSelect', true, 'No faculties available');
        if (helpText) helpText.textContent = 'No faculties available for this campus';
        return;
      }

      var ghdsHostname = getSelectedGHDSHostname();
      if (!ghdsHostname) {
        ensureProjectMultiSelect();
        window.ProjMultiSelect.setItems('#newLineProjectSelect', []);
        window.ProjMultiSelect.setSelected('#newLineProjectSelect', []);
        window.ProjMultiSelect.setDisabled('#newLineProjectSelect', true, 'Select a Campus Hub first');
        if (helpText) helpText.textContent = '';
        return;
      }

      if (helpText) helpText.textContent = ghdsHostname === '__new__'
        ? 'GENERAL, TEMPLATE, and NONE are pre-selected by default'
        : 'Building controller icon indicates faculties with nodes on this Campus Hub';

      // Build items: defaults first, then alphabetical. A project is offered only
      // where the site AND the chosen Campus Hub both have it (FR-P2-18); a Campus Hub being
      // created in this form has no grant yet, so it offers every project of the site.
      var allProjects = Object.keys(lineServersDataSets[site]);
      if (ghdsHostname !== '__new__') {
        var grantedProjects = ghdsGrantedProjects(ghdsHostname);
        allProjects = allProjects.filter(function(p) { return grantedProjects.indexOf(p) !== -1; });
      }
      _offeredFormProjects = allProjects.slice();
      var defaults = ['GENERAL', 'TEMPLATE', 'NONE'];
      var defaultProjects = defaults.filter(function(p) { return allProjects.indexOf(p) !== -1; });
      var otherProjects = allProjects.filter(function(p) { return defaults.indexOf(p) === -1; }).sort();
      var ordered = defaultProjects.concat(otherProjects);

      var items = ordered.map(function(code) {
        var hasLS = ghdsHostname !== '__new__' && projectHasLineServersForGHDS(site, code, ghdsHostname);
        return {
          id: code,
          label: code,
          suffixHTML: hasLS
            ? '<span class="project-ls-indicator" title="Has building controllers on this Campus Hub">' + iconMap['Building Controller'] + '</span>'
            : ''
        };
      });

      formSelectedProjects = defaultProjects.slice();

      ensureProjectMultiSelect();
      if (ordered.length === 0) {
        window.ProjMultiSelect.setItems('#newLineProjectSelect', []);
        window.ProjMultiSelect.setSelected('#newLineProjectSelect', []);
        window.ProjMultiSelect.setDisabled('#newLineProjectSelect', true, 'No faculties available');
        if (helpText) helpText.textContent = 'This Campus Hub grants no faculties for this campus';
        return;
      }
      window.ProjMultiSelect.setDisabled('#newLineProjectSelect', false, 'Select faculties...');
      window.ProjMultiSelect.setItems('#newLineProjectSelect', items);
      window.ProjMultiSelect.setSelected('#newLineProjectSelect', formSelectedProjects);
    }

    /**
     * Lazy-init the ProjMultiSelect instance for projects (creates only on first use)
     */
    function ensureProjectMultiSelect() {
      var el = document.getElementById('newLineProjectSelect');
      if (!el || el.dataset.pmsInitialized === 'true') return;

      window.ProjMultiSelect.create('#newLineProjectSelect', {
        mode: 'flat',
        items: [],
        selected: [],
        searchable: false,
        showSelectAllControls: true,
        maxVisibleTags: 3,
        allLabel: 'All Faculties',
        placeholder: 'Select a Campus Hub first',
        disabled: true,
        onChange: function(ids) {
          formSelectedProjects = ids.slice().sort();
          updateCDNLineServerOptions();
          updateSaveButtonState();
        }
      });
      el.dataset.pmsInitialized = 'true';
    }

    function _renderPillsLabel(labelEl, items, placeholder, onRemove) {
        if (!labelEl) return;
        if (items.length === 0) {
            labelEl.innerHTML = '';
            labelEl.textContent = placeholder;
            return;
        }
        labelEl.innerHTML = '';
        items.forEach(function(name) {
            var tag = document.createElement('span');
            tag.className = 'tag tag--gray project-multi-select__tag';
            tag.innerHTML = name + ' <span class="project-multi-select__tag-remove" data-remove-tag="' + name + '">×</span>';
            if (onRemove) {
                tag.querySelector('.project-multi-select__tag-remove').addEventListener('click', function(e) {
                    e.stopPropagation();
                    onRemove(name);
                });
            }
            labelEl.appendChild(tag);
        });
        // Defer overflow check to after DOM paint
        setTimeout(function() { _checkTagOverflow(labelEl); }, 0);
    }

    function _checkTagOverflow(labelEl) {
        var tags = labelEl.querySelectorAll('.project-multi-select__tag');
        var existing = labelEl.querySelector('.project-multi-select__overflow');
        if (existing) existing.remove();
        for (var i = 0; i < tags.length; i++) tags[i].style.display = '';

        if (tags.length <= 1) return;

        var containerRight = labelEl.getBoundingClientRect().right;
        var hidden = 0;

        // Hide tags from end until they fit, leaving room for the +N badge
        for (var i = tags.length - 1; i >= 0; i--) {
            var tagRight = tags[i].getBoundingClientRect().right;
            if (tagRight > containerRight) {
                tags[i].style.display = 'none';
                hidden++;
            }
        }

        if (hidden > 0) {
            var badge = document.createElement('span');
            badge.className = 'tag tag--gray project-multi-select__overflow';
            badge.textContent = '+' + hidden;
            labelEl.appendChild(badge);

            // Re-check: if adding the badge pushes others out
            for (var i = tags.length - 1; i >= 0; i--) {
                if (tags[i].style.display === 'none') continue;
                if (tags[i].getBoundingClientRect().right > labelEl.getBoundingClientRect().right - badge.offsetWidth - 4) {
                    tags[i].style.display = 'none';
                    hidden++;
                    badge.textContent = '+' + hidden;
                }
            }
        }
    }

    /**
     * Sync the project plugin with formSelectedProjects (kept for callers that
     * mutate formSelectedProjects directly — the plugin handles tag rendering).
     */
    function updateFormProjectLabel() {
        if (window.ProjMultiSelect) {
            window.ProjMultiSelect.setSelected('#newLineProjectSelect', formSelectedProjects);
        }
    }

    /**
     * Get currently selected form projects
     */
    function getSelectedFormProjects() {
        return formSelectedProjects;
    }

    /**
     * Update Relay associated building controllers options based on selected site and projects
     */
    function updateCDNLineServerOptions() {
        var trigger = document.getElementById('newCDNLineServersTrigger');
        var dropdown = document.getElementById('newCDNLineServersDropdown');
        if (!trigger || !dropdown) return;

        var site = getFormSite();
        var cdnGHDS = document.getElementById('newCDNGHDS');
        var ghdsVal = cdnGHDS ? cdnGHDS.value : '';
        var prevSelected = cdnSelectedLineServers.slice();
        var prevIds = _cdnOptionIds.slice();
        cdnSelectedLineServers = [];
        _cdnOptionIds = [];
        dropdown.innerHTML = '';

        // Collect available servers filtered by selected Campus Hub
        var servers = [];
        var seen = {};

        if (ghdsVal === '__new__') {
            // New Campus Hub — only the new building controller being created is available
            var hostname = val('newLineHostname');
            if (hostname && lineServerEnabled) {
                servers.push({ id: '__new_line__', name: hostname + ' (new)', preselect: true });
            }
        } else if (ghdsVal && site) {
            // Existing Campus Hub — every ACTIVE building controller on it (live scan, so servers created
            // or unarchived on it after load are included)
            var ghdsNode = findGHDSServerById(site, ghdsVal);
            if (ghdsNode) {
                // One Relay per building controller (FR-P2-24): skip any that already sit on
                // a Relay — except, when unarchiving, the Relay being restored.
                var ownCDNId = (_unarchiveMode && _unarchiveNode) ? _unarchiveNode.id : null;
                _ghdsAssociatedLineServers(ghdsNode, true).forEach(function(lsName) {
                    var onOtherCDN = findAssociatedCDNServers(lsName).some(function(c) { return c.id !== ownCDNId; });
                    if (!seen[lsName] && !onOtherCDN && (typeof isServerFullyArchived === 'undefined' || !isServerFullyArchived(site, lsName))) {
                        seen[lsName] = true;
                        servers.push({ id: lsName, name: lsName });
                    }
                });
            }
            // Also add the new building controller being created
            var hostname = val('newLineHostname');
            if (hostname && lineServerEnabled) {
                servers.unshift({ id: '__new_line__', name: hostname + ' (new)', preselect: true });
            }
        }

        if (!ghdsVal) {
            trigger.disabled = true;
            trigger.querySelector('.project-multi-select__label').textContent = 'Select a Campus Hub first';
            trigger.classList.remove('project-multi-select__trigger--open');
            dropdown.classList.remove('project-multi-select__dropdown--open');
            return;
        }

        if (servers.length === 0) {
            trigger.disabled = true;
            trigger.querySelector('.project-multi-select__label').textContent = 'No building controllers available';
            trigger.classList.remove('project-multi-select__trigger--open');
            dropdown.classList.remove('project-multi-select__dropdown--open');
            return;
        }

        trigger.disabled = false;
        trigger.querySelector('.project-multi-select__label').textContent = 'Select building controllers...';

        // Select All
        var selectAllLabel = document.createElement('label');
        selectAllLabel.className = 'checkbox checkbox--select-all';
        selectAllLabel.innerHTML =
            '<input type="checkbox" class="checkbox__input" id="newCDNSelectAllLS">' +
            '<span class="checkbox__box"></span>' +
            '<span class="checkbox__label" style="font-weight: var(--font-weight-semibold);">Select All</span>';
        dropdown.appendChild(selectAllLabel);

        var divider = document.createElement('div');
        divider.className = 'project-multi-select__divider';
        dropdown.appendChild(divider);

        // Node checkboxes
        servers.forEach(function(srv) {
            var label = document.createElement('label');
            label.className = 'checkbox';
            // Keep what the user already checked; pre-check a "(new)" row only the first
            // time it appears, so unchecking it sticks.
            var isChecked = prevSelected.indexOf(srv.id) !== -1 || (srv.preselect && prevIds.indexOf(srv.id) === -1);
            var checked = isChecked ? ' checked' : '';
            _cdnOptionIds.push(srv.id);
            label.innerHTML =
                '<input type="checkbox" class="checkbox__input" value="' + srv.id + '" data-cdn-ls="' + srv.id + '"' + checked + '>' +
                '<span class="checkbox__box"></span>' +
                '<span class="checkbox__label">' + srv.name + '</span>';
            dropdown.appendChild(label);
            if (isChecked) cdnSelectedLineServers.push(srv.id);
        });

        // Bind events
        initCDNLineServerCheckboxes();
        updateCDNLineServerLabel();
    }

    /**
     * Find a Campus Hub server node by its ID in ghdsServersData for a given site
     */
    function findGHDSServerById(site, id) {
        if (typeof ghdsServersData === 'undefined') return null;
        // The form's own site first; an NORT Campus Hub offered on another site lives under NORT.
        var sites = [site].concat(Object.keys(ghdsServersData).filter(function(s) { return s !== site; }));
        for (var s = 0; s < sites.length; s++) {
            var siteData = ghdsServersData[sites[s]];
            if (!siteData) continue;
            for (var proj in siteData) {
                var siteNode = siteData[proj];
                if (siteNode && siteNode.children) {
                    for (var i = 0; i < siteNode.children.length; i++) {
                        var projNode = siteNode.children[i];
                        if (projNode.children) {
                            for (var j = 0; j < projNode.children.length; j++) {
                                if (projNode.children[j].id === id) return projNode.children[j];
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Bind change events on Relay building controller checkboxes
     */
    function initCDNLineServerCheckboxes() {
        var dropdown = document.getElementById('newCDNLineServersDropdown');
        var selectAll = document.getElementById('newCDNSelectAllLS');
        if (!dropdown) return;

        var checkboxes = dropdown.querySelectorAll('.checkbox__input[data-cdn-ls]');

        checkboxes.forEach(function(cb) {
            cb.addEventListener('change', function() {
                var id = cb.value;
                if (cb.checked) {
                    if (cdnSelectedLineServers.indexOf(id) === -1) cdnSelectedLineServers.push(id);
                } else {
                    cdnSelectedLineServers = cdnSelectedLineServers.filter(function(s) { return s !== id; });
                }
                updateCDNSelectAllState();
                updateCDNLineServerLabel();
            });
        });

        if (selectAll) {
            selectAll.addEventListener('change', function() {
                checkboxes.forEach(function(cb) {
                    cb.checked = selectAll.checked;
                    var id = cb.value;
                    if (selectAll.checked) {
                        if (cdnSelectedLineServers.indexOf(id) === -1) cdnSelectedLineServers.push(id);
                    } else {
                        cdnSelectedLineServers = cdnSelectedLineServers.filter(function(s) { return s !== id; });
                    }
                });
                updateCDNLineServerLabel();
            });
        }
    }

    /**
     * Update Relay Select All checkbox state
     */
    function updateCDNSelectAllState() {
        var selectAll = document.getElementById('newCDNSelectAllLS');
        var dropdown = document.getElementById('newCDNLineServersDropdown');
        if (!selectAll || !dropdown) return;

        var checkboxes = dropdown.querySelectorAll('.checkbox__input[data-cdn-ls]');
        var total = checkboxes.length;
        var checked = 0;
        checkboxes.forEach(function(cb) { if (cb.checked) checked++; });

        if (checked === 0) {
            selectAll.checked = false;
            selectAll.indeterminate = false;
        } else if (checked === total) {
            selectAll.checked = true;
            selectAll.indeterminate = false;
        } else {
            selectAll.checked = false;
            selectAll.indeterminate = true;
        }
    }

    /**
     * Update Relay building controllers trigger label
     */
    function updateCDNLineServerLabel() {
        var trigger = document.getElementById('newCDNLineServersTrigger');
        if (!trigger) return;
        var label = trigger.querySelector('.project-multi-select__label');
        if (!label) return;

        if (cdnSelectedLineServers.length === 0) {
            _renderPillsLabel(label, [], 'Select building controllers...');
        } else {
            var dropdown = document.getElementById('newCDNLineServersDropdown');
            var names = [];
            cdnSelectedLineServers.forEach(function(id) {
                var cb = dropdown ? dropdown.querySelector('.checkbox__input[value="' + id + '"]') : null;
                var name = cb ? cb.closest('.checkbox').querySelector('.checkbox__label').textContent : id;
                names.push(name);
            });
            _renderPillsLabel(label, names, 'Select building controllers...', function(name) {
                var dropdown = document.getElementById('newCDNLineServersDropdown');
                if (dropdown) {
                    var cbs = dropdown.querySelectorAll('.checkbox__input');
                    for (var i = 0; i < cbs.length; i++) {
                        var lbl = cbs[i].closest('.checkbox').querySelector('.checkbox__label');
                        if (lbl && lbl.textContent === name) {
                            var id = cbs[i].value;
                            cbs[i].checked = false;
                            cdnSelectedLineServers = cdnSelectedLineServers.filter(function(s) { return s !== id; });
                            break;
                        }
                    }
                }
                updateCDNLineServerLabel();
                updateSaveButtonState();
            });
        }
    }

    /**
     * Initialize form field dependencies
     */
    function initFormDependencies() {
        var lineGHDS = document.getElementById('newLineGHDS');

        // Required field input listeners — update save button state
        ['newLineHostname', 'newLineIP', 'newLineProxyURL', 'newLineDescription', 'newLineLocation',
         'newGHDSHostname', 'newGHDSIP', 'newGHDSDescription', 'newGHDSLocation',
         'newCDNHostname', 'newCDNIP', 'newCDNProxyURL', 'newCDNDescription', 'newCDNLocation'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('input', updateSaveButtonState);
        });

        // Node Type dropdown — required on the Create form, gates Save
        var serverTypeSelect = document.getElementById('newLineServerType');
        if (serverTypeSelect) serverTypeSelect.addEventListener('change', updateSaveButtonState);

        _wireBlurValidation();

        // Faculty multi-select handled by ProjMultiSelect plugin (no inline toggle/outside-click needed)

        // Relay building controllers dropdown toggle
        var cdnLSTrigger = document.getElementById('newCDNLineServersTrigger');
        if (cdnLSTrigger) {
            cdnLSTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                var dropdown = document.getElementById('newCDNLineServersDropdown');
                if (!dropdown || cdnLSTrigger.disabled) return;
                var isOpen = dropdown.classList.contains('project-multi-select__dropdown--open');
                if (isOpen) {
                    dropdown.classList.remove('project-multi-select__dropdown--open');
                    cdnLSTrigger.classList.remove('project-multi-select__trigger--open');
                } else {
                    dropdown.classList.add('project-multi-select__dropdown--open');
                    cdnLSTrigger.classList.add('project-multi-select__trigger--open');
                }
            });
        }

        // Relay Association — single select (FR-P2-24)
        var lineCDN = document.getElementById('newLineCDN');
        if (lineCDN) {
            lineCDN.addEventListener('change', function() {
                formSelectedCDNs = lineCDN.value ? [lineCDN.value] : [];
                updatePGMState();
                updateSaveButtonState();
            });
        }

        // Close all custom dropdowns on outside click
        document.addEventListener('click', function(e) {
            // Faculty dropdown and Relay association handled by ProjMultiSelect plugin
            // Relay building controllers dropdown
            if (!e.target.closest('#newCDNLineServersSelect')) {
                var cd = document.getElementById('newCDNLineServersDropdown');
                var ct = document.getElementById('newCDNLineServersTrigger');
                if (cd) cd.classList.remove('project-multi-select__dropdown--open');
                if (ct) ct.classList.remove('project-multi-select__trigger--open');
            }
        });

        // Campus Hub association change: update Relay options + sync Relay Campus Hub + refresh projects
        if (lineGHDS) {
            lineGHDS.addEventListener('change', function() {
                updateLineCDNOptions();
                updatePGMState();
                syncCDNGHDSFromLineServer();
                updateAvailableFormProjects(getFormSite());
                if (_moveMode) _preselectMoveProjects();
                _autoUpdateDrawerProxies();
                updateSaveButtonState();
            });
        }

        // Relay Campus Hub change: refresh available building controllers + sync to Building Controller Campus Hub
        var cdnGHDS = document.getElementById('newCDNGHDS');
        if (cdnGHDS) {
            cdnGHDS.addEventListener('change', function() {
                updateCDNLineServerOptions();
                syncLineGHDSFromCDN();
                _autoUpdateDrawerProxies();
                updateSaveButtonState();
            });
        }

        // Alert switch label update
        var pgmSwitch = document.getElementById('newLinePGM');
        if (pgmSwitch) {
            pgmSwitch.addEventListener('change', function() {
                var label = pgmSwitch.closest('.switch').querySelector('.switch__label');
                if (label) label.textContent = pgmSwitch.checked ? 'On' : 'Off';
            });
        }

        // Line hostname change: update Relay associated building controllers.
        var lineHostname = document.getElementById('newLineHostname');
        if (lineHostname) {
            lineHostname.addEventListener('input', debounce(function() {
                updateCDNLineServerOptions();
            }, 300));
        }

        // Proxy URL follows its sources automatically, re-derived when the user
        // leaves a Hostname field (the Campus Hub dropdowns re-derive in their own
        // listeners above). The Campus Hub Hostname counts when the Campus Hub section is on:
        // it is then the source for both other sections.
        ['newLineHostname', 'newCDNHostname', 'newGHDSHostname'].forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.addEventListener('change', function() {
                _autoUpdateDrawerProxies();
                updateSaveButtonState();
            });
        });
        // A hand-typed URL is the new baseline. Capture phase, so it moves before
        // the bubbling listeners re-check the Save gate and the outdated error.
        Object.keys(PROXY_FIELD_IDS).forEach(function(kind) {
            var el = document.getElementById(PROXY_FIELD_IDS[kind]);
            if (el) el.addEventListener('input', function() { _setProxyBaseline(kind); }, true);
        });
    }

    /**
     * Inline field error helpers — thin wrappers over the shared ProjFieldError
     * plugin so the copy and markup match every other prototype.
     */
    function _showFieldError(fieldId, message) {
        ProjFieldError.show(fieldId, message);
    }

    function _clearFieldError(fieldId) {
        ProjFieldError.clear(fieldId);
    }

    function _clearAllFieldErrors() {
        var ids = ['newLineServerType', 'newLineHostname', 'newLineGHDS', 'newLineIP', 'newLineProxyURL', 'newLineDescription', 'newLineLocation',
                   'newCDNGHDS', 'newGHDSHostname', 'newGHDSIP', 'newGHDSDescription', 'newGHDSLocation',
                   'newCDNHostname', 'newCDNIP', 'newCDNProxyURL', 'newCDNDescription', 'newCDNLocation'];
        ids.forEach(function(id) { _clearFieldError(id); });
    }

    function _getAllExistingServers() {
        var hostnames = {};
        var ips = {};

        function collect(obj, deep) {
            Object.keys(obj).forEach(function(site) {
                Object.keys(obj[site]).forEach(function(key) {
                    var entry = obj[site][key];
                    var servers = deep
                        ? (entry.children && entry.children[0] && entry.children[0].children ? entry.children[0].children : [])
                        : (entry.children || []);
                    servers.forEach(function(s) {
                        if (s.name) hostnames[s.name.toLowerCase()] = true;
                        if (s.ip) ips[s.ip] = true;
                    });
                });
            });
        }

        collect(lineServersDataSets, true);
        collect(archivedServersData, true);
        collect(ghdsServersData, true);
        collect(cdnServersData, false);
        // Faculty-less building controllers live in their own bucket and still own their name and IP.
        if (typeof orphanLineServersData !== 'undefined') {
            Object.keys(orphanLineServersData).forEach(function(site) {
                (orphanLineServersData[site] || []).forEach(function(s) {
                    if (s.name) hostnames[s.name.toLowerCase()] = true;
                    if (s.ip) ips[s.ip] = true;
                });
            });
        }
        return { hostnames: hostnames, ips: ips };
    }

    function _wireBlurValidation() {
        var fields = [
            { id: 'newLineHostname', label: 'Hostname', isHostname: true },
            { id: 'newLineIP', label: 'IP Address', isIP: true },
            { id: 'newLineProxyURL', label: 'Proxy URL', proxyKind: 'line' },
            { id: 'newLineDescription', label: 'Description' },
            { id: 'newLineLocation', label: 'Location' },
            { id: 'newGHDSHostname', label: 'Hostname', isHostname: true },
            { id: 'newGHDSIP', label: 'IP Address', isIP: true },
            { id: 'newGHDSDescription', label: 'Description' },
            { id: 'newGHDSLocation', label: 'Location' },
            { id: 'newCDNHostname', label: 'Hostname', isHostname: true },
            { id: 'newCDNIP', label: 'IP Address', isIP: true },
            { id: 'newCDNProxyURL', label: 'Proxy URL', proxyKind: 'cdn' },
            { id: 'newCDNDescription', label: 'Description' },
            { id: 'newCDNLocation', label: 'Location' }
        ];

        fields.forEach(function(f) {
            var el = document.getElementById(f.id);
            if (!el) return;
            var touched = false;

            el.addEventListener('focus', function() { touched = true; });

            el.addEventListener('blur', function() {
                if (!touched) return;
                var v = el.value.trim();
                if (!v) {
                    ProjFieldError.required(f.id, { label: f.label });
                    return;
                }
                if (f.isIP && !isValidIPv4(v)) {
                    ProjFieldError.invalid(f.id, { label: f.label });
                    return;
                }
                if (f.isHostname && isHostnameOutdated(v)) {
                    _showFieldError(f.id, 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
                    return;
                }
                _clearFieldError(f.id);
            });

            el.addEventListener('input', function() {
                _clearFieldError(f.id);
            });
        });
    }

    /**
     * Validate the form
     */
    function validate() {
        _clearAllFieldErrors();

        if (!lineServerEnabled && !ghdsEnabled && !cdnEnabled) {
            if (typeof showToast !== 'undefined') showToast('Enable at least one node section', 'warning');
            return false;
        }

        // Required field checks
        if (lineServerEnabled) {
            var serverType = val('newLineServerType');
            var hostname = val('newLineHostname');
            var ip = val('newLineIP');
            var description = val('newLineDescription');
            var location = val('newLineLocation');
            var site = getFormSite();
            var projects = getSelectedFormProjects();
            var ghdsVal = ghdsEnabled ? '__new__' : val('newLineGHDS');

            if (!serverType) { ProjFieldError.required('newLineServerType', { label: 'Node Type' }); document.getElementById('newLineServerType').focus(); return false; }
            if (!hostname) { ProjFieldError.required('newLineHostname', { label: 'Hostname' }); document.getElementById('newLineHostname').focus(); return false; }
            if (isHostnameOutdated(hostname)) { _showFieldError('newLineHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX); document.getElementById('newLineHostname').focus(); return false; }
            if (!ip) { ProjFieldError.required('newLineIP', { label: 'IP Address' }); document.getElementById('newLineIP').focus(); return false; }
            if (ip && !isValidIPv4(ip)) { ProjFieldError.invalid('newLineIP', { label: 'IP Address' }); document.getElementById('newLineIP').focus(); return false; }
            if (!val('newLineProxyURL')) { ProjFieldError.required('newLineProxyURL', { label: 'Proxy URL' }); document.getElementById('newLineProxyURL').focus(); return false; }
            if (!description) { ProjFieldError.required('newLineDescription', { label: 'Description' }); document.getElementById('newLineDescription').focus(); return false; }
            if (!location) { ProjFieldError.required('newLineLocation', { label: 'Location' }); document.getElementById('newLineLocation').focus(); return false; }
            if (!ghdsVal) {
                if (typeof showToast !== 'undefined') showToast('Select a Campus Hub node', 'warning');
                return false;
            }
            if (!site) {
                if (typeof showToast !== 'undefined') showToast('Select a campus in the navigation first', 'warning');
                return false;
            }
        }

        if (ghdsEnabled) {
            var ghdsHostname = val('newGHDSHostname');
            var ghdsIP = val('newGHDSIP');
            var ghdsDescription = val('newGHDSDescription');
            var ghdsLocation = val('newGHDSLocation');
            if (!ghdsHostname) { ProjFieldError.required('newGHDSHostname', { label: 'Hostname' }); document.getElementById('newGHDSHostname').focus(); return false; }
            if (isHostnameOutdated(ghdsHostname)) { _showFieldError('newGHDSHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX); document.getElementById('newGHDSHostname').focus(); return false; }
            if (!ghdsIP) { ProjFieldError.required('newGHDSIP', { label: 'IP Address' }); document.getElementById('newGHDSIP').focus(); return false; }
            if (ghdsIP && !isValidIPv4(ghdsIP)) { ProjFieldError.invalid('newGHDSIP', { label: 'IP Address' }); document.getElementById('newGHDSIP').focus(); return false; }
            if (!ghdsDescription) { ProjFieldError.required('newGHDSDescription', { label: 'Description' }); document.getElementById('newGHDSDescription').focus(); return false; }
            if (!ghdsLocation) { ProjFieldError.required('newGHDSLocation', { label: 'Location' }); document.getElementById('newGHDSLocation').focus(); return false; }
        }

        if (cdnEnabled) {
            var cdnHostname = val('newCDNHostname');
            var cdnIP = val('newCDNIP');
            var cdnDescription = val('newCDNDescription');
            var cdnLocation = val('newCDNLocation');
            if (!cdnHostname) { ProjFieldError.required('newCDNHostname', { label: 'Hostname' }); document.getElementById('newCDNHostname').focus(); return false; }
            if (isHostnameOutdated(cdnHostname)) { _showFieldError('newCDNHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX); document.getElementById('newCDNHostname').focus(); return false; }
            if (!cdnIP) { ProjFieldError.required('newCDNIP', { label: 'IP Address' }); document.getElementById('newCDNIP').focus(); return false; }
            if (cdnIP && !isValidIPv4(cdnIP)) { ProjFieldError.invalid('newCDNIP', { label: 'IP Address' }); document.getElementById('newCDNIP').focus(); return false; }
            if (!val('newCDNProxyURL')) { ProjFieldError.required('newCDNProxyURL', { label: 'Proxy URL' }); document.getElementById('newCDNProxyURL').focus(); return false; }
            if (!cdnDescription) { ProjFieldError.required('newCDNDescription', { label: 'Description' }); document.getElementById('newCDNDescription').focus(); return false; }
            if (!cdnLocation) { ProjFieldError.required('newCDNLocation', { label: 'Location' }); document.getElementById('newCDNLocation').focus(); return false; }
        }

        var ghdsSelectIds = [];
        if (lineServerEnabled && !ghdsEnabled) ghdsSelectIds.push('newLineGHDS');
        if (cdnEnabled && !ghdsEnabled) ghdsSelectIds.push('newCDNGHDS');
        if (!_checkGHDSNotArchived(ghdsSelectIds)) return false;

        // Duplicate checks
        var existing = _getAllExistingServers();
        var dupFound = false;

        if (lineServerEnabled) {
            var lsHost = val('newLineHostname').toLowerCase();
            var lsIP = val('newLineIP');
            if (existing.hostnames[lsHost]) {
                ProjFieldError.duplicate('newLineHostname', { label: 'Hostname' });
                showToast('Hostname already in use. Please, try again with a different Hostname.', 'error');
                dupFound = true;
            }
            if (existing.ips[lsIP]) {
                ProjFieldError.duplicate('newLineIP', { label: 'IP Address' });
                showToast('IP Address already in use. Please, try again with a different IP Address.', 'error');
                dupFound = true;
            }
        }

        if (ghdsEnabled) {
            var gHost = val('newGHDSHostname').toLowerCase();
            var gIP = val('newGHDSIP');
            if (existing.hostnames[gHost]) {
                ProjFieldError.duplicate('newGHDSHostname', { label: 'Hostname' });
                showToast('Hostname already in use. Please, try again with a different Hostname.', 'error');
                dupFound = true;
            }
            if (existing.ips[gIP]) {
                ProjFieldError.duplicate('newGHDSIP', { label: 'IP Address' });
                showToast('IP Address already in use. Please, try again with a different IP Address.', 'error');
                dupFound = true;
            }
        }

        if (cdnEnabled) {
            var cHost = val('newCDNHostname').toLowerCase();
            var cIP = val('newCDNIP');
            if (existing.hostnames[cHost]) {
                ProjFieldError.duplicate('newCDNHostname', { label: 'Hostname' });
                showToast('Hostname already in use. Please, try again with a different Hostname.', 'error');
                dupFound = true;
            }
            if (existing.ips[cIP]) {
                ProjFieldError.duplicate('newCDNIP', { label: 'IP Address' });
                showToast('IP Address already in use. Please, try again with a different IP Address.', 'error');
                dupFound = true;
            }
        }

        // The same hostname or IP typed in two sections of this form also clashes.
        var entered = [];
        if (lineServerEnabled) entered.push({ h: 'newLineHostname', i: 'newLineIP' });
        if (ghdsEnabled) entered.push({ h: 'newGHDSHostname', i: 'newGHDSIP' });
        if (cdnEnabled) entered.push({ h: 'newCDNHostname', i: 'newCDNIP' });
        var seenHosts = {}, seenIPs = {};
        entered.forEach(function(e) {
            var h = val(e.h).toLowerCase(), ip = val(e.i);
            if (h) {
                if (seenHosts[h]) {
                    ProjFieldError.duplicate(e.h, { label: 'Hostname' });
                    showToast('Hostname already in use. Please, try again with a different Hostname.', 'error');
                    dupFound = true;
                }
                seenHosts[h] = true;
            }
            if (ip) {
                if (seenIPs[ip]) {
                    ProjFieldError.duplicate(e.i, { label: 'IP Address' });
                    showToast('IP Address already in use. Please, try again with a different IP Address.', 'error');
                    dupFound = true;
                }
                seenIPs[ip] = true;
            }
        });

        if (dupFound) return false;

        return true;
    }

    /**
     * Show validation error on a field
     */
    function showValidation(fieldId, message) {
        _showFieldError(fieldId, message);
        var field = document.getElementById(fieldId);
        if (field) field.focus();
        if (typeof showToast !== 'undefined') showToast(message, 'error');
        return false;
    }

    /**
     * Collect all form data
     */
    function collectData() {
        var data = {
            lineServer: null,
            ghdsServer: null,
            cdnServer: null
        };

        if (lineServerEnabled) {
            data.lineServer = {
                type: 'line',
                serverType: val('newLineServerType'),
                hostname: val('newLineHostname'),
                ip: val('newLineIP'),
                site: getFormSite(),
                projects: getSelectedFormProjects(),
                description: val('newLineDescription'),
                location: val('newLineLocation'),
                ghdsAssociation: ghdsEnabled ? '__new__' : val('newLineGHDS'),
                cdnAssociations: cdnEnabled ? ['__new__'] : formSelectedCDNs.slice(),
                pgmService: document.getElementById('newLinePGM').checked ? 'on' : 'off',
                komodo: document.getElementById('newLineKomodo').checked,
                redPanda: document.getElementById('newLineRedPanda').checked,
                proxyURL: val('newLineProxyURL'),
                networkProtocol: 'rsync'
            };
        }

        if (ghdsEnabled) {
            data.ghdsServer = {
                type: 'ghds',
                hostname: val('newGHDSHostname'),
                ip: val('newGHDSIP'),
                description: val('newGHDSDescription'),
                location: val('newGHDSLocation'),
                site: getFormSite(),
                networkProtocol: 'aria2c'
            };
        }

        if (cdnEnabled) {
            data.cdnServer = {
                type: 'cdn',
                hostname: val('newCDNHostname'),
                ip: val('newCDNIP'),
                proxyURL: val('newCDNProxyURL'),
                description: val('newCDNDescription'),
                location: val('newCDNLocation'),
                site: getFormSite(), // inherited
                ghdsAssociation: ghdsEnabled ? '__new__' : val('newCDNGHDS'),
                lineServers: cdnSelectedLineServers.slice(),
                networkTransport: 'rsync'
            };
        }

        return data;
    }

    // ── Data Insertion Helpers ────────────────────────────────────

    var idCounter = 100;

    /**
     * A building controller id must not collide with one already in the mock data. `idCounter`
     * starting at 100 meant the sixth server created in a session got id '106' — which is
     * NORT `bio-bc05-1.atrium.test` (and 124, 125 and 134 are taken a few creates later).
     * Two nodes, one id: `findNodeById` returns whichever it reaches first, and every
     * per-id write lands on the wrong server.
     *
     * So skip any id already taken, across active, archived and orphan for all sites.
     */
    function _lineServerIdTaken(id) {
        if (typeof forEachServerCopy !== 'function') return false;
        var taken = false;
        var hit = function() { taken = true; };
        forEachServerCopy(typeof lineServersDataSets !== 'undefined' ? lineServersDataSets : null, id, hit);
        forEachServerCopy(typeof archivedServersData !== 'undefined' ? archivedServersData : null, id, hit);
        if (typeof forEachOrphanLineServerCopy === 'function') forEachOrphanLineServerCopy(id, hit);
        return taken;
    }

    function generateId(prefix) {
        idCounter++;
        if (prefix === 'ls') {
            while (_lineServerIdTaken(String(idCounter))) idCounter++;
            return String(idCounter);
        }
        return prefix + '-' + idCounter + '-' + Date.now();
    }

    /**
     * Ensure dataSource[site][project] exists with the proper Campus → Faculty hierarchy.
     * Creates the structure if missing so new servers can be inserted.
     * For Relay data, creates Campus → [Timetable Relays] (no project intermediate node).
     */
    function ensureDataEntry(dataSource, site, project, serverLevel) {
        if (!dataSource[site]) dataSource[site] = {};
        if (!dataSource[site][project]) {
            if (serverLevel === 'Timetable Relay') {
                // Relay structure: Campus node → Relay servers as direct children
                dataSource[site][project] = {
                    id: 'site-' + site.toLowerCase() + '-' + project.toLowerCase() + '-cdn',
                    name: site,
                    site: site,
                    type: 'Campus',
                    level: 'Campus',
                    children: []
                };
            } else {
                // Standard structure: Campus → Faculty → Nodes
                dataSource[site][project] = {
                    id: 'site-' + site.toLowerCase() + '-' + project.toLowerCase(),
                    name: site,
                    site: site,
                    type: 'Campus',
                    level: 'Campus',
                    children: [{
                        id: 'project-' + project.toLowerCase() + '-' + site.toLowerCase(),
                        name: project,
                        site: site,
                        project: project,
                        type: 'Faculty',
                        level: 'Faculty',
                        children: []
                    }]
                };
            }
        }
    }

    /**
     * Insert a new Building Controller node into lineServersDataSets for each selected project.
     * Returns the ID of the first inserted node (for auto-selection).
     */
    function insertLineServer(data) {
        var ls = data.lineServer;
        var firstId = null;

        // Resolve Campus Hub association display text
        var ghdsLabel = 'Not assigned';
        if (ls.ghdsAssociation === '__new__' && data.ghdsServer) {
            var typeLabel = getServerTypeLabel(ls.site);
            ghdsLabel = data.ghdsServer.hostname + ' (' + typeLabel + ')';
        } else if (ls.ghdsAssociation) {
            var ghdsOpt = document.querySelector('#newLineGHDS option[value="' + ls.ghdsAssociation + '"]');
            ghdsLabel = ghdsOpt ? ghdsOpt.textContent : ls.ghdsAssociation;
        }

        // One ID for all project entries (matches _buildProjectTree pattern — same server, same ID)
        var nodeId = generateId('ls');
        firstId = nodeId;

        ls.projects.forEach(function(project) {
            var node = {
                id: nodeId,
                name: ls.hostname,
                site: ls.site,
                project: project,
                associatedProjects: ls.projects.slice().sort(),
                type: 'Building Controller',
                level: 'Building Controller',
                ip: ls.ip,
                status: 'active',
                model: '',
                description: ls.description || '',
                location: ls.location || '',
                pgmService: ls.pgmService || 'off',
                komodo: ls.komodo || false,
                redPanda: ls.redPanda || false,
                serverType: ls.serverType || '',
                ghdsAssociation: ghdsLabel,
                proxyURL: ls.proxyURL || '',
                // New building controllers start with Registry Sync enabled (FR-P2-11) — the Create form
                // has no Asset Registry field; it can be turned off afterwards from the panel, a Campus or bulk.
                fsnApiCalls: true,
                children: []
            };

            ensureDataEntry(lineServersDataSets, ls.site, project, 'Building Controller');
            lineServersDataSets[ls.site][project].children[0].children.push(node);
        });

        // Faculty-less building controller: store in the orphan bucket so it still
        // appears in the tree (with a "No Faculties selected" empty state) and
        // can be edited via Manage Faculties later.
        if (ls.projects.length === 0) {
            if (!orphanLineServersData[ls.site]) orphanLineServersData[ls.site] = [];
            orphanLineServersData[ls.site].push({
                id: nodeId,
                name: ls.hostname,
                site: ls.site,
                project: null,
                associatedProjects: [],
                everAssociated: [],
                type: 'Building Controller',
                level: 'Building Controller',
                ip: ls.ip,
                status: 'active',
                model: '',
                description: ls.description || '',
                location: ls.location || '',
                pgmService: ls.pgmService || 'off',
                komodo: ls.komodo || false,
                redPanda: ls.redPanda || false,
                serverType: ls.serverType || '',
                ghdsAssociation: ghdsLabel,
                proxyURL: ls.proxyURL || '',
                fsnApiCalls: true,
                children: []
            });
        }

        return firstId;
    }

    /**
     * Insert a new Campus Hub node into ghdsServersData (site-level, no project dependency).
     */
    function insertGHDSServer(data) {
        var gs = data.ghdsServer;
        var ls = data.lineServer;
        var site = gs.site;
        var nodeId = generateId('ghds');
        var associatedLS = ls ? [ls.hostname] : [];

        var node = {
            id: nodeId,
            name: gs.hostname,
            site: site,
            type: 'Campus Hub',
            level: 'Campus Hub',
            ip: gs.ip,
            status: 'active',
            model: '',
            description: gs.description || '',
            location: gs.location || '',
            proxyURL: gs.proxyURL || '',
            associatedLineServers: associatedLS,
            // The grant of a Campus Hub created here is the projects picked on the form.
            associatedProjects: lineServerEnabled ? formSelectedProjects.slice().sort() : [],
            children: []
        };

        // Insert under a standalone key so lookup functions still find it
        ensureDataEntry(ghdsServersData, site, '__standalone__', 'Campus Hub');
        ghdsServersData[site]['__standalone__'].children[0].children.push(node);
    }

    /**
     * Insert a new Timetable Relay node into cdnServersData (site-level, single entry).
     */
    function insertCDNServer(data) {
        var cs = data.cdnServer;
        var site = cs.site;

        // Resolve Campus Hub association for Relay
        var cdnGhdsLabel = '';
        if (cs.ghdsAssociation === '__new__' && data.ghdsServer) {
            cdnGhdsLabel = data.ghdsServer.hostname;
        } else if (cs.ghdsAssociation) {
            var opt = document.querySelector('#newCDNGHDS option[value="' + cs.ghdsAssociation + '"]');
            cdnGhdsLabel = opt ? ghdsHostnameFromAssociation(opt.textContent) : cs.ghdsAssociation;
        }

        // Resolve associated building controller names from IDs
        var lsNames = [];
        cs.lineServers.forEach(function(id) {
            if (id === '__new_line__' && data.lineServer) {
                lsNames.push(data.lineServer.hostname);
            } else if (id !== '__new_line__') {
                var cb = document.querySelector('.checkbox__input[data-cdn-ls="' + id + '"]');
                var label = cb ? cb.closest('.checkbox').querySelector('.checkbox__label') : null;
                lsNames.push(label ? label.textContent.replace(' (new)', '') : id);
            }
        });

        var nodeId = generateId('cdn');
        var node = {
            id: nodeId,
            name: cs.hostname,
            site: site,
            type: 'Timetable Relay',
            level: 'Timetable Relay',
            ip: cs.ip,
            status: 'active',
            model: '',
            description: cs.description || '',
            location: cs.location || '',
            proxyURL: cs.proxyURL || '',
            ghdsAssociation: cdnGhdsLabel || 'Not assigned',
            associatedLineServers: lsNames,
            children: []
        };

        // Relay is site-level — insert under existing key or create default
        var cdnKey = Object.keys(cdnServersData[site] || {})[0] || '__cdn__';
        ensureDataEntry(cdnServersData, site, cdnKey, 'Timetable Relay');
        cdnServersData[site][cdnKey].children.push(node);
    }

    // ── Handle Save ────────────────────────────────────────────

    /**
     * Handle save — insert into data sources, refresh tree, auto-select
     */
    function handleSave() {
        if (_moveMode) { _handleMoveSave(); return; }
        if (_unarchiveMode) { _handleUnarchiveSave(); return; }
        if (!validate()) return;

        var data = collectData();

        // 1. Insert into data sources
        var newLineServerId = null;
        if (data.lineServer) newLineServerId = insertLineServer(data);
        if (data.ghdsServer) insertGHDSServer(data);
        if (data.cdnServer) insertCDNServer(data);

        // 1b. If building controller associated with existing Relays, update each Relay's associatedLineServers
        if (data.lineServer && data.lineServer.cdnAssociations && data.lineServer.hostname) {
            data.lineServer.cdnAssociations.forEach(function(cdnId) {
                if (cdnId === '__new__' || cdnId === '') return;
                var cdnNode = findCDNServerById(data.lineServer.site, cdnId);
                var lsRecord = findLineServerRecord(data.lineServer.hostname);
                if (cdnNode && lsRecord) attachLineServerToCDN(cdnNode, lsRecord);
            });
        }

        // 2. Close drawer first (before tree refresh to avoid visual overlap)
        closeDrawer();

        // 3. Refresh tree view
        if (typeof updateLayoutVisibility === 'function') {
            updateLayoutVisibility();
        }

        // 4. Auto-select the new server after tree renders
        if (newLineServerId && currentServerType === 'all') {
            setTimeout(function() {
                if (typeof selectNode === 'function') selectNode(newLineServerId);
            }, 400);
        }

        // 5. Show success toast
        var types = [];
        if (data.lineServer) types.push('Building Controller');
        if (data.ghdsServer) types.push('Campus Hub');
        if (data.cdnServer) types.push('Timetable Relay');
        var msg;
        if (types.length === 1) {
            msg = types[0] + ' Created';
        } else {
            msg = types.slice(0, -1).join(', ') + ' and ' + types[types.length - 1] + ' Created';
        }
        if (typeof showToast !== 'undefined') showToast(msg);
    }

    /**
     * Reset entire form
     */
    function resetForm() {
        _proxyBaseline = { line: null, cdn: null };
        _proxyChange = { line: null, cdn: null };
        _archivedGHDSShown = { newLineGHDS: false, newCDNGHDS: false };
        lineServerEnabled = true;
        ghdsEnabled = false;
        cdnEnabled = false;

        // Restore unarchive mode overrides if any
        var titleEl = document.querySelector('#newServerDrawer .drawer__title');
        if (titleEl) titleEl.textContent = 'Create New Node';
        var saveBtn = document.getElementById('saveNewServer');
        if (saveBtn) saveBtn.textContent = 'Create';
        var toggleSections = document.querySelectorAll('#newServerDrawer .new-server-form__toggle-section');
        if (toggleSections.length >= 3) {
            toggleSections[1].style.display = '';
            toggleSections[2].style.display = '';
        }
        if (toggleSections.length > 0) {
            var lsToggleHeader = toggleSections[0].querySelector('.new-server-form__toggle-header');
            if (lsToggleHeader) lsToggleHeader.style.display = '';
        }

        unlockAllSections();

        // Reset all inputs
        var inputs = document.querySelectorAll('#newServerDrawer input, #newServerDrawer select, #newServerDrawer textarea');
        inputs.forEach(function(input) {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
            } else {
                input.value = '';
            }
            input.classList.remove('form-input--invalid');
            input.disabled = false;
        });

        // Collapse Campus Hub/Relay sections, expand Building Controller
        toggleSection('lineServerFormSection', true);
        toggleSection('ghdsFormSection', false);
        toggleSection('cdnFormSection', false);

        // Restore Building Controller toggle to ON (generic reset above unchecked it)
        var toggleLS = document.getElementById('toggleLineServer');
        if (toggleLS) toggleLS.checked = true;

        // Clear both Proxy URL fields and their hints for the next server
        var ptUrl = document.getElementById('newLineProxyURL');
        if (ptUrl) ptUrl.value = '';
        var cdnPxUrl = document.getElementById('newCDNProxyURL');
        if (cdnPxUrl) cdnPxUrl.value = '';
        ['newLineProxyHelp', 'newCDNProxyHelp'].forEach(function(id) {
            renderProxyChangedNote(document.getElementById(id), '');
        });

        // Reset project multi-select (disabled until Campus Hub selected)
        formSelectedProjects = [];
        if (window.ProjMultiSelect) {
            ensureProjectMultiSelect();
            window.ProjMultiSelect.setItems('#newLineProjectSelect', []);
            window.ProjMultiSelect.setSelected('#newLineProjectSelect', []);
            window.ProjMultiSelect.setDisabled('#newLineProjectSelect', true, 'Select a Campus Hub first');
        }
        var projectsHelp = document.getElementById('newLineProjectsHelp');
        if (projectsHelp) projectsHelp.textContent = '';

        // Reset Campus Hub association
        var ghdsSelect = document.getElementById('newLineGHDS');
        if (ghdsSelect) {
            ghdsSelect.disabled = false;
            ghdsSelect.innerHTML = '<option value="">Select a Campus Hub</option>';
        }

        // Reset Relay association on Building Controller form
        _setLineCDNOptions([], { placeholder: 'Select a Campus Hub first', disabled: true });
        var cdnAssocHelp = document.getElementById('newLineCDNHelp');
        if (cdnAssocHelp) cdnAssocHelp.textContent = '';

        // Reset Relay Campus Hub association
        var cdnGHDS = document.getElementById('newCDNGHDS');
        if (cdnGHDS) {
            cdnGHDS.disabled = false;
            cdnGHDS.innerHTML = '<option value="">Select a Campus Hub</option>';
        }

        // Reset Relay building controllers multi-select
        cdnSelectedLineServers = [];
        _cdnOptionIds = [];
        var cdnLSTrigger = document.getElementById('newCDNLineServersTrigger');
        if (cdnLSTrigger) {
            cdnLSTrigger.disabled = true;
            cdnLSTrigger.classList.remove('project-multi-select__trigger--open');
            var cdnLSLabel = cdnLSTrigger.querySelector('.project-multi-select__label');
            if (cdnLSLabel) cdnLSLabel.textContent = 'Select a Campus Hub first';
        }
        var cdnLSDropdown = document.getElementById('newCDNLineServersDropdown');
        if (cdnLSDropdown) {
            cdnLSDropdown.innerHTML = '';
            cdnLSDropdown.classList.remove('project-multi-select__dropdown--open');
        }

        // Reset Alert
        var pgmSwitch = document.getElementById('newLinePGM');
        if (pgmSwitch) {
            pgmSwitch.disabled = false;
            pgmSwitch.checked = false;
        }
        var pgmLabel = document.querySelector('#newLinePGM + .switch__slider + .switch__label');
        if (pgmLabel) pgmLabel.textContent = 'Off';

        // Reset help texts
        var ghdsHelp = document.getElementById('newLineGHDSHelp');
        if (ghdsHelp) {
            var site = getFormSite();
            ghdsHelp.textContent = site && site !== 'NORT'
                ? 'Filtered by selected campus. NORT nodes also included.'
                : 'Filtered by selected campus';
        }
        var cdnGHDSHelp = document.getElementById('newCDNGHDSHelp');
        if (cdnGHDSHelp) cdnGHDSHelp.textContent = 'Campus Hub node this Relay is connected to';

        updateSaveButtonState();
    }

    /* Helpers */
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }

    // Everything the user can change in the drawer, as one string: every input,
    // select and checkbox, the three section toggles, and the project and Relay
    // line-server selections.
    function _formSignature() {
        var drawer = document.getElementById('newServerDrawer');
        if (!drawer) return '';
        var parts = [];
        drawer.querySelectorAll('input, select, textarea').forEach(function(el) {
            var key = el.id || el.getAttribute('data-cdn-ls');
            if (!key) return;
            var v = (el.type === 'checkbox' || el.type === 'radio') ? (el.checked ? '1' : '0') : el.value;
            parts.push(key + '=' + v);
        });
        parts.push('sections=' + lineServerEnabled + ',' + ghdsEnabled + ',' + cdnEnabled);
        parts.push('projects=' + formSelectedProjects.slice().sort().join('|'));
        parts.push('cdnls=' + cdnSelectedLineServers.slice().sort().join('|'));
        return parts.join('&');
    }

    // The footer Close button asks for confirmation only when the form differs from
    // how it opened (a freshly opened Create, Unarchive or Move form is not edited).
    function _isFormDirty() {
        if (_dirtyBaseline === null) return false;
        return _formSignature() !== _dirtyBaseline;
    }

    function updateSaveButtonState() {
        var btn = document.getElementById('saveNewServer');
        if (!btn) return;

        var valid = lineServerEnabled || ghdsEnabled || cdnEnabled;

        if (valid && lineServerEnabled) {
            var ghdsVal = ghdsEnabled ? '__new__' : val('newLineGHDS');
            if (!val('newLineServerType') || !val('newLineHostname') || !val('newLineIP') || !val('newLineProxyURL') || !val('newLineDescription') || !val('newLineLocation') || !ghdsVal) valid = false;
            if (valid && isHostnameOutdated(val('newLineHostname'))) valid = false;
        }
        if (valid && ghdsEnabled) {
            if (!val('newGHDSHostname') || !val('newGHDSIP') || !val('newGHDSDescription') || !val('newGHDSLocation')) valid = false;
            if (valid && isHostnameOutdated(val('newGHDSHostname'))) valid = false;
        }
        if (valid && cdnEnabled) {
            if (!val('newCDNHostname') || !val('newCDNIP') || !val('newCDNProxyURL') || !val('newCDNDescription') || !val('newCDNLocation')) valid = false;
            if (valid && isHostnameOutdated(val('newCDNHostname'))) valid = false;
        }
        // An archived Campus Hub still selected (Unarchive) blocks Save until the user
        // picks an active Campus Hub. An outdated Proxy URL only warns.
        if (valid && lineServerEnabled && !ghdsEnabled && _selectedGHDSArchived('newLineGHDS')) valid = false;
        if (valid && cdnEnabled && !ghdsEnabled && _selectedGHDSArchived('newCDNGHDS')) valid = false;
        // The in-drawer Campus dropdown (subheader entry) is required before any
        // section can be submitted. Manage / Unarchive entries lock the Campus
        // dropdown to the implied site, so this stays satisfied automatically.
        if (valid && !getFormSite()) valid = false;

        btn.disabled = !valid;
        _refreshDrawerProxyChangedNote();
        _refreshArchivedGHDSError();
    }

    function debounce(fn, ms) {
        var timer;
        return function() {
            clearTimeout(timer);
            timer = setTimeout(fn, ms);
        };
    }

    /**
     * Public entry-point for the drawer. Manage actions on Campus / Campus Hub / Relay
     * pass `opts.site` (the parent site of the selected node) so the drawer
     * skips the in-drawer Campus field and surfaces the site in the title
     * instead. When `opts.site` is omitted, the subheader resolver runs
     * (open the drawer with the in-drawer Campus dropdown).
     */
    function openWithFocus(focus, opts) {
        opts = opts || {};
        if (opts.site) {
            openDrawer(opts.site, { entryPoint: 'manage' });
        } else {
            _openFromSubheaderClick();
            // The resolver may bail out (zero sites) — only continue if the
            // drawer is actually open.
            var drawer = document.getElementById('newServerDrawer');
            if (!drawer || !drawer.classList.contains('drawer-overlay--open')) return;
        }
        var toggleLine = document.getElementById('toggleLineServer');
        var toggleGHDS = document.getElementById('toggleGHDS');
        var toggleCDN = document.getElementById('toggleCDN');
        if (focus === 'ghds') {
            if (toggleGHDS && !toggleGHDS.checked) toggleGHDS.click();
            if (toggleLine && toggleLine.checked) toggleLine.click();
            if (toggleCDN && toggleCDN.checked) toggleCDN.click();
        } else if (focus === 'cdn') {
            if (toggleCDN && !toggleCDN.checked) toggleCDN.click();
            if (toggleLine && toggleLine.checked) toggleLine.click();
            if (toggleGHDS && toggleGHDS.checked) toggleGHDS.click();
        }
    }

    function lockSection(toggleId, sectionId, tooltip) {
        var toggle = document.getElementById(toggleId);
        if (!toggle) return;
        if (toggle.checked) toggle.click();
        toggle.disabled = true;
        var header = toggle.closest('.new-server-form__toggle-header');
        if (header) {
            header.classList.add('new-server-form__toggle-header--locked');
            header.title = tooltip || '';
        }
    }

    function unlockAllSections() {
        ['toggleGHDS', 'toggleLineServer', 'toggleCDN'].forEach(function(id) {
            var toggle = document.getElementById(id);
            if (!toggle) return;
            toggle.disabled = false;
            var header = toggle.closest('.new-server-form__toggle-header');
            if (header) {
                header.classList.remove('new-server-form__toggle-header--locked');
                header.title = '';
            }
        });
    }

    function prefillField(selectId, value, label, helpId, helpText) {
        var select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = '<option value="' + value + '" selected>' + label + '</option>';
        select.disabled = true;
        if (helpId && helpText) {
            var help = document.getElementById(helpId);
            if (help) help.textContent = helpText;
        }
    }

    function prefillCDNCheckbox(cdnId, cdnName) {
        _setLineCDNOptions([{ id: cdnId, label: cdnName }], { selected: cdnId, disabled: true });
        var cdnHelp = document.getElementById('newLineCDNHelp');
        if (cdnHelp) cdnHelp.textContent = 'Pre-filled from the selected Relay node';
    }

    function openWithContext(ctx) {
        // Manage-action callers pass `ctx.site` (the parent site of the
        // selected node). If absent, fall back to the subheader resolver so
        // we never open the drawer with a blank site.
        if (ctx && ctx.site) {
            openDrawer(ctx.site, { entryPoint: 'manage' });
        } else {
            _openFromSubheaderClick();
            var drawer = document.getElementById('newServerDrawer');
            if (!drawer || !drawer.classList.contains('drawer-overlay--open')) return;
        }

        var toggleLine = document.getElementById('toggleLineServer');
        var toggleGHDS = document.getElementById('toggleGHDS');
        var toggleCDN = document.getElementById('toggleCDN');

        if (ctx.lockGHDS) {
            lockSection('toggleGHDS', 'ghdsFormSection', 'Pre-filled from the selected Campus Hub node');
        }
        if (ctx.lockCDN) {
            lockSection('toggleCDN', 'cdnFormSection', 'Pre-filled from the selected Relay node');
        }
        if (ctx.lockLineServer) {
            lockSection('toggleLineServer', 'lineServerFormSection', '');
        }

        if (ctx.focusSection === 'cdn') {
            if (toggleCDN && !toggleCDN.checked && !toggleCDN.disabled) toggleCDN.click();
            if (toggleLine && toggleLine.checked) toggleLine.click();
        } else if (ctx.focusSection === 'line') {
            // Building Controller is already ON by default from resetForm
        }

        if (ctx.prefill) {
            if (ctx.prefill.ghdsName) {
                var ghdsVal = ctx.prefill.ghdsId || ctx.prefill.ghdsName;
                prefillField('newLineGHDS', ghdsVal, ctx.prefill.ghdsName, 'newLineGHDSHelp', 'Pre-filled from the selected Campus Hub node');
                prefillField('newCDNGHDS', ghdsVal, ctx.prefill.ghdsName, 'newCDNGHDSHelp', 'Pre-filled from the selected Campus Hub node');
                updateLineCDNOptions();
                updateCDNLineServerOptions();
                updateAvailableFormProjects(getFormSite());
            }
            if (ctx.prefill.cdnName) {
                var cdnVal = ctx.prefill.cdnId || ctx.prefill.cdnName;
                prefillCDNCheckbox(cdnVal, ctx.prefill.cdnName);
            }
            updatePGMState();
        }

        updateSaveButtonState();
    }

    // ── Unarchive Mode ──────────────────────────────────────────
    //
    // One mode, three kinds. The Create form already has a section per server
    // type behind a toggle, so unarchiving any of them is the same manoeuvre:
    // show that one section, hide its toggle header and the other two, prefill,
    // and relabel. `_unarchiveKind` is what the save handler branches on.

    var _unarchiveMode = false;
    var _unarchiveNode = null;
    var _unarchiveKind = 'line';
    // Move (FR-P2-23) rides on the same existing-server mode — `_unarchiveMode`
    // is also on while moving — and this flag picks the move behaviour.
    var _moveMode = false;

    var UNARCHIVE_KINDS = {
        'Building Controller': { key: 'line', label: 'Building Controller', sectionIndex: 0, sectionId: 'lineServerFormSection' },
        'Campus Hub': { key: 'ghds', label: 'Campus Hub', sectionIndex: 1, sectionId: 'ghdsFormSection' },
        'Timetable Relay':  { key: 'cdn',  label: 'Timetable Relay',  sectionIndex: 2, sectionId: 'cdnFormSection' }
    };

    function openForUnarchive(node) {
        var kind = UNARCHIVE_KINDS[node.level] || UNARCHIVE_KINDS['Building Controller'];
        // Lock the drawer Campus to the archived node's origin site, even when
        // it isn't currently in the header multi-select — unarchive must
        // always be possible regardless of header state. Entry point is
        // 'unarchive' so the drawer hides the Campus field.
        _enterExistingServerMode(node, kind, {
            openSite: node.site,
            drawerOpts: { entryPoint: 'unarchive' },
            title: 'Unarchive ' + kind.label + ' for ' + node.site,
            saveLabel: 'Unarchive',
            stopTitle: 'Stop Unarchiving',
            keepLabel: 'Keep Unarchiving',
            stopBody: 'All changes made to this ' + kind.label.toLowerCase() + ' will be lost. Are you sure you want to stop unarchiving?'
        });
        var saveBtn = document.getElementById('saveNewServer');
        if (saveBtn) saveBtn.disabled = false;

        if (kind.key === 'line') _prefillUnarchiveLine(node);
        else if (kind.key === 'ghds') _prefillUnarchiveGHDS(node);
        else _prefillUnarchiveCDN(node);
    }

    /**
     * Shared by Unarchive and Move: both open the Create form on ONE existing
     * server. Opens the drawer, relabels it, and shows only that kind's section
     * with its toggle header hidden (the section isn't optional here).
     */
    function _enterExistingServerMode(node, kind, cfg) {
        _unarchiveMode = true;
        _unarchiveNode = node;
        _unarchiveKind = kind.key;

        openDrawer(cfg.openSite, cfg.drawerOpts);

        var titleEl = document.querySelector('#newServerDrawer .drawer__title');
        if (titleEl) titleEl.textContent = cfg.title;

        var saveBtn = document.getElementById('saveNewServer');
        if (saveBtn) saveBtn.textContent = cfg.saveLabel;

        var cancelPopoverHeader = document.querySelector('#cancelNewServerPopover .popover__header strong');
        if (cancelPopoverHeader) cancelPopoverHeader.textContent = cfg.stopTitle;
        var cancelPopoverBody = document.querySelector('#cancelNewServerPopover .popover__body p');
        if (cancelPopoverBody) cancelPopoverBody.textContent = cfg.stopBody;
        var cancelKeepBtn = document.getElementById('cancelNewServerKeep');
        if (cancelKeepBtn) cancelKeepBtn.textContent = cfg.keepLabel;

        var toggleSections = document.querySelectorAll('#newServerDrawer .new-server-form__toggle-section');
        for (var i = 0; i < toggleSections.length; i++) {
            var isTarget = i === kind.sectionIndex;
            toggleSections[i].style.display = isTarget ? '' : 'none';
            if (isTarget) {
                var header = toggleSections[i].querySelector('.new-server-form__toggle-header');
                if (header) header.style.display = 'none';
            }
        }

        // Keep the enabled flags in step with what is actually on screen, so
        // every dependent field update (and the save-button state) scopes to
        // this section only — exactly the visible section's flag is on.
        // `ghdsEnabled` doubles as "the Building Controller / Relay sections are creating
        // their Campus Hub from this form", which is why it stays off for those two
        // kinds; the Campus Hub kind still needs it on, or `updateSaveButtonState`
        // sees no enabled section and leaves Save permanently disabled.
        lineServerEnabled = kind.key === 'line';
        ghdsEnabled = kind.key === 'ghds';
        cdnEnabled = kind.key === 'cdn';
        toggleSection(kind.sectionId, true);
    }

    function _prefillUnarchiveLine(node) {
        // Drawer Campus was hidden + locked to the archived node's origin via
        // the openDrawer(node.site, { entryPoint: 'unarchive' }) call above.

        // Pre-fill fields from the archived node
        var serverTypeEl = document.getElementById('newLineServerType');
        var hostnameEl = document.getElementById('newLineHostname');
        var ipEl = document.getElementById('newLineIP');
        var descEl = document.getElementById('newLineDescription');
        var locEl = document.getElementById('newLineLocation');

        if (serverTypeEl) serverTypeEl.value = node.serverType || '';
        if (hostnameEl) hostnameEl.value = node.name || '';
        if (ipEl) ipEl.value = node.ip || '';
        if (descEl) descEl.value = node.description || '';
        if (locEl) locEl.value = node.location || '';

        // An archived server on an outdated hostname must be fixed before it can
        // be unarchived — surface the error on load; Save stays gated on it.
        if (hostnameEl && isHostnameOutdated(node.name)) {
            _showFieldError('newLineHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
        }

        // Set Campus Hub association. An archived Campus Hub comes back as a disabled
        // "(Archived)" option, selected, with an error (see _refreshArchivedGHDSError).
        var site = getFormSite();
        var ghdsHostname = ghdsHostnameFromAssociation(node.ghdsAssociation);
        updateGHDSOptions(ghdsHostname);
        var ghdsSelect = document.getElementById('newLineGHDS');
        if (ghdsSelect && ghdsHostname) _selectGHDSOptionByHostname(ghdsSelect, ghdsHostname);

        // Update dependent fields after Campus Hub selection
        updateLineCDNOptions();
        syncCDNGHDSFromLineServer();
        updateAvailableFormProjects(site);

        // Pre-select projects from the archived server's full historical set
        // so the user can choose which to reactivate (and which to leave out).
        var historicalProjects = (node.everAssociated && node.everAssociated.length)
            ? node.everAssociated.slice()
            : (node.associatedProjects || []).slice();
        setTimeout(function() {
            if (!window.ProjMultiSelect) return;
            // Only projects the Campus Hub still grants can be checked; none for a server that never had any.
            formSelectedProjects = historicalProjects.filter(function(p) { return _offeredFormProjects.indexOf(p) !== -1; });
            window.ProjMultiSelect.setSelected('#newLineProjectSelect', formSelectedProjects);
            updateSaveButtonState();
        }, 50);

        // Set Energy Saver and Exam Lockdown checkboxes
        var komodoEl = document.getElementById('newLineKomodo');
        var redPandaEl = document.getElementById('newLineRedPanda');
        if (komodoEl) komodoEl.checked = !!node.komodo;
        if (redPandaEl) redPandaEl.checked = !!node.redPanda;

        // Set Alert
        var pgmEl = document.getElementById('newLinePGM');
        if (pgmEl && node.pgmService === 'on') {
            pgmEl.checked = true;
            var pgmLabel = pgmEl.closest('.switch').querySelector('.switch__label');
            if (pgmLabel) pgmLabel.textContent = 'On';
        }

        // Restore the saved proxy URL as-is; it re-derives only when a source field changes.
        var ptUrl = document.getElementById('newLineProxyURL');
        if (ptUrl) ptUrl.value = node.proxyURL || '';
        _setProxyBaseline('line');

        updatePGMState();
        // Gate Save (and paint an archived-GHDS error) on open, not only after the first edit.
        updateSaveButtonState();
    }

    // Select the option whose hostname (option text minus any " (NORT)" /
    // " (Archived)" suffix) matches exactly — a substring match would pick
    // `nort-hub.atrium.test` for `hub.atrium.test`.
    function _selectGHDSOptionByHostname(select, hostname) {
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value && ghdsHostnameFromAssociation(select.options[i].textContent) === hostname) {
                select.selectedIndex = i;
                return;
            }
        }
    }

    function _prefillUnarchiveGHDS(node) {
        var map = {
            newGHDSHostname: node.name || '',
            newGHDSIP: node.ip || '',
            newGHDSDescription: node.description || '',
            newGHDSLocation: node.location || ''
        };
        Object.keys(map).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = map[id];
        });

        // An archived Campus Hub on an outdated hostname must be fixed before it can be
        // unarchived — surface the error on load; Save stays gated on it.
        var ghdsHostnameEl = document.getElementById('newGHDSHostname');
        if (ghdsHostnameEl && isHostnameOutdated(node.name)) {
            _showFieldError('newGHDSHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
        }

        updateSaveButtonState();
    }

    function _prefillUnarchiveCDN(node) {
        var map = {
            newCDNHostname: node.name || '',
            newCDNProxyURL: node.proxyURL || '',
            newCDNIP: node.ip || '',
            newCDNDescription: node.description || '',
            newCDNLocation: node.location || ''
        };
        Object.keys(map).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = map[id];
        });

        var cdnHostnameEl = document.getElementById('newCDNHostname');
        if (cdnHostnameEl && isHostnameOutdated(node.name)) {
            _showFieldError('newCDNHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
        }

        // Campus Hub Association — the archived Relay stores the BARE hostname; options
        // are keyed by Campus Hub id, so match on the option text.
        var cdnGHDSHostname = ghdsHostnameFromAssociation(node.ghdsAssociation);
        updateCDNGHDSOptions(cdnGHDSHostname);
        var cdnGHDS = document.getElementById('newCDNGHDS');
        if (cdnGHDS && cdnGHDSHostname) {
            cdnGHDS.disabled = false;
            _selectGHDSOptionByHostname(cdnGHDS, cdnGHDSHostname);
        }

        // Restore the saved proxy URL as-is; it re-derives only when a source field changes.
        var cdnPxUrl = document.getElementById('newCDNProxyURL');
        if (cdnPxUrl) cdnPxUrl.value = node.proxyURL || '';
        _setProxyBaseline('cdn');

        // Building controller associations survive the archive, so pre-check them.
        updateCDNLineServerOptions();
        var associated = (node.associatedLineServers || []).slice();
        var lsDropdown = document.getElementById('newCDNLineServersDropdown');
        if (associated.length && lsDropdown) {
            lsDropdown.querySelectorAll('.checkbox__input[data-cdn-ls]').forEach(function(cb) {
                if (associated.indexOf(cb.value) !== -1) {
                    cb.checked = true;
                    if (cdnSelectedLineServers.indexOf(cb.value) === -1) cdnSelectedLineServers.push(cb.value);
                }
            });
            updateCDNSelectAllState();
            updateCDNLineServerLabel();
        }
        updateSaveButtonState();
    }

    function _resetUnarchiveMode() {
        if (!_unarchiveMode) return;
        var kind = UNARCHIVE_KINDS[_unarchiveNode && _unarchiveNode.level] || UNARCHIVE_KINDS['Building Controller'];
        _unarchiveMode = false;
        _moveMode = false;
        _unarchiveNode = null;
        _unarchiveKind = 'line';

        // Restore drawer title
        var titleEl = document.querySelector('#newServerDrawer .drawer__title');
        if (titleEl) titleEl.textContent = 'Create New Node';

        // Restore save button
        var saveBtn = document.getElementById('saveNewServer');
        if (saveBtn) saveBtn.textContent = 'Create';

        // Restore close-confirmation popover copy
        var cancelPopoverHeader = document.querySelector('#cancelNewServerPopover .popover__header strong');
        if (cancelPopoverHeader) cancelPopoverHeader.textContent = 'Close Node Creation';
        var cancelPopoverBody = document.querySelector('#cancelNewServerPopover .popover__body p');
        if (cancelPopoverBody) cancelPopoverBody.textContent = 'All information for this node creation will be lost. Are you sure you want to stop creating nodes?';
        var cancelKeepBtn = document.getElementById('cancelNewServerKeep');
        if (cancelKeepBtn) cancelKeepBtn.textContent = 'Keep Creating';

        // Show every section again and restore the toggle header the kind hid.
        // Unarchive shows one section of three, so all three have to be reset —
        // whichever kind was open.
        var toggleSections = document.querySelectorAll('#newServerDrawer .new-server-form__toggle-section');
        for (var i = 0; i < toggleSections.length; i++) {
            toggleSections[i].style.display = '';
        }
        var restoredHeader = toggleSections[kind.sectionIndex]
            && toggleSections[kind.sectionIndex].querySelector('.new-server-form__toggle-header');
        if (restoredHeader) restoredHeader.style.display = '';

        // Drawer Campus stays hidden until the next openDrawer call decides
        // its visibility based on the next entry point.
    }

    function _handleUnarchiveSave() {
        if (_unarchiveKind === 'ghds') { _unarchiveStandaloneSave('ghds'); return; }
        if (_unarchiveKind === 'cdn') { _unarchiveStandaloneSave('cdn'); return; }
        _unarchiveLineSave();
    }

    /**
     * Required fields + duplicate checks for an existing server opened in the
     * drawer: a Campus Hub/Relay unarchive, or a Building Controller / Campus Hub move.
     *
     * `validate()` is never reached in unarchive mode (handleSave short-circuits),
     * and its duplicate check would reject the record against itself anyway: a
     * Campus Hub/Relay is archived by flagging it IN PLACE, so it is still in the dataset
     * under its own hostname and IP. Exclude the node being unarchived, exactly
     * as the side panel's `_hostnameInUse` excludes the server being edited.
     */
    function _validateExistingServer(kind, node) {
        var prefix = { line: 'newLine', ghds: 'newGHDS', cdn: 'newCDN' }[kind];
        var required = [
            { id: prefix + 'Hostname', label: 'Hostname' },
            { id: prefix + 'IP', label: 'IP Address' },
            { id: prefix + 'Description', label: 'Description' },
            { id: prefix + 'Location', label: 'Location' }
        ];
        // Campus Hub Proxy URLs stay optional; the Relay and Building Controller ones are required.
        if (kind === 'cdn') required.splice(2, 0, { id: 'newCDNProxyURL', label: 'Proxy URL' });
        if (kind === 'line') {
            required.unshift({ id: 'newLineServerType', label: 'Node Type' });
            required.splice(3, 0, { id: 'newLineProxyURL', label: 'Proxy URL' });
        }
        _clearAllFieldErrors();

        if (kind === 'line' && !val('newLineGHDS')) {
            if (typeof showToast !== 'undefined') showToast('Select a Campus Hub node', 'warning');
            return false;
        }

        for (var i = 0; i < required.length; i++) {
            if (!val(required[i].id)) {
                ProjFieldError.required(required[i].id, { label: required[i].label });
                document.getElementById(required[i].id).focus();
                return false;
            }
        }
        if (kind === 'line' && !_checkGHDSNotArchived(['newLineGHDS'])) return false;
        if (kind === 'cdn' && !_checkGHDSNotArchived(['newCDNGHDS'])) return false;
        var ip = val(prefix + 'IP');
        if (!isValidIPv4(ip)) {
            ProjFieldError.invalid(prefix + 'IP', { label: 'IP Address' });
            document.getElementById(prefix + 'IP').focus();
            return false;
        }

        var existing = _getAllExistingServers();
        var hostname = val(prefix + 'Hostname').toLowerCase();
        if (hostname !== (node.name || '').toLowerCase() && existing.hostnames[hostname]) {
            ProjFieldError.duplicate(prefix + 'Hostname', { label: 'Hostname' });
            showToast('Hostname already in use. Please, try again with a different Hostname.', 'error');
            return false;
        }
        if (ip !== node.ip && existing.ips[ip]) {
            ProjFieldError.duplicate(prefix + 'IP', { label: 'IP Address' });
            showToast('IP Address already in use. Please, try again with a different IP Address.', 'error');
            return false;
        }
        return true;
    }

    /**
     * Unarchive a Campus Hub or Relay server: clear the flag on the record and apply any
     * edits made in the drawer. No dataset move — see `_archiveStandaloneServer`
     * in manage-actions.js for why these two types are flagged in place.
     */
    function _unarchiveStandaloneSave(kind) {
        var node = _unarchiveNode;
        if (!node || !_validateExistingServer(kind, node)) return;

        var prefix = kind === 'ghds' ? 'newGHDS' : 'newCDN';
        var dataSource = kind === 'ghds' ? ghdsServersData : cdnServersData;
        var updated = {
            name: val(prefix + 'Hostname'),
            ip: val(prefix + 'IP'),
            description: val(prefix + 'Description'),
            location: val(prefix + 'Location'),
            archived: false,
            status: 'active'
        };
        // A Campus Hub has no Proxy URL field here, so its stored value is left alone.
        var cdnRecord = null, membersBefore = [];
        if (kind === 'cdn') {
            updated.proxyURL = val('newCDNProxyURL') || '';
            // Stays flagged only while the URL a Campus Hub rename left stale is untouched.
            updated.proxyOutdated = !!node.proxyOutdated && updated.proxyURL === (node.proxyURL || '');
            var pickedGHDS = getCDNProxySourceGHDSHostname();
            if (pickedGHDS) updated.ghdsAssociation = pickedGHDS;
            cdnRecord = findCDNRecordById(node.id);
            membersBefore = ((cdnRecord && cdnRecord.associatedLineServers) || node.associatedLineServers || []).slice();
        }

        var oldName = node.name;
        if (typeof forEachServerCopy === 'function') {
            forEachServerCopy(dataSource, node.id, function(srv) { Object.assign(srv, updated); });
        }

        // The Relay's building controllers are whatever is checked in the form: unchecked
        // ones leave, newly checked ones join (a Campus Hub change empties the list first).
        if (kind === 'cdn' && cdnRecord) {
            var membersAfter = cdnSelectedLineServers.filter(function(n) { return n !== '__new_line__'; });
            membersBefore.forEach(function(n) {
                if (membersAfter.indexOf(n) === -1) detachLineServerFromCDN(cdnRecord, n);
            });
            membersAfter.forEach(function(n) {
                if (membersBefore.indexOf(n) !== -1) return;
                var ls = findLineServerRecord(n);
                if (ls) attachLineServerToCDN(cdnRecord, ls);
            });
        }

        // A renamed Campus Hub is referenced by hostname from every building controller and Relay
        // that points at it, so the rename has to propagate the same way it does
        // from the side panel. A Relay is referenced by nothing.
        var needsManualProxy = [];
        if (kind === 'ghds' && oldName !== updated.name && typeof propagateGHDSRename === 'function') {
            needsManualProxy = propagateGHDSRename(oldName, updated.name);
        }

        closeDrawer();
        if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
        setTimeout(function() {
            if (typeof selectNode === 'function') selectNode(node.id);
        }, 150);
        if (typeof showToast !== 'undefined') {
            showToast((kind === 'ghds' ? 'Campus Hub' : 'Timetable Relay') + ' Unarchived');
            notifyProxyURLsNeedingUpdate(needsManualProxy);
        }
    }

    function _unarchiveLineSave() {
        var node = _unarchiveNode;
        var site = getFormSite();
        var projects = getSelectedFormProjects();

        // Same save-time checks as Move: required fields (Proxy URL included), a Campus Hub,
        // an active Campus Hub, IP format, and hostname / IP uniqueness against everyone else.
        if (!_validateExistingServer('line', node)) return;

        // Faculties are optional here, same as on the Create form. Unarchiving
        // with none selected restores the server into the orphan bucket below.

        // Collect updated field values. Unarchive restores the server with Asset Registry
        // API Calls off (the toggle is re-enabled on the panel once it is active).
        var updatedData = {
            name: val('newLineHostname') || node.name,
            ip: val('newLineIP') || node.ip,
            description: val('newLineDescription') || '',
            location: val('newLineLocation') || '',
            serverType: val('newLineServerType') || node.serverType || '',
            komodo: document.getElementById('newLineKomodo').checked,
            redPanda: document.getElementById('newLineRedPanda').checked,
            pgmService: document.getElementById('newLinePGM').checked ? 'on' : 'off',
            proxyURL: val('newLineProxyURL') || '',
            // Stays flagged only while the URL a Campus Hub rename left stale is untouched.
            proxyOutdated: !!node.proxyOutdated && (val('newLineProxyURL') || '') === (node.proxyURL || ''),
            fsnApiCalls: false
        };

        // Resolve Campus Hub association display
        var ghdsSelect = document.getElementById('newLineGHDS');
        if (ghdsSelect && ghdsSelect.value) {
            var opt = ghdsSelect.options[ghdsSelect.selectedIndex];
            updatedData.ghdsAssociation = opt ? opt.textContent : node.ghdsAssociation;
        } else {
            updatedData.ghdsAssociation = node.ghdsAssociation || '';
        }

        // Remove from archived data
        if (typeof archivedServersData !== 'undefined' && archivedServersData[site]) {
            Object.keys(archivedServersData[site]).forEach(function(proj) {
                var entry = archivedServersData[site][proj];
                if (entry && entry.children && entry.children[0] && entry.children[0].children) {
                    entry.children[0].children = entry.children[0].children.filter(function(s) {
                        return s.id !== node.id && s.name !== node.name;
                    });
                }
            });
        }

        // A project-less server is archived in place in the orphan set; drop that
        // copy so the restore below (or the per-project copies) is the only one.
        if (typeof orphanLineServersData !== 'undefined' && orphanLineServersData[site]) {
            orphanLineServersData[site] = orphanLineServersData[site].filter(function(s) {
                return !(s.archived && (s.id === node.id || s.name === node.name));
            });
        }

        // Insert into active data for each selected project
        var historicalUnion = (function() {
            var prev = (node.everAssociated && node.everAssociated.length)
                ? node.everAssociated.slice()
                : (node.associatedProjects || []).slice();
            projects.forEach(function(p) { if (prev.indexOf(p) === -1) prev.push(p); });
            return prev.sort();
        })();

        projects.forEach(function(proj) {
            if (typeof lineServersDataSets !== 'undefined') {
                ensureDataEntry(lineServersDataSets, site, proj, 'Building Controller');
                var children = lineServersDataSets[site][proj].children[0].children;
                if (!children.some(function(s) { return s.id === node.id; })) {
                    var restored = Object.assign({}, node, updatedData, {
                        project: proj,
                        archived: undefined,
                        status: 'active',
                        associatedProjects: projects.slice().sort(),
                        everAssociated: historicalUnion.slice()
                    });
                    children.push(restored);
                }
            }
        });

        // Faculty-less unarchive: nothing above ran, because the loop is keyed
        // on the selected projects. Restore into the orphan bucket instead so
        // the server still appears in the tree (with the "No Faculties selected"
        // empty state) rather than vanishing — same bucket insertLineServer
        // uses for a project-less create.
        if (projects.length === 0) {
            if (typeof orphanLineServersData !== 'undefined') {
                if (!orphanLineServersData[site]) orphanLineServersData[site] = [];
                var alreadyThere = orphanLineServersData[site].some(function(s) { return s.id === node.id; });
                if (!alreadyThere) {
                    orphanLineServersData[site].push(Object.assign({}, node, updatedData, {
                        project: null,
                        archived: undefined,
                        status: 'active',
                        associatedProjects: [],
                        everAssociated: historicalUnion.slice(),
                        children: []
                    }));
                }
            }
        }

        // Update associatedProjects + everAssociated on all copies
        if (typeof forEachServerCopy === 'function') {
            forEachServerCopy(lineServersDataSets, node.id, function(srv) {
                srv.associatedProjects = projects.slice().sort();
                srv.everAssociated = historicalUnion.slice();
                Object.assign(srv, updatedData);
            });
        }

        // An archived server can't have a Relay (archiving requires removing it), so
        // whatever is picked in the Relay Association field is a new association.
        var restoredRecord = (typeof findLineServerRecord === 'function' && findLineServerRecord(updatedData.name))
            || Object.assign({}, node, updatedData);
        formSelectedCDNs.forEach(function(cdnId) {
            var cdn = findCDNServerById(site, cdnId);
            if (cdn) attachLineServerToCDN(cdn, restoredRecord);
        });

        closeDrawer();

        if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
        setTimeout(function() {
            if (typeof selectNode === 'function') selectNode(node.id);
        }, 150);

        if (typeof showToast !== 'undefined') {
            showToast('Building Controller Unarchived');
        }
    }

    // ── Move Mode (FR-P2-23) ────────────────────────────────────
    //
    // Moves an active Building Controller or Campus Hub to another site selected in the
    // header. The Create form opens on the server like Unarchive does, with
    // the Campus field shown and required. Everything is prefilled except the
    // fields a site change invalidates, which `_applyMoveSiteDefaults` settles
    // each time a target site is picked.

    function openForMove(node) {
        var kind = UNARCHIVE_KINDS[node.level] || UNARCHIVE_KINDS['Building Controller'];
        _moveMode = true;
        _enterExistingServerMode(node, kind, {
            openSite: null,
            drawerOpts: { entryPoint: 'move', excludeSite: node.site },
            title: 'Move ' + kind.label + ' from ' + node.site,
            saveLabel: 'Move',
            stopTitle: 'Stop Moving',
            keepLabel: 'Keep Moving',
            stopBody: 'All changes made to this ' + kind.label.toLowerCase() + ' will be lost. Are you sure you want to stop moving it?'
        });

        if (kind.key === 'line') _prefillMoveLine(node);
        else _prefillUnarchiveGHDS(node);
        _updateFormLockState();
        updateSaveButtonState();
    }

    // Fields that don't depend on the site. Campus Hub, Proxy URL, Faculties, Relay and
    // Alert wait for a target site — see _applyMoveSiteDefaults.
    function _prefillMoveLine(node) {
        var map = {
            newLineServerType: node.serverType || '',
            newLineHostname: node.name || '',
            newLineIP: node.ip || '',
            newLineDescription: node.description || '',
            newLineLocation: node.location || ''
        };
        Object.keys(map).forEach(function(id) {
            var el = document.getElementById(id);
            if (el) el.value = map[id];
        });
        var komodoEl = document.getElementById('newLineKomodo');
        var redPandaEl = document.getElementById('newLineRedPanda');
        if (komodoEl) komodoEl.checked = !!node.komodo;
        if (redPandaEl) redPandaEl.checked = !!node.redPanda;

        if (isHostnameOutdated(node.name)) {
            _showFieldError('newLineHostname', 'Hostname must end with ' + SERVER_HOSTNAME_SUFFIX);
        }
    }

    /**
     * Runs after the Campus change handler has re-scoped the form to the target.
     * Only an NORT Campus Hub survives a move — every site's Campus Hub list includes NORT —
     * and the Proxy URL is kept only with it, since it derives from the Campus Hub.
     * Anything else starts empty for the user to pick on the new site.
     */
    function _applyMoveSiteDefaults() {
        var node = _unarchiveNode;
        if (!node || _unarchiveKind !== 'line') return;

        var ghdsSelect = document.getElementById('newLineGHDS');
        var proxyEl = document.getElementById('newLineProxyURL');
        var currentGHDS = ghdsHostnameFromAssociation(node.ghdsAssociation);
        var kept = false;
        if (ghdsSelect && currentGHDS) {
            for (var i = 0; i < ghdsSelect.options.length; i++) {
                if (ghdsSelect.options[i].value && ghdsHostnameFromAssociation(ghdsSelect.options[i].textContent) === currentGHDS) {
                    ghdsSelect.selectedIndex = i;
                    kept = true;
                    break;
                }
            }
        }
        if (proxyEl) proxyEl.value = kept ? (node.proxyURL || '') : '';
        _setProxyBaseline('line');

        updateLineCDNOptions();
        syncCDNGHDSFromLineServer();
        updateAvailableFormProjects(getFormSite());
        _preselectMoveProjects();
        updatePGMState();
    }

    // Keep the server's projects that the target site has AND its Campus Hub grants,
    // instead of the Create form's defaults.
    function _preselectMoveProjects() {
        var node = _unarchiveNode;
        var site = getFormSite();
        var ghds = getSelectedGHDSHostname();
        if (!node || !site || !ghds || !window.ProjMultiSelect) return;
        var siteProjects = Object.keys((typeof lineServersDataSets !== 'undefined' && lineServersDataSets[site]) || {});
        var granted = ghdsGrantedProjects(ghds);
        formSelectedProjects = (node.associatedProjects || []).filter(function(p) {
            return siteProjects.indexOf(p) !== -1 && granted.indexOf(p) !== -1;
        });
        window.ProjMultiSelect.setSelected('#newLineProjectSelect', formSelectedProjects);
    }

    function _handleMoveSave() {
        if (_unarchiveKind === 'ghds') _moveGHDSSave();
        else _moveLineServerSave();
    }

    function _finishMove(node, label, site) {
        closeDrawer();
        if (typeof updateLayoutVisibility === 'function') updateLayoutVisibility();
        setTimeout(function() {
            if (typeof selectNode === 'function') selectNode(node.id);
        }, 150);
        if (typeof showToast !== 'undefined') showToast(label + ' moved to ' + site);
    }

    /**
     * Move every stored copy of a building controller to the target site. Renames are
     * propagated FIRST, so every later step works on the new hostname alone.
     */
    function _moveLineServerSave() {
        var node = _unarchiveNode;
        if (!node || !_validateExistingServer('line', node)) return;

        var oldSite = node.site;
        var site = getFormSite();
        var oldName = node.name;
        var name = val('newLineHostname');
        var serverType = val('newLineServerType');
        var projects = getSelectedFormProjects();
        var oldGHDS = ghdsHostnameFromAssociation(node.ghdsAssociation);
        var newGHDS = getSelectedGHDSHostname();

        if (name !== oldName) propagateLineServerRename(oldName, name);

        // Its Relays are on the old site, and so is a local Campus Hub's reciprocal list.
        findAssociatedCDNServers(name).forEach(function(cdn) { detachLineServerFromCDN(cdn, name); });
        var oldGHDSRecord = oldGHDS ? findGHDSServerByHostname(oldGHDS) : null;
        if (oldGHDSRecord && oldGHDSRecord.associatedLineServers) {
            oldGHDSRecord.associatedLineServers = oldGHDSRecord.associatedLineServers.filter(function(n) { return n !== name; });
        }
        var newGHDSRecord = findGHDSServerByHostname(newGHDS);
        if (newGHDSRecord) {
            if (!newGHDSRecord.associatedLineServers) newGHDSRecord.associatedLineServers = [];
            if (newGHDSRecord.associatedLineServers.indexOf(name) === -1) newGHDSRecord.associatedLineServers.push(name);
        }

        // Drop every copy on the old site (one per project, plus the orphan copy).
        Object.keys(lineServersDataSets[oldSite] || {}).forEach(function(proj) {
            var entry = lineServersDataSets[oldSite][proj];
            if (entry && entry.children && entry.children[0] && entry.children[0].children) {
                entry.children[0].children = entry.children[0].children.filter(function(s) { return s.id !== node.id; });
            }
        });
        if (typeof orphanLineServersData !== 'undefined' && orphanLineServersData[oldSite]) {
            orphanLineServersData[oldSite] = orphanLineServersData[oldSite].filter(function(s) { return s.id !== node.id; });
        }

        // Same id, same stored settings (Registry Sync included) on the new site.
        var moved = Object.assign({}, node, {
            name: name,
            ip: val('newLineIP'),
            site: site,
            serverType: serverType,
            description: val('newLineDescription'),
            location: val('newLineLocation'),
            komodo: document.getElementById('newLineKomodo').checked,
            redPanda: document.getElementById('newLineRedPanda').checked,
            pgmService: document.getElementById('newLinePGM').checked ? 'on' : 'off',
            proxyURL: val('newLineProxyURL'),
            proxyOutdated: !!node.proxyOutdated && val('newLineProxyURL') === (node.proxyURL || ''),
            ghdsAssociation: lineServerGHDSAssociationLabel(newGHDS, serverType),
            associatedProjects: projects.slice().sort(),
            everAssociated: projects.slice().sort(),
            children: []
        });
        projects.forEach(function(proj) {
            ensureDataEntry(lineServersDataSets, site, proj, 'Building Controller');
            lineServersDataSets[site][proj].children[0].children.push(Object.assign({}, moved, { project: proj }));
        });
        if (projects.length === 0) {
            if (!orphanLineServersData[site]) orphanLineServersData[site] = [];
            orphanLineServersData[site].push(Object.assign({}, moved, { project: null }));
        }

        formSelectedCDNs.forEach(function(cdnId) {
            var cdn = findCDNServerById(site, cdnId);
            if (cdn) attachLineServerToCDN(cdn, moved);
        });

        _finishMove(node, 'Building Controller', site);
    }

    /**
     * Move a Campus Hub to the target site. Only reachable for a Campus Hub with no line
     * servers or Relays on it (the menu blocks the rest), so nothing references
     * it beyond its own record. Its project grant keeps only the projects the
     * new site has.
     */
    function _moveGHDSSave() {
        var node = _unarchiveNode;
        if (!node || !_validateExistingServer('ghds', node)) return;

        var oldSite = node.site;
        var site = getFormSite();
        var oldName = node.name;
        var record = null;
        Object.keys(ghdsServersData[oldSite] || {}).forEach(function(key) {
            var entry = ghdsServersData[oldSite][key];
            (entry && entry.children || []).forEach(function(projNode) {
                (projNode.children || []).forEach(function(srv) { if (srv.id === node.id) record = srv; });
                projNode.children = (projNode.children || []).filter(function(srv) { return srv.id !== node.id; });
            });
        });
        if (!record) return;

        var siteProjects = Object.keys(lineServersDataSets[site] || {});
        Object.assign(record, {
            name: val('newGHDSHostname'),
            ip: val('newGHDSIP'),
            description: val('newGHDSDescription'),
            location: val('newGHDSLocation'),
            site: site,
            project: '__standalone__',
            associatedProjects: (record.associatedProjects || []).filter(function(p) { return siteProjects.indexOf(p) !== -1; })
        });
        ensureDataEntry(ghdsServersData, site, '__standalone__', 'Campus Hub');
        ghdsServersData[site]['__standalone__'].children[0].children.push(record);

        var needsManualProxy = record.name !== oldName ? propagateGHDSRename(oldName, record.name) : [];

        _finishMove(node, 'Campus Hub', site);
        notifyProxyURLsNeedingUpdate(needsManualProxy);
    }

    // Export
    window.NewServerDrawer = {
        init: init,
        openDrawer: openDrawer,
        open: openWithFocus,
        openWithContext: openWithContext,
        openForUnarchive: openForUnarchive,
        openForMove: openForMove,
        closeDrawer: closeDrawer
    };
})();
