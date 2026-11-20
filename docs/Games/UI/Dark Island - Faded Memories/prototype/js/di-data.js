/* Dark Island: Faded Memories, sample data for the prototypes (illustrative content, not game data). */
(function () {
  var I = '../img/icons/';
  var DI = (window.DI = window.DI || {});

  DI.ICON = {
    sword: I + 'sword.png', dagger: I + 'dagger.png', fireball: I + 'fireball.png',
    swords: I + 'g-swords.png', shield: I + 'g-shield.png', flask: I + 'g-flask.png', helm: I + 'g-helm.png', chalice: I + 'g-chalice.png',
    handOne: I + 'hand-one.png', handTwo: I + 'hand-two.png', gauntlet: I + 'gauntlet.png'
  };
  DI.GLYPHS = ['swords', 'shield', 'flask', 'helm', 'chalice'];

  var lorem = {
    long: 'A knight\'s blade, carried across the sea before the island fell. Its edge still remembers the hand that first drew it.',
    short: 'Light and quick. Favoured by sentries who never expected to be seen again.',
    ember: 'Pulled from a dragon\'s ash. It hums when something old is watching.',
    helm: 'Horned iron worn by the guard of the drowned keep. The visor never fully closes.',
    flask: 'Bitter and warm. Restores a measure of vitality, and a measure of memory.',
    key: 'It opens something, somewhere. The island has a long memory for locks.'
  };

  // type: weapon | armor | consumable | item. hands: both | either | one
  DI.ITEMS = [
    { id: 'i1', name: 'Long Sword', type: 'weapon', icon: 'sword', lvl: 99, hands: 'both', atk: 99, def: 80, crit: 99, desc: lorem.long },
    { id: 'i2', name: 'Short Sword', type: 'weapon', icon: 'dagger', lvl: 96, hands: 'either', atk: 99, def: 99, crit: 99, desc: lorem.short },
    { id: 'i3', name: 'Ashen Falchion', type: 'weapon', icon: 'sword', lvl: 88, hands: 'both', atk: 92, def: 60, crit: 90, desc: lorem.long },
    { id: 'i4', name: 'Sentry Dagger', type: 'weapon', icon: 'dagger', lvl: 74, hands: 'either', atk: 70, def: 40, crit: 96, desc: lorem.short },
    { id: 'i5', name: 'Ember Orb', type: 'weapon', icon: 'fireball', lvl: 91, hands: 'one', atk: 97, def: 20, crit: 70, desc: lorem.ember },
    { id: 'i6', name: 'Knight\'s Guard', type: 'weapon', icon: 'shield', glyph: true, lvl: 85, hands: 'one', atk: 10, def: 99, crit: 0, desc: 'A tower guard dented by a hundred sieges. Heavy, and worth it.' },
    { id: 'i7', name: 'Rust Blade', type: 'weapon', icon: 'sword', lvl: 52, hands: 'both', atk: 60, def: 50, crit: 40, desc: lorem.long },
    { id: 'i8', name: 'Pale Dirk', type: 'weapon', icon: 'dagger', lvl: 63, hands: 'either', atk: 66, def: 30, crit: 88, desc: lorem.short },
    { id: 'i9', name: 'Twin Fangs', type: 'weapon', icon: 'swords', glyph: true, lvl: 79, hands: 'either', atk: 84, def: 45, crit: 91, desc: 'Two blades forged as one. They always strike in the same breath.' },
    { id: 'i10', name: 'Moss Sword', type: 'weapon', icon: 'sword', lvl: 40, hands: 'both', atk: 48, def: 44, crit: 35, desc: lorem.long },
    { id: 'i11', name: 'Wayfarer\'s Knife', type: 'weapon', icon: 'dagger', lvl: 28, hands: 'either', atk: 38, def: 20, crit: 60, desc: lorem.short },
    { id: 'i12', name: 'Cinder Spark', type: 'weapon', icon: 'fireball', lvl: 33, hands: 'one', atk: 55, def: 10, crit: 50, desc: lorem.ember },
    { id: 'i13', name: 'Old Greatsword', type: 'weapon', icon: 'sword', lvl: 70, hands: 'both', atk: 90, def: 55, crit: 62, desc: lorem.long },
    { id: 'i14', name: 'Iron Buckler', type: 'weapon', icon: 'shield', glyph: true, lvl: 22, hands: 'one', atk: 5, def: 60, crit: 0, desc: 'Small, quick, and better than nothing.' },

    { id: 'a1', name: 'Horned Helm', type: 'armor', icon: 'helm', glyph: true, lvl: 90, hands: null, atk: 0, def: 99, crit: 0, desc: lorem.helm },
    { id: 'a2', name: 'Guard Helm', type: 'armor', icon: 'helm', glyph: true, lvl: 64, hands: null, atk: 0, def: 70, crit: 0, desc: lorem.helm },
    { id: 'a3', name: 'Hollow Visor', type: 'armor', icon: 'helm', glyph: true, lvl: 41, hands: null, atk: 0, def: 48, crit: 0, desc: lorem.helm },
    { id: 'a4', name: 'Drowned Crown', type: 'armor', icon: 'helm', glyph: true, lvl: 99, hands: null, atk: 10, def: 88, crit: 10, desc: 'Salt-crusted and cold. Whoever wore it listened to the sea.' },
    { id: 'a5', name: 'Rook Cowl', type: 'armor', icon: 'helm', glyph: true, lvl: 55, hands: null, atk: 0, def: 52, crit: 12, desc: lorem.helm },

    { id: 'c1', name: 'Amber Flask', type: 'consumable', icon: 'flask', glyph: true, lvl: 99, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.flask },
    { id: 'c2', name: 'Pale Flask', type: 'consumable', icon: 'flask', glyph: true, lvl: 60, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.flask },
    { id: 'c3', name: 'Moonlit Flask', type: 'consumable', icon: 'flask', glyph: true, lvl: 78, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.flask },
    { id: 'c4', name: 'Ash Draught', type: 'consumable', icon: 'flask', glyph: true, lvl: 35, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.flask },
    { id: 'c5', name: 'Emberwine', type: 'consumable', icon: 'flask', glyph: true, lvl: 82, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.flask },

    { id: 'k1', name: 'Key of Success', type: 'item', icon: 'chalice', glyph: true, lvl: 1, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.key },
    { id: 'k2', name: 'Faded Memory', type: 'item', icon: 'chalice', glyph: true, lvl: 1, hands: null, atk: 0, def: 0, crit: 0, desc: 'A fragment of someone\'s past, kept in a cup that never empties.' },
    { id: 'k3', name: 'Rusted Sigil', type: 'item', icon: 'swords', glyph: true, lvl: 1, hands: null, atk: 0, def: 0, crit: 0, desc: lorem.key }
  ];

  DI.TABS = [
    { id: 'weapon', label: 'Weapons' }, { id: 'armor', label: 'Armor' },
    { id: 'consumable', label: 'Consumables' }, { id: 'item', label: 'Items' }
  ];

  // Slots: coordinates are stage px (1440 x 1024). kind = which item type fits.
  DI.SLOTS = [
    { id: 'II-a', kind: 'weapon', x: 355, y: 140, group: 'Load-out II' }, { id: 'II-b', kind: 'weapon', x: 470, y: 140, group: 'Load-out II' },
    { id: 'III-a', kind: 'weapon', x: 180, y: 313, group: 'Load-out III' }, { id: 'III-b', kind: 'weapon', x: 180, y: 430, group: 'Load-out III' },
    { id: 'I-a', kind: 'weapon', x: 642, y: 313, group: 'Load-out I' }, { id: 'I-b', kind: 'weapon', x: 642, y: 430, group: 'Load-out I' },
    { id: 'it-up', kind: 'consumable', x: 181, y: 677, group: 'Items' }, { id: 'it-left', kind: 'consumable', x: 73, y: 785, group: 'Items' },
    { id: 'it-right', kind: 'consumable', x: 288, y: 785, group: 'Items' }, { id: 'it-down', kind: 'consumable', x: 181, y: 893, group: 'Items' },
    { id: 'ar-up', kind: 'armor', x: 641, y: 677, group: 'Armor' }, { id: 'ar-left', kind: 'armor', x: 533, y: 785, group: 'Armor' },
    { id: 'ar-right', kind: 'armor', x: 749, y: 785, group: 'Armor' }, { id: 'ar-down', kind: 'armor', x: 641, y: 893, group: 'Armor' }
  ];

  DI.DEFAULT_LOADOUT = {
    'II-a': 'i1', 'II-b': 'i2', 'III-a': 'i4', 'III-b': 'i6', 'I-a': 'i2', 'I-b': 'i8',
    'it-up': 'c1', 'it-left': 'c2', 'it-right': 'c3', 'it-down': 'c1',
    'ar-up': 'a1', 'ar-left': 'a2', 'ar-right': 'a3', 'ar-down': 'a5'
  };
  // Note: an item id may sit in two slots in the sample (duplicates stand in for stacks).

  DI.SETTINGS_DEFAULT = {
    difficulty: 'Normal', subtitles: true, hudFade: true, damageNumbers: true, hudScale: 100, coopHints: true,
    vibration: true, invertY: false, sens: 50, deadzone: 12, holdToSprint: false,
    aberration: 40, scanlines: 0, resScale: 100, fullscreen: false, vsync: true,
    master: 80, music: 70, sfx: 80, ambience: 65
  };
}());
