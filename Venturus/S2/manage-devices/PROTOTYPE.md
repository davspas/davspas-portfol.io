# Manage Devices — PROTOTYPE.md (router)

## META
- **Path**: `/prototypes/manage-devices/`
- **Architecture**: Map architecture (modular `js/` + `css/` + `maps/`)
- **Dependencies**: DaVinci Canvas, the Atrium design system; plugins `proj-source-toggle`
  (navbar IT-managed/Faculty-registered pill), `proj-cascader` (scope picker — single campus, identical
  for both modes), and `proj-wizard` + `proj-timeline` (Add Devices full-screen wizard)
- **Navigation**: entry in root `canvas-navigation-data.json` (custom-HTML subheader)

## Purpose
Table-based interface for managing campus AV and room-control devices (projectors, microphones, door readers, room panels). The navbar source toggle switches between
two views of the same dataset. The scope is single-select **Campus** for both modes:
- **IT-managed** — **flat list** of IT-managed-type devices, scoped to a single **Campus**. No Approve/Reject.
- **Faculty-registered** — **flat list** of Faculty-registered-type devices, scoped to a single **Campus**.
  Faculty-registered sample data uses only three statuses (`ACTIVE` / `READY` / `RETIRED`). The Approve/Reject
  workflow is **deprecated/occluded** (buttons always hidden; logic retained in code).
  Shows a Faculty-registered info banner.

Both modes share one `proj-cascader` instance with a single Campus column.

### Domain rules
- **Status lifecycle** (one shared state machine; see Device Status Lifecycle diagram). States:
  `PENDING APPROVAL` → `READY` → `PROVISIONED` → `ACTIVE` (+ `RETIRED`). IT-managed devices are
  born `READY`. **Faculty-registered view**: sample data uses only `ACTIVE` / `READY` / `RETIRED`
  (no `PENDING APPROVAL` / `PROVISIONED`).
- **Atrium actions**: Approve (`PENDING APPROVAL→READY`) · Reject (`PENDING APPROVAL→RETIRED`)
  — **deprecated/occluded in the UI** (logic retained in `js/actions.js`) ·
  Retire (`PENDING APPROVAL`/`READY`/`PROVISIONED → RETIRED`; `ACTIVE` cannot be retired).
  `READY→PROVISIONED→ACTIVE` (cert issuance) happen **outside Atrium** — not UI actions.
- **Mode membership**: IT-managed view = `type==='Managed'` only; Faculty-registered view = `type==='Registered'`
  only. The two views are disjoint by type. No Type column (redundant).
- **Data sourcing**: Both IT-managed and Faculty-registered devices come from Asset Registry. For Faculty-registered devices,
  `Faculty / Floor / Room / Device IP` are supplied as a **Building Controller complement**. The
  `lineServer` field on each Faculty-registered device identifies which Building Controller contributed
  the complement; it is not used for grouping or scoping in the UI. When an assigned Building
  Controller is **unreachable**, the complement can't be read: the flat table collapses the five
  Building Controller columns into one warning cell reading "Information cannot be read from Building Controller
  <hostname>" (asset tags `*1404`–`*1407`, `*2401`–`*2402`, `*3401`–`*3402` in sample data).
  Devices not yet assigned to a Building Controller (`MICNORT1401`, `DRDNORT1402`, `PNLNORT1403`) just show empty (`-`) cells.

## Module map
| Feature | Code | Map | Purpose |
|---|---|---|---|
| Page shell | `index.html` | `maps/html/index.md` | Table container, Faculty-registered info banner, empty states; empty thead built by JS |
| Data + helpers | `js/data.js` | `maps/js/data.md` | `units` (Asset Registry-registered for both types; Faculty-registered carries Building Controller-complement fields), `lineServers` tree (Campus › Building Controller), `getStatusTagVariant`, `getLineServerName` |
| Shared state | `js/state.js` | `maps/js/state.md` | Working set, selection, device type, single-campus scope, localStorage |
| Flat table view | `js/grouped-table.js` | `maps/js/grouped-table.md` | Both modes share 10 cols (no Type): flat list of devices for the selected scope; column sort; `filterKodiak`/`filterGroundhog` |
| Actions + selection | `js/actions.js` | `maps/js/actions.md` | Row/select-all, status-gated approve/reject/retire, export, Add (opens the wizard) |
| Add Devices wizard | `js/add-devices.js` | `maps/js/add-devices.md` | Full-screen Add flow (proj-wizard + proj-timeline). Type locked to page view; Campus cascader on manual tab; per-asset-tag validation; redirect-on-commit |
| Subheader controls | `js/subheader.js` | `maps/js/subheader.md` | `proj-cascader` scope picker (single Campus column, both modes), toggle/search wiring, Faculty-registered info-banner toggle |
| Entry point | `js/main.js` | `maps/js/main.md` | `UnitsApp.init/refresh`; canvas-ready init; inits the Add Devices wizard |
| CSS entry | `css/main.css` | `maps/css/main.md` | `@import` subheader + table + add-devices |
| Subheader styles | `css/subheader.css` | `maps/css/subheader.md` | Scope cascader width, export dropdown, button group, sticky Faculty-registered info banner |
| Table styles | `css/table.css` | `maps/css/table.md` | Table enhancements (no group rows — flat for both modes); sticky header offset + header-hover fix |
| Add Devices styles | `css/add-devices.css` | `maps/css/add-devices.md` | Wizard content: tabs, upload dropzone, manual form (Campus + asset tags), step-2 review toolbar |

## Integration points
- **Canvas**: content in `<script id="page-content">`; subheader from `canvas-navigation-data.json`.
- **Plugins**: `proj-source-toggle` (navbar; emits `proj-source-toggle:change`; forced to IT-managed
  by default on init); `proj-cascader` initialized once into `#unitsCascader` with a single
  Campus column for both modes; `proj-wizard`
  + `proj-timeline` (loaded per-prototype via `<script>`, timeline first) power the Add Devices
  full-screen wizard, created once in `UnitsAddUnits.init()`.
- **Persisted state** (localStorage): `manage-devices:unitType`, `manage-devices:site` (single campus
  id string). The legacy `manage-devices:sites` (JSON array) key is no longer used.
- **Navigation**: subheader `htmlContent` includes the empty `#unitsCascader` container +
  search/export/approve-reject/retire/add buttons (Export offers Template and Data; Retire is the red `#revokeBtn`), plus a `#filterStatus` group after the search
  field — a muted "Results are filtered" label + a `btn--link` `#clearFiltersBtn`
  ("Clear Filters", xmark icon) — shown only while one or more table-header filters are active
  (both modes; clicking the link calls `UnitsGroupedTable.clearFilters()`). The Approve/Reject group is
  **deprecated/occluded** — `js/subheader.js updateApproveRejectVisibility()` keeps it hidden
  in all modes (markup + `js/actions.js` logic retained).
- **Faculty-registered info banner**: `#groundhogInfoBanner` lives in `index.html` between the
  sub-header and the table. `js/subheader.js applyMode()` shows it (flex) only when
  `currentTypeFilter === 'Registered'`. Copy: *"Devices shown are faculty-registered room devices"* — light-blue (`#e5f0fc`) background with an `info.circle.fill` icon, mirroring
  the design system's `notification--info` palette.
- **Sticky scroll**: the column header and (in Faculty-registered) the info banner stay pinned while
  the device list scrolls. The document is the scroll context (`.table-container` forced to
  `overflow-x: visible` so it doesn't trap the sticky head), and both pin below the
  canvas header stack via the `--mu-header-offset` (14rem) / `--mu-banner-height` (3.2rem)
  tokens on `.manage-devices-page`. `applyMode()` toggles `.manage-devices-page--groundhog` so
  the head clears the banner in Faculty-registered. See `maps/css/table.md` + `maps/css/subheader.md`.
- **Toasts** (`window.showNotification`): success toast on commit; one error toast per
  side that had cross-type / same-type conflicts at commit time (see Add Devices flow).

## Add Devices flow (`js/add-devices.js`)
Two-step Add Devices wizard (Add button → `UnitsAddUnits.open()`). The wizard shell is the design-system large
modal (`proj-wizard` plugin + `proj-timeline` stepper). The wizard's **Type is locked to the
active page view** — there is no Type picker. The modal title reflects only the Campus
(`"Add Devices to <Campus>"`); the locked type is shown as a left-aligned footer note
(`"Devices added to this Campus will have the <Device Type> type."`, info icon, body copy) in both steps.
- **Step 1** — Upload File (mock parse) OR Add Manually. The manual tab has, in order:
  - **Campus `proj-cascader` (`#addCascader`)** — single Campus column (both modes)
  - **Asset tags textarea** (`Enter asset tags…`)
  The Upload tab inherits the Campus from the page state.
- **Step 2** — review table (search + show-errors-only) with **format-only** inline validation.
  "Already exists" checks do NOT appear in this list — they are evaluated at commit time.
- **Validation**:
  - Inline (Step 2): format (8–14 alphanumeric, error "Invalid asset tag (use 8–14 alphanumeric characters).").
  - At commit (Add Devices click): `existingType(serial)` — if the asset tag is already in Asset Registry
    (under either type), the row is silently skipped and a red toast fires.
- **Toasts on commit**:
  - Success (one toast): `"<N> Device<s> added to <Campus> on <Device Type>"` for the rows that
    actually committed.
  - Error (one per side with conflicts): bold title `"Atrium couldn't register the devices"` +
    detail `"Selected device(s) already in use on <Type> Asset Registry."`.
- **Commit status**: both IT-managed and Faculty-registered devices are born `READY` (the approval workflow
  is deprecated — no `PENDING APPROVAL` step). New devices carry no
  `lineServer` (the Building Controller complement is filled in later by the per-controller sync job).
- **Behavior when a conflict fires**: the wizard stays open. Successfully-added rows are
  removed from `_rows` so the review list shows only what still needs attention; the page
  refreshes silently behind the modal.
- **Redirect-on-commit (no-conflict path only)**: if the wizard's Campus differs from the page
  state, the page scope updates before `UnitsApp.refresh({loading:true})` so the new devices
  land in the visible scope. Type is locked and never diverges.
- **Discard pop-confirm**: closing the wizard via Cancel, X, or Escape while there's pending
  input (file uploaded, manual asset tags typed, or review rows present) opens a popover
  anchored below the X button. Buttons: **Keep editing** (dismiss popover) and **Discard**
  (close the wizard via `_wizard._closeBypass`). Successful commit bypasses the confirm.

## Not implemented (placeholders)
- Upload File is mocked: clicking/dropping on the dropzone picks a sample `sample.xlsx`
  (no native file picker, no parsing) → uses `MOCK_UPLOAD_SERIALS`. Download Template is a no-op
- Export template/data (console.log only)
- Real API calls for bulk actions / add (mutates local data only)
- Pagination (all matching rows render — column sort applies to the full list)
