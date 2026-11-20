/* proj-field-error.js */
/* Plugin component: Inline Field Error */

/*
 * One helper for every inline field validation error in the workspace.
 *
 * Before this existed each prototype invented its own: manage-infrastructure injected a
 * `.form-help--error` span, other forms filled a static `.form-error` div or a `.setting-error` span — each
 * with its own wording. This module owns the copy, the markup and the ARIA wiring
 * so all of them converge.
 *
 * Copy patterns (the only seven):
 *   required(), text field    →  "Enter <Field Name>"
 *   required(), choice field  →  "Select <Field Name>"
 *   invalid()                 →  "Enter a valid <Field Name>"
 *   duplicate()               →  "<Field Name> already in use"
 *   outOfRange()              →  "Enter a number between 5 and 1000"
 *   tooLong()                 →  "Use 64 characters or fewer"
 *   format()                  →  "Enter a valid <Field Name> — an IPv4 address"
 *
 * The middle two of the last three name the CONSTRAINT rather than the field. They
 * only ever fire on a field whose label sits a few pixels above the message, and the
 * rule is the thing the operator actually needs told: on numeric settings fields
 * they were added for, "Enter a valid Poll Interval" says strictly less than "Enter a
 * number between 5 and 1000".
 */

(function() {
  'use strict';

  // Single source for the error glyph. Previously duplicated verbatim in six files.
  var ERROR_ICON =
    '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 64 64" fill="currentColor">' +
    '<circle cx="32" cy="32" r="30" stroke="currentColor" stroke-width="4" fill="none"/>' +
    '<path d="M32 18v20M32 44v4" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/>' +
    '</svg>';

  var INVALID_CLASS = 'form-input--invalid';
  var MESSAGE_CLASS = 'form-help form-help--error';
  // Marks the elements this module created, so clear() only removes its own.
  var INJECTED_ATTR = 'data-proj-field-error';
  // Selector covering every message element the prototypes already ship.
  var MESSAGE_SELECTOR = '.form-help--error, .form-error, .setting-error';

  var _generatedIds = 0;

  // ── Element + label resolution ──────────────────────────────

  function resolve(field) {
    if (!field) return null;
    return typeof field === 'string' ? document.getElementById(field) : field;
  }

  /** Trailing `*`, `:` and a trailing parenthetical are decoration, not the field name. */
  function cleanLabel(text) {
    return (text || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .replace(/[\s*:]+$/, '')
      .trim();
  }

  /**
   * The field's display name. Callers that already hold a label (most of the
   * manage-infrastructure field descriptors do) should pass it — DOM resolution is the
   * fallback for the call sites that don't.
   */
  function labelFor(el, explicit) {
    if (explicit) return cleanLabel(explicit);
    if (el.dataset && el.dataset.errorLabel) return cleanLabel(el.dataset.errorLabel);

    if (el.id) {
      var forLabel = document.querySelector('label[for="' + el.id + '"]');
      if (forLabel) return cleanLabel(forLabel.textContent);
    }

    var row = el.closest('.setting-row, .form-group');
    if (row) {
      var rowLabel = row.querySelector('label, .setting-label, .form-label');
      if (rowLabel) return cleanLabel(rowLabel.textContent);
    }

    if (el.placeholder) return cleanLabel(el.placeholder);

    console.warn('[ProjFieldError] No label found for field', el.id || el);
    return cleanLabel(el.id) || 'this field';
  }

  /** Choice fields read "Select X"; everything else reads "Enter X". */
  function isChoiceField(el, explicitKind) {
    if (explicitKind) return explicitKind === 'choice';
    if (el.tagName === 'SELECT') return true;
    if (el.tagName === 'INPUT' && /^(checkbox|radio)$/i.test(el.type)) return true;
    if (el.matches('.ihr-checklist, .proj-multi-select, [role="listbox"], [role="radiogroup"]')) return true;
    // A container that holds checkboxes or radios is a checklist by another name.
    return !!el.querySelector('input[type="checkbox"], input[type="radio"]');
  }

  // ── Message element ─────────────────────────────────────────

  /** The container an injected message belongs in. */
  function containerFor(el) {
    return el.closest('.setting-value, .setting-control') || el.parentNode;
  }

  /**
   * Find where the message goes. Prototypes that already ship a message element
   * keep it (so their markup needs no change); the rest get one injected.
   */
  function messageElementFor(el, target) {
    if (target) {
      var explicit = resolve(target);
      if (explicit) return explicit;
    }

    if (el.id) {
      var byId = document.getElementById(el.id + 'Error') ||
                 document.getElementById(el.id + '-error');
      if (byId) return byId;
    }

    var container = containerFor(el);
    var existing = container ? container.querySelector(MESSAGE_SELECTOR) : null;
    if (existing) return existing;

    var span = document.createElement('span');
    span.className = MESSAGE_CLASS;
    span.setAttribute(INJECTED_ATTR, 'injected');
    if (container === el.parentNode) {
      container.insertBefore(span, el.nextSibling);
    } else if (container) {
      container.appendChild(span);
    }
    return span;
  }

  /** The field's own help text would compete with the error — hide it while one shows. */
  function toggleSiblingHelp(el, hidden) {
    var container = containerFor(el);
    if (!container) return;
    container.querySelectorAll('.form-help:not(.form-help--error)').forEach(function(help) {
      help.style.display = hidden ? 'none' : '';
    });
  }

  // ── Public API ──────────────────────────────────────────────

  /** Render `message` under `field`. The escape hatch; prefer the cause-based helpers. */
  function show(field, message, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;

    el.classList.add(INVALID_CLASS);
    el.setAttribute('aria-invalid', 'true');
    toggleSiblingHelp(el, true);

    var msgEl = messageElementFor(el, opts.target);
    if (!msgEl) return false;

    msgEl.innerHTML = ERROR_ICON + ' ' + message;
    msgEl.style.display = '';
    if (!msgEl.id) msgEl.id = 'proj-field-error-' + (++_generatedIds);
    el.setAttribute('aria-describedby', msgEl.id);

    return false; // falsy, so `return ProjFieldError.required(…)` reads as "invalid"
  }

  function required(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    var verb = isChoiceField(el, opts.kind) ? 'Select ' : 'Enter ';
    return show(el, verb + labelFor(el, opts.label), opts);
  }

  function invalid(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    return show(el, 'Enter a valid ' + labelFor(el, opts.label), opts);
  }

  function duplicate(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    var message = labelFor(el, opts.label) + ' already in use';
    if (opts.scope) message += ' ' + opts.scope;
    return show(el, message, opts);
  }

  /**
   * A numeric value outside its allowed range. `min` and `max` may each be absent —
   * a one-sided rule reads "5 or more" rather than inventing the bound it does not
   * have. With neither, there is no range to report and this degrades to invalid().
   */
  function outOfRange(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    var min = opts.min, max = opts.max;
    if (min != null && max != null) return show(el, 'Enter a number between ' + min + ' and ' + max, opts);
    if (min != null) return show(el, 'Enter ' + min + ' or more', opts);
    if (max != null) return show(el, 'Enter ' + max + ' or less', opts);
    return invalid(el, opts);
  }

  /** Over a character limit. */
  function tooLong(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    if (opts.maxLength == null) return invalid(el, opts);
    return show(el, 'Use ' + opts.maxLength + ' characters or fewer', opts);
  }

  /**
   * The right kind of value in the wrong shape. `hint` describes what was expected in
   * plain language — never a raw regular expression, which is why every pattern rule
   * that reaches here is asked for a description alongside its expression. Without a
   * hint there is nothing to add and this degrades to invalid().
   */
  function format(field, opts) {
    opts = opts || {};
    var el = resolve(field);
    if (!el) return false;
    if (!opts.hint) return invalid(el, opts);
    return show(el, 'Enter a valid ' + labelFor(el, opts.label) + ' — ' + opts.hint, opts);
  }

  function clear(field) {
    var el = resolve(field);
    if (!el) return;

    el.classList.remove(INVALID_CLASS);
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    toggleSiblingHelp(el, false);

    var container = containerFor(el);
    var candidates = [];
    if (el.id) {
      candidates.push(document.getElementById(el.id + 'Error'));
      candidates.push(document.getElementById(el.id + '-error'));
    }
    if (container) {
      container.querySelectorAll(MESSAGE_SELECTOR).forEach(function(node) {
        candidates.push(node);
      });
    }

    candidates.forEach(function(node) {
      if (!node) return;
      if (node.hasAttribute(INJECTED_ATTR)) {
        node.remove();
      } else {
        // Pre-existing markup stays in the DOM — empty and hide it instead.
        node.innerHTML = '';
        node.style.display = 'none';
      }
    });
  }

  /** Clear every field error inside `root` (defaults to the whole document). */
  function clearAll(root) {
    var scope = resolve(root) || document;
    scope.querySelectorAll('.' + INVALID_CLASS).forEach(clear);
    // Messages whose field was re-rendered (so no longer carries the invalid class).
    scope.querySelectorAll('[' + INJECTED_ATTR + ']').forEach(function(node) {
      node.remove();
    });
  }

  window.ProjFieldError = {
    show: show,
    required: required,
    invalid: invalid,
    duplicate: duplicate,
    outOfRange: outOfRange,
    tooLong: tooLong,
    format: format,
    clear: clear,
    clearAll: clearAll,
    icon: ERROR_ICON
  };
})();
