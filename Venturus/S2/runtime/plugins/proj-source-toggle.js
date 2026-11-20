/* proj-source-toggle.js */
/* Plugin component: Source Toggle (Faculty-registered / IT-managed) */

(function() {
  'use strict';

  var CONTAINER_CLASS = 'proj-source-toggle';
  var OPTION_CLASS = 'proj-source-toggle__option';
  var ACTIVE_CLASS = 'proj-source-toggle__option--active';
  var DISABLED_CLASS = 'proj-source-toggle__option--disabled';

  function setActive(container, source) {
    if (!container || !source) return false;

    var target = container.querySelector(
      '.' + OPTION_CLASS + '[data-source="' + source + '"]'
    );
    if (!target || target.classList.contains(DISABLED_CLASS)) return false;

    container.querySelectorAll('.' + OPTION_CLASS).forEach(function(opt) {
      opt.classList.toggle(ACTIVE_CLASS, opt === target);
    });
    container.setAttribute('data-active', source);

    container.dispatchEvent(new CustomEvent('proj-source-toggle:change', {
      bubbles: true,
      detail: { source: source }
    }));
    return true;
  }

  function bind(container) {
    if (container.dataset.projSourceToggleBound === 'true') return;
    container.dataset.projSourceToggleBound = 'true';

    container.addEventListener('click', function(e) {
      var btn = e.target.closest('.' + OPTION_CLASS);
      if (!btn || !container.contains(btn)) return;
      if (btn.classList.contains(DISABLED_CLASS)) return;
      var source = btn.getAttribute('data-source');
      if (!source) return;
      setActive(container, source);
    });
  }

  window.ProjSourceToggle = {
    init: function() {
      document.querySelectorAll('.' + CONTAINER_CLASS).forEach(bind);
    },
    setActive: setActive
  };
})();
