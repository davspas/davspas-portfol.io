(function() {
    'use strict';

    var params = new URLSearchParams(window.location.search);

    window.FdrState = {
        tab: 'registration',
        sites: ['NORT', 'HLSD'],
        projects: ['ENG'],
        groupBySite: true,
        search: '',
        counter: null,
        // Column filters (null / 'all' = off) and sort
        colFilter: { unit: null, types: null, updated: 'all' },
        sort: { col: null, dir: 'asc' },
        // Registration: ticked unit ids
        selected: new Set(),
        collapsedGroups: new Set(),
        focus: {
            station: params.get('station'),
            unit: params.get('unit')
        },
        // Roll out tab
        deploy: {
            version: null,          // chosen recovery version id
            selected: new Set(),    // ticked unit ids (Registered units only)
            sending: false
        },
        demo: params.get('state') || '',
        readonly: params.get('state') === 'readonly',
        sending: false
    };
})();
