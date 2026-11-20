/* <sf-symbol name="..."> : local inline-SVG icon element.
   Same tag and `name` attribute the prototypes already use, but backed by a built-in icon set
   (stroke icons on a 24px grid, currentColor). No network requests. Size follows font-size. */
(function () {
  'use strict';

  var C = '<circle cx="12" cy="12" r="9"/>';
  var CF = '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/>';
  var CHECK = '<path d="m8 12.5 3 3 5-6"/>';
  var DOC = '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>';
  var EYE = '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>';
  var THUMB = '<path d="M7 11v9H4v-9z"/><path d="m7 11 4-7c1.5 0 2.5 1 2.2 2.6L12.8 9H19a1.5 1.5 0 0 1 1.5 1.8l-1.4 7A2 2 0 0 1 17.2 19H7"/>';

  var ICONS = {
    'chevron.right': '<path d="m9 6 6 6-6 6"/>',
    'chevron.left': '<path d="m15 6-6 6 6 6"/>',
    'chevron.down': '<path d="m6 9 6 6 6-6"/>',
    'chevron.up': '<path d="m6 15 6-6 6 6"/>',
    'xmark': '<path d="M6 6l12 12M18 6 6 18"/>',
    'xmark.circle.fill': CF + '<path d="M9 9l6 6M15 9l-6 6" stroke="#fff"/>',
    'checkmark': '<path d="m5 12.5 4.5 4.5L19 7"/>',
    'checkmark.circle': C + CHECK,
    'plus': '<path d="M12 5v14M5 12h14"/>',
    'plus.circle': C + '<path d="M12 8v8M8 12h8"/>',
    'minus': '<path d="M5 12h14"/>',
    'minus.circle': C + '<path d="M8 12h8"/>',
    'arrow.right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    'arrow.left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'arrow.down.circle': C + '<path d="M12 8v8M8.5 12.5 12 16l3.5-3.5"/>',
    'arrow.up.arrow.down': '<path d="M8 20V5M4.5 8.5 8 5l3.5 3.5M16 4v15M12.5 15.5 16 19l3.5-3.5"/>',
    'arrow.up.right.square': '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    'arrow.up.left.and.arrow.down.right': '<path d="M4 4h6M4 4v6M4 4l6 6M20 20h-6M20 20v-6M20 20l-6-6"/>',
    'arrow.counterclockwise': '<path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5"/>',
    'square.and.arrow.up': '<path d="M12 15V4M8.5 7.5 12 4l3.5 3.5M6 11H5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1"/>',
    'icloud.and.arrow.up': '<path d="M7 18a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17.3 9 4.5 4.5 0 0 1 17 18"/><path d="M12 20v-7M9 15.5l3-3 3 3"/>',
    'tray': '<path d="M3 13h5l1.5 3h5L16 13h5M3 13l2.5-7h13L21 13v6H3z"/>',
    'doc': DOC,
    'doc.text': DOC + '<path d="M9 13h6M9 17h6"/>',
    'doc.on.doc': '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h3"/>',
    'note.text': '<path d="M5 4h14a1 1 0 0 1 1 1v10l-5 5H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M15 20v-4a1 1 0 0 1 1-1h4M8 9h8M8 13h4"/>',
    'list.bullet.rectangle': '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M8.5 9.5h8M8.5 12h8M8.5 14.5h8M6.5 9.5v.01M6.5 12v.01M6.5 14.5v.01"/>',
    'character.book.closed': '<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h12M9 13l2-6 2 6M9.8 11h2.4"/>',
    'info.circle': C + '<path d="M12 11v5M12 7.6v.01"/>',
    'exclamationmark.circle': C + '<path d="M12 7.5v5M12 16v.01"/>',
    'exclamationmark.triangle': '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.01"/>',
    'exclamationmark.triangle.fill': '<path d="M12 4 2.5 20h19z" fill="currentColor"/><path d="M12 10v4.5M12 17.5v.01" stroke="#fff"/>',
    'questionmark.circle': C + '<path d="M9.7 9.4a2.4 2.4 0 0 1 4.6.9c0 1.6-2.3 2-2.3 3.4M12 16.8v.01"/>',
    'questionmark.bubble': '<path d="M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.4A8 8 0 1 1 21 12z"/><path d="M9.8 9.6a2.3 2.3 0 0 1 4.4.8c0 1.5-2.2 2-2.2 3M12 16.5v.01"/>',
    'magnifyingglass': '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    'gearshape': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    'shield.lefthalf.filled': '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="M12 3 5 6v5c0 4.5 3 8 7 10z" fill="currentColor"/>',
    'square.stack.3d.up': '<path d="m12 3 9 4.5-9 4.5-9-4.5z"/><path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5"/>',
    'sparkles': '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="m19 16 .7 1.8 1.8.7-1.8.7L19 21l-.7-1.8-1.8-.7 1.8-.7z"/>',
    'point.3.connected.trianglepath.dotted': '<circle cx="12" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M11 8 7 16M13 8l4 8M8 18h8" stroke-dasharray="2 2"/>',
    'person.badge.key': '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6h1"/><circle cx="17" cy="15" r="2.5"/><path d="M15.2 16.8 11.5 20.5M13.5 18.5l1.5 1.5"/>',
    'lines.measurement.horizontal': '<path d="M3 12h18M3 8v8M21 8v8M8 10v4M12 9v6M16 10v4"/>',
    'line.3.horizontal.decrease.circle': C + '<path d="M8 9h8M10 12h4M11.5 15h1"/>',
    'line.3.horizontal.decrease.circle.fill': CF + '<path d="M8 9h8M10 12h4M11.5 15h1" stroke="#fff"/>',
    'eye': EYE,
    'eye.slash': EYE + '<path d="M4 4l16 16"/>',
    'clock': C + '<path d="M12 7v5l3 2"/>',
    'trash': '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    'hand.thumbsup': THUMB,
    'hand.thumbsdown': '<g transform="translate(0 24) scale(1 -1)">' + THUMB + '</g>',
    'checkmark.circle.fill': CF + '<path d="m8 12.5 3 3 5-6" stroke="#fff"/>',
    'circle': C,
    'info.circle.fill': CF + '<path d="M12 11v5M12 7.6v.01" stroke="#fff"/>',
    'clock.arrow.circlepath': '<path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5"/><path d="M12 8v4l2.5 2"/>',
    'arrow.clockwise': '<path d="M20 12a8 8 0 1 1-2.5-5.8L20 8.5M20 4v4.5h-4.5"/>',
    'arrow.triangle.2.circlepath': '<path d="M4 11a8 8 0 0 1 14-4.5L20 9M20 4.5V9h-4.5"/><path d="M20 13a8 8 0 0 1-14 4.5L4 15M4 19.5V15h4.5"/>'
  };
  var FALLBACK = '<rect x="5" y="5" width="14" height="14" rx="3"/>';

  var style = document.createElement('style');
  style.textContent =
    'sf-symbol{display:inline-block;width:1em;height:1em;line-height:1;vertical-align:-0.125em;flex:none}' +
    'sf-symbol svg{display:block;width:100%;height:100%;overflow:visible}';
  document.head.appendChild(style);

  var warned = {};
  function render(el) {
    var name = el.getAttribute('name') || '';
    var inner = ICONS[name];
    if (!inner) {
      if (name && !warned[name]) { warned[name] = true; console.warn('sf-symbol: no local icon for "' + name + '"'); }
      inner = FALLBACK;
    }
    el.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + inner + '</svg>';
    el.setAttribute('aria-hidden', 'true');
  }

  class SfSymbol extends HTMLElement {
    static get observedAttributes() { return ['name']; }
    connectedCallback() { render(this); }
    attributeChangedCallback() { if (this.isConnected) render(this); }
  }
  if (!customElements.get('sf-symbol')) customElements.define('sf-symbol', SfSymbol);
})();
