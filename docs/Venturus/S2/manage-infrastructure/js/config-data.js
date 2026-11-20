// Building Controller Configuration Data - 3-Level Hierarchy (Campus → Faculty → Building Controller)

// Icon mapping for different node types
const iconMap = {
    'Campus': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor"><path d="M36.4460173,54.2149139 L55.6102242,54.2149139 C58.2031553,54.2149139 59.796776,52.4395863 59.796776,49.6324708 L59.796776,17.4048621 C59.796776,14.5977414 58.2031553,12.8224138 55.6102242,12.8224138 L38.2725518,12.8224138 L38.2725518,16.884569 L54.2772932,16.884569 C55.2724656,16.884569 55.7343622,17.3466207 55.7343622,18.3363104 L55.7343622,48.701007 C55.7343622,49.6906708 55.2724656,50.1582156 54.2772932,50.1582156 L36.4460173,50.1582156 L36.4460173,54.2149139 Z M46.1436725,26.7032587 L50.2174656,26.7032587 C50.7062587,26.7032587 51.0543622,26.3438276 51.0543622,25.8555 L51.0543622,21.8994311 C51.0543622,21.3843104 50.7062587,21.0516724 50.2174656,21.0516724 L46.1436725,21.0516724 C45.6017587,21.0516724 45.3012932,21.3843104 45.3012932,21.8994311 L45.3012932,25.8555 C45.3012932,26.3438276 45.6017587,26.7032587 46.1436725,26.7032587 Z M46.1436725,36.3444311 L50.2174656,36.3444311 C50.7062587,36.3444311 51.0543622,36.0117932 51.0543622,35.4966725 L51.0543622,31.5406035 C51.0543622,31.0255345 50.7062587,30.6928449 50.2174656,30.6928449 L46.1436725,30.6928449 C45.6017587,30.6928449 45.3012932,31.0255345 45.3012932,31.5406035 L45.3012932,35.4966725 C45.3012932,36.0117932 45.6017587,36.3444311 46.1436725,36.3444311 Z M46.1436725,45.9856532 L50.2174656,45.9856532 C50.7062587,45.9856532 51.0543622,45.6529909 51.0543622,45.1378837 L51.0543622,41.1818225 C51.0543622,40.6667173 50.7062587,40.334069 50.2174656,40.334069 L46.1436725,40.334069 C45.6017587,40.334069 45.3012932,40.6667173 45.3012932,41.1818225 L45.3012932,45.1378837 C45.3012932,45.6529909 45.6017587,45.9856532 46.1436725,45.9856532 Z M0.413793104,49.6324708 C0.413793104,52.4395863 2.034,54.2149139 4.5947069,54.2149139 L36.4460173,54.2149139 C39.0067242,54.2149139 40.6268794,52.4395863 40.6268794,49.6324708 L40.6268794,4.96934484 C40.6268794,2.18901725 39.0067242,0.386896552 36.4460173,0.386896552 L4.5947069,0.386896552 C2.034,0.386896552 0.413793104,2.18901725 0.413793104,4.96934484 L0.413793104,49.6324708 Z M4.47594828,48.701007 L4.47594828,5.90079311 C4.47594828,4.91110346 4.93805173,4.44905173 5.92768967,4.44905173 L35.0862414,4.44905173 C36.0759311,4.44905173 36.5379828,4.91110346 36.5379828,5.90079311 L36.5379828,48.701007 C36.5379828,49.6906708 36.0759311,50.1582156 35.0862414,50.1582156 L5.92768967,50.1582156 C4.93805173,50.1582156 4.47594828,49.6906708 4.47594828,48.701007 Z M11.7181035,52.0767415 L15.0306724,52.0767415 L15.0306724,43.6365001 C15.0306724,43.0876139 15.3212586,42.8292828 15.8433621,42.8292828 L25.2027931,42.8292828 C25.7249483,42.8292828 26.0100518,43.0876139 26.0100518,43.6365001 L26.0100518,52.0767415 L29.3013104,52.0767415 L29.3013104,42.7050363 C29.3013104,40.5310397 28.3617932,39.5166725 26.2681035,39.5166725 L14.7512586,39.5166725 C12.6843621,39.5166725 11.7181035,40.5310397 11.7181035,42.7050363 L11.7181035,52.0767415 Z M12.1365,15.5079311 L17.0435173,15.5079311 C17.6766207,15.5079311 18.0682759,15.0840517 18.0682759,14.4509483 L18.0682759,9.68870691 C18.0682759,9.08239657 17.6766207,8.66394829 17.0435173,8.66394829 L12.1365,8.66394829 C11.5301897,8.66394829 11.1385345,9.08239657 11.1385345,9.68870691 L11.1385345,14.4509483 C11.1385345,15.0840517 11.5301897,15.5079311 12.1365,15.5079311 Z M23.9704138,15.5079311 L28.8774311,15.5079311 C29.4837414,15.5079311 29.9021897,15.0840517 29.9021897,14.4509483 L29.9021897,9.68870691 C29.9021897,9.08239657 29.4837414,8.66394829 28.8774311,8.66394829 L23.9704138,8.66394829 C23.3373104,8.66394829 22.9456552,9.08239657 22.9456552,9.68870691 L22.9456552,14.4509483 C22.9456552,15.0840517 23.3373104,15.5079311 23.9704138,15.5079311 Z M12.1365,25.4810173 L17.0435173,25.4810173 C17.6766207,25.4810173 18.0682759,25.0838794 18.0682759,24.4507759 L18.0682759,19.6885345 C18.0682759,19.0609138 17.6766207,18.6637759 17.0435173,18.6637759 L12.1365,18.6637759 C11.5301897,18.6637759 11.1385345,19.0609138 11.1385345,19.6885345 L11.1385345,24.4507759 C11.1385345,25.0838794 11.5301897,25.4810173 12.1365,25.4810173 Z M23.9704138,25.4810173 L28.8774311,25.4810173 C29.4837414,25.4810173 29.9021897,25.0838794 29.9021897,24.4507759 L29.9021897,19.6885345 C29.9021897,19.0609138 29.4837414,18.6637759 28.8774311,18.6637759 L23.9704138,18.6637759 C23.3373104,18.6637759 22.9456552,19.0609138 22.9456552,19.6885345 L22.9456552,24.4507759 C22.9456552,25.0838794 23.3373104,25.4810173 23.9704138,25.4810173 Z M12.1365,35.4808449 L17.0435173,35.4808449 C17.6766207,35.4808449 18.0682759,35.0569656 18.0682759,34.4506035 L18.0682759,29.6883621 C18.0682759,29.0607414 17.6766207,28.6368621 17.0435173,28.6368621 L12.1365,28.6368621 C11.5301897,28.6368621 11.1385345,29.0607414 11.1385345,29.6883621 L11.1385345,34.4506035 C11.1385345,35.0569656 11.5301897,35.4808449 12.1365,35.4808449 Z M23.9704138,35.4808449 L28.8774311,35.4808449 C29.4837414,35.4808449 29.9021897,35.0569656 29.9021897,34.4506035 L29.9021897,29.6883621 C29.9021897,29.0607414 29.4837414,28.6368621 28.8774311,28.6368621 L23.9704138,28.6368621 C23.3373104,28.6368621 22.9456552,29.0607414 22.9456552,29.6883621 L22.9456552,34.4506035 C22.9456552,35.0569656 23.3373104,35.4808449 23.9704138,35.4808449 Z" transform="translate(2 4.845)"/></svg>',
    'Faculty': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor"><path d="M3.9388889,46.8220056 L25.2701112,58.9139168 C26.8148889,59.7898612 28.2329445,59.7957501 29.7607223,58.9139168 L51.0917223,46.8220056 C53.5817223,45.3869279 54.9178334,43.9917667 54.9178334,40.0812501 L54.9178334,18.6118056 C54.9178334,15.8195278 53.8578334,14.0863056 51.5778334,12.7333056 L32.4028334,1.81380556 C29.1142223,-0.0349722223 25.9453889,-0.0349722223 22.6567778,1.81380556 L3.48194445,12.7333056 C1.17311111,14.0863056 0.141666667,15.8195278 0.141666667,18.6118056 L0.141666667,40.0812501 C0.141666667,43.9917667 1.47183334,45.3869279 3.9388889,46.8220056 Z M6.36383334,43.2656945 C4.79922223,42.3423056 4.2693889,41.471639 4.2693889,39.9427501 L4.2693889,19.48725 L25.3826112,31.5478612 L25.3826112,54.0743723 L6.36383334,43.2656945 Z M48.6957779,43.2656945 L29.6711112,54.0743723 L29.6711112,31.5478612 L50.7900556,19.48725 L50.7900556,39.9427501 C50.7900556,41.471639 50.2317223,42.3423056 48.6957779,43.2656945 Z M27.5125,27.7604167 L6.58772223,15.9233611 L14.9870556,11.1065278 L35.9065556,23.0069167 L27.5125,27.7604167 Z M40.2813334,20.5261389 L19.2468334,8.67741668 L24.4486112,5.73275001 C26.562,4.5176389 28.4976112,4.48886112 30.5822223,5.73275001 L48.4660556,15.9233611 L40.2813334,20.5261389 Z" transform="translate(4.5 2)"/></svg>',
    'Building Controller': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor"><path d="M0.237247707,30.4172478 C0.237247707,36.7733946 5.16627524,41.4459634 11.858422,41.4459634 L45.5867891,41.4459634 C52.2787707,41.4459634 57.2081285,36.7733946 57.2081285,30.4172478 C57.2081285,28.6064588 56.7050093,26.9270643 56.0708808,25.4191377 L48.0033028,6.07194496 C46.4267891,2.20612844 43.1550826,0.144770642 38.6788624,0.144770642 L18.7663487,0.144770642 C14.3186422,0.144770642 10.9899633,2.20612844 9.41339451,6.07194496 L1.36849542,25.4191377 C0.716862387,26.9962019 0.237247707,28.635523 0.237247707,30.4172478 Z M8.56849543,19.9051376 L13.5939633,7.23577983 C14.4519633,5.04666056 16.3202753,3.92069725 18.9820734,3.92069725 L38.4805872,3.92069725 C41.1650643,3.92069725 43.0106973,5.04666056 43.8628625,7.23577983 L48.8884955,19.9051376 C47.8641469,19.5721652 46.7539817,19.3885321 45.5926239,19.3885321 L11.8642569,19.3885321 C10.6970642,19.3885321 9.59267892,19.5721652 8.56849543,19.9051376 Z M4.50908258,30.4172478 C4.50908258,26.4679266 7.54458717,23.6830459 11.858422,23.6830459 L45.5867891,23.6830459 C49.9062937,23.6830459 52.9420735,26.4679266 52.9420735,30.4172478 C52.9420735,34.6287524 50.1914313,37.1514496 45.5867891,37.1514496 L11.858422,37.1514496 C7.53880735,37.1514496 4.50908258,34.3723487 4.50908258,30.4172478 Z M42.3530092,30.4172478 C42.3530092,32.1710643 43.7981285,33.6161835 45.5693395,33.5993395 C47.3115414,33.5766606 48.7398716,32.1710643 48.7398716,30.4172478 C48.7398716,28.7320184 47.2830826,27.2409909 45.5693395,27.2409909 C43.8440368,27.2409909 42.3530092,28.7320184 42.3530092,30.4172478 Z M26.0968624,53.3141065 L30.4140551,53.3141065 L30.4140551,38.726312 L26.0968624,38.726312 L26.0968624,53.3141065 Z M5.920789,55.4460001 L50.5899634,55.4460001 C51.7877616,55.4460001 52.7516148,54.4879322 52.7516148,53.2845139 C52.7516148,52.1153946 51.7877616,51.1288184 50.5899634,51.1288184 L5.920789,51.1288184 C4.72315597,51.1288184 3.75924771,52.1153946 3.75924771,53.2845139 C3.75924771,54.4879322 4.72315597,55.4460001 5.920789,55.4460001 Z M28.2583487,59.5673395 C31.6736147,59.5673395 34.5063854,56.7630827 34.5063854,53.3193634 C34.5063854,49.8983115 31.6736147,47.0940386 28.2583487,47.0940386 C24.8373028,47.0940386 22.0045321,49.8983115 22.0045321,53.3193634 C22.0045321,56.7630827 24.8373028,59.5673395 28.2583487,59.5673395 Z" transform="translate(3.376 2)"/></svg>',
    'Timetable Relay': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor"><path d="M46.5921208,12.7325173 C48.3419484,12.7002931 49.7809139,11.2615345 49.7809139,9.51139657 C49.7809139,7.7558276 48.3419484,6.25805173 46.5921208,6.25805173 C44.8687242,6.25805173 43.3655173,7.7558276 43.3655173,9.51139657 C43.3655173,11.2615345 44.8687242,12.7647414 46.5921208,12.7325173 Z M46.5921208,26.7188276 C48.3419484,26.6866035 49.7809139,25.2478449 49.7809139,23.4977587 C49.7809139,21.742138 48.3419484,20.2444138 46.5921208,20.2444138 C44.8687242,20.2444138 43.3655173,21.742138 43.3655173,23.4977587 C43.3655173,25.2478449 44.8687242,26.7510518 46.5921208,26.7188276 Z M46.5921208,40.7051639 C48.3419484,40.6729397 49.7809139,39.2341759 49.7809139,37.4840639 C49.7809139,35.7285001 48.3419484,34.2307242 46.5921208,34.2307242 C44.8687242,34.2307242 43.3655173,35.7285001 43.3655173,37.4840639 C43.3655173,39.2341759 44.8687242,40.7373932 46.5921208,40.7051639 Z M57.3538449,18.4335 L57.3538449,14.6122759 L2.26732759,14.6122759 L2.26732759,18.4335 L57.3538449,18.4335 Z M57.3538449,32.5011725 L57.3538449,28.6799483 L2.26732759,28.6799483 L2.26732759,32.5011725 L57.3538449,32.5011725 Z M7.92827588,46.7988518 L51.6114311,46.7988518 C56.9038449,46.7988518 59.5345346,44.1573104 59.5345346,38.9560863 L59.5345346,8.1355345 C59.5345346,2.93431035 56.9038449,0.292758621 51.6114311,0.292758621 L7.92827588,0.292758621 C2.66260345,0.292758621 0.0051724138,2.92339656 0.0051724138,8.1355345 L0.0051724138,38.9560863 C0.0051724138,44.1682242 2.66260345,46.7988518 7.92827588,46.7988518 Z M7.99272415,42.7099449 C5.47050001,42.7099449 4.06732759,41.3603339 4.06732759,38.7577863 L4.06732759,8.33384484 C4.06732759,5.70455173 5.47050001,4.3817069 7.99272415,4.3817069 L51.5467759,4.3817069 C54.0471208,4.3817069 55.4721208,5.70455173 55.4721208,8.33384484 L55.4721208,38.7577863 C55.4721208,41.3603339 54.0471208,42.7099449 51.5467759,42.7099449 L7.99272415,42.7099449 Z" transform="translate(2 8.466)"/></svg>',
    'Campus Hub': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 64 64" fill="currentColor"><path d="M0.285,31.7938449 C0.285,38.202807 5.24534484,43.1953346 12.2699483,43.1953346 L47.9085001,43.1953346 C54.9331553,43.1953346 59.8935001,38.202807 59.8935001,31.7938449 C59.8935001,29.8935518 59.3240173,28.1969483 58.6852242,26.6025 L50.1616035,6.17818967 C48.5079828,2.14256897 45.0794484,0.0548275863 40.5718966,0.0548275863 L19.6331897,0.0548275863 C15.0988449,0.0548275863 11.6701035,2.14256897 10.0166379,6.17818967 L1.48779311,26.6025 C0.848741381,28.1915173 0.285,29.8935518 0.285,31.7938449 Z M4.34715518,31.7938449 C4.34715518,27.6142759 7.50144829,24.4599828 12.2699483,24.4599828 L47.9085001,24.4599828 C52.6769484,24.4599828 55.836776,27.6142759 55.836776,31.7938449 C55.836776,36.4552863 52.6769484,39.1064277 47.9085001,39.1064277 L12.2699483,39.1064277 C7.50144829,39.1064277 4.34715518,35.9521294 4.34715518,31.7938449 Z M8.42487932,21.0564311 L13.9340173,7.23956898 C14.9013621,4.83843104 16.9633449,3.6242069 19.8517759,3.6242069 L40.3587932,3.6242069 C43.2150001,3.6242069 45.3037242,4.83843104 46.2445346,7.23956898 L51.7536725,21.0509483 C50.5598794,20.6353966 49.2853966,20.3978793 47.9085001,20.3978793 L12.2699483,20.3978793 C10.887569,20.3978793 9.6128276,20.6353966 8.42487932,21.0564311 Z M44.7025863,31.7938449 C44.7025863,33.5712932 46.157638,34.9242673 47.8919484,34.9242673 C49.5616035,34.9242673 51.0171208,33.5281035 51.0171208,31.7938449 C51.0171208,30.1027759 49.5616035,28.6689311 47.8919484,28.6689311 C46.157638,28.6689311 44.7025863,30.1027759 44.7025863,31.7938449 Z" transform="translate(2 10.276)"/></svg>',
};

// ── Node Type Configuration ─────────────────────────────────
// Campus-keyed seed values used to backfill new building controllers and to drive
// internal form behavior. Node Type is now a per-line-server property
// (editable on the side panel and Create form); this map is the source
// of truth for *initial* values only — once a building controller has a serverType,
// changes to this map don't affect it.
const serverTypesData = {
    'NORT': 'panda',
    'HLSD': 'fatp',
    'MEDS': 'fatp',
    'RVRS': 'fatp',
    'SOUT': 'fatp'
};

function getServerType(site) {
    return serverTypesData[site] || 'fatp';
}

function getServerTypeLabel(site) {
    var t = getServerType(site);
    if (t === 'panda') return 'Connected Campus';
    if (t === 'lab') return 'Test Lab';
    return 'Standalone Campus';
}

// ── Helpers ─────────────────────────────────────────────────────
function _ls(id, name, ip, description, location, projects, ghds, pgm, komodo, redPanda, fsnApiCalls) {
    return { id: String(id), name: name, site: 'NORT', type: 'Building Controller', level: 'Building Controller', ip: ip, status: 'active', model: '', description: description, location: location, associatedProjects: projects, everAssociated: projects.slice(), pgmService: pgm || 'off', ghdsAssociation: ghds, komodo: komodo || false, redPanda: redPanda || false, fsnApiCalls: fsnApiCalls !== undefined ? fsnApiCalls : true, serverType: '', children: [] };
}

function _buildProjectTree(serverList, site) {
    site = site || 'NORT';
    var tree = {};
    var allProjects = {};
    serverList.forEach(function(s) { s.associatedProjects.forEach(function(p) { allProjects[p] = true; }); });
    Object.keys(allProjects).sort().forEach(function(proj) {
        var servers = serverList.filter(function(s) { return s.associatedProjects.indexOf(proj) !== -1; });
        if (servers.length === 0) return;
        var pk = proj.toLowerCase().replace(/\s+/g, '-');
        tree[proj] = {
            id: 'site-' + site.toLowerCase() + '-' + pk, name: site, site: site, type: 'Campus', level: 'Campus',
            children: [{ id: 'project-' + pk, name: proj, site: site, project: proj, type: 'Faculty', level: 'Faculty',
                children: servers.map(function(s) { return Object.assign({}, s, { project: proj }); })
            }]
        };
    });
    return tree;
}

// ── NORT Active Building Controllers (from real data) ──────────────────
const _APPL_SERVERS = [
    _ls(1571, 'nort-bc1-1.atrium.test', '192.168.10.50', 'Science Block controller 1-1', 'North Campus, Science Block (TBA)', ['TEMPLATE','TEMPLATE PILOT','BUS','ENG'], 'nort-hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1258, 'nort-bc1-2.atrium.test', '10.80.248.96', 'Science Block controller 1-2', 'North Campus, Science Block 4F', ['MED','LAW','SCI','TEMPLATE','BUS','ART','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1259, 'nort-bc1-3.atrium.test', '10.80.248.97', 'Science Block controller 1-3', 'North Campus, Science Block 4F', ['MED','SCI','TEMPLATE','BUS','ART','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1618, 'nort-bc1-4.atrium.test', '10.80.248.98', 'Lecture Theatre Annex controller 1-4', 'North Campus, Science Block 4F', ['LAW','GENERAL','TEMPLATE','ART','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1261, 'nort-bc1-5.atrium.test', '10.80.248.99', 'Science Block controller 1-5', 'North Campus, Science Block 4F', ['MED','SCI','TEMPLATE','BUS','ART','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(268, 'arts-bc01-2.atrium.test', '10.218.166.50', 'Arts Block controller 1-2', 'North Campus, Arts Block 1F/1305', ['CHEM','MATH','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(281, 'arts-bc02-1.atrium.test', '10.222.83.37', 'Arts Block controller 2-1', 'North Campus, Arts Block 2F/1051', ['MED','LAW','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(106, 'bio-bc05-1.atrium.test', '10.195.96.14', 'Biosciences controller 5-1', 'North Campus, Biosciences Building', ['EDU','PSY','MATH','PHYS','MED','LAW','NURS','ECON','HIST','GENERAL','TEMPLATE','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(420, 'engr-bc01-4.atrium.test', '10.49.185.68', 'Engineering AV Lab', 'North Campus, Engineering 1F/A4-119', ['EDU','MED','ARCH','LAW','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(648, 'phys-bc03-1.atrium.test', '10.198.1.164', 'Physics Building controller 3-1', 'North Campus, Physics 1F', ['EDU','MED','ARCH','LAW','GENERAL','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, false),
    _ls(125, 'sci-bc03-5.atrium.test', '10.207.135.54', 'Science Annex controller 3A-5 (Linux)', 'North Campus, Science Annex', ['MED','LAW','GENERAL','ENG'], 'hub.atrium.test (Standalone Campus)', 'off', true, false, false),
    _ls(377, 'tech-bc11-1.atrium.test', '10.49.67.11', 'Technology Centre controller 11-1', 'North Campus, Technology Centre 1F/1340', ['MED','ARCH','LAW','NURS','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(427, 'wells-bc01-1.atrium.test', '10.11.134.11', 'Wells Hall controller 1-1', 'North Campus, Wells Hall 5F/5405', ['EDU','MED','ARCH','LAW','NURS','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(258, 'vista-bc02-1.atrium.test', '10.209.134.50', 'Vista Hall controller 2-1', 'North Campus, Vista Hall 1F/Rm168', ['MED','LAW','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, false),
    _ls(421, 'bell-bc05-1.atrium.test', '10.215.52.17', 'Bell Tower controller 5-1', 'North Campus, Bell Tower 1F/1531', ['CHEM','LAW','GENERAL','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(882, 'pharm-bc01-1.atrium.test', '10.55.216.121', 'Pharmacy controller 1-1', 'North Campus, Pharmacy 1F', ['GENERAL','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, false, false),
    _ls(29, 'engr-bc-studio.atrium.test', '10.207.130.62', 'Studio controller (engineering staff only)', 'North Campus, Main Hall 2F', ['MED','TEMPLATE','ART','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1522, 'atrium-test.atrium.test', '10.250.0.1', 'Test controller', 'North Campus, Annex test rig', ['ENG'], 'hub-lab01.campus.test (Connected Campus/Test Lab)', 'on', true, false, true),
];

// ── NORT Disabled Nodes ──────────────────────────────────────
const _APPL_DISABLED = [
    _ls(1580, 'nort-bc2-2.atrium.test', '192.168.20.50', 'Science Block controller 2-2 (decommissioning)', 'North Campus, Science Block (TBA)', ['TEMPLATE','BUS','ENG'], 'nort-hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(1583, 'nort-bc2-3.atrium.test', '192.168.30.50', 'Science Block controller 2-3 (QA)', 'North Campus, Science Block (TBA)', ['TEMPLATE'], 'nort-hub.atrium.test (Standalone Campus)', 'on', true, false),
    _ls(134, 'arts-bc01-1.atrium.test', '10.218.173.145', 'Arts Block controller 1-1', 'North Campus, Arts Block 1F/2177', ['MED','LAW','TEMPLATE','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(269, 'arts-bc01-2-old.atrium.test', '10.213.21.29', 'Arts Block controller 1-2 (old)', 'North Campus, Main Hall 2F/2177', ['MED','LAW','GENERAL','BUS','ENG'], 'hub.atrium.test (Standalone Campus)', 'on', true, true),
    _ls(124, 'main-bc02-1.atrium.test', '10.213.13.254', 'Main Hall controller 2-1', 'North Campus, Main Hall 1F/1352', ['LAW','GENERAL','BUS'], 'hub.atrium.test (Standalone Campus)', 'off', true, false),
    _ls(96, 'mural-bc05-1.atrium.test', '10.218.84.12', 'Mural Hall controller 5-1', 'North Campus, Mural Hall', ['GENERAL'], 'hub.atrium.test (Standalone Campus)', 'on', false, false, false),
    _ls(1310, 'engr-bc01-3.atrium.test', '10.190.176.39', 'Engineering controller (spare)', 'North Campus, Engineering/118', [], 'hub.atrium.test (Standalone Campus)', 'on', true, false, false),
    _ls(1346, 'medt-bc02-1.atrium.test', '10.64.90.201', 'Medical Tower controller 2-1', 'North Campus, Medical Tower/2151', [], 'hub.atrium.test (Standalone Campus)', 'on', true, false, false),
    _ls(1520, 'river-bc02-1.atrium.test', '10.212.197.150', 'Riverside Hall controller 2-1', 'North Campus, Riverside Hall/100', [], 'hub.atrium.test (Standalone Campus)', 'off', false, false, false),
];
// Faculty-less servers are truly disabled: mark them inactive and force Asset Registry
// API Calls off (no active config, matches the "Disabled" Asset Registry filter). Every
// archived building controller is forced off separately by _forceArchivedFSNOff below —
// an archived server never keeps Asset Registry on.
_APPL_DISABLED.forEach(function(s) {
    if (s.associatedProjects.length === 0) {
        s.status = 'inactive';
        s.fsnApiCalls = false;
    }
});

// ── Build building controller trees ────────────────────────────────────
const lineServersDataSets = {
    'NORT': _buildProjectTree(_APPL_SERVERS),
    'HLSD': {
        'ENG': { id: 'site-hlsd', name: 'HLSD', site: 'HLSD', type: 'Campus', level: 'Campus', children: [{ id: 'project-hlsd-eng', name: 'ENG', site: 'HLSD', project: 'ENG', type: 'Faculty', level: 'Faculty', children: [
            { id: '31', name: 'hlsd-bc101.atrium.test', site: 'HLSD', project: 'ENG', associatedProjects: ['ENG','LIB'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.101', status: 'active', model: 'Dell R740', description: 'Shared building controller for ENG and LIB', location: 'Hillside Campus, Building A, Rack 1', pgmService: 'on', ghdsAssociation: 'hlsd-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '32', name: 'hlsd-bc102.atrium.test', site: 'HLSD', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.102', status: 'active', model: 'HP DL380', description: 'Dedicated ENG building controller', location: 'Hillside Campus, Building A, Rack 2', pgmService: 'on', ghdsAssociation: 'hlsd-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: false, children: [] },
            { id: '33', name: 'hlsd-bc103.atrium.test', site: 'HLSD', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.103', status: 'active', model: '', description: 'HLSD node using NORT master Campus Hub', location: 'Hillside Campus, Building B, Rack 3', pgmService: 'on', ghdsAssociation: 'hub.atrium.test (Standalone Campus)', komodo: true, redPanda: true, fsnApiCalls: true, children: [] },
            { id: '34', name: 'hlsd-bc104.campus.test', site: 'HLSD', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.104', status: 'active', model: '', description: 'Legacy HLSD node on the old campus.test domain', location: 'Hillside Campus, Building B, Rack 4', pgmService: 'on', ghdsAssociation: 'hlsd-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: true, children: [] }
        ]}]},
        'LIB': { id: 'site-hlsd-lib', name: 'HLSD', site: 'HLSD', type: 'Campus', level: 'Campus', children: [{ id: 'project-lib', name: 'LIB', site: 'HLSD', project: 'LIB', type: 'Faculty', level: 'Faculty', children: [
            { id: '31', name: 'hlsd-bc101.atrium.test', site: 'HLSD', project: 'LIB', associatedProjects: ['ENG','LIB'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.101', status: 'active', model: 'Dell R740', description: 'Shared building controller for ENG and LIB', location: 'Hillside Campus, Building A, Rack 1', pgmService: 'on', ghdsAssociation: 'hlsd-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '30', name: 'hlsd-bc201.atrium.test', site: 'HLSD', project: 'LIB', associatedProjects: ['LIB'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.2.101', status: 'active', model: 'Dell R740', description: 'Dedicated LIB building controller', location: 'Hillside Campus, Building B, Rack 1', pgmService: 'on', ghdsAssociation: 'hub.atrium.test (Standalone Campus)', komodo: true, redPanda: true, fsnApiCalls: true, children: [] }
        ]}]}
    },
    'RVRS': {
        'ENG': { id: 'site-rvrs', name: 'RVRS', site: 'RVRS', type: 'Campus', level: 'Campus', children: [{ id: 'project-rvrs-eng', name: 'ENG', site: 'RVRS', project: 'ENG', type: 'Faculty', level: 'Faculty', children: [
            { id: '70', name: 'rvrs-bc1-3.atrium.test', site: 'RVRS', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.53', status: 'active', model: '', description: 'Riverside building controller 1-3', location: 'Riverside Campus, Block B 3F', pgmService: 'on', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '71', name: 'rvrs-bc1-7.atrium.test', site: 'RVRS', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.57', status: 'active', model: '', description: 'Riverside building controller 1-7', location: 'Riverside Campus, Block B 3F', pgmService: 'on', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '72', name: 'rvrs-bc2-3.atrium.test', site: 'RVRS', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.63', status: 'active', model: '', description: 'Riverside building controller 2-3', location: 'Riverside Campus, Block B 3F', pgmService: 'on', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: true, proxyURL: 'https://rvrs-proxy.atrium.test/gh2-3/campus/', children: [] }
        ]}]}
    },
    'MEDS': {
        'SCI': { id: 'site-meds', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-sci', name: 'SCI', site: 'MEDS', project: 'SCI', type: 'Faculty', level: 'Faculty', children: [
            { id: '26', name: 'meds-bc101.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI','MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.101', status: 'active', model: '', description: 'Medical Sciences building controller 1', location: 'Medical Sciences Campus, Hall A', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '27', name: 'meds-bc102.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.102', status: 'active', model: '', description: 'Medical Sciences building controller 2', location: 'Medical Sciences Campus, Hall A', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '40', name: 'meds-bc103.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI','MED','LAW'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.103', status: 'active', model: '', description: 'Medical Sciences building controller 3', location: 'Medical Sciences Campus, Hall B', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: true, fsnApiCalls: true, children: [] },
            { id: '41', name: 'meds-bc201.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI','GENERAL'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.2.101', status: 'active', model: '', description: 'Medical Sciences building controller 4', location: 'Medical Sciences Campus, Hall C', pgmService: 'off', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: false, children: [] },
            { id: '43', name: 'meds-bc401.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.4.101', status: 'active', model: '', description: 'Medical Sciences node using NORT master Campus Hub', location: 'Medical Sciences Campus, Hall E', pgmService: 'on', ghdsAssociation: 'hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '44', name: 'meds-bc501.local', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.5.101', status: 'active', model: '', description: 'Legacy Medical Sciences node on a bare internal name', location: 'Medical Sciences Campus, Hall F', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: true, children: [] }
        ]}]},
        'MED': { id: 'site-meds-med', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-med', name: 'MED', site: 'MEDS', project: 'MED', type: 'Faculty', level: 'Faculty', children: [
            { id: '26', name: 'meds-bc101.atrium.test', site: 'MEDS', project: 'MED', associatedProjects: ['SCI','MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.101', status: 'active', model: '', description: 'Medical Sciences building controller 1', location: 'Medical Sciences Campus, Hall A', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] },
            { id: '40', name: 'meds-bc103.atrium.test', site: 'MEDS', project: 'MED', associatedProjects: ['SCI','MED','LAW'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.103', status: 'active', model: '', description: 'Medical Sciences building controller 3', location: 'Medical Sciences Campus, Hall B', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: true, fsnApiCalls: true, children: [] },
            { id: '42', name: 'meds-bc301.atrium.test', site: 'MEDS', project: 'MED', associatedProjects: ['MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.3.101', status: 'active', model: '', description: 'Medical Sciences MED dedicated', location: 'Medical Sciences Campus, Hall D', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: false, fsnApiCalls: true, children: [] }
        ]}]},
        'LAW': { id: 'site-meds-law', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-law', name: 'LAW', site: 'MEDS', project: 'LAW', type: 'Faculty', level: 'Faculty', children: [
            { id: '40', name: 'meds-bc103.atrium.test', site: 'MEDS', project: 'LAW', associatedProjects: ['SCI','MED','LAW'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.103', status: 'active', model: '', description: 'Medical Sciences building controller 3', location: 'Medical Sciences Campus, Hall B', pgmService: 'on', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: true, redPanda: true, fsnApiCalls: true, children: [] }
        ]}]},
        'GENERAL': { id: 'site-meds-fennec', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-fennec', name: 'GENERAL', site: 'MEDS', project: 'GENERAL', type: 'Faculty', level: 'Faculty', children: [
            { id: '41', name: 'meds-bc201.atrium.test', site: 'MEDS', project: 'GENERAL', associatedProjects: ['SCI','GENERAL'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.2.101', status: 'active', model: '', description: 'Medical Sciences building controller 4', location: 'Medical Sciences Campus, Hall C', pgmService: 'off', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', komodo: false, redPanda: false, fsnApiCalls: false, children: [] }
        ]}]}
    },
    // Fully empty site — no building controllers, Campus Hub, or Relay. Present only so it
    // surfaces in the site multi-select; renders with the empty-state row.
    'SOUT': {}
};

// ── Collect building controller names referencing a Campus Hub host ──────────
function _lsForGhds(host) {
    var names = [];
    _APPL_SERVERS.concat(_APPL_DISABLED).forEach(function(s) {
        if (s.ghdsAssociation && s.ghdsAssociation.indexOf(host) === 0 && names.indexOf(s.name) === -1) names.push(s.name);
    });
    Object.keys(lineServersDataSets).forEach(function(site) {
        if (site === 'NORT') return;
        Object.keys(lineServersDataSets[site]).forEach(function(proj) {
            var entry = lineServersDataSets[site][proj];
            if (!entry.children) return;
            entry.children.forEach(function(projNode) {
                if (!projNode.children) return;
                projNode.children.forEach(function(ls) {
                    if (ls.ghdsAssociation && ls.ghdsAssociation.indexOf(host) === 0 && names.indexOf(ls.name) === -1) names.push(ls.name);
                });
            });
        });
    });
    return names;
}

// ── Proxy URL derivation (LINE SERVERS + Relay SERVERS) ──────────
// A building controller's Proxy URL is generated from its associated Campus Hub hostname —
// never from the building controller type (Standalone Campus/Connected Campus/Test Lab). Two rules:
//   master Campus Hub (hub.atrium.test) → https://<lsHostname>/campus/
//   any other (local) Campus Hub       → https://<ghdsHostname>/<shortName>/campus/
// Relay servers follow the SAME two rules, substituting their own short name and
// service path — see deriveCDNProxyURL below.
// Campus Hub Proxy URLs are NOT derived — they stay manually entered.
const MASTER_GHDS_HOSTNAME = 'hub.atrium.test';

// ── Hostname domain rule (ALL SERVER TYPES) ──────────
// Every building controller, Campus Hub and Relay hostname must end in `hub.atrium.test`. The
// Hostname field on the Create forms and the side panels is free text: users type
// the full hostname and the forms validate that it ends in the suffix on
// blur/save. In the real app the suffix is a server setting returned as
// `meta.hostnameSuffix` on GET /manage-infrastructure; this constant stands in for it.
// A hostname equal to the suffix itself is valid.
const SERVER_HOSTNAME_SUFFIX = 'atrium.test';

// A hostname that predates the `atrium.test` rule, for any server type.
function isHostnameOutdated(name) {
    if (!name) return false;
    var n = String(name).toLowerCase();
    return n !== SERVER_HOSTNAME_SUFFIX && !n.endsWith('.' + SERVER_HOSTNAME_SUFFIX);
}

// A dotted-quad IPv4 address, each octet 0–255. Shared by the Create Node
// form and the side panels' IP Address fields.
function isValidIPv4(ip) {
    if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip || '')) return false;
    return ip.split('.').every(function(part) { return parseInt(part, 10) <= 255; });
}

// Other domains that seeded hostnames before the `atrium.test` rule. Only
// the short-name parsers below still need them: a pasted or imported hostname
// may still carry one, and stripping it keeps the Proxy URL derivable.
const HOSTNAME_DOMAIN_RE = /\.(atrium\.test|campus\.test|legacy\.test|local)$/i;

// Building controllers store the association as "<hostname> (Standalone Campus)" and the Create
// form's options as "<hostname> (NORT)" — strip the suffix to get the hostname.
function ghdsHostnameFromAssociation(assoc) {
    if (!assoc || assoc === 'Not assigned') return '';
    return String(assoc).replace(/\s*\(.*\)\s*$/, '').trim();
}

// The `bc` keyword plus the two numbers that follow it, ignoring any letters
// or dashes in between → `bc<floor>-<server>`. Returns null when the
// hostname doesn't carry the pattern (a legacy name such as `meds-bc101`, or a name
// with no `bc` at all); callers surface that as "cannot be auto-generated"
// rather than guessing a path segment.
function lineServerProxyShortName(lsHostname) {
    if (!lsHostname) return null;
    var base = String(lsHostname).replace(HOSTNAME_DOMAIN_RE, '');
    var m = base.match(/bc[a-z]*[-_]?(\d+)[-_](\d+)$/i);
    return m ? 'bc' + m[1] + '-' + m[2] : null;
}

// Returns '' when there isn't enough information yet (no hostname or no Campus Hub),
// null when the hostname can't be parsed under the local-GHDS rule, otherwise
// the derived URL. Callers distinguish the two: '' = nothing to say,
// null = tell the user to enter it manually.
function deriveLineServerProxyURL(lsHostname, ghdsHostname) {
    if (!lsHostname || !ghdsHostname) return '';
    // A parseable bc<floor>-<server> is required to auto-generate, master Campus Hub or
    // not: a hostname without it (a legacy name such as `meds-bc101`) can't be trusted
    // to build a Proxy URL, so callers surface "enter it manually".
    var shortName = lineServerProxyShortName(lsHostname);
    if (!shortName) return null;
    if (String(ghdsHostname).toLowerCase() === MASTER_GHDS_HOSTNAME) {
        // The hostname is already on the certificate domain — `hub.atrium.test`
        // is enforced by the field, so nothing to swap out.
        return 'https://' + lsHostname + '/campus/';
    }
    return 'https://' + ghdsHostname + '/' + shortName + '/campus/';
}

// True when a Line or Timetable Relay's Proxy URL is exactly what the generator produces for
// its Hostname and the given Campus Hub — i.e. it follows its sources automatically. A
// hand-typed URL, or one on a hostname the rule can't parse (legacy naming), is
// not: nothing can update it when the Campus Hub changes, so it has to be fixed by hand.
function isProxyURLAutomatic(lsNode, ghdsHostname) {
    if (!lsNode || !lsNode.proxyURL) return false;
    var derive = lsNode.level === 'Timetable Relay' ? deriveCDNProxyURL : deriveLineServerProxyURL;
    var derived = derive(String(lsNode.name || '').trim(), String(ghdsHostname || '').trim());
    return !!derived && derived === String(lsNode.proxyURL).trim();
}

// True when a Campus Hub rename leaves this Line or Timetable Relay's Proxy URL for the user to fix:
// it holds a URL, and that URL is not one the generator would produce. A server
// with no URL at all has nothing stale (its required-field error already asks).
function proxyURLNeedsManualUpdate(lsNode, ghdsHostname) {
    return !!lsNode && !!String(lsNode.proxyURL || '').trim() && !isProxyURLAutomatic(lsNode, ghdsHostname);
}

// The `rly` keyword plus the two numbers that follow it, ignoring any letters or
// dashes in between → `rly<floor>-<server>`. The Relay mirror of
// lineServerProxyShortName: `meds-rly1-1` → `rly1-1`, `rvrs-rly2-1` → `rly2-1`.
// Returns null when the hostname doesn't carry the pattern, which callers
// surface as "cannot be auto-generated" rather than guessing a path segment.
function cdnProxyShortName(cdnHostname) {
    if (!cdnHostname) return null;
    var base = String(cdnHostname).replace(HOSTNAME_DOMAIN_RE, '');
    var m = base.match(/rly[a-z]*[-_]?(\d+)[-_](\d+)$/i);
    return m ? 'rly' + m[1] + '-' + m[2] : null;
}

// The Relay Proxy URL follows the SAME two rules as a building controller's — which one
// applies depends solely on the associated Campus Hub hostname — with one
// substitution: the short name comes from the Relay hostname (`rly<floor>-<server>`)
// instead of the building controller's. The service path is `/campus/` on every
// Proxy URL Atrium generates, Relay included:
//   master Campus Hub (hub.atrium.test) → https://<cdnHostname>/campus/
//   any other (local) Campus Hub       → https://<ghdsHostname>/<shortName>/campus/
// Same three-way return contract as deriveLineServerProxyURL: '' = not enough
// information yet, null = the hostname can't be parsed, otherwise the URL.
function deriveCDNProxyURL(cdnHostname, ghdsHostname) {
    if (!cdnHostname || !ghdsHostname) return '';
    // As with building controllers, a parseable rly<floor>-<server> is required to
    // auto-generate — master Campus Hub or not — so a malformed hostname falls to
    // "enter it manually".
    var shortName = cdnProxyShortName(cdnHostname);
    if (!shortName) return null;
    if (String(ghdsHostname).toLowerCase() === MASTER_GHDS_HOSTNAME) {
        // The hostname is already on the certificate domain — `hub.atrium.test`
        // is enforced by the field, so nothing to swap out.
        return 'https://' + cdnHostname + '/campus/';
    }
    return 'https://' + ghdsHostname + '/' + shortName + '/campus/';
}

// ── Automatic / outdated Proxy URL ───────────────────
// A Proxy URL is built from the server's Hostname and its Campus Hub Association, and
// follows them automatically: when either changes, the forms re-derive it and
// write it into the field. When it CAN'T be derived (an unparseable hostname,
// no Campus Hub), the old URL is kept and is outdated until the user types a new one.
// `baseline` is { hostname, ghds, proxy } when the URL was last set — on load,
// by the automatic update, or by the user typing it — and `current` is the same
// three now. An edit that leaves the derived URL unchanged, or that is undone,
// doesn't count. Shared by the side panels and the Create / Unarchive / Move drawer.
function isProxyURLOutdated(baseline, current, kind) {
    if (!baseline || !current) return false;
    var norm = function(v) { return String(v || '').trim().toLowerCase(); };
    if (norm(baseline.hostname) === norm(current.hostname) && norm(baseline.ghds) === norm(current.ghds)) return false;
    var proxy = String(current.proxy || '').trim();
    // Re-entered since the source fields changed.
    if (proxy !== String(baseline.proxy || '').trim()) return false;
    // An empty field is the required rule's business, not this one's.
    if (!proxy) return false;
    var derived = (kind === 'cdn' ? deriveCDNProxyURL : deriveLineServerProxyURL)(
        String(current.hostname || '').trim(), String(current.ghds || '').trim());
    return derived !== proxy;
}

// The warning under a Proxy URL the automatic update just replaced, naming the
// field(s) that changed it, so the edit never goes unnoticed.
function proxyURLChangedMessage(hostnameChanged, ghdsChanged) {
    var what = hostnameChanged && ghdsChanged ? 'the Hostname and Campus Hub'
        : hostnameChanged ? 'the Hostname'
        : ghdsChanged ? 'the Campus Hub'
        : '';
    return what ? 'Proxy URL updated because ' + what + ' changed.' : 'Proxy URL updated automatically.';
}

// The outdated message, naming what stops the automatic update.
function proxyURLOutdatedMessage(ghdsHostname) {
    return String(ghdsHostname || '').trim()
        ? 'Proxy URL is outdated and can\'t be generated from this Hostname. Enter it manually.'
        : 'Proxy URL is outdated. Select a Campus Hub to update it, or enter it manually.';
}

// Shown on a Line or Timetable Relay whose Campus Hub was renamed and whose Proxy URL isn't generated.
function proxyURLOutdatedAfterGHDSRenameMessage() {
    return 'Proxy URL is outdated because the Campus Hub hostname changed. Enter it manually.';
}

// ── Campus Hubs data ──────────────────────────────────────────
const ghdsServersData = {
    'NORT': {
        '__standalone__': {
            id: 'site-nort-ghds', name: 'NORT', site: 'NORT', type: 'Campus', level: 'Campus',
            children: [{ id: 'ghds-standalone', name: 'Campus Hubs', site: 'NORT', project: '__standalone__', type: 'Faculty', level: 'Faculty', children: [
                { id: '466', name: 'hub-lab01.campus.test', site: 'NORT', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.208.232.130', status: 'active', model: '', description: 'Timetable backlog tracking only', location: 'North Campus, Data Hall 2 Rack 12', associatedLineServers: _lsForGhds('hub-lab01.campus.test'), associatedProjects: [], proxyURL: 'https://hub-lab01.campus.test/api', bridgeService: false, children: [] },
                { id: '1', name: 'hub.atrium.test', site: 'NORT', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.208.235.56', status: 'active', model: '', description: 'NORT hub (UAT and QA)', location: 'North Campus, Data Hall 2 Rack 5', associatedLineServers: _lsForGhds('hub.atrium.test'), associatedProjects: [], proxyURL: 'https://hub.atrium.test/api', bridgeService: true, children: [] },
                { id: '1568', name: 'nort-hub.atrium.test', site: 'NORT', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.80.248.103', status: 'active', model: '', description: 'North Campus hub', location: 'North Campus, Data Hall 2 Rack 8', associatedLineServers: _lsForGhds('nort-hub.atrium.test'), associatedProjects: [], proxyURL: 'https://nort-hub.atrium.test/api', bridgeService: true, children: [] },
                { id: '3005', name: 'nort-hub-lab.atrium.test', site: 'NORT', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.208.240.11', status: 'active', model: 'Dell R750', description: 'Lab hub — newly racked, no building controllers registered yet', location: 'North Campus, Data Hall 2 Rack 14', associatedLineServers: [], associatedProjects: ['TEMPLATE','BUS','ART'], proxyURL: 'https://nort-hub-lab.atrium.test/api', bridgeService: true, children: [] },
                { id: '3006', name: 'hub-lab02.campus.test', site: 'NORT', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.208.232.131', status: 'inactive', archived: true, model: '', description: 'Timetable backlog spare — decommissioned', location: 'North Campus, Data Hall 2 Rack 12', associatedLineServers: [], associatedProjects: [], proxyURL: 'https://hub-lab02.campus.test/api', bridgeService: false, children: [] }
            ]}]
        }
    },
    'RVRS': {
        'ENG': { id: 'site-rvrs-ghds', name: 'RVRS', site: 'RVRS', type: 'Campus', level: 'Campus', children: [{ id: 'project-rvrs-eng-ghds', name: 'ENG', site: 'RVRS', project: 'ENG', type: 'Faculty', level: 'Faculty', children: [
            { id: '3001', name: 'rvrs-hub.atrium.test', site: 'RVRS', project: 'ENG', type: 'Campus Hub', level: 'Campus Hub', ip: '10.11.1.101', status: 'active', model: 'Dell R740', description: 'RVRS local hub', location: 'Riverside Campus, Block B 3F', associatedLineServers: ['rvrs-bc1-3.atrium.test','rvrs-bc1-7.atrium.test','rvrs-bc2-3.atrium.test'], proxyURL: 'https://rvrs-hub.atrium.test/api', bridgeService: false, children: [] },
            { id: '3007', name: 'rvrs-hub2.atrium.test', site: 'RVRS', project: 'ENG', type: 'Campus Hub', level: 'Campus Hub', ip: '10.11.1.102', status: 'active', model: 'Dell R750', description: 'RVRS secondary hub — only archived building controllers', location: 'Riverside Campus, Block B 3F', associatedLineServers: [], associatedProjects: ['ENG'], proxyURL: 'https://rvrs-hub2.atrium.test/api', bridgeService: true, children: [] },
            { id: '3008', name: 'rvrs-hub-old.atrium.test', site: 'RVRS', project: 'ENG', type: 'Campus Hub', level: 'Campus Hub', ip: '10.11.1.100', status: 'inactive', archived: true, model: '', description: 'Decommissioned RVRS hub', location: 'Riverside Campus, Block B 2F', associatedLineServers: [], associatedProjects: [], proxyURL: 'https://rvrs-hub-old.atrium.test/api', bridgeService: false, children: [] }
        ]}]}
    },
    'HLSD': {
        '__standalone__': { id: 'site-hlsd-ghds', name: 'HLSD', site: 'HLSD', type: 'Campus', level: 'Campus', children: [{ id: 'ghds-hlsd-standalone', name: 'Campus Hubs', site: 'HLSD', project: '__standalone__', type: 'Faculty', level: 'Faculty', children: [
            { id: '3002', name: 'hlsd-hub.atrium.test', site: 'HLSD', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.12.1.101', status: 'active', model: '', description: 'HLSD local hub', location: 'Hillside Campus, Equipment Room 1 Rack 4', associatedLineServers: ['hlsd-bc101.atrium.test','hlsd-bc102.atrium.test'], proxyURL: 'https://hlsd-hub.atrium.test/api', bridgeService: false, children: [] },
            { id: '3009', name: 'hlsd-hub2.atrium.test', site: 'HLSD', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.12.1.102', status: 'active', model: 'HP DL380', description: 'HLSD secondary hub — no building controllers registered yet', location: 'Hillside Campus, Equipment Room 1 Rack 5', associatedLineServers: [], associatedProjects: ['LIB','ENG'], proxyURL: 'https://hlsd-hub2.atrium.test/api', bridgeService: false, children: [] },
            { id: '3010', name: 'hlsd-hub-old.atrium.test', site: 'HLSD', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.12.1.100', status: 'inactive', archived: true, model: '', description: 'Decommissioned HLSD hub', location: 'Hillside Campus, Equipment Room 1 Rack 1', associatedLineServers: [], associatedProjects: [], proxyURL: 'https://hlsd-hub-old.atrium.test/api', bridgeService: false, children: [] }
        ]}]}
    },
    'MEDS': {
        '__standalone__': { id: 'site-meds-ghds', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'ghds-meds-standalone', name: 'Campus Hubs', site: 'MEDS', project: '__standalone__', type: 'Faculty', level: 'Faculty', children: [
            { id: '3003', name: 'meds-hub.atrium.test', site: 'MEDS', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.2.10.101', status: 'active', model: '', description: 'Medical Sciences local hub', location: 'Medical Sciences Campus, Hub Building', associatedLineServers: ['meds-bc101.atrium.test','meds-bc102.atrium.test','meds-bc103.atrium.test','meds-bc201.atrium.test','meds-bc301.atrium.test'], proxyURL: 'https://meds-hub.atrium.test/api', bridgeService: true, children: [] },
            // Spare Campus Hub with no building controllers registered on it yet — hostname
            // editable on the side panel and archivable, unlike a Campus Hub locked by
            // its associations (FR-GH-05). `nort-hub-lab` (NORT),
            // `hlsd-hub2` and `meds-hub3` are the other association-free ones.
            // This one's hand-authored project grant is the narrowest: it grants
            // SCI but NOT MED, so moving a building controller here demonstrates the
            // project-removal rule instead of stripping everything.
            { id: '3004', name: 'meds-hub2.atrium.test', site: 'MEDS', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.2.10.102', status: 'active', model: '', description: 'Medical Sciences spare hub — no building controllers registered yet', location: 'Medical Sciences Campus, Hub Building', associatedLineServers: [], associatedProjects: ['SCI'], proxyURL: 'https://meds-hub2.atrium.test/api', bridgeService: false, children: [] },
            { id: '3011', name: 'meds-hub3.atrium.test', site: 'MEDS', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.2.10.103', status: 'active', model: 'Dell R750', description: 'Medical Sciences third hub — no building controllers registered yet', location: 'Medical Sciences Campus, Hub Building', associatedLineServers: [], associatedProjects: ['MED','LAW','SCI','GENERAL'], proxyURL: 'https://meds-hub3.atrium.test/api', bridgeService: true, children: [] },
            { id: '3012', name: 'meds-hub-old.atrium.test', site: 'MEDS', project: '__standalone__', type: 'Campus Hub', level: 'Campus Hub', ip: '10.2.10.100', status: 'inactive', archived: true, model: '', description: 'Decommissioned Medical Sciences hub', location: 'Medical Sciences Campus, Old Hall', associatedLineServers: [], associatedProjects: [], proxyURL: 'https://meds-hub-old.atrium.test/api', bridgeService: false, children: [] }
        ]}]}
    }
};

// ── Timetable Relays data ───────────────────────────────────────────
const cdnServersData = {
    'MEDS': {
        'SCI': {
            id: 'site-meds-cdn', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus',
            children: [
                { id: '2001', name: 'meds-rly1-1.atrium.test', site: 'MEDS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.2.20.101', status: 'active', model: '', description: 'Medical Sciences primary Relay', location: 'Medical Sciences Campus, Relay Annex', ghdsAssociation: 'meds-hub.atrium.test', associatedLineServers: ['meds-bc101.atrium.test','meds-bc102.atrium.test'], proxyURL: '', children: [
                    { id: 'cdn-ls-meds-1', name: 'meds-bc101.atrium.test', site: 'MEDS', associatedProjects: ['SCI','MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.101', status: 'active', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', children: [] },
                    { id: 'cdn-ls-meds-2', name: 'meds-bc102.atrium.test', site: 'MEDS', associatedProjects: ['SCI'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.102', status: 'active', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', children: [] },
                ]},
                { id: '2002', name: 'meds-rly2-1.atrium.test', site: 'MEDS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.2.20.102', status: 'active', model: '', description: 'Medical Sciences secondary Relay', location: 'Medical Sciences Campus, Relay Annex', ghdsAssociation: 'meds-hub.atrium.test', associatedLineServers: ['meds-bc301.atrium.test'], proxyURL: '', children: [
                    { id: 'cdn-ls-meds-4', name: 'meds-bc301.atrium.test', site: 'MEDS', associatedProjects: ['MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.3.101', status: 'active', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', children: [] }
                ]},
                // Failover Relay on the same hub as the primary. A building controller has
                // at most ONE Relay (FR-P2-24), so it serves its own building controller
                // rather than doubling up on the primary's.
                { id: '2005', name: 'meds-rly3-1.atrium.test', site: 'MEDS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.2.20.103', status: 'active', model: 'Dell R750', description: 'Medical Sciences failover Relay', location: 'Medical Sciences Campus, Relay Annex', ghdsAssociation: 'meds-hub.atrium.test', associatedLineServers: ['meds-bc103.atrium.test'], proxyURL: '', children: [
                    { id: 'cdn-ls-meds-6', name: 'meds-bc103.atrium.test', site: 'MEDS', associatedProjects: ['SCI','MED','LAW'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.1.103', status: 'active', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', children: [] }
                ]},
                // Legacy `cdn01` naming carries no `rly<floor>-<server>` pattern, so
                // deriveCDNProxyURL returns null and the field stays empty — the
                // Relay counterpart of the unparseable `meds-bc101` building controllers, and
                // the only seed Relay that takes the manual path of FR-P2-14a.
                { id: '2006', name: 'meds-rly01.atrium.test', site: 'MEDS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.2.20.100', status: 'inactive', archived: true, model: '', description: 'Decommissioned Medical Sciences Relay (legacy naming)', location: 'Medical Sciences Campus, Old Hall', ghdsAssociation: 'meds-hub.atrium.test', associatedLineServers: [], proxyURL: '', children: [] }
            ]
        }
    },
    'HLSD': {
        'ENG': { id: 'site-hlsd-cdn', name: 'HLSD', site: 'HLSD', type: 'Campus', level: 'Campus', children: [
            { id: '2003', name: 'hlsd-rly1-1.atrium.test', site: 'HLSD', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.20.1.101', status: 'active', model: '', description: 'Timetable relay for HLSD', location: 'Hillside Campus, Data Center C', ghdsAssociation: 'hlsd-hub.atrium.test', associatedLineServers: ['hlsd-bc101.atrium.test'], proxyURL: '', children: [
                { id: 'cdn-ls-hlsd-gh101', name: 'hlsd-bc101.atrium.test', site: 'HLSD', associatedProjects: ['ENG','LIB'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.101', status: 'active', ghdsAssociation: 'hlsd-hub.atrium.test (Standalone Campus)', children: [] }
            ]},
            // On the NORT master hub, which HLSD building controllers already use — the
            // only seed Relay that takes Rule 2, so its Proxy URL is built from its
            // own hostname rather than the hub's.
            // No building controllers yet, so it is also archivable.
            { id: '2007', name: 'hlsd-rly2-1.atrium.test', site: 'HLSD', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.20.1.102', status: 'active', model: 'HP DL380', description: 'HLSD Relay on the university master hub — no building controllers registered yet', location: 'Hillside Campus, Data Center C', ghdsAssociation: 'hub.atrium.test', associatedLineServers: [], proxyURL: '', children: [] },
            { id: '2008', name: 'hlsd-rly1-2.atrium.test', site: 'HLSD', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.20.1.100', status: 'inactive', archived: true, model: '', description: 'Decommissioned HLSD Relay', location: 'Hillside Campus, Data Center A', ghdsAssociation: 'hlsd-hub-old.atrium.test', associatedLineServers: [], proxyURL: '', children: [] }
        ]}
    },
    'RVRS': {
        'ENG': { id: 'site-rvrs-cdn', name: 'RVRS', site: 'RVRS', type: 'Campus', level: 'Campus', children: [
            { id: '2004', name: 'rvrs-rly2-1.atrium.test', site: 'RVRS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.60.6.56', status: 'active', model: '', description: 'CDN2-1 RVRS (DEMO)', location: 'Riverside Campus, Block B 3F', ghdsAssociation: 'rvrs-hub.atrium.test', associatedLineServers: ['rvrs-bc1-3.atrium.test','rvrs-bc2-3.atrium.test'], proxyURL: '', children: [
                { id: 'cdn-ls-rvrs-1', name: 'rvrs-bc1-3.atrium.test', site: 'RVRS', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.53', status: 'active', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', children: [] },
                { id: 'cdn-ls-rvrs-3', name: 'rvrs-bc2-3.atrium.test', site: 'RVRS', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.63', status: 'active', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', children: [] }
            ]},
            { id: '2009', name: 'rvrs-rly1-1.atrium.test', site: 'RVRS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.60.6.55', status: 'active', model: 'Dell R750', description: 'CDN1-1 RVRS failover', location: 'Riverside Campus, Block B 3F', ghdsAssociation: 'rvrs-hub.atrium.test', associatedLineServers: ['rvrs-bc1-7.atrium.test'], proxyURL: 'https://rvrs-proxy.atrium.test/cdn1-1/campus/', children: [
                { id: 'cdn-ls-rvrs-5', name: 'rvrs-bc1-7.atrium.test', site: 'RVRS', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.60.6.57', status: 'active', ghdsAssociation: 'rvrs-hub.atrium.test (Standalone Campus)', children: [] }
            ]},
            { id: '2010', name: 'rvrs-rly3-1.atrium.test', site: 'RVRS', type: 'Timetable Relay', level: 'Timetable Relay', ip: '10.60.6.50', status: 'inactive', archived: true, model: '', description: 'Decommissioned RVRS Relay', location: 'Riverside Campus, Block B 2F', ghdsAssociation: 'rvrs-hub.atrium.test', associatedLineServers: [], proxyURL: '', children: [] }
        ]}
    }
};

// ── Archived servers data ──────────────────────────────────────
const archivedServersData = {
    'NORT': _buildProjectTree(_APPL_DISABLED),
    'HLSD': {
        'ENG': { id: 'site-hlsd-archived', name: 'HLSD', site: 'HLSD', type: 'Campus', level: 'Campus', children: [{ id: 'project-hlsd-eng-archived', name: 'ENG', site: 'HLSD', project: 'ENG', type: 'Faculty', level: 'Faculty', children: [
            { id: '54', name: 'hlsd-bc001-old.atrium.test', site: 'HLSD', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.1.1.1', status: 'inactive', model: '', description: 'Archived HLSD building controller', location: 'Hillside Campus, Building D, Rack 1', pgmService: 'off', ghdsAssociation: 'hlsd-hub-old.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] }
        ]}]}
    },
    'MEDS': {
        'SCI': { id: 'site-meds-archived', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-sci-archived', name: 'SCI', site: 'MEDS', project: 'SCI', type: 'Faculty', level: 'Faculty', children: [
            { id: '60', name: 'meds-bc001-old.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.0.1', status: 'inactive', model: '', description: 'Decommissioned MEDS node', location: 'Medical Sciences Campus, Old Hall', pgmService: 'off', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] },
            { id: '61', name: 'meds-bc002-old.atrium.test', site: 'MEDS', project: 'SCI', associatedProjects: ['SCI','MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.0.2', status: 'active', model: '', description: 'Disabled MEDS multi-project', location: 'Medical Sciences Campus, Old Hall', pgmService: 'off', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] }
        ]}]},
        'MED': { id: 'site-meds-med-archived', name: 'MEDS', site: 'MEDS', type: 'Campus', level: 'Campus', children: [{ id: 'project-meds-med-archived', name: 'MED', site: 'MEDS', project: 'MED', type: 'Faculty', level: 'Faculty', children: [
            { id: '61', name: 'meds-bc002-old.atrium.test', site: 'MEDS', project: 'MED', associatedProjects: ['SCI','MED'], type: 'Building Controller', level: 'Building Controller', ip: '10.2.0.2', status: 'active', model: '', description: 'Disabled MEDS multi-project', location: 'Medical Sciences Campus, Old Hall', pgmService: 'off', ghdsAssociation: 'meds-hub.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] }
        ]}]}
    },
    // RVRS's secondary hub (rvrs-hub2) is served only by archived building controllers, so
    // it can be archived and its Associated Building Controllers list shows Archived tags.
    'RVRS': {
        'ENG': { id: 'site-rvrs-archived', name: 'RVRS', site: 'RVRS', type: 'Campus', level: 'Campus', children: [{ id: 'project-rvrs-eng-archived', name: 'ENG', site: 'RVRS', project: 'ENG', type: 'Faculty', level: 'Faculty', children: [
            { id: '73', name: 'rvrs-bc9-1-old.atrium.test', site: 'RVRS', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.11.1.91', status: 'inactive', model: '', description: 'Archived RVRS building controller', location: 'Riverside Campus, Block B 2F', pgmService: 'off', ghdsAssociation: 'rvrs-hub2.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] },
            { id: '74', name: 'rvrs-bc9-2-old.atrium.test', site: 'RVRS', project: 'ENG', associatedProjects: ['ENG'], type: 'Building Controller', level: 'Building Controller', ip: '10.11.1.92', status: 'inactive', model: '', description: 'Archived RVRS building controller', location: 'Riverside Campus, Block B 2F', pgmService: 'off', ghdsAssociation: 'rvrs-hub2.atrium.test (Standalone Campus)', fsnApiCalls: false, children: [] }
        ]}]}
    }
};

// ── Backfill everAssociated on every building controller (seed + inline literals).
//    everAssociated tracks the historical set of projects each building controller has
//    ever been associated with. It seeds equal to associatedProjects but is
//    never pruned on remove — so archive views can show the full history.
function _ensureEverAssociated(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Building Controller' && typeof node.everAssociated === 'undefined') {
            node.everAssociated = (node.associatedProjects || []).slice();
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_ensureEverAssociated(lineServersDataSets);
_ensureEverAssociated(archivedServersData);

// ── An archived building controller always has Registry Sync off. Archiving forces the
//    toggle off and it stays off (disabled) while archived, so the seed must
//    agree — otherwise the tree indicator and the side panel would contradict
//    the rule for any seed record that shipped Asset Registry on.
function _forceArchivedFSNOff(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Building Controller') node.fsnApiCalls = false;
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) { walk(dataSet[site][proj]); });
    });
}
_forceArchivedFSNOff(archivedServersData);

// ── Backfill `serverType` on every seed building controller (active + archived).
//    Node Type is now per-line-server. Existing seed servers are stamped
//    with their site's default value so the side panel and CSV export show
//    sensible values out of the box. New servers from the Create form start
//    empty and the user must pick before Save is enabled.
function _backfillServerType(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Building Controller' && !node.serverType) {
            node.serverType = serverTypesData[node.site] || 'fatp';
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_backfillServerType(lineServersDataSets);
_backfillServerType(archivedServersData);

// ── Backfill `proxyURL` (Proxy URL) on every seed building controller.
//    Seed data ships no proxy URLs, so without this pass the field would look
//    unused on every existing server. Derived from the stored Campus Hub association
//    (see deriveLineServerProxyURL); servers whose hostname can't be parsed —
//    the legacy `meds-bc101` / `hlsd-bc201` names — are deliberately left empty
//    and surface the "enter it manually" hint on the panel. The orphan bucket
//    needs no pass: it is empty at load and the Create form supplies its own
//    derived value.
function _backfillProxyURL(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Building Controller' && !node.proxyURL) {
            var derived = deriveLineServerProxyURL(node.name, ghdsHostnameFromAssociation(node.ghdsAssociation));
            if (derived) node.proxyURL = derived;
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_backfillProxyURL(lineServersDataSets);
_backfillProxyURL(archivedServersData);

// ── Backfill `proxyURL` on every seed Relay server.
//    Same import-time cleanup as the building controller pass above, against the Relay
//    rule (see deriveCDNProxyURL). The Relay records nested under a Campus Hub node are
//    read-only mirrors of the same server, so the walk covers every level.
//    A Relay whose hostname can't be parsed is left empty and surfaces the
//    "enter it manually" hint, exactly as a building controller does.
function _backfillCDNProxyURL(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Timetable Relay' && !node.proxyURL) {
            var derived = deriveCDNProxyURL(node.name, ghdsHostnameFromAssociation(node.ghdsAssociation));
            if (derived) node.proxyURL = derived;
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_backfillCDNProxyURL(cdnServersData);

// ── One Relay per building controller (FR-P2-24) ─────────────────────────
//    A Relay serves many building controllers, but a building controller belongs to at most one
//    Relay. Membership lives on the Relay record only (`associatedLineServers` plus
//    the nested `cdn-ls-*` copies), so the rule is: no hostname on two Relays'
//    lists. Every UI path enforces it on write; this pass keeps seed edits from
//    breaking it — the first Relay in data order keeps the building controller.
function _enforceSingleCDN(dataSet) {
    var owner = {};
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(key) {
            (dataSet[site][key].children || []).forEach(function(cdn) {
                if (cdn.level !== 'Timetable Relay') return;
                cdn.associatedLineServers = (cdn.associatedLineServers || []).filter(function(name) {
                    if (owner[name]) return false;
                    owner[name] = cdn.id;
                    return true;
                });
                cdn.children = (cdn.children || []).filter(function(c) {
                    return cdn.associatedLineServers.indexOf(c.name) !== -1;
                });
            });
        });
    });
}
_enforceSingleCDN(cdnServersData);

// ── Simulation: building controllers scheduled for an upcoming Timetable Release ──
//    Drives one rule: archiving such a building controller is blocked (FR-DS-07) until
//    the deploy is cancelled. In production this would be a backend
//    reverse-lookup against the Timetable Release schedule.
//    Listed by hostname, NOT set inline on the seed objects: a building controller is
//    stored once per associated project, so an inline flag would only guard the
//    one copy the user happened to open, and archiving from any other project
//    branch would slip through. The backfill stamps every copy.
const _cbDeployScheduledHosts = [
    'rvrs-bc1-3.atrium.test'
];

function _backfillCBDeploy(dataSet) {
    function walk(node) {
        if (!node) return;
        if (node.level === 'Building Controller' && _cbDeployScheduledHosts.indexOf(node.name) !== -1) {
            node.cbDeployScheduled = true;
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_backfillCBDeploy(lineServersDataSets);
_backfillCBDeploy(archivedServersData);

// Devices attached to a Building Controller (FR-P2-29). Mock data for the archive popover's
// units check: a count > 0 means units are registered (the popover says so without
// the number), `failed` simulates the lookup
// erroring. Neither blocks archiving.
const _unitsByHost = {
    'nort-bc1-2.atrium.test': { count: 12 },
    'bio-bc05-1.atrium.test': { count: 1 },
    'phys-bc03-1.atrium.test': { failed: true }
};

function _backfillUnits(dataSet) {
    function walk(node) {
        if (!node) return;
        var u = node.level === 'Building Controller' ? _unitsByHost[node.name] : null;
        if (u) {
            if (u.failed) node.unitsCheckFailed = true;
            else node.unitsCount = u.count;
        }
        if (node.children) node.children.forEach(walk);
    }
    Object.keys(dataSet).forEach(function(site) {
        Object.keys(dataSet[site]).forEach(function(proj) {
            walk(dataSet[site][proj]);
        });
    });
}
_backfillUnits(lineServersDataSets);

/**
 * The error toast for an Asset Registry refusal, or null (FR-P2-30). Every Asset Registry host
 * removal — disabling Registry Sync, the automatic disable on archive, a
 * hostname change — can be refused by Asset Registry; a refusal leaves everything
 * unchanged. Only an Asset Registry-enabled server has a host to remove.
 *
 * `action` is 'archive' | 'disable' | 'hostname'. The message is two lines:
 * what could not be done (bold), then the server's own text. The prototype has no
 * server, so the second line is the literal placeholder.
 */
const FSN_REFUSAL_ACTIONS = {
    archive: 'archive',
    disable: 'disable Registry Sync',
    hostname: 'change the hostname'
};

function fsnHostRemovalError(node, action) {
    if (!node || node.level !== 'Building Controller' || node.fsnApiCalls === false) return null;
    if (!node.fsnRefuses) return null;
    return '<strong>Unable to ' + (FSN_REFUSAL_ACTIONS[action] || FSN_REFUSAL_ACTIONS.disable) +
        ', Registry Sync change was not successful.</strong><br>' + fsnServerMessage(node, true);
}

/**
 * The reason Asset Registry gave for refusing `node`. The prototype shows the literal
 * placeholder for every host; the real message comes from the server.
 */
function fsnServerMessage(node, asHTML) {
    var msg = '<server error message>';
    return asHTML ? msg.replace(/</g, '&lt;').replace(/>/g, '&gt;') : msg;
}

/** Bulk/cascade shape of a refusal: { name, site, error }, or null when Asset Registry accepts. */
function fsnRefusalDetail(node, action) {
    if (!fsnHostRemovalError(node, action)) return null;
    return { name: node.name, site: node.site, error: fsnServerMessage(node, false) };
}


// ── Association option builders (shared) ───────────────────────
// One source for every "pick a Campus Hub / pick a Relay" list: the Create Node
// drawer, the Building Controller and Relay side-panel dropdowns, and the association
// drawers. Archived servers are excluded everywhere — an archived server is out
// of service, so nothing new may be attached to it.

/**
 * Every Campus Hub server selectable for a site: the site's own, plus NORT's (an NORT
 * Campus Hub is reachable from any site — see FR-LS-07). De-duplicated by hostname.
 */
function getGHDSServersForSite(site) {
    var servers = [];
    var seen = {};
    if (typeof ghdsServersData === 'undefined') return servers;

    function collectFromSite(s) {
        var siteData = ghdsServersData[s];
        if (!siteData) return;
        Object.keys(siteData).forEach(function(project) {
            var siteNode = siteData[project];
            if (!siteNode || !siteNode.children) return;
            siteNode.children.forEach(function(projectNode) {
                (projectNode.children || []).forEach(function(srv) {
                    if (srv.archived || seen[srv.name]) return;
                    seen[srv.name] = true;
                    servers.push({ id: srv.id || srv.name, name: srv.name, site: srv.site || s });
                });
            });
        });
    }

    collectFromSite(site);
    if (site !== 'NORT') collectFromSite('NORT');

    return servers;
}

/**
 * Every Relay server on a site. Relay servers are never cross-site, so there is no
 * NORT fallback here.
 */
function getCDNServersForSite(site) {
    var servers = [];
    var seen = {};
    if (typeof cdnServersData === 'undefined' || !cdnServersData[site]) return servers;

    Object.keys(cdnServersData[site]).forEach(function(key) {
        var entry = cdnServersData[site][key];
        if (!entry || !entry.children) return;
        entry.children.forEach(function(srv) {
            if (srv.level !== 'Timetable Relay' || srv.archived || seen[srv.name]) return;
            seen[srv.name] = true;
            servers.push({ id: srv.id || srv.name, name: srv.name, site: srv.site || site, ghdsAssociation: srv.ghdsAssociation || '' });
        });
    });
    return servers;
}

/**
 * The Campus Hub Association string a Building Controller stores for a given Campus Hub hostname:
 * `<hostname> (<Type>)`. Relay servers store the bare hostname instead — the two
 * formats are not interchangeable (findCDNServersForGHDS compares with ===).
 */
function lineServerGHDSAssociationLabel(ghdsHostname, serverType) {
    if (!ghdsHostname) return '';
    var t = serverType || 'fatp';
    var suffix = t === 'panda' ? 'Connected Campus/Test Lab' : t === 'lab' ? 'Connected Campus/Test Lab' : 'Standalone Campus';
    return ghdsHostname + ' (' + suffix + ')';
}

// ── Backfill `associatedProjects` on every Campus Hub server ─────────
//    A Campus Hub's project list is the set of projects it **grants its building controllers
//    access to** — an attribute of the Campus + Campus Hub pair, not something derived
//    from whichever building controllers happen to point at it today. It is what
//    constrains a building controller's own projects: move a building controller to a Campus Hub that
//    doesn't grant one of its projects and that project is dropped (FR-P2-18).
//
//    Seed data ships the field empty (NORT) or absent (everywhere else), so
//    without this pass every Campus Hub would grant nothing and any move would strip
//    every project. Backfill it from the projects the Campus Hub's current line
//    servers already run, which is the only signal the seed carries — and makes
//    the seed self-consistent, so no existing association is retroactively
//    invalid. A Campus Hub with an explicit list (`meds-hub2`) is left alone.
function _backfillGHDSProjects() {
    if (typeof ghdsServersData === 'undefined') return;

    function projectsForHost(host) {
        var seen = {};
        function scan(dataSource) {
            if (!dataSource) return;
            Object.keys(dataSource).forEach(function(site) {
                Object.keys(dataSource[site] || {}).forEach(function(key) {
                    var entry = dataSource[site][key];
                    if (!entry || !entry.children) return;
                    entry.children.forEach(function(projNode) {
                        (projNode.children || []).forEach(function(ls) {
                            if (ls.level !== 'Building Controller') return;
                            if (!ls.ghdsAssociation || ls.ghdsAssociation.indexOf(host) !== 0) return;
                            (ls.everAssociated || ls.associatedProjects || []).forEach(function(p) { seen[p] = true; });
                        });
                    });
                });
            });
        }
        scan(lineServersDataSets);
        scan(archivedServersData);
        return Object.keys(seen).sort();
    }

    Object.keys(ghdsServersData).forEach(function(site) {
        Object.keys(ghdsServersData[site] || {}).forEach(function(key) {
            var entry = ghdsServersData[site][key];
            if (!entry || !entry.children) return;
            entry.children.forEach(function(projNode) {
                (projNode.children || []).forEach(function(ghds) {
                    if (ghds.level !== 'Campus Hub') return;
                    if (ghds.associatedProjects && ghds.associatedProjects.length) return;
                    ghds.associatedProjects = projectsForHost(ghds.name);
                });
            });
        });
    });
}
_backfillGHDSProjects();

/**
 * The projects a Campus Hub grants its building controllers access to. Empty array for an
 * unknown hostname — callers must treat "Campus Hub not found" as "grants nothing
 * known" rather than "grants everything".
 */
function ghdsGrantedProjects(ghdsHostname) {
    if (!ghdsHostname || typeof ghdsServersData === 'undefined') return [];
    var found = null;
    Object.keys(ghdsServersData).forEach(function(site) {
        Object.keys(ghdsServersData[site] || {}).forEach(function(key) {
            var entry = ghdsServersData[site][key];
            if (found || !entry || !entry.children) return;
            entry.children.forEach(function(projNode) {
                (projNode.children || []).forEach(function(ghds) {
                    if (!found && ghds.level === 'Campus Hub' && ghds.name === ghdsHostname) found = ghds;
                });
            });
        });
    });
    return found ? (found.associatedProjects || []).slice() : [];
}

/**
 * Visit every server of one `level` in a seed dataset, at either depth the seed
 * shapes use: `site → key → Campus.children[]` (Relay records) and
 * `site → key → Campus.children[] → Faculty.children[]` (building controllers, hub).
 *
 * The `level` filter is load-bearing, not a convenience: `cdnServersData` nests
 * read-only Building Controller mirrors under each Relay with synthetic `cdn-ls-*` ids
 * that `buildAllServersTree` strips (it clones Relays with `children: []`), so
 * those ids never exist in the tree. Asking this walker for 'Timetable Relay' is what
 * keeps them out. Contrast `_hostnameInUse` in selection.js, which deliberately
 * DOES walk them — a duplicate-name check has to see every name in the data.
 */
function forEachSeedServer(dataSource, level, fn) {
    if (!dataSource) return;
    Object.keys(dataSource).forEach(function(site) {
        Object.keys(dataSource[site] || {}).forEach(function(key) {
            var entry = dataSource[site][key];
            ((entry && entry.children) || []).forEach(function(d1) {
                if (d1.level === level) fn(d1, site);
                (d1.children || []).forEach(function(d2) {
                    if (d2.level === level) fn(d2, site);
                });
            });
        });
    });
}

// ── State variables ────────────────────────────────────────────
let lineServersData = null;
let selectedSites = [];
let selectedProjects = [];
let currentServerType = 'all';
let selectedNodeId = null;
let selectedNodeIds = [];
let lastClickedNodeId = null;

// Building controllers created without any project association live here
// (keyed by site → array of LS nodes). They are merged into the tree by
// buildAllServersTree so users can still see and manage them, but they
// don't appear under any project bucket in lineServersDataSets.
const orphanLineServersData = {};

// Seed: an active, project-less Building Controller with Registry Sync on. Asset Registry refuses to
// remove its host (FR-P2-30), and with no project its hostname is editable, so
// every Asset Registry refusal path — archive, disable, hostname change — can be shown here.
(function() {
    var ls = _ls(1700, 'lab-bc01-1.atrium.test', '10.190.200.10', 'Test lab controller 1-1', 'North Campus, AV Test Lab 1F', [], 'hub.atrium.test (Standalone Campus)', 'off', false, false, true);
    ls.project = null;
    ls.serverType = 'fatp';
    ls.proxyURL = 'https://lab-bc01-1.atrium.test/campus/';
    ls.fsnRefuses = true;
    orphanLineServersData['NORT'] = (orphanLineServersData['NORT'] || []).concat([ls]);
})();

// Seed: a batch of project-less, Asset Registry-on Building Controllers for the bulk failure example.
// Select them all and turn Registry Sync off: three are refused, each with its
// Asset Registry error (listed in the failures dialog), and two go through.
(function() {
    var seeds = [
        { id: 1701, host: 'lab-bc01-2', ip: '10.190.200.11', refuses: true },
        { id: 1702, host: 'lab-bc01-3', ip: '10.190.200.12', refuses: true },
        { id: 1703, host: 'lab-bc02-1', ip: '10.190.200.13', refuses: true },
        { id: 1704, host: 'lab-bc02-2', ip: '10.190.200.14', refuses: false },
        { id: 1705, host: 'lab-bc02-3', ip: '10.190.200.15', refuses: false }
    ];
    var list = seeds.map(function(d) {
        var name = d.host + '.atrium.test';
        var ls = _ls(d.id, name, d.ip, 'Test lab controller ' + d.host.slice(-4), 'North Campus, AV Test Lab 1F', [], 'hub.atrium.test (Standalone Campus)', 'off', false, false, true);
        ls.project = null;
        ls.serverType = 'fatp';
        ls.proxyURL = 'https://' + name + '/campus/';
        if (d.refuses) ls.fsnRefuses = d.refuses;
        return ls;
    });
    orphanLineServersData['NORT'] = (orphanLineServersData['NORT'] || []).concat(list);
})();

// Seed: the disabled NORT servers that never had a project. `_buildProjectTree` buckets by
// project, so these would exist nowhere; they are archived in place in the project-less
// set (the same shape archiving a project-less server produces), Asset Registry off.
(function() {
    var archivedOrphans = _APPL_DISABLED.filter(function(s) { return s.associatedProjects.length === 0; }).map(function(s) {
        return Object.assign({}, s, {
            project: null, archived: true, status: 'inactive', fsnApiCalls: false,
            serverType: 'fatp', everAssociated: [], associatedProjects: [], children: []
        });
    });
    orphanLineServersData['NORT'] = (orphanLineServersData['NORT'] || []).concat(archivedOrphans);
})();
