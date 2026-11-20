(function () {
  var DI = window.DI, S = DI.settings;
  var stage = DI.$('#stage');
  var state = { day: true, boss: 70, sta: 96, mag: 92, hp: 56, coins: 99999999, loadout: DI.equipment.loadout || 1, npcTargeted: true, npcHp: 100 };

  // ---- Scene + fx --------------------------------------------------------------------
  var layers = DI.$$('.hud-scene .layer');
  function setScene(day, instant) {
    state.day = day;
    var url = 'url("../img/background-' + (day ? 'day' : 'night') + '.jpg")';
    layers.forEach(function (l) { if (!instant) l.style.opacity = 0; });
    setTimeout(function () { layers.forEach(function (l) { l.style.backgroundImage = url; l.style.opacity = 1; }); }, instant ? 0 : 280);
  }
  function applyFx() {
    var sc = DI.$('#scene');
    sc.style.setProperty('--ab', (S.aberration / 100 * 3.2).toFixed(2));
    sc.style.setProperty('--scan', (S.scanlines / 100).toFixed(2));
    document.documentElement.style.setProperty('--hud-scale', S.hudScale / 100);
    DI.$('#hud').style.transform = S.hudScale === 100 ? '' : 'scale(' + (S.hudScale / 100) + ')';
    DI.$('#hud').style.transformOrigin = '50% 50%';
  }


  // ---- Weapon cluster --------------------------------------------------------------------
  // Column x centres per active load-out (stage px). Layout 1 is measured from Wireframe - 49.svg; 2 and 3 keep the same spacing.
  var COLX = { 1: [59.5, 115.5, 163], 2: [59.5, 111.5, 167.5], 3: [59.5, 107, 159] };
  var ROWS_ACTIVE = [782, 846], ROWS_SMALL = [806, 854], TAG_Y = 767;
  var cluster = DI.$('#cluster');
  var tag = DI.el('div', 'tag', '<img src="../img/ui/ref/dpad-right.svg" alt="D-pad right: switch load-out" title="D-pad right: switch load-out">'); cluster.appendChild(tag);
  tag.addEventListener('click', function () { nextLoadout(); });
  var cells = [];
  [['I-a', 0, 0], ['I-b', 0, 1], ['II-a', 1, 0], ['II-b', 1, 1], ['III-a', 2, 0], ['III-b', 2, 1]].forEach(function (c) {
    var d = DI.el('div', 'di-slot'); d.innerHTML = '<div class="di-slot__face"></div>'; cluster.appendChild(d);
    cells.push({ el: d, slot: c[0], col: c[1], row: c[2] });
  });
  function layoutCluster() {
    var act = state.loadout - 1; // active column index
    var xs = COLX[state.loadout];
    cells.forEach(function (c) {
      var isAct = c.col === act;
      c.el.style.left = xs[c.col] + 'px';
      c.el.style.top = (isAct ? ROWS_ACTIVE : ROWS_SMALL)[c.row] + 'px';
      c.el.className = 'di-slot' + (isAct ? ' is-active' : ' di-slot--sm');
      var it = DI.item(DI.equipment.slots[c.slot]);
      var face = c.el.firstChild;
      face.innerHTML = it ? '<img class="' + (it.glyph ? 'glyph' : '') + '" src="' + DI.ICON[it.icon] + '" alt="">' : '';
      if (!it) c.el.classList.add('is-empty');
      if (it && it.icon === 'shield' && !isAct) c.el.classList.add('is-disabled');
    });
    tag.style.left = xs[(act + 1) % 3] + 'px';
    tag.style.top = TAG_Y + 'px';
  }

  // ---- Bars, coins, notifications ---------------------------------------------------------------
  function bars() {
    DI.$('#bossFill').style.width = state.boss + '%';
    DI.$('#staFill').style.width = state.sta + '%';
    DI.$('#magFill').style.width = state.mag + '%';
    DI.$('#hpFill').style.width = state.hp + '%';
    DI.$('#npcFill').style.width = state.npcHp + '%';
  }
  function wake() {
    DI.$('#hud').classList.remove('is-faded');
    clearTimeout(wake.t);
    if (S.hudFade) wake.t = setTimeout(function () { DI.$('#hud').classList.add('is-faded'); }, 6000);
  }
  function floatDmg(x, y, n) {
    if (!S.damageNumbers) return;
    var d = DI.el('div', 'dmg', n); d.style.left = x + 'px'; d.style.top = y + 'px'; DI.$('#hud').appendChild(d);
    setTimeout(function () { d.remove(); }, 1200);
  }
  var NOTE_TEXT = ['Key of Success', 'Amber Flask', 'Faded Memory', 'Rusted Sigil', 'Pale Dirk'];
  var noteN = 0;
  function pickup() {
    var box = DI.$('#notes');
    var n = DI.el('div', 'note', NOTE_TEXT[noteN++ % NOTE_TEXT.length] + ' added to the Inventory');
    box.appendChild(n);
    while (box.children.length > 5) box.firstChild.remove();
    setTimeout(function () { n.classList.add('is-out'); setTimeout(function () { n.remove(); }, 500); }, 4200);
  }
  function addCoins() {
    var from = state.coins, to = from + 1250, t0 = performance.now(), box = DI.$('#coinBox');
    box.classList.add('is-pulse'); setTimeout(function () { box.classList.remove('is-pulse'); }, 520);
    (function tick(now) {
      var k = Math.min(1, (now - t0) / 700);
      state.coins = Math.round(from + (to - from) * k);
      DI.$('#coins').textContent = state.coins;
      if (k < 1) requestAnimationFrame(tick);
    }(t0));
  }
  var subT;
  function say() {
    if (!S.subtitles) { DI.toast && DI.toast('Subtitles are turned off in Settings'); return; }
    var sb = DI.$('#subtitle'); sb.textContent = '“The sea gave this island back to us. It did not give back what we lost.”'; sb.classList.add('is-on');
    clearTimeout(subT); subT = setTimeout(function () { sb.classList.remove('is-on'); }, 3800);
  }

  function nextLoadout() { state.loadout = state.loadout % 3 + 1; DI.equipment.loadout = state.loadout; DI.saveEquipment(); layoutCluster(); wake(); }

  // ---- Demo panel ----------------------------------------------------------------------------------------
  var ACTIONS = [
    ['Hit boss', function () { state.boss = Math.max(0, state.boss - 12); floatDmg(300, 100, 1280 + Math.round(Math.random() * 400)); }],
    ['Heal boss', function () { state.boss = Math.min(100, state.boss + 15); }],
    ['Spend stamina', function () { state.sta = state.sta > 25 ? state.sta - 22 : 96; }],
    ['Cast spell', function () { state.mag = state.mag > 25 ? state.mag - 20 : 92; }],
    ['Take damage', function () { state.hp = state.hp > 15 ? state.hp - 14 : 56; floatDmg(220, 940, 240); }],
    ['Pick up item', pickup],
    ['Gain coins', addCoins],
    ['Day / Night', function () { setScene(!state.day); }],
    ['Switch load-out (D-pad →)', nextLoadout],
    ['Target NPC', function () { state.npcTargeted = !state.npcTargeted; DI.$('#npcB').classList.toggle('is-idle', !state.npcTargeted); }],
    ['Hit NPC', function () { state.npcHp = state.npcHp > 20 ? state.npcHp - 20 : 100; floatDmg(1000, 500, 520); }],
    ['NPC speaks', say],
    ['Open Equipment', function () { DI.go('equipment'); }],
    ['Open Settings', function () { DI.go('settings'); }]
  ];
  var row = DI.$('#demoRow');
  ACTIONS.forEach(function (a, i) {
    var b = DI.el('button', '', (i < 9 ? (i + 1) + ' · ' : '') + a[0]); b.type = 'button';
    b.addEventListener('click', function () { a[1](); bars(); wake(); }); row.appendChild(b);
  });
  var demo = DI.$('#demo');
  function toggleDemo() {
    var open = demo.classList.toggle('is-open');
    document.body.classList.toggle('has-demo', open);
    DI.$('#demoToggle').setAttribute('aria-expanded', open);
    DI.fit();
  }
  DI.$('#demoToggle').addEventListener('click', toggleDemo);
  DI.$('#demoClose').addEventListener('click', toggleDemo);
  window.addEventListener('keydown', function (e) {
    if (e.key === '?' || e.key === 'F2' || (e.key === '/' && e.shiftKey)) { e.preventDefault(); toggleDemo(); return; }
    if (/^[1-9]$/.test(e.key) && !e.metaKey && !e.ctrlKey) { var a = ACTIONS[+e.key - 1]; if (a) { a[1](); bars(); wake(); } }
  });
  ['mousemove', 'keydown', 'pointerdown'].forEach(function (ev) { window.addEventListener(ev, wake, { passive: true }); });

  // ---- Menu --------------------------------------------------------------------------------------------------------
  DI.onAction(function (a) {
    if (a === 'back' || a === 'menu') { DI.go('equipment'); return true; }
    if (a === 'right') { nextLoadout(); return true; } // D-pad right (or Right arrow / D) switches the load-out
  });

  DI.init(); DI.$('.di-chrome').appendChild(DI.$('#demoToggle')); applyFx(); setScene(true, true); layoutCluster(); bars(); wake();
  // initial notifications so the first screen looks alive, as in the wireframe
  pickup(); setTimeout(pickup, 500);
}());
