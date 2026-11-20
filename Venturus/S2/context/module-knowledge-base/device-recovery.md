# Device Recovery

Showing whether each IT-managed Device has its recovery profile registered with the Room Booking Manager, sending a recovery request when a status looks stuck, and rolling out a recovery version to Registered Devices, in one two-tab page for Campus IT Admins.

Combines the prototype `device-recovery/` (code first, then its `PROTOTYPE.md`, `requirements.md`, `qa.md` and `error-cases.md`). The prototype runs on local mock data only.

## See also

- [manage-devices.md](manage-devices.md): the Device list this page works on. The row action **See in Manage Devices** opens that page, and a recovery profile that is not set is fixed there.
- [manage-infrastructure.md](manage-infrastructure.md): Faculty-registered Devices are registered by their Building Controller, which is why this page covers IT-managed Devices only.
- **Shared context**: [glossary](../glossary.md), [roles-permissions](../roles-permissions.md) and [system-overview](../system-overview.md).

---

## Status: design prototype

| Layer | State |
|---|---|
| Shipped client | None. No production implementation is described in any source |
| User guide | None |
| Prototype | `device-recovery/`, a **design prototype**. Every status, roll-out, history entry and import is a local mock; nothing is sent anywhere |
| Requirements | `device-recovery/requirements.md` (ids and priorities live there). `qa.md` and `error-cases.md` record open questions and undesigned error messages |

Treat the page as a design proposal for review, not production behaviour. Registration (visibility) is the main job; Send Recovery Request and the whole Roll out tab are proposed additions.

---

## Purpose

Device Recovery answers two questions for an IT-managed Device:

1. **Is its recovery profile registered with the Room Booking Manager?** The Room Booking Manager is the system of record. It registers Devices automatically when they ask for their room info and retries failures itself. The page shows the result; the **Send Recovery Request** button is a safety valve for when a status looks stuck (the page ribbon says exactly this).
2. **Which recovery version is installed, and can a newer one be rolled out?** The **Roll out** tab pushes a recovery version (v12 latest, v11, v10 in the sample data) to Devices that are **Registered**.

Faculty-registered Devices are out of scope: the top navigation toggle is pinned to **IT-managed**, and the Faculty-registered option is disabled with the tooltip *"Device recovery registration applies to IT-managed devices only. Faculty-registered devices are registered by their Building Controller."* The audience is the Campus IT Admin.

---

## Architecture

```
device-recovery/
├── index.html          content in <script id="page-content">: ribbon, tabs, counters, Registration table, Roll out pane, empty and loading states
├── js/
│   ├── data.js         FdrData: Campus > Faculty > Floor > Room > Device tree, flat lists, recovery versions, status metadata, bucket helpers
│   ├── state.js        FdrState: tab, scope, grouping, selection, query-string flags
│   ├── table.js        FdrTable: scope, search, counter and column filtering; counters; the grouped Device table; shared helpers
│   ├── column-filters.js  FdrColumnFilters: sort and filter popovers per column header
│   ├── actions.js      FdrActions: Send Recovery Request confirm, mock send, result notice, polling
│   ├── deploy.js       FdrDeploy: Roll out tab (version strip, wizard, table, summary, status, history, schedule, versions, import dialogs)
│   ├── subheader.js    FdrSubheader: pinned toggle, Campus and Faculty pickers, Group by campus
│   └── main.js         FdrApp: canvas-ready init and the single render()
├── css/                main → page + table + deploy
├── maps/               per-file maps (html, js, css)
└── PROTOTYPE.md, requirements.md, qa.md, error-cases.md
```

- **Script order** in `index.html`: canvas, then `data`, `state`, `table`, `column-filters`, `actions`, `deploy`, `subheader`, `main`. Each file reads the globals of the earlier ones.
- **Boot.** `main.js` initialises on `davinci:canvas:ready`, with a 300 ms fallback if the event never fires, then draws a 600 ms loading state before the first render.
- **One render.** `FdrApp.render()` redraws ribbon, tabs, counters, tables and the selection bar from state. Every control changes state and calls it.
- **Subheader markup** lives in `runtime/canvas-navigation-data.json` (page entry `device-recovery`), not in the prototype folder: Campus and Faculty pickers (`#fdrSites`, `#fdrProjects`), search, the **Group by campus** switch, the filter status with **Clear Filters**, and the **Send Recovery Request** button. `subheader.js` wires them.
- **Plugins and components.** `proj-source-toggle` (navbar pill, pinned), `proj-multi-select` (pickers), `proj-popover-editor` and `proj-cascader` (column filters). Roll out dialogs are plain `modal-overlay` / `modal` markup built in `deploy.js`; the send confirmation is a fixed popover built in `actions.js`.
- **No persistence.** Unlike Manage Devices, nothing is written to localStorage. A reload resets every mock change.

---

## Data model

### Hierarchy and the Room Device

`data.js` builds one tree, **Campus > Faculty > Floor > Room > Room Device**, then two flat lists the tables use: `stations` (Rooms) and `units` (Devices, each the tree node itself). Names in code keep their historical spelling.

| Entity | Fields | Notes |
|---|---|---|
| **Campus** | `NORT`, `HLSD`, `MEDS` | The Campus picker lists all three; the default selection is `NORT` and `HLSD` |
| **Faculty** | `ENG`, `SCI`, `LIB` | `LIB` has no Devices (and `HLSD` / `SCI` and `MEDS` / `SCI` are empty). Default selection is `ENG` |
| **Floor** | `Engineering L1`, `Engineering L2`, `Science Block L1` | Not a level of the screen; carried on each Device and used when building the Manage Devices link |
| **Room** | `id`, `name`, `fdrType` (recovery profile) | 9 Rooms, for example `nort-dev1` EN-101 Lecture Theatre, `nort-acond` EN-103 AV Lab, `nort-sci-acond` SB-110 Chemistry Lab, `hlsd-dev1` EN-101 Lecture Theatre |
| **Room Device** | `id`, `serial` (Asset Tag), `site`, `project`, `status`, `updatedAt`, `deploy`, `history`, `unavailable`, `sim` | 32 Devices. Asset Tags follow PRJ / MIC / DRD / PNL + Campus + number, for example `MICNORT4001`, `DRDNORT4002`, `PNLNORT4003` |

The screen works on **Devices**. Floor and Room are not levels of the screen; the table groups by Faculty and Campus only.

### Recovery profile

The profile of a Room, copied onto each of its Devices as `fdrType`. Values: **Standard**, **Extended**, **Not set**, **No access**. `Not set`, `No access` and an empty value are the cannot-register profiles (`isCannotRegister`): the Room Booking Manager does not register such a Device and the page shows **Cannot register** instead of a status.

### Registration statuses

Stored on the Device in `status`. Read-only on the page.

| Status (label) | Code | Tone | Meaning |
|---|---|---|---|
| **Registered** | `REGISTERED` | green | Recovery profile registered |
| **Queued** | `QUEUED` | gray | A request is waiting. Skipped by Send Recovery Request |
| **Re-register** | `RE_REGISTER` | blue | Sent for re-registration. The Room Booking Manager can set it by itself, so it is never worded as "your request" |
| **Failed** | `FAILED` | red | Registration failed |
| **Not registered** | `UNREGISTERED` | gray | Neutral and normal until the Device asks for its room info. Has no Updated at value |
| **Unavailable** | `UNAVAILABLE` | orange | Derived, not stored: set when the Device's `unavailable` flag is true (the `?state=unavailable` demo). Overrides the stored status |

### Counter buckets

`FdrData.bucket(device)` assigns every Device to exactly one bucket, in this order of precedence: unavailable, cannot register, then by status.

| Counter card | Bucket | Contains |
|---|---|---|
| **Need attention (Failed)** | `attention` | `FAILED` |
| **Not registered yet** | `unregistered` | `UNREGISTERED` |
| **In progress** | `progress` | `QUEUED` and `RE_REGISTER` |
| **Cannot register** | `cannot` | cannot-register profile, whatever the status (counts only here) |
| **Registered** | `registered` | `REGISTERED` |
| **Unavailable** | `unavailable` | Shown only when at least one Device is unavailable |

Default table order is by bucket rank: attention, unavailable, not registered, in progress, cannot register, registered.

### Recovery version

`FdrData.versions`, newest first: `v12` (2026-11-02, Priya Raman, 14 Rooms, note *Latest*), `v11` (2026-10-19, Tomás Herrera, 14 Rooms), `v10` (2026-10-04, Tomás Herrera, 12 Rooms). Fields: `id`, `label`, `importedAt`, `by`, `stations` (Room count), `note`. Versions are portfolio-wide, not per Campus. Importing a new version puts it first and moves the *Latest* note to it.

### Roll-out state on a Device

- `deploy`: the Device's latest roll-out entry (`version`, `status`, `at` or `scheduledFor`, `by`, `message`).
- `history`: the list of finished entries. Roll-out statuses are `success` (**Rolled out**), `error` (**Failed**), `scheduled` (**Scheduled**) and `deploying` (**Rolling out**).
- **Installed version** (`installedVersion`) is the version of the last `success` entry in `history`, or none. A failed, scheduled or running roll-out does not change it.
- Seed data gives every Registered Device a history by rotation (v10 then v11; v12 only; one scheduled for 2026-11-20 10:00; v11 then a failed v12 with the message *The device did not acknowledge the recovery package.*).
- A Device is **eligible** for roll-out when it is Registered, not unavailable, and not currently Rolling out.

---

## Key workflows

### Page frame

- Navbar toggle pinned to **IT-managed**; **Campus** and **Faculty** multi-select pickers (labels *All Campuses* / *All Faculties*); search over Asset Tag, Campus and Faculty; **Group by campus** switch (on by default).
- A sticky info ribbon explains the tab. Registration: the Room Booking Manager registers automatically and retries, so use Send Recovery Request only when a status looks stuck. Roll out: only registered Devices can receive a roll-out.
- Empty states: *Select campuses*, *Select faculties*, *No IT-managed devices in <faculties>*, *No devices found*.
- Switching tab clears sort and closes open filter popovers. The Updated at filter is reset on the Roll out tab, which has no such column.
- Changing the Campus picker clears the Device filter, un-ticks Devices outside the selected Campuses and shows the loading state again. Changing the Faculty picker also clears both selections and the active counter.

### Registration tab

- **Counter cards** (see buckets above) are toggle buttons that filter the table; clicking the active card clears it. A vanished Unavailable card is cleared automatically.
- **Table** columns: checkbox, **Device** (Asset Tag), **Recovery profile**, **Status**, **Updated at** (ISO timestamp as stored, `-` if none), row actions. Rows are grouped Faculty (when several are selected) then Campus (when the switch is on); each group row has a collapse chevron and, in the Status column, fixed-slot count chips per status.
- **Column sort and filter.** Header click cycles ascending, descending, off. Filters: Device (cascader Faculty > Campus > Device), Recovery profile (checkboxes), Updated at (All, Today, Last 7 days, Last 30 days, Never updated). Status has neither. **Clear Filters** appears with "Results are filtered" when a counter or column filter is active.
- **Row actions.** **See in Manage Devices** (opens in a new tab) and a per-row **Send Recovery Request** icon.
  - Enabled only for `FAILED` and `UNREGISTERED` Devices.
  - Disabled with a reason for Cannot register (the profile is not set), Unavailable (status could not be read), In progress (already queued), and while a send is running.
  - Cannot-register and Unavailable Devices cannot be ticked either; the Cannot register chip explains the reason and points to Manage Devices to set the profile.
- **Unavailable row.** Shows the Unavailable chip and *Status unavailable for this device* with a **Retry** link that clears the flag after 0.9 s.

### Send Recovery Request

1. Tick Devices (or use a row icon) and press **Send Recovery Request** in the subheader (plural label for several).
2. A popover confirm titled *Send Recovery Request?* (or *Requests?*) lists up to 6 Devices as Asset Tag, Faculty, Campus, noting *already queued*, and states how many will be sent and how many already-queued Devices are skipped.
3. **Send Recovery Request** shows *Sending…* for 1.2 s. While it runs, Escape and outside clicks are swallowed so the confirm cannot be dismissed.
4. Sent Devices become **Re-register**, get a fresh Updated at, are un-ticked, and a success toast reports how many were sent and how many skipped, and says the page updates by itself
5. **Polling** every 4 s advances simulated Devices: Re-register to Queued to Registered, and stops when none is left.
- **Demo `partial`**: the failed Device in `hlsd-dev1` is rejected (*Room Booking Manager rejected: no MAC*) and a warning notice replaces the toast.
- **Demo `fsm-down`**: an error notice *Room Booking Manager could not be reached. No request was sent.* with **Try again**, which clears the demo flag and reopens the confirm.

### Roll out tab

- **Version strip**: *Latest recovery version* (link opens the **Recovery versions** dialog: Version, Imported at, By, Rooms), a version picker (*Select a version*, then v12 (Latest), v11, v10), a **scheduled roll-outs** link and **Import version**.
- **3-step wizard**: **Select a version**, **Select devices**, **Proceed to roll-out**. Steps follow state; Proceed is enabled when a version and at least one Device are chosen. Clearing the version clears the selection.
- **Table**: checkbox, **Device**, **Recovery profile**, **Recovery version** (installed), **Last rolled out** (status icon button plus timestamp and author, or *Never rolled out*), and a history icon. Group rows show *N of M can be rolled out*. Ineligible rows are muted and their checkbox tooltip gives the reason (*Only registered devices can receive a recovery roll-out. This device is Failed.*, or a roll-out already running); before a version is picked, the tooltip says *Select a version first.*
- **Summary dialog** *Recovery version roll-out*: lists Device, Faculty, Campus, Recovery profile, Installed version and After roll-out. The footer holds the **Schedule roll-out** checkbox and a date-time field (default tomorrow, on the hour; must be in the future), and the primary button reads **Roll out**, or **Schedule** when ticked.
- **Running.** A 1.2 s request, then each Device shows **Rolling out** (spinner) for 3.5 s and finishes as Rolled out. A toast confirms the roll-out of the chosen version and says the page updates by itself.
- **Schedule.** Scheduled Devices keep their previous installed version and show *Scheduled for <time>*. The **Scheduled roll-outs** dialog lists them by time with a **Cancel** link per row; the status dialog offers **Cancel schedule**. Cancelling restores the last history entry.
- **Status dialog** (click the status icon): Device, Recovery version, Status, Scheduled for / Rolled out at, By and Message. A failed entry offers **Retry**, which starts a new run.
- **History dialog**: master-detail list of entries, newest first, with an active scheduled or running entry on top; empty state *No roll-outs yet*.
- **Demo `deploy-fail`**: runs finish as Failed for Devices whose Asset Tag ends in an even number. **Demo `deploy-down`**: an error notice *The roll-out service could not be reached. No roll-out was started.*

### Import recovery version

Two steps in a dialog: **Upload and validate**, then **Review and import**.

1. Drop or choose an `.xlsx` file, or press **Use a sample file** (named `fdr-v<next>.xlsx` from the next version number). The file is not parsed. A validation warning lists *Room EN-104 Studio is in the file but has no devices at the selected campuses.* and *2 rooms have no recovery keys.*
2. The review step states *This creates recovery version vN* and shows five sample Rooms with profile and check. **Import** takes 1.2 s, adds vN as the new Latest version and shows a toast.
- **Demo `import-error`**: after a file is chosen the dialog shows *The file could not be validated. Column "recovery profile" is missing.* and Next stays disabled.

### Demo states

Query-string values, read once in `state.js` (`?state=`). Names are code and stay exact.

| Value | Effect |
|---|---|
| `unavailable` | One Device of `nort-acond` (EN-103 AV Lab) becomes Unavailable |
| `fsm-down` | Send Recovery Request fails: Room Booking Manager unreachable |
| `partial` | Send succeeds except for the failed Device in `hlsd-dev1` |
| `readonly` | Read-only view (see Roles & permissions) |
| `deploy-fail` | Roll-outs finish as Failed for even-numbered Asset Tags |
| `deploy-down` | Roll out and Schedule fail: roll-out service unreachable |
| `import-error` | Import validation fails |

### Deep link

`?station=<room id>&unit=<asset tag>`, for example `?station=nort-dev1` with the Asset Tag of one of its Devices. On arrival `main.js` sets the Campus and Faculty to those of the Device, applies the Device column filter to every Device of that Room (or only the one Device when only `unit` is given), highlights and scrolls to the row (`id="unit-<asset tag>"`). **Clear Filters** drops the filter. Room ids are the `id` values of the sample Rooms.

The reverse link is the row action **See in Manage Devices**, whose URL builder is `factoryUrl()` in `js/table.js`; it opens `../manage-devices/?site=<campus>&type=Managed&q=<asset tag>` in a new tab; Manage Devices reads those parameters (`js/subheader.js`), selects the campus and the IT-managed type, and fills the search with the asset tag. Manage Devices has no entry point that opens this page yet.

---

## Roles & permissions

- Device Recovery has **no role gating** in the prototype, apart from the `?state=readonly` demo. It does not use the impersonation personas (Maya Okafor, Campus IT Admin, default; Daniel Reyes, Viewer) and no rule in `runtime/davinci-users.json` targets it.
- **Audience**: Campus IT Admins (see [roles-permissions](../roles-permissions.md)).
- **`?state=readonly`**: adds a ribbon line (*You can see device recovery registration but not send recovery requests.* / *You can see recovery roll-outs but not start, schedule or cancel them.*), hides the selection bar, checkboxes and Import version, keeps only **See in Manage Devices** as a row action, and hides Retry, Cancel schedule and per-row Cancel in dialogs.
- Permission-denied and unexpected-error messages at send time are not designed (`error-cases.md`).

---

## Known limitations & gotchas

- **Everything is mock.** Statuses, roll-outs, history, versions and the import are in memory; nothing persists across reloads, and the XLSX file is never read.
- **Query-string demo is read once.** The `state` flag is read when the page loads; `Retry` on an Unavailable Device and **Try again** clear it in memory.
- **Unavailable needs the demo.** Only `?state=unavailable` marks a Device unavailable.
- **Re-register is not "your request".** The Room Booking Manager can set it by itself; copy avoids implying the user sent it.
- **Skipped, not blocked.** Queued Devices stay selectable in a multi-send and are skipped and counted rather than refused.
- **Eligibility drops ticks.** A ticked Device that stops being eligible (for example it was just sent for re-registration) is un-ticked on the next render.
- **Not implemented** (see `qa.md`): Room-level entry points from Manage Devices, a Resend link next to a status, recovery keys row, user-visible request history, product-level send, the missing-rooms steps and XLSX export of the roll-out, and parsing of the imported file.
- **Subheader is outside the folder.** Its markup is in `runtime/canvas-navigation-data.json`, the same trap as in [manage-infrastructure.md](manage-infrastructure.md) and [manage-devices.md](manage-devices.md).
- **Internal names are historical.** Element ids, CSS classes, the globals `FdrData`, `FdrState`, `FdrTable`, `FdrActions`, `FdrDeploy`, `FdrApp` and fields such as `fdrType`, `station`, `unit` and `deploy` keep their original spelling; the UI words are Recovery profile, Room, Device and Roll out.
- **Group totals.** The total shown on a Roll out group row counts eligible Devices only.

---

## Cross-topic dependencies

| Topic | Relationship |
|---|---|
| [manage-devices.md](manage-devices.md) | The Device list (IT-managed type). **See in Manage Devices** opens it; a Not set recovery profile is fixed there. The Asset Tags and Rooms in the sample data mirror its hierarchy |
| [manage-infrastructure.md](manage-infrastructure.md) | Faculty-registered Devices are registered by their Building Controller, so this page excludes them and pins the navbar toggle to IT-managed |
| **Room Booking Manager** | System of record for registration. Registers Devices automatically and retries failures; the page only reads status and sends re-registration requests. Its outage is the `fsm-down` demo |
| **Asset Registry** | System of record for the Devices themselves, via Manage Devices |
| **Campus Master Data (CMD)** | Source of Campuses, Faculties and Rooms behind the hierarchy |

---

## Testing

No automated tests exist. Highest-value manual checks:

- Each counter card filters the table and a cannot-register Device counts only under **Cannot register**.
- Row Send Recovery Request enabled for Failed and Not registered only; the multi-send skips and counts Queued Devices.
- Send flow end to end: confirm, 1.2 s, toast, Re-register to Queued to Registered over polling.
- Each demo state: `unavailable`, `fsm-down`, `partial`, `readonly`, `deploy-fail`, `deploy-down`, `import-error`.
- Roll out: Proceed disabled until a version and a Device are chosen; Schedule only accepts a future time; Cancel schedule restores the previous status; Retry on a failed entry.
- Import: both steps, Back, the new version becoming Latest in the picker.
- Deep link `?station=nort-dev1&unit=<asset tag>` selects the right Campus and Faculty and highlights the row.
- Campus and Faculty pickers: selection pruning and the four empty states.

---

## Terms

Shared vocabulary lives in the [glossary](../glossary.md) (**Device Recovery**, **Recovery profile**, **Recovery version**, **Recovery request**, **Roll out**, the device recovery statuses, **IT-managed**, **Room Booking Manager**). Terms specific to this page:

| Term | Meaning |
|---|---|
| **Cannot register** | A Device whose recovery profile is Not set or No access; the Room Booking Manager does not register it |
| **Need attention** | Counter card for Failed Devices |
| **Eligible (for roll-out)** | Registered, available and not Rolling out |
| **Installed version** | Version of the last successful roll-out on a Device |
| **Last rolled out** | The Device's latest roll-out entry: status icon, time and author |
| **Group by campus** | Switch that adds the Campus level under Faculty |
| **Pop-confirm** | The popover that confirms a Send Recovery Request |
| **Version strip** | Bar on the Roll out tab with the latest version, picker, scheduled link and Import version |

---

## Source map

| Source | Layer | Path |
|---|---|---|
| Page shell | Prototype | `device-recovery/index.html` |
| Data and statuses | Prototype | `device-recovery/js/data.js` |
| State and demo flags | Prototype | `device-recovery/js/state.js` |
| Table, counters, filters | Prototype | `device-recovery/js/table.js`, `device-recovery/js/column-filters.js` |
| Send Recovery Request | Prototype | `device-recovery/js/actions.js` |
| Roll out tab and dialogs | Prototype | `device-recovery/js/deploy.js` |
| Subheader and entry | Prototype | `device-recovery/js/subheader.js`, `device-recovery/js/main.js` |
| Styles | Prototype | `device-recovery/css/main.css`, `page.css`, `table.css`, `deploy.css` |
| Router | Design intent | `device-recovery/PROTOTYPE.md` |
| Requirements | Spec | `device-recovery/requirements.md` |
| QA notes, error cases | Open questions | `device-recovery/qa.md`, `device-recovery/error-cases.md` |
| Change history | History | `device-recovery/changelog.json` |
| Per-file maps | Prototype | `device-recovery/maps/` |
| Subheader markup | Runtime | `runtime/canvas-navigation-data.json` |
| Shared context | KB | [glossary](../glossary.md), [roles-permissions](../roles-permissions.md), [system-overview](../system-overview.md) |
