(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;

    var REASON = 'Device recovery registration applies to IT-managed devices only. Faculty-registered devices are registered by their Building Controller.';

    function lockSourceToggle() {
        var toggle = document.querySelector('.proj-source-toggle');
        if (!toggle) return;
        var kodiak = toggle.querySelector('[data-source="kodiak"]');
        var groundhog = toggle.querySelector('[data-source="groundhog"]');
        if (window.ProjSourceToggle && ProjSourceToggle.setActive) {
            ProjSourceToggle.setActive(toggle, 'kodiak');
        } else if (kodiak) {
            toggle.querySelectorAll('.proj-source-toggle__option').forEach(function(opt) {
                opt.classList.toggle('proj-source-toggle__option--active', opt === kodiak);
            });
            toggle.setAttribute('data-active', 'kodiak');
        }
        if (groundhog) {
            groundhog.classList.add('proj-source-toggle__option--disabled');
            groundhog.setAttribute('aria-disabled', 'true');
            groundhog.setAttribute('title', REASON);
        }
    }

    function init() {
        lockSourceToggle();

        if (window.ProjMultiSelect && document.getElementById('fdrSites')) {
            ProjMultiSelect.create('#fdrSites', {
                mode: 'flat',
                items: D.sites,
                selected: S.sites,
                allLabel: 'All Campuses',
                placeholder: 'Select Campuses',
                onChange: function(ids) {
                    S.sites = ids;
                    S.colFilter.unit = null;   // it may point at a site that is no longer selected
                    pruneSelection();
                    window.FdrApp.render({ loading: true });
                }
            });
        }

        if (window.ProjMultiSelect && document.getElementById('fdrProjects')) {
            ProjMultiSelect.create('#fdrProjects', {
                mode: 'flat',
                items: D.projects.map(function(p) { return { id: p, label: p }; }),
                selected: S.projects,
                allLabel: 'All Faculties',
                placeholder: 'Select Faculties',
                onChange: function(ids) {
                    S.projects = ids;
                    S.colFilter.unit = null;   // it may point at a project that is no longer selected
                    S.selected.clear();
                    S.deploy.selected.clear();
                    S.counter = null;
                    window.FdrApp.render({ loading: true });
                }
            });
        }

        var group = document.getElementById('fdrGroup');
        if (group) {
            group.checked = S.groupBySite;
            group.addEventListener('change', function() {
                S.groupBySite = group.checked;
                window.FdrApp.render();
            });
        }
    }

    /* Un-tick units outside the selected Campuses (both tabs). */
    function pruneSelection() {
        [S.selected, S.deploy.selected].forEach(function(set) {
            Array.from(set).forEach(function(id) {
                var u = D.units.filter(function(x) { return x.id === id; })[0];
                if (!u || S.sites.indexOf(u.site) === -1) set.delete(id);
            });
        });
    }

    window.FdrSubheader = { init: init };
})();
