/* proj-combobox.js */
/* Plugin component: Combobox */
/* Searchable, optionally creatable dropdown that ENHANCES a native <select>. */
/* The <select> stays the source of truth: this only replaces the DROPDOWN. */

/* Built on proj-popover-editor, which owns positioning, viewport clamping, the
   arrow, and outside-click / Escape dismissal. Only the panel's contents and
   keyboard behaviour live here. */

/* WHY DELEGATED, NOT PER-INSTANCE:
   there is no enhance() and no registration. Two document-level listeners catch
   any `select.proj-combobox`, whenever it appeared. That is a deliberate choice
   for tables: a data table that patches a row's cells in and
   out on hover, so its selects are created and destroyed constantly. A
   per-instance wrapper would have to be rebuilt on every patch, and an open panel
   would be left anchored to a detached element — the exact reason those cells
   could not use MDS Stylized Select, which enhances eagerly. Nothing is held
   between opens, so a re-render can't strand anything. */

/* ⚠ TWO MDS INTERACTIONS THIS HAD TO BE BUILT AROUND — see init() for detail:
   1. `monalisa.min.js` hides EVERY `.popover` on any document click that didn't
      land inside one. Our panel is a `.popover` and our trigger is a plain
      <select>, so the panel opened and vanished in the same gesture. Fixed by
      opening on click in the CAPTURE phase and stopping propagation.
   2. A plain focus() scrolls the target into view, and that scroll used to
      dismiss the panel. All focusing goes through focusNoScroll(). */

(function() {
  'use strict';

  var CLASS = 'proj-combobox';
  var bound = false;

  /* The open panel as { handle, select }, or null. One at a time, document-wide. */
  var open = null;

  /* Index of the highlighted row in the CURRENT filtered list. */
  var activeIndex = 0;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Focus without scrolling.
     Every focus() in this file goes through here. A plain focus() scrolls the
     element into view if it is even partly outside, and that scroll fires the
     document-level scroll listener below — which closes the panel. So focusing
     the search field would dismiss the panel it belongs to, intermittently,
     depending on where the row sat in the viewport. `preventScroll` is the fix;
     the fallback keeps older engines working, just with the old behaviour. */
  function focusNoScroll(el) {
    if (!el) return;
    try {
      el.focus({ preventScroll: true });
    } catch (err) {
      el.focus();
    }
  }

  function canCreate(select) {
    return select.getAttribute('data-combobox-create') === 'true';
  }

  /* Real options only. The leading `value=""` placeholder is the empty display
     state, not something to offer in a list. */
  function optionsOf(select) {
    return Array.prototype.filter.call(select.options, function(opt) {
      return opt.value !== '';
    }).map(function(opt) {
      return { value: opt.value, label: opt.textContent.trim() };
    });
  }

  /* Case-insensitive substring match on the visible label AND the raw value —
     `attr_type` shows "Test lab" but stores `test_station_attributes`, and
     someone who knows the enum should be able to type it. */
  function filterOptions(select, query) {
    var all = optionsOf(select);
    if (!query) return all;
    var q = query.toLowerCase();
    return all.filter(function(o) {
      return o.label.toLowerCase().indexOf(q) !== -1
          || String(o.value).toLowerCase().indexOf(q) !== -1;
    });
  }

  /* Does the query already name an existing option? Blocks a duplicate "Add"
     row — offering to create a value that is one row below is pure confusion. */
  function exactMatch(select, query) {
    var q = query.trim().toLowerCase();
    if (!q) return true;
    return optionsOf(select).some(function(o) {
      return o.label.toLowerCase() === q || String(o.value).toLowerCase() === q;
    });
  }

  // ── Panel rendering ──────────────────────────────────────────────────

  function bodyHTML(select, query) {
    var matches = filterOptions(select, query);
    var creatable = canCreate(select) && query.trim() && !exactMatch(select, query);

    var html = '<div class="proj-combobox__panel">';

    html += '<div class="proj-combobox__search-wrap">'
          + '<input type="text" class="form-input proj-combobox__search" '
          + 'placeholder="Search…" value="' + escapeHtml(query) + '" '
          + 'aria-label="Search options" autocomplete="off">'
          + '</div>';

    html += '<div class="proj-combobox__list" role="listbox">';

    if (!matches.length && !creatable) {
      html += '<p class="proj-combobox__empty">No match'
            + (canCreate(select) ? '.' : ' — and this list can\'t be added to.')
            + '</p>';
    }

    matches.forEach(function(o, i) {
      var selected = String(select.value) === String(o.value);
      html += '<button type="button" class="proj-combobox__option'
            + (i === activeIndex ? ' proj-combobox__option--active' : '')
            + (selected ? ' proj-combobox__option--selected' : '')
            + '" role="option" aria-selected="' + (selected ? 'true' : 'false') + '"'
            + ' data-value="' + escapeHtml(o.value) + '" data-index="' + i + '">'
            + '<span class="proj-combobox__option-label">' + escapeHtml(o.label) + '</span>'
            + '</button>';
    });

    html += '</div>';

    /* The create row sits BELOW the list and outside it, so it never competes
       with a match for the user's eye — adding is the exception, picking is the
       rule. It is still keyboard-reachable as the last item. */
    if (creatable) {
      html += '<div class="proj-combobox__create-wrap">'
            + '<button type="button" class="proj-combobox__create'
            + (activeIndex === matches.length ? ' proj-combobox__option--active' : '')
            + '" data-index="' + matches.length + '">'
            + '<sf-symbol name="plus.circle"></sf-symbol> '
            + 'Add “' + escapeHtml(query.trim()) + '”'
            + '</button></div>';
    }

    html += '</div>';
    return html;
  }

  /* Re-render the panel contents in place, keeping the caret where it was. The
     popover wrapper itself is NOT rebuilt — repositioning mid-typing would make
     the panel jump under the pointer. */
  function rerender(query, caret) {
    if (!open) return;
    var body = open.handle.el.querySelector('.popover__body');
    if (!body) return;

    body.innerHTML = bodyHTML(open.select, query);

    var search = body.querySelector('.proj-combobox__search');
    if (search) {
      focusNoScroll(search);
      var pos = (typeof caret === 'number') ? caret : query.length;
      try { search.setSelectionRange(pos, pos); } catch (err) { /* not all inputs support it */ }
    }
    scrollActiveIntoView();
  }

  function rows() {
    if (!open) return [];
    return open.handle.el.querySelectorAll(
      '.proj-combobox__option, .proj-combobox__create');
  }

  function scrollActiveIntoView() {
    if (!open) return;
    var active = open.handle.el.querySelector('.proj-combobox__option--active');
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest' });
    }
  }

  function setActive(index) {
    var all = rows();
    if (!all.length) return;
    /* Wraps at both ends: a 3-item list is faster to reach backwards. */
    activeIndex = (index + all.length) % all.length;
    Array.prototype.forEach.call(all, function(el, i) {
      el.classList.toggle('proj-combobox__option--active', i === activeIndex);
    });
    scrollActiveIntoView();
  }

  // ── Commit ───────────────────────────────────────────────────────────

  /* Write a value back to the <select> and tell the page, in the same shape MDS
     Stylized Select uses — so any existing `change` listener keeps working. */
  function commit(value) {
    if (!open) return;
    var select = open.select;
    select.value = value;
    closePanel();
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Commit a value that isn't in the list.
   *
   * The new <option> is added to THIS select only — the plugin has no idea where
   * the page's option list lives. `proj-combobox:create` fires first so a
   * listener can persist it into the shared source before anything reacts to the
   * value change; `change` follows, so a handler that only listens for `change`
   * still sees the new value.
   */
  function commitNew(raw) {
    if (!open) return;
    var select = open.select;
    var value = raw.trim();
    if (!value) return;

    var opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value;
    select.appendChild(opt);
    select.value = value;

    closePanel();

    select.dispatchEvent(new CustomEvent('proj-combobox:create', {
      bubbles: true,
      detail: { value: value, label: value, select: select }
    }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ── Open / close ─────────────────────────────────────────────────────

  function closePanel() {
    if (open) open.handle.close();
    open = null;
  }

  function openPanel(select) {
    var reopening = open && open.select === select;
    closePanel();
    /* Clicking the select of the panel already showing just closes it. */
    if (reopening) return;

    activeIndex = 0;

    /* Never narrower than the control it replaces, and wide enough that the
       search field isn't a slot. */
    var width = Math.max(select.getBoundingClientRect().width, 240);

    /* Focus the control BEFORE the panel exists.
       `preventDefault()` on mousedown is what suppresses the native dropdown,
       but it also suppresses the focus that click would have given the <select>
       — and a host page may well be listening for that. Manage Devices'
       table could be: `focusin` on a row's control is what promotes the row
       to editing and creates the edit buffer, without which the `change` this
       panel later fires is discarded as belonging to no open editor. Focusing
       here restores that signal. Anything the host does in response runs now,
       before the panel is positioned against the control. */
    focusNoScroll(select);

    var handle = window.ProjPopoverEditor.open({
      trigger: select,
      bodyHTML: bodyHTML(select, ''),
      minWidth: width + 'px',
      closeOnOutsideClick: true,
      closeOnEscape: true,
      onOpen: function(wrapper) { bindPanel(wrapper); },
      onClose: function() {
        open = null;
        /* Return focus to the control so Tab order survives a dismissal. */
        if (select.isConnected) focusNoScroll(select);
      }
    });

    open = { handle: handle, select: select, rect: select.getBoundingClientRect() };

    var search = handle.el.querySelector('.proj-combobox__search');
    if (search) focusNoScroll(search);
  }

  function bindPanel(wrapper) {
    wrapper.addEventListener('input', function(e) {
      if (!e.target.classList.contains('proj-combobox__search')) return;
      /* Any keystroke resets the highlight to the top match — the previous
         index described a list that no longer exists. */
      activeIndex = 0;
      rerender(e.target.value, e.target.selectionStart);
    });

    wrapper.addEventListener('keydown', function(e) {
      var search = wrapper.querySelector('.proj-combobox__search');
      var query = search ? search.value : '';

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIndex - 1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var active = rows()[activeIndex];
        if (!active) return;
        if (active.classList.contains('proj-combobox__create')) {
          commitNew(query);
        } else {
          commit(active.dataset.value);
        }
      }
      /* Escape is proj-popover-editor's, bound at the document level. */
    });

    wrapper.addEventListener('click', function(e) {
      var create = e.target.closest('.proj-combobox__create');
      if (create) {
        var search = wrapper.querySelector('.proj-combobox__search');
        commitNew(search ? search.value : '');
        return;
      }
      var option = e.target.closest('.proj-combobox__option');
      if (option) commit(option.dataset.value);
    });
  }

  // ── Delegated triggers ───────────────────────────────────────────────

  function targetSelect(e) {
    var el = e.target.closest ? e.target.closest('select.' + CLASS) : null;
    if (!el || el.disabled) return null;
    return el;
  }

  function init() {
    if (bound) return;
    bound = true;

    /* mousedown: suppress the browser's own dropdown and nothing else.
       preventDefault here is the only thing that stops the native popup — by
       click time it has already been shown. It also suppresses the focus the
       click would have given the <select>, which openPanel() restores. */
    document.addEventListener('mousedown', function(e) {
      if (!targetSelect(e)) return;
      e.preventDefault();
    }, true);

    /**
     * click: open the panel — in the CAPTURE phase, stopping propagation.
     *
     * Both details are load-bearing, and getting either wrong makes the panel
     * open and vanish in the same gesture.
     *
     * `monalisa.min.js` registers a document-level click handler that hides
     * EVERY `.popover` on the page unless the click landed inside a `.popover`,
     * on a `[id$="-trigger"]`, or on a `.popover__trigger`. Our panel is a
     * `.popover` (proj-popover-editor builds it from the MDS component) and our
     * trigger is a bare `<select>`, which matches none of those exemptions — so
     * MDS sets `display: none` on the panel we just opened.
     *
     * Capture, not bubble: MDS's listener is on `document` too, and
     * `stopPropagation()` does not stop other listeners on the SAME node. In the
     * bubble phase we would be at the mercy of registration order — which is
     * decided by whether the canvas loads MDS before plugins, not by anything
     * this file controls. A capture listener on `document` runs before the event
     * reaches the target and before every bubble listener, so stopping it there
     * is deterministic.
     *
     * Clicks INSIDE the panel are safe without help: `e.target.closest('.popover')`
     * is truthy for those, so MDS leaves them alone.
     */
    document.addEventListener('click', function(e) {
      var select = targetSelect(e);
      if (!select) return;
      e.preventDefault();
      e.stopPropagation();
      openPanel(select);
    }, true);

    /* Keyboard parity: the keys that would open a native dropdown open ours.
       Without this, a keyboard user gets the native list — which has no search
       and no way to add a value. No propagation concerns here; MDS's dismisser
       is on click, and its Escape handler closing our panel is correct. */
    document.addEventListener('keydown', function(e) {
      if (open) return;
      var select = targetSelect(e);
      if (!select) return;
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openPanel(select);
      }
    });

    /* A scroll or resize would leave the panel anchored to where the control
       used to be, so it dismisses — repositioning mid-scroll fights the sticky
       table headers this is used inside.

       The test is whether the TRIGGER MOVED, not where the scroll came from.
       Scroll events are unavoidably noisy here: they arrive from the panel's own
       option list, from `scrollIntoView` on a highlighted row, and from focus,
       and a document-level scroll reports `document` as its target so no
       containment check can filter it. Measuring the anchor instead sidesteps all
       of that — if the control is still where the panel was positioned against,
       nothing needs to happen. */
    window.addEventListener('resize', closePanel);
    document.addEventListener('scroll', function() {
      if (!open) return;
      var now = open.select.getBoundingClientRect();
      if (Math.abs(now.top - open.rect.top) > 1 ||
          Math.abs(now.left - open.rect.left) > 1) {
        closePanel();
      }
    }, true);
  }

  window.ProjCombobox = {
    init: init,
    close: closePanel
  };
})();
