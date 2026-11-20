# Requirements: Dark Island UI prototypes

Source: wireframes 40-45 and 47-50, component sheets, Steam description. Items marked (illustrative) are not in the wireframes and are proposals.

## Global
- G1. Controller-first. Every action reachable with A / B / X, LB / RB, LT / RT, D-pad. Keyboard and mouse equivalents exist. The hint bar shows the glyphs of the last device used.
- G2. Focus is always visible (gold frame, glow, spotlight row).
- G3. Dark / high fantasy: silver frames, gold selection and titles, navy panels with diamond-tipped slots and corner flourishes.
- G4. Prototype UI in English. No brand assets inside prototypes.
- G5. Stage keeps the wireframe ratio (45:32) and scales to the window. Best on desktop.

## HUD
- H1. Boss bar and name at the top left; hidden when no boss (illustrative, shown always in the prototype).
- H2. Weapon cluster at the bottom left: two large active slots and four small ones. The active pair follows the current load-out and the cluster reflows into three layouts. A shield in an inactive slot is greyed.
- H3. Three bars: stamina (blue), mana (purple), health (red).
- H4. Currency box at the bottom right with a coin glyph and amount, count-up on gain.
- H5. Pickup notifications at the top right, stacked, at most five, expiring after about four seconds.
- H6. NPC nameplates: grey when idle or out of range, red when targeted.
- H7. HUD fades when idle (setting). Subtitles appear on NPC speech (setting). Damage numbers (setting) (illustrative).
- H8. Day and night scenes; chromatic aberration and scanlines follow Graphics settings.

## Equipment
- E1. Header with Continue, `MAP [LB] EQUIPMENT [RB] SETTINGS` and button hints.
- E2. Slots: Load-out I / II / III (two weapon slots each), Items (four, D-pad layout), Armor (four).
- E3. Level, Total ATK, Total DEF, Avg CRIT update live when equipment changes.
- E4. Inventory tabs: Weapons, Armor, Consumables, Items. Rows show icon, name, level badge; an E badge marks equipped items.
- E5. Tooltip for the focused item or slot: icon, name, level with arrow, hand requirement, ATK / DEF / CRIT with arrows, description.
- E6. Compare mode: selecting a slot shows equipped and candidate tooltips; arrows compare the candidate to the equipped item; incompatible rows are dimmed.
- E7. Selecting an item first highlights compatible slots; selecting a slot then equips.
- E8. X on a slot unequips; X on an item opens a confirm popover before dropping (illustrative).
- E9. Key items cannot be equipped.

## Settings
- S1. Radial menu with six entries; the selected one is pulled out; up / down rotates it.
- S2. Panel title, subtitle, up to four tabs with LT / RT caps, rows with controls (illustrative content).
- S3. Controls: toggle, slider (arrows or click on the bar), selector (arrows) (proposed components).
- S4. Changes save immediately (localStorage). X restores defaults for the current tab (illustrative).
- S5. Quit Game shows a confirmation; quitting is disabled in the prototype.

## Open questions
1. Final typefaces for headings and body (wireframes use a serif display face, not identified).
2. Character art for Equipment: the wireframes show an illustrated character; the prototype uses a render crop.
3. Map screen and co-op UI (second player bars and load-out) are not designed.
4. Armor slot art: all four armor slots reuse the helm glyph.
5. Real settings list, key rebinding flow and accessibility options.
