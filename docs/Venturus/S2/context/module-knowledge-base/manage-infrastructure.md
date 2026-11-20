# Manage Infrastructure

Migration of building-controller management into Atrium: a flat tree of Building Controllers, Campus Hubs and Timetable Relays per campus, a context-aware details panel, a unified Create / Unarchive / Move Node drawer, always-on bulk selection, and a campus-level Registry Sync cascade.

⚠️ **This module is design-only.** There is no production Atrium implementation of it and no `manage-infrastructure` topic in the Atrium user guide. Every source below is a **design artefact in this repo**. See [Status: design-only](#status-design-only).

This document covers the **`manage-infrastructure`** prototype (requirements **v2.44**).

## See also

- [manage-devices.md](manage-devices.md) — Manage Devices, the sibling prototype. Devices are registered per room on the Building Controllers managed here, and the archive popover of this module checks for registered devices.
- [device-recovery.md](device-recovery.md) — Device Recovery, the third prototype. Faculty-registered Devices are registered by their Building Controller, so that page covers IT-managed Devices only.
- **Shared context** — [context/glossary.md](../glossary.md), [context/roles-permissions.md](../roles-permissions.md) and [context/system-overview.md](../system-overview.md). Module-specific terms are in [Terms](#terms).

---

## Status: design-only

| Layer | State |
|---|---|
| Production client | **Absent.** No production implementation exists |
| User guide | **Absent.** No `manage-infrastructure` topic |
| User-guide source | None. This document and the requirements are the only prose descriptions of the module |
| Prototype | One prototype, `manage-infrastructure` |
| Requirements | `manage-infrastructure/requirements.md` **v2.44, November 4, 2026, Status: Draft — reconciled with the prototype code on that date** (a three-pass requirements ↔ code review; revision history before v2.43 now lives in git, not in the file) |
| Error cases | `manage-infrastructure/error-cases.md` — hidden error / blocked / warning states and the flow to reach each seeded example |

Treat everything here as specification and design intent. Nothing below describes production behaviour.

---

## Purpose

> "This document defines the functional and non-functional requirements for migrating node management capabilities into **Atrium**, making it the single source of truth for managing Building Controllers, Timetable Relays, Campus Hubs, and their associations with faculties and campuses." — `requirements.md` §1.1

Infrastructure management at Northfield University is currently split across systems. The migration consolidates it:

| System | Current role | After migration |
|---|---|---|
| **Campus Hub** | Primary backend for node management and timetable delivery | Still receives synced changes; keeps delivering timetables |
| **Proxy Manager** (`proxies.legacy.test`) | Manages proxy URLs and additional node switches | **Replaced** — all functionality folds into Atrium |
| **Campus Master Data (CMD)** | Source of truth for campuses, faculties, rooms | Unchanged — Atrium reads from it |
| **Atrium** | — | **New source of truth** for building controller management |

The migration follows the earlier Campus Hub → Campus Master Data model: Atrium takes over the UI and the database, and **syncs all changes back to Campus Hub** so timetable delivery continues undisrupted.

**In scope:** create/edit/archive Building Controllers, Timetable Relays and Campus Hubs; faculty-to-Building-Controller association; campus-to-node association (from Campus Master Data); Proxy URL management; Alert Service configuration; sync-back to Campus Hub; archived-node management.

**Out of scope:** campus and room management (stays in Campus Master Data), faculty creation (stays in Campus Master Data), backend infrastructure configuration, Campus Hub timetable delivery logic.

---

## Architecture

### Campus Hub is a distributed system

- **1 master instance** — `hub.atrium.test`, global and central.
- **N local instances** — one per Standalone Campus (`nort-hub.atrium.test`, `meds-hub.atrium.test`, `rvrs-hub.atrium.test`, `hlsd-hub.atrium.test`, …), spread across the university's campuses.

> **Future direction:** the long-term vision is to replace Campus Hub with a dedicated campus content-delivery service — Atrium would notify Building Controllers to fetch timetables from it directly. Until then Atrium must stay backward compatible. **The UI is deliberately designed so Campus Hub is an association/property, not a structural element**, so it can be removed later without restructuring the tree.

### Data flow

```
Campus Hub → Timetable Relay → Rooms (via Building Controllers)
```

The Timetable Relay is a **live file transfer node**: Campus Hub sends it timetable and firmware files, and it distributes them to the rooms across its associated Building Controllers.

### Node types

| Type | Campus Hub instance | Timetable Relay |
|---|---|---|
| **Connected Campus** | Master (`hub.atrium.test`) | The Building Controller itself — no dedicated Relay |
| **Standalone Campus** | Local Campus Hub (campus-specific) | Dedicated physical node per campus |
| **Test Lab** | Master (`hub.atrium.test`) | The Building Controller itself — behaves like Connected Campus |

(The option values in code are `panda` (Connected Campus), `fatp` (Standalone Campus) and `lab` (Test Lab).)

Node Type is a **per-Building-Controller** property (Standalone Campus / Connected Campus / Test Lab), not a campus-level one. Two Building Controllers on the same campus can differ. Each campus keeps a Node Type *seed* used only to backfill Building Controllers predating the field and to drive the Campus Hub Association label format — it is not surfaced to the user.

### Network transport protocol

| Node type | Protocol |
|---|---|
| Campus Hub | `aria2c` |
| Building Controller | `rsync` |
| Relay | `rsync` |

> **Constraint:** changing the Campus Hub transport to rsync would cause timetable transfer conflicts. Backend design constraint — must not be altered.

✅ **Naming settled (v2.44):** the field is **Network Protocol** everywhere — the Building Controller, Campus Hub and Relay panels and both associated-node sections. (Earlier the UI mixed "Protocol" and "Transport"; the document said "Transport".)

### Prototype structure

Map architecture — a `PROTOTYPE.md` router plus a `maps/` tree, with maps created lazily on touch (rows marked *pending* have no map yet).

```
manage-infrastructure/
├── index.html              # content in <script id="page-content">
├── css/main.css            # entry point, @imports feature files
├── js/init.js              # boots modules on davinci:canvas:ready
├── js/init-search.js       # init() does the heavy wiring
├── maps/                   # per-module deep context (css / html / js)
├── requirements.md         # surfaced by the ProjRequirementsPanel ribbon
├── error-cases.md          # surfaced by the ProjErrorCasesPanel ribbon
└── changelog.json          # 46 entries, 2026-04-09 → 2026-11-04
```

`Requirements_proxyurl.md` and `TODO.md` **no longer exist**. The Proxy URL rules live in `requirements.md` `FR-P2-14` / `FR-P2-19` / `FR-P2-25`, and open items in its §10.

Dependencies: DaVinci Canvas, the Atrium design system, the `ProjMultiSelect` and `ProjFieldError` plugins.

Key JS modules:

| Module | Responsibility |
|---|---|
| `js/config-data.js` | 5 datasets (building controller, Campus Hub, Relay, archived, orphan), factories, load-time passes (`everAssociated`, archived-Registry-Sync-off, `serverType`, Building Controller **and** Relay Proxy URL backfill, `_enforceSingleCDN`, Timetable Release flag, Campus Hub faculty grants), `forEachSeedServer`, Proxy URL derivation + outdated rules for both Building Controllers and Relays, the hostname-suffix rule, `fsnHostRemovalError`, shared Campus Hub/Relay option builders |
| `js/ui-helpers.js` | `buildAllServersTree`, `_rebuildTreeDOM` (the one rebuild path, preserves expansion), `updateLayoutVisibility`, Faculties sync, toast, the manual-Proxy-URL notice and modal |
| `js/tree-rendering.js` | Node creation, inline faculty tags, empty states, `findNodeById`, `captureTreeExpansion` / `restoreTreeExpansion` |
| `js/tree-search.js` | Global search over the whole estate; grouped results with per-type column-header rows |
| `js/selection.js` | `selectNode`, details panels, campus Registry Sync toggle, Save/Discard, `PANEL_FIELD_RULES`, all association cascades, Campus Hub rename propagation |
| `js/bulk-mode.js` | Cmd/Shift multi-select + bulk Registry Sync cascade |
| `js/new-node-drawer.js` | Entry-point-aware Create / Unarchive / Move drawer |
| `js/manage-actions.js` | Manage dropdown, association drawers, archive/unarchive/move gates |
| `js/export.js` | CSV export of visible Building Controllers |

**Shared state globals:** `lineServersData`, `selectedNodeId`, `selectedSites` (sorted A→Z at assignment), `selectedProjects`, `serverTypesData`, form toggle flags.

---

## Data model

### Campus

Campuses are **created and managed in Campus Master Data**, synced Campus Master Data → Campus Hub → available in Atrium for selection. The campus side panel surfaces only the **Configuration** section (Registry Sync) — Campus Info was removed.

### Campus Hub

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Host Name | text | required, **unique**, **ends in `atrium.test`** | First editable field, **always editable** (the v2.25 lock while Building Controllers were associated was removed in v2.31 — `FR-P2-22`/`FR-GH-05`). Placeholder `e.g. meds-hub.atrium.test`. A rename has wide consequences — see [Renaming a Campus Hub](#renaming-a-campus-hub) |
| Proxy URL | — | optional in the real app | **Never derived.** ⚠️ **The prototype has no Campus Hub Proxy URL input** — not on the Create form, not on the Campus Hub panel. Seeded values appear read-only in the ASSOCIATED CAMPUS HUB sections of the Building Controller and Relay panels (`FR-P2-06`) |
| Description | text | required | |
| Node IP | text | required, **unique** | **Editable** on the panel, directly under Hostname (`FR-P2-22`) |
| Campus | dropdown | required | From Campus Master Data. The drawer lists campus codes; the real app shows name + location, e.g. `MEDS (Medical Sciences, Northfield)`. Changeable only through **Move** (`FR-P2-23`) |
| Location (Building/Floor/Room) | text | required | |
| Bridge Service | **switch** | required | ON/OFF — SQL replication service. Set on the side panel; a Campus Hub created in the drawer starts **OFF** |
| Faculties (grant) | read-only list | — | The faculties the Campus Hub grants its Building Controllers (`FR-P2-18`) |
| Network Protocol | read-only | — | Always `aria2c`. ⚠️ The label is **Network Protocol** on every panel and both associated-node sections since v2.44 (the Relay panel and the ASSOCIATED TIMETABLE RELAY section used to say "Transport") |
| Internal Node ID | read-only | — | Assigned on creation |

> **Sync User** (`www`) is **not used in Atrium** (confirmed by Product, November 2026) and is deliberately not part of `FR-GH-01`'s field list.

> Energy Saver and Exam Lockdown were moved from Campus Hub to Building Controller — they are Building Controller settings, not Campus Hub properties.

### Building Controller

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Node Type | dropdown | required | Standalone Campus / Connected Campus / Test Lab. **Default empty** on Create — Save blocked until picked. **First** editable field on the panel (moved above Hostname in v2.27). Panel error: "Select Node Type" |
| Host Name | text | required, **unique**, **ends in `atrium.test`** | **Second** editable field. Renameable **only while no faculty is associated** — see [Hostname editing](#hostname-editing-and-rename-propagation). Placeholder `e.g. meds-bc1-4.atrium.test` |
| Node IP | text | required, **unique** | **Editable** on the panel, directly under Hostname (`FR-P2-22`) — reverses the v2.25 "not editable after initial submission" |
| Campus Hub | dropdown | **required on creation** | Editable after creation; can be set to `Not assigned` (`FR-P2-16`, `FR-P2-20`) |
| Relay Association | **single** dropdown | optional | `Not assigned` plus the non-archived Relays **of the Building Controller's own campus** on the Campus Hub currently picked. A Building Controller has **at most one Relay** (`FR-P2-24`). ⚠️ **Disabled for an archived Building Controller** — see [One Relay per Building Controller](#one-relay-per-building-controller) |
| Proxy URL | text | **required** | **Updates automatically and stays editable** — see [Proxy URL](#proxy-url). Under Relay Association on the panel, under Campus Hub Association on the Create form. Stored as `proxyURL` |
| Description | text | required | |
| Campus | dropdown | required | From Campus Master Data. **Not editable on the panel**; changed only through **Move** (`FR-P2-23`) |
| Location | text | required | |
| Add Faculty | multi-select | optional | **Disabled until Campus Hub is selected.** Optional on Create, Unarchive and Move. Offers only the faculties the campus has **and** the chosen Campus Hub grants (`FR-P2-18`); "No faculties available" when the Campus Hub grants none |
| Alert Service | **switch** | optional | Default OFF. Independent of the Relay since v2.38 — see [Alert Service](#alert-service) |
| Energy Saver | checkbox | optional | Building Controller setting |
| Exam Lockdown | checkbox | optional | Building Controller setting |
| Node ID | auto-generated | read-only, unique | Never user-entered; survives a Move |

Panel field order (`FR-P2-13`): Node Type → Hostname → IP Address → Campus Hub Association → Relay Association → Proxy URL → Description → Location → …

⚠️ **A Building Controller is stored once per associated faculty.** This is the single most load-bearing fact about the prototype's data model — it drives the archive fan-out, the orphan bucket, the Timetable Release backfill, the hostname-rename propagation and Move. Removing every faculty would leave no copy anywhere, so the node is parked in an **orphan bucket** (`orphanLineServersData[campus]`) instead.

### Timetable Relay

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Host Name | text | required, **unique**, **ends in `atrium.test`** | First editable field, always editable. Placeholder `e.g. meds-rly1-1.atrium.test` |
| Node IP | text | required, **unique** | **Editable** on the panel, under Hostname (`FR-P2-22`). Checked against every existing node on save |
| Campus Hub | dropdown | required | Editable after creation (`FR-P2-16`); a change detaches the Building Controllers left on the old Campus Hub. *(Prototype: the Create gate does not enforce it — Building Controller Association stays disabled until one is picked.)* |
| Proxy URL | text | **required** | Updates automatically, editable (`FR-P2-19`, `FR-P2-25`). Under **Campus Hub Association** on both the panel and the Create form |
| Description | text | required | |
| Campus | dropdown | required | From Campus Master Data. ⚠️ **Not surfaced on the Relay details panel** — open question `UX-06` |
| Location | text | required | |
| Building Controller Association | multi-select (Create form) | optional | **Active** Building Controllers of the form's campus on the selected Campus Hub **that have no Relay yet**, read live from the Building Controllers (so ones created or unarchived after load appear). Disabled (not hidden) until a Campus Hub is selected |

Timetable Relays **cannot be moved** between campuses (`FR-P2-23` covers Building Controllers and Campus Hubs only). Panel order: Hostname → IP Address → Campus Hub Association → Proxy URL → Description → Location.

> **Table Columns lists in §5.2–5.4 of the requirements are labelled real-app-only** — this prototype navigates a tree, not a table.

---

## Key workflows

### Loading and scoping

⚠️ **Nothing is selected when the page loads** (`UX-18`). The tree renders with no node selected and the panel shows "Select item(s) in the tree to load options". The same applies after a filter change removes the selected node — the panel returns to the empty state rather than falling back to the first campus.

**Campus roots always render alphabetically**, regardless of the order picked in the header multi-select.

The subheader carries, left to right: **Campus multi-select**, a vertical divider, **Faculties filter**, **Search bar** — then Export and Create Node on the right. The divider, Faculties filter and Search are **hidden until at least one campus is selected**. When a campus is first picked the Faculties filter defaults to "all selected" — narrowing is opt-in (`UX-13`).

**Expand/collapse state survives every re-render** (`UX-02a`) — save, cascade, Manage action, create, unarchive, any filter change. This includes Campus roots: a collapsed campus root stays collapsed, unless *every* branch is collapsed, which the prototype can't tell from a first render and re-expands. Branches appearing for the first time render collapsed.

### Tree structure

```
Campus (collapsible root, one per selected campus)
├── Building Controllers          flat list, direct children — the primary focus
├── Campus Hubs                   collapsible section at the bottom
└── Timetable Relays              collapsible section below Campus Hubs
```

Campus Hub and Relay are **sections, not parent nodes** — they are associations, shown as properties in the details panel. This is deliberate: the future replacement of Campus Hub should be able to remove it without restructuring the tree.

Inline **faculty tags** on Building Controllers are right-aligned and gray (`UX-08`). There is no show/hide toggle, but when the subheader **Faculties** filter is narrowed a row shows only the tags of the faculties in the filter and folds the rest into the `+N` badge (the hover popover lists them all). A **section** (Campus Hubs / Timetable Relays) appears only when it has a node to show; the Faculties and Registry Sync filters don't touch those sections (only Show Archived does), apart from the one cross-campus NORT Campus Hub rule below. Active and faculty-less Building Controllers are listed together in **ascending Node ID** order (not by hostname or faculty), archived ones after them.

**Tree filters** live inline in the tree section header (titled "Filters"): a **Registry Sync** dropdown (All / Enabled / Disabled), a **Show Archived Nodes** checkbox, and a reset-filters icon button enabled only when a filter differs from its default (including a narrowed Faculties filter). Filters combine with AND logic. Changing a filter clears any active bulk selection and keeps a single selected node that is still visible (re-selected without re-opening branches you collapsed). The Faculties filter counts as narrowed only when fewer faculties are picked than the selected campuses offer; active nodes match on current faculties, archived ones on their full history, and once narrowed faculty-less nodes are hidden.

**Hostname outdated:** a hostname that doesn't end in the suffix renders orange (icon and name) in the tree, and the header legend **Hostname outdated** appears whenever the rendered tree contains one. Seed demos: `hlsd-bc104.campus.test` and `meds-bc501.local` (Building Controllers), and the Campus Hub `hub-lab01.campus.test`. Hosts on `campus.test`, `legacy.test` and `.local` are the pre-Atrium naming.

### Creating a node

One unified drawer with **three toggle sections** — Building Controller, Campus Hub, Relay — in any combination. The same drawer also serves **Unarchive** and **Move** (one machinery, three kinds).

The drawer is **entry-point aware** (`UX-04a`):

| Entry | Campus field | Title |
|---|---|---|
| **Subheader** Create Node button | In-drawer single-select listing exactly the campuses currently selected in the header. **One campus selected → field hidden** and titled `Create New Node for <Campus>`. Two or more → placeholder, and the three toggle sections are **dimmed and click-blocked** until a campus is picked | `Create New Node` (multi-campus) |
| **Manage menu** on a Campus / Campus Hub / Relay node | Hidden | `Create New Node for <Campus>` |
| **Unarchive** | Hidden, locked to the archived node's origin campus — **which may be outside the header's current selection**, so an archived node can always be restored | `Unarchive <Type> Node for <Campus>` |
| **Move** (`FR-P2-23`) | **Shown**, listing the header's campuses **except the node's current one**; always starts on the placeholder | `Move <Building Controller \| Campus Hub> from <Campus>` |

**Faculty selection flow:** select Campus → Campus Master Data returns its faculties grouped by faculty group → select Campus Hub → the faculty list **enables** and offers only the faculties the Campus Hub **grants** (`FR-P2-18`; a Campus Hub created in the same form has no grant yet, so every faculty is offered and the picked ones become its grant — none if the Building Controller section is off). Each faculty carries a **Building Controller icon indicator** when it already has an *active, faculty-bearing* Building Controller on exactly that Campus Hub (matched on the exact hostname, tooltip "Has building controllers on this Campus Hub"). Faculties stay disabled until a Campus Hub is picked.

**GENERAL, TEMPLATE and NONE are pre-selected** as default faculties (whichever the campus offers, once a Campus Hub is selected), deselectable — but they are **applied again whenever the Campus Hub or the campus changes**, replacing manual picks. **Not applied on Move.** On **Unarchive** the form opens with the node's own history checked (limited to what the Campus Hub still grants), so a node that never had a faculty opens with **nothing** checked and is restored faculty-less; changing the Campus Hub there re-applies the defaults. The field is labelled "Faculties (optional)" and Save does not require one.

**Campus Hub inheritance** (`FR-CDN-02a`): creating a Relay alongside a Building Controller auto-fills and disables the Relay's Campus Hub field with the Building Controller's selection; it also works the other way (Relay Campus Hub picked first, Building Controller Campus Hub empty → the Building Controller takes it, "Inherited from Relay Campus Hub selection"). Clearing the source or toggling its section off restores the independent dropdown. A Relay always stores the **bare** Campus Hub hostname; the Relay Campus Hub dropdown marks NORT nodes with "(NORT)".

**Relay section Building Controllers:** the Building Controller being created appears as `<hostname> (new)`, pre-checked the first time it appears (unchecking sticks), only while the Building Controller section is on; the user's other checks survive edits to the Building Controller hostname, faculties or Campus Hub. **Per entry point:** from a Campus Hub node the Campus Hub toggle is off and locked and both Campus Hub dropdowns are pre-filled and disabled; from a Relay node the Campus Hub and Relay toggles are locked and the Relay dropdown is pre-filled; Campus → Create Relay / Campus Hub turns only that section on.

**Closing and saving:** the footer Close asks for confirmation only when the form differs from how it opened (everything counts: fields, selects, checkboxes, toggles, faculty and Relay picks; a just-opened Create/Unarchive/Move form is not edited). X, backdrop and Escape close without asking (Escape closes only the confirmation popover while it is open). Creating a Building Controller selects it; a Campus Hub-only or Relay-only create selects nothing. **New Building Controllers are created with Registry Sync on** (`FR-P2-11`, changed November 2026).

The Create form's Relay section carries a static Connected Campus notice ("The Timetable Relay is the Building Controller itself…") on every campus, not only Connected Campus ones (`FR-CDN-04`, `UX-10`).

### Editing — Save / Discard dirty state

Every details panel (Building Controller, Campus Hub, Relay, Campus) uses the same footer:

- On selection, an **editable snapshot** is captured and both buttons are **disabled**.
- They **enable as soon as any editable field differs** — text inputs (Hostname, IP, Proxy URL, Description, Location), switches (Bridge, Alert, Registry Sync), checkboxes (Energy Saver, Exam Lockdown), or selects (Node Type, Campus Hub Association, Relay Association).
- Reverting every field manually re-disables them.
- **Save** commits, refreshes the tree (preserving expansion), re-selects the node, captures a new snapshot, disables the buttons.
- **Discard** opens a popover confirm, then restores from the snapshot. While disabled, the Discard button cannot open the popover (native `<button disabled>` blocks the click). Discard shows **no toast**.
- A **disabled** field (a locked Hostname) never contributes to dirtiness.
- **Bulk Configuration uses the same footer** — no separate "Apply" button. So does a **single-campus selection**.

**Validation resolves on blur, and Save is gated on validity** (§9.4):

- **Save is disabled while any required field is empty or any value the user has *changed* is invalid**, whether or not the field was visited. An empty required field (typically a never-filled Proxy URL) paints its error as soon as the panel opens, so an unavailable Save always says why.
- A **format** problem on a value the user has **not** changed (a stored hostname off the suffix — which every legacy Campus Hub carries) does **not** block Save, or every unrelated edit would be impossible. The domain error still shows on open.
- **Discard is gated only on there being an unsaved change** — a dirty-but-invalid panel keeps Save disabled and Discard enabled.
- While typing, `required` waits for blur; domain, IP-format and duplicate messages update live.
- **A locked field is exempt from all of this** — it neither blocks Save nor shows an error.
- **Manage and Create Node are disabled while the panel is dirty**, since both rebuild the tree and would discard the edit, and come back on Save, Discard or whenever the panel is cleared. No tooltip; the active footer is the explanation.
- **One message under a field**: an error beats a warning, a warning beats the hint (§9.1).

### Hostname editing and rename propagation

Hostname is the first field of the editable section on the Campus Hub and Relay panels, and the second (below Node Type) on the Building Controller panel.

| Panel | Editable when |
|---|---|
| Campus Hub | **Always** |
| Relay | **Always** (nothing references a Relay by hostname) |
| Building Controller | **Only while no faculty is associated.** Disabled otherwise with "Hostname cannot be updated when Building Controller contains associated faculties." — which **replaces** the format hint while locked. A faculty-less (orphan) Building Controller is renameable. **Archived Building Controllers are never locked** (the stored faculty history is not a live reference) |

**Associations are stored as hostname strings, not ids**, so a rename must rewrite every reference in the same Save:

| Renamed | Propagation |
|---|---|
| Building Controller | `Associated Building Controllers` lists on all Campus Hub and Relay nodes, plus the Building Controller copies nested under Relay records |
| Campus Hub | The Campus Hub association on every Building Controller (active, archived, faculty-less) and Relay that referenced it — **preserving the `<hostname> (<Type>)` suffix format** — **plus the Proxy URL consequences below** |
| Timetable Relay | **None required** |

All copies of a renamed node update together, so tree, search and export reflect it immediately.

**Domain rule** (`FR-P2-21`, [below](#hostname-domain-rule)). **Not modeled:** the downstream Asset Registry consequence of a rename (Asset Registry has no update endpoint, so the real system must mark the old record deleted and register a new one — no longer tracked as an open item, still not modeled) and the short-name shape (`<campus>-bc<floor>-<n>`); placeholders and a `.field-note` hint are guidance only.

### Hostname domain rule

`FR-P2-21`: every **Building Controller, Relay and Campus Hub** hostname must end in **`atrium.test`**; a hostname *equal* to the suffix is valid.

- **The suffix is a server setting**: `meta.hostnameSuffix` on `GET /manage-infrastructure`, and every Hostname validation reads it. The prototype has no server, so one constant (`SERVER_HOSTNAME_SUFFIX`, `config-data.js`, value `atrium.test`) stands in.
- **Enforced by validation, not by the field.** All six Hostname fields (three panels, three drawer sections) are plain free text holding the full hostname. Error "Hostname must end with atrium.test" on blur, Save/Create disabled; the panel Save backstop raises the toast "Hostname must end with atrium.test.".
- ⚠️ **History:** in v2.28–v2.37 the suffix was enforced by a fixed non-editable suffix chunk beside a short-name input (Campus Hub excluded), and from v2.38 it became a plain free-text field validated against the suffix. The `ProjHostSuffix` split-field helper was removed; treat any surviving `ProjHostSuffix` / `.input-suffix` reference as stale. Open Item #14 ("should Campus Hub follow the domain rule?") is **closed**.
- Seed Building Controller and Relay hostnames were migrated onto the suffix keeping their short name; two Building Controllers are deliberately left off it (`hlsd-bc104.campus.test`, `meds-bc501.local`) to demo the outdated flag.

### Proxy URL

The Proxy URL is built from the node's **Hostname** and **Campus Hub Association** and, since **v2.36 (`FR-P2-25`)**, **updates automatically**. ⚠️ **The Generate button, the Reset link, the touched/"Manually edited." hint states and `proxyGenerateState` are all gone.** (The v2.25 baseline of this KB described the pre-v2.34 auto-fill + Reset model; the intermediate v2.34 "Generate only" model has been superseded as well.)

**Generation rules** (`FR-P2-14` Building Controllers, `FR-P2-19` Relay). Which rule applies depends **solely on the associated Campus Hub hostname**, not on the node type:

- **Rule 1 — local Campus Hub** (any Campus Hub other than master): `https://<campus hub>/<shortName>/campus/`
- **Rule 2 — master Campus Hub** (`hub.atrium.test`, matched **exactly** — `hub-lab01.campus.test` is a *different* Campus Hub and takes Rule 1): `https://<nodeHostname>/campus/`, **provided the hostname still carries a parseable short name**

⚠️ **The service path is `/campus/` on every generated URL, Relay included.** The v2.25 baseline said `/relay/` for Relays; `FR-P2-19` as first written specified that, and v2.27 corrected it. The master rule **does not rewrite the hostname** (v2.28, `FR-P2-21`) — it is already on the campus domain.

The two node types differ in exactly one thing — the short name:

| | Building Controller | Timetable Relay |
|---|---|---|
| Short name | `bc<floor>-<n>` | `rly<floor>-<n>` |
| Rule 1 example | `meds-bc1-4.atrium.test` on `meds-hub.atrium.test` → `https://meds-hub.atrium.test/bc1-4/campus/` | `meds-rly1-1.atrium.test` on `meds-hub.atrium.test` → `https://meds-hub.atrium.test/rly1-1/campus/` |
| Rule 2 example | `meds-bc1-4.atrium.test` on `hub.atrium.test` → `https://meds-bc1-4.atrium.test/campus/` | `meds-rly1-1.atrium.test` on `hub.atrium.test` → `https://meds-rly1-1.atrium.test/campus/` |

Short-name extraction strips `.atrium.test`, `.campus.test`, `.legacy.test` and `.local`, then reads the `bc` (or `rly`) keyword plus the two numbers that follow it. Atrium's own normalisation: always `https://`, always a trailing slash. **Manually entered URLs are not format-validated.**

⚠️ **`deriveLineServerProxyURL` and `deriveCDNProxyURL` are deliberate mirrors, not shared code.** Change a behaviour on one side and change the other.

**Behaviour of the automatic update** (`FR-P2-25`):

- When the Hostname (on leaving the field, `change` not `input`) or the Campus Hub Association changes, the URL is re-derived and written into the field — on the side panels and in the Create / Unarchive / Move drawer. When the Campus Hub section is on in the drawer, its typed Hostname is the source; the Relay section also accepts a Campus Hub inherited from the Building Controller section.
- **Replacing an existing URL shows an orange warning** under the field: "Proxy URL updated because the Hostname changed." / "…the Campus Hub changed." / "…the Hostname and Campus Hub changed." It stays until the URL is saved, discarded, typed over, or back to its loaded value. Filling an *empty* field shows no warning.
- The field stays **editable**; a hand-typed URL is kept until the Hostname or Campus Hub changes again.
- **Outdated:** when the URL *can't* be derived (no parseable short name, or no Campus Hub) the old value is **kept** and flagged with an orange warning — "Proxy URL is outdated and can't be generated from this Hostname. Enter it manually." / "Proxy URL is outdated. Select a Campus Hub to update it, or enter it manually." **Save stays available** (the field still holds a URL); the warning clears when the user types a new one. A change that leaves the derived URL the same, or is undone, doesn't make it outdated. **Atrium never guesses a path segment.**
- An **empty** field is still required, so a new node on an unparseable hostname needs a hand-entered URL.
- **Unarchive / Move prefill keeps the stored URL as-is** and re-derives only when a source field changes. Move keeps the Proxy URL only when it keeps the Campus Hub (NORT only).
- The Campus Hub **Manage → Building Controllers** drawer is the one path with no field of its own: it rewrites the URL when the stored value is empty or still equals what the **old** Campus Hub derives.
- **Open-in-new-tab** buttons target the **saved** URL only (re-targeted on Save / Discard / selection), so a half-typed URL can't be opened. They exist on the Building Controller and Relay fields only.
- **Required** (v2.31): both fields carry the blur error "Enter Proxy URL", gate Save, and have a Save backstop. No uniqueness or format check.
- **Backfill:** `_backfillProxyURL` / `_backfillCDNProxyURL` fill seed records at load wherever the hostname parses. Records whose names don't carry the `bc<floor>-<n>` / `rly<floor>-<n>` pattern (for example the archived `-old` Building Controllers and the archived Relay `meds-rly01.atrium.test`) stay **empty**, so their panel shows the required error on open and Save stays disabled until a URL is typed. ⚠️ **Re-derive the counts with the snippet in `maps/js/config-data.md`** — the counts quoted in the v2.25 baseline are stale, and the router's own counts disagree between entries (see [Known limitations](#known-limitations--gotchas)).
- **`FR-P2-14a`:** legacy-named hosts and sub-coded names can't be parsed; the old-URL-kept-and-flagged behaviour above applies.

⚠️ **The Proxy URL must not be dropped in a later cleanup** even though the user rarely types in it: Atrium reaches Building Controllers *through* Campus Hub, and Atrium's database is now the source of truth for proxy URLs.

#### Renaming a Campus Hub

Per `FR-P2-25` / `FR-GH-05`, **a Campus Hub rename now re-derives Proxy URLs** — reversing the v2.25 note that "a Campus Hub rename re-derives nothing". On Save:

- A connected Building Controller **or Relay** whose URL is **generated** (exactly what the rules produce for its hostname and the *old* Campus Hub) is regenerated for the new Campus Hub hostname. Any other connected node holding a URL (hand-typed, or an unparseable hostname) **keeps it and is flagged `proxyOutdated`**. A node with no URL has nothing to flag.
- **Confirmation (v2.39 → v2.40):** Save on a changed Campus Hub Hostname with ≥1 connected Building Controller or Timetable Relay opens the **Change Hostname** popover. It opens immediately (no loader), shows one orange warning with **counters** — "Changing the hostname changes the Proxy URL of **N** Building Controllers and **M** Timetable Relays connected to this Campus Hub. Those whose Proxy URL isn't generated automatically must be updated manually." (only the connected kinds are named) — and **no list**. Buttons **Keep Editing** / **Yes, Save**. With nothing connected, Save goes straight through.
- ⚠️ **The master Campus Hub (`hub.atrium.test`) is never confirmed** (v2.41): renaming it saves straight through even with connected Building Controllers; the Proxy URL rules still apply.
- Before Save, an orange note under the Campus Hub Hostname field says "Changing the Hostname changes the Proxy URL of the connected Building Controllers." (or "…Timetable Relays." / "…Building Controllers and Timetable Relays."; no count; replaces the format hint, yields to a Hostname error, only shown when ≥1 Building Controller or Timetable Relay is on the Campus Hub).
- **After the rename**, if any node is flagged, a persistent **warning toast** follows the "updated" toast: "<counts> need(s) its Proxy URL updated manually." (e.g. "1 Building Controller and 1 Timetable Relay need its Proxy URL updated manually.") with a **Details** link. Same style as the Registry Sync failure toast: regular weight, no "Warning:" label, no icon. The link opens the **"Proxy URLs to update"** modal — an intro line and a table of Type / Node / Campus / Current Proxy URL, buttons **Copy list** (tab-separated, header row) and **Close**. The same toast follows a Campus Hub rename made through Unarchive or Move.
- A **flagged** Building Controller or Timetable Relay keeps the flag on its record; its panel shows "Proxy URL is outdated because the Campus Hub hostname changed. Enter it manually." and **Save stays disabled** until the URL changes (or is regenerated by changing Hostname/Campus Hub). Saving a different URL, or a Move/Unarchive that writes a new one, clears the flag. **The tree shows no marker for it** — the tree/legend flag only outdated *hostnames* (`FR-P2-21`).

✅ **Spec and prototype now agree on Relays** (v2.44): a Campus Hub rename regenerates or flags Timetable Relays' Proxy URLs too (`propagateGHDSRename`, confirmation counts, toast and modal all cover Building Controllers and Timetable Relays). The earlier "Relay Proxy URLs are not touched" text is gone from `requirements.md`.

### Registry Sync configuration

A "CONFIGURATION" collapsible section, **first** on the Building Controller panel (before BUILDING CONTROLLER INFO), with one switch: **Registry Sync** — "Grant Building Controllers access to communicate with Asset Registry." (The data field is `fsnApiCalls`.)

⚠️ **Absence is treated as enabled** (`fsnApiCalls !== false`). A record imported without the value reads as enabled, like a newly created one — `FR-P2-11` (changed November 2026) makes `insertLineServer` write `fsnApiCalls: true` explicitly on both the per-faculty nodes and the orphan-bucket node. **Unarchive restores Registry Sync off** (`FR-P2-10`) and Move keeps the stored value. ⚠️ The Registry Sync tree *filter* still treats a record with no value as Disabled while everything else treats it as Enabled — latent (every record has an explicit value), left on purpose.

⚠️ **Archived Building Controllers are out of Registry Sync scope** (`FR-P2-10`, reversed in v2.29 — the v2.25 baseline's "archiving preserves Configuration" is **gone**):

- Archiving forces Registry Sync **off**. On an archived Building Controller's panel the Configuration section stays visible but the toggle reads **off and disabled**, with the note "Archived building controllers cannot use Registry Sync. Unarchive to change this." The tree indicator reads Disabled; archived Building Controllers only ever appear under the **Disabled** Registry Sync filter.
- Archived Building Controllers are **not bulk-selectable** and are excluded from a Campus selection and its cascade (v2.38 restored this after v2.22–v2.28 had made them selectable). Cmd/Shift+Click skips them; once a bulk selection exists their rows are disabled with the tooltip "Archived building controllers cannot be selected in bulk mode".

**Three write paths** (Asset Registry refusals apply to all three; the Timetable Release block below is specified but not built):

1. **Single Building Controller panel** — the switch plus the shared Save/Discard footer.
2. **Bulk mode** — 2+ Building Controllers selected.
3. **Campus-level cascade** (`FR-P2-05`) — selecting one Campus.

**The campus toggle is four-state**, reflecting the campus's Building Controllers visible under current filters: **Enabled** (all on), **Disabled** (all off), **Mixed** (amber indeterminate switch), or **Unavailable** (filters narrow the campus to zero Building Controllers — input disabled, Save/Discard inert).

⚠️ **Scope is "visible in the tree", non-archived** — active and faculty-less. This is the *single* definition of scope, shared by bulk mode and the campus cascade, and it is **tree-driven**: `selection.js` reads the rendered nodes rather than re-walking raw data. The aggregate state and the cascade are scoped by **both** the Faculties filter and the Registry Sync filter.

The info notification swaps copy three ways: normal ("updates every building controller in this campus"), narrowed ("updates only the building controllers … that match the current filters"), and Unavailable ("No building controllers match the current filters…"). With more than one campus selected the wording swaps "this campus" for "a campus / that campus".

⚠️ **`FR-P2-04` is REINSTATED in the requirements (November 4, 2026) but NOT built in the prototype.** A scheduled Timetable Release blocks turning Registry Sync **off**, alongside the `FR-P2-30` refusal: inline error "This Building controller is scheduled for Timetable Release. Cancel the release before disabling." and toasts "Cannot save: building controller is scheduled for Timetable Release." (panel) / "Cannot apply: N building controller(s) scheduled for Timetable Release." (bulk, including a Campus selection); the Timetable Release check runs before Asset Registry is asked. The wording is recovered from the pre-withdrawal revision and **confirmed by Product**. **This has now flipped three times** (deleted, restored, withdrawn 2026-08-31, reinstated 2026-11-04) — the prototype still lets you turn Registry Sync off on `rvrs-bc1-3.atrium.test`. Build it from `requirements.md` `FR-P2-04`, not from git history.

#### Asset Registry host-removal refusals (`FR-P2-30`, v2.38–v2.39)

⚠️ **New, and it re-introduces a blocker on disabling Registry Sync — but a different one.** Asset Registry can refuse to remove a Building Controller's host (for example while devices registered on it are not yet retired; Atrium never retires devices on the controller's behalf). Every action that removes the host checks first, and a refusal leaves **everything unchanged** with a two-line error toast — the first line bold:

> **Unable to `<action>`, Registry Sync change was not successful.**
> `<server error message>`

`<action>` is `archive`, `disable Registry Sync` or `change the hostname`. The second line is the Asset Registry's message, shown as-is (the prototype prints the literal `<server error message>`). A Building Controller with Registry Sync already off has no host to remove and is never refused.

| Action | On refusal |
|---|---|
| Turn Registry Sync off on the panel | Not saved; Registry Sync stays on |
| Archive a Registry Sync-enabled Building Controller | Popover closes, node stays active |
| Change the hostname of a Registry Sync-enabled Building Controller (host is deleted and re-created) | Not saved; the form keeps the edit |
| Turn Registry Sync off in bulk or from a Campus | Each node handled independently; the others are disabled and the refused ones are reported together in one warning toast with a **Details** modal (below) |

Seed: `lab-bc01-1.atrium.test` is the single-node demo (NORT, active, faculty-less so its hostname is editable, Registry Sync on); `lab-bc01-1/-2/-3` and `lab-bc02-1` are refused in bulk, `lab-bc02-2/-3` accepted. `fsnHostRemovalError(node, action)` returns the HTML; a node refuses only when `fsnRefuses` is set.

**Bulk and Campus presentation** (now in `requirements.md`, v2.44): the accepted nodes get the success toast "Registry Sync applied to N Building Controllers" (N = nodes written; **no success toast when every node was refused**) and the refused ones one plain warning toast "Unable to update N Building Controllers Registry Sync status" with a **Details** link. The link opens a modal with the same title and a red error icon, an intro line, a sortable table (Building Controller / Campus / Details) and **Close** / **Copy list**. A Campus save reports the same way instead of "Campus updated.". Panel Save order: validation → Asset Registry refusal → Change Campus Hub / Change Hostname confirmation → commit.

### Bulk selection

Always-on multi-select:

- **Cmd+Click** / **Ctrl+Click** — toggle individual Building Controllers or **campuses** in/out
- **Shift+Click** — select the range of visible, bulk-selectable nodes (Campuses included; collapsed branches skipped) from the last-clicked node or the current selection. While Shift is held, hovering previews the range. If the anchor isn't itself a selectable visible node, or there is none, only the clicked node is picked
- **Single click** (no modifier) — exits bulk mode, selects normally — on greyed-out rows too
- **Escape** clears a bulk selection (2+ picks); the first modified click also adds the already-selected node
- When Cmd-click leaves **one** node picked it becomes the ordinary selection and bulk state ends. Changing the Campus selection or any filter also ends it

Building Controllers **and Campuses** are bulk-selectable; picking a Campus contributes every non-archived Building Controller visible beneath it. Campus Hub, Relay and section nodes render disabled with the tooltip "Only campuses and building controllers can be selected in bulk mode". **Faculty-less Building Controllers are selectable; archived ones are not** (see above).

The **Bulk Configuration panel** appears at 2+ picked nodes (Campuses or Building Controllers; the title can read `0 Building Controllers`, and Save/Discard stay disabled then), titled `Bulk Configuration (N Building Controllers)` where N is the de-duplicated union of directly-picked Building Controllers and every visible Building Controller under any picked campus. Mixed values show the switch unchecked with a "Mixed" label. The Manage dropdown is hidden during bulk mode. Success toast: "Registry Sync applied to N Building Controllers" (N = Building Controllers written); after a save that wrote at least one node the tree re-renders and the selection clears. A Save with the switch unchanged does nothing. **Clear Selection returns the panel to its empty state**, not to the campus node. The panel notice appears only when a Campus is picked, and decides "narrowed" per picked campus.

> A **single-campus selection is also a bulk configuration** — the panel title reads `Bulk Configuration (N Building Controllers)`, not "Campus Details".

### Associations

**Campus Hub Association is an editable dropdown** on both the Building Controller panel (below IP Address, above Relay Association) and the Relay panel (below IP Address, above Proxy URL) — `FR-P2-16`. The read-only ASSOCIATED CAMPUS HUB section stays as the navigable detail view.

⚠️ **The two panels store the association in different formats and they are not interchangeable.** A Building Controller keeps `"<hostname> (<Type>)"`; a Relay keeps the **bare hostname**, because `findCDNServersForGHDS` compares it with `===`. Option *values* are always the bare hostname; each commit branch re-applies its own format.

A node pointing at a Campus Hub that has since been archived or gone out of scope keeps a **disabled** option for it, so the panel never silently reads "Not assigned".

**Cascade on Save** — never blocked, but all consequences apply together:

| # | Consequence | Applies to |
|---|---|---|
| 1 | Old Campus Hub's reciprocal list loses the node; the new one's gains it | Building Controller |
| 2 | **Faculties the new Campus Hub does not grant are removed** (`FR-P2-18`) | Building Controller |
| 3 | The Relay membership is dropped when the Relay is on a **different** Campus Hub; the Relay Association dropdown re-scopes to the new Campus Hub immediately | Building Controller |
| 4 | Building Controllers left behind on the old Campus Hub are detached from the Relay | Relay |
| 5 | ~~Any Building Controller left with no Relay has Alert Service forced off~~ — **removed in v2.38**; Alert Service is independent of the Relay | — |
| 6 | The Proxy URL re-derives immediately on selection change, or is flagged outdated (`FR-P2-25`) | **both** |

**Confirmation** fires only when the change would strand a Relay membership, via a **Change Campus Hub** popover — Building Controller: "Changing the Campus Hub will remove the associated Relay, because a Relay can only serve Building Controllers on its own Campus Hub."; Relay: "…will detach all associated Building Controllers…". Cancel leaves the panel dirty and nothing written. A note under the dropdown warns ahead of time ("Saving will detach it from its Timetable Relay." / "…detach any Building Controllers attached to this Relay."). Faculty removals are not warned about.

#### One Relay per Building Controller

`FR-P2-24` (v2.33): the relationship is **one Relay, many Building Controllers** — a Building Controller has **zero or one** Relay. This supersedes the v2.25 "A Building Controller may belong to multiple Relays" and the April 27 multi-Relay clarification. Membership is stored on the Relay record only; every write path enforces it:

| Where | Behaviour |
|---|---|
| **Building Controller panel** | Editable **Relay Association** dropdown under Campus Hub Association: `Not assigned` + the non-archived Relays **of the node's own campus** on the Campus Hub *currently picked* (re-scoped live). On Save the Building Controller leaves its old Relay and joins the new one |
| **Archived Building Controller** (v2.42) | ⚠️ **An archived Building Controller cannot be associated with a Relay.** The dropdown is **disabled**, shows `Not assigned`, and an info note below reads "Archived Building Controllers cannot be associated with Timetable Relays." Unarchiving restores the choice. Implemented as an early return in `_populateCDNSelect` on `nodeData.archived`, note in `#infoCDNNote`. Consistent with the archive gate (`FR-P2-27`, which already requires the Relay association to be removed first) and with the Relay's Manage → Building Controllers list, which excludes archived Building Controllers |
| **ASSOCIATED TIMETABLE RELAY** | Read-only mirror of ASSOCIATED CAMPUS HUB for the saved Relay (Hostname — navigates, Proxy URL, IP, Node ID, Campus, Network Protocol, Description, Location). Hidden when there is no Relay |
| **Building Controller Manage menu** | **Manage → Timetable Relays is removed** (v2.33) |
| **Create form, Building Controller section** | **Single** dropdown filtered by the selected Campus Hub; locked to the new Relay when the Relay section is on |
| **Create form, Relay section** | Building Controller Association offers active Building Controllers of the form's campus on the picked Campus Hub (read live) and hides those already on another Relay |
| **Relay Manage → Building Controllers** | Shows Building Controllers on another Relay **disabled and tagged with that Relay** (`FR-P2-28`, v2.36 — v2.33 had hidden them), with a note: "A Building Controller belongs to one Timetable Relay. Building Controllers tagged with another Timetable Relay can't be added until they are removed from it." Select All skips disabled rows. Candidates are the **active** Building Controllers of the Relay's own campus on its Campus Hub (read live). Disabled only when there are none at all |
| **Move** | The moved Building Controller leaves its old Relay and may join one on the target campus |

A load-time pass (`_enforceSingleCDN`) keeps the first Relay for any Building Controller listed on more than one. Seed: the failover Relay pairs were split (`meds-rly1-1.atrium.test` serves `meds-bc101`/`meds-bc102`, `meds-rly3-1.atrium.test` serves `meds-bc103`; `rvrs-rly2-1.atrium.test` serves `rvrs-bc1-3`/`rvrs-bc2-3`, `rvrs-rly1-1.atrium.test` serves `rvrs-bc1-7`; all on the `atrium.test` domain).

**Relay ↔ Building Controller membership from the Relay side** (`FR-P2-17`) is a unified add/remove checklist, `Manage → Building Controllers` on a Relay, with ADDING/REMOVING tags mirroring Manage Faculties. This replaced the add-only `Add → Building Controller`. The entry is **disabled when its candidate list would be empty** (no Campus Hub assigned, a Campus Hub with no non-archived Building Controllers), with the reason as tooltip. On the Building Controller panel the dropdown is instead disabled with a placeholder saying why ("Select a Campus Hub first" / "No Relays for this Campus Hub").

⚠️ **A membership is recorded in two places on the Relay record** — the flat list the side panel renders, and the nested child the tree renders. Both must be written on add and remove, or the two views disagree about the same association.

#### Campus Hub → Building Controller (`FR-P2-20`)

The Campus Hub panel gains **Manage → Building Controllers** — the same checklist, but a **re-home**, not a membership toggle: a Building Controller belongs to exactly one Campus Hub, so ticking **moves** it off its current Campus Hub and unticking leaves it **unassigned**, both through the full `FR-P2-16`/`FR-P2-18` cascade (unassigning drops every faculty, leaving it faculty-less). Rows that would be a move are tagged with the Campus Hub they're on; the drawer opens with an explanatory note. Candidates: the Campus Hub's own campus's active Building Controllers, or **every** campus's for a NORT Campus Hub. Archived Building Controllers are excluded — so an archived Building Controller counts against the Move gate but cannot be detached from this drawer (same latent gap on the Relay side; neither closed). Disabled with a reason when the candidate list is empty.

#### Faculty grants (`FR-P2-18`)

**A Campus Hub grants its Building Controllers access to faculties.** A faculty is available only where **both the Campus and the Campus Hub** offer it. On a Campus Hub change, faculties the new Campus Hub doesn't grant are soft-removed (identical to unchecking in Manage Faculties — the historical set is retained). **Losing every faculty is allowed** — the Building Controller becomes faculty-less and stays visible with the "No Faculties selected" hint. The Campus Hub panel lists its grants read-only under **Faculties**.

✅ **The grant is read-only in Atrium** (decided November 2026, closing the old Open Item #12): it is supplied with the Campus Hub and can't be edited from any panel or form. **Manage Faculties, and the Create and Unarchive Faculties dropdowns, offer only faculties the campus has and the Campus Hub grants** (a faculty already on the Building Controller stays listed so it can be removed; a Building Controller with no Campus Hub is offered none), so a faculty that a later Campus Hub change would remove can't be added. A Campus Hub created in the Create form is granted the faculties picked there (none if the Building Controller section is off).

### Archive lifecycle

⚠️ **No node is ever permanently deleted** (`FR-DS-01`). Removing moves it to an **Archived** state. This covers all three node types.

A **faculty-less** Building Controller is archived **in place** (flagged in the orphan bucket, Registry Sync off) and counts as archived everywhere (search tag, association lists, Campus Hub archive gate); a Building Controller whose faculties were all removed is archived per faculty and its faculty-less record is dropped. Three seed Building Controllers that never had a faculty (`engr-bc01-3.atrium.test`, `medt-bc02-1.atrium.test`, `river-bc02-1.atrium.test`) are seeded this way.

Archived nodes are hidden by default; **"Show Archived Nodes"** reveals them, sorted to the bottom of their respective sections. Toggling filters preserves the current selection unless the selected node was archived and the archived filter was just switched off.

**Two different archive mechanisms**, because the data models differ:

| Type | Mechanism | Why |
|---|---|---|
| Building Controller | Fan copies out into `archivedServersData` | Stored once *per associated faculty* — copies preserve faculty history |
| Campus Hub / Relay | **Flag the record in place** (`archived: true`, `status: 'inactive'`) | Exists exactly once, no faculty dimension. Every association pointing at it survives untouched, which is what makes the unarchive lossless |

#### Archive gates

The Manage menu's **Archive** item stays *listed* but renders **disabled with the reason as tooltip** when (`FR-P2-27`, v2.35; `_archiveBlockReason`):

| Node | Condition | Tooltip |
|---|---|---|
| Campus Hub | It is the **master Campus Hub** `hub.atrium.test` — never archivable | "hub.atrium.test is the master Campus Hub and can't be archived." |
| Campus Hub | It still has associated **active** Building Controllers or active Timetable Relays | "Remove all associated Building Controllers and Timetable Relays before archiving." (whatever the count) |
| Relay | It has associated Building Controllers | "Remove the associated Building Controller before archiving." / "Remove all `<N>` associated Building Controllers before archiving." |
| Building Controller | It has a Timetable Relay association | "Remove the Timetable Relay association (`<relay>`) before archiving." |
| Building Controller | Scheduled for a Timetable Release (`FR-DS-07`) | Error toast on attempt: "This Building Controller is scheduled for a Timetable Release. Cancel the release before archiving." |

- ⚠️ **Archived Building Controllers no longer block archiving their Campus Hub** (v2.38, fixing a bug where the gate counted them; `FR-P2-15`/`FR-P2-27`). A Campus Hub served only by archived Building Controllers can be archived — seed `rvrs-hub2.atrium.test` (served by `rvrs-bc9-1-old`, `rvrs-bc9-2-old`). By contrast an archived Building Controller **still counts against the Move gate**.
- The gate is re-checked when archiving is confirmed (the Timetable Release check only runs when the popover opens), so a menu built against since-mutated data can't slip through. The gate and the panel's ASSOCIATED BUILDING CONTROLLERS list read the same helper (`_ghdsAssociatedLineServers`, with an `activeOnly` flag for the archive gate).
- **The Timetable Release condition gates archiving and moving** a Building Controller, and — per the reinstated `FR-P2-04`, not yet built — turning its Registry Sync off. It does not apply to Campus Hub/Relay.
- The ASSOCIATED BUILDING CONTROLLERS list (Campus Hub and Relay panels) keeps listing archived Building Controllers, now each carrying the **Archived tag** (`UX-07a`); their navigate icon is disabled while Show Archived is off.

#### The archive popover and its devices check (`FR-P2-29`, v2.38–v2.39)

Opening **Archive** on a Building Controller first shows a loader ("Checking attached devices…", ~900 ms) with **Archive disabled** until the check returns, then:

| Outcome | Popover |
|---|---|
| Devices attached | Orange warning above the usual copy: "This Building Controller has devices registered to it." — **no count** (the check returns only whether any exist; v2.39 dropped the count) |
| Check failed | Orange warning: "Failed to check this Building Controller's devices. You can still archive it." |
| No devices | Usual copy only |

**Devices never block archiving** — Archive is enabled in every outcome. The confirmation sentence "This will turn off Registry Sync." appears only when Registry Sync is on; buttons read **Keep `<Type>`** (Keep Building Controller / Keep Timetable Relay / Keep Campus Hub) and **Yes, Archive**. Campus Hub and Relay archive have no devices check. Mock data (`_unitsByHost`, `config-data.js`): `nort-bc1-2.atrium.test` and `bio-bc05-1.atrium.test` have devices; `phys-bc03-1.atrium.test` fails the check. This check is independent of the Asset Registry refusal above, which *does* block.

#### Unarchive

Opens the Create drawer in unarchive mode: only the matching section shown, its toggle header hidden, fields pre-filled and fully editable, title `Unarchive <Type> Node for <Campus>`, primary action "Unarchive". Faculties are pre-checked with the **full historical set** (`FR-DS-05`, limited to what the Campus Hub still grants) and are **optional** — unarchiving with none (or for a Building Controller that never had any) restores it as faculty-less (orphan bucket). A Building Controller's unarchive runs **the same save-time checks as Move** (a Campus Hub, required fields, an active Campus Hub, IP format, hostname/IP uniqueness) and attaches a Relay picked in the form; a Relay's unarchive keeps its Campus Hub and saves the Building Controllers checked (an archived Relay has no members, since archiving needs none), clearing a stale outdated flag; a Campus Hub's unarchive leaves its Proxy URL alone. The close-confirmation popover swaps to "Stop Unarchiving" copy with a **Keep Unarchiving** button, reverting when the drawer leaves unarchive mode. (Move uses "Stop Moving" / **Keep Moving**.)

- ⚠️ **Unarchiving a node whose Campus Hub is archived** (`FR-P2-26`, v2.35): the Campus Hub dropdown shows that Campus Hub as a **disabled** option labelled `<hostname> (Archived)`, selected; the field errors "Campus Hub `<hostname>` is archived. Select another Campus Hub or unarchive it first." and **Unarchive stays disabled** until an active Campus Hub is chosen. If the request is still sent and the server rejects it, its message is shown as an error toast and the form stays open (not demonstrable — the prototype has no server). Seed: archived `hlsd-bc001-old.atrium.test` (Building Controller) and `hlsd-rly1-2.atrium.test` (Relay) both point at archived `hlsd-hub-old.atrium.test`.
- ⚠️ **A Campus Hub/Relay unarchive validates against itself.** Because the archive was an in-place flag, the record never left the dataset — its own hostname and IP are still "taken". `_validateExistingServer` (renamed from `_validateStandaloneUnarchive`; now shared with Move and the Building Controller kind) runs required + IP-format + uniqueness with the node excluded.
- Unarchive restores a Building Controller with Registry Sync **off**.

**Archived nodes are excluded from every association list** — Create form dropdowns, side-panel Campus Hub dropdowns, and the association drawers — because nothing new may attach to an out-of-service node.

**Historical faculties** (`FR-DS-05`): archived Building Controllers show every faculty they were *ever* associated with, preserved across active → archive → unarchive → archive cycles.

### Moving nodes between campuses

`FR-P2-23` (v2.32): an **active Building Controller or Campus Hub** can be moved to another campus — **Manage → Move → To available Campus**, placed before the Archive group. Archived nodes aren't movable (unarchive first); Relays aren't covered. This supersedes the "campus can't change after creation" rule; the campus is still not editable on the panel.

**Available campuses:** only those selected in the header, minus the node's own. The item is disabled with a tooltip, checked in this order (`_moveBlockReason`):

| Condition | Tooltip |
|---|---|
| Building Controller scheduled for a Timetable Release | "Cancel the scheduled Timetable Release before moving." |
| Campus Hub with any associated Building Controller (**active or archived**) or any non-archived Relay | "Remove all associated Building Controllers and Timetable Relays before moving." |
| No other campus selected in the header | "Select another campus in the Campus filter to move this node." |

**The drawer** is the Create drawer in move mode (it rides on the unarchive machinery — `_moveMode`, `_enterExistingServerMode`): Campus shown and required, rest dimmed until picked, title "Move … from `<Campus>`", button **Move**. Prefilled and editable — Building Controller: Node Type, Hostname, IP, Description, Location, Energy Saver, Exam Lockdown; Campus Hub: Hostname, IP, Description, Location.

**Reset when the target campus is picked (Building Controller):** Campus Hub Association kept **only if NORT** (every campus's list includes NORT); Proxy URL kept only when the Campus Hub is kept; Faculties re-listed, with the current ones pre-selected where the target campus has them **and** the Campus Hub grants them (default faculties *not* applied); Relay Association empty (Relays belong to a campus); Alert Service starts off and stays available.

**On Move:** a Building Controller leaves its Relay and old Campus Hub's list, every old-campus copy is removed, and it is re-created on the new campus under the **same Node ID**, once per selected faculty (or in the orphan bucket); `everAssociated` is reset to the newly selected faculties; Registry Sync and other settings are kept. A Campus Hub moves with the same ID and its faculty grant is trimmed to the new campus's faculties. Toast: "Building Controller moved to `<Campus>`" / "Campus Hub moved to `<Campus>`". Open Item #13: how a move reaches Campus Hub sync-back and Asset Registry is unmodeled.

### Global search

Searches by **hostname, node ID, campus and faculty**, substring-matching from the **third character**. The placeholder abbreviates this as `Search by hostname, ID, faculty ...` — **campus is matched even though it isn't named**. Search needs at least one campus selected before the field is available (`UX-13`).

Only Building Controller, Campus Hub and Relay nodes are results. **Campus, Faculty and section rows are tree scaffolding and never appear.**

⚠️ **Scope changed since v2.25: the search now covers the whole estate and is NOT scoped by the tree filters** (v2.30, `UX-14`). The v2.25 baseline said it was "scoped by the active tree filters" — that is **wrong now**. `buildSearchIndex` / `searchServers` (`tree-search.js`) run over the five raw datasets via `forEachSeedServer`; the Campus multi-select, Faculties filter, Registry Sync filter and Show Archived checkbox no longer hide matches.

**Picking a result that the current filters hide relaxes only what hides it** — the filters are only ever **widened, never narrowed**: Show Archived turns on if the node is archived, the Registry Sync filter resets to All if it excludes it, the result's campus is added to the Campus multi-select, and the Faculties filter widens (for a faculty-less node, narrowing is dropped entirely). The tree renders once, collapsed ancestors expand, and the row is selected. A visible result changes no filter. An archived **faculty-less** node is indexed as archived (Archived tag; picking it turns Show Archived on). Results update after a 300 ms pause, the query isn't trimmed, matching runs on hostname, ID, campus and faculties together, and the field is disabled and emptied when no campus is selected. Bold covers only the hostname. Implementation order matters: archived/Registry Sync properties set without dispatching `change`, campus added under a new `_suppressSitesOnChange` guard (kept separate from `_suppressProjectsOnChange`), Faculties last, one `reRenderTree`, then `navigateToServer`.

Layout (rebuilt 2026-09-02, `UX-14`):

- **Count line** — `N results found:` (`1 result found:` singular)
- **One group per node type**, Building Controller → Campus Hub → Relay, each opened by a **header row** carrying the type icon, the type name, and the **names of its right-hand columns** — `Faculties` + `ID` for Building Controllers, `ID` alone for Campus Hub and Relay. ⚠️ **That header is the point of the change**: without it the ID on the right reads as a per-row count.
- **Rows** — `<CAMPUS> › <hostname>` with the match in **bold** (not `mark`-highlighted, unlike the tree), an `Archived` tag, faculty tags capped at two with a `+N` badge, and the node ID
- **Escape** dismisses without clearing the query; no match shows `No results found`

Three load-bearing details:

1. The `--projects` / `--id` cells are **fixed widths shared by the header and the rows**, and Campus Hub/Relay rows render an *empty* faculties cell rather than omitting it — otherwise their ID column slides out from under its label.
2. Results are **de-duplicated on `level::id`**, because a non-NORT campus pulls in the NORT Campus Hub its Building Controllers point at.
3. **The master Campus Hub renders with no campus prefix** — it is shared across campuses.

`forEachSeedServer` filters by `level` on purpose: `cdnServersData` nests read-only Building Controller mirrors with synthetic `relay-ls-*` ids that would otherwise emit duplicate, un-navigable rows. `_hostnameInUse` deliberately still walks those mirrors — a duplicate-name check must see every name. The two walks look alike; do not consolidate them. Index order is load-bearing too (active, then orphans, then archived, skipping seen ids) so a Building Controller archived for one faculty but active for another reads as active.

### Cross-campus NORT Campus Hub

Any campus can select from **NORT Campus Hubs in addition to its own** (`FR-LS-07`). Help text reads "Filtered by selected campus", plus "NORT nodes also included." on non-NORT campuses; NORT entries carry a "(NORT)" suffix in dropdowns.

When a non-NORT campus's Building Controllers reference NORT Campus Hubs, those appear in that campus's Campus Hub tree section with a blue **"NORT"** badge (`UX-05`).

**De-duplication** (`FR-P2-07`): when NORT is *among the selected campuses*, a NORT Campus Hub referenced by another campus appears **only under NORT**. When NORT is not selected, it still appears cross-campus with the badge.

A navigate link is enabled when the target's campus is among the selected campuses, or when it is a NORT Campus Hub whose row is currently in the tree (it only shows under another campus while one of that campus's Building Controllers in the picked faculties references it — faculty-less and archived ones count). Following a link also expands collapsed ancestors and scrolls to the target.

**Associated Building Controllers lists** group by campus with section headers when nodes span multiple campuses; cross-campus nodes (campus not selected in the header) have disabled navigate icons with a tooltip; **faculty-less Building Controllers are listed like any other**, hostnames found in no campus data are filtered out (`UX-07`).

### Manage Faculties

A unified add/remove drawer (`UX-17`): the campus's faculties **that the Building Controller's Campus Hub grants** (plus any it already holds) listed, currently associated ones pre-checked; checking shows a green **ADDING** tag, unchecking a red **REMOVING** tag. Toolbar: search (`Search Faculties`), sortable "Faculties" header, select-all with indeterminate state, `N Faculties Selected`, and the Campus Hub-scoped Building Controller indicator. Search zeroing the list — or a Building Controller with no Campus Hub / no granted faculties — shows an empty state ("No Faculties available"); the Manage → Faculties entry is never disabled. The sort toggle starts ascending and the first click sorts descending.

⚠️ **Removing all faculties no longer archives the Building Controller** (v2.30 reversal; the v2.25 baseline said the opposite). If Save would leave the Building Controller with zero faculties, the Save button opens a **Remove All Faculties** confirmation popover — "This will remove all faculties from `<hostname>`. The building controller will stay active with no associated faculties." — with Cancel and **Remove All** (danger). Confirming keeps the Building Controller **active and faculty-less** (`FR-LS-09a`) and toasts "All Faculties Removed from Building Controller".

**No bulk-add** — faculties are added one Building Controller at a time (`FR-LS-10`).

### Export

The subheader **Export** button downloads a CSV of the Building Controllers **currently shown in the tree** — every selected campus, after the Faculties, Registry Sync and Show Archived filters. Filename: the selected campus codes, **sorted alphabetically**, hyphen-joined, then `-building-controllers.csv`.

```
Hostname, IP Address, Node ID, Campus, Node Type, Status, Description,
Location, Faculties, Campus Hub Association, Relay Association, Alert Service, Energy Saver, Exam Lockdown
```

> **What it's used for** (per the product owner): housekeeping — an ad-hoc list of Building Controllers, e.g. the set being updated, or when campus operations ask for information, so it can be worked offline. **It is a nice-to-have, not a critical-path requirement, and there is no re-import path.**

### Alert Service

Per Building Controller, **switch** (not a dropdown), default **OFF**. Handles live file delivery (Campus Hub → rooms), version management, and routing through the Timetable Relay for Standalone Campuses.

⚠️ **Alert Service no longer needs a Relay** (`FR-LS-05`, v2.38). The v2.25 baseline's rule — enabled only with an associated Relay, reset to OFF and re-disabled whenever the Relay association empties, with `syncPGMForLineServer` forcing `pgmService: 'off'` on every copy — is **removed**. Alert Service can be enabled on any Building Controller, and changing or clearing the Relay association (including changing the Campus Hub) does **not** touch it. The `syncPGMForLineServer` function no longer exists in the prototype. (The stale sentence in `FR-P2-24`'s table was removed in v2.44.)

---

## Validation

### Required fields

⚠️ **The rule is focus-then-blur:** the error appears when the user has **focused the field and left it empty**. A field never touched shows no error, but tabbing in and straight out of an empty one does (on the panels, an empty required field also shows its error on open — see Save gating above). Inline error below the field with a red border; the help text is hidden while the error shows. Copy comes from the shared `ProjFieldError` plugin and has **no trailing period**:

| Field | Message |
|---|---|
| Node Type (Building Controller, panel only) | "Select Node Type" |
| Hostname | "Enter Hostname" |
| IP Address | "Enter IP Address" |
| Proxy URL (Building Controller, Relay) | "Enter Proxy URL" |
| Description | "Enter Description" |
| Location | "Enter Location" |

Required across all three types, on both the Create form (including Unarchive/Move) and the panels: Hostname, IP Address, Description, Location — plus **Proxy URL on the Building Controller and Relay** (v2.31), Node Type and a Campus Hub selection on the Building Controller section, and the drawer's Campus field. The Create button stays disabled until all are satisfied and every enabled Hostname ends in the suffix.

**Faculties are not part of the save gate** — they are optional (`FR-LS-09`).

On the panels, a Save that reaches an invalid value shows the inline error, **focuses the field** (order from `PANEL_FIELD_RULES`) and raises an error toast: `<Field> is required.`, "Enter a valid IP Address.", or "Hostname must end with atrium.test.". Rules live in one `PANEL_FIELD_RULES` table feeding the gate, the backstop and the blur messages.

### IP format

On blur, a non-empty value that isn't a valid IPv4 → inline error "Enter a valid IP Address" (the v2.25 text "Invalid IP Address" is stale).

### Duplicates

On save, all entered hostnames and IPs are checked against **all existing nodes** (active, archived, faculty-less, Campus Hub, Relay) **and against each other** — the same hostname or IP typed in two sections of one Create form is a duplicate too:

| Check | Inline | Toast |
|---|---|---|
| Duplicate Hostname | "Hostname already in use" | "Hostname already in use. Please, try again with a different Hostname." |
| Duplicate IP | "IP Address already in use" | "IP Address already in use. Please, try again with a different IP Address." |

(The v2.25 inline text carried a trailing period after Hostname — "Hostname is already in use." — now stale.)

Hostnames compare case-insensitively (IPs exactly) and are trimmed on save. The same checks run on panel Hostname **and IP** edits, on blur, while typing and on Save. ⚠️ **The node being edited never clashes with itself** — its own copies (one per faculty, plus the copies nested under Relay nodes) are excluded. `_hostnameInUse(hostname, previousHostname)` excludes by **previous hostname, not by id**, because copies share a name but not always an id.

**Proxy URL has no uniqueness or format check** — only the required rule (and the outdated warning).

---

## Known limitations & gotchas

### Specification-level

- ⚠️ **`FR-P2-04` (Timetable Release check on turning Registry Sync off) is reinstated in the requirements but not built** — see [Registry Sync configuration](#registry-sync-configuration). It has flipped three times; follow `requirements.md`. (Distinct from the `FR-P2-30` Asset Registry host-removal refusal, which is built.)
- `FR-P2-12` (read-only hostname) was removed from `requirements.md` in v2.43; `FR-P2-13` is current.
- ✅ **The v2.44 review resolved the earlier requirements-text drift** (Campus Hub rename vs Relay Proxy URLs, bulk Registry Sync refusal presentation, the stale Alert Service sentence, the Details link wording). Remaining spec limitations: a hostname edit during a Building Controller **Unarchive** doesn't update the Campus Hub/Relay lists (unlike Move); **Move** doesn't ask Asset Registry about a hostname edit; a Building Controller's stored Campus Hub association suffix is not uniform (`(Standalone Campus)` / `(Connected Campus/Test Lab)` from the panel and Move, the dropdown text from Create/Unarchive); a new Relay created with Building Controllers records the flat list only (the nested child is stripped by the tree anyway); changing the Campus selection clears the selected node.
- **`FR-GH-02` (a Standalone Campus requires a local Campus Hub before any Building Controller) is real-app-only — not enforced here.** There is no campus-type gate, and because the Campus Hub dropdown offers campus-local *and* NORT Campus Hubs (`FR-LS-07`), a Standalone Campus with no local Campus Hub can currently take a NORT Campus Hub instead.
- **`FR-PA-02` workflow 2** ("from the Faculty: select faculty → add Building Controllers") is real-app-only — faculties aren't selectable nodes in this tree.
- **§6.5 / `FR-PM-01` (Faculty-registered Rooms modal) was dropped** in v2.21 as unbuilt and unplanned.
- The three "Table Columns" lists are **real-app-only** — this prototype navigates a tree.
- **Creation error toasts** (partial-failure messages, §9.1) are real-app-only, not prototyped.
- **Short-name shape** of the hostname convention (`<campus>-bc<floor>-<n>`) is not validated; only the domain is.
- **Open items:** `requirements.md` §10 now has **one** item — what a campus **Move** means outside Atrium (Campus Hub sync-back, Asset Registry delete + re-register). Every earlier item was answered or dropped in November 2026: Campus Hub API, Campus Master Data and Proxy Manager items, Sync User (not used in Atrium), the Network Protocol label (settled), the campus-type tracker item, the content-delivery replacement timeline, the faculty-grant source (read-only), the Asset Registry rename consequence and the Timetable Release scope (confirmed).

### Prototype implementation

- ⚠️ **`findNodeById` returns the *rendered* node, not the backing record.** `buildAllServersTree` builds Relay nodes as `Object.assign({}, relay, { children: [] })` — a clone with a **fresh** children array. Pushing onto it updates the panel for one repaint and is then discarded. Association writes must call `findCDNRecordById(node.id)` first, **and write both representations** (flat list + nested child).
- ⚠️ **The Proxy URL "touched"/Generate machinery described in the v2.25 baseline is gone.** `_panelProxyTouched`, `_cdnPanelProxyTouched`, `_refreshProxyHint`, `refreshDerivedProxyURL` and the `*Generate*` functions no longer exist; the replacement state is `_panelProxyBaseline` (panel) and `_proxyBaseline` / `_proxyChange` (drawer), reset at settle points and — in capture phase — on typing in the Proxy field. `_panelProxyGHDSHostname()` reads the Campus Hub dropdown live (the old cached `_panelProxyGHDS` is likewise gone). Save is gated on the `'outdated'` rule kind for a node flagged after a Campus Hub rename (`_panelProxyStaleAfterGHDSRename`).
- ⚠️ **The Campus Hub Hostname/Campus Hub-change confirmation is deliberately NOT a design-system popover-trigger pair.** The design system binds a toggle to the first `button` inside any `.popover__trigger`, so wrapping the Save button made *every* Save click open the popover, and the design system's positioner then centred it on the trigger with inline styles — off the right edge of the panel, buttons unreachable. It is now a plain child of `.settings-panel__footer` (`.panel-confirm-popover`, anchored bottom-right). Two dependencies: `handleSaveClick` must call `e.stopPropagation()`, or the design system's document-level close-all handler shuts it on the way up; and the rule must **not** re-declare `display`, since it loads after the design system and would beat `.popover--open`. The one popover (`#ghdsChangeConfirmPopover`) is reused for the hostname rename (title "Change Hostname", Keep Editing / Yes, Save) and the Relay-stranding case (Change Campus Hub, Cancel / Save Changes); see `_setGHDSConfirmButtons`.
- ⚠️ **`isServerFullyArchived` counts a faculty-less Building Controller as live — unless it is flagged `archived`** (v2.44). `_findLineServerSite`, `_ghdsAssociatedLineServers`, the duplicate check (`_getAllExistingServers`) and the search index all now look in the orphan bucket too; they used to miss it, which dropped faculty-less Building Controllers from the Associated lists.
- ⚠️ **`_parkAsOrphanLineServer` must run *before* the field writes**, so the parked copy picks them up.
- ⚠️ **`cbDeployScheduled` (the Timetable Release flag) must land on every copy of a hostname.** The older inline literal guarded only the copy the user happened to open, so archiving from another faculty branch slipped through. `_backfillCBDeploy()` exists for this. Seed set is the single demo Building Controller `rvrs-bc1-3.atrium.test`. It gates **archive and move** today; the reinstated `FR-P2-04` would add turning Registry Sync off.
- **Create-drawer state added in v2.44:** `_formSignature()` vs `_dirtyBaseline` (taken 250 ms after open) drives the Close confirmation; `_offeredFormProjects` is the grant-limited faculty list; `_cdnOptionIds` lets the Relay Building Controller list keep the user's checks; `findGHDSServerById` also searches NORT for another campus's form. Filter handlers capture `selectedNodeId` before `BulkMode.clearSelection()` (null when bulk is active) and re-select with `selectNode`, not `navigateToServer`; bulk's `_rangeBetween` builds Shift ranges and `updatePanel` turns one remaining pick into an ordinary selection.
- ✅ **Seed-data defects fixed 2026-11-04:** the Building Controller copies now carry consistent ids per faculty, and the archived twin of `arts-bc01-1` is `arts-bc01-2-old.atrium.test`, so every hostname/IP is unique across active, archived and faculty-less nodes. Three archived faculty-less NORT Building Controllers (`engr-bc01-3`, `medt-bc02-1`, `river-bc02-1`) are now seeded in the orphan bucket. Counts quoted in the router predate this and are **unverified here**.
- **The subheader lives in `runtime/canvas-navigation-data.json`** (the Manage → Infrastructure entry) and is **not grep-reachable from the prototype folder**.
- ⚠️ **The subheader search icon bug is fixed** here: the `<sf-symbol>` had `position: absolute` applied directly, which is inert — `sf-symbol.js` writes `display: inline-block; position: relative` as **inline styles** on its own host. Fixed by wrapping the symbol in a `<span class="search-input-icon">`.
- **Dead CSS keyed off `.search-input-wrapper`** — a class the markup never carried — now keyed to the real `.tree-search-wrapper`. `.field-hint-row` and `.proj-tooltip` (only used by the removed Generate buttons) are now unused.
- **`js/project-selection.js` is dead** — the subheader owns the Faculties filter.
- **Bulk-mode notice copy** was brought in line with v2.15 (`_updateBulkFSNNotice` and two hard-coded strings in `index.html`).
- **Seed data notes:** `meds-hub2.atrium.test` (MEDS) is a spare Campus Hub with no Building Controllers that grants `SCI` only, so a Campus Hub change demos a *partial* faculty removal; Campus Hubs with no active Building Controllers also include `nort-hub-lab`, `hlsd-hub2` and `meds-hub3`. `SOUT` is a fully empty campus. Two Relays fill Proxy URL coverage gaps: `hlsd-rly2-1.atrium.test` (the only seed Relay on Rule 2) and the archived `meds-rly01.atrium.test` (legacy name, stays empty).
- Many CSS/JS modules are still marked **_pending_** for maps — created lazily on next touch.

---

## Design history

`manage-infrastructure` is the only prototype of this module. Its change history (46 entries, 2026-04-09 → 2026-11-04) is in `manage-infrastructure/changelog.json`. Earlier iterations differed mainly in these areas: Node Type was a campus-level setting, the Proxy URL was entered manually and had to be unique, a Sync User field existed on the Campus Hub panel, only a single campus could be selected, and there was no Registry Sync configuration, bulk mode, Move or archive of Campus Hubs and Relays. Faculty rows are excluded from the estate-wide search, and faculties on create are optional (`FR-LS-09`).

---

## Roles & permissions

**Neither the requirements nor the prototype defines any role model for this module.** `requirements.md` contains no roles/permissions section. The only gating is the workspace impersonation config (`runtime/davinci-users.json`), which offers two demo personas: **Maya Okafor** (Campus IT Admin, the default) with no restrictions, and **Daniel Reyes** (Viewer), for whom the **Create Node** button (`#newServerBtn`) is disabled. That is demo-level gating, not a specification of in-page permissions. See [context/roles-permissions.md](../roles-permissions.md) for the shared role model.

No per-action gating (who may archive, move, cascade Registry Sync, rename a Campus Hub) is specified anywhere in the sources. Flagging this as a genuine gap rather than an omission in this document.

---

## Setup & config

```
Entry HTML   index.html          (content in <script id="page-content">)
JS entry     js/init.js          → js/init-search.js init() on davinci:canvas:ready
CSS entry    css/main.css        (@imports feature files)
Plugins      ProjMultiSelect     (Campus and Faculties multi-selects)
             ProjFieldError      (every inline field error)
Subheader    runtime/canvas-navigation-data.json → Manage → Infrastructure
Suffix       SERVER_HOSTNAME_SUFFIX = 'atrium.test'  (stands in for meta.hostnameSuffix)
```

Design-system components used: empty states, tags, forms/selects, checkboxes, switches, buttons, drawer, popover, modal, loader.

The requirements document is surfaced in-prototype by the `ProjRequirementsPanel` ribbon and `error-cases.md` by the `ProjErrorCasesPanel` ribbon (gated on `PROTOTYPE.md`). `PROTOTYPE.md` instructs: **add an `error-cases.md` entry whenever a new hidden error, blocked or warning state is introduced.**

---

## Toast reference

**Success**

```
<Type> Created  /  <A>, <B> and <C> Created   (types: Building Controller, Campus Hub, Timetable Relay)
Faculties Updated for Building Controller
All Faculties Removed from Building Controller
Building Controllers Updated for Timetable Relay        (FR-P2-17, from the Relay side)
Building Controllers Updated for Campus Hub             (FR-P2-20)
Building Controller Archived / Building Controller Unarchived
Campus Hub Archived / Campus Hub Unarchived   (FR-P2-15)
Timetable Relay Archived / Timetable Relay Unarchived             (FR-P2-15)
Building Controller moved to <Campus> / Campus Hub moved to <Campus>   (FR-P2-23)
Registry Sync applied to N Building Controllers    (bulk, and a Campus Registry Sync save — nothing when every node was refused)
<Type> updated.
```

(The v2.25 entries "Timetable Relays Updated for Building Controller", "Configuration applied to N Building Controllers" and "<Type> Node changes discarded." are stale: the first was removed with Manage → Timetable Relays, the second is now "Registry Sync applied to N Building Controllers", and Discard shows no toast.)

**Blocking & guidance**

| Situation | Message | Type |
|---|---|---|
| Archiving a Building Controller with a scheduled Timetable Release | "This Building Controller is scheduled for a Timetable Release. Cancel the release before archiving." | error |
| Asset Registry refuses host removal (archive / disable Registry Sync / hostname change) | Two lines: bold "Unable to `<action>`, Registry Sync change was not successful." + `<server error message>` (`FR-P2-30`) | error |
| Bulk / Campus Registry Sync off with refusals | "Unable to update N Building Controllers Registry Sync status" + **Details** link (`FR-P2-30`, `error-cases.md`) | warning (plain) |
| Archiving a Relay with Building Controllers *(only fires against a stale menu — the item is disabled)* | "Remove the associated Building Controller before archiving." / "Remove all `<N>` associated Building Controllers before archiving." | error |
| Archiving a Campus Hub with active Building Controllers or Relays; the master Campus Hub; a Building Controller that has a Relay *(same)* | "Remove all associated Building Controllers and Timetable Relays before archiving." / "hub.atrium.test is the master Campus Hub and can't be archived." / "Remove the Timetable Relay association (`<relay>`) before archiving." | error |
| Turning Registry Sync off on a Building Controller with a scheduled Timetable Release *(`FR-P2-04`, **not built**)* | "Cannot save: building controller is scheduled for Timetable Release." (panel) / "Cannot apply: N building controller(s) scheduled for Timetable Release." (bulk) | error |
| Campus Hub rename left nodes needing a manual Proxy URL | "`<counts>` need(s) its Proxy URL updated manually." (Building Controllers and Timetable Relays) + **Details** (`FR-P2-25`) | warning (plain: no label, no icon) |
| Unarchive request rejected by server | Node's message (`FR-P2-26`) | error |
| No section enabled | "Enable at least one node section" | warning |
| No Campus Hub chosen (Create / Unarchive / Move of a Building Controller) | "Select a Campus Hub node" | warning |
| Create opened with no campus resolved | "Select a campus in the navigation first" | warning |
| Manage drawer saved with nothing changed | "No changes to save" | success (neutral) |
| Navigating outside current filters | "Node not visible in current view" | warning |
| Duplicate hostname / IP on save | "…already in use. Please, try again with a different…" | error |
| Required field empty on panel Save | "`<Field>` is required." | error |
| Invalid IP on panel Save | "Enter a valid IP Address." | error |
| Hostname off the suffix on panel Save | "Hostname must end with atrium.test." | error |

Success, error and warning toasts disappear after 4 seconds (those with **Details** stay until closed) and stack from the top centre. Success and error toasts carry **no label prefix**; **warning** toasts are prefixed with a bold **Warning:** (§9.2) — except the plain warning toasts above, which follow the Registry Sync failure toast style (no label, no icon).

---

## Cross-topic dependencies

| Topic | Relationship |
|---|---|
| **Campus Master Data (CMD)** | Upstream source of campuses, faculties and rooms. A faculty must exist in Campus Master Data before it can be associated in Atrium |
| **Campus Hub** | Bidirectional — read plus sync-back. Must remain backward compatible until the planned content-delivery replacement lands. A Campus Hub Hostname change fans out to every connected node's Proxy URL |
| **Proxy Manager** (`proxies.legacy.test`) | Being **replaced** by this module |
| **Asset Registry** | The Registry Sync toggle grants Building Controllers access to communicate with Asset Registry. Asset Registry can **refuse host removal** (archive / disable / rename; `FR-P2-30`). A hostname rename has an unmodeled Asset Registry consequence — Asset Registry has no update endpoint |
| **Timetable Release** | A Building Controller with a scheduled Timetable Release cannot be **archived or moved** (`FR-DS-07`, `FR-P2-23`). The reinstated `FR-P2-04` would also block turning Registry Sync **off** for such a Building Controller (specified, not yet built) |
| [manage-devices.md](manage-devices.md) | **Devices on a Building Controller.** The archive popover checks for devices registered on a Building Controller (`FR-P2-29`, mock `_unitsByHost`) — informational only, never blocks. Devices are registered per room by AV technicians through Manage Devices, and a campus's Building Controllers supply the device complement for that page's table; an unreachable one degrades it |
| [device-recovery.md](device-recovery.md) | **Recovery registration.** Faculty-registered Devices are registered by their Building Controller, so Device Recovery excludes them and covers IT-managed Devices only. No data flows between the two modules |

---

## Testing

No automated test suite is described in any source. The prototype's verification aids are the `changelog.json` history, the `maps/` documentation tree, and **`error-cases.md`**, which lists each hidden error / blocked / warning state with exact seeded hostnames and a numbered flow (Registry Sync refusals, devices check, archive/move blocks, archived-Campus-Hub unarchive, hostname lock and suffix, Campus Hub rename). Tip from that file: type the hostname into the tree search — it widens whatever filter hid the node. Re-check those flows after changing seed data in `js/config-data.js`.

---

## Terms

Shared vocabulary — **Campus Master Data**, **Asset Registry**, **Campus Hub**, **Proxy Manager**, **Building Controller**, **Proxy URL**, and the **Connected Campus / Standalone Campus / Test Lab** node types — lives in [context/glossary.md](../glossary.md). This module is the canonical definition for the infrastructure topology. Terms specific to this module:

| Term | Meaning |
|---|---|
| **NORT** | The master campus (North); its Campus Hubs are visible cross-campus |
| **aria2c** | Transfer protocol used by Campus Hubs |
| **Timetable Relay** | Live file transfer node; distributes files from Campus Hub to rooms. One Relay → many Building Controllers; a Building Controller has at most one Relay |
| **Hostname outdated** | Orange tree/legend flag for a hostname not ending in `atrium.test` (legacy hosts on `campus.test`, `legacy.test` or `.local`). Distinct from *Proxy URL outdated* |
| **Energy Saver** | Building Controller setting (checkbox) |
| **Orphan bucket** | Where a Building Controller with zero faculty associations is stored (archived in place when archived) |
| **Alert Service** | Live file delivery service; independent of the Relay association since v2.38 |
| **Proxy URL outdated** | Warning state: the URL can't be derived (or a Campus Hub rename left a hand-typed URL stale, on a Building Controller or Timetable Relay); old value kept, Save available except for a node flagged after a Campus Hub rename |
| **Exam Lockdown** | Building Controller setting (checkbox) |
| **rsync** | Transfer protocol used by Building Controllers and Relays |
| **Sync User** | Proposed Campus Hub field (always `www`) — not used in Atrium |

---

## Source map

| Source | Layer | Path |
|---|---|---|
| Prototype router | Design intent | `manage-infrastructure/PROTOTYPE.md` |
| Requirements v2.44 | Specification | `manage-infrastructure/requirements.md` |
| Error cases | Hidden error / blocked / warning states and flows | `manage-infrastructure/error-cases.md` |
| Prototype maps | Per-module deep context | `manage-infrastructure/maps/` (css / html / js; e.g. `maps/js/config-data.md` holds the Proxy URL re-derive snippet) |
| Changelog | Design change history | `manage-infrastructure/changelog.json` |
| Proxy URL rules | **Now in** `requirements.md` `FR-P2-14` / `FR-P2-19` / `FR-P2-25` | (`Requirements_proxyurl.md` no longer exists) |
| Role impersonation | Demo gating | `runtime/davinci-users.json` |
| Production client | — | none (design-only module) |
