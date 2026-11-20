# Manage Devices

Registering, viewing and retiring hardware Devices (projectors, microphones, door readers, room panels) at a Campus, with XLSX and manual registration, a format-validated review step, and a shared status lifecycle. The page lists one of two disjoint Device types at a time, **IT-managed** or **Faculty-registered**, chosen with a toggle in the top navigation bar.

Combines the shipped client (the `ManageUnits` sub-container of the `Admin` domain), the Atrium user guide, and the prototype `manage-devices/` with its `requirements.md`.

## See also

- [manage-infrastructure.md](manage-infrastructure.md): Building Controllers supply the Faculty-registered complement for this page (floor, room, IP, last seen). Design-only module.
- [device-recovery.md](device-recovery.md): the Device Recovery page covers IT-managed Devices' recovery registration and rolls out recovery versions; its row action **See in Manage Devices** opens this page.
- **Shared context**: [glossary](../glossary.md), [roles-permissions](../roles-permissions.md) and [system-overview](../system-overview.md).

---

## Status: prototype and requirements only

| Layer | State |
|---|---|
| Shipped client | Known only from the one-line `Admin` domain description of `ManageUnits` (route `/manage-devices`): *"Device lifecycle management with upload/manual registration, approval workflow, and retirement."* No detail beyond that |
| User guide | Describes the two-mode design. ⚠️ It never mentions Approve, Reject or `PENDING APPROVAL` |
| Prototype | `manage-devices/`, active. Changelog of five entries, 2026-05-27 to 2026-07-22 |
| Requirements | `manage-devices/requirements.md`: discovery plus server/client change spec for Faculty-registered mode |

Treat every "proposed change" below as specification, not production behaviour.

---

## Purpose

> "The Manage Devices page provides functionality for registering and managing Devices at Campuses." (user guide)

> "Device lifecycle management with upload/manual registration, approval workflow, and retirement." (`Admin` domain, `ManageUnits` sub-container)

In the prototype the approval workflow is **deprecated and hidden**: the Approve and Reject buttons never show, the `PENDING APPROVAL` status survives only in the lifecycle and the retained logic, and Devices registered through Atrium skip it entirely (see [Approve / Reject](#approvereject)).

⚠️ **Atrium has no Device storage of its own.**

> "Atrium has no device storage of its own. It is an orchestration layer that queries external systems and merges data for presentation." (`requirements.md`)

**Asset Registry is the system of record for every Device** (both types) and holds the type field. Everything else is a merge.

---

## Architecture

### The two modes

A **mode toggle in the top navigation bar** (options **Registered** and **Managed** in the navbar markup) selects which Device type the page lists. In code the type values are `Managed` (IT-managed) and `Registered` (Faculty-registered). The prototype defaults to IT-managed and remembers the last choice. ⚠️ **The page never mixes the two types**: the views are disjoint by `type`.

| | IT-managed | Faculty-registered |
|---|---|---|
| Device list source | Asset Registry | Asset Registry |
| Complement source | **Room Booking Manager** (plus its room statistics) | **The Building Controller** ("the Building Controller complement") |
| Created via | Always through Atrium | Through Atrium **or directly on a Building Controller in the building** |
| Room Booking Manager counterpart | Always | ⚠️ **Never**: Room Booking Manager is exclusively an IT-managed concern |
| Approve/Reject | No | Deprecated and hidden, see [below](#approvereject) |
| Info banner | No | Yes, see [The Faculty-registered info banner](#the-faculty-registered-info-banner) |

Both modes share **one scope picker: a single Campus dropdown.** There is no Building Controller selector.

⚠️ **Faculty-registered Devices that exist only on a Building Controller, without a corresponding Asset Registry record, do not appear in Atrium at all.**

### Data flow

**IT-managed** (`UnitService.getUnitsByCampusName`):

```
1. Room Booking Manager getCampus   → resolves the campus configuration id
2. In parallel:  Asset Registry getDevices + Room Booking Manager getDevice + Room Booking Manager getRoomDevice
3. Optional:     Room Booking Manager room stats → device IP + last seen
4. mergeUnits()  → Asset Registry devices are the spine; Room Booking Manager data joined by asset tag
```

**Faculty-registered** (proposed in `requirements.md`):

```
1. Resolve all Building Controllers for the selected campus   (no UI picker)
2. Fetch Faculty-registered devices from Asset Registry for the campus
3. Fan out in parallel to each Building Controller under the campus
   → request its device list
4. Merge the Building Controller complement by asset tag
5. Never call Room Booking Manager
```

⚠️ **Building Controller fan-out is server-side.** A Campus can have several Building Controllers, each an independent machine with its own database. Atrium queries every one and merges by asset tag.

⚠️ **Known server-side issue, called out in `requirements.md`:** `mergeUnits()` does not explicitly guard the Room Booking Manager lookup to IT-managed devices only. Faculty-registered devices fall through naturally (no Room Booking Manager match is found), but an explicit type check should be added.

### The Building Controller device list

Each Building Controller returns a list of device objects. The fields consumed as the Building Controller complement:

| Controller field | Maps to |
|---|---|
| Asset tag | Join key against the Asset Registry device |
| Faculty | Faculty |
| Floor | Floor |
| Room | Room |
| IP address | Device IP |
| Last seen | Last Seen |

⚠️ **The controller's own status, username and posted-at fields are deliberately NOT consumed.** Status, Updated by and Updated at come from Asset Registry, the system of record. Reading them from the controller would let the two disagree.

### The prototype

```
manage-devices/
├── index.html          content in <script id="page-content">
├── js/                 data, state, grouped-table, actions, add-devices, subheader, main
├── css/                main → subheader + table + add-devices
├── maps/               per-file maps (html, js, css)
├── requirements.md     Faculty-registered-mode discovery + server/client change spec
├── to-do.md            divergence tracker (stakeholder session ↔ requirements ↔ prototype)
├── qa.md               QA notes
├── PROTOTYPE.md        router
└── changelog.json      5 entries, 2026-05-27 → 2026-07-22
```

Plugins: `proj-source-toggle` (navbar IT-managed/Faculty-registered pill), `proj-cascader` (scope picker), `proj-wizard` + `proj-timeline` (Add Devices wizard; ⚠️ **timeline must load first**).

⚠️ **The subheader lives in `runtime/canvas-navigation-data.json`**, not the prototype folder (the same trap as in [manage-infrastructure.md](manage-infrastructure.md)). It holds the empty `#unitsCascader` container plus the search, export, approve/reject, retire and add buttons (and the `#filterStatus` group). The navbar toggle markup is in the same file.

**Persisted state** (localStorage): `manage-devices:unitType` and `manage-devices:site` (a single campus id string). ⚠️ **The older `manage-devices:sites` key (a JSON array) is migrated to the single key on load**, a leftover from when the scope was multi-campus.

**Sample scope.** The prototype data covers three campuses (`NORT`, `HLSD`, `MEDS`), each with two or three Building Controllers (for example `nort-bc-1.campus.test`). The `.campus.test` suffix marks older-style hosts that do not end in `atrium.test`.

---

## Data model

### The row

Each device record in `js/data.js` carries the fields below. Field names are code identifiers and keep their historical spelling; the UI labels are in the right-hand column.

| Field | UI label |
|---|---|
| `serialNumber` | Asset Tag |
| `status` | Status |
| `type` | not displayed (`Managed` or `Registered`) |
| `project` | Faculty |
| `lineName` | Floor |
| `station` | Room |
| `stationIP` | Device IP |
| `lastHeardFrom` | Last Seen |
| `updatedBy`, `updatedAt` | Updated by, Updated at |
| `site` | Campus (scope, not a column) |
| `lineServer` | which Building Controller supplied the complement (Faculty-registered only; not shown as a column) |

⚠️ **The Device type is never shown in the table.** The mode toggle is the authoritative indicator of the type being listed.

⚠️ **`hostname` appears in Asset Registry's payload in the shipped client, but no source documents a hostname column.** Unverified whether it is displayed anywhere.

### Table columns

Nine columns plus the checkbox, identical in both modes. Only the supplying system changes.

| Column | IT-managed source | Faculty-registered source |
|---|---|---|
| *(checkbox)* | none | none |
| Asset Tag | Asset Registry | Asset Registry |
| Status | Asset Registry | Asset Registry |
| Faculty | Room Booking Manager | **Building Controller complement** |
| Floor | Room Booking Manager | **Building Controller complement** |
| Room | Room Booking Manager | **Building Controller complement** |
| Device IP | Room Booking Manager room statistics | **Building Controller complement** |
| Last Seen | Room Booking Manager room statistics | **Building Controller complement** |
| Updated by | Asset Registry | Asset Registry |
| Updated at | Asset Registry | Asset Registry |

Timestamps are stored as ISO strings in the sample data; the table shows `-` for empty values. Column header filter icons are placeholders: toggling one only highlights the header and drives the *Results are filtered* group, and no rows are actually filtered.

### The five Building Controller columns and their three empty states

In Faculty-registered mode, Faculty / Floor / Room / Device IP / Last Seen come from the Building Controller, **filled in by a per-controller background job after a Device is registered with a Building Controller**. Each of the five headers carries a help icon with the tooltip (Faculty-registered mode only):

> *"Information provided by the Building Controller. Empty until the device is registered with a controller."*

⚠️ **Three distinct situations, rendered differently:**

| Situation | Rendering |
|---|---|
| Not yet assigned to a Building Controller (`lineServer` empty) | Each of the five columns renders `-` |
| Assigned, complement not yet fully reported (controller reachable) | Only the individual missing fields render `-` |
| **Assigned, but the Building Controller is unreachable** | ⚠️ **All five columns collapse into one cell** (`colspan="5"`): *"Information cannot be read from Building Controller \<host\>"*, with a warning icon |

The collapsed-cell case is the one to know about: the table's column structure changes per row.

> Prototype sample data: `MICNORT1401`, `DRDNORT1402` and `PNLNORT1403` have no assigned controller (dashes); `PRJNORT1404` to `PNLNORT1407`, plus the `*2401`/`*2402` and `*3401`/`*3402` tags, are examples of an unreachable assigned controller (collapsed cell); `MICNORT1501` and `MICHLSD2501` are partial (room and IP missing).

### Asset tags

**Alphanumeric, 8 to 14 characters.** Separators accepted on the manual tab: comma, semicolon, space, or line break.

---

## Device status lifecycle

Status comes from **Asset Registry** in both modes. One shared state machine.

| Status | Meaning |
|---|---|
| `PENDING APPROVAL` | Registered in Asset Registry **outside Atrium**, awaiting approval. Approve → `READY`, Reject → `RETIRED`, both deprecated and hidden in the prototype |
| `READY` | The entry status for Devices created in Atrium (either type), or approved. Ready to have certificates issued, none issued yet |
| `PROVISIONED` | Only **platform** certificates issued |
| `ACTIVE` | **Both platform and actor** certificates issued |
| `RETIRED` | Cannot be used until registered again (a soft delete) |

```
(new) ──register via Atrium (XLSX/manual), either type──► READY
(new) ──Faculty-registered, registered on a Building Controller──► READY   (user guide)
(new) ──registered in Asset Registry outside Atrium──► PENDING APPROVAL

PENDING APPROVAL ──Approve (deprecated)──► READY
PENDING APPROVAL ──Reject (deprecated)───► RETIRED

READY ──platform certs (outside Atrium)──► PROVISIONED
PROVISIONED ──actor certs (outside Atrium)──► ACTIVE

PENDING APPROVAL | READY | PROVISIONED ──Retire──► RETIRED
RETIRED ──re-register──► READY

ACTIVE ──► (cannot be retired)
```

⚠️ **`READY → PROVISIONED → ACTIVE` happens entirely outside Atrium**: certificate issuance is not a UI action.

⚠️ **Registration through Atrium always enters at `READY`, whatever the type.** `PENDING APPROVAL` Devices come only from Asset Registry registration outside Atrium.

⚠️ **`NOT REGISTERED` was dropped** from both the data and the lifecycle. Faculty-registered devices that exist only on a Building Controller are simply not surfaced.

⚠️ **Faculty-registered sample data uses only three statuses**: `ACTIVE` / `READY` / `RETIRED` (changelog, 2026-07-17). `requirements.md` open question 2 asks whether Faculty-registered devices ever reach `READY` or `PROVISIONED` in Asset Registry at all, or whether those are IT-managed-only. **Still unconfirmed.**

---

## Key workflows

### Scoping

Select a **Campus** from the single-column cascader (placeholder *Pick a Campus*). Atrium resolves every Building Controller under it automatically. Before a Campus is chosen the table area shows the empty state *"No campus selected"*.

**Before a Campus is selected**, the user can still: import XLSX, add manually, download the template.
**After**, they can additionally: view the Devices, retire, search by asset tag, and download the table as XLSX.

### Adding Devices {#adding-devices}

A **two-step wizard** ("Provide asset tags", then "Review and register Devices") opened with the **Add** button, offering two input tabs.

⚠️ **The Device type is locked to the active page mode. There is no type picker.** The modal title names only the Campus, *"Add Devices to \<Campus\>"*, and both steps carry a left-aligned footer note with an info icon stating the locked type.

> ⚠️ **The exact footer copy differs across the sources.** The code, `requirements.md` and `PROTOTYPE.md` say *"Devices added to this Campus will have the \<Device Type\> type."*; the user guide says *"Devices added to the selected Campus will have \<Device Type\> type"*. The code is the authority for the prototype.

**Step 1: Upload File tab**

1. Optionally **Download Template**.
2. Drag and drop, or browse for, an XLSX file. **Max 10MB.**
3. **Next** enables once a valid file is present.

The template has a Campus field and asset tag columns. ⚠️ **It has no Device type field**: the type comes from the page mode. The Upload tab **inherits the Campus from page state**.

**Step 1: Add Manually tab**

1. Pick the Campus from a `proj-cascader` (⚠️ **only this tab has a Campus picker**).
2. Enter asset tags in the textarea, any separator.
3. **Next** stays disabled until at least one asset tag is entered and a Campus is chosen.

**Step 2: Review**

Shows a search field, a **Show errors only** switch, a summary (*"Register N Device(s)."*) and a table of every asset tag with an Error column.

⚠️ **The review step flags FORMAT ERRORS ONLY.** In the prototype the single format message is *"Invalid asset tag (use 8–14 alphanumeric characters)."* (the older spec wording splits it into *"Device will not be imported. Asset tags must contain numbers and letters only."*). Repeated asset tags within the input are collapsed to one row (the spec says *"Duplicate asset tag in file. Only one will be imported."*).

⚠️ **Whether a Device already exists is NOT evaluated here.** Existence is checked **at commit time** and reported as a notification, never inline. This applies both to same-type and cross-type conflicts. This is a deliberate design decision stated in all sources: do not "improve" it by adding an inline existence check.

Rows with errors cannot be ticked; valid rows are ticked by default. Errors sort to the top of the list in the spec, both groups ascending by asset tag. **Show errors only** filters to errors.

**Committing**

Clicking **Add Devices** registers only the ticked valid Devices (the button is disabled when none are ticked). The spec adds a confirmation modal when format errors are present; the prototype simply skips the invalid rows.

⚠️ **If the wizard's Campus differs from the page's Campus, the page switches to the wizard's Campus** so the new Devices land in the visible scope (no-conflict path only). The type is locked and never diverges.

**Results:**

| Outcome | Behaviour |
|---|---|
| **Success** | Top-center auto-dismissing notification: *"\<N\> Device\<s\> added to \<Campus\> on \<Device Type\>"* (committed rows only). New Devices are created `READY` with a placeholder "Updated by" author and no assigned Building Controller |
| **Already in use** | ⚠️ Red notification, title *"Atrium couldn't register the devices"*, detail *"Selected device(s) already in use on \<Type\> Asset Registry."* **The wizard stays open**, and successfully-registered rows are **removed from the review list** so the user can address only what remains. The page refreshes silently behind the modal |

> The prototype fires **one error notification per side** that had conflicts: cross-type and same-type are reported separately.

### Discarding an in-progress registration

Closing the wizard via **Cancel**, the **X**, or **Escape** while it holds pending input (an uploaded file, typed asset tags, or Step 2 rows) opens a confirmation popover titled *"Discard changes?"* with the body *"Any serials or files you entered will be lost."* (the code still uses the older "serials" wording).

⚠️ **The button labels differ between sources.** The prototype code, its `requirements.md` and `PROTOTYPE.md` specify **Keep editing** / **Discard** (a popover anchored below the X). The user guide's body documents **Cancel** / **Proceed**, though its screenshot alt text already reads "Keep editing and Discard". Unverified which ships; the prototype pair reads as the later decision.

A successful commit bypasses the confirmation.

### Retiring Devices

1. Select one or more Devices via the table checkboxes.
2. **Retire** (the red `#revokeBtn`, shown once a Campus is selected) enables when the selection holds at least one eligible Device.
3. Click **Retire**; the eligible Devices become `RETIRED`.

⚠️ **Retirement restrictions are stated inconsistently by the user guide itself**, see [Source contradictions](#source-contradictions). The consistent reading across the lifecycle table, `requirements.md` and the prototype is:

- **Devices assigned to a Room cannot be retired.** ⚠️ The prototype does not model this: its Retire gating is by status only.
- **`ACTIVE` Devices cannot be retired** (actor certificates already issued).
- `PENDING APPROVAL` / `READY` / `PROVISIONED` can be.

### Approve / Reject (deprecated, hidden) {#approvereject}

The approval workflow is a **deprecated capability of this prototype**. The `#approveRejectGroup` in the subheader is forced to `display: none` by `updateApproveRejectVisibility()` in `js/subheader.js`, in both modes, so users never see Approve or Reject.

The logic is retained on purpose, so the workflow can be switched back on by restoring the original visibility condition (Faculty-registered mode with a Campus selected):

- **Approve** (`PENDING APPROVAL → READY`) and **Reject** (`PENDING APPROVAL → RETIRED`) are gated by status only, through `ACTION_SOURCES` and `applyStatus` in `js/actions.js`. Both are specified to go through the Asset Registry approval API (`requirements.md`).
- Pending Devices are not created by Atrium's Add flow (those are born `READY`), so with the buttons hidden nothing in the prototype produces or resolves `PENDING APPROVAL`.

How the layers describe it:

| Source | Says |
|---|---|
| **Client** (`Admin` domain) | *"approval workflow"* is part of `ManageUnits`' description (one-line domain text; no detail extracted) |
| **`requirements.md`** | Approve and Reject listed as **Deprecated** Faculty-registered actions: hidden in the UI, logic retained in code |
| **Prototype** (changelog 2026-07-17) | Workflow *"deprecated and hidden … (the action remains available in code for future use)"* |
| **User guide** | ⚠️ **Never mentions Approve, Reject or `PENDING APPROVAL`**: stale relative to the client description |

The retained logic is not dead code; do not remove it from the prototype.

### Search, filters and export

- **Search** by asset tag (placeholder *Search Devices by Asset Tag*). The prototype matches any field of the row.
- **Column header filters**: when any are active, a `#filterStatus` group appears after the search field: a muted *"Results are filtered"* label plus a **Clear Filters** link (`xmark` icon) calling `UnitsGroupedTable.clearFilters()`. Both modes. The filters themselves are placeholders.
- **Export** menu: **Template** (blank XLSX) and **Data** (the table as XLSX; disabled until a Campus is selected).
- **Column sort** via the design-system sort indicators on the full list.

### The Faculty-registered info banner

`#groundhogInfoBanner` sits between the subheader and the table, shown only in Faculty-registered mode. Copy in the code: *"Devices shown are faculty-registered room devices"*, on a light-blue `#e5f0fc` background with an info icon, mirroring the design system's info notification palette.

⚠️ **Sticky layout depends on hand-tuned tokens.** The column header and (when shown) the banner stay pinned while the list scrolls. The **document** is the scroll context. `.table-container` is forced to `overflow-x: visible` so it does not trap the sticky head, and both pin below the canvas header stack via `--mu-header-offset` (14rem) and `--mu-banner-height` (3.2rem) on `.manage-devices-page`. `applyMode()` toggles `.manage-devices-page--groundhog` so the head clears the banner.

### Navbar toggle tooltips

Per the 2026-06-25 changelog and `requirements.md`, the active toggle option shows a leading `info.circle` icon; hovering reveals a tooltip about 4px below the navbar:

- **Faculty-registered**: *"Devices being shown are Faculty-registered devices registered with Asset Registry."*
- **IT-managed**: *"Devices being shown are IT-managed native, created in Room Booking Manager."*

---

## Roles & permissions

The user guide states the page is reached by **Campus IT Admins only**, consistent with the `isAtriumAdmin` flag gating Manage Devices (see [roles-permissions](../roles-permissions.md)).

`ManageUnits` is one of seven areas of the `Admin` container, so **`isAtriumAdmin` is the effective gate**. In the prototype personas, Maya Okafor (Campus IT Admin) is the default and Daniel Reyes (Viewer) is the read-only persona; ⚠️ no read-only rules are applied to this table, so a Viewer who reaches it still sees Add, Retire and Export.

⚠️ **No finer-grained permissions are documented**: nothing distinguishes who may register from who may retire. Given that retirement is a soft delete applied in bulk, the absence of a separate gate is worth verifying rather than assumed intentional.

---

## Known limitations & gotchas

### Source contradictions

⚠️ **The user guide contradicts itself on ACTIVE retirement.** Its *Retirement Restrictions* section says:

> "Devices assigned to a Room cannot be retired, **all other Devices, regardless of Status can be retired**"

But its own lifecycle table two sections later says `ACTIVE`: (cannot be retired), and its Restrictions note says *"Devices with ACTIVE status and Room Devices … cannot be retired."* `requirements.md` and `PROTOTYPE.md` both agree ACTIVE cannot be retired. **The prose sentence is the outlier and is probably wrong.**

⚠️ **Discard popover labels differ**: Keep editing/Discard (prototype, requirements) vs Cancel/Proceed (user guide).

⚠️ **Add-wizard footer copy differs across sources**, see [Adding Devices](#adding-devices).

⚠️ **`to-do.md` §3.5 is superseded but still reads as done.** It records *"Restore Type picker in the Add Devices wizard → **added** on the Add Manually tab, defaulted to the page toggle"* as a closed 2026-06-25 decision. That was later reversed (changelog 2026-07-07): the type is locked with **no picker**, and the user guide agrees. The tracker was not updated.

### Behaviour

- ⚠️ **Existence is checked at commit, never in review.** A user can reach Step 2 with a clean list and still get a red notification.
- ⚠️ **The unreachable-Building-Controller row changes the table's column structure**, collapsing five columns into one.
- ⚠️ **The Building Controller complement is filled by a background job**, so empty columns are normal for a freshly registered Faculty-registered Device, not an error.
- ⚠️ **`mergeUnits()` has no explicit IT-managed type guard** (server-side). Faculty-registered devices fall through only because no Room Booking Manager match is found, an implicit behaviour `requirements.md` flags for fixing.
- ⚠️ **The older `manage-devices:sites` localStorage key** is migrated on load; both keys may exist in the wild.
- **`type` is on the record but never displayed**, and `hostname` is not displayed in any documented column.

### Prototype not implemented

- **Upload File is mocked**: clicking or dropping on the dropzone selects a sample `sample.xlsx` with no native file picker and no parsing, feeding a fixed list of asset tags. **Download Template is a no-op** (console log only).
- **Export template/data is `console.log` only.**
- **No real API calls** for bulk actions or add: local data mutation only.
- **No pagination**: all matching rows render; column sort applies to the full list.
- **Header filters are placeholders**; no Room-assignment check on Retire.

### Open questions (`requirements.md` §Open Questions, `to-do.md` §4)

| # | Question | Status |
|---|---|---|
| 1 | **Add Devices write target in Faculty-registered mode**: Asset Registry only (does the Building Controller pick it up?), the Building Controller only, or both? | **Needs team validation before implementation** |
| 2 | **Do Faculty-registered devices ever reach READY / PROVISIONED in Asset Registry**, or are those IT-managed-only? Those statuses do not appear in the Building Controller sample data | **Needs confirmation.** Mock data assumes yes |
| 3 | **Partial-failure handling for the Building Controller fan-out**: return partial results with a warning naming the failed controller(s), or fail the whole request? | **Needs team decision** (server-side) |
| §4.6 | Add Devices: warn when an asset tag isn't on any Building Controller yet | Open, needs a UX call |
| §4.3 | (same as #3 above) | Open |

§4.1 (Building Controller selection) was resolved 2026-07-07.

---

## API reference

### Server-side changes required (Atrium server)

Specified in `requirements.md`:

| Area | Change |
|---|---|
| Building Controller request service | Add a `getTestUnits(lineServer)`-style call that requests a controller's device list. ✅ The client infrastructure for talking to controllers (auth, base URL, HTTP patterns) already exists |
| `UnitService.ts` | New method (or extend `getUnitsBySiteName`) for Faculty-registered: load Asset Registry Faculty-registered devices → resolve Building Controllers → fan out in parallel → merge by asset tag → **handle partial failures**. **No Room Booking Manager calls.** Also add the explicit IT-managed type guard to `mergeUnits()` |
| `UnitController.ts` / `UnitRoute.ts` | Route `GET /devices` by source filter. ✅ The `filter[source]` query param already exists and is parsed |

### Client-side changes required (Atrium client)

| File | Change |
|---|---|
| `ManageUnitsContent.tsx` | Consume `useConfigState()` from `ConfigContext`; pass `currentSource` to `useUnits`. **No Building Controller state on the client** |
| `useUnits.ts` | Remove the hardcoded `sourceType` that limits the list to IT-managed devices; forward the selected Campus only |
| `ManageUnitsHeader.tsx` / columns | Shared Campus cascader, columns and flat layout; Device type not shown in either mode; status filter uses the shared Asset Registry lifecycle |
| Add Devices wizard | Type locked to the page toggle; Campus picker on the manual tab only; format-only inline validation; commit-time existence check; page-Campus switch on commit; Keep editing / Discard confirmation |
| Notifications | Success and per-side error notifications as documented above |
| Navbar toggle | `info.circle` icon on the active option with the mode tooltip |

⚠️ **These are proposed changes, not a description of shipped code.** `requirements.md` is a discovery document for enabling Faculty-registered mode.

### Prototype modules

| Module | Responsibility |
|---|---|
| `js/data.js` | `units` (Asset Registry-registered, both types; Faculty-registered carries complement fields), `lineServers` Campus › Building Controller tree, `getStatusTagVariant`, `getLineServerName` |
| `js/state.js` | Working set, selection, mode, single-campus scope, localStorage |
| `js/grouped-table.js` | Flat table (nine columns plus checkbox), column sort, `clearFilters()`, `filterKodiak` / `filterGroundhog` (the IT-managed / Faculty-registered filters, names kept from the data-source ids) |
| `js/actions.js` | Row/select-all, status-gated approve/reject/retire, export, Add |
| `js/add-devices.js` | Full-screen wizard, per-asset-tag validation, redirect-on-commit |
| `js/subheader.js` | Cascader, toggle/search wiring, banner toggle, `updateApproveRejectVisibility()` (keeps the group hidden in all modes) |
| `js/main.js` | `UnitsApp.init/refresh`, canvas-ready init |

⚠️ **`js/grouped-table.js` no longer renders groups**: the name is a leftover; both modes are flat lists.

---

## Cross-topic dependencies

| Topic | Relationship |
|---|---|
| [manage-infrastructure.md](manage-infrastructure.md) | Building Controllers supply the Faculty-registered complement. A Campus's Building Controllers are resolved server-side, and an unreachable one degrades this page's table |
| [device-recovery.md](device-recovery.md) | The Device Recovery page covers IT-managed Devices' recovery registration with the Room Booking Manager. Its **See in Manage Devices** row action is the deep link back to this page, and a Not set recovery profile is fixed here |
| **Asset Registry** | System of record for both Device types; owns status, certificates and the type field |
| **Room Booking Manager** | IT-managed complement only: Room/Faculty/Floor assignment plus room statistics |
| **Building Controller** | Faculty-registered complement via its device list; can also register Faculty-registered Devices directly in the building |

---

## Testing

No automated test suite is described in any source. The prototype has no tests; `to-do.md` tracks divergences rather than test cases.

Highest-value manual checks, derived from the gotchas above:

- The three Building Controller-complement empty states, especially the **collapsed unreachable-controller cell**
- Commit-time existence conflict: wizard stays open, committed rows removed from the review list
- Campus switch on commit when the wizard's Campus differs from the page's
- Retirement gating on `ACTIVE` (and, in the spec, Room-assigned Devices)
- `manage-devices:sites` → `manage-devices:site` migration
- Approve and Reject stay hidden in both modes, while Retire still works on `PENDING APPROVAL` rows

---

## Terms

Shared vocabulary (**Room Booking Manager**, **Asset Registry**, **Faculty-registered**, **IT-managed**, **Room Device**, **Device**, **Mode toggle**) lives in the [glossary](../glossary.md). Terms specific to this module:

| Term | Meaning |
|---|---|
| **Approve / Reject** | `PENDING APPROVAL → READY` / `→ RETIRED` via the Asset Registry approval API. Deprecated and hidden in the prototype; logic retained |
| **ACTIVE** | Both platform and actor certificates issued. Cannot be retired |
| **Actor / Platform Certificates** | Issued outside Atrium; drive `READY → PROVISIONED → ACTIVE` |
| **Building Controller complement** | The five values a Building Controller supplies for Faculty-registered Devices (Faculty, Floor, Room, Device IP, Last Seen), merged into the Asset Registry record by asset tag |
| **Building Controller fan-out** | Querying every Building Controller under the selected Campus and merging the responses |
| **NOT REGISTERED** | A withdrawn status: Devices known only to a Building Controller are no longer surfaced |
| **PENDING APPROVAL** | Registered in Asset Registry outside Atrium, awaiting approval. Its approval path is deprecated and hidden in the prototype |
| **PROVISIONED** | Only platform certificates issued |
| **READY** | The entry status for every Device registered through Atrium |
| **RETIRED** | Soft-deleted; unusable until re-registered |

---

## Source map

| Source | Layer | Path |
|---|---|---|
| Router | Design intent | [manage-devices/PROTOTYPE.md](../../manage-devices/PROTOTYPE.md) |
| Faculty-registered-mode requirements | Discovery + server/client change spec | [manage-devices/requirements.md](../../manage-devices/requirements.md) |
| Divergence tracker | Open questions, closed decisions | [manage-devices/to-do.md](../../manage-devices/to-do.md) |
| QA notes | Test observations | [manage-devices/qa.md](../../manage-devices/qa.md) |
| Changelog | 5 entries, 2026-05-27 → 2026-07-22 | [manage-devices/changelog.json](../../manage-devices/changelog.json) |
| Shipped client and user guide | `Admin` domain description, Atrium user guide | Not part of this portfolio |
