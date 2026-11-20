(function () {
  var DI = window.DI, E = DI.equipment;
  var stage = DI.$('#stage');
  var st = { tab: 0, zone: 'list', row: 0, slot: 'I-a', pendingSlot: null, pendingItem: null, dropId: null };

  // header
  stage.appendChild(DI.header({ current: 'equipment', left: 'MAP', right: 'SETTINGS', title: 'EQUIPMENT', xLabel: 'Drop' }));

  // ---- static ornaments -------------------------------------------------------------------
  var left = DI.$('#left');
  [['Load-out III', 180, 214], ['Load-out II', 410, 214], ['Load-out I', 642, 214], ['Items', 181, 580], ['Armor', 641, 580]].forEach(function (l) {
    var e = DI.el('div', 'eq-label', l[0]); e.style.left = l[1] + 'px'; e.style.top = l[2] + 'px'; left.appendChild(e);
  });
  var dp = DI.el('div', 'eq-dpad', '<img src="../img/ui/ref/directionals.svg" alt="">');
  dp.style.left = '181px'; dp.style.top = '785px'; left.appendChild(dp);
  var ring = DI.el('div', 'eq-ring'); ring.style.left = '641px'; ring.style.top = '785px'; left.appendChild(ring);

  // ---- slots ----------------------------------------------------------------------------------
  var slotEls = {};
  var slotsBox = DI.$('#slots');
  DI.SLOTS.forEach(function (s) {
    var d = DI.el('div', 'di-slot', '<div class="di-slot__face"></div>');
    d.style.left = s.x + 'px'; d.style.top = s.y + 'px'; d.setAttribute('data-slot', s.id);
    d.addEventListener('mouseenter', function () { st.zone = 'slots'; st.slot = s.id; render(); });
    d.addEventListener('click', function () { st.zone = 'slots'; st.slot = s.id; act(); });
    slotsBox.appendChild(d); slotEls[s.id] = d;
  });
  function slotDef(id) { return DI.SLOTS.filter(function (s) { return s.id === id; })[0]; }

  // ---- list -----------------------------------------------------------------------------------------
  var listEl = DI.$('#list');
  function items() { return DI.ITEMS.filter(function (i) { return i.type === DI.TABS[st.tab].id && E.owned.indexOf(i.id) > -1; }); }
  function equippedCount(id) { return Object.keys(E.slots).filter(function (k) { return E.slots[k] === id; }).length; }
  function compat(item, slotId) { var s = slotDef(slotId); return s && item.type === s.kind; }

  DI.TABS.forEach(function (t, i) {
    var b = DI.el('button', 'di-tab', t.label); b.type = 'button';
    b.addEventListener('click', function () { st.tab = i; st.row = 0; st.zone = 'list'; render(); });
    DI.$('#tabBtns').appendChild(b);
  });

  function renderList() {
    var its = items();
    st.row = DI.clamp(st.row, 0, Math.max(0, its.length - 1));
    listEl.innerHTML = '';
    its.forEach(function (it, i) {
      var inc = st.pendingSlot && !compat(it, st.pendingSlot);
      var r = DI.el('div', 'di-row' + (st.zone === 'list' && i === st.row ? ' is-focus' : '') + (inc ? ' is-incompatible' : ''));
      var eq = equippedCount(it.id);
      var lvl = it.type === 'item' ? '' : '<span class="di-row__lvl"><span class="coin"></span>LVL <i class="st up"></i><b>' + it.lvl + '</b></span>';
      r.innerHTML = '<img class="di-row__ico ' + (it.glyph ? 'glyph' : '') + '" src="' + DI.ICON[it.icon] + '" alt="">' +
        '<span class="di-row__name">' + it.name + '</span>' + (eq ? '<span class="di-row__eq">E' + (eq > 1 ? '×' + eq : '') + '</span>' : '') + lvl;
      r.addEventListener('mouseenter', function () { if (st.zone !== 'list' || st.row !== i) { st.zone = 'list'; st.row = i; render(true); } });
      r.addEventListener('click', function () { st.zone = 'list'; st.row = i; act(); });
      listEl.appendChild(r);
    });
    if (!its.length) listEl.appendChild(DI.el('div', 'di-note', '<h4>Empty</h4>Nothing in this tab yet.'));
    DI.$$('.di-tab').forEach(function (t, i) { t.classList.toggle('is-active', i === st.tab); });
  }
  function scrollRow() { var f = DI.$('.di-row.is-focus', listEl); if (f) { var top = f.offsetTop, h = listEl.clientHeight; if (top < listEl.scrollTop + 6) listEl.scrollTop = top - 6; else if (top + 55 > listEl.scrollTop + h - 10) listEl.scrollTop = top + 55 - h + 10; } }

  // ---- slots render ---------------------------------------------------------------------------------------
  function renderSlots() {
    DI.SLOTS.forEach(function (s) {
      var d = slotEls[s.id], it = DI.item(E.slots[s.id]);
      d.firstChild.innerHTML = it ? '<img class="' + (it.glyph ? 'glyph' : '') + '" src="' + DI.ICON[it.icon] + '" alt="">' : '';
      var cls = 'di-slot';
      if (!it) cls += ' is-empty';
      if (st.zone === 'slots' && st.slot === s.id) cls += ' is-focus';
      if (st.pendingSlot === s.id) cls += ' is-selected';
      if (st.pendingItem) { var pi = DI.item(st.pendingItem); if (compat(pi, s.id)) cls += ' is-pending'; else cls += ' is-dim'; }
      d.className = cls;
    });
  }

  // ---- stats ------------------------------------------------------------------------------------------------------
  function totals() {
    var atk = 0, def = 0, crit = 0, n = 0;
    Object.keys(E.slots).forEach(function (k) { var it = DI.item(E.slots[k]); if (!it) return; atk += it.atk; def += it.def; if (slotDef(k).kind === 'weapon') { crit += it.crit; n++; } });
    return { atk: Math.min(9999, 7000 + atk * 5), def: Math.min(9999, 6500 + def * 5), crit: Math.min(100, Math.round(55 + (n ? crit / n : 0) * .45)) };
  }
  function renderStats() {
    var t = totals();
    DI.$('#stats').innerHTML = '<div>' + t.atk + '<small>Total ATK</small></div><div>' + t.def + '<small>Total DEF</small></div><div>' + t.crit + '%<small>Avg CRIT</small></div>';
  }

  // ---- tooltips ---------------------------------------------------------------------------------------------------------
  function handsInfo(it) {
    if (!it.hands) return '';
    var two = DI.ICON.handTwo, one = DI.ICON.handOne;
    if (it.hands === 'both') return '<img src="' + two + '" alt=""> Needs both hands';
    if (it.hands === 'either') return '<img src="' + one + '" alt=""><img src="' + one + '" alt=""> Either Hand';
    return '<img src="' + one + '" alt=""> One hand';
  }
  function tip(it, base, top, left, tag) {
    var d = DI.el('div', 'di-tip');
    d.style.left = left + 'px'; d.style.top = top + 'px';
    var b = base || null;
    function a(v, bv) { return b ? DI.arrow(v, bv) : '<i class="st same"></i>'; }
    var stats = it.type === 'weapon' || it.type === 'armor' ?
      '<div class="di-tip__stats"><span>ATK ' + a(it.atk, b && b.atk) + '<b>' + it.atk + '</b></span><span>DEF ' + a(it.def, b && b.def) + '<b>' + it.def + '</b></span><span>CRIT ' + a(it.crit, b && b.crit) + '<b>' + it.crit + '%</b></span></div>' : '';
    d.innerHTML = (tag ? '<span class="di-tip__tag">' + tag + '</span>' : '') +
      '<div class="di-tip__head"><div class="di-slot di-tip__ico is-selected"><div class="di-slot__face"><img class="' + (it.glyph ? 'glyph' : '') + '" src="' + DI.ICON[it.icon] + '" alt=""></div></div>' +
      '<div class="di-tip__main"><div class="di-tip__name">' + it.name + '</div><div class="di-tip__meta"><div class="di-tip__lvl">' + it.lvl + ' ' + (b ? DI.arrow(it.lvl, b.lvl) : '') + '<small>Level</small></div><div class="di-tip__hands">' + handsInfo(it) + '</div></div></div></div>' +
      '<div class="di-tip__rule"></div>' + stats + '<p class="di-tip__desc">' + it.desc + '</p>';
    return d;
  }
  function firstEquippedOfKind(kind) { var s = DI.SLOTS.filter(function (x) { return x.kind === kind; }); for (var i = 0; i < s.length; i++) { var it = DI.item(E.slots[s[i].id]); if (it) return it; } return null; }
  function renderTips() {
    var box = DI.$('#tips'); box.innerHTML = '';
    var dim = false;
    if (st.zone === 'list') {
      var it = items()[st.row]; if (!it) { left.classList.remove('is-dim'); return; }
      if (st.pendingSlot) {
        var cur = DI.item(E.slots[st.pendingSlot]);
        if (cur) box.appendChild(tip(cur, null, 213, 344, 'Equipped'));
        box.appendChild(tip(it, cur, cur ? 587 : 213, 344, cur ? 'Candidate' : ''));
      } else {
        box.appendChild(tip(it, firstEquippedOfKind(it.type), 209, 344));
      }
      dim = true;
    } else {
      var sl = DI.item(E.slots[st.slot]);
      if (sl) { box.appendChild(tip(sl, null, 214, 840, slotDef(st.slot).group)); }
    }
    left.classList.toggle('is-dim', dim);
  }

  function setStatus() {
    var s = DI.$('#status');
    s.textContent = st.pendingItem ? 'Choose a slot for ' + DI.item(st.pendingItem).name + '.  B to cancel' : st.pendingSlot ? 'Choose an item to put in this slot.  B to cancel' : '';
  }

  function render(noScroll) {
    renderList(); renderSlots(); renderStats(); renderTips(); setStatus(); if (!noScroll) scrollRow();
  }

  // ---- actions ---------------------------------------------------------------------------------------------------------------------
  function equip(slotId, itemId) { E.slots[slotId] = itemId; DI.saveEquipment(); DI.toast(DI.item(itemId).name + ' equipped'); st.pendingSlot = st.pendingItem = null; }
  function act() {
    if (st.zone === 'slots') {
      if (st.pendingItem) {
        var pi = DI.item(st.pendingItem);
        if (compat(pi, st.slot)) { equip(st.slot, st.pendingItem); st.zone = 'list'; }
        else DI.toast('That slot takes ' + slotDef(st.slot).kind + 's');
      } else if (st.pendingSlot === st.slot) { st.pendingSlot = null; }
      else { st.pendingSlot = st.slot; st.tab = DI.TABS.map(function (t) { return t.id; }).indexOf(slotDef(st.slot).kind); var cur = E.slots[st.slot]; var its = items(); st.row = Math.max(0, its.map(function (i) { return i.id; }).indexOf(cur)); st.zone = 'list'; }
    } else {
      var it = items()[st.row]; if (!it) return;
      if (it.type === 'item') { DI.toast('Key items can’t be equipped'); }
      else if (st.pendingSlot) { if (compat(it, st.pendingSlot)) { equip(st.pendingSlot, it.id); } else DI.toast('This does not fit that slot'); }
      else { st.pendingItem = it.id; var first = DI.SLOTS.filter(function (s) { return s.kind === it.type; })[0]; st.slot = first.id; st.zone = 'slots'; }
    }
    render();
  }
  function cancel() { if (st.pendingItem || st.pendingSlot) { st.pendingItem = st.pendingSlot = null; render(); return true; } return false; }
  function openDrop(it) {
    st.dropId = it.id; DI.$('#mTitle').textContent = 'Drop ' + it.name + '?'; DI.$('#mBody').textContent = 'It will be lost and cannot be recovered.';
    DI.$('#modal').classList.add('is-open');
    DI.capture(function (a) { if (a === 'confirm') confirmDrop(); else if (a === 'back') closeModal(); });
  }
  function closeModal() { DI.$('#modal').classList.remove('is-open'); DI.release(); }
  function confirmDrop() {
    var id = st.dropId; E.owned = E.owned.filter(function (x) { return x !== id; });
    Object.keys(E.slots).forEach(function (k) { if (E.slots[k] === id) E.slots[k] = null; });
    DI.saveEquipment(); closeModal(); DI.toast('Dropped'); render();
  }
  DI.$('#mOk').addEventListener('click', confirmDrop); DI.$('#mNo').addEventListener('click', closeModal);

  // ---- spatial navigation between slots ---------------------------------------------------------------------------------------------
  function moveSlot(dir) {
    var cur = slotDef(st.slot), best = null, bd = 1e9;
    DI.SLOTS.forEach(function (s) {
      if (s.id === cur.id) return;
      var dx = s.x - cur.x, dy = s.y - cur.y;
      var ok = dir === 'left' ? dx < -10 : dir === 'right' ? dx > 10 : dir === 'up' ? dy < -10 : dy > 10;
      if (!ok) return;
      var main = (dir === 'left' || dir === 'right') ? Math.abs(dx) : Math.abs(dy), cross = (dir === 'left' || dir === 'right') ? Math.abs(dy) : Math.abs(dx);
      var d = main + cross * 2.2; if (d < bd) { bd = d; best = s; }
    });
    return best;
  }

  DI.onAction(function (a) {
    if (a === 'lb') { DI.shoulder('equipment', -1); return true; }
    if (a === 'rb') { DI.shoulder('equipment', 1); return true; }
    if (a === 'lt' || a === 'rt') { st.tab = (st.tab + (a === 'rt' ? 1 : -1) + DI.TABS.length) % DI.TABS.length; st.row = 0; st.zone = 'list'; st.pendingItem = null; if (st.pendingSlot && DI.TABS[st.tab].id !== slotDef(st.pendingSlot).kind) st.pendingSlot = null; render(); return true; }
    if (a === 'back' || a === 'menu') { if (!cancel()) DI.go('hud'); return true; }
    if (a === 'confirm') { act(); return true; }
    if (a === 'x') {
      if (st.zone === 'list') { var it = items()[st.row]; if (it) openDrop(it); }
      else { if (E.slots[st.slot]) { E.slots[st.slot] = null; DI.saveEquipment(); DI.toast('Unequipped'); render(); } }
      return true;
    }
    if (st.zone === 'list') {
      if (a === 'up') { st.row = Math.max(0, st.row - 1); render(); }
      else if (a === 'down') { st.row = Math.min(items().length - 1, st.row + 1); render(); }
      else if (a === 'left') { st.zone = 'slots'; render(); }
      return true;
    }
    if (st.zone === 'slots') {
      var n = moveSlot(a);
      if (n) { st.slot = n.id; render(); }
      else if (a === 'right') { st.zone = 'list'; render(); }
      return true;
    }
  });

  // Hovering the list's empty area keeps tooltip; leaving the stage clears nothing.
  DI.init(); render();
}());
