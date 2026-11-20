/* Dark Island: Faded Memories, prototype core: stage scaling, input (gamepad + keyboard + mouse), settings store, navigation. */
(function () {
  var DI = (window.DI = window.DI || {});
  var W = 1440, H = 1024;

  // ---- Settings (persisted) ------------------------------------------------
  var KEY = 'di.settings.v1';
  DI.settings = (function () {
    var s = Object.assign({}, DI.SETTINGS_DEFAULT || {});
    try { Object.assign(s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
    return s;
  }());
  DI.saveSettings = function () { try { localStorage.setItem(KEY, JSON.stringify(DI.settings)); } catch (e) {} };

  // ---- Loadout / equipment state (shared between HUD and Equipment) ------------
  var EKEY = 'di.equipment.v1';
  DI.equipment = (function () {
    var e = { slots: Object.assign({}, DI.DEFAULT_LOADOUT), owned: DI.ITEMS.map(function (i) { return i.id; }), loadout: 1 };
    try { var saved = JSON.parse(localStorage.getItem(EKEY) || 'null'); if (saved && saved.slots) e = saved; } catch (x) {}
    return e;
  }());
  DI.saveEquipment = function () { try { localStorage.setItem(EKEY, JSON.stringify(DI.equipment)); } catch (e) {} };
  DI.item = function (id) { for (var i = 0; i < DI.ITEMS.length; i++) if (DI.ITEMS[i].id === id) return DI.ITEMS[i]; return null; };
  DI.resetEquipment = function () { try { localStorage.removeItem(EKEY); } catch (e) {} };

  // ---- Helpers -------------------------------------------------------------------
  DI.$ = function (s, r) { return (r || document).querySelector(s); };
  DI.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  DI.el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  DI.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  // ---- Stage scaling -----------------------------------------------------------------
  DI.fit = function () {
    var st = DI.$('.di-stage'); if (!st) return;
    var panel = document.body.classList.contains('has-demo') ? 268 : 0; // room for the demo panel so nothing overlaps the stage
    var bar = 54; // top strip reserved for the buttons
    var avail = window.innerWidth - panel, availH = window.innerHeight - bar;
    var s = Math.min(avail / W, availH / H);
    st.style.left = (avail / 2) + 'px';
    st.style.top = (bar + availH / 2) + 'px';
    st.style.transform = 'scale(' + s + ')';
    DI.scale = s;
    st.classList.add('is-ready');
  };
  window.addEventListener('resize', DI.fit);

  // ---- Input -----------------------------------------------------------------------------
  var handlers = [];
  DI.onAction = function (fn) { handlers.push(fn); return function () { handlers = handlers.filter(function (h) { return h !== fn; }); }; };
  var captured = null; // modal handler takes priority
  DI.capture = function (fn) { captured = fn; };
  DI.release = function () { captured = null; };
  DI.dispatch = function (a, ev) {
    if (captured) { captured(a, ev); return; }
    for (var i = handlers.length - 1; i >= 0; i--) { if (handlers[i](a, ev) === true) break; }
  };
  function setDevice(d) { if (document.body.dataset.device !== d) document.body.dataset.device = d; }

  var KEYMAP = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right',
    Enter: 'confirm', ' ': 'confirm', Escape: 'back', Backspace: 'back', x: 'x', q: 'lb', e: 'rb', z: 'lt', c: 'rt', Tab: 'menu'
  };
  window.addEventListener('keydown', function (ev) {
    if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
    var a = KEYMAP[ev.key] || KEYMAP[(ev.key || '').toLowerCase()];
    if (!a) return;
    ev.preventDefault(); setDevice('kb'); DI.dispatch(a, ev);
  });
  window.addEventListener('mousemove', function () { if (document.body.dataset.device === 'pad') setDevice('kb'); }, { passive: true });

  // Gamepad polling
  var prev = {}, repeatAt = {};
  var PAD = { 0: 'confirm', 1: 'back', 2: 'x', 4: 'lb', 5: 'rb', 6: 'lt', 7: 'rt', 9: 'menu', 12: 'up', 13: 'down', 14: 'left', 15: 'right' };
  function poll() {
    var pads = navigator.getGamepads ? navigator.getGamepads() : [];
    var now = performance.now();
    for (var p = 0; p < pads.length; p++) {
      var gp = pads[p]; if (!gp) continue;
      var down = {};
      Object.keys(PAD).forEach(function (b) { if (gp.buttons[b] && gp.buttons[b].pressed) down[PAD[b]] = true; });
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      if (ax > .6) down.right = true; if (ax < -.6) down.left = true; if (ay > .6) down.down = true; if (ay < -.6) down.up = true;
      Object.keys(down).forEach(function (a) {
        var isNav = a === 'up' || a === 'down' || a === 'left' || a === 'right';
        if (!prev[a]) { setDevice('pad'); DI.dispatch(a); repeatAt[a] = now + 380; }
        else if (isNav && now > repeatAt[a]) { DI.dispatch(a); repeatAt[a] = now + 110; }
      });
      prev = down;
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);
  window.addEventListener('gamepadconnected', function () { setDevice('pad'); });

  // ---- Navigation ----------------------------------------------------------------------------
  DI.go = function (screen) {
    document.body.classList.add('is-leaving');
    setTimeout(function () { location.href = '../' + screen + '/'; }, 230);
  };
  // Header tab order: map <-> equipment <-> settings
  DI.MENU_ORDER = ['map', 'equipment', 'settings'];
  DI.shoulder = function (current, dir) {
    var n = DI.MENU_ORDER.length, i = (DI.MENU_ORDER.indexOf(current) + dir + n) % n; // ring: map, equipment, settings
    var t = DI.MENU_ORDER[i];
    if (t === 'map') { DI.toast('The Map screen has not been designed yet'); return true; }
    DI.go(t); return true;
  };
  var toastEl, toastT;
  DI.toast = function (msg) {
    if (!toastEl) { toastEl = DI.el('div', 'toast'); (DI.$('.di-stage') || document.body).appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2200);
  };

  // ---- Chrome outside the stage (back link, fullscreen, rotate note) ------------------------------
  DI.chrome = function () {
    var lang = 'en'; try { lang = localStorage.getItem('lang') || 'en'; } catch (e) {}
    var pt = lang === 'pt';
    var back = DI.el('a', 'di-back', '<i></i>' + (pt ? '← Voltar ao portfólio' : '← Back to portfolio'));
    back.href = '../../../../../';
    var bar = DI.el('div', 'di-chrome'); document.body.appendChild(bar);
    if (!/\/hud\/?(index\.html)?$/.test(location.pathname)) {
      var hud = DI.el('a', 'di-back di-hudback', '<i></i>' + (pt ? '← Voltar ao HUD' : '← Return to HUD'));
      hud.href = '../hud/';
      hud.addEventListener('click', function (e) { e.preventDefault(); DI.go('hud'); });
      bar.appendChild(hud);
    }
    bar.appendChild(back);
    var fs = DI.el('button', 'di-fs', pt ? 'Tela cheia' : 'Fullscreen');
    fs.type = 'button';
    fs.addEventListener('click', function () {
      if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
    });
    bar.appendChild(fs);
    document.body.appendChild(DI.el('div', 'di-rotate', pt ? 'Melhor em uma tela maior. Gire o aparelho.' : 'Best on a larger screen. Rotate your device.'));
  };

  // ---- Shared header (equipment / settings) ------------------------------------------------------
  DI.header = function (opts) {
    // opts: current ('equipment'|'settings'), left, right (labels), title
    var h = DI.el('header', 'di-top');
    h.innerHTML =
      '<button class="di-continue" type="button" data-act="continue"><span class="di-continue__tri"></span><span class="di-continue__orb"><i></i></span><span class="t">Continue</span></button>' +
      '<nav class="di-nav">' +
        '<button class="di-nav__side" type="button" data-act="lb">' + opts.left + '</button>' +
        '<span class="di-cap di-cap--l" data-pad="LB" data-kb="Q"></span>' +
        '<h1>' + opts.title + '</h1>' +
        '<span class="di-cap di-cap--r" data-pad="RB" data-kb="E"></span>' +
        '<button class="di-nav__side" type="button" data-act="rb">' + opts.right + '</button>' +
      '</nav>' +
      '<div class="di-hints">' +
        '<span class="di-hint"><i class="di-key" data-pad="A" data-kb="Enter"></i>Select</span>' +
        '<span class="di-hint"><i class="di-key" data-pad="B" data-kb="Esc"></i>Return</span>' +
        '<span class="di-hint"><i class="di-key" data-pad="X" data-kb="X"></i>' + (opts.xLabel || 'Drop') + '</span>' +
      '</div>';
    h.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      var a = b.getAttribute('data-act');
      if (a === 'continue') DI.go('hud'); else if (a === 'lb') DI.dispatch('lb'); else if (a === 'rb') DI.dispatch('rb');
    });
    return h;
  };

  // ---- Stat arrow helper ----------------------------------------------------------------------------------
  DI.arrow = function (v, base) { return '<i class="st ' + (base == null || v === base ? 'same' : v > base ? 'up' : 'down') + '"></i>'; };

  DI.init = function () { DI.fit(); DI.chrome(); };
}());
