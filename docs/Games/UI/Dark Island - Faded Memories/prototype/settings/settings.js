(function () {
  var DI = window.DI, S = DI.settings;
  var stage = DI.$('#stage');
  stage.appendChild(DI.header({ current: 'settings', left: 'EQUIPMENT', right: 'MAP', title: 'SETTINGS', xLabel: 'Default' }));

  var T = function (k, label, sub) { return { t: 'toggle', k: k, label: label, sub: sub }; };
  var SL = function (k, label, min, max, step, unit, sub) { return { t: 'slider', k: k, label: label, min: min, max: max, step: step, unit: unit || '', sub: sub }; };
  var SG = function (k, label, opts, sub) { return { t: 'seg', k: k, label: label, opts: opts, sub: sub }; };
  var N = function (h, body) { return { t: 'note', h: h, body: body }; };

  var CATS = [
    { id: 'game', name: 'Game', sub: 'Settings that shape how the game plays and reads.', tabs: [
      { n: 'Gameplay', rows: [SG('difficulty', 'Difficulty', ['Story', 'Normal', 'Hard', 'Faded'], 'Faded: enemies remember how you fight'), T('damageNumbers', 'Damage numbers', 'Show floating numbers when something is hit'), T('coopHints', 'Co-op hints', 'Show prompts when a friend can join')] },
      { n: 'Interface', rows: [T('hudFade', 'Fade HUD when idle', 'Dim the HUD after a few quiet seconds'), SL('hudScale', 'HUD size', 70, 120, 5, '%'), T('subtitles', 'Subtitles', 'Show dialogue as text')] },
      { n: 'Co-op', rows: [N('Playing together', 'Invite a friend from the pause menu, or join one from your friends list. The second player appears on the HUD with their own bars and load-out.'), T('coopHints', 'Co-op hints', 'Shared with the Gameplay tab')] },
      { n: 'Access', rows: [T('subtitles', 'Subtitles'), SG('colorblind', 'Colour assist', ['Off', 'Protan', 'Deutan', 'Tritan']), SL('hudScale', 'HUD size', 70, 120, 5, '%')] }
    ] },
    { id: 'controls', name: 'Controls', sub: 'Make the controls feel right in your hands.', tabs: [
      { n: 'Gamepad', rows: [T('vibration', 'Vibration', 'Rumble on hits and heavy landings'), SL('deadzone', 'Stick dead zone', 0, 30, 1, '%'), T('holdToSprint', 'Hold to sprint', 'Off: tap once to toggle')] },
      { n: 'Keyboard', rows: [N('Key bindings', 'Move · W A S D &nbsp; Confirm · Enter &nbsp; Back · Esc &nbsp; Drop · X<br>Previous / next page · Q / E &nbsp; Previous / next tab · Z / C')] },
      { n: 'Camera', rows: [SL('sens', 'Camera sensitivity', 10, 100, 5, '%'), T('invertY', 'Invert vertical look')] }
    ] },
    { id: 'graphics', name: 'Graphics', sub: 'Settings that impact the game to customize the game for you.', tabs: [
      { n: 'Display', rows: [SL('resScale', 'Resolution scale', 50, 100, 10, '%'), T('fullscreen', 'Fullscreen'), T('vsync', 'V-sync')] },
      { n: 'Look', rows: [SL('aberration', 'Chromatic aberration', 0, 100, 5, '%', 'Colour fringe on high-contrast edges'), SL('scanlines', 'Scanlines', 0, 100, 5, '%')] }
    ] },
    { id: 'sound', name: 'Sound', sub: 'Balance what you hear.', tabs: [
      { n: 'Volume', rows: [SL('master', 'Master', 0, 100, 5, '%'), SL('music', 'Music', 0, 100, 5, '%'), SL('sfx', 'Effects', 0, 100, 5, '%'), SL('ambience', 'Ambience', 0, 100, 5, '%')] },
      { n: 'Output', rows: [SG('mix', 'Speaker mix', ['Stereo', 'Headphones', 'Mono'])] }
    ] },
    { id: 'about', name: 'About', sub: 'Dark Island: Faded Memories.', tabs: [
      { n: 'Game', rows: [N('The game', 'Ride dragons across forgotten islands. Explore the ruins of a world that fell long ago, and face the monsters and fallen soldiers lurking in the dark. Play alone or join friends in co-op, in a nostalgic style that brings back the magic of childhood.')] },
      { n: 'Credits', rows: [N('Credits', 'UI / UX design and this prototype: see the portfolio page for the team.')] },
      { n: 'Build', rows: [N('Prototype build', 'UI prototype, not the shipped game. Values saved in this browser only.')] }
    ] },
    { id: 'quit', name: 'Quit Game', sub: 'Leave the island for now.', tabs: null }
  ];
  var st = { cat: 0, tab: 0, zone: 'menu', row: 0 };

  // ---- wheel ---------------------------------------------------------------------------------
  var wheel = DI.$('#wheel');
  var XR = [348, 274, 191, 108], Y0 = 510, PITCH = 137;
  var btns = CATS.map(function (c, i) {
    var b = DI.el('button', 'di-obtn', '<i class="tick l"></i><span>' + c.name + '</span><i class="tick r"></i>'); b.type = 'button';
    b.addEventListener('click', function () { st.cat = i; st.tab = 0; st.row = 0; st.zone = 'menu'; render(); });
    wheel.appendChild(b); return b;
  });
  function placeWheel() {
    var n = CATS.length;
    btns.forEach(function (b, i) {
      var d = ((i - st.cat + n + 2) % n) - 2; // -2..3
      var xr = XR[Math.abs(d)], y = Y0 + d * PITCH;
      b.style.setProperty('--xr', xr); b.style.setProperty('--y', y);
      b.classList.toggle('is-selected', d === 0); b.classList.toggle('is-focus', d === 0 && st.zone === 'menu'); b.classList.toggle('is-far', Math.abs(d) >= 2);
    });
    wheel.classList.toggle('is-inactive', st.zone !== 'menu');
  }

  // ---- panel -----------------------------------------------------------------------------------------
  var rowsEl = DI.$('#rows');
  function cur() { var c = CATS[st.cat]; return c.tabs ? c.tabs[st.tab] : null; }
  function focusables() { var t = cur(); return t ? t.rows.map(function (r, i) { return r.t === 'note' ? null : i; }).filter(function (x) { return x != null; }) : []; }
  function fmt(r) { return (S[r.k] != null ? S[r.k] : '') + (r.unit || ''); }

  function renderPanel() {
    var c = CATS[st.cat];
    DI.$('#title').textContent = c.name; DI.$('#sub').textContent = c.sub;
    var tb = DI.$('#tabBtns'); tb.innerHTML = '';
    (c.tabs || []).forEach(function (t, i) {
      var b = DI.el('button', 'di-tab' + (i === st.tab ? ' is-active' : ''), t.n); b.type = 'button';
      b.addEventListener('click', function () { st.tab = i; st.row = 0; render(); }); tb.appendChild(b);
    });
    DI.$('#tabs').style.visibility = c.tabs ? '' : 'hidden';
    rowsEl.innerHTML = '';
    if (!c.tabs) {
      var box = DI.el('div', 'di-note', '<h4>Leave the island?</h4>Progress since your last rest at a campfire will be lost.');
      box.style.padding = '40px';
      var row = DI.el('div', 'di-modal__row'); row.style.cssText = 'margin-top:26px;justify-content:flex-start';
      var q = DI.el('button', 'di-obtn di-obtn--sm' + (st.row === 0 && st.zone === 'panel' ? ' is-focus' : ''), 'Quit'); q.type = 'button';
      var cn = DI.el('button', 'di-obtn di-obtn--sm' + (st.row === 1 && st.zone === 'panel' ? ' is-focus' : ''), 'Stay'); cn.type = 'button';
      q.addEventListener('click', function () { DI.toast('Quit is disabled in this prototype'); });
      cn.addEventListener('click', function () { st.zone = 'menu'; render(); });
      row.appendChild(q); row.appendChild(cn); box.appendChild(row); rowsEl.appendChild(box); return;
    }
    cur().rows.forEach(function (r, i) {
      if (r.t === 'note') { rowsEl.appendChild(DI.el('div', 'di-note', '<h4>' + r.h + '</h4>' + r.body)); return; }
      var el = DI.el('div', 'di-set' + (st.zone === 'panel' && st.row === i ? ' is-focus' : ''));
      var lab = '<div class="di-set__label">' + r.label + (r.sub ? '<small>' + r.sub + '</small>' : '') + '</div>';
      var ctl = '';
      if (r.t === 'toggle') ctl = '<div class="di-toggle' + (S[r.k] ? ' is-on' : '') + '"></div>';
      else if (r.t === 'seg') ctl = '<div class="di-seg"><i class="chev" data-d="-1"></i><span>' + (S[r.k] || r.opts[0]) + '</span><i class="chev r" data-d="1"></i></div>';
      else { var pct = (S[r.k] - r.min) / (r.max - r.min) * 100; ctl = '<div class="di-slider"><div class="di-slider__bar"><div class="di-slider__fill" style="width:' + pct + '%"></div><div class="di-slider__knob" style="left:' + pct + '%"></div></div><b>' + fmt(r) + '</b></div>'; }
      el.innerHTML = lab + ctl;
      el.addEventListener('mouseenter', function () { if (st.zone !== 'panel' || st.row !== i) { st.zone = 'panel'; st.row = i; render(true); } });
      el.addEventListener('click', function (e) {
        st.zone = 'panel'; st.row = i;
        var d = e.target.closest('[data-d]'), bar = e.target.closest('.di-slider__bar');
        if (r.t === 'seg') adjust(r, d ? +d.getAttribute('data-d') : 1);
        else if (r.t === 'slider' && bar) { var rc = bar.getBoundingClientRect(), k = DI.clamp((e.clientX - rc.left) / rc.width, 0, 1); S[r.k] = Math.round((r.min + k * (r.max - r.min)) / r.step) * r.step; save(); }
        else if (r.t === 'toggle') adjust(r, 1);
        render(true);
      });
      rowsEl.appendChild(el);
    });
  }
  function adjust(r, dir) {
    if (r.t === 'toggle') S[r.k] = !S[r.k];
    else if (r.t === 'seg') { var i = r.opts.indexOf(S[r.k] || r.opts[0]); S[r.k] = r.opts[(i + dir + r.opts.length) % r.opts.length]; }
    else S[r.k] = DI.clamp(S[r.k] + dir * r.step, r.min, r.max);
    save();
  }
  function save() { DI.saveSettings(); }

  function render() {
    placeWheel(); renderPanel();
    DI.$('#status').textContent = st.zone === 'menu' ? '' : 'Changes are saved automatically';
  }

  // ---- input -----------------------------------------------------------------------------------------------
  function enterPanel() { var f = focusables(); if (!CATS[st.cat].tabs) { st.zone = 'panel'; st.row = 0; } else if (f.length) { st.zone = 'panel'; st.row = f[0]; } render(); }
  DI.onAction(function (a) {
    if (a === 'lb') { DI.shoulder('settings', -1); return true; }
    if (a === 'rb') { DI.shoulder('settings', 1); return true; }
    var c = CATS[st.cat];
    if ((a === 'lt' || a === 'rt') && c.tabs) { st.tab = (st.tab + (a === 'rt' ? 1 : -1) + c.tabs.length) % c.tabs.length; var f = focusables(); st.row = f.length ? f[0] : 0; render(); return true; }
    if (a === 'x') { var t = cur(); if (t) { var d = DI.SETTINGS_DEFAULT; t.rows.forEach(function (r) { if (r.k) S[r.k] = d[r.k]; }); save(); DI.toast('Defaults restored for this tab'); render(); } return true; }
    if (a === 'back' || a === 'menu') { if (st.zone === 'panel') { st.zone = 'menu'; render(); } else DI.go('hud'); return true; }
    if (st.zone === 'menu') {
      var n = CATS.length;
      if (a === 'up') { st.cat = (st.cat - 1 + n) % n; st.tab = 0; render(); }
      else if (a === 'down') { st.cat = (st.cat + 1) % n; st.tab = 0; render(); }
      else if (a === 'confirm' || a === 'right') enterPanel();
      return true;
    }
    // panel zone
    if (!c.tabs) { if (a === 'left' || a === 'right') { st.row = st.row ? 0 : 1; render(); } else if (a === 'confirm') { if (st.row === 0) DI.toast('Quit is disabled in this prototype'); else { st.zone = 'menu'; render(); } } return true; }
    var fs = focusables(), idx = fs.indexOf(st.row), r = cur().rows[st.row];
    if (a === 'up') { if (idx > 0) st.row = fs[idx - 1]; render(); }
    else if (a === 'down') { if (idx < fs.length - 1) st.row = fs[idx + 1]; render(); }
    else if (a === 'left') { if (r && r.t !== 'toggle') adjust(r, -1); else if (r) adjust(r, -1); render(); }
    else if (a === 'right') { if (r) adjust(r, 1); render(); }
    else if (a === 'confirm') { if (r) adjust(r, 1); render(); }
    return true;
  });

  DI.init(); render();
}());
