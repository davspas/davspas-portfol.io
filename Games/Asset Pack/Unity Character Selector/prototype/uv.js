(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---- fit the 2000 x 1293 editor to the window ---- */
  var ed = $('#ed');
  function fit() { var s = Math.min(innerWidth / 2000, innerHeight / 1293); ed.style.position = 'absolute'; ed.style.left = '50%'; ed.style.top = '50%'; ed.style.transform = 'translate(-50%,-50%) scale(' + s + ')'; }
  addEventListener('resize', fit); fit();

  /* ---- state ---- */
  var PARTS = ['Skin', 'Hair', 'Armor', 'Arms', 'Hands', 'Pants', 'Shoes', 'Weapon'];
  var DEF = { Skin: '#efc6a0', Hair: '#1ab5c4', Armor: '#8b1a1a', Arms: '#222222', Hands: '#8b1a1a', Pants: '#34497a', Shoes: '#6e3b28', Weapon: '#7a3535' };
  var KEY = 'uv.colors.v1';
  var st = { n: 4, views: ['front', 'back'], anim: true, kind: 'Idle', colors: Object.assign({}, DEF), sprites: true, name: 'Character Name' };
  try { var sv = JSON.parse(localStorage.getItem(KEY)); if (sv) Object.assign(st.colors, sv); } catch (e) {}
  var DIR = { front: 0, right: 90, back: 180, left: -90 };
  var EIGHT = [0, 45, 90, 135, 180, -135, -90, -45];

  /* ---- 3D block character, drawn as SVG ---- */
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; function c(v) { return Math.max(0, Math.min(255, Math.round(v * f))); } return 'rgb(' + c(r) + ',' + c(g) + ',' + c(b) + ')'; }
  function boxes(t, kind) {
    var C = st.colors, s = Math.sin(t * 2), w = kind === 'Walk' ? Math.sin(t * 7) : 0, a = kind === 'Attack' ? Math.sin(t * 6) : 0, bob = kind === 'Idle' ? Math.sin(t * 2.4) * 1.2 : (kind === 'Walk' ? Math.abs(Math.sin(t * 7)) * 2 : 0);
    var armL = kind === 'Walk' ? -w * 8 : s * 1, armR = kind === 'Walk' ? w * 8 : s * -1, swing = kind === 'Attack' ? a * 18 : 0, lift = kind === 'Attack' ? (a > 0 ? a * 10 : 0) : 0;
    var L = [
      { x: -9, y: 7, z: kind === 'Walk' ? w * 8 : 0, w: 14, h: 34, d: 14, c: C.Pants, n: 'legL' },
      { x: 9, y: 7, z: kind === 'Walk' ? -w * 8 : 0, w: 14, h: 34, d: 14, c: C.Pants, n: 'legR' },
      { x: -9, y: 0, z: 2 + (kind === 'Walk' ? w * 8 : 0), w: 14, h: 8, d: 20, c: C.Shoes },
      { x: 9, y: 0, z: 2 + (kind === 'Walk' ? -w * 8 : 0), w: 14, h: 8, d: 20, c: C.Shoes },
      { x: 0, y: 40 + bob, z: 0, w: 36, h: 36, d: 20, c: C.Armor },
      { x: 0, y: 78 + bob, z: 0, w: 24, h: 24, d: 24, c: C.Skin, head: 1 },
      { x: 0, y: 98 + bob, z: 0, w: 26, h: 8, d: 26, c: C.Hair },
      { x: 0, y: 80 + bob, z: -11, w: 26, h: 20, d: 6, c: C.Hair },
      { x: -13, y: 82 + bob, z: 0, w: 4, h: 14, d: 26, c: C.Hair },
      { x: 13, y: 82 + bob, z: 0, w: 4, h: 14, d: 26, c: C.Hair },
      { x: -23, y: 46 + bob, z: armL, w: 10, h: 30, d: 11, c: C.Arms },
      { x: -23, y: 38 + bob, z: armL, w: 10, h: 8, d: 11, c: C.Hands },
      { x: 23, y: 46 + bob, z: armR + swing * .4, w: 10, h: 30, d: 11, c: C.Arms },
      { x: 23, y: 38 + bob, z: armR + swing * .5 + 2, w: 10, h: 8, d: 11, c: C.Hands },
      { x: 24, y: 36 + bob + lift * .4, z: armR + 8 + swing, w: 5, h: 52, d: 5, c: C.Weapon },
      { x: 24, y: 42 + bob + lift * .4, z: armR + 8 + swing, w: 16, h: 4, d: 5, c: C.Weapon }
    ];
    return L;
  }
  function fillOf(c, f) { return c.charAt(0) === '#' ? shade(c, f) : c; }
  function charSvg(deg, t, kind, crop) {
    var th = deg * Math.PI / 180, co = Math.cos(th), si = Math.sin(th), B = boxes(t, kind), out = [];
    B.forEach(function (b) { var rx = b.x * co + b.z * si, rz = -b.x * si + b.z * co; b._rx = rx; b._rz = rz; });
    B.sort(function (p, q) { return p._rz - q._rz || p.y - q.y; });
    B.forEach(function (b) {
      var y0 = -(b.y + b.h), faces = [];
      /* z faces (front / back) */
      [1, -1].forEach(function (sg) {
        var nz = sg * co; if (nz <= 0.001) return;
        var wd = b.w * Math.abs(co), cx = b._rx + sg * (b.d / 2) * si; if (wd < .4) return;
        faces.push({ x: cx - wd / 2, w: wd, f: sg > 0 ? 1 : .8, front: sg > 0 });
      });
      [1, -1].forEach(function (sg) {
        var nz = -sg * si; if (nz <= 0.001) return;
        var wd = b.d * Math.abs(si), cx = b._rx + sg * (b.w / 2) * co; if (wd < .4) return;
        faces.push({ x: cx - wd / 2, w: wd, f: .66 });
      });
      faces.forEach(function (fc) {
        out.push('<rect x="' + fc.x.toFixed(2) + '" y="' + y0.toFixed(2) + '" width="' + fc.w.toFixed(2) + '" height="' + b.h + '" fill="' + fillOf(b.c, fc.f) + '" stroke="rgba(0,0,0,.28)" stroke-width=".5"/>');
        if (b.head && fc.front) { out.push('<rect x="' + (fc.x + fc.w * .22).toFixed(2) + '" y="' + (y0 + 9) + '" width="' + (fc.w * .14).toFixed(2) + '" height="4" fill="#2a1d18"/><rect x="' + (fc.x + fc.w * .64).toFixed(2) + '" y="' + (y0 + 9) + '" width="' + (fc.w * .14).toFixed(2) + '" height="4" fill="#2a1d18"/>'); }
      });
    });
    return out.join('');
  }

  /* ---- Character View layout ---- */
  var stage = $('#stageSvg');
  function placed(deg, cx, cy, sc, t) { return '<g transform="translate(' + cx.toFixed(1) + ' ' + cy.toFixed(1) + ') scale(' + sc + ')">' + charSvg(deg, t, st.kind, 0) + '</g>'; }
  function renderStage(t) {
    if (!st.sprites) { stage.innerHTML = ''; return; }
    var parts = [], tt = st.anim ? t : 0.0, kind = st.anim ? st.kind : 'Idle';
    st.kindEff = kind;
    var degs;
    if (st.n === 8) degs = EIGHT; else if (st.n === 4) degs = [0, 90, 180, -90]; else degs = st.views.map(function (v) { return DIR[v]; });
    if (st.n === 1) parts.push(placed(degs[0], 247, 268, 2.15, tt));
    else if (st.n === 2) { var pair = degs.slice(0, 2); if (pair.length === 1) pair.push(pair[0]); parts.push(placed(pair[0], 160, 264, 1.85, tt), placed(pair[1], 334, 264, 1.85, tt)); }
    else {
      var rx = st.n === 8 ? 170 : 160, ry = st.n === 8 ? 88 : 78, cy = st.n === 8 ? 170 : 168, sc = st.n === 8 ? .86 : 1.12;
      degs.map(function (d) { var r = d * Math.PI / 180; return { d: d, x: 247 + Math.sin(r) * rx, y: cy + Math.cos(r) * ry + 48 * sc }; })
        .sort(function (a, b) { return a.y - b.y; }).forEach(function (p) { parts.push(placed(p.d, p.x, p.y, sc, tt)); });
    }
    stage.innerHTML = parts.join('');
  }
  function renderAvatar(t) {
    var el = $('#avatar'); if (!st.sprites) { el.innerHTML = ''; return; }
    el.innerHTML = '<rect width="110" height="110" fill="#2c2c2c"/><g transform="translate(55 128) scale(1.9)">' + charSvg(0, st.anim ? t : 0, 'Idle', 0) + '</g>';
  }

  var t0 = performance.now(), dirty = true, last = 0;
  function frame(now) {
    var t = (now - t0) / 1000;
    if (st.anim || dirty) { if (now - last > 30) { last = now; renderStage(t); renderAvatar(t); dirty = false; } }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  var redraw = function () { dirty = true; };

  /* ---- panel controls ---- */
  $$('.sh .fold').forEach(function (b) { b.addEventListener('click', function () { var sec = b.closest('.sec'), o = sec.getAttribute('data-open') === '1'; sec.setAttribute('data-open', o ? '0' : '1'); b.setAttribute('aria-expanded', String(!o)); }); });

  function syncViews() {
    var one = st.n === 1, two = st.n === 2;
    $$('#views button').forEach(function (b) { b.disabled = !(one || two); b.classList.toggle('on', (one || two) && st.views.indexOf(b.dataset.v) > -1); });
  }
  $$('#poses button').forEach(function (b) {
    b.addEventListener('click', function () {
      st.n = +b.dataset.n; if (st.n === 1) st.views = st.views.slice(0, 1); if (st.n === 2 && st.views.length < 2) st.views.push(st.views[0] === 'front' ? 'back' : 'front');
      $$('#poses button').forEach(function (x) { x.classList.toggle('on', x === b); }); syncViews(); redraw();
    });
  });
  $$('#views button').forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.dataset.v, i = st.views.indexOf(v);
      if (st.n === 1) st.views = [v];
      else if (i > -1) { if (st.views.length > 1) st.views.splice(i, 1); }
      else { st.views.push(v); if (st.views.length > 2) st.views.shift(); }
      syncViews(); redraw();
    });
  });
  syncViews();
  $('#anim').addEventListener('change', function (e) { st.anim = e.target.checked; $('#animSel').disabled = !st.anim; redraw(); });
  $('#animSel').addEventListener('change', function (e) { st.kind = e.target.value; redraw(); });

  var EYE = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2.5l3.5 3.5M9 4l3 3-6.5 6.5H2.5V10.5zM8.5 5.5l2 2"/></svg>';
  var host = $('#colors');
  PARTS.forEach(function (p) {
    var row = document.createElement('div'); row.className = 'crow';
    row.innerHTML = '<label for="c' + p + '" data-info="Change the ' + p + ' color">' + p + '</label><div class="cswatch"><div class="cbar" data-info="Change the ' + p + ' color"><input type="color" id="c' + p + '"></div><button class="eye" type="button" aria-label="Pick ' + p + ' color from screen" data-info="Change the ' + p + ' color">' + EYE + '</button></div>';
    host.appendChild(row);
    var inp = $('input', row), bar = $('.cbar', row);
    function paint() { inp.value = st.colors[p]; bar.style.background = st.colors[p]; }
    paint(); row._paint = paint;
    inp.addEventListener('input', function () { st.colors[p] = inp.value; paint(); redraw(); });
    $('.eye', row).addEventListener('click', function () {
      if (window.EyeDropper) { new EyeDropper().open().then(function (r) { st.colors[p] = r.sRGBHex; paint(); redraw(); }).catch(function () {}); } else inp.click();
    });
  });
  function paintAll() { $$('.crow').forEach(function (r) { r._paint(); }); redraw(); }

  /* ---- info box: hover a field to read about it ---- */
  var DEFAULT = 'Hover on a field to view information about it';
  document.addEventListener('mouseover', function (e) { var t = e.target.closest('[data-info]'); if (!t) return; var sec = t.closest('.sec'); var tx = sec && $('.info .tx', sec); if (tx) tx.textContent = t.getAttribute('data-info'); });
  document.addEventListener('mouseout', function (e) { var t = e.target.closest('[data-info]'); if (!t) return; var sec = t.closest('.sec'), tx = sec && $('.info .tx', sec); if (tx) tx.textContent = DEFAULT; });
  document.addEventListener('focusin', function (e) { var t = e.target.closest('[data-info]'); var sec = t && t.closest('.sec'), tx = sec && $('.info .tx', sec); if (tx) tx.textContent = t.getAttribute('data-info'); });

  /* ---- toast + files ---- */
  var tt;
  function toast(m) { var el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(tt); tt = setTimeout(function () { el.classList.remove('on'); }, 2200); }
  function spritesOn(on) { st.sprites = on; $('#empty').hidden = on; redraw(); }

  /* Files are simulated: nothing is read from or written to the user's computer. */
  $('#bUpload').addEventListener('click', function () { spritesOn(true); toast('Prefab loaded (simulated). In Unity this opens a file picker.'); });
  $('#bCreate').addEventListener('click', function () { toast('Prefab created from the current view (simulated). In Unity this saves a prefab asset.'); });
  $('#bImport').addEventListener('click', function () { spritesOn(true); toast('Sprites imported (simulated). In Unity this opens a file picker.'); });
  $('#bOpen').addEventListener('click', function () { toast('In Unity this opens the sprites in your file viewer or sprite editor.'); });
  $('#bClear').addEventListener('click', function () { spritesOn(false); toast('All sprites cleared. Use Import to bring them back.'); });
  $('#bExport').addEventListener('click', function () { toast(st.sprites ? 'Sprites exported (simulated). In Unity this writes a sprites file.' : 'Nothing to export. Import sprites first.'); });
  $('#bReset').addEventListener('click', function () { st.colors = Object.assign({}, DEF); paintAll(); toast('Colors reset to default.'); });
  $('#bSave').addEventListener('click', function () { try { localStorage.setItem(KEY, JSON.stringify(st.colors)); toast('Colors saved for this project.'); } catch (e) { toast('Could not save in this browser.'); } });
  $('#cname').addEventListener('input', function (e) { st.name = e.target.value; });
  $('#play').addEventListener('click', function (e) { e.currentTarget.classList.toggle('on'); });
  $('#play').addEventListener('mouseenter', function () {});
  syncViews(); spritesOn(true);
})();
