/* proj-drawer-lock.js */
/* Plugin component: clicking a drawer's backdrop never closes it. */

(function() {
  'use strict';

  // Capture phase on document runs before MDS and every prototype handler on the overlay.
  document.addEventListener('click', function(e) {
    if (e.target.classList && e.target.classList.contains('drawer-overlay')) {
      e.stopImmediatePropagation();
    }
  }, true);
})();
