# Device Recovery — PROTOTYPE.md (router)

## META
- **Path**: `/prototypes/device-recovery/`
- **Architecture**: Map architecture (`js/` + `css/` + `maps/`)
- **Dependencies**: DaVinci Canvas, the Atrium design system; plugins `proj-source-toggle` (navbar, pinned to IT-managed), `proj-multi-select` (Campuses, Faculties), `proj-popover-editor` and `proj-cascader` (column filters)
- **Navigation**: entry **Device Recovery** in `runtime/canvas-navigation-data.json`, with a custom-HTML subheader, left to right: the Registration / Roll out tabs, then Campuses, Faculties, Search, Group by campus and Clear Filters, and Send Recovery Request on the right
- **Companion docs**: `requirements.md`, `qa.md`, `error-cases.md`, `changelog.json`
- **Status**: WIP. Local mock data, no live Room Booking Manager.

## Purpose
IT-managed-devices-only screen with two tabs, for Campus IT Admins at Northfield University. **Registration**: whether the recovery profile of each device is registered with the Room Booking Manager, with a safety-valve "Send Recovery Request" (visibility is the main job, MUST; the request is SHOULD). **Roll out**: push a recovery version (v12 latest, v11, v10) to devices, modelled on the recovery roll-out of Faculty-registered devices (SHOULD, proposed); only Registered devices can be targeted. The navbar toggle is on **IT-managed** with **Faculty-registered disabled** (tooltip: Faculty-registered devices are registered by their Building Controller), set by this page (`js/subheader.js`) because the toggle markup is workspace-global.

## Domain rules
- The screen works on **devices** (floor and room are not levels of the screen). Status lives on devices and is read-only. Devices are grouped by Faculty (several can be selected) and, with the "Group by campus" switch on, by Campus.
- Counters count devices: Need attention (Failed), Not registered yet, In progress (Queued or Re-register), Cannot register (the recovery profile of the device's room is Not set, No access or blank), Registered. A cannot-register device counts only there. A sixth counter, Unavailable, appears only while a device is unavailable.
- A request sends every ticked device except Queued ones, which are skipped and counted.
- A roll-out can target only Registered devices (not one that is mid-roll-out), and only after a version is picked.
- Not registered is neutral (normal until a device asks for its room info). Re-register can be set by the Room Booking Manager itself, so it is never worded as "your request".

## Sample data
32 devices in 9 rooms on 3 campuses (NORT, HLSD, MEDS) and 3 faculties (ENG, SCI, LIB; LIB has no devices at all, SCI has none at HLSD and MEDS, and MEDS has no devices). Rooms such as EN-101 Lecture Theatre and EN-103 AV Lab (NORT, Engineering L1), SB-110 Chemistry Lab (NORT, Science Block L1), EN-101 Lecture Theatre (HLSD, Engineering L1). Asset tags such as MICNORT4001, DRDNORT4002, PNLNORT4003. The page opens with NORT and HLSD and faculty ENG selected, grouped by campus.

## Demo states
`?state=unavailable` · `?state=fsm-down` · `?state=partial` · `?state=readonly` · `?state=deploy-fail` · `?state=deploy-down` · `?state=import-error` · arrival from Manage Devices: `?station=nort-dev1&unit=PRJNORT4004` (or `?unit=PRJNORT4004`). The `unit` value is the device's asset tag.

## Module map
| Feature | Code | Map | Purpose |
|---|---|---|---|
| Page shell | `index.html` | `maps/html/index.md` | Result, counters, info ribbon (directly above the active table), Registration table, Roll out pane, empty and loading states |
| Data | `js/data.js` | `maps/js/data.md` | raw tree Campus > Faculty > Floor > Room > Room device (as in Manage Devices), derived flat device list, recovery versions and per-device roll-out state, status metadata and counter bucket helpers |
| State | `js/state.js` | read directly | Tab, filters, grouping, selection (Registration and Roll out), demo flags from the query string |
| Table | `js/table.js` | `maps/js/table.md` | scope, search and counter filtering; renders counters and the grouped device table (Faculty > Campus > Device); the shared grouping helper the Roll out tab reuses |
| Column filters | `js/column-filters.js` | `maps/js/column-filters.md` | sort and filter on Device (Faculty > Campus > Device cascader), Recovery profile and Updated at; none on Status |
| Actions | `js/actions.js` | `maps/js/actions.md` | confirmation pop-confirm, mock send, result banner and success toast, bounded polling, send button state |
| Roll out | `js/deploy.js` | `maps/js/deploy.md` | Roll out tab: version strip and wizard, device table, summary, status, history, scheduled list, versions and XLSX import dialogs |
| Subheader | `js/subheader.js` | `maps/js/subheader.md` | IT-managed-only toggle; Campuses, Faculties, Search and Group by campus controls |
| Entry | `js/main.js` | `maps/js/main.md` | canvas-ready init and the single render() |
| Page CSS | `css/page.css` | `maps/css/page.md` | page shell, subheader controls, info ribbon, banners, counters, pop-confirm content |
| Table CSS | `css/table.css` | `maps/css/table.md` | table layout, rows and chips |
| Roll out CSS | `css/deploy.css` | read directly | version strip, wizard, last-roll-out cells, dialogs |
| CSS entry | `css/main.css` | read directly | `@import` page + table + deploy |

## Integration points
- **Canvas events listened**: `davinci:canvas:ready`
- **Plugin components**: `proj-source-toggle`, `proj-multi-select`, `proj-popover-editor` and `proj-cascader` (column filters)
- **Dialogs**: built in `js/deploy.js` with design-system `modal-overlay` / `modal` markup (no plugin)
- **Design-system components**: table, checkbox, tag, btn, switch, notification, popover, empty-state, loader, form-input, form-select
- **Links out**: Manage Devices (new tab) for fixing a Not set recovery profile and for the device's room.
- **Shared with Manage Devices**: the Campus > Faculty > Floor > Room > Room device hierarchy, the ISO "Updated at" stamp, the table header sort and filter icons and the pop-confirm pattern.

## Not implemented
- Manage Devices entry points: the room-level "Device recovery registration >" link with device statuses is not wired in the current Manage Devices prototype; the arrival from Manage Devices works from the query string only.
- Tree-first view: dropped by decision.
- Resend link next to a device status, recovery keys row, Off state, campus-level send, user-visible history: see `qa.md`.
- Roll out: the missing-rooms steps (push or override, restore scripts) and the rooms XLSX export (Q&A 34); the XLSX import does not parse the file.
- Permission denied and unexpected-error messages at send time: not designed (`error-cases.md`).
- Read-only role is a query-string demo, not wired to impersonation.
