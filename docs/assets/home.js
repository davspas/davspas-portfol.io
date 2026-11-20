/* Home: filter the "All work" grid by kind of work (all / ux / gui / gd). Without JS every card stays visible. */
(function () {
  var grid = document.getElementById('workgrid'); if (!grid) return;
  var cards = Array.prototype.slice.call(grid.children);
  var buttons = Array.prototype.slice.call(document.querySelectorAll('.filters button'));
  /* hero shortcuts: "games" shows both game kinds, "ux" shows software UX */
  var GROUPS = { all: null, ux: ['ux'], gui: ['gui'], gd: ['gd'], games: ['gui', 'gd'] };
  function apply(key) {
    var set = GROUPS[key] || null;
    cards.forEach(function (li) { li.hidden = !!set && set.indexOf(li.dataset.cat) < 0; });
    Array.prototype.forEach.call(document.querySelectorAll('#threads .thread'), function (p) { p.hidden = !(set && set.indexOf(p.dataset.for) >= 0); });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(key === b.dataset.f || (set && set.length > 1 && set.indexOf(b.dataset.f) >= 0))); });
  }
  buttons.forEach(function (b) { b.addEventListener('click', function () { apply(b.dataset.f); }); });
  document.querySelectorAll('[data-filter]').forEach(function (a) {
    a.addEventListener('click', function () { apply(a.dataset.filter); });
  });
  /* deep links from case studies: index.html#work-ux, #work-gui, #work-gd, #work-games */
  function fromHash() {
    var m = /^#work-(ux|gui|gd|games)$/.exec(location.hash); if (!m) return;
    apply(m[1]);
    var w = document.getElementById('work'); if (w) w.scrollIntoView();
  }
  window.addEventListener('hashchange', fromHash); fromHash();
})();
