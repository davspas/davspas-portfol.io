# Dark Island: Faded Memories, UI prototypes (router)

Immersive, controller-first prototypes of three screens, built from the wireframes in `../images/Prototypes/` and the component sheets in `../images/Components/`. Open them over HTTP from the portfolio root (`python3 -m http.server 3020`), or by double-clicking, since nothing is fetched.

No brand assets are used in here (logo, banner, merch live on the presentation page only). The HUD uses the clean scene renders `img/background-day.jpg` and `img/background-night.jpg`.

## Screens
| Folder | Wireframes | What it does |
|---|---|---|
| `hud/` | 47, 48, 49, 50 | Scene (D-pad right switches load-out), boss bar, weapon cluster (three load-out layouts), stamina / mana / health bars, currency, pickup notifications, NPC nameplates, subtitles. Demo panel (top right, outside the stage, the stage shrinks to make room): `?` or F2, keys 1-9 trigger the buttons in order |
| `equipment/` | 40, 41, 42, 43 | Slots (3 load-outs x 2, 4 items, 4 armor), tabbed inventory, tooltip, compare mode, equip / unequip / drop, live level and totals |
| `settings/` | 44, 45 | Rotating radial menu (Game, Controls, Graphics, Sound, About, Quit Game) and tabbed panels with toggles, sliders and selectors |

Flow: HUD -> Esc / Start -> Equipment <-> Settings <-> Map (stub toast) -> Continue -> HUD. Shoulder buttons LB / RB walk the ring Map, Equipment, Settings.

## Shared code
- `css/di.css`: tokens and components (slot, panel, list row, tooltip, ornate button, tabs, caps, hints, bars, notifications, nameplates, settings controls, wheel). Stage is 1440 x 1024 design px and is scaled to fit.
- `js/di-data.js`: sample items, slots, default load-out, default settings. Illustrative content.
- `js/di-core.js`: stage scaling, input (keyboard, mouse, Gamepad API) and the `DI.onAction` bus, settings and equipment stores (localStorage `di.settings.v1`, `di.equipment.v1`), navigation, toast, shared header, back-to-portfolio and fullscreen buttons.
- `img/ui/`: frames traced from the Figma exports (`Wireframe - 43.svg`, `Wireframe - 49.svg`): bar frames (boss, stamina, mana, health, NPC), and the NPC nameplate. Bar fills, troughs and slot tips are drawn in CSS from colours and path data measured in the exports.
- `img/ui/ref/`: copies of the vector references in `../images/UI Reference/` (`item.svg` slot frame, `Button.svg` ornate button with the texture overlay removed, `corners.svg` panel corner cropped to one flourish), plus gold variants made by swapping the gradient colours. Header cap outlines come from `menu.svg`, the D-pad ring from `directionals.svg` and the settings wheel backdrop from `menuWheel.svg`.
- `img/icons/`: item art and glyphs cropped from `Weapon icon.png`. Glyphs are black squares with white art, shown with `mix-blend-mode: screen`.
- `img/character.png`: the player render cropped from the day background, shown with a radial mask on Equipment (placeholder for the illustrated character in the wireframes).

## Input map
| Action | Gamepad | Keyboard |
|---|---|---|
| Move | D-pad / left stick | Arrows / WASD |
| Select | A | Enter / Space |
| Back | B | Esc / Backspace |
| Drop (Equipment), Defaults (Settings) | X | X |
| Page left / right | LB / RB | Q / E |
| Tab left / right | LT / RT | Z / C |
| Menu | Start | Esc / Tab |

## Cross-screen effects
- Equipping an item changes the HUD weapon cluster.
- Switching load-out in the HUD demo persists.
- Graphics settings (chromatic aberration, scanlines), HUD size, HUD fade, subtitles and damage numbers are read by the HUD.
- Reset by clearing the site's localStorage.
