/**
 * Manage Devices — Add Devices wizard (window.UnitsAddUnits)
 *
 * Drives the full-screen Add Devices flow built on the `proj-wizard` plugin (which uses
 * `proj-timeline` for the stepper).
 *
 * Type is locked to the active page view (UnitsState.currentTypeFilter) — the wizard
 * never lets the user flip the type. The modal title reflects both the Campus and the Type:
 *   "Add Devices to <Campus> on <Device Type>"
 *
 * Campus is user-pickable inside the wizard via a `proj-cascader` instance on the manual tab.
 * The upload tab inherits the page scope.
 *
 *   Step 1 "Provide serial numbers": Upload File (mock) OR Add Manually (Campus cascader +
 *           serials textarea).
 *   Step 2 "Review and register Devices": per-serial validation table (search + show-errors-only),
 *           then commit checked, valid rows into UnitsData.units and refresh the page.
 *
 * Validation per serial:
 *   - format: 8–14 alphanumeric characters
 *   - "Already exists" checks run at commit time only (any type) → row silently skipped
 *     and surfaced via the error toast.
 *
 * Commit status: both Managed and Registered units are born READY (the approval workflow is
 * deprecated, so there is no PENDING APPROVAL step).
 *
 * Redirect on commit: if the wizard's Campus differs from the page state, the Campus is
 * updated to match before refreshing. (Type is locked, so it never diverges.)
 */(function() {
    'use strict';

    var State = window.UnitsState;
    var Data = window.UnitsData;

    var NEW_UNIT_AUTHOR = 'Priya Raman';
    // Mocked parse of an uploaded XLSX — intentionally covers every validation case
    // (new · existing-same-type · Registered-in-FSN · bad-format) for demoing the review step.
    var MOCK_UPLOAD_SERIALS = ['PRJNEW0001', 'MICNORT4001', 'MICNORT1101', 'SHORT'];

    // MDS sort-indicator block (caret-up / caret-down), matching the page table.
    var SORT_INDICATOR = '<span class="sort-indicator"><span class="sort-indicator__inner" aria-hidden="true">'
        + '<span role="img" aria-label="caret-up" class="sort-indicator__icon sort-indicator__up">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M858.9 689L530.5 308.2c-9.4-10.9-27.5-10.9-37 0L165.1 689c-12.2 14.2-1.2 35 18.5 35h656.8c19.7 0 30.7-20.8 18.5-35z"></path></svg></span>'
        + '<span role="img" aria-label="caret-down" class="sort-indicator__icon sort-indicator__down">'
        + '<svg viewBox="0 0 1024 1024" focusable="false" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M840.4 300H183.6c-19.7 0-30.7 20.8-18.5 35l328.4 380.8c9.4 10.9 27.5 10.9 37 0L858.9 335c12.2-14.2 1.2-35-18.5-35z"></path></svg></span>'
        + '</span></span>';

    /* ── Module state (per open) ── */
    var _wizard = null;
    var _mode = 'Managed';            // 'Managed' | 'Registered' — locked to the page toggle on open()
    var _site = null;
    var _activeTab = 'upload';       // 'upload' | 'manual'
    var _serialsManual = '';
    var _uploadSerials = null;
    var _uploadFileName = '';
    var _rows = [];                  // [{ serial, error, valid, checked }]
    var _reviewSearch = '';
    var _showErrorsOnly = false;
    var _sortColumn = null;
    var _sortDir = 'asc';
    var _cascaderEl = null;          // site cascader container (destroyed on rebuild/close)
    var _reviewTpl = null;

    /* ── Lookups ── */

    function siteList() {
        return Data.lineServers.map(function(s) { return { id: s.id, name: s.name }; });
    }
    function siteName(id) {
        var s = Data.lineServers.filter(function(x) { return x.id === id; })[0];
        return s ? s.name : id;
    }
    function titleText() {
        return _site ? ('Add Devices to ' + siteName(_site)) : 'Add Devices';
    }

    /** Left-aligned footer note stating the (locked) type of the units being added. */
    function footerNote() {
        return '<span class="add-devices__footer-note">'
            + '<sf-symbol name="info.circle"></sf-symbol> Devices added to this Campus will have the ' + _mode + ' type.</span>';
    }

    /* ── Validation ── */

    function normalize(s) { return s.replace(/[^A-Za-z0-9]/g, '').toUpperCase(); }

    function validateSerial(serial) {
        if (!/^[A-Za-z0-9]{8,14}$/.test(serial)) {
            return 'Invalid asset tag (use 8–14 alphanumeric characters).';
        }
        return null;
        // NOTE: "Already exists" checks (same-type or cross-type) are intentionally NOT
        // surfaced here — they run at commit time and appear ONLY as the error toast.
        // See `existingType()` + `notifyConflicts()` in commitUnits().
    }

    /** If `serial` is already in Asset Registry, return the type that owns it; else null. */
    function existingType(serial) {
        var n = normalize(serial);
        var hit = Data.units.filter(function(u) { return normalize(u.serialNumber) === n; })[0];
        return hit ? hit.type : null;
    }

    function parseSerials(text) {
        return (text || '').split(/[\s,;]+/);
    }

    function buildRows(serials) {
        var seen = {};
        _rows = [];
        serials.forEach(function(raw) {
            var s = (raw || '').trim();
            if (!s) return;
            var key = s.toUpperCase();
            if (seen[key]) return;
            seen[key] = true;
            var err = validateSerial(s);
            _rows.push({ serial: s, error: err, valid: !err, checked: !err });
        });
    }

    /* ── Step 1 markup ── */

    function buildUploadPanel() {
        return '<div class="add-devices__upload-head">'
            + '<p class="add-devices__hint">Upload the provided template filled out.</p>'
            + '<button class="btn btn--secondary btn--small" id="addDownloadTemplate" type="button">'
            + '<sf-symbol name="arrow.down.circle"></sf-symbol> Download Template</button>'
            + '</div>'
            + '<div class="add-devices__dropzone" id="addDropzone">'
            + '<sf-symbol class="add-devices__dropzone-icon" name="icloud.and.arrow.up"></sf-symbol>'
            + '<p class="add-devices__dropzone-title">Drop the <strong>XLSX</strong> file here or '
            + '<span class="add-devices__browse" id="addBrowse">browse</span></p>'
            + '<p class="add-devices__dropzone-sub">XLSX (MAX 10mb)</p>'
            + (_uploadFileName ? '<p class="add-devices__file"><sf-symbol name="doc"></sf-symbol> ' + _uploadFileName + '</p>' : '')
            + '</div>';
    }

    function buildManualPanel() {
        var html = '<p class="add-devices__hint">Provide serial numbers using only alphanumeric with length '
            + 'between 8 and 14 characters, separated by commas, semicolons, spaces, or line breaks.</p>';
        // Campus picker (both modes) — a `proj-cascader` instance.
        html += '<div class="add-devices__scope"><div id="addCascader"></div></div>';
        html += '<div class="form-group"><textarea id="addSerialInput" class="form-textarea add-devices__textarea" '
            + 'placeholder="Enter asset tags…">' + (_serialsManual || '') + '</textarea></div>';
        return html;
    }

    /* ── Scope cascader (Campus only — both modes) ── */

    function createCascader() {
        if (!window.ProjCascader) return;
        if (!document.getElementById('addCascader')) return;
        ProjCascader.create('#addCascader', {
            columns: [{ level: 'site', mode: 'single', placeholder: 'Pick a Campus' }],
            value: { site: _site },
            placeholder: 'Select a Campus',
            getOptions: function(level) {
                if (level === 'site') {
                    return Data.lineServers.map(function(s) { return { id: s.id, label: s.name }; });
                }
                return [];
            },
            onChange: function(value) {
                _site = value.site || null;
                _wizard.setTitle(titleText());
                updateNext();
            }
        });
        _cascaderEl = document.getElementById('addCascader');
    }

    function destroyCascader() {
        if (_cascaderEl && window.ProjCascader) ProjCascader.destroy(_cascaderEl);
        _cascaderEl = null;
    }

    function buildStep1() {
        var html = '<div class="add-devices">';
        html += '<div class="tabs add-devices__tabs">'
            + '<div class="tabs__nav">'
            + '<button class="tabs__tab' + (_activeTab === 'upload' ? ' tabs__tab--active' : '') + '" data-tab="addUploadPanel">Upload File</button>'
            + '<button class="tabs__tab' + (_activeTab === 'manual' ? ' tabs__tab--active' : '') + '" data-tab="addManualPanel">Add Manually</button>'
            + '</div>'
            + '<div class="tabs__content">'
            + '<div class="tabs__panel' + (_activeTab === 'upload' ? ' tabs__panel--active' : '') + '" id="addUploadPanel">' + buildUploadPanel() + '</div>'
            + '<div class="tabs__panel' + (_activeTab === 'manual' ? ' tabs__panel--active' : '') + '" id="addManualPanel">' + buildManualPanel() + '</div>'
            + '</div></div>';
        html += '</div>';
        return html;
    }

    function step1Footer() {
        return footerNote()
            + '<button class="btn btn--secondary btn--medium" id="addCancelBtn" type="button">Cancel</button>'
            + '<button class="btn btn--primary btn--medium" id="addNextBtn" type="button" disabled>Next <sf-symbol name="arrow.right"></sf-symbol></button>';
    }

    /* ── Step 2 markup ── */

    function selectAllHeader() {
        return '<th class="table__header" style="width: 40px;">'
            + '<label class="checkbox"><input type="checkbox" class="checkbox__input" id="addReviewSelectAll">'
            + '<span class="checkbox__box"></span></label></th>';
    }
    function sortableHeader(column, label) {
        return '<th class="table__header sortable" data-sort="manual" data-column="' + column + '">'
            + label + ' ' + SORT_INDICATOR + '</th>';
    }

    function buildStep2() {
        return '<div class="add-devices add-devices--review">'
            + '<div class="add-devices__review-toolbar">'
            + '<div class="form-group add-devices__search">'
            + '<input type="search" id="addReviewSearch" class="form-input" placeholder="Search for Asset Tag"></div>'
            + '<div class="add-devices__review-toolbar-right">'
            + '<label class="switch switch--small"><input type="checkbox" class="switch__input" id="addShowErrors">'
            + '<span class="switch__slider"></span><span class="switch__label">Show errors only</span></label>'
            + '<span class="add-devices__summary" id="addSummary"></span>'
            + '</div></div>'
            + '<div class="table-container"><table class="table" id="addReviewTable">'
            + '<thead class="table__head"><tr class="table__row">'
            + selectAllHeader() + sortableHeader('serial', 'Asset Tag') + sortableHeader('error', 'Error')
            + '</tr></thead><tbody class="table__body" id="addReviewBody"></tbody></table></div>'
            + '</div>';
    }

    function step2Footer() {
        return footerNote()
            + '<button class="btn btn--secondary btn--medium" id="addPrevBtn" type="button"><sf-symbol name="arrow.left"></sf-symbol> Previous</button>'
            + '<button class="btn btn--primary btn--medium" id="addCommitBtn" type="button">Add Devices</button>';
    }

    function summaryText() {
        var n = _rows.filter(function(r) { return r.valid && r.checked; }).length;
        var unit = n === 1 ? 'Device' : 'Devices';
        if (_mode === 'Managed') return 'Register ' + n + ' ' + unit + '.';
        return 'Register ' + n + ' ' + unit + '.';
    }

    /* ── Step 1 rendering + wiring ── */

    function showStep1() {
        destroyCascader();
        _wizard.bodyEl().innerHTML = buildStep1();
        _wizard.footerEl().innerHTML = step1Footer();
        wireStep1();
        createCascader();
        updateNext();
    }

    function wireStep1() {
        var cancel = document.getElementById('addCancelBtn');
        if (cancel) cancel.addEventListener('click', function() { _wizard.close(); });
        var next = document.getElementById('addNextBtn');
        if (next) next.addEventListener('click', function() { if (!next.disabled) goToStep2(); });

        // Tab switching (wired here — MDS only binds tabs present at canvas-ready, not injected ones).
        document.querySelectorAll('.add-devices__tabs .tabs__tab').forEach(function(tab) {
            tab.addEventListener('click', function() {
                var target = this.dataset.tab;
                _activeTab = target === 'addUploadPanel' ? 'upload' : 'manual';
                var tabsRoot = this.closest('.tabs');
                tabsRoot.querySelectorAll('.tabs__tab').forEach(function(t) {
                    t.classList.toggle('tabs__tab--active', t === tab);
                });
                tabsRoot.querySelectorAll('.tabs__panel').forEach(function(p) {
                    p.classList.toggle('tabs__panel--active', p.id === target);
                });
                updateNext();
            });
        });

        var ta = document.getElementById('addSerialInput');
        if (ta) ta.addEventListener('input', function() { _serialsManual = this.value; updateNext(); });

        var dl = document.getElementById('addDownloadTemplate');
        if (dl) dl.addEventListener('click', function() { console.log('Download template (mock)'); });

        // Mock file selection: clicking (or dropping onto) the dropzone picks a sample file —
        // no native picker, no parsing; just enough to fill the file + enable Next.
        var dz = document.getElementById('addDropzone');
        if (dz) {
            dz.addEventListener('click', function() { selectSampleFile(); });
            dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('add-devices__dropzone--dragover'); });
            dz.addEventListener('dragleave', function() { dz.classList.remove('add-devices__dropzone--dragover'); });
            dz.addEventListener('drop', function(e) {
                e.preventDefault();
                dz.classList.remove('add-devices__dropzone--dragover');
                selectSampleFile();
            });
        }
    }

    function selectSampleFile() {
        _uploadFileName = 'sample.xlsx';
        _uploadSerials = MOCK_UPLOAD_SERIALS.slice();
        _activeTab = 'upload';
        showStep1();
    }

    function updateNext() {
        var btn = document.getElementById('addNextBtn');
        if (!btn) return;
        var activePanel = document.querySelector('.add-devices__tabs .tabs__panel--active');
        var ok = false;
        if (activePanel && activePanel.id === 'addUploadPanel') {
            ok = !!(_uploadSerials && _uploadSerials.length);
        } else {
            var ta = document.getElementById('addSerialInput');
            var hasSerials = ta && ta.value.trim().length > 0;
            ok = !!(hasSerials && _site);
        }
        btn.disabled = !ok;
    }

    /* ── Step navigation ── */

    function goToStep2() {
        var activePanel = document.querySelector('.add-devices__tabs .tabs__panel--active');
        var serials;
        if (activePanel && activePanel.id === 'addUploadPanel') {
            serials = _uploadSerials || [];
        } else {
            var ta = document.getElementById('addSerialInput');
            _serialsManual = ta ? ta.value : '';
            serials = parseSerials(_serialsManual);
        }
        buildRows(serials);

        destroyCascader();   // step 1 DOM (incl. the cascader) is about to be replaced
        _sortColumn = null; _sortDir = 'asc'; _reviewSearch = ''; _showErrorsOnly = false;
        _wizard.setStep(1);
        _wizard.bodyEl().innerHTML = buildStep2();
        _wizard.footerEl().innerHTML = step2Footer();

        if (!_reviewTpl) {
            var tpl = document.getElementById('addReviewRowsTemplate');
            if (tpl && window.Handlebars) _reviewTpl = Handlebars.compile(tpl.innerHTML);
        }
        wireStep2();
        renderReviewTable();
    }

    function goToStep1() {
        _wizard.setStep(0);
        showStep1();
    }

    /* ── Step 2 rendering + wiring ── */

    function wireStep2() {
        var search = document.getElementById('addReviewSearch');
        if (search) search.addEventListener('input', function() { _reviewSearch = this.value; renderReviewTable(); });
        var se = document.getElementById('addShowErrors');
        if (se) se.addEventListener('change', function() { _showErrorsOnly = this.checked; renderReviewTable(); });
        var prev = document.getElementById('addPrevBtn');
        if (prev) prev.addEventListener('click', goToStep1);
        var commit = document.getElementById('addCommitBtn');
        if (commit) commit.addEventListener('click', function() { if (!commit.disabled) commitUnits(); });

        var all = document.getElementById('addReviewSelectAll');
        if (all) all.addEventListener('change', function() {
            var c = this.checked;
            _rows.forEach(function(r) { if (r.valid) r.checked = c; });
            renderReviewTable();
        });

        document.querySelectorAll('#addReviewTable .table__header.sortable').forEach(function(h) {
            h.addEventListener('click', function() {
                var c = this.dataset.column;
                if (_sortColumn === c) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
                else { _sortColumn = c; _sortDir = 'asc'; }
                renderReviewTable();
            });
        });
    }

    function renderReviewTable() {
        var body = document.getElementById('addReviewBody');
        if (!body) return;

        var rows = _rows.map(function(r, i) {
            return { serial: r.serial, error: r.error, valid: r.valid, checked: r.checked, index: i };
        });
        var term = _reviewSearch.toLowerCase().trim();
        if (term) rows = rows.filter(function(r) { return r.serial.toLowerCase().indexOf(term) !== -1; });
        if (_showErrorsOnly) rows = rows.filter(function(r) { return !r.valid; });
        if (_sortColumn) {
            var dir = _sortDir === 'asc' ? 1 : -1;
            rows.sort(function(a, b) {
                var av = (_sortColumn === 'serial' ? a.serial : (a.error || '')).toLowerCase();
                var bv = (_sortColumn === 'serial' ? b.serial : (b.error || '')).toLowerCase();
                return av < bv ? -1 * dir : av > bv ? 1 * dir : 0;
            });
        }

        body.innerHTML = _reviewTpl ? _reviewTpl({ rows: rows }) : '';
        updateSummary();
        updateSelectAll();
        updateCommitButton();
        attachRowCheckboxes();
        applySortIndicators();
    }

    function attachRowCheckboxes() {
        document.querySelectorAll('.add-review-checkbox').forEach(function(cb) {
            cb.addEventListener('change', function() {
                var i = parseInt(this.dataset.index, 10);
                if (_rows[i] && _rows[i].valid) _rows[i].checked = this.checked;
                updateSummary();
                updateSelectAll();
                updateCommitButton();
            });
        });
    }

    function updateSummary() {
        var el = document.getElementById('addSummary');
        if (el) el.textContent = summaryText();
    }

    function updateSelectAll() {
        var all = document.getElementById('addReviewSelectAll');
        if (!all) return;
        var valid = _rows.filter(function(r) { return r.valid; });
        var checked = valid.filter(function(r) { return r.checked; });
        all.checked = valid.length > 0 && checked.length === valid.length;
        all.indeterminate = checked.length > 0 && checked.length < valid.length;
        all.disabled = valid.length === 0;
    }

    function updateCommitButton() {
        var btn = document.getElementById('addCommitBtn');
        if (!btn) return;
        btn.disabled = _rows.filter(function(r) { return r.valid && r.checked; }).length === 0;
    }

    function applySortIndicators() {
        document.querySelectorAll('#addReviewTable .table__header.sortable').forEach(function(h) {
            h.classList.remove('sorted-asc', 'sorted-desc');
            var up = h.querySelector('.sort-indicator__up');
            var down = h.querySelector('.sort-indicator__down');
            if (up) up.classList.remove('active');
            if (down) down.classList.remove('active');
            if (h.dataset.column === _sortColumn) {
                h.classList.add(_sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc');
                var active = _sortDir === 'asc' ? up : down;
                if (active) active.classList.add('active');
            }
        });
    }

    /* ── Commit ── */

    function commitUnits() {
        // Step 2 has filtered out format errors. The "already exists" check happens here,
        // on Add Devices click — any serial already in Asset Registry (under either type) is silently
        // skipped and surfaced via the error toast (never inline in the review table).
        var candidates = _rows.filter(function(r) { return r.valid && r.checked; });
        var conflictsByType = { Managed: 0, Registered: 0 };
        var toAdd = [];
        candidates.forEach(function(r) {
            var t = existingType(r.serial);
            if (t) conflictsByType[t] += 1;
            else toAdd.push(r);
        });

        var now = new Date().toISOString();
        toAdd.forEach(function(r) {
            var unit = {
                serialNumber: r.serial, type: _mode, site: _site,
                project: '', lineName: '', station: '', stationIP: '',
                updatedBy: NEW_UNIT_AUTHOR, updatedAt: now, lastHeardFrom: ''
            };
            // Registered mode: the approval workflow is deprecated, so new units of either type are
            // born READY (there's no PENDING APPROVAL step to move Registered units off of).
            unit.status = 'READY';
            Data.units.push(unit);
        });
        notifyCommitSuccess(toAdd.length);
        if (conflictsByType.Managed) notifyConflicts(conflictsByType.Managed, 'Managed');
        if (conflictsByType.Registered) notifyConflicts(conflictsByType.Registered, 'Registered');

        var hasConflicts = (conflictsByType.Managed + conflictsByType.Registered) > 0;

        if (hasConflicts) {
            // Keep the wizard open so the user can see / address the conflicting serials.
            // Drop the just-committed rows from the review list and re-render. Refresh the
            // page in the background so any successful adds appear behind the modal.
            var addedSerials = {};
            toAdd.forEach(function(r) { addedSerials[r.serial] = true; });
            _rows = _rows.filter(function(r) { return !addedSerials[r.serial]; });
            renderReviewTable();
            if (window.UnitsApp) window.UnitsApp.refresh({ loading: true });
            return;
        }

        _wizard._closeBypass();
        redirectPageToWizardSelection();
        if (window.UnitsApp) window.UnitsApp.refresh({ loading: true });
    }

    /** Toast confirming the commit. Copy: "<N> Device<s> added to <Campus> on <Device Type>". */
    function notifyCommitSuccess(count) {
        if (!count || typeof window.showNotification !== 'function') return;
        var noun = count === 1 ? 'Device' : 'Devices';
        var msg = count + ' ' + noun + ' added to ' + siteName(_site) + ' on ' + _mode;
        window.showNotification('success', msg);
    }

    /** Error toast for serials rejected because they're already in Asset Registry (same-type or
     *  cross-type). One toast per side that had conflicts — never shown inline in Step 2. */
    function notifyConflicts(count, type) {
        if (!count || typeof window.showNotification !== 'function') return;
        var subject = count === 1 ? 'Selected device' : 'Selected devices';
        var msg = '<strong>Atrium couldn\'t register the devices</strong>'
            + '<br>' + subject + ' already in use on ' + type + ' Asset Registry.';
        window.showNotification('error', msg);
    }

    /** If the wizard's Campus differs from the page state, sync before refresh. Type is locked
     *  to the page toggle, so it never diverges. */
    function redirectPageToWizardSelection() {
        var siteChanged = _site !== State.selectedSite;

        if (siteChanged) {
            State.selectedSite = _site;
            State.write(State.STORAGE_KEY_SITE, _site || '');
            if (window.ProjCascader) {
                ProjCascader.setValue('#unitsCascader', { site: _site }, { silent: true });
            }
            State.selectedRows.clear();
            if (window.UnitsSubheader) UnitsSubheader.applyMode();
        }
    }

    /* ── Public API ── */

    function init() {
        if (_wizard) return;
        if (!window.ProjWizard) { console.warn('Add Devices: ProjWizard plugin not loaded'); return; }
        _wizard = ProjWizard.create({
            steps: [{ label: 'Provide asset tags' }, { label: 'Review and register Devices' }],
            title: 'Add Devices',
            onClose: function() {
                destroyCascader();
                hideCloseConfirm();
            }
        });

        buildCloseConfirmPopover();

        // Wrap close() so every USER-initiated close path (Cancel, X, Escape) routes through
        // the pop-confirm when there's unsaved input. Commit success calls `_closeBypass`
        // (the saved original) to skip the prompt.
        var origClose = _wizard.close.bind(_wizard);
        _wizard._closeBypass = origClose;
        _wizard.close = function() {
            if (hasPendingInput()) {
                // Defer to a fresh task so the click event that triggered close finishes
                // bubbling (MDS attaches a bubble-phase outside-click listener that hides
                // every `.popover` — without this defer it would close ours right after open).
                setTimeout(showCloseConfirm, 0);
                return _wizard;
            }
            return origClose();
        };
    }

    /** True if the user has staged any input the wizard would lose on close. */
    function hasPendingInput() {
        if (_uploadFileName) return true;
        if (_uploadSerials && _uploadSerials.length) return true;
        if ((_serialsManual || '').trim().length > 0) return true;
        if (_rows && _rows.length > 0) return true;
        return false;
    }

    /* ── Pop-confirm: discard-changes popover anchored to the wizard's X button ── */

    function buildCloseConfirmPopover() {
        if (document.getElementById('addCloseConfirmPopover')) return;
        var pop = document.createElement('div');
        pop.id = 'addCloseConfirmPopover';
        pop.className = 'popover popover--bottom add-devices__close-confirm';
        pop.innerHTML =
            '<div class="popover__content">'
            + '<div class="popover__header"><h4 class="popover__title">Discard changes?</h4></div>'
            + '<div class="popover__body">Any serials or files you entered will be lost.</div>'
            + '<div class="popover__footer add-devices__close-confirm-actions">'
            + '<button class="btn btn--secondary btn--small" type="button" data-confirm-action="keep">Keep editing</button>'
            + '<button class="btn btn--danger btn--small" type="button" data-confirm-action="discard">Discard</button>'
            + '</div></div>'
            + '<div class="popover__arrow"></div>';
        document.body.appendChild(pop);

        pop.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-confirm-action]');
            if (!btn) return;
            if (btn.dataset.confirmAction === 'discard') {
                hideCloseConfirm();
                if (_wizard && _wizard._closeBypass) _wizard._closeBypass();
            } else {
                hideCloseConfirm();
            }
        });

        // Outside-click dismisses the popover (but don't dismiss when clicking inside it).
        document.addEventListener('click', function(e) {
            if (!pop.classList.contains('popover--open')) return;
            if (e.target.closest('#addCloseConfirmPopover')) return;
            // Clicking the X button re-opens the popover via the wrapped close — let that
            // path through (it'll just re-show in the same spot).
            hideCloseConfirm();
        }, true);

        // Escape dismisses the popover; stop propagation so the wizard's Escape handler
        // doesn't ALSO try to close behind it.
        document.addEventListener('keydown', function(e) {
            if (e.key !== 'Escape') return;
            if (!pop.classList.contains('popover--open')) return;
            e.stopPropagation();
            hideCloseConfirm();
        }, true);
    }

    function showCloseConfirm() {
        var pop = document.getElementById('addCloseConfirmPopover');
        var xBtn = document.querySelector('.proj-wizard-overlay .proj-wizard__close');
        if (!pop || !xBtn) return;
        pop.style.display = 'block';
        pop.classList.add('popover--open');
        // Measure once visible so width is real, then anchor below the X button.
        var pr = pop.getBoundingClientRect();
        var rect = xBtn.getBoundingClientRect();
        pop.style.left = Math.max(8, rect.right - pr.width) + 'px';
        pop.style.top = (rect.bottom + 8) + 'px';
    }

    function hideCloseConfirm() {
        var pop = document.getElementById('addCloseConfirmPopover');
        if (!pop) return;
        pop.style.display = 'none';
        pop.classList.remove('popover--open');
    }

    function open() {
        if (!_wizard) init();
        if (!_wizard) return;

        // Lock the mode to the active page view; never let the wizard flip it.
        _mode = State.currentTypeFilter === 'Registered' ? 'Registered' : 'Managed';
        _site = State.selectedSite || (siteList()[0] ? siteList()[0].id : null);

        _activeTab = 'upload';
        _serialsManual = ''; _uploadSerials = null; _uploadFileName = '';
        _rows = []; _sortColumn = null; _sortDir = 'asc'; _reviewSearch = ''; _showErrorsOnly = false;

        _wizard.setTitle(titleText());
        _wizard.setStep(0);
        showStep1();
        _wizard.open();
    }

    window.UnitsAddUnits = { init: init, open: open };
})();
