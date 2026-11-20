/* proj-multi-select.js */
/* Plugin component: Multi-Select (flat + tree modes) */

(function() {
  'use strict';

  // Instance registry — keyed by element
  var instances = new Map();

  // ── Helpers ──────────────────────────────────────────────────

  function resolveEl(target) {
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /** Walk tree items, calling fn(item, parent) for every node */
  function walkTree(items, fn, parent) {
    items.forEach(function(item) {
      fn(item, parent || null);
      if (item.children && item.children.length) walkTree(item.children, fn, item);
    });
  }

  /** Get all leaf IDs (in flat mode all items are leaves) */
  function getAllLeafIds(inst) {
    var ids = [];
    if (inst.mode === 'flat') {
      inst.items.forEach(function(it) { ids.push(it.id); });
    } else {
      walkTree(inst.items, function(it) {
        if (!it.children || !it.children.length) ids.push(it.id);
      });
    }
    return ids;
  }

  /** Tree: get all descendant leaf IDs of a node */
  function getDescendantLeafIds(node) {
    var ids = [];
    if (!node.children || !node.children.length) {
      ids.push(node.id);
      return ids;
    }
    walkTree(node.children, function(it) {
      if (!it.children || !it.children.length) ids.push(it.id);
    });
    return ids;
  }

  /** Tree: find node by id */
  function findNode(items, id) {
    var found = null;
    walkTree(items, function(it) { if (!found && it.id === id) found = it; });
    return found;
  }

  // ── Render ──────────────────────────────────────────────────

  function render(inst) {
    inst.el.classList.add('proj-multi-select');
    inst.el.innerHTML = renderTrigger(inst) + renderDropdown(inst);
    if (inst.isOpen) {
      inst.el.classList.add('proj-multi-select--open');
      inst.el.querySelector('.proj-multi-select__dropdown').classList.add('proj-multi-select__dropdown--open');
      positionDropdown(inst);
    }
    scheduleOverflowCheck(inst);
  }

  function renderTrigger(inst) {
    return '<div class="proj-multi-select__trigger">'
      + '<div class="proj-multi-select__content">'
      +   '<div class="proj-multi-select__tags">' + renderTags(inst) + '</div>'
      + '</div>'
      + '</div>';
  }

  function renderTags(inst) {
    if (inst.selected.size === 0) {
      return '<span class="proj-multi-select__placeholder">' + escapeHTML(inst.placeholder) + '</span>';
    }

    var allLeafIds = getAllLeafIds(inst);
    var allSelected = allLeafIds.length > 0 && allLeafIds.every(function(id) { return inst.selected.has(id); });

    if (allSelected) {
      return pillHTML(inst.allLabel, '__all__', null);
    }

    // Render ALL pills — overflow handling is done after layout via checkTagOverflow()
    var tagList = computeTagList(inst);
    return tagList.map(function(tag) {
      return pillHTML(tag.label, tag.id, tag.type);
    }).join('');
  }

  function pillHTML(label, id, tagType) {
    var typeAttr = tagType ? ' data-tag-type="' + tagType + '"' : '';
    return '<span class="pill pill--blue">'
      + '<span class="pill__label">' + escapeHTML(label) + '</span>'
      + '<button class="pill__close proj-multi-select__tag-close" data-id="' + escapeHTML(id) + '"' + typeAttr + ' aria-label="Remove ' + escapeHTML(label) + '">'
      +   '<sf-symbol name="xmark" style="font-size:14px"></sf-symbol>'
      + '</button>'
      + '</span>';
  }

  /** Compute the list of tags to display. Tree mode consolidates parent if all children selected. */
  function computeTagList(inst) {
    if (inst.mode === 'flat') {
      var tags = [];
      inst.items.forEach(function(it) {
        if (inst.selected.has(it.id)) tags.push({ id: it.id, label: it.label, type: 'leaf' });
      });
      return tags;
    }

    // Tree mode
    var tags = [];
    var consumedLeafIds = new Set();

    inst.items.forEach(function(parent) {
      if (!parent.children || !parent.children.length) {
        // Top-level leaf
        if (inst.selected.has(parent.id)) tags.push({ id: parent.id, label: parent.label, type: 'leaf' });
        return;
      }
      var leafIds = getDescendantLeafIds(parent);
      var allChildrenSelected = leafIds.length > 0 && leafIds.every(function(id) { return inst.selected.has(id); });

      if (allChildrenSelected) {
        tags.push({ id: parent.id, label: parent.label, type: 'parent' });
        leafIds.forEach(function(id) { consumedLeafIds.add(id); });
      }
    });

    // Add individual leaf tags for partially-selected parents
    walkTree(inst.items, function(it) {
      if (it.children && it.children.length) return;
      if (inst.selected.has(it.id) && !consumedLeafIds.has(it.id)) {
        tags.push({ id: it.id, label: it.label, type: 'leaf' });
      }
    });

    return tags;
  }

  function renderDropdown(inst) {
    var html = '<div class="proj-multi-select__dropdown">';

    if (inst.searchable) {
      html += '<div class="proj-multi-select__search">'
        + '<input type="text" class="form-input proj-multi-select__search-input" placeholder="Search…" value="' + escapeHTML(inst.searchTerm) + '">'
        + '</div>';
    }

    if (inst.showSelectAllControls) {
      html += '<div class="proj-multi-select__controls">'
        + '<a href="#" class="proj-multi-select__link proj-multi-select__select-all">Select All</a>'
        + '<span class="proj-multi-select__separator">|</span>'
        + '<a href="#" class="proj-multi-select__link proj-multi-select__select-none">None</a>'
        + '</div>';
    }

    html += '<div class="proj-multi-select__list">' + renderList(inst) + '</div>';
    html += '</div>';
    return html;
  }

  function renderList(inst) {
    var visibleItems = filterItems(inst);
    if (visibleItems.length === 0) return '<div class="proj-multi-select__empty">No matches</div>';

    if (inst.mode === 'flat') {
      return visibleItems.map(function(it) { return renderFlatRow(inst, it); }).join('');
    }
    return visibleItems.map(function(it) { return renderTreeNode(inst, it); }).join('');
  }

  function renderFlatRow(inst, item) {
    var checked = inst.selected.has(item.id) ? ' checked' : '';
    var suffix = item.suffixHTML ? item.suffixHTML : '';
    return '<label class="checkbox">'
      + '<input type="checkbox" class="checkbox__input proj-multi-select__cb" data-id="' + escapeHTML(item.id) + '"' + checked + '>'
      + '<span class="checkbox__box"></span>'
      + '<span class="checkbox__label">' + escapeHTML(item.label) + '</span>'
      + suffix
      + '</label>';
  }

  function renderTreeNode(inst, node) {
    var hasChildren = node.children && node.children.length > 0;
    var isExpanded = inst.expandedNodes.has(node.id);
    var nodeClass = 'proj-multi-select__node' + (isExpanded ? ' proj-multi-select__node--expanded' : '');

    var checkedState = computeNodeCheckedState(inst, node);
    var checkedAttr = checkedState === 'checked' ? ' checked' : '';
    var indeterminate = checkedState === 'indeterminate';

    var toggleClass = 'proj-multi-select__node-toggle';
    if (!hasChildren) toggleClass += ' proj-multi-select__node-toggle--leaf';
    if (isExpanded) toggleClass += ' proj-multi-select__node-toggle--expanded';

    var html = '<div class="' + nodeClass + '" data-node-id="' + escapeHTML(node.id) + '">';
    html += '<div class="proj-multi-select__node-header">';
    html += '<button class="' + toggleClass + '" data-toggle-id="' + escapeHTML(node.id) + '" aria-label="Toggle">'
      +   '<sf-symbol name="chevron.right" style="font-size:10px"></sf-symbol>'
      + '</button>';
    html += '<label class="checkbox">'
      + '<input type="checkbox" class="checkbox__input proj-multi-select__cb" data-id="' + escapeHTML(node.id) + '"' + checkedAttr + (indeterminate ? ' data-indeterminate="true"' : '') + '>'
      + '<span class="checkbox__box"></span>'
      + '<span class="checkbox__label">' + escapeHTML(node.label) + '</span>'
      + '</label>';
    html += '</div>';

    if (hasChildren) {
      html += '<div class="proj-multi-select__node-children">';
      node.children.forEach(function(child) { html += renderTreeNode(inst, child); });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  function computeNodeCheckedState(inst, node) {
    if (!node.children || !node.children.length) {
      return inst.selected.has(node.id) ? 'checked' : 'unchecked';
    }
    var leafIds = getDescendantLeafIds(node);
    var checkedCount = 0;
    leafIds.forEach(function(id) { if (inst.selected.has(id)) checkedCount++; });
    if (checkedCount === 0) return 'unchecked';
    if (checkedCount === leafIds.length) return 'checked';
    return 'indeterminate';
  }

  /** Filter items by search term — preserves tree structure */
  function filterItems(inst) {
    var term = inst.searchTerm.toLowerCase().trim();
    if (!term) return inst.items;

    if (inst.mode === 'flat') {
      return inst.items.filter(function(it) { return it.label.toLowerCase().indexOf(term) !== -1; });
    }

    function filterNode(node) {
      var matchesSelf = node.label.toLowerCase().indexOf(term) !== -1;
      if (!node.children || !node.children.length) return matchesSelf ? node : null;
      var matchedChildren = node.children.map(filterNode).filter(Boolean);
      if (matchesSelf || matchedChildren.length > 0) {
        return Object.assign({}, node, { children: matchedChildren.length ? matchedChildren : node.children });
      }
      return null;
    }
    return inst.items.map(filterNode).filter(Boolean);
  }

  // ── Event binding ───────────────────────────────────────────

  function bindEvents(inst) {
    inst.el.addEventListener('click', function(e) { handleClick(inst, e); });
    inst.el.addEventListener('change', function(e) { handleChange(inst, e); });
    inst.el.addEventListener('input', function(e) { handleInput(inst, e); });

    inst.outsideHandler = function(e) {
      if (!inst.el.contains(e.target)) closeDropdown(inst);
    };
    document.addEventListener('click', inst.outsideHandler);

    inst.resizeHandler = function() {
      scheduleOverflowCheck(inst);
      positionDropdown(inst);
    };
    window.addEventListener('resize', inst.resizeHandler);

    inst.scrollHandler = function(e) {
      var dd = inst.el.querySelector('.proj-multi-select__dropdown');
      if (inst.isOpen && !(dd && dd.contains(e.target))) positionDropdown(inst);
    };
    window.addEventListener('scroll', inst.scrollHandler, true);
  }

  function handleClick(inst, e) {
    var tagClose = e.target.closest('.proj-multi-select__tag-close');
    if (tagClose) {
      e.preventDefault();
      e.stopPropagation();
      handleTagRemove(inst, tagClose.getAttribute('data-id'), tagClose.getAttribute('data-tag-type'));
      return;
    }

    var toggleBtn = e.target.closest('.proj-multi-select__node-toggle');
    if (toggleBtn && !toggleBtn.classList.contains('proj-multi-select__node-toggle--leaf')) {
      e.preventDefault();
      e.stopPropagation();
      toggleNode(inst, toggleBtn.getAttribute('data-toggle-id'));
      return;
    }

    if (e.target.closest('.proj-multi-select__select-all')) {
      e.preventDefault();
      selectAll(inst, true);
      return;
    }
    if (e.target.closest('.proj-multi-select__select-none')) {
      e.preventDefault();
      selectAll(inst, false);
      return;
    }

    if (e.target.closest('.proj-multi-select__trigger')) {
      if (inst.disabled) return;
      e.stopPropagation();
      toggleDropdown(inst);
    }
  }

  function handleChange(inst, e) {
    var cb = e.target.closest('.proj-multi-select__cb');
    if (!cb) return;
    handleCheckbox(inst, cb.getAttribute('data-id'), cb.checked);
  }

  function handleInput(inst, e) {
    var input = e.target.closest('.proj-multi-select__search-input');
    if (!input) return;
    inst.searchTerm = input.value;
    var listEl = inst.el.querySelector('.proj-multi-select__list');
    if (listEl) listEl.innerHTML = renderList(inst);
    syncIndeterminateStates(inst);
    positionDropdown(inst);
  }

  // ── State mutations ─────────────────────────────────────────

  function handleCheckbox(inst, id, checked) {
    if (inst.mode === 'flat') {
      if (checked) inst.selected.add(id); else inst.selected.delete(id);
    } else {
      var node = findNode(inst.items, id);
      if (!node) return;
      var leafIds = getDescendantLeafIds(node);
      leafIds.forEach(function(leafId) {
        if (checked) inst.selected.add(leafId); else inst.selected.delete(leafId);
      });
    }
    refresh(inst);
    notifyChange(inst);
  }

  function handleTagRemove(inst, id, type) {
    if (id === '__all__') {
      inst.selected.clear();
    } else if (inst.mode === 'tree' && type === 'parent') {
      var node = findNode(inst.items, id);
      if (node) getDescendantLeafIds(node).forEach(function(leafId) { inst.selected.delete(leafId); });
    } else {
      inst.selected.delete(id);
    }
    refresh(inst);
    notifyChange(inst);
  }

  /** Get the leaf IDs currently visible in the dropdown — i.e. matching the
   *  active search term. When no search is active this equals getAllLeafIds. */
  function getVisibleLeafIds(inst) {
    var visible = filterItems(inst);
    if (inst.mode === 'flat') return visible.map(function(it) { return it.id; });
    var ids = [];
    walkTree(visible, function(it) {
      if (!it.children || !it.children.length) ids.push(it.id);
    });
    return ids;
  }

  function selectAll(inst, checked) {
    var visibleLeafIds = getVisibleLeafIds(inst);
    if (checked) {
      visibleLeafIds.forEach(function(id) { inst.selected.add(id); });
    } else {
      visibleLeafIds.forEach(function(id) { inst.selected.delete(id); });
    }
    refresh(inst);
    notifyChange(inst);
  }

  function toggleNode(inst, id) {
    if (inst.expandedNodes.has(id)) inst.expandedNodes.delete(id);
    else inst.expandedNodes.add(id);
    var listEl = inst.el.querySelector('.proj-multi-select__list');
    if (listEl) listEl.innerHTML = renderList(inst);
    syncIndeterminateStates(inst);
    positionDropdown(inst);
  }

  function toggleDropdown(inst) {
    if (inst.isOpen) closeDropdown(inst); else openDropdown(inst);
  }

  function openDropdown(inst) {
    inst.isOpen = true;
    inst.dropUp = null;
    inst.el.classList.add('proj-multi-select--open');
    var dd = inst.el.querySelector('.proj-multi-select__dropdown');
    if (dd) dd.classList.add('proj-multi-select__dropdown--open');
    syncIndeterminateStates(inst);
    positionDropdown(inst);
  }

  function closeDropdown(inst) {
    if (!inst.isOpen) return;
    inst.isOpen = false;
    inst.el.classList.remove('proj-multi-select--open');
    var dd = inst.el.querySelector('.proj-multi-select__dropdown');
    if (dd) dd.classList.remove('proj-multi-select__dropdown--open');
  }

  var DROPDOWN_GAP = 4;
  var VIEWPORT_MARGIN = 16;
  var MIN_LIST_HEIGHT = 96;

  // Fixed so a scrolling or clipped ancestor cannot cut the list; flips up when there is more room above.
  function positionDropdown(inst) {
    var dd = inst.el.querySelector('.proj-multi-select__dropdown');
    if (!dd || !inst.isOpen) return;
    var list = dd.querySelector('.proj-multi-select__list');
    var listScroll = list ? list.scrollTop : 0;
    var rect = inst.el.getBoundingClientRect();
    dd.style.position = 'fixed';
    dd.style.top = '0px';
    dd.style.left = '0px';
    dd.style.right = 'auto';
    dd.style.width = rect.width + 'px';
    if (list) list.style.removeProperty('max-height');

    // A transformed ancestor (a modal, for one) becomes the origin of a fixed element.
    var origin = dd.getBoundingClientRect();
    var height = origin.height;
    var below = window.innerHeight - rect.bottom - DROPDOWN_GAP - VIEWPORT_MARGIN;
    var above = rect.top - DROPDOWN_GAP - VIEWPORT_MARGIN;
    if (inst.dropUp == null) inst.dropUp = height > below && above > below;
    var room = inst.dropUp ? above : below;
    if (list && height > room) {
      list.style.maxHeight = Math.max(MIN_LIST_HEIGHT, list.clientHeight - (height - room)) + 'px';
      height = dd.getBoundingClientRect().height;
    }
    if (list) list.scrollTop = listScroll;

    dd.classList.toggle('proj-multi-select__dropdown--up', inst.dropUp);
    var top = inst.dropUp ? rect.top - DROPDOWN_GAP - height : rect.bottom + DROPDOWN_GAP;
    dd.style.top = (top - origin.top) + 'px';
    dd.style.left = (rect.left - origin.left) + 'px';
  }

  /** Re-render trigger (tags) and list contents while preserving open state */
  function refresh(inst) {
    var triggerEl = inst.el.querySelector('.proj-multi-select__trigger');
    if (triggerEl) {
      var tagsEl = triggerEl.querySelector('.proj-multi-select__tags');
      if (tagsEl) tagsEl.innerHTML = renderTags(inst);
    }
    var listEl = inst.el.querySelector('.proj-multi-select__list');
    if (listEl) listEl.innerHTML = renderList(inst);
    syncIndeterminateStates(inst);
    scheduleOverflowCheck(inst);
    positionDropdown(inst);
  }

  /** Defer overflow check to next frame so layout is settled */
  function scheduleOverflowCheck(inst) {
    if (inst._overflowRaf) cancelAnimationFrame(inst._overflowRaf);
    inst._overflowRaf = requestAnimationFrame(function() {
      inst._overflowRaf = null;
      checkTagOverflow(inst);
    });
  }

  /** Hide trailing pills that don't fit, append "+N" badge */
  function checkTagOverflow(inst) {
    var tagsEl = inst.el.querySelector('.proj-multi-select__tags');
    if (!tagsEl) return;

    // Remove any existing overflow badge first
    var existing = tagsEl.querySelector('.proj-multi-select__overflow');
    if (existing) existing.remove();

    var pills = Array.prototype.slice.call(tagsEl.querySelectorAll('.pill'));
    pills.forEach(function(p) { p.style.display = ''; });
    if (pills.length <= 1) return;

    var containerRight = tagsEl.getBoundingClientRect().right;
    var hidden = 0;

    // Hide pills from the end if they overflow
    for (var i = pills.length - 1; i >= 0; i--) {
      var pillRight = pills[i].getBoundingClientRect().right;
      if (pillRight > containerRight) {
        pills[i].style.display = 'none';
        hidden++;
      }
    }

    if (hidden === 0) return;

    var badge = document.createElement('span');
    badge.className = 'proj-multi-select__overflow';
    badge.textContent = '+' + hidden;
    tagsEl.appendChild(badge);

    // Re-check: badge itself may push more pills out
    var badgeWidth = badge.offsetWidth + 4; // include gap
    for (var j = pills.length - 1; j >= 0; j--) {
      if (pills[j].style.display === 'none') continue;
      if (pills[j].getBoundingClientRect().right > containerRight - badgeWidth) {
        pills[j].style.display = 'none';
        hidden++;
        badge.textContent = '+' + hidden;
      }
    }
  }

  /** Apply indeterminate state to tree-mode parent checkboxes (DOM property, can't be set via attribute) */
  function syncIndeterminateStates(inst) {
    if (inst.mode !== 'tree') return;
    inst.el.querySelectorAll('.proj-multi-select__cb[data-indeterminate="true"]').forEach(function(cb) {
      cb.indeterminate = true;
    });
  }

  function notifyChange(inst) {
    inst.onChange(Array.from(inst.selected));
  }

  // ── Public API ──────────────────────────────────────────────

  function create(target, opts) {
    var el = resolveEl(target);
    if (!el) return null;
    if (instances.has(el)) destroy(el);

    opts = opts || {};
    var inst = {
      el: el,
      mode: opts.mode || 'flat',
      items: opts.items || [],
      selected: new Set(opts.selected || []),
      searchable: opts.searchable !== false,
      showSelectAllControls: opts.showSelectAllControls !== false,
      maxVisibleTags: opts.maxVisibleTags || 3,
      allLabel: opts.allLabel || 'All Items',
      placeholder: opts.placeholder || 'Select Items',
      onChange: opts.onChange || function() {},
      isOpen: false,
      searchTerm: '',
      expandedNodes: new Set()
    };

    instances.set(el, inst);
    render(inst);
    bindEvents(inst);
    if (opts.disabled) setDisabledClass(inst, true);
    return inst;
  }

  function setDisabledClass(inst, disabled) {
    inst.disabled = disabled;
    inst.el.classList.toggle('proj-multi-select--disabled', disabled);
  }

  function setDisabled(target, disabled, placeholder) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    setDisabledClass(inst, disabled);
    if (placeholder !== undefined) inst.placeholder = placeholder;
    if (disabled) closeDropdown(inst);
    refresh(inst);
  }

  function destroy(target) {
    var el = resolveEl(target);
    if (!el) return;
    var inst = instances.get(el);
    if (!inst) return;
    if (inst.outsideHandler) document.removeEventListener('click', inst.outsideHandler);
    if (inst.resizeHandler) window.removeEventListener('resize', inst.resizeHandler);
    if (inst.scrollHandler) window.removeEventListener('scroll', inst.scrollHandler, true);
    if (inst._overflowRaf) cancelAnimationFrame(inst._overflowRaf);
    el.innerHTML = '';
    el.classList.remove('proj-multi-select--open');
    instances.delete(el);
  }

  function getSelected(target) {
    var inst = instances.get(resolveEl(target));
    return inst ? Array.from(inst.selected) : [];
  }

  function setSelected(target, ids) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    inst.selected = new Set(ids || []);
    refresh(inst);
    notifyChange(inst);
  }

  function setItems(target, items) {
    var inst = instances.get(resolveEl(target));
    if (!inst) return;
    inst.items = items || [];
    refresh(inst);
  }

  function open(target) {
    var inst = instances.get(resolveEl(target));
    if (inst) openDropdown(inst);
  }

  function close(target) {
    var inst = instances.get(resolveEl(target));
    if (inst) closeDropdown(inst);
  }

  // ── Init (no-op; instances are created via .create()) ───────

  function init() {
    // Plugin uses programmatic instantiation.
    // Designers call ProjMultiSelect.create(target, options) from their prototype JS.
  }

  window.ProjMultiSelect = {
    init: init,
    create: create,
    destroy: destroy,
    getSelected: getSelected,
    setSelected: setSelected,
    setItems: setItems,
    setDisabled: setDisabled,
    open: open,
    close: close
  };
})();
