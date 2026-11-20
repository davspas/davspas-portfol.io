(function() {
    'use strict';

    function exportCSV() {
        var sites = (typeof selectedSites !== 'undefined' && selectedSites) ? selectedSites.slice() : [];
        if (sites.length === 0 || !lineServersData) return;

        var rows = [];
        rows.push(['Hostname', 'IP Address', 'Node ID', 'Campus', 'Node Type', 'Status', 'Description', 'Location', 'Faculties', 'Campus Hub Association', 'Relay Association', 'Alert Service', 'Energy Saver', 'Exam Lockdown']);

        function collectServers(node) {
            if (node.level === 'Building Controller') {
                var cdnName = '';
                var cdnNodes = (typeof findAssociatedCDNServers === 'function') ? findAssociatedCDNServers(node.name) : [];
                if (cdnNodes.length > 0) cdnName = cdnNodes.map(function(c) { return c.name; }).join(', ');

                // Node Type is per-line-server; backfill in config-data.js
                // guarantees seed servers are populated. Map the stored value
                // ('fatp' | 'panda' | 'lab') to its display label.
                var typeMap = { 'fatp': 'Standalone Campus', 'panda': 'Connected Campus', 'lab': 'Test Lab' };
                var serverTypeLabel = typeMap[node.serverType] || '';

                rows.push([
                    node.name || '',
                    node.ip || '',
                    node.id || '',
                    node.site || '',
                    serverTypeLabel,
                    node.archived ? 'Archived' : 'Active',
                    node.description || '',
                    node.location || '',
                    (node.associatedProjects || []).slice().sort().join('; '),
                    node.ghdsAssociation || '',
                    cdnName,
                    node.pgmService || 'off',
                    node.komodo ? 'Yes' : 'No',
                    node.redPanda ? 'Yes' : 'No'
                ]);
            }
            if (node.children) {
                node.children.forEach(function(child) { collectServers(child); });
            }
        }

        // `lineServersData` is an array (one root per selected site) when
        // multi-site selection is active. Walk every root.
        var roots = Array.isArray(lineServersData) ? lineServersData : [lineServersData];
        roots.forEach(collectServers);

        var csv = rows.map(function(row) {
            return row.map(function(cell) {
                var s = String(cell);
                if (s.indexOf(',') !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
                    return '"' + s.replace(/"/g, '""') + '"';
                }
                return s;
            }).join(',');
        }).join('\n');

        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = sites.slice().sort().join('-') + '-building-controllers.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    }

    function init() {
        var btn = document.getElementById('exportBtn');
        if (btn) btn.addEventListener('click', exportCSV);
    }

    window.ExportServers = { init: init };
})();
