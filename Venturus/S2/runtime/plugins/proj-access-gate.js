/* proj-access-gate.js */
/* Plugin component: Access Gate. Sends a persona with `landingPage` to that prototype. */

(function() {
  'use strict';

  var RETURN_KEY = 'proj-access-gate:return';
  // Workspace entry point (homeUrl in canvas-navigation-data.json), used when there is no origin page
  var HOME_URL = '../manage-infrastructure/';

  // Prototypes sit at prototypes/<name>/, so a sibling folder is always '../<name>/'
  function isOnPage(name) {
    return window.location.pathname.indexOf('/' + name + '/') !== -1;
  }

  function readReturn() {
    try { return sessionStorage.getItem(RETURN_KEY); } catch (err) { return null; }
  }

  function writeReturn(value) {
    try {
      if (value) sessionStorage.setItem(RETURN_KEY, value);
      else sessionStorage.removeItem(RETURN_KEY);
    } catch (err) {}
  }

  window.ProjAccessGate = {
    apply: function(user) {
      var name = user && user.landingPage;
      var returnUrl = readReturn();

      if (name) {
        if (isOnPage(name)) {
          if (!returnUrl) writeReturn(new URL(HOME_URL, window.location.href).href);
          return;
        }
        writeReturn(window.location.href);
        window.location.replace('../' + name + '/');
        return;
      }

      // Switching away from a gated persona reloads the landing page; go back to where it started
      if (returnUrl) {
        writeReturn(null);
        if (returnUrl !== window.location.href) window.location.replace(returnUrl);
      }
    }
  };
})();
