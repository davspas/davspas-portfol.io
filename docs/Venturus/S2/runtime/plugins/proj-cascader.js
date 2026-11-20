/* proj-cascader.js */
/* Plugin component: Cascader (multi-column, data-driven drilldown picker) */
/*
 * Generalized from the Manage Infrastructure single-purpose destination cascader. Unlike that
 * one, this is fully data-driven (no global dataset, no hidden <select> source of truth):
 *   - `columns` declares the number of levels AND each level's selection mode.
 *   - `getOptions(level, path)` supplies each column's data on demand.
 *   - A single-select column closes the popup ONLY when it is the last column.
 *   - A multi-select column never closes the popup on toggle.
 * Programmatic API mirrors proj-multi-select: ProjCascader.create(target, options).
 */
(function() {
  'use strict';

  // Instance registry — keyed by element
  var instances = new Map();

  // ── Helpers ──────────────────────────────────────────────────

  function resolveEl(target) {
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function escapeHtml(value) {
    if (value == null) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
  function escapeAttr(value) { return escapeHtml(value); }

  function columnIndex(inst, level) {
    for (var i = 0; i < inst.columns.length; i++) {
      if (inst.columns[i].level === level) return i;
    }
    return -1;
  }

  /** Default value object for a set of columns (single → null, multi → []). */
  function blankValue(columns) {
    var v = {};
    columns.forEach(function(c) { v[c.level] = c.mode === 'multi' ? [] : null; });
    return v;
  }

  /** Coerce an arbitrary value object onto the current columns, preserving matching levels. */
  function normalizeValue(columns, value) {
    var v = blankValue(columns);
    if (!value) return v;
    columns.forEach(function(c) {
      if (value[c.level] == null) return;
      if (c.mode === 'multi') v[c.level] = Array.isArray(value[c.level]) ? value[c.level].slice() : [];
      else v[c.level] = value[c.level];
    });
    return v;
  }

  /** The selections of all columns to the left of `index` (drives getOptions). */
  function pathForColumn(inst, index) {
    var path = {};
    for (var i = 0; i < index; i++) {
      var c = inst.columns[i];
      path[c.level] = inst.value[c.level];
    }
    return path;
  }

  /** A column is reachable only if every single-select column to its left has a value. */
  function columnEnabled(inst, index) {
    for (var i = 0; i < index; i++) {
      var c = inst.columns[i];
      if (c.mode !== 'multi') {
        var val = inst.value[c.level];
        if (val == null || val === '') return false;
      }
    }
    return true;
  }

  function colOptions(inst, index) {
    var c = inst.columns[index];
    try { return inst.getOptions(c.level, pathForColumn(inst, index)) || []; }
    catch (_) { return []; }
  }

  function optionLabel(items, id) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) return items[i].label;
    }
    return null;
  }

  // ── Render ──────────────────────────────────────────────────

  function render(inst) {
    inst.el.classList.add('proj-cascader');
    inst.el.innerHTML = triggerHTML();
    inst.trigger = inst.el.querySelector('.proj-cascader__trigger');
    inst.triggerText = inst.el.querySelector('.proj-cascader__trigger-text');

    // (Re)build the popup and portal it to <body> so it escapes any ancestor's
    // overflow:hidden / containing block. Positioned with fixed coords from the trigger.
    if (inst.popup && inst.popup.parentElement) inst.popup.parentElement.removeChild(inst.popup);
    inst.popup = buildPopup(inst);
    document.body.appendChild(inst.popup);
    bindPopup(inst);

    paintTrigger(inst);
  }

  function triggerHTML() {
    return '<button type="button" class="proj-cascader__trigger">'
      + '<span class="proj-cascader__trigger-text"></span>'
      + '<span class="proj-cascader__caret">'
      +   '<sf-symbol name="chevron.down"></sf-symbol>'
      +   '<sf-symbol name="chevron.up"></sf-symbol>'
      + '</span>'
      + '</button>';
  }

  function buildPopup(inst) {
    var popup = document.createElement('div');
    popup.className = 'proj-cascader__popup';
    popup.setAttribute('hidden', '');
    var lastIndex = inst.columns.length - 1;
    popup.innerHTML = inst.columns.map(function(c, i) {
      var cls = 'proj-cascader__column'
        + (c.mode === 'multi' ? ' proj-cascader__column--multi' : '')
        + (i === lastIndex ? ' proj-cascader__column--leaf' : '');
      return '<div class="' + cls + '" data-level="' + escapeAttr(c.level) + '" data-index="' + i + '" data-empty="true"></div>';
    }).join('');
    return popup;
  }

  /** Repaint every column from the current value + getOptions. */
  function paintColumns(inst) {
    if (!inst.popup) return;
    inst.columns.forEach(function(c, i) {
      var columnEl = inst.popup.querySelector('.proj-cascader__column[data-index="' + i + '"]');
      if (!columnEl) return;
      if (!columnEnabled(inst, i)) { clearColumn(columnEl); return; }
      var items = colOptions(inst, i);
      if (c.mode === 'multi') renderMultiColumn(inst, columnEl, items, c, i);
      else renderSingleColumn(inst, columnEl, items, c, i);
    });
  }

  function renderSingleColumn(inst, columnEl, items, col, index) {
    if (!items.length) {
      columnEl.innerHTML = '<div class="proj-cascader__empty-state">Nothing to show</div>';
      columnEl.dataset.empty = 'false';
      return;
    }
    var activeId = inst.value[col.level];
    var isLeaf = index === inst.columns.length - 1;
    columnEl.dataset.empty = 'false';
    columnEl.innerHTML = items.map(function(item) {
      return '<div class="proj-cascader__option' + (item.id === activeId ? ' is-active' : '') + '"'
        + ' data-level="' + escapeAttr(col.level) + '" data-value="' + escapeAttr(item.id) + '">'
        + '<span>' + escapeHtml(item.label) + '</span>'
        + (isLeaf ? '' : '<span class="proj-cascader__option-arrow"><sf-symbol name="chevron.right"></sf-symbol></span>')
        + '</div>';
    }).join('');
  }

  function renderMultiColumn(inst, columnEl, items, col, index) {
    columnEl.dataset.empty = 'false';
    if (!items.length) {
      columnEl.innerHTML = '<div class="proj-cascader__empty-state">Nothing to show</div>';
      return;
    }
    var selected = inst.value[col.level] || [];
    var controls = '';
    if (col.showSelectAllControls !== false) {
      controls = '<div class="proj-cascader__controls">'
        + '<a href="#" class="proj-cascader__link proj-cascader__select-all" data-level="' + escapeAttr(col.level) + '">Select All</a>'
        + '<span class="proj-cascader__separator">|</span>'
        + '<a href="#" class="proj-cascader__link proj-cascader__select-none" data-level="' + escapeAttr(col.level) + '">None</a>'
        + '</div>';
    }
    var rows = items.map(function(item) {
      var checked = selected.indexOf(item.id) !== -1 ? ' checked' : '';
      return '<label class="checkbox proj-cascader__check-option">'
        + '<input type="checkbox" class="checkbox__input proj-cascader__cb" data-level="' + escapeAttr(col.level) + '" data-value="' + escapeAttr(item.id) + '"' + checked + '>'
        + '<span class="checkbox__box"></span>'
        + '<span class="checkbox__label">' + escapeHtml(item.label) + '</span>'
        + '</label>';
    }).join('');
    columnEl.innerHTML = controls + rows;
  }

  function clearColumn(columnEl) {
    columnEl.innerHTML = '';
    columnEl.dataset.empty = 'true';
  }

  // ── Trigger label ───────────────────────────────────────────

  function segmentFor(inst, index) {
    var col = inst.columns[index];
    if (col.mode === 'multi') {
      var sel = inst.value[col.level] || [];
      if (!sel.length) return { text: col.placeholder || 'Select', pending: true };
      var items = colOptions(inst, index);
      if (col.allLabel && items.length && sel.length >= items.length) return { text: col.allLabel, pending: false };
      // "N Noun(s) selected" when a countNoun is configured; otherwise a bare count.
      if (col.countNoun) {
        return { text: sel.length + ' ' + col.countNoun + (sel.length > 1 ? 's' : '') + ' selected', pending: false };
      }
      if (sel.length === 1) return { text: optionLabel(items, sel[0]) || '1 selected', pending: false };
      return { text: sel.length + ' selected', pending: false };
    }
    var val = inst.value[col.level];
    if (val == null || val === '') return { text: col.placeholder || 'Select', pending: true };
    return { text: optionLabel(colOptions(inst, index), val) || val, pending: false };
  }

  function paintTrigger(inst) {
    if (!inst.triggerText) return;

    var parts = [];
    for (var i = 0; i < inst.columns.length; i++) {
      if (!columnEnabled(inst, i)) break;      // further columns unreachable
      var seg = segmentFor(inst, i);
      parts.push(seg);
      if (seg.pending) break;                  // nothing chosen here yet → stop
    }

    var hasValue = parts.some(function(p) { return !p.pending; });
    if (!hasValue) {
      inst.triggerText.innerHTML = '<span class="proj-cascader__placeholder">' + escapeHtml(inst.placeholder) + '</span>';
      return;
    }
    inst.triggerText.innerHTML = parts.map(function(p) {
      return '<span class="' + (p.pending ? 'proj-cascader__path-pending' : 'proj-cascader__path') + '">' + escapeHtml(p.text) + '</span>';
    }).join(' <span class="proj-cascader__path">/</span> ');
  }

  // ── Selection ───────────────────────────────────────────────

  /** Key identifying a downstream sub-tree by the chain of single-select values 0..index. */
  function downstreamKey(inst, index) {
    var parts = [];
    for (var i = 0; i <= index; i++) {
      var c = inst.columns[i];
      if (c.mode !== 'multi') parts.push(c.level + '=' + (inst.value[c.level] == null ? '' : String(inst.value[c.level])));
    }
    return parts.join('|');
  }

  /** Snapshot the current value of every column right of `index` (for the current parent). */
  function rememberDownstream(inst, index) {
    var snapshot = {};
    for (var i = index + 1; i < inst.columns.length; i++) {
      var c = inst.columns[i];
      var v = inst.value[c.level];
      snapshot[c.level] = c.mode === 'multi' ? (v || []).slice() : (v != null ? v : null);
    }
    inst.memory[downstreamKey(inst, index)] = snapshot;
  }

  function blankDownstream(inst, index) {
    for (var i = index + 1; i < inst.columns.length; i++) {
      var c = inst.columns[i];
      inst.value[c.level] = c.mode === 'multi' ? [] : null;
    }
  }

  /** Restore a previously-remembered snapshot for the current parent, if any. */
  function restoreDownstream(inst, index) {
    var snap = inst.memory[downstreamKey(inst, index)];
    if (!snap) return;
    for (var i = index + 1; i < inst.columns.length; i++) {
      var c = inst.columns[i];
      if (!(c.level in snap)) continue;
      inst.value[c.level] = c.mode === 'multi' ? (snap[c.level] || []).slice() : (snap[c.level] != null ? snap[c.level] : null);
    }
  }

  function selectSingle(inst, level, id) {
    var index = columnIndex(inst, level);
    if (index === -1) return;
    var isLast = index === inst.columns.length - 1;

    // Re-selecting the active value changes nothing downstream.
    if (inst.value[level] === id) {
      if (isLast) closePopup(inst);
      return;
    }

    // Remember the current downstream picks under the OLD parent, switch, then restore
    // any picks previously remembered for the NEW parent (QOL: keep a sub-selection when
    // hopping between first-level items).
    rememberDownstream(inst, index);
    inst.value[level] = id;
    blankDownstream(inst, index);
    restoreDownstream(inst, index);

    if (isLast) {
      closePopup(inst);
    } else {
      paintColumns(inst);
      requestAnimationFrame(function() { adjustPopupPosition(inst); });
    }
    paintTrigger(inst);
    notifyChange(inst, { level: level, mode: 'single', closed: isLast });
  }

  function toggleMulti(inst, level, id, checked) {
    var arr = inst.value[level] || (inst.value[level] = []);
    var pos = arr.indexOf(id);
    if (checked && pos === -1) arr.push(id);
    else if (!checked && pos !== -1) arr.splice(pos, 1);
    // Checkbox visual state is native — only the trigger label needs repainting.
    paintTrigger(inst);
    notifyChange(inst, { level: level, mode: 'multi', closed: false });
  }

  function multiSelectAll(inst, level, all) {
    var index = columnIndex(inst, level);
    if (index === -1) return;
    var items = colOptions(inst, index);
    inst.value[level] = all ? items.map(function(it) { return it.id; }) : [];
    var columnEl = inst.popup.querySelector('.proj-cascader__column[data-index="' + index + '"]');
    if (columnEl) renderMultiColumn(inst, columnEl, items, inst.columns[index], index);
    paintTrigger(inst);
    notifyChange(inst, { level: level, mode: 'multi', closed: false });
  }

  // ── Popup show/hide + positioning ───────────────────────────

  function adjustPopupPosition(inst) {
    if (!inst.popup || !inst.trigger) return;
    if (inst.popup.hasAttribute('hidden')) return;

    var triggerRect = inst.trigger.getBoundingClientRect();
    var margin = 8;
    var gap = 4;
    var popupWidth = inst.popup.offsetWidth;
    var popupHeight = inst.popup.offsetHeight;
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;

    var left = triggerRect.left;
    var top = triggerRect.bottom + gap;

    if (left + popupWidth > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - popupWidth - margin);
    }
    if (left < margin) left = margin;

    if (top + popupHeight > viewportHeight - margin
        && triggerRect.top - gap - popupHeight > margin) {
      top = triggerRect.top - gap - popupHeight;
    }

    inst.popup.style.left = left + 'px';
    inst.popup.style.top = top + 'px';
  }

  function openPopup(inst) {
    if (!inst.popup) return;
    inst.popup.removeAttribute('hidden');
    if (inst.trigger) inst.trigger.classList.add('is-open');
    paintColumns(inst);
    requestAnimationFrame(function() { adjustPopupPosition(inst); });
  }

  function closePopup(inst) {
    if (!inst.popup) return;
    inst.popup.setAttribute('hidden', '');
    if (inst.trigger) inst.trigger.classList.remove('is-open');
  }

  function isOpen(inst) {
    return !!(inst.popup && !inst.popup.hasAttribute('hidden'));
  }

  function togglePopup(inst) {
    if (isOpen(inst)) closePopup(inst); else openPopup(inst);
  }

  // ── Event binding ───────────────────────────────────────────

  /** Popup listeners — rebound each time the popup is (re)built. */
  function bindPopup(inst) {
    inst.popup.addEventListener('click', function(e) {
      // Keep the popup open: stop the document-level outside-click handler.
      e.stopPropagation();

      var selAll = e.target.closest('.proj-cascader__select-all');
      if (selAll) { e.preventDefault(); multiSelectAll(inst, selAll.dataset.level, true); return; }
      var selNone = e.target.closest('.proj-cascader__select-none');
      if (selNone) { e.preventDefault(); multiSelectAll(inst, selNone.dataset.level, false); return; }

      var opt = e.target.closest('.proj-cascader__option');
      if (opt && opt.dataset.value !== undefined) {
        selectSingle(inst, opt.dataset.level, opt.dataset.value);
      }
    });

    inst.popup.addEventListener('change', function(e) {
      var cb = e.target.closest('.proj-cascader__cb');
      if (!cb) return;
      toggleMulti(inst, cb.dataset.level, cb.dataset.value, cb.checked);
    });
  }

  /** Container + document listeners — bound once at create (survive re-renders). */
  function bindContainer(inst) {
    inst.el.addEventListener('click', function(e) {
      var trig = e.target.closest('.proj-cascader__trigger');
      if (trig && inst.el.contains(trig)) {
        e.stopPropagation();
        togglePopup(inst);
      }
    });

    inst.outsideHandler = function(e) {
      if (inst.el.contains(e.target)) return;
      if (inst.popup && inst.popup.contains(e.target)) return;
      closePopup(inst);
    };
    document.addEventListener('click', inst.outsideHandler);

    inst.keyHandler = function(e) { if (e.key === 'Escape') closePopup(inst); };
    document.addEventListener('keydown', inst.keyHandler);

    inst.resizeHandler = function() { if (isOpen(inst)) adjustPopupPosition(inst); };
    window.addEventListener('resize', inst.resizeHandler);

    inst.scrollHandler = function(e) {
      if (!isOpen(inst)) return;
      if (inst.popup && inst.popup.contains(e.target)) return;
      adjustPopupPosition(inst);
    };
    document.addEventListener('scroll', inst.scrollHandler, true);
  }

  function notifyChange(inst, meta) {
    inst.onChange(getValueObject(inst), meta || {});
  }

  function getValueObject(inst) {
    var v = {};
    inst.columns.forEach(function(c) {
      if (c.mode === 'multi') v[c.level] = (inst.value[c.level] || []).slice();
      else v[c.level] = inst.value[c.level] != null ? inst.value[c.level] : null;
    });
    return v;
  }

  // ── Public API ──────────────────────────────────────────────

  function create(target, opts) {
    var el = resolveEl(target);
    if (!el) return null;
    if (instances.has(el)) destroy(el);

    opts = opts || {};
    var columns = (opts.columns || []).slice();
    var inst = {
      el: el,
      columns: columns,
      value: normalizeValue(columns, opts.value),
      getOptions: typeof opts.getOptions === 'function' ? opts.getOptions : function() { return []; },
      placeholder: opts.placeholder || 'Select…',
      onChange: opts.onChange || function() {},
      memory: {},   // remembered downstream sub-selections, keyed by parent path
      popup: null,
      trigger: null,
      triggerText: null
    };

    instances.set(el, inst);
    render(inst);
    bindContainer(inst);
    return inst;
  }

  /** Reconfigure columns (e.g. switching modes). Preserves values for surviving levels. */
  function setColumns(target, columns) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    inst.columns = (columns || []).slice();
    inst.value = normalizeValue(inst.columns, inst.value);
    closePopup(inst);
    render(inst);
  }

  /** Set the value object. Fires onChange unless opts.silent. */
  function setValue(target, value, opts) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    inst.value = normalizeValue(inst.columns, value);
    if (isOpen(inst)) paintColumns(inst);
    paintTrigger(inst);
    if (!(opts && opts.silent)) notifyChange(inst, { level: null, mode: null, closed: false });
  }

  function getValue(target) {
    var inst = instances.get(resolveEl(target));
    return inst ? getValueObject(inst) : null;
  }

  /** Update the empty-state placeholder shown when no value is selected. */
  function setPlaceholder(target, placeholder) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    inst.placeholder = placeholder || 'Select…';
    paintTrigger(inst);
  }

  /** Re-read getOptions and repaint (call after the underlying data changes). */
  function refresh(target) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    if (isOpen(inst)) paintColumns(inst);
    paintTrigger(inst);
  }

  function open(target) {
    var inst = instances.get(resolveEl(target));
    if (inst) openPopup(inst);
  }

  function close(target) {
    var inst = instances.get(resolveEl(target));
    if (inst) closePopup(inst);
  }

  function destroy(target) {
    var el = resolveEl(target);
    if (!el) return;
    var inst = instances.get(el);
    if (!inst) return;
    if (inst.outsideHandler) document.removeEventListener('click', inst.outsideHandler);
    if (inst.keyHandler) document.removeEventListener('keydown', inst.keyHandler);
    if (inst.resizeHandler) window.removeEventListener('resize', inst.resizeHandler);
    if (inst.scrollHandler) document.removeEventListener('scroll', inst.scrollHandler, true);
    if (inst.popup && inst.popup.parentElement) inst.popup.parentElement.removeChild(inst.popup);
    el.innerHTML = '';
    el.classList.remove('proj-cascader');
    instances.delete(el);
  }

  // ── Init (no-op; instances are created via .create()) ───────

  function init() {
    // Plugin uses programmatic instantiation.
    // Designers call ProjCascader.create(target, options) from their prototype JS.
  }

  window.ProjCascader = {
    init: init,
    create: create,
    setColumns: setColumns,
    setValue: setValue,
    getValue: getValue,
    setPlaceholder: setPlaceholder,
    refresh: refresh,
    open: open,
    close: close,
    destroy: destroy
  };
})();
