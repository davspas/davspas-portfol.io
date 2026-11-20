/* Pan and zoom viewer for large design boards: wheel or pinch to zoom, drag to pan, + / - / 0 / Esc. */
(function () {
  var zv = document.createElement('div');
  zv.className = 'zv'; zv.setAttribute('role', 'dialog'); zv.setAttribute('aria-modal', 'true'); zv.setAttribute('aria-label', 'Image viewer');
  zv.innerHTML = '<button class="x" type="button" aria-label="Close">×</button><div class="cap"></div><div class="stage"><img alt=""></div><div class="bar"><button type="button" data-z="out" aria-label="Zoom out">−</button><span class="pct">100%</span><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="fit">Fit</button><button type="button" data-z="1">100%</button></div>';
  document.body.appendChild(zv);
  var st = zv.querySelector('.stage'), im = st.querySelector('img'), pct = zv.querySelector('.pct'), cap = zv.querySelector('.cap');
  var s = 1, x = 0, y = 0, fit = 1, ptr = {}, last = null;
  function apply() { im.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; pct.textContent = Math.round(s * 100) + '%'; }
  function clamp() { var w = im.naturalWidth * s, h = im.naturalHeight * s, W = st.clientWidth, H = st.clientHeight; x = w <= W ? (W - w) / 2 : Math.min(60, Math.max(W - w - 60, x)); y = h <= H ? (H - h) / 2 : Math.min(60, Math.max(H - h - 60, y)); }
  function zoomAt(f, cx, cy) { var n = Math.min(Math.max(s * f, fit * .5), 4); f = n / s; x = cx - (cx - x) * f; y = cy - (cy - y) * f; s = n; clamp(); apply(); }
  function doFit() { fit = Math.min(st.clientWidth / im.naturalWidth, st.clientHeight / im.naturalHeight, 1); s = fit; clamp(); apply(); }
  function open(src, alt, text) { im.onload = function () { doFit(); }; im.src = src; im.alt = alt || ''; cap.textContent = text || ''; zv.classList.add('open'); document.documentElement.style.overflow = 'hidden'; if (im.complete && im.naturalWidth) doFit(); }
  function close() { zv.classList.remove('open'); document.documentElement.style.overflow = ''; }
  document.querySelectorAll('[data-full]').forEach(function (b) {
    b.addEventListener('click', function () { var f = b.closest('figure'), c = f && f.querySelector('figcaption'); open(b.getAttribute('data-full'), (b.querySelector('img') || {}).alt, c ? c.textContent : ''); });
  });
  zv.querySelector('.x').addEventListener('click', close);
  zv.querySelector('.bar').addEventListener('click', function (e) { var z = e.target.getAttribute('data-z'); if (!z) return; var cx = st.clientWidth / 2, cy = st.clientHeight / 2; if (z === 'in') zoomAt(1.4, cx, cy); else if (z === 'out') zoomAt(1 / 1.4, cx, cy); else if (z === 'fit') doFit(); else { s = 1; x = cx - im.naturalWidth / 2; y = cy - im.naturalHeight / 2; clamp(); apply(); } });
  st.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0015)), e.clientX, e.clientY); }, { passive: false });
  st.addEventListener('pointerdown', function (e) { st.setPointerCapture(e.pointerId); ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; st.classList.add('drag'); last = null; });
  st.addEventListener('pointermove', function (e) {
    var p = ptr[e.pointerId]; if (!p) return; var ids = Object.keys(ptr);
    if (ids.length === 2) { var o = ptr[ids.find(function (k) { return +k !== e.pointerId; })], d0 = Math.hypot(p.x - o.x, p.y - o.y); p.x = e.clientX; p.y = e.clientY; var d1 = Math.hypot(p.x - o.x, p.y - o.y); if (d0) zoomAt(d1 / d0, (p.x + o.x) / 2, (p.y + o.y) / 2); return; }
    x += e.clientX - p.x; y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; clamp(); apply();
  });
  function up(e) { delete ptr[e.pointerId]; if (!Object.keys(ptr).length) st.classList.remove('drag'); }
  st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
  st.addEventListener('dblclick', function (e) { if (s > fit * 1.05) doFit(); else zoomAt(2.5, e.clientX, e.clientY); });
  addEventListener('resize', function () { if (zv.classList.contains('open')) doFit(); });
  addEventListener('keydown', function (e) { if (!zv.classList.contains('open')) return; var cx = st.clientWidth / 2, cy = st.clientHeight / 2; if (e.key === 'Escape') close(); else if (e.key === '+' || e.key === '=') zoomAt(1.4, cx, cy); else if (e.key === '-') zoomAt(1 / 1.4, cx, cy); else if (e.key === '0') doFit(); });
})();
