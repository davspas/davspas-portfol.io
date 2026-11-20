// kb-graph.js — the node graph: SVG rendering, five layouts, pan/zoom/drag/hover.
//
// Hand-rolled rather than built on a graph library: the model is ~16 nodes and ~50
// edges, so a force simulation is a few dozen lines, and vendoring d3 into the plugin
// tree for it would be the larger cost. It also keeps the page dependency-free, which
// matters because prototypes are shared as static zips.
//
// Determinism is deliberate. Nothing here calls Math.random(): the force layout seeds
// from a circle in manifest order and cools on a fixed schedule, so the same KB always
// produces the same picture. A reviewer comparing two sessions sees the same graph.
//
// Public surface: window.KbGraph
(function() {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Layout modes, in toolbar order. `build` returns { positions, lanes } in layout
  // space; the renderer animates the nodes to those positions and draws the lanes.
  var LAYOUTS = [
    { id: 'relationship', label: 'Relationship', icon: 'point.3.connected.trianglepath.dotted',
      hint: 'Force-directed by See also / Cross-topic dependencies. Thicker edges = more references.' },
    { id: 'hierarchy',    label: 'Hierarchy',    icon: 'square.grid.3x2',
      hint: 'Clustered by the KB index’s own sections.' },
    { id: 'platform',     label: 'IT-managed / Faculty-registered', icon: 'arrow.left.arrow.right',
      hint: 'Lane by platform, inferred from how often each file talks about IT-managed vs Faculty-registered devices.' },
    { id: 'maturity',     label: 'Maturity',     icon: 'checkmark.seal',
      hint: 'Lane by what actually exists: shipped client, partially shipped, or design-only.' },
    { id: 'systems',      label: 'External systems', icon: 'network',
      hint: 'Topics orbit the external system they depend on most; a dashed line marks every system they depend on.' }
  ];

  // Node colour is by KB category in every layout, so a node keeps its identity as the
  // arrangement changes. Colours are set here rather than in CSS because the legend and
  // the SVG both need them.
  var CATEGORY_COLORS = [
    '#5ac8fa', '#ffd60a', '#ff9f0a', '#bf5af2', '#30d158', '#ff6482', '#64d2ff', '#ac8e68'
  ];

  var LANE_GAP = 60;
  var NODE_MIN_R = 16;
  var NODE_MAX_R = 34;
  var ANIM_MS = 600;
  var MIN_ZOOM = 0.25;
  var MAX_ZOOM = 3;
  var FIT_ZOOM_MAX = 1.6;        // fit never zooms IN past this; the buttons still can
  var MIN_FIT_PX = 120;          // below this the stage is mid-layout, not really sized
  var FIT_MARGIN = 24;

  var els = {};              // svg, viewport, lanes, edges, nodes layers
  var model = null;
  var nodes = [];            // render records: { id, topic, x, y, tx, ty, r, pinned }
  var edges = [];
  var hubs = [];             // pseudo-nodes for the "External systems" layout
  var sysLinks = [];         // topic -> system connectors, same layout only
  var categoryColor = {};

  var layout = 'relationship';
  var view = { x: 0, y: 0, k: 1 };
  var selectedId = null;
  var hoverId = null;
  var isolateId = null;      // double-click focus: show only this node + neighbours
  var visibleIds = null;     // search filter; null = everything
  var hideNonMatching = true;
  var badges = {};           // id -> search match count
  var callbacks = {};
  var animFrame = null;

  // --- Small helpers ----------------------------------------------------------

  function el(name, attrs, parent) {
    var node = document.createElementNS(SVG_NS, name);
    if (attrs) Object.keys(attrs).forEach(function(k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function byId(id) {
    for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
    return null;
  }

  // --- Layout builders --------------------------------------------------------

  // Force-directed: Fruchterman-Reingold style. Repulsion between every pair, spring
  // along every edge (weighted, so tightly-coupled topics sit closer), weak gravity to
  // the centre so disconnected nodes don't drift off.
  function layoutForce() {
    var W = 1200, H = 760;
    var k = Math.sqrt((W * H) / Math.max(nodes.length, 1)) * 0.72;
    var pos = {};

    // Seed on a circle, in manifest order — deterministic, and already spread out.
    nodes.forEach(function(n, i) {
      var a = (i / nodes.length) * Math.PI * 2;
      pos[n.id] = { x: W / 2 + Math.cos(a) * W * 0.3, y: H / 2 + Math.sin(a) * H * 0.3 };
    });

    var temp = W * 0.12;
    var steps = 400;
    for (var step = 0; step < steps; step++) {
      var disp = {};
      nodes.forEach(function(n) { disp[n.id] = { x: 0, y: 0 }; });

      for (var i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = pos[nodes[i].id], b = pos[nodes[j].id];
          var dx = a.x - b.x, dy = a.y - b.y;
          var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          var rep = (k * k) / d;
          var ux = (dx / d) * rep, uy = (dy / d) * rep;
          disp[nodes[i].id].x += ux; disp[nodes[i].id].y += uy;
          disp[nodes[j].id].x -= ux; disp[nodes[j].id].y -= uy;
        }
      }

      edges.forEach(function(e) {
        var a = pos[e.a], b = pos[e.b];
        if (!a || !b) return;
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        var attr = ((d * d) / k) * (1 + Math.log(1 + e.weight) * 0.35);
        var ux = (dx / d) * attr, uy = (dy / d) * attr;
        disp[e.a].x -= ux; disp[e.a].y -= uy;
        disp[e.b].x += ux; disp[e.b].y += uy;
      });

      nodes.forEach(function(n) {
        var p = pos[n.id], d = disp[n.id];
        d.x += (W / 2 - p.x) * 0.012;      // gravity
        d.y += (H / 2 - p.y) * 0.012;
        var len = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
        p.x += (d.x / len) * Math.min(len, temp);
        p.y += (d.y / len) * Math.min(len, temp);
      });

      temp *= 0.975;
    }

    return { positions: pos, lanes: [] };
  }

  // Shared arrangement for every grouped layout: one lane per group, nodes packed into
  // a grid inside it. Lanes are laid out left-to-right in the order given.
  function layoutLanes(groups, opts) {
    opts = opts || {};
    var pos = {};
    var lanes = [];
    var laneW = opts.laneWidth || 300;
    var rowH = opts.rowHeight || 108;
    var perRow = opts.perRow || 2;
    var top = 86;
    var x = 0;

    groups.forEach(function(group) {
      var members = group.members;
      var rows = Math.max(Math.ceil(members.length / perRow), 1);
      lanes.push({
        id: group.id,
        label: group.label,
        sublabel: group.sublabel || '',
        color: group.color || null,
        x: x, y: 20, width: laneW, height: top - 20 + rows * rowH + 24,
        empty: members.length === 0
      });

      members.forEach(function(n, i) {
        var row = Math.floor(i / perRow);
        var col = i % perRow;
        var inRow = Math.min(perRow, members.length - row * perRow);
        // Centre the last, possibly short, row inside the lane.
        var slotW = laneW / inRow;
        pos[n.id] = { x: x + slotW * col + slotW / 2, y: top + row * rowH + rowH / 2 };
      });

      x += laneW + LANE_GAP;
    });

    // Equalise lane heights so the bands read as columns, not ragged boxes.
    var maxH = lanes.reduce(function(m, l) { return Math.max(m, l.height); }, 0);
    lanes.forEach(function(l) { l.height = maxH; });

    return { positions: pos, lanes: lanes };
  }

  function group(members, id, label, sublabel, color) {
    return { id: id, label: label, sublabel: sublabel, color: color, members: members };
  }

  function layoutHierarchy() {
    var groups = model.categories.map(function(cat) {
      var members = nodes.filter(function(n) { return n.topic.category === cat; });
      return group(members, cat, cat, members.length + (members.length === 1 ? ' topic' : ' topics'),
                   categoryColor[cat]);
    });
    return layoutLanes(groups, { laneWidth: 260, perRow: 1, rowHeight: 104 });
  }

  function layoutPlatform() {
    function of(p) { return nodes.filter(function(n) { return n.topic.platform === p; }); }
    var groups = [
      group(of('kodiak'), 'kodiak', 'IT-managed', 'IT-managed-dominant'),
      group(of('both'), 'both', 'Both platforms', 'IT-managed and Faculty-registered'),
      group(of('groundhog'), 'groundhog', 'Faculty-registered', 'Faculty-registered-dominant'),
      group(of('neutral'), 'neutral', 'Platform-neutral', 'Neither platform dominates')
    ];
    return layoutLanes(groups, { laneWidth: 300, perRow: 2, rowHeight: 108 });
  }

  function layoutMaturity() {
    function of(s) { return nodes.filter(function(n) { return n.topic.status === s; }); }
    var groups = [
      group(of('shipped'), 'shipped', 'Shipped', 'Documented from the client'),
      group(of('partial'), 'partial', 'Partially shipped', 'Client present but thin'),
      group(of('design-only'), 'design-only', 'Design-only', 'Prototype / requirements only')
    ];
    return layoutLanes(groups, { laneWidth: 340, perRow: 2, rowHeight: 108 });
  }

  // Bipartite: system hubs on a centre ring, topics orbiting the system they depend on
  // most, with a dashed connector to EVERY system they depend on.
  //
  // Those extra connectors are what make the view honest. Placing a topic by its
  // dominant system alone hides the Asset Registry and Timetable Relay entirely — no topic mentions either more
  // than it mentions Building Controllers or the Campus Hub — even though several topics genuinely depend on
  // them. So every detected system gets a hub, and dependency is drawn, not just
  // implied by position.
  function layoutSystems() {
    var pos = {};
    var cx = 660, cy = 430;
    var detected = [];

    nodes.forEach(function(n) {
      var top = n.topic.systems[0];
      n.hub = top ? top.id : null;
      n.topic.systems.forEach(function(sys) {
        if (detected.indexOf(sys.id) === -1) detected.push(sys.id);
      });
    });

    // Keep hub order stable (the SYSTEMS declaration order), not discovery order.
    var order = KbData.SYSTEMS.map(function(s) { return s.id; });
    detected.sort(function(a, b) { return order.indexOf(a) - order.indexOf(b); });

    hubs = detected.map(function(id, i) {
      var a = (i / detected.length) * Math.PI * 2 - Math.PI / 2;
      return { id: id, label: id, x: cx + Math.cos(a) * 300, y: cy + Math.sin(a) * 300, angle: a };
    });

    hubs.forEach(function(hub) {
      var members = nodes.filter(function(n) { return n.hub === hub.id; });
      members.forEach(function(n, i) {
        // Fan the members out around the hub, pointing away from the centre.
        var spread = Math.min(members.length, 5);
        var offset = (i - (members.length - 1) / 2) * (Math.PI / (spread + 3));
        var a = hub.angle + offset;
        var ring = 190 + (Math.floor(i / 5) * 95);
        pos[n.id] = { x: hub.x + Math.cos(a) * ring, y: hub.y + Math.sin(a) * ring };
      });
    });

    var loose = nodes.filter(function(n) { return !n.hub; });
    loose.forEach(function(n, i) {
      var a = (i / Math.max(loose.length, 1)) * Math.PI * 2 - Math.PI / 2;
      pos[n.id] = { x: cx + Math.cos(a) * 120, y: cy + Math.sin(a) * 120 };
    });

    // Topic -> every system it depends on, for the dashed connectors.
    sysLinks = [];
    nodes.forEach(function(n) {
      n.topic.systems.forEach(function(sys) {
        var hub = hubs.filter(function(h) { return h.id === sys.id; })[0];
        if (hub) sysLinks.push({ nodeId: n.id, hub: hub, primary: sys.id === n.hub });
      });
    });

    return { positions: pos, lanes: [], hubs: hubs };
  }

  function build(mode) {
    if (mode === 'hierarchy') return layoutHierarchy();
    if (mode === 'platform') return layoutPlatform();
    if (mode === 'maturity') return layoutMaturity();
    if (mode === 'systems') return layoutSystems();
    return layoutForce();
  }

  // --- Rendering --------------------------------------------------------------

  function nodeRadius(topic) {
    var span = NODE_MAX_R - NODE_MIN_R;
    var maxDegree = model.topics.reduce(function(m, t) { return Math.max(m, t.degree || 0); }, 1);
    return NODE_MIN_R + span * Math.sqrt((topic.degree || 0) / maxDegree);
  }

  // Wrap a title onto at most two lines so long names don't overlap their neighbours.
  function wrapLabel(text) {
    var words = text.split(/\s+/);
    if (words.length === 1) return [text];
    var lines = [''];
    words.forEach(function(w) {
      var last = lines[lines.length - 1];
      if (!last) { lines[lines.length - 1] = w; return; }
      if ((last + ' ' + w).length <= 22) lines[lines.length - 1] = last + ' ' + w;
      else lines.push(w);
    });
    if (lines.length > 2) {
      lines = [lines[0], lines.slice(1).join(' ')];
      if (lines[1].length > 24) lines[1] = lines[1].slice(0, 22) + '…';
    }
    return lines;
  }

  function renderEdges() {
    clear(els.edges);
    edges.forEach(function(e) {
      e.line = el('line', {
        'class': 'kb-edge',
        'stroke-width': clamp(1 + e.weight * 0.7, 1, 5),
        'data-edge': e.id
      }, els.edges);
    });
  }

  function renderHubs() {
    clear(els.lanes);
    if (layout !== 'systems') { sysLinks = []; return; }

    // Connectors first so the hub discs paint over their ends.
    sysLinks.forEach(function(link) {
      link.line = el('line', {
        'class': 'kb-syslink' + (link.primary ? ' kb-syslink--primary' : '')
      }, els.lanes);
    });

    hubs.forEach(function(hub) {
      var g = el('g', { 'class': 'kb-hub', transform: 'translate(' + hub.x + ',' + hub.y + ')' }, els.lanes);
      el('circle', { 'class': 'kb-hub__ring', r: 46 }, g);
      var t = el('text', { 'class': 'kb-hub__label', y: 6 }, g);
      t.textContent = hub.label;
    });
  }

  function renderLanes(lanes) {
    if (layout === 'systems') { renderHubs(); return; }
    clear(els.lanes);
    lanes.forEach(function(lane) {
      var g = el('g', { 'class': 'kb-lane' + (lane.empty ? ' kb-lane--empty' : '') }, els.lanes);
      el('rect', {
        'class': 'kb-lane__bg', x: lane.x - 24, y: lane.y, rx: 18,
        width: lane.width + 48, height: lane.height
      }, g);
      if (lane.color) {
        el('rect', { 'class': 'kb-lane__accent', x: lane.x - 24, y: lane.y, rx: 3,
                     width: 5, height: lane.height, fill: lane.color }, g);
      }
      var title = el('text', { 'class': 'kb-lane__title', x: lane.x, y: lane.y + 34 }, g);
      title.textContent = lane.label;
      if (lane.sublabel) {
        var sub = el('text', { 'class': 'kb-lane__sub', x: lane.x, y: lane.y + 56 }, g);
        sub.textContent = lane.sublabel;
      }
    });
  }

  function renderNodes() {
    clear(els.nodes);
    nodes.forEach(function(n) {
      var g = el('g', { 'class': 'kb-node', 'data-id': n.id, tabindex: '0', role: 'button' }, els.nodes);
      n.g = g;

      el('circle', { 'class': 'kb-node__halo', r: n.r + 10 }, g);
      el('circle', { 'class': 'kb-node__dot', r: n.r, fill: categoryColor[n.topic.category] }, g);

      if (n.topic.flagged) {
        var flag = el('g', { 'class': 'kb-node__flag', transform: 'translate(' + (n.r * 0.72) + ',' + (-n.r * 0.72) + ')' }, g);
        el('circle', { r: 8 }, flag);
        var fl = el('text', { y: 4 }, flag);
        fl.textContent = '!';
      }

      var lines = wrapLabel(n.topic.title);
      var label = el('text', { 'class': 'kb-node__label', y: n.r + 20 }, g);
      lines.forEach(function(line, i) {
        var tspan = el('tspan', { x: 0, dy: i === 0 ? 0 : 15 }, label);
        tspan.textContent = line;
      });

      n.badgeEl = el('g', { 'class': 'kb-node__badge', transform: 'translate(' + (n.r * 0.75) + ',' + (n.r * 0.75) + ')' }, g);
      el('circle', { r: 11 }, n.badgeEl);
      n.badgeText = el('text', { y: 4 }, n.badgeEl);
      n.badgeEl.style.display = 'none';

      wireNode(n, g);
    });
  }

  function positionNodes() {
    nodes.forEach(function(n) {
      if (n.g) n.g.setAttribute('transform', 'translate(' + n.x + ',' + n.y + ')');
    });
    edges.forEach(function(e) {
      var a = byId(e.a), b = byId(e.b);
      if (!e.line || !a || !b) return;
      e.line.setAttribute('x1', a.x); e.line.setAttribute('y1', a.y);
      e.line.setAttribute('x2', b.x); e.line.setAttribute('y2', b.y);
    });
    sysLinks.forEach(function(link) {
      var n = byId(link.nodeId);
      if (!link.line || !n) return;
      link.line.setAttribute('x1', n.x); link.line.setAttribute('y1', n.y);
      link.line.setAttribute('x2', link.hub.x); link.line.setAttribute('y2', link.hub.y);
    });
  }

  function applyView() {
    els.viewport.setAttribute('transform',
      'translate(' + view.x + ',' + view.y + ') scale(' + view.k + ')');
  }

  // --- Animation --------------------------------------------------------------

  function animateTo(positions, done) {
    if (animFrame) cancelAnimationFrame(animFrame);
    var start = null;
    var from = nodes.map(function(n) { return { x: n.x, y: n.y }; });

    nodes.forEach(function(n) {
      var p = positions[n.id];
      n.tx = p ? p.x : n.x;
      n.ty = p ? p.y : n.y;
    });

    function frame(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / ANIM_MS, 0, 1);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // easeInOutCubic
      nodes.forEach(function(n, i) {
        n.x = from[i].x + (n.tx - from[i].x) * e;
        n.y = from[i].y + (n.ty - from[i].y) * e;
      });
      positionNodes();
      if (t < 1) animFrame = requestAnimationFrame(frame);
      else { animFrame = null; if (done) done(); }
    }
    animFrame = requestAnimationFrame(frame);
  }

  // --- Visibility, highlight, badges ------------------------------------------

  function neighbourhood(id) {
    var topic = model.byId[id];
    var set = {};
    set[id] = true;
    (topic ? topic.neighbours : []).forEach(function(n) { set[n] = true; });
    return set;
  }

  function isVisible(id) {
    if (isolateId && !neighbourhood(isolateId)[id]) return false;
    if (visibleIds && !visibleIds[id]) return false;
    return true;
  }

  function refreshClasses() {
    var highlight = hoverId ? neighbourhood(hoverId) : null;

    // NOTE: every `force` argument below is coerced to a real boolean. `classList.toggle`
    // treats `undefined` as "no force given" and FLIPS the class instead — and these
    // expressions naturally produce undefined/null (a missing key in `highlight`, a null
    // `visibleIds`), which silently turned highlight into a flip-flop.
    nodes.forEach(function(n) {
      if (!n.g) return;
      var visible = isVisible(n.id);
      var filteredOut = !!((visibleIds && !visibleIds[n.id]) ||
                           (isolateId && !neighbourhood(isolateId)[n.id]));

      n.g.classList.toggle('kb-node--hidden', filteredOut && hideNonMatching);
      n.g.classList.toggle('kb-node--filtered', filteredOut && !hideNonMatching);
      n.g.classList.toggle('kb-node--selected', n.id === selectedId);
      n.g.classList.toggle('kb-node--dim', !!highlight && !highlight[n.id] && visible);
      n.g.classList.toggle('kb-node--adjacent', !!highlight && !!highlight[n.id] && n.id !== hoverId);

      var count = badges[n.id];
      if (count) {
        n.badgeEl.style.display = '';
        n.badgeText.textContent = count > 99 ? '99+' : String(count);
      } else {
        n.badgeEl.style.display = 'none';
      }
    });

    edges.forEach(function(e) {
      if (!e.line) return;
      var endsVisible = isVisible(e.a) && isVisible(e.b);
      e.line.classList.toggle('kb-edge--hidden', !endsVisible && hideNonMatching);
      e.line.classList.toggle('kb-edge--filtered', !endsVisible && !hideNonMatching);
      var lit = !!(highlight && highlight[e.a] && highlight[e.b] &&
                   (e.a === hoverId || e.b === hoverId));
      e.line.classList.toggle('kb-edge--lit', lit);
      e.line.classList.toggle('kb-edge--dim', !!highlight && !lit);
      e.line.classList.toggle('kb-edge--selected',
        !!selectedId && (e.a === selectedId || e.b === selectedId));
    });

    sysLinks.forEach(function(link) {
      if (!link.line) return;
      var visible = isVisible(link.nodeId);
      link.line.classList.toggle('kb-syslink--hidden', !visible && hideNonMatching);
      link.line.classList.toggle('kb-syslink--filtered', !visible && !hideNonMatching);
      link.line.classList.toggle('kb-syslink--lit',
        !!highlight && !!highlight[link.nodeId] && link.nodeId === hoverId);
    });
  }

  // --- Interaction ------------------------------------------------------------

  function wireNode(n, g) {
    var dragging = false, moved = false, startPointer = null, startPos = null;

    g.addEventListener('pointerdown', function(ev) {
      ev.stopPropagation();
      dragging = true; moved = false;
      startPointer = { x: ev.clientX, y: ev.clientY };
      startPos = { x: n.x, y: n.y };
      g.setPointerCapture(ev.pointerId);
      g.classList.add('kb-node--dragging');
    });

    g.addEventListener('pointermove', function(ev) {
      if (!dragging) return;
      var dx = (ev.clientX - startPointer.x) / view.k;
      var dy = (ev.clientY - startPointer.y) / view.k;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      n.x = startPos.x + dx;
      n.y = startPos.y + dy;
      n.pinned = true;
      positionNodes();
    });

    function endDrag(ev) {
      if (!dragging) return;
      dragging = false;
      g.classList.remove('kb-node--dragging');
      try { g.releasePointerCapture(ev.pointerId); } catch (err) { /* already released */ }
    }
    g.addEventListener('pointerup', function(ev) {
      var wasMoved = moved;
      endDrag(ev);
      if (!wasMoved && callbacks.onSelect) {
        selectedId = n.id;
        refreshClasses();
        callbacks.onSelect(n.id);
      }
    });
    g.addEventListener('pointercancel', endDrag);

    g.addEventListener('dblclick', function(ev) {
      ev.preventDefault();
      isolateId = isolateId === n.id ? null : n.id;
      refreshClasses();
      if (callbacks.onIsolate) callbacks.onIsolate(isolateId);
    });

    g.addEventListener('pointerenter', function() {
      hoverId = n.id;
      refreshClasses();
      if (callbacks.onHover) callbacks.onHover(n.topic, n);
    });
    g.addEventListener('pointerleave', function() {
      if (hoverId === n.id) hoverId = null;
      refreshClasses();
      if (callbacks.onHover) callbacks.onHover(null);
    });

    g.addEventListener('keydown', function(ev) {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        selectedId = n.id;
        refreshClasses();
        if (callbacks.onSelect) callbacks.onSelect(n.id);
      }
    });
  }

  function wireStage() {
    var panning = false, startPointer = null, startView = null;

    els.svg.addEventListener('pointerdown', function(ev) {
      if (ev.target.closest && ev.target.closest('.kb-node')) return;
      panning = true;
      startPointer = { x: ev.clientX, y: ev.clientY };
      startView = { x: view.x, y: view.y };
      els.svg.classList.add('kb-svg--panning');
      els.svg.setPointerCapture(ev.pointerId);
    });

    els.svg.addEventListener('pointermove', function(ev) {
      if (!panning) return;
      view.x = startView.x + (ev.clientX - startPointer.x);
      view.y = startView.y + (ev.clientY - startPointer.y);
      applyView();
    });

    function stopPan(ev) {
      if (!panning) return;
      panning = false;
      els.svg.classList.remove('kb-svg--panning');
      try { els.svg.releasePointerCapture(ev.pointerId); } catch (err) { /* already released */ }
    }
    els.svg.addEventListener('pointerup', stopPan);
    els.svg.addEventListener('pointercancel', stopPan);

    els.svg.addEventListener('wheel', function(ev) {
      ev.preventDefault();
      var rect = els.svg.getBoundingClientRect();
      var px = ev.clientX - rect.left, py = ev.clientY - rect.top;
      zoomAround(px, py, Math.pow(0.998, ev.deltaY));
    }, { passive: false });

    // Click on empty space clears the transient states (hover highlight is pointer-driven).
    els.svg.addEventListener('click', function(ev) {
      if (ev.target.closest && ev.target.closest('.kb-node')) return;
      if (isolateId) { isolateId = null; refreshClasses(); if (callbacks.onIsolate) callbacks.onIsolate(null); }
    });
  }

  function zoomAround(px, py, factor) {
    var k = clamp(view.k * factor, MIN_ZOOM, MAX_ZOOM);
    var scale = k / view.k;
    view.x = px - (px - view.x) * scale;
    view.y = py - (py - view.y) * scale;
    view.k = k;
    applyView();
  }

  function bounds() {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    var any = false;
    nodes.forEach(function(n) {
      if (!isVisible(n.id) && hideNonMatching) return;
      any = true;
      b.minX = Math.min(b.minX, n.x - n.r - 40);
      b.minY = Math.min(b.minY, n.y - n.r - 40);
      b.maxX = Math.max(b.maxX, n.x + n.r + 40);
      b.maxY = Math.max(b.maxY, n.y + n.r + 56);
    });
    if (!any) return null;
    return b;
  }

  // The shared-document strip floats over the top of the stage. Fitting to the full stage
  // height tucks the topmost nodes underneath it, which reads as the graph being cut off.
  function topInset() {
    var strip = els.floating;
    if (!strip || !strip.offsetHeight) return 0;
    return strip.offsetHeight + FIT_MARGIN;
  }

  function fit(animate) {
    var b = bounds();
    if (!b) return;
    var rect = els.svg.getBoundingClientRect();
    // A stage this small has not been laid out yet (the canvas injects content, then flex
    // resolves, then the sf-symbol components upgrade). Fitting against it produces a
    // transform for a size that never existed; the ResizeObserver re-fits once it is real.
    if (rect.width < MIN_FIT_PX || rect.height < MIN_FIT_PX) return;

    var inset = topInset();
    var availH = Math.max(rect.height - inset, MIN_FIT_PX);
    var bw = b.maxX - b.minX;
    var bh = b.maxY - b.minY;
    var k = clamp(Math.min(rect.width / bw, availH / bh) * 0.94, MIN_ZOOM, FIT_ZOOM_MAX);

    // Centre on each axis — but only where the scaled graph actually fits. When k is held
    // up by MIN_ZOOM the graph is larger than the stage, and centring then splits the
    // overflow across both edges, hiding the top of the graph off-screen. Anchoring to the
    // top/left instead keeps the overflow in one direction, where panning can reach it.
    var scaledW = bw * k;
    var scaledH = bh * k;
    var target = {
      k: k,
      x: (scaledW <= rect.width ? (rect.width - scaledW) / 2 : FIT_MARGIN) - b.minX * k,
      y: inset + (scaledH <= availH ? (availH - scaledH) / 2 : FIT_MARGIN) - b.minY * k
    };

    if (!animate) { view = target; applyView(); return; }

    var from = { x: view.x, y: view.y, k: view.k };
    var start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = clamp((ts - start) / 350, 0, 1);
      var e = 1 - Math.pow(1 - t, 3);
      view.x = from.x + (target.x - from.x) * e;
      view.y = from.y + (target.y - from.y) * e;
      view.k = from.k + (target.k - from.k) * e;
      applyView();
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // The stage's height depends on flex resolution, on the toolbar wrapping, on the drawer
  // opening and on the sf-symbol components upgrading — none of which fire a window
  // resize. Watching the element itself is the only way to know the graph was fitted to a
  // size that no longer exists. Re-fitting only changes a transform, so this cannot loop.
  function observeStage() {
    if (typeof ResizeObserver === 'undefined') return;
    var pending = false;
    var observer = new ResizeObserver(function() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function() {
        pending = false;
        fit(false);
      });
    });
    observer.observe(els.svg);
  }

  // --- Public -----------------------------------------------------------------

  window.KbGraph = {
    LAYOUTS: LAYOUTS,

    categoryColor: function(cat) { return categoryColor[cat]; },

    init: function(options) {
      els.svg = document.getElementById('kbSvg');
      els.viewport = document.getElementById('kbViewport');
      els.lanes = document.getElementById('kbLanes');
      els.edges = document.getElementById('kbEdges');
      els.nodes = document.getElementById('kbNodes');
      els.floating = document.getElementById('kbFloating');
      callbacks = options || {};
      wireStage();
      observeStage();

      // Kept alongside the ResizeObserver for browsers without it.
      window.addEventListener('resize', function() { fit(false); });
    },

    setData: function(data) {
      model = data;
      model.categories.forEach(function(cat, i) {
        categoryColor[cat] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
      });

      nodes = model.topics.map(function(topic) {
        return { id: topic.id, topic: topic, x: 600, y: 400, r: nodeRadius(topic), pinned: false };
      });
      edges = model.edges.map(function(e) {
        return { id: e.id, a: e.a, b: e.b, weight: e.weight };
      });

      renderEdges();
      renderNodes();
      this.setLayout(layout, false);
    },

    setLayout: function(mode, animate) {
      layout = mode;
      var result = build(mode);
      renderLanes(result.lanes || []);
      nodes.forEach(function(n) { n.pinned = false; });
      // In the systems view the topic-to-topic edges are not the subject — mute them so
      // the dashed system connectors are legible.
      els.edges.classList.toggle('kb-edges--muted', mode === 'systems');

      if (animate === false) {
        nodes.forEach(function(n) {
          var p = result.positions[n.id];
          if (p) { n.x = p.x; n.y = p.y; }
        });
        positionNodes();
        refreshClasses();
        fit(false);
      } else {
        animateTo(result.positions, function() { fit(true); });
        refreshClasses();
      }
      return LAYOUTS.filter(function(l) { return l.id === mode; })[0];
    },

    getLayout: function() { return layout; },

    // ids: map of id -> true, or null to clear. Also drives the match-count badges.
    setFilter: function(ids, counts) {
      visibleIds = ids;
      badges = counts || {};
      refreshClasses();
      fit(true);
    },

    setHideNonMatching: function(hide) {
      hideNonMatching = hide;
      refreshClasses();
      fit(true);
    },

    select: function(id) {
      selectedId = id;
      refreshClasses();
    },

    clearIsolate: function() {
      if (!isolateId) return false;
      isolateId = null;
      refreshClasses();
      return true;
    },

    // Bring a node into view without changing the zoom — used when a related card or a
    // search result selects a node that may be off screen.
    focus: function(id) {
      var n = byId(id);
      if (!n) return;
      var rect = els.svg.getBoundingClientRect();
      view.x = rect.width / 2 - n.x * view.k;
      view.y = rect.height / 2 - n.y * view.k;
      applyView();
    },

    zoomIn: function() {
      var rect = els.svg.getBoundingClientRect();
      zoomAround(rect.width / 2, rect.height / 2, 1.25);
    },
    zoomOut: function() {
      var rect = els.svg.getBoundingClientRect();
      zoomAround(rect.width / 2, rect.height / 2, 0.8);
    },
    fit: function() { fit(true); }
  };
})();
