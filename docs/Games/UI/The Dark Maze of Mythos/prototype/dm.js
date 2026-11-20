(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var stage = $('#stage'), vp = $('#vp');

  /* ---- scale stage to fit ---- */
  function fit() { var s = vp.clientWidth / 360; stage.style.transform = 'scale(' + s + ')'; }
  new ResizeObserver(fit).observe(vp); fit();

  /* ---- icons ---- */
  var ICON = { throw: 'img/ui/throw.svg', pick: 'img/ui/pick.svg', on: 'img/ui/torch-on.svg', off: 'img/ui/torch-off.svg' };
  function setIc(btn, key) { var i = $('.ic', btn); if (i.getAttribute('data-k') !== key) { i.src = ICON[key]; i.setAttribute('data-k', key); } }

  /* ---- screens ---- */
  var cur = 'menu', loopOn = false, paused = false;
  function show(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.toggle('on', s.id === id); });
    cur = id;
    document.querySelectorAll('.demo button').forEach(function (b) { b.classList.toggle('cur', b.dataset.go === id); });
  }
  function go(id) {
    stopGame();
    if (id === 'pause') { startGame(true); setPause(true); return; }
    if (id === 'game') { startGame(); return; }
    if (id === 'intro') { var i = $('#intro'); i.classList.remove('go'); show('intro'); return; }
    if (id === 'win1' || id === 'win2') { setTimeLabel(winTime || 4330); }
    if (id === 'score') { renderScores(); }
    show(id);
  }
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-go]'); if (b) go(b.dataset.go); });

  /* intro: tap switches 3D perspective to top-down and starts the run */
  $('#intro').addEventListener('click', function () {
    var el = $('#intro'); if (el.classList.contains('go')) return;
    el.classList.add('go');
    setTimeout(function () { if (cur === 'intro') startGame(); }, 1000);
  });

  /* ---- maze ---- */
  /* Level layout from the GDD map (images/Labirinto.png), one char per 40 px tile: # wall, . corridor, g chamber */
  var MAP = ["##################################", "###################.##############", "##....##....#.#####.....#........#", "#...#.##.##.#.#########.#.######.#", "##..#.....................####.#.#", "####################.ggg.......#.#", "###.##....##########.ggg....####.#", "###....##............ggg.......#.#", "###.################.gggggg.##.#.#", "###..................gggggg.##.#.#", "####.#.gggg.#.######.gggggg.#..#.#", "##.#.#.gggg.#.#..###.gggggg.##.#.#", "##.#.#.gggg.#.##.#.#.######.##.#.#", "##.#.#.gggg.#.#....#........##.#.#", "##...#..........####.####.gggg.#.#", "##.###.########.####.##.#.gggg.#.#", "##.###.....####......##...gggg.#.#", "##.....###.#.....gg..##.##gggg.#.#", "##.###.###.#.....gg.....###.gg.#.#", "##.###.###.#.#.gggg..##.###.gg.#.#", "##.###.#...#.#.gggg..##.###.gg.#.#", "##.###.#####.#..............gg.#.#", "##.........#.##########.###.gg.#.#", "######.#####.##########.#......#.#", "##.................####.###.##.#.#", "##.#############.#.#.##.###.##.#.#", "##.#########.....#.#.##.###.##.#.#", "##.##......##.##.#......######.#.#", "##.##.###.###.##.#.gg.#.######.#.#", "##.##.###.###.##.#.gg.#.#####..#.#", "##........###....#.gg.#.##.##.##.#", "##.########.##.###.gg.#.##.##.##.#", "##.########.##.###.gg.#.#.....##.#", "##.................gg.#.#.##.###.#", "#####...#.###########.#.#.##.#...#", "#####...#.########.##.....####.###", "#####...#..........######........#", "######.###########################", "##################################"];
  var W = MAP[0].length, H = MAP.length, T = 44, CW = 360, CH = 800;
  var START = [6, 35], EXIT = [19, 1];
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var grid, items, mino, player, light, thrown, exit, state;

  function solid(tx, ty) { return tx < 0 || ty < 0 || tx >= W || ty >= H || grid[ty * W + tx] === 1; }
  function bfs(from, to) { /* returns next tile on the way, or null */
    var prev = new Int16Array(W * H).fill(-2), q = [from], s = from[1] * W + from[0]; prev[s] = -1;
    for (var i = 0; i < q.length; i++) {
      var c = q[i]; if (c[0] === to[0] && c[1] === to[1]) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nx = c[0] + d[0], ny = c[1] + d[1]; if (!solid(nx, ny) && prev[ny * W + nx] === -2) { prev[ny * W + nx] = c[1] * W + c[0]; q.push([nx, ny]); } });
    }
    var t = to[1] * W + to[0]; if (prev[t] === -2) return { next: null, len: 99 };
    var len = 0; while (prev[t] !== s && prev[t] !== -1) { t = prev[t]; len++; }
    return { next: [t % W, Math.floor(t / W)], len: len + 1 };
  }
  var tileOf = function (p) { return [Math.floor(p.x / T), Math.floor(p.y / T)]; };
  function los(a, b) { var d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 10); for (var i = 1; i < n; i++) { var x = a.x + (b.x - a.x) * i / n, y = a.y + (b.y - a.y) * i / n; if (solid(Math.floor(x / T), Math.floor(y / T))) return false; } return true; }

  /* ---- game state ---- */
  var winTime = 0, last = 0, raf = 0, keys = {}, joy = { x: 0, y: 0 }, toastT = 0, alertT = 0;
  function reset() {
    grid = new Uint8Array(W * H); MAP.forEach(function (row, y) { for (var x = 0; x < W; x++) grid[y * W + x] = row[x] === '#' ? 1 : (row[x] === 'g' ? 2 : 0); });
    var r = rng(Date.now() & 0xffff);
    player = { x: (START[0] + .5) * T, y: (START[1] + .5) * T, fx: 0, fy: -1 };
    exit = { x: EXIT[0], y: EXIT[1] };
    var floors = []; for (var i = 0; i < W * H; i++) if (grid[i] !== 1) floors.push([i % W, Math.floor(i / W)]);
    function pick(minD) { for (var t = 0; t < 400; t++) { var f = floors[Math.floor(r() * floors.length)]; if (Math.hypot(f[0] - START[0], f[1] - START[1]) >= minD && !(f[0] === exit.x && f[1] === exit.y)) return f; } return floors[0]; }
    items = []; for (i = 0; i < 6; i++) { var f = pick(7); items.push({ t: 'card', x: (f[0] + .5) * T, y: (f[1] + .5) * T }); }
    for (i = 0; i < 5; i++) { f = pick(3); items.push({ t: 'match', x: (f[0] + .5) * T, y: (f[1] + .5) * T }); }
    var m = pick(18);
    mino = { x: (m[0] + .5) * T, y: (m[1] + .5) * T, mode: 'patrol', target: null, wait: 0, lose: 0, think: 0, path: null };
    light = { on: true, matches: 3 }; thrown = null;
    state = { cards: 0, t: 0, over: false };
    updateHud(); setTorchIcons();
  }
  function setTorchIcons() {
    var near = thrown && Math.hypot(thrown.x - player.x, thrown.y - player.y) < T * 1.1;
    setIc($('#btnThrow'), thrown ? 'pick' : 'throw');
    $('#btnThrow').setAttribute('aria-label', thrown ? 'Pick up torch' : 'Throw torch');
    $('#btnThrow').classList.toggle('dim', !!thrown && !near);
    setIc($('#btnTorch'), light.on ? 'on' : 'off');
    $('#btnTorch').classList.toggle('dim', !light.on && light.matches === 0);
  }
  var two = function (n) { return (n < 10 ? '0' : '') + n; };
  function fmt(ms) { var s = Math.floor(ms / 1000); return two(Math.floor(s / 60)) + ':' + two(s % 60); }
  function setTimeLabel(ms) { document.querySelectorAll('[data-time]').forEach(function (e) { e.textContent = fmt(ms); }); }
  function updateHud() {
    $('#hCards').textContent = state.cards + '/6'; $('#hMatches').textContent = two(light.matches);
    var f = fmt(state.t).split(':'); $('#hTime').innerHTML = f[0] + '<i>:</i>' + f[1];
  }
  function toast(msg) { var t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('on'); }, 1600); }
  function roar() { var a = $('#alert'); a.classList.remove('on'); void a.offsetWidth; a.classList.add('on'); clearTimeout(alertT); alertT = setTimeout(function () { a.classList.remove('on'); }, 800); }

  function startGame(freeze) { reset(); show('game'); setPause(false); last = performance.now(); loopOn = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); if (freeze) { draw(performance.now()); } }
  function stopGame() { loopOn = false; cancelAnimationFrame(raf); }
  function setPause(p) {
    paused = p; $('#pauseLayer').classList.toggle('on', p);
    var pb = $('#pauseBtn'), sv = pb.querySelector('svg'); sv.innerHTML = p ? '<path d="M4 4l10 10M14 4 4 14" stroke="#fff" stroke-width="2" fill="none"/>' : '<rect x="4" y="3" width="3" height="12"/><rect x="11" y="3" width="3" height="12"/>';
    $('#pauseBtn').setAttribute('aria-label', p ? 'Close pause menu' : 'Pause');
    if (!p) last = performance.now();
  }
  $('#pauseBtn').addEventListener('click', function () { if (cur === 'game') setPause(!paused); });
  $('#resume').addEventListener('click', function () { setPause(false); });
  $('#quit').addEventListener('click', function () { go('menu'); });
  $('#retry').addEventListener('click', function () { go('game'); });

  function lightTorch() {
    if (state.over || paused) return;
    if (light.on) { light.on = false; toast('Torch put out. Stay quiet.'); }
    else if (light.matches > 0) { light.matches--; light.on = true; toast('You struck a match.'); }
    else toast('No matches left!');
    setTorchIcons(); updateHud();
  }
  function throwOrPick() {
    if (state.over || paused) return;
    if (thrown) {
      if (Math.hypot(thrown.x - player.x, thrown.y - player.y) < T * 1.1) { thrown = null; light.on = true; toast('Torch picked up.'); }
      else toast('Walk closer to pick it up.');
    } else if (light.on) {
      var d = 0, x = player.x, y = player.y;
      while (d < 4 * T && !solid(Math.floor((x + player.fx * 6) / T), Math.floor((y + player.fy * 6) / T))) { x += player.fx * 6; y += player.fy * 6; d += 6; }
      thrown = { x: x, y: y }; light.on = false; toast('Torch thrown. It lures the Minotaur.');
    } else toast('Light the torch first.');
    setTorchIcons();
  }
  $('#btnTorch').addEventListener('click', lightTorch);
  $('#btnThrow').addEventListener('click', throwOrPick);

  /* ---- input ---- */
  window.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase(); keys[k] = true;
    if (cur !== 'game') { if (k === 'escape' && cur === 'score') go('menu'); return; }
    if (k === 'escape' || k === 'p') setPause(!paused);
    if (k === 't') lightTorch(); if (k === 'g' || k === ' ') { e.preventDefault(); throwOrPick(); }
    if (k.indexOf('arrow') === 0) e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  var stick = $('#stick'), stickImg = $('#stickImg'), sid = null, stickKey = 'idle';
  function setStick(k) { if (k !== stickKey) { stickKey = k; stickImg.src = 'img/ui/stick-' + k + '.svg'; } }
  function stickMove(e) {
    var r = stick.getBoundingClientRect(), s = r.width / 194, cx = r.left + r.width / 2, cy = r.top + r.height * 0.52;
    var dx = (e.clientX - cx) / s, dy = (e.clientY - cy) / s, d = Math.hypot(dx, dy);
    if (d < 12) { joy.x = joy.y = 0; setStick('idle'); return; }
    joy.x = dx / d; joy.y = dy / d;
    setStick(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }
  stick.addEventListener('pointerdown', function (e) { sid = e.pointerId; stick.setPointerCapture(sid); stickMove(e); });
  stick.addEventListener('pointermove', function (e) { if (e.pointerId === sid) stickMove(e); });
  function stickEnd(e) { if (e.pointerId !== sid) return; sid = null; joy.x = joy.y = 0; setStick('idle'); }
  stick.addEventListener('pointerup', stickEnd); stick.addEventListener('pointercancel', stickEnd);

  /* ---- simulation ---- */
  function moveBox(o, dx, dy, h) {
    var nx = o.x + dx; if (!hit(nx, o.y, h)) o.x = nx;
    var ny = o.y + dy; if (!hit(o.x, ny, h)) o.y = ny;
  }
  function hit(x, y, h) { return solid(Math.floor((x - h) / T), Math.floor((y - h) / T)) || solid(Math.floor((x + h) / T), Math.floor((y - h) / T)) || solid(Math.floor((x - h) / T), Math.floor((y + h) / T)) || solid(Math.floor((x + h) / T), Math.floor((y + h) / T)); }

  function finish(kind) {
    if (state.over) return; state.over = true; winTime = state.t;
    setTimeout(function () {
      if (kind === 'dead') { stopGame(); show('dead'); return; }
      saveScore(winTime); stopGame(); setTimeLabel(winTime); show(kind);
    }, kind === 'dead' ? 450 : 250);
  }

  function update(dt) {
    state.t += dt * 1000;
    var ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iy = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + joy.y, m = Math.hypot(ix, iy);
    if (m > 0.05) { var k = Math.min(1, m) / m; player.fx = ix / m; player.fy = iy / m; moveBox(player, ix * k * 118 * dt, iy * k * 118 * dt, 11); }
    items = items.filter(function (it) {
      if (Math.hypot(it.x - player.x, it.y - player.y) > 20) return true;
      if (it.t === 'card') { state.cards++; toast('Card ' + state.cards + ' of 6'); } else { light.matches++; toast('+1 match'); }
      return false;
    });
    var pt = tileOf(player); if (pt[0] === exit.x && pt[1] === exit.y) return finish('win1');
    if (state.cards >= 6) return finish('win2');
    minotaur(dt, pt);
    updateHud(); setTorchIcons();
  }

  function minotaur(dt, pt) {
    var M = mino, mt = tileOf(M), d = Math.hypot(player.x - M.x, player.y - M.y);
    if (d < 0.62 * T) return finish('dead');
    var sees = (light.on && d < 7 * T && los(M, player)) || d < 1.6 * T;
    if (M.mode !== 'chase' && sees) { M.mode = 'roar'; M.wait = 0.9; M.lose = 0; roar(); }
    if (M.mode === 'roar') { M.wait -= dt; if (M.wait <= 0) M.mode = 'chase'; return; }
    if (M.mode === 'chase') {
      M.lose = sees ? 0 : M.lose + dt;
      if (M.lose > 3) { M.mode = 'patrol'; M.target = null; }
    } else if (thrown && M.mode !== 'lure' && Math.hypot(thrown.x - M.x, thrown.y - M.y) < 9 * T) { M.mode = 'lure'; M.target = tileOf(thrown); }
    if (M.mode === 'idle') { M.wait -= dt; if (M.wait <= 0) { M.mode = 'patrol'; M.target = null; } return; }
    var goal;
    if (M.mode === 'chase') goal = pt;
    else if (M.mode === 'lure') { goal = M.target; if (mt[0] === goal[0] && mt[1] === goal[1]) { M.mode = 'idle'; M.wait = 3; return; } }
    else { /* patrol: random point, or a point near the player */
      if (!M.target || (mt[0] === M.target[0] && mt[1] === M.target[1])) {
        var near = Math.random() < 0.5, tries = 0;
        do { var tx = near ? pt[0] + Math.round((Math.random() - .5) * 10) : 1 + Math.floor(Math.random() * (W - 2)), ty = near ? pt[1] + Math.round((Math.random() - .5) * 10) : 1 + Math.floor(Math.random() * (H - 2)); tries++; } while (solid(tx, ty) && tries < 40);
        M.target = solid(tx, ty) ? mt : [tx, ty];
      }
      goal = M.target;
    }
    var p = bfs(mt, goal); if (!p.next) { M.target = null; return; }
    var cx = (p.next[0] + .5) * T, cy = (p.next[1] + .5) * T, dx = cx - M.x, dy = cy - M.y, dd = Math.hypot(dx, dy) || 1, sp = (M.mode === 'chase' ? 106 : 66) * dt;
    M.x += dx / dd * Math.min(sp, dd); M.y += dy / dd * Math.min(sp, dd); M.fx = dx / dd; M.fy = dy / dd;
  }

  /* ---- rendering ---- */
  var cv = $('#cv'), ctx = cv.getContext('2d'), lc = document.createElement('canvas'); lc.width = cv.width; lc.height = cv.height; var lx = lc.getContext('2d');
  function sx0() { return CW / 2; } function sy0() { return CH * 0.58 - 4; }
  function draw(now) {
    var camX = player.x - CW / 2, camY = player.y - CH * 0.58;
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.fillStyle = '#050101'; ctx.fillRect(0, 0, CW, CH);
    ctx.save(); ctx.translate(-camX, -camY);
    var x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(W - 1, Math.ceil((camX + CW) / T)), y0 = Math.max(0, Math.floor(camY / T) - 1), y1 = Math.min(H - 1, Math.ceil((camY + CH) / T));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var X = x * T, Y = y * T;
      if (grid[y * W + x] !== 1) {
        ctx.fillStyle = grid[y * W + x] === 2 ? ((x + y) % 2 ? '#6f5a4a' : '#6a5546') : ((x + y) % 2 ? '#8a5f3c' : '#845a38'); ctx.fillRect(X, Y, T, T);
        ctx.strokeStyle = 'rgba(60,30,15,.35)'; ctx.lineWidth = 1; ctx.strokeRect(X + 5.5, Y + 6.5, 14, 7); ctx.strokeRect(X + 23.5, Y + 24.5, 13, 8);
      }
    }
    for (y = y0; y <= y1; y++) for (x = x0; x <= x1; x++) if (grid[y * W + x] === 1) { /* walls: tall tops with a lit face below */
      X = x * T; Y = y * T;
      var below = y + 1 < H && grid[(y + 1) * W + x] !== 1;
      ctx.fillStyle = '#c99a62'; ctx.fillRect(X, Y - 16, T, T);
      if (below) { ctx.fillStyle = '#7d5530'; ctx.fillRect(X, Y + T - 16, T, 16); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(X, Y + T - 16, T, 3); }
    }
    ctx.fillStyle = 'rgba(80,255,170,.4)'; var ex = (exit.x + .5) * T, ey = (exit.y + .5) * T; /* exit: sunlight */
    ctx.beginPath(); ctx.arc(ex, ey, 14 + Math.sin(now / 260) * 3, 0, 7); ctx.fill(); ctx.fillStyle = '#c7ffe0'; ctx.beginPath(); ctx.arc(ex, ey, 6, 0, 7); ctx.fill();
    items.forEach(function (it) {
      if (it.t === 'card') { ctx.fillStyle = '#7a0000'; ctx.fillRect(it.x - 8, it.y - 11, 16, 22); ctx.strokeStyle = '#d8d8d8'; ctx.lineWidth = 1.5; ctx.strokeRect(it.x - 8, it.y - 11, 16, 22); ctx.beginPath(); ctx.arc(it.x, it.y, 4, 0, 7); ctx.stroke(); }
      else { ctx.strokeStyle = '#f2ead8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(it.x - 6, it.y + 6); ctx.lineTo(it.x + 6, it.y - 6); ctx.stroke(); ctx.fillStyle = '#c8160f'; ctx.beginPath(); ctx.arc(it.x + 7, it.y - 7, 3.5, 0, 7); ctx.fill(); }
    });
    if (thrown) { ctx.fillStyle = '#e4e0d4'; ctx.fillRect(thrown.x - 3, thrown.y - 3, 14, 5); ctx.fillStyle = '#ff7a20'; ctx.beginPath(); ctx.arc(thrown.x - 4, thrown.y, 5, 0, 7); ctx.fill(); }
    /* minotaur */
    var M = mino; ctx.fillStyle = '#6a0f0a'; ctx.beginPath(); ctx.ellipse(M.x, M.y, 15, 13, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#9a1c12'; ctx.beginPath(); ctx.arc(M.x + (M.fx || 0) * 6, M.y + (M.fy || 1) * 6, 9, 0, 7); ctx.fill();
    ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(M.x - 13, M.y - 3); ctx.lineTo(M.x - 19, M.y - 12); ctx.moveTo(M.x + 13, M.y - 3); ctx.lineTo(M.x + 19, M.y - 12); ctx.stroke();
    ctx.fillStyle = '#ff3b2a'; ctx.fillRect(M.x - 6, M.y + 4, 3, 3); ctx.fillRect(M.x + 3, M.y + 4, 3, 3);
    /* player */
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(player.x, player.y + 11, 12, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#d5622b'; ctx.fillRect(player.x - 10, player.y - 6, 20, 18); ctx.fillStyle = '#5a3a28'; ctx.fillRect(player.x - 8, player.y + 8, 6, 8); ctx.fillRect(player.x + 2, player.y + 8, 6, 8);
    ctx.fillStyle = '#f4ead2'; ctx.fillRect(player.x - 8, player.y - 18, 16, 14); ctx.fillStyle = '#111'; ctx.fillRect(player.x - 8, player.y - 10, 16, 4);
    ctx.restore();
    var ang = Math.atan2(ey - player.y, ex - player.x), ed = Math.hypot(ex - player.x, ey - player.y); /* faint pull toward the sunlight */
    if (ed > 180) { ctx.save(); ctx.translate(sx0(), sy0()); ctx.rotate(ang); ctx.fillStyle = 'rgba(120,255,190,.35)'; ctx.beginPath(); ctx.moveTo(74, 0); ctx.lineTo(62, -7); ctx.lineTo(62, 7); ctx.fill(); ctx.restore(); }
    /* darkness with torch light */
    lx.setTransform(2, 0, 0, 2, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.fillStyle = 'rgba(0,0,0,.975)'; lx.clearRect(0, 0, CW, CH); lx.fillRect(0, 0, CW, CH);
    lx.globalCompositeOperation = 'destination-out';
    function spot(x, y, r, a) { var g = lx.createRadialGradient(x, y, r * .1, x, y, r); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(.55, 'rgba(0,0,0,' + a * .75 + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); lx.fillStyle = g; lx.beginPath(); lx.arc(x, y, r, 0, 7); lx.fill(); }
    var fl = Math.sin(now / 90) * 3 + Math.sin(now / 37) * 2, sx = player.x - camX, sy = player.y - camY;
    spot(sx, sy - 4, light.on ? 185 + fl : 42, 1);
    if (thrown) spot(thrown.x - camX, thrown.y - camY, 150 + fl, .95);
    spot(ex - camX, ey - camY, 42, .7);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(lc, 0, 0);
  }
  function tick(now) {
    if (!loopOn) return;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    if (!paused && !state.over) update(dt);
    if (loopOn) { draw(now); raf = requestAnimationFrame(tick); }
  }

  /* ---- scoreboard ---- */
  var KEY = 'dm.scores.v1';
  function scores() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function saveScore(ms) { var s = scores(); s.push({ ms: ms, d: new Date().toISOString().slice(0, 10), id: Date.now() }); s.sort(function (a, b) { return a.ms - b.ms; }); try { localStorage.setItem(KEY, JSON.stringify(s.slice(0, 12))); localStorage.setItem(KEY + '.last', String(s.find(function (x) { return x.ms === ms; }).id)); } catch (e) {} }
  function renderScores() {
    var s = scores(), lastId = +localStorage.getItem(KEY + '.last') || 0, h = '';
    for (var i = 0; i < 12; i++) {
      var e = s[i]; h += e ? '<tr' + (e.id === lastId ? ' class="me"' : '') + '><td>' + (i + 1) + '</td><td>' + e.d.split('-').reverse().join('/') + '</td><td>' + fmt(e.ms) + '</td></tr>' : '<tr><td>' + (i + 1) + '</td><td>–</td><td>–</td></tr>';
    }
    $('#sbBody').innerHTML = h;
  }

  var q = location.hash.replace('#', ''); if (q && document.getElementById(q)) go(q);
})();
