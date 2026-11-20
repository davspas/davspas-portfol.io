/* proj-popover-editor.js */
/* Plugin component: Popover Editor */
/* Content-agnostic popover panel built on MDS popover component. */
/* Handles: wrapper + MDS structure, smart auto-positioning, arrow placement, */
/* viewport clamping, and an optional open/close convenience layer with */
/* outside-click + escape dismissal. */

(function() {
  'use strict';

  var WRAPPER_CLASS = 'proj-popover-editor';

  // ── Low-level API: build, position, destroy ─────────────────────────

  function create(opts) {
    opts = opts || {};
    var wrapper = document.createElement('div');
    wrapper.className = WRAPPER_CLASS;

    var html = '<div class="popover__content">';
    if (opts.title) {
      html += '<div class="popover__header"><h4 class="popover__title">' + opts.title + '</h4></div>';
    }
    html += '<div class="popover__body">' + (opts.bodyHTML || '') + '</div>';
    if (opts.footerHTML) {
      html += '<div class="popover__footer">' + opts.footerHTML + '</div>';
    }
    html += '</div>';
    html += '<div class="popover__arrow"></div>';

    var popover = document.createElement('div');
    popover.className = 'popover popover--open';
    if (opts.minWidth) popover.style.minWidth = opts.minWidth;
    popover.innerHTML = html;

    wrapper.appendChild(popover);
    return wrapper;
  }

  function position(wrapper, trigger) {
    if (!wrapper.parentNode) document.body.appendChild(wrapper);

    var rect = trigger.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var scrollY = window.scrollY || window.pageYOffset;

    var popover = wrapper.querySelector('.popover');
    wrapper.style.visibility = 'hidden';
    wrapper.style.position = 'absolute';
    wrapper.style.left = '0';
    wrapper.style.top = '0';

    var popH = wrapper.offsetHeight;

    var spaceBelow = vh - rect.bottom;
    var spaceAbove = rect.top;
    var openBelow = spaceBelow >= popH + 16 || spaceBelow >= spaceAbove;

    var triggerCenter = rect.left + rect.width / 2;
    var alignRight = triggerCenter > vw / 2;

    if (openBelow) {
      wrapper.style.top = (rect.bottom + scrollY + 8) + 'px';
      popover.className = 'popover popover--bottom popover--open';
    } else {
      wrapper.style.top = (rect.top + scrollY - popH - 8) + 'px';
      popover.className = 'popover popover--top popover--open';
    }

    if (alignRight) {
      wrapper.style.left = '';
      wrapper.style.right = Math.max(0, vw - rect.right) + 'px';
    } else {
      wrapper.style.right = '';
      wrapper.style.left = Math.max(0, rect.left) + 'px';
    }

    wrapper.style.visibility = '';

    requestAnimationFrame(function() {
      var wrapperRect = wrapper.getBoundingClientRect();
      var arrow = wrapper.querySelector('.popover__arrow');
      if (arrow) {
        var arrowLeft = triggerCenter - wrapperRect.left;
        arrowLeft = Math.max(12, Math.min(arrowLeft, wrapperRect.width - 12));
        arrow.style.left = arrowLeft + 'px';
        arrow.style.transform = 'translateX(-50%)';
      }

      // Final clamp — avoid viewport overflow on either side
      var finalRect = wrapper.getBoundingClientRect();
      if (finalRect.right > vw - 8) {
        wrapper.style.left = '';
        wrapper.style.right = '8px';
        var clampedRect = wrapper.getBoundingClientRect();
        if (arrow) {
          arrow.style.left = Math.max(12, Math.min(triggerCenter - clampedRect.left, clampedRect.width - 12)) + 'px';
        }
      }
      if (finalRect.left < 8) {
        wrapper.style.right = '';
        wrapper.style.left = '8px';
        var clampedRect2 = wrapper.getBoundingClientRect();
        if (arrow) {
          arrow.style.left = Math.max(12, Math.min(triggerCenter - clampedRect2.left, clampedRect2.width - 12)) + 'px';
        }
      }
    });
  }

  function destroy(wrapper) {
    if (wrapper && wrapper.parentNode) wrapper.remove();
  }

  // ── High-level convenience: open/close with auto-dismissal ─────────

  /**
   * Open a popover editor anchored to a trigger element.
   * Returns a handle { el, close }.
   *
   * opts: {
   *   trigger:             HTMLElement (required)
   *   title:               string (optional)
   *   bodyHTML:            string (optional)
   *   footerHTML:          string (optional)
   *   minWidth:            string (optional, CSS value)
   *   closeOnOutsideClick: boolean (default false)
   *   closeOnEscape:       boolean (default false)
   *   onOpen:              function(wrapper) — called after positioning
   *   onClose:             function() — called after destroy
   * }
   */
  function open(opts) {
    opts = opts || {};
    var wrapper = create(opts);
    position(wrapper, opts.trigger);

    var closed = false;
    var outsideHandler = null;
    var escHandler = null;

    function close() {
      if (closed) return;
      closed = true;
      if (outsideHandler) document.removeEventListener('click', outsideHandler);
      if (escHandler) document.removeEventListener('keydown', escHandler);
      destroy(wrapper);
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    if (opts.closeOnOutsideClick) {
      outsideHandler = function(e) {
        if (wrapper.contains(e.target)) return;
        if (opts.trigger && (e.target === opts.trigger || opts.trigger.contains(e.target))) return;
        close();
      };
      // Defer one tick so the click that opened us doesn't immediately close it
      setTimeout(function() {
        document.addEventListener('click', outsideHandler);
      }, 0);
    }

    if (opts.closeOnEscape) {
      escHandler = function(e) { if (e.key === 'Escape') close(); };
      document.addEventListener('keydown', escHandler);
    }

    if (typeof opts.onOpen === 'function') opts.onOpen(wrapper);

    return { el: wrapper, close: close };
  }

  window.ProjPopoverEditor = {
    create: create,
    position: position,
    destroy: destroy,
    open: open
  };
})();
