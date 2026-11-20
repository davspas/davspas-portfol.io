(function() {
    'use strict';

    var STATUS = {
        REGISTERED:   { label: 'Registered',     icon: 'checkmark.circle.fill',         tone: 'green' },
        QUEUED:       { label: 'Queued',         icon: 'clock',                         tone: 'gray' },
        RE_REGISTER:  { label: 'Re-register',    icon: 'arrow.triangle.2.circlepath',   tone: 'blue' },
        FAILED:       { label: 'Failed',         icon: 'xmark.circle.fill',             tone: 'red' },
        UNREGISTERED: { label: 'Not registered', icon: 'circle',                        tone: 'gray' },
        UNAVAILABLE:  { label: 'Unavailable',    icon: 'exclamationmark.triangle.fill', tone: 'orange' }
    };

    var UNIT_ORDER = ['REGISTERED', 'QUEUED', 'RE_REGISTER', 'FAILED', 'UNREGISTERED'];
    var ROLLUP_ORDER = ['FAILED', 'RE_REGISTER', 'UNREGISTERED', 'QUEUED', 'REGISTERED'];
    var CANNOT_REGISTER_TYPES = ['Not set', 'No access', ''];

    /* Raw data follows the Manage Devices hierarchy: Campus > Faculty > Floor > Room > Room Device.
       Every node carries id, name, type, level, children, plus the site / project / line / station it sits under.
       The Device Recovery fields live on the nodes: `fdrType` on a Room, `status` and `updatedAt` on a Room Device. */
    var serialCounter = 0;

    function unitNodes(ctx, spec, stamp) {
        var units = [];
        spec.forEach(function(pair) {
            for (var i = 0; i < pair[1]; i++) {
                serialCounter++;
                var serial = ['PRJ', 'MIC', 'DRD', 'PNL'][serialCounter % 4] + ctx.site + (4000 + serialCounter);
                units.push({
                    id: 'unit-' + serialCounter, name: serial, serial: serial,
                    site: ctx.site, project: ctx.project, line: ctx.line, station: ctx.station,
                    type: 'Room Device', level: 'Room Device', children: [],
                    status: pair[0], updatedAt: pair[0] === 'UNREGISTERED' ? null : stamp, sim: false
                });
            }
        });
        return units;
    }

    function stationNode(id, ctx, name, fdrType, spec, stamp) {
        var c = { site: ctx.site, project: ctx.project, line: ctx.line, station: name };
        return { id: id, name: name, site: c.site, project: c.project, line: c.line,
                 type: 'Room', level: 'Room', fdrType: fdrType, children: unitNodes(c, spec, stamp) };
    }

    function lineNode(site, project, name, stations) {
        var ctx = { site: site, project: project, line: name };
        return { id: 'line-' + site.toLowerCase() + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                 name: name, site: site, project: project, type: 'Floor', level: 'Floor',
                 children: stations.map(function(st) { return stationNode(st[0], ctx, st[1], st[2], st[3], st[4]); }) };
    }

    function projectNode(site, name, lines) {
        return { id: 'project-' + site.toLowerCase() + '-' + name.toLowerCase(), name: name, site: site, project: name,
                 type: 'Faculty', level: 'Faculty', children: lines };
    }

    function siteNode(name, projects) {
        return { id: 'site-' + name.toLowerCase(), name: name, site: name, type: 'Campus', level: 'Campus', children: projects };
    }

    var T1 = '2026-10-26T14:00:00.000Z';
    var tree = [
        siteNode('NORT', [
            projectNode('NORT', 'ENG', [
                lineNode('NORT', 'ENG', 'Engineering L1', [
                    ['nort-dev1',  'EN-101 Lecture Theatre', 'Standard', [['REGISTERED', 1], ['QUEUED', 1], ['RE_REGISTER', 1], ['FAILED', 1], ['UNREGISTERED', 1]], '2026-10-26T14:01:00.000Z'],
                    ['nort-new',   'EN-102 Seminar Room',  'Standard', [['UNREGISTERED', 3]], null],
                    ['nort-acond', 'EN-103 AV Lab',       'Extended', [['REGISTERED', 5], ['QUEUED', 1]], T1],
                    ['nort-gh',    'EN-104 Studio',   'Not set',    [['UNREGISTERED', 2]], null],
                    ['nort-fatp2', 'EN-105 Teaching Lab',       'Standard', [['REGISTERED', 8]], T1]
                ]),
                lineNode('NORT', 'ENG', 'Engineering L2', [
                    ['nort-actcal', 'EN-201 Workshop', 'Standard', [['REGISTERED', 2]], T1],
                    ['nort-ae11',   'EN-202 Project Room',                 'Extended', [['REGISTERED', 1]], T1]
                ])
            ]),
            projectNode('NORT', 'SCI', [
                lineNode('NORT', 'SCI', 'Science Block L1', [
                    ['nort-sci-acond', 'SB-110 Chemistry Lab', 'Standard', [['REGISTERED', 1], ['FAILED', 1]], T1]
                ])
            ])
        ]),
        siteNode('HLSD', [
            projectNode('HLSD', 'ENG', [
                lineNode('HLSD', 'ENG', 'Engineering L1', [
                    ['hlsd-dev1', 'EN-101 Lecture Theatre', 'Standard', [['REGISTERED', 2], ['FAILED', 1]], T1]
                ])
            ]),
            projectNode('HLSD', 'SCI', [])
        ]),
        siteNode('MEDS', [projectNode('MEDS', 'SCI', [])])
    ];

    /* Flat list of stations for the table: each is the tree node itself, with `units` pointing at its children. */
    var stations = [];
    tree.forEach(function(site) {
        site.children.forEach(function(project) {
            project.children.forEach(function(line) {
                line.children.forEach(function(st) { st.units = st.children; stations.push(st); });
            });
        });
    });

    /* Flat list of units for the table: each is the tree node itself, with its station's id and recovery profile copied on. */
    var units = [];
    stations.forEach(function(st) {
        st.units.forEach(function(u) { u.stationId = st.id; u.fdrType = st.fdrType; units.push(u); });
    });

    var dev1 = stations.filter(function(x) { return x.id === 'nort-dev1'; })[0];
    dev1.units[1].updatedAt = '2026-10-26T14:02:00.000Z';
    dev1.units[2].updatedAt = '2026-10-26T14:03:00.000Z';
    dev1.units[3].updatedAt = '2026-10-26T14:04:00.000Z';

    /* ── Roll out (recovery versions deployed to units) ──────────────────────────────
       Same idea as the Faculty-registered recovery roll-out, but the target is a unit, not a building controller, and only a
       Registered unit can receive a deploy. Versions are project-wide; each unit keeps its last deploy
       (`deploy`) and a history list. Statuses: success, error, scheduled, deploying. */
    var versions = [
        { id: 12, label: 'v12', importedAt: '2026-11-02T09:00:00.000Z', by: 'Priya Raman', stations: 14, note: 'Latest' },
        { id: 11, label: 'v11', importedAt: '2026-10-19T15:30:00.000Z', by: 'Tomás Herrera', stations: 14, note: '' },
        { id: 10, label: 'v10', importedAt: '2026-10-04T11:10:00.000Z', by: 'Tomás Herrera', stations: 12, note: '' }
    ];
    var k = 0, scheduledSeeded = false;
    units.forEach(function(u) {
        u.deploy = null; u.history = [];
        if (u.status !== 'REGISTERED') return;
        var n = k++ % 4;
        if (n === 0) {
            u.history = [{ version: 10, status: 'success', at: '2026-10-05T10:00:00.000Z', by: 'Tomás Herrera', message: '' },
                         { version: 11, status: 'success', at: '2026-10-20T10:00:00.000Z', by: 'Priya Raman', message: '' }];
        } else if (n === 1) {
            u.history = [{ version: 12, status: 'success', at: '2026-11-02T13:00:00.000Z', by: 'Priya Raman', message: '' }];
        } else if (n === 3) {
            u.history = [{ version: 11, status: 'success', at: '2026-10-20T10:00:00.000Z', by: 'Priya Raman', message: '' },
                         { version: 12, status: 'error', at: '2026-11-03T08:20:00.000Z', by: 'Tomás Herrera', message: 'The device did not acknowledge the recovery package.' }];
        } else if (!scheduledSeeded) {
            scheduledSeeded = true;
            u.deploy = { version: 12, status: 'scheduled', scheduledFor: '2026-11-20T10:00:00.000Z', by: 'Priya Raman' };
        }
        if (!u.deploy && u.history.length) u.deploy = Object.assign({}, u.history[u.history.length - 1]);
    });

    window.FdrData = {
        versions: versions,
        STATUS: STATUS,
        UNIT_ORDER: UNIT_ORDER,
        BUCKET_ORDER: ['attention', 'unregistered', 'progress', 'cannot', 'registered', 'unavailable'],
        sites: [
            { id: 'NORT', label: 'NORT' },
            { id: 'HLSD', label: 'HLSD' },
            { id: 'MEDS', label: 'MEDS' }
        ],
        projects: ['ENG', 'SCI', 'LIB'],
        tree: tree,
        stations: stations,
        units: units,

        isCannotRegister: function(u) {
            return CANNOT_REGISTER_TYPES.indexOf(u.fdrType) !== -1;
        },

        /* Version installed on the unit: the last deploy that succeeded (null if none). */
        installedVersion: function(u) {
            for (var i = u.history.length - 1; i >= 0; i--) if (u.history[i].status === 'success') return u.history[i].version;
            return null;
        },

        unitStatus: function(u) {
            return u.unavailable ? 'UNAVAILABLE' : u.status;
        },

        bucket: function(u) {
            var s = this.unitStatus(u);
            if (s === 'UNAVAILABLE') return 'unavailable';
            if (this.isCannotRegister(u)) return 'cannot';
            if (s === 'FAILED') return 'attention';
            if (s === 'UNREGISTERED') return 'unregistered';
            if (s === 'QUEUED' || s === 'RE_REGISTER') return 'progress';
            return 'registered';
        },

        unitCounts: function(list) {
            var c = {};
            list.forEach(function(u) { c[u.status] = (c[u.status] || 0) + 1; });
            return c;
        }
    };
})();
