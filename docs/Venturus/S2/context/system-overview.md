# Atrium System Overview

What Atrium is, the systems it sits between, and how the two prototypes are put together. Orientation for someone new to the project, and the shared context the [module knowledge base](module-knowledge-base/README.md) assumes.

Combines the three prototypes' requirements and code (`manage-infrastructure/`, `manage-devices/` and `device-recovery/`), the role personas in `runtime/davinci-users.json`, and the cross-module patterns visible across both topic files.

## See also

- [module-knowledge-base/README.md](module-knowledge-base/README.md) — the index of the three topic files, with a coverage table and known traps
- [glossary.md](glossary.md) — shared vocabulary, and the terms that mean different things per module
- [roles-permissions.md](roles-permissions.md) — the roles, the two live personas, and the permission gates the prototypes actually implement. [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) and [manage-devices.md](module-knowledge-base/manage-devices.md) and [device-recovery.md](module-knowledge-base/device-recovery.md) document the screens those gates sit on

---

## What Atrium is

A web tool the central IT team at Northfield University uses to manage campus AV and room-control infrastructure. Every lecture hall, lab and library room has devices — projectors, microphones, door readers, room panels. Each building has a **Building Controller** (an edge server) that talks to those devices and pulls timetables and room policies from a **Campus Hub**; a **Timetable Relay** mirrors timetable and firmware files out to the controllers. Atrium gives people one place to:

- **See** the campus estate and what is configured where
- **Change** infrastructure — Building Controllers, Campus Hubs, Timetable Relays, their faculties, associations and Registry Sync
- **Register and retire devices** — AV Technicians register devices per room, a Faculty Coordinator approves them, Campus IT Admins manage the infrastructure, and broken devices are retired

Atrium is largely a **control plane**. Most of what it writes lands in an external system of record; it rarely owns the data itself. Two consequences run through both modules:

1. **Refusal is normal.** Writes go through to systems that can say no: Asset Registry may refuse a Registry Sync change, and a Building Controller scheduled for a Timetable Release cannot be archived or moved. Nearly every blocked action explains itself in a toast or a tooltip.
2. **Atrium stops at the database layer in places.** The `READY → PROVISIONED → ACTIVE` steps of a device's life (certificate issuance) happen outside Atrium; the UI only offers the actions Atrium owns.

---

## The two device types

Almost every device view forks on this, and the fork is global — a toggle in the top navigation bar, not a per-page control.

| | **Faculty-registered** | **IT-managed** |
|---|---|---|
| Device type value in code | `Registered` | `Managed` |
| Registered by | An AV Technician for a Faculty, approved by a Faculty Coordinator | Born in Room Booking Manager by central IT |
| Complement data (Faculty, Floor, Room, Device IP) | Supplied by the Building Controller serving the room | Room Booking Manager |
| Statuses used in the sample data | `ACTIVE`, `READY`, `RETIRED` | Born `READY`, then onward |
| Source of record | Asset Registry | Asset Registry |

> Switching the toggle resets the current view, filters and any in-progress operation.

The two views of Manage Devices are disjoint by type. When a Faculty-registered device's assigned Building Controller is unreachable, its complement cannot be read and the table collapses the controller columns into one warning cell naming the controller. Manage Infrastructure is not affected by the toggle.

---

## External systems

Atrium sits among eight systems. Understanding which one owns what explains most of the module boundaries.

```
                        ┌──────────────┐
                        │    Atrium    │  control plane
                        └──────┬───────┘
        ┌──────────────┬───────┼────────┬──────────────┐
        ▼              ▼       ▼        ▼              ▼
  ┌───────────┐  ┌──────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐
  │ Campus    │  │ Building │ │ Room       │ │ Asset    │ │ Campus      │
  │ Hub       │─▶│Controller│ │ Booking    │ │ Registry │ │ Master Data │
  │ central   │  │ per      │ │ Manager    │ │ devices  │ │ campuses /  │
  └───────────┘  │ building │ └────────────┘ │ + certs  │ │ faculties / │
                 └────┬─────┘                └──────────┘ │ rooms       │
                      │                                    └─────────────┘
                      ▼
              ┌────────────────┐
              │ Timetable Relay│
              │ files          │
              └────────────────┘
```

| System | Owns | Atrium's relationship |
|---|---|---|
| **Campus Hub** | Timetables and room policies. **One master hub (`hub.atrium.test`) plus local hubs per campus** | Read + write. Atrium syncs changes back to it so delivery continues undisrupted |
| **Building Controller** | Each building's *local* copy of timetables, room policies and device state | Read + write. The reconciliation target |
| **Timetable Relay** | Mirrored timetable and firmware files | Read + write. A controller has at most one |
| **Room Booking Manager** | IT-managed devices, and campuses, faculties, floors and rooms for them | Read. ⚠️ Also an **external permission authority** — see the [glossary](glossary.md#same-word-different-thing) |
| **Asset Registry** | Device status, certificates, device type. Target of **Registry Sync** | Read + write. System of record for Devices |
| **Campus Master Data** | Campuses, faculties and rooms | Read. Validation source |
| **Proxy Manager** (`proxies.legacy.test`) | Legacy proxy-URL management | **Replaced** — [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) folds its functionality into Atrium |
| **Atrium Access** (`access.atrium.test`) | Which faculties a user may access; the directory group `atrium-admins` | Read — a permission gate **separate from** the Atrium role |

The Campus Hub is a distributed system, and the Bridge Service switch on a hub controls SQL replication.

---

## Getting in: auth and campus scoping

Three gates stand between a person and an Atrium page. Each fails to a different outcome.

```
Sign-in ──▶ Atrium Access ──▶ Role ──▶ Campus scoping ──▶ page
   │              │              │             │
   ▼              ▼              ▼             ▼
(external)   no faculties   nav items      campus list is
             granted        hidden         filtered to the user
```

1. **Sign-in** — external to Atrium.
2. **Atrium Access** — a user must be granted the faculties they need. Users with none see no campuses.
3. **Role** — Campus IT Admin, Viewer and the other roles gate which navigation items and actions a person sees. See [roles-permissions.md](roles-permissions.md).
4. **Campus scoping** — every campus and faculty list is filtered to what the user may access. In Manage Devices the scope is a single-select **Campus** (a `proj-cascader`), identical for both device types; in Manage Infrastructure it is a Campus multi-select plus a Faculties filter in the sub-header.

**Faculty visibility is per user throughout.** It is a property of the session, not a per-module feature.

⚠️ The prototypes do not authenticate anyone. A persona switcher in the user menu (`runtime/davinci-users.json`) stands in for the sign-in, the role and the faculty grants.

---

## Route map

Only the three prototypes exist. The canvas navigation (`runtime/canvas-navigation-data.json`) lists the first two under a **Manage** menu and Device Recovery as its own entry, and the home URL is `manage-infrastructure`.

```
/                              home → manage-infrastructure/
│
└── Manage
    ├── Infrastructure         manage-infrastructure/    manage-infrastructure.md
    ├── Devices                manage-devices/      manage-devices.md
    └── Device Recovery        device-recovery/     device-recovery.md
```

| Menu item | Folder | Page title | What it does |
|---|---|---|---|
| **Infrastructure** | `manage-infrastructure/` | Manage Infrastructure | Tree of Building Controllers, Campus Hubs and Timetable Relays per campus; context-aware side panels; Create Node flow (also Unarchive and Move); always-on bulk mode; archive and move; Registry Sync cascade; CSV export |
| **Devices** | `manage-devices/` | Manage Devices | Device table per campus; two-step Add Devices wizard; retire; export template or data |
| **Device Recovery** | `device-recovery/` | Device Recovery | IT-managed Devices only: Registration tab (recovery profile status, counters, Send Recovery Request) and Roll out tab (recovery version wizard, schedule, history, XLSX import) |

Folder names and URLs stay as they are even where the page titles changed; do not rename them. The Knowledge Base itself lives in `context/` and is reached from the **Knowledge Base** button in the ribbon.

---

## How the prototypes are built

Both prototypes are static pages on the DaVinci Canvas with in-memory state, faked async outcomes and no persistence beyond a few localStorage keys. Each topic file's *Status* section says which layers exist — check it before treating prototype behaviour as real.

| Concern | Technology |
|---|---|
| Shell | DaVinci Canvas; page content in `<script id="page-content">`; sub-header from `canvas-navigation-data.json` |
| Language | Plain JavaScript modules per feature (`js/`), CSS per feature (`css/`) |
| Components | The design system plus plugin components in `runtime/plugins/` (`proj-multi-select`, `proj-cascader`, `proj-wizard`, `proj-source-toggle`, `proj-field-error` and others) |
| Docs | Each prototype has a `PROTOTYPE.md` router and `requirements.md`; Manage Infrastructure also has `error-cases.md` |

---

## Cross-cutting patterns

Patterns that recur across both modules — worth recognising once rather than rediscovering per file.

**Select, review, commit.** Both modules gather a selection (tree rows, table rows, or an uploaded list), show what will change, and commit with a toast that reports successes and conflicts separately. A conflict keeps the flow open on what still needs attention.

**Blocked actions stay visible.** A menu item whose action is not allowed is listed but inert, with its reason as a tooltip (for example a Building Controller scheduled for a Timetable Release cannot be archived or moved).

**Unsaved-change guards.** Panels hold Save and Discard until a field differs from its snapshot; closing a wizard or drawer with pending input asks to keep editing or discard.

**Tree plus details panel.** Manage Infrastructure drills from Campus to a node and edits it in a side panel; creation and removal live in a **Manage** dropdown.

**Partial success is a result.** A bulk Registry Sync change can succeed on some controllers and be refused on others; the toast says which.

**Inline field errors.** Every validation message comes from the `ProjFieldError` plugin in one shape ("Enter <Label>", "Enter a valid <Label>", "<Label> already in use").

---

## Known limitations & gotchas

1. **The prototypes are not a shipped app.** State is in memory; reloading resets it. Each topic file's *Status* section says what exists.
2. **Folder names are historical.** `manage-infrastructure/` is Manage Infrastructure and `manage-devices/` is Manage Devices; identifiers such as `lineServer`, `ghdsAssociation` and `fsnApiCalls` keep their code names.
3. **Hostnames must end with `atrium.test`.** Legacy hosts on `campus.test`, `legacy.test` or `.local` show **Hostname outdated**, and a legacy short name cannot generate a Proxy URL automatically.
4. **Persona gating is by CSS selector.** Renaming a button id or nav href silently un-gates it. See [roles-permissions.md](roles-permissions.md).
5. **Registry Sync can be refused.** Asset Registry may refuse a disable, archive or hostname change; the prototype shows a placeholder message for the refusal reason.
6. **Two device views, one dataset.** The IT-managed and Faculty-registered views are disjoint by device type; a device never appears in both.

---

## Source map

| Source | Layer | Path |
|---|---|---|
| Manage Infrastructure requirements | Functional requirements, UX rules | `manage-infrastructure/requirements.md` |
| Manage Infrastructure error cases | Hidden error and blocked states | `manage-infrastructure/error-cases.md` |
| Manage Devices requirements | Device lifecycle, wizard, export | `manage-devices/requirements.md` |
| Prototype routers | Module maps, recent behaviour | `manage-infrastructure/PROTOTYPE.md`, `manage-devices/PROTOTYPE.md` |
| Canvas navigation | Menu, sub-headers, persona | `runtime/canvas-navigation-data.json` |
| Personas | Demo-only role switching | `runtime/davinci-users.json` |
| The two topic files | External systems, platform split, cross-cutting patterns | [module-knowledge-base/](module-knowledge-base/README.md) |
