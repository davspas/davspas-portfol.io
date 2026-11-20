(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;
    var T = window.FdrTable;
    var A = window.FdrActions;

    var LOADING_MS = 600;
    var _timer = null;
    var _focusScrolled = false;

    function show(id, on, display) {
        var el = document.getElementById(id);
        if (el) el.style.display = on ? (display || 'block') : 'none';
    }

    function ribbon(text) {
        return '<div class="fdr-ribbon"><sf-symbol class="fdr-ribbon__icon" name="info.circle"></sf-symbol><span class="fdr-ribbon__text">' + text + '</span></div>';
    }

    function renderRibbon() {
        var el = document.getElementById('fdrRibbon');
        var items = S.tab === 'deploy'
            ? ['Only registered devices can receive a recovery roll-out. Devices in any other status are listed but cannot be selected.']
            : ['The Room Booking Manager registers devices automatically when they ask for their room info, and retries failures itself. Use Send Recovery Request only when a status looks stuck.'];
        if (S.readonly) items.push(S.tab === 'deploy' ? 'You can see recovery roll-outs but not start, schedule or cancel them.' : 'You can see device recovery registration but not send recovery requests.');
        el.innerHTML = items.map(ribbon).join('');
        el.hidden = false;
        // Sit flush against the top of the table the user is looking at (Registration table, or the Roll out table under its version strip).
        var table = S.tab === 'deploy' ? document.querySelector('#fdrDeploy .table-container') : document.getElementById('fdrContent');
        if (table && table.parentNode && table.previousElementSibling !== el) table.parentNode.insertBefore(el, table);
        var page = document.querySelector('.fdr-page');
        if (page) page.style.setProperty('--fdr-ribbon-height', (items.length * 3.2) + 'rem');
    }

    function renderFilterStatus() {
        var on = !!((S.tab === 'registration' && S.counter) || T.hasColumnFilters());
        var el = document.getElementById('fdrFilterStatus');
        if (el) el.style.display = on ? 'flex' : 'none';
    }

    function render(opts) {
        if (_timer) { clearTimeout(_timer); _timer = null; }
        if (opts && opts.loading) {
            show('fdrLoading', true, 'flex'); show('fdrEmpty', false); show('fdrContent', false); show('fdrDeploy', false); show('fdrCounters', false);
            _timer = setTimeout(function() { _timer = null; render(); }, LOADING_MS);
            return;
        }
        var deploy = S.tab === 'deploy';
        // A vanished Unavailable counter must not stay active (checked before the filter status is drawn).
        if (S.counter === 'unavailable' && !T.inScope().some(function(u) { return u.unavailable; })) S.counter = null;
        renderRibbon();
        renderFilterStatus();
        document.querySelectorAll('[data-fdr-tab]').forEach(function(b) {
            var on = b.dataset.fdrTab === S.tab;
            b.classList.toggle('tabs__tab--active', on);
            b.setAttribute('aria-selected', on);
        });
        var scope = T.inScope();
        var list = deploy ? T.visibleDeploy() : T.visible();
        show('fdrLoading', false);

        var empty = document.getElementById('fdrEmpty');
        var msg = null;
        if (!S.sites.length) msg = ['Select campuses', 'Choose at least one campus to see recovery ' + (deploy ? 'roll-outs.' : 'registration.')];
        else if (!S.projects.length) msg = ['Select faculties', 'Choose at least one faculty to see recovery ' + (deploy ? 'roll-outs.' : 'registration.')];
        else if (!scope.length) msg = ['No IT-managed devices in ' + S.projects.join(', '), 'Devices appear here once an IT-managed device exists in the selected faculties and campuses.'];
        else if (!list.length) msg = ['No devices found', 'Try adjusting your search or the filters.'];

        show('fdrCounters', !deploy && scope.length > 0, 'grid');
        if (msg) {
            empty.querySelector('.empty-state__title').textContent = msg[0];
            empty.querySelector('.empty-state__subtitle').textContent = msg[1];
        }
        show('fdrEmpty', !!msg && (!deploy || !scope.length || !list.length), 'flex');
        show('fdrContent', !deploy && scope.length > 0 && list.length > 0);
        show('fdrDeploy', deploy && scope.length > 0);
        if (deploy) { if (scope.length) window.FdrDeploy.render(list); }
        else if (scope.length) T.render(list);
        A.updateBar();

        if (!deploy && S.focus.unit && !_focusScrolled) {
            var u = document.getElementById('unit-' + S.focus.unit);
            if (u) { _focusScrolled = true; u.scrollIntoView({ block: 'center' }); }
        }
    }

    function init() {
        if (S.demo === 'unavailable') {
            // One device of EN-103 AV Lab (NORT) cannot be read
            D.units.filter(function(x) { return x.stationId === 'nort-acond'; })[0].unavailable = true;
        }
        if (S.focus.station || S.focus.unit) {
            // Arriving from Manage Devices: the station's units (or the one unit) become the Device column filter (Faculty > Campus > Device).
            var one = S.focus.unit ? D.units.filter(function(x) { return x.serial === S.focus.unit; })[0] : null;
            var stId = S.focus.station || (one && one.stationId);
            var ids = stId ? D.units.filter(function(x) { return x.stationId === stId; }) : [];
            var ref = ids[0] || one;
            if (ref) {
                S.sites = [ref.site];
                S.projects = [ref.project];
                S.colFilter.unit = { project: ref.project, site: ref.site, units: ids.length ? ids.map(function(x) { return x.id; }) : [one.id] };
            }
        }

        window.FdrSubheader.init();
        T.bind();
        window.FdrColumnFilters.bind();
        A.bind();
        window.FdrDeploy.bind();

        document.getElementById('fdrSearch').addEventListener('input', function(e) {
            S.search = e.target.value;
            render();
            var input = document.getElementById('fdrSearch');
            input.focus();
        });
        document.addEventListener('click', function(e) {
            var tab = e.target.closest('[data-fdr-tab]');
            if (tab && tab.dataset.fdrTab !== S.tab) {
                S.tab = tab.dataset.fdrTab;
                if (window.FdrColumnFilters) FdrColumnFilters.close();
                S.sort = { col: null, dir: 'asc' };
                if (S.tab === 'deploy') S.colFilter.updated = 'all';   // Roll out has no Updated at column
                render();
                return;
            }
            if (e.target.closest('#fdrClearFilters')) {
                S.counter = null; S.focus.unit = null; T.clearColumnFilters(); render(); return;
            }
        });

        render({ loading: true });
    }

    window.FdrApp = { render: render };

    (function boot() {
        var initialized = false;
        function safeInit() {
            if (initialized) return;
            initialized = true;
            try { init(); } catch (err) { console.error('Init failed:', err); }
        }
        document.addEventListener('davinci:canvas:ready', safeInit);
        setTimeout(function() {
            if (!initialized && document.querySelector('.main-container')) safeInit();
        }, 300);
    })();
})();
