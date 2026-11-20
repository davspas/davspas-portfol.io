# Portfolio

Standalone copy of the **Manage Infrastructure**, **Manage Devices** and **Device Recovery** DaVinci prototypes, with the Requirements, Error cases, change history and Knowledge Base panels.

Serve this folder over HTTP (`file://` will not work, the panels use fetch):

    python3 -m http.server 3020

Open http://localhost:3020/

- `runtime/` is a vendored copy of the workspace `.davinci/` (canvas, design system, plugins, nav, users). Prototypes load it via `../runtime/...`.
- `context/` is the Knowledge Base, trimmed to the three topics, one per prototype (`manage-infrastructure/`, `manage-devices/`, `device-recovery/`).
- Edits to `manage-*` and `device-recovery/` here do not affect `docs/prototypes/`.
- Nav urls in `runtime/canvas-navigation-data.json` are bare folder names (`manage-infrastructure`); the canvas matches the page by folder suffix.

## Visual language
The look is a generic "neutral modern SaaS" style (slate neutrals, indigo accent, soft radii), defined in `runtime/assets/design-system/dist/css/generic.css`. Class names and `--color-*` / `--space-*` token names are unchanged so the markup, plugins and JS keep working; only the values changed. Icons are the local inline-SVG set in `runtime/assets/canvas/sf-symbols/sf-symbol.js` (the `<sf-symbol name="...">` tag is kept for compatibility, with no network requests). To add an icon, add its name to the `ICONS` map there.
