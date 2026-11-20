# Requirements Document
## Atrium — Infrastructure Management (Manage Infrastructure)
**Version:** 2.44
**Date:** November 4, 2026
**Status:** Draft — reconciled with the prototype code on this date.
**v2.44 changes:** Full prototype ↔ requirements check, three passes. The prototype was fixed where it contradicted a requirement (faculty-less building controllers in association lists, duplicate checks and archiving; the three Unarchive flows; filter changes keeping the selection; the exact-hub faculty icon; CSV quoting; the archive re-check on confirm; the Campus Registry Sync save toast; seed duplicates) and the document was updated where the prototype was deliberate (renaming archived faculty-less building controllers, default-faculty re-application, faculty tags following the Faculties filter, tree sections, bulk-mode details, the Relay drawer note, §9.2 messages) and gained **UX-19** for behaviour it never stated. **v2.43:** a Campus Hub rename covers Relay Proxy URLs; bulk and Campus Registry Sync refusals use one warning toast with a details modal; Alert Service is independent of the Relay; the Timetable Release block on turning Registry Sync off is reinstated (`FR-P2-04`, not yet rebuilt in the prototype); the field is **Network Protocol** everywhere. Earlier revision history lives in git.

---

## 1. Overview

### 1.1 Purpose
This document defines the functional and non-functional requirements for bringing infrastructure management into **Atrium**, making it the single source of truth for managing building controllers, Timetable Relays and Campus Hubs, and their associations with faculties and campuses at Northfield University.

### 1.2 Background
Today, infrastructure management is split across several systems:

| System | Current Role |
|---|---|
| **Campus Hub** | Central store that delivers timetables and room policies to building controllers |
| **Proxy Manager** (`proxies.legacy.test`) | Legacy tool that manages proxy URLs and additional node switches |
| **Campus Master Data (CMD)** | Source of truth for campuses, faculties and rooms |
| **Atrium** | Target system — to become the new source of truth for infrastructure management |

### 1.3 Migration Approach
The migration will follow the same model used when moving functionality from Campus Hub to Campus Master Data:
- Atrium takes over the **UI and management** of all nodes
- Atrium maintains the **source of truth database**
- Atrium **syncs all changes back to Campus Hub** so that Campus Hub can continue to deliver timetables and room policies and perform all existing functions without disruption
- All functionality currently in the **Proxy Manager** (`proxies.legacy.test`) will be **consolidated into Atrium's Manage Infrastructure page**

---

## 2. Scope

### 2.1 In Scope
- Building controller creation, editing, and decommissioning
- Timetable Relay creation, editing, and decommissioning
- Campus Hub creation and management
- Faculty-to-building-controller association
- Campus-to-node association (sourced from Campus Master Data)
- Proxy URL management (generated automatically for building controllers and Relays; manually entered for Campus Hubs in the real app — the prototype has no Campus Hub Proxy URL input)
- Alert Service configuration
- Sync-back to Campus Hub
- Archived node management

### 2.2 Out of Scope
- Campus and room management (remains in Campus Master Data)
- Faculty creation (remains in Campus Master Data)
- Backend infrastructure configuration
- Campus Hub timetable and room-policy delivery logic

---

## 3. System Actors & Integrations

| Actor / System | Integration Type | Notes |
|---|---|---|
| **Campus Master Data** | Read (API/sync) | Source of campuses, faculties, and room data |
| **Campus Hub** | Read + Write (sync-back) | Must remain backward compatible |
| **Proxy Manager** | Replaced by Atrium | All functionality migrated into Atrium |
| **Building Controller API** | Read | Reached through the building controller's Proxy URL — see `FR-P2-14` for the two generation rules |

---

## 4. Architecture

### 4.1 Campus Hub — Distributed System
Campus Hub is a distributed application composed of:
- **1 master instance**: `hub.atrium.test` — the university-wide hub
- **N local instances**: one per Standalone Campus (e.g., `nort-hub.atrium.test`, `meds-hub.atrium.test`, `rvrs-hub.atrium.test`, `hlsd-hub.atrium.test`)

> **Future direction:** The long-term vision is to replace Campus Hub with a single university-wide delivery service. Atrium will notify building controllers to fetch timetables and room policies from that service directly, eliminating the need for Campus Hub. Until then, Atrium must maintain backwards compatibility by syncing all changes back to Campus Hub. The UI is designed so Campus Hub is an association/property, not a structural element.

### 4.2 Node Types

| Type | Campus Hub Instance | Timetable Relay |
|---|---|---|
| **Connected Campus** | Master (`hub.atrium.test`) | The building controller itself — no dedicated Relay |
| **Standalone Campus** | Local Campus Hub (campus-specific) | Dedicated physical Relay per campus |
| **Test Lab** | Master (`hub.atrium.test`) | The building controller itself — no dedicated Relay |

> Node Type is a per-building-controller property with three values — Standalone Campus / Connected Campus / Test Lab (see §5.3 and
> `FR-GH-04`). Test Lab behaves like Connected Campus for Campus Hub and Relay purposes.

### 4.3 Data Flow
```
Campus Hub → Timetable Relay → Rooms (via building controllers)
```

The Timetable Relay is a **live file-transfer node**. Campus Hub sends timetable and firmware files to the Timetable Relay, which then distributes them to the rooms across the building controllers it is associated with.

---

## 5. Data Model Requirements

### 5.1 Campus
- Campuses are **created and managed in Campus Master Data**
- Campuses are synced from Campus Master Data → Campus Hub → available in Atrium for selection
- The campus side panel surfaces only the **Configuration** section (Registry Sync). Node Type is no longer a campus-level field — it is now a **per-building-controller** property (see §5.3).
- The campus keeps a default Node Type seed, used to backfill existing building controllers on import and to drive the Campus Hub Association option label format. Two building controllers on the same campus can have different Node Types.

### 5.2 Campus Hub

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Host Name | text | required, **unique**, **ends in `atrium.test`** | Hostname of the Campus Hub instance. Free text holding the full hostname, validated against the domain rule (`FR-P2-21`: it must end in `atrium.test`). Editable on the side panel (**first editable field**) at any time — see FR-P2-13. Placeholder: `e.g. meds-hub.atrium.test` |
| Proxy URL | text | optional | URL used to proxy building controller API requests; can be empty. **Never derived** — Campus Hub is the only node type the derivation rules (FR-P2-14 / FR-P2-19) do not cover. *Prototype:* there is **no Campus Hub Proxy URL input** on the Create form or the Campus Hub side panel; seeded values are shown read-only in the ASSOCIATED CAMPUS HUB sections of the Building Controller and Relay panels |
| Description | text | required | Human-readable description |
| Node IP | text | required, **unique** | IP address of the Campus Hub. Editable on the side panel, directly under Hostname — see `FR-P2-22` |
| Campus | dropdown | required | Sourced from Campus Master Data. The prototype's drawer Campus dropdown (`UX-04a`) lists campus codes. *(Real app: name + location, e.g. `MEDS — Medical Sciences (Northfield)`.)* |
| Location (Bldg/Floor/Room) | text | required | Physical location of the hub hardware |
| Bridge Service | switch | required | ON / OFF — SQL replication service on the hub. Displayed as a switch, not a dropdown (see §9.4) |
| Network Protocol | read-only | — | Always `aria2c` for Campus Hubs. Labelled "Network Protocol" on every panel — see §5.5 |
| Internal Node ID | read-only | — | Numeric ID of the Campus Hub, assigned on creation |

> A **Sync User** account is not used in Atrium and is not part of `FR-GH-01`'s field list.

**Campus Hub Table Columns** *(real app — not prototyped; this prototype navigates a tree, not a table)*: Campus, Campus Hub Node, Description, IP Address, Location, Bldg/Floor/Room, Bridge (ON/OFF), Network Protocol, ID

> **Note:** Energy Saver and Exam Lockdown were moved from Campus Hub to Building Controller (they are building controller settings, not Campus Hub properties). Node Type is not a Campus Hub property either — it is a per-building-controller field (§5.3, `FR-GH-04`).

### 5.3 Building Controller

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Node Type | dropdown | required | **Standalone Campus / Connected Campus / Test Lab** — per building controller (moved off the campus). On the Create form the default is **empty**: the user must pick a value before Save is enabled (same gating as Hostname / IP / Proxy URL / Description / Location / Campus Hub). It is the **first editable field** on the Building Controller side panel and the first field of the Building Controller section on the Create form — above Hostname in both. Building controllers that predate the field are backfilled from their campus's Node Type seed on import. |
| Host Name | text | required, **unique**, **ends in `atrium.test`** | Hostname of the building controller. On the side panel it is the **second editable field**, below Node Type, and can be renamed **only while no faculty is associated** — see FR-P2-13. Free text holding the full hostname, validated against the domain rule ("Hostname must end with atrium.test", FR-P2-21). Placeholder: `e.g. meds-bc1-4.atrium.test` |
| Proxy URL | text | required | URL used by Atrium to make building controller API requests. **Generated automatically** from the associated Campus Hub + hostname, and freely editable — see FR-P2-14 and FR-P2-25. On the Create form it sits under Campus Hub Association; on the side panel under Relay Association, with an open-in-new-tab action. (Formerly described as separate "Controller Proxy URL" and "Pass-Through URL" fields — these are the same single field.) |
| Description | text | required | Human-readable description |
| Node IP | text | required, **unique** | IP address. Editable on the side panel, directly under Hostname — see `FR-P2-22` |
| Campus | dropdown | required | Sourced from Campus Master Data — **not editable on the side panel**; changed only through **Move** (`FR-P2-23`) |
| Location (Bldg/Floor/Room) | text | required | Physical location |
| Campus Hub | dropdown | required on creation | Which Campus Hub instance this building controller belongs to. Can be set to `Not assigned` after creation (`FR-P2-16`, `FR-P2-20`) |
| Relay Association | dropdown | optional | **Single** select: the non-archived Relays of the building controller's own campus on the selected Campus Hub, plus `Not assigned`. A building controller belongs to **at most one** Relay (`FR-P2-24`). Editable on the side panel, directly under Campus Hub Association |
| Add Faculty | multi-select | optional | Faculties associated with this building controller; **disabled until Campus Hub is selected**. Optional on both Create and Unarchive — a building controller with no faculties is still valid (see `FR-LS-09`, `FR-LS-09a`) |
| Alert Service | switch | optional | Default: OFF. Displayed as a switch, not a dropdown (see `UX-16`) |
| Energy Saver | checkbox | optional | Building controller setting (form label "Enable Energy Saver") |
| Exam Lockdown | checkbox | optional | Building controller setting (form label "Classify as an Exam Lockdown controller") |
| Node ID | auto-generated | read-only | **Unique** by construction; generated on creation — **not editable** |

**Faculty Selection Flow (Add Building Controller):**
1. User selects a **Campus** → Campus Master Data supplies all faculties for that campus
2. User selects a **Campus Hub** → faculty list is enabled and each faculty shows an indicator:
   - **Building controller icon** — faculty already has at least one building controller connected to the **same Campus Hub**
   - **No icon** — faculty has no building controllers under the same Campus Hub
3. Faculties remain **disabled** until a Campus Hub is selected

**Building Controller Table Columns** *(real app — not prototyped; this prototype navigates a tree, not a table)*: Campus, Building Controller (hostname + alias), IP Address, Location, Faculty (many-to-many), Campus Hub, Network Protocol (`rsync`), Alert State, ID

### 5.4 Timetable Relay

| Field | Type | Constraints | Notes |
|---|---|---|---|
| Host Name | text | required, **unique**, **ends in `atrium.test`** | Hostname of the Timetable Relay. Editable on the side panel (**first editable field**) at any time — see FR-P2-13. Free text holding the full hostname, validated against the domain rule (FR-P2-21). Placeholder: `e.g. meds-rly1-1.atrium.test` |
| Proxy URL | text | required | URL used to proxy building controller requests. **Generated automatically** from the associated Campus Hub + Relay hostname, and freely editable — see FR-P2-19 and FR-P2-25. On the Create form it sits under Campus Hub Association; on the side panel under Campus Hub Association, with an open-in-new-tab action |
| Description | text | required | Human-readable description |
| Node IP | text | required, **unique** | IP address. Checked against every existing node on save, same as Building Controller and Campus Hub IPs. Editable on the side panel, directly under Hostname — see `FR-P2-22` |
| Campus | dropdown | required | Sourced from Campus Master Data (the drawer Campus dropdown, `UX-04a`). Not surfaced on the Relay details panel — see `UX-06` |
| Location (Bldg/Floor/Room) | text | required | Physical location |
| Campus Hub | dropdown | required | **Must be selected first** on the Create form. *(Prototype: the Create gate does not enforce it — a Relay can be created without one; Building Controller Association stays disabled until one is picked.)* Editable afterwards from the Relay side panel (`FR-P2-16`) |
| Building Controller Association | multi-select dropdown | optional | Active building controllers of the form's campus on the selected Campus Hub that have no Relay yet (`FR-P2-24`); the list is read live from the building controllers, so ones created or unarchived after load are included. **Disabled** until a Campus Hub is selected, not hidden. (The *checklist* form of this control is the separate **Manage → Building Controllers** drawer — see `FR-P2-17` and `UX-15`; it replaced the add-only "Add Building Controller" action.) |

**Edit Timetable Relay — Additional Fields:**
- Campus Hub: editable dropdown (`FR-P2-16`) — changing it detaches the building controllers that stay on the old Campus Hub
- Internal Node ID: read-only (assigned on creation)
- Current Building Controllers: read-only list of already-associated building controllers
- Building controller membership: **Manage → Building Controllers** (`FR-P2-17`) lists every non-archived building controller on the Relay's Campus Hub: those already on this Relay are pre-checked, and one on another Relay is listed disabled and tagged with that Relay until it leaves it (`FR-P2-24`, `FR-P2-28`)

**Timetable Relay Table Columns** *(real app — not prototyped; this prototype navigates a tree, not a table)*: Campus, Timetable Relay, Description, IP Address, Location, Bldg/Floor/Room, Building Controller (one-to-many: a Relay serves many building controllers, a building controller has at most one Relay), Campus Hub, Network Protocol (`rsync`), ID

**Relay Modes by Node Type:**
| Node Type | Timetable Relay | Notes |
|---|---|---|
| Connected Campus | The building controller itself | No dedicated Relay — the building controller acts as its own Relay |
| Standalone Campus | Dedicated Relay | Separate physical Relay per Standalone Campus |
| Test Lab | The building controller itself | Same as Connected Campus — no dedicated Relay |

### 5.5 Network Protocol Rules

| Node | Protocol | Notes |
|---|---|---|
| Campus Hubs | `aria2c` | Backend design constraint; cannot be changed to rsync |
| Building Controllers | `rsync` | Standard for timetable and room-policy file transfer |
| Timetable Relays | `rsync` | Standard for live file transfer to rooms |

> **Constraint:** Changing Campus Hub transport to rsync would cause timetable transfer conflicts. This is a backend design constraint and must not be altered.

---

## 6. Functional Requirements

### 6.1 Infrastructure Management — Building Controllers

**FR-LS-01:** Atrium shall provide the ability to **create a new building controller** with fields: Node Type (**required**, Standalone Campus / Connected Campus / Test Lab), hostname, IP address, Campus Hub association (**required**), proxy URL (**required**), faculties (**optional** multi-select, enabled after Campus Hub selected), Relay association (**single** dropdown, optional, filtered by Campus Hub — `FR-P2-24`), description, location, Alert Service, Exam Lockdown and Energy Saver; the campus comes from the drawer (from Campus Master Data — `UX-04a`).

**FR-LS-02:** The system shall enforce **uniqueness of both IP address and Node ID** across all nodes.

**FR-LS-03:** The **Node ID** field shall be **locked/read-only** after initial submission. The **campus** is not edited on the side panel either, but it can be changed through **Move → To available Campus** (`FR-P2-23`). **IP address is not locked** — it is editable from the side panel (FR-P2-22). **Hostname** is editable from the Building Controller side panel only while no faculty is associated with the building controller (FR-P2-13).

**FR-LS-04:** The **description and location** fields shall remain **editable at any time**. The **hostname** is editable while the building controller has no associated faculty (FR-P2-13); edits are validated (required + `atrium.test` domain + unique) and propagate to every record that references the building controller by hostname — see FR-P2-13.

**FR-LS-05:** Alert Service shall default to **OFF** and be configurable as a switch (ON/OFF). Alert Service can be enabled on **any** building controller, of every Node Type, **whether or not it has an associated Relay**. Changing or clearing the Relay association (including changing the Campus Hub selection, which resets the dependent **Relay Association** dropdown) does **not** change the Alert Service setting. _(v2.38: the earlier rule that required a Relay, and reset Alert to Off when the Relay went away, is removed.)_

**FR-LS-06:** The building controller **Proxy URL** is **generated automatically** from the associated Campus Hub and the building controller hostname, and remains **editable** and **required** — see **FR-P2-14** for the generation rules and **FR-P2-25** for when it updates. _(This reverses the earlier rule that it was manually entered and explicitly not derivable.)_ On the Create New Node form it sits directly under **Campus Hub Association** (the field it derives from); on the Building Controller side panel it sits directly under **Relay Association**, below Campus Hub Association. This single field replaces what was previously specified as a separate "Controller Proxy URL" and an auto-generated "Pass-Through URL" — they are one and the same.

**FR-LS-07:** The **Campus Hub selection list** shall include Campus Hubs from the **selected campus AND from NORT** (the campus that hosts the university master hub). Any campus can select from NORT Campus Hubs in addition to its own. A help text below the dropdown shall read "Filtered by selected campus" and, when the selected campus is not NORT, additionally note "NORT nodes also included." (shown as "Filtered by selected campus. NORT nodes also included.")

**FR-LS-07a:** The **faculty selection** on the Create New Node form shall be **disabled until a Campus Hub is selected**. Faculties are positioned below the Campus Hub Association field. The building controller icon indicator on each faculty item shall reflect whether that faculty has building controllers **connected to the selected Campus Hub**, not just any building controllers for the campus. When creating a new Campus Hub (toggle ON), faculties are enabled with no indicators (new Campus Hub has no existing associations).

**FR-LS-07b:** The Campus Hub-scoped building controller indicator rule applies across **all faculty listings**: the Create New Node form and the Manage Faculties drawer (only active building controllers that have faculties count). The indicator tooltip reads "Has building controllers on this Campus Hub".

**FR-LS-07c:** The **Campus Hub Association** field on the Create New Node form is **required**. The form shall not submit without a Campus Hub selection (either an existing Campus Hub or a new one being created via the toggle). The Save button remains disabled until a Campus Hub is selected.

**FR-LS-08:** Atrium shall **sync all building controller data** back to Campus Hub upon creation or update.

**FR-LS-09:** When creating a building controller, **GENERAL, TEMPLATE, and NONE** shall be **pre-selected** as default faculties. Users can deselect them if needed, but the defaults are applied again whenever the Campus Hub or the campus changes on the form (replacing manual picks), and in Unarchive mode a Campus Hub change replaces the pre-checked historical set (an archived building controller with no faculty history opens with no faculty checked and is restored as faculty-less; the defaults come back only if the Campus Hub is changed). The Faculties field is **optional** — the user may save the building controller with no faculties selected. The form label reads "Faculties (optional)" and the Save button does not require a faculty selection. **This applies to the Unarchive flow too:** unarchiving with no faculty selected restores the building controller as faculty-less (`FR-LS-09a`) rather than blocking the save.

**FR-LS-09a:** A building controller saved with **zero faculty associations** shall still appear in the tree (under its campus) and remain manageable. In the tree row and on the side-panel "Associated Faculties" field, the faculty tag strip shall be replaced with the empty-state hint **"No Faculties selected"** (italic, secondary gray). The hint is shown for archived faculty-less building controllers too. Adding at least one faculty via Manage Faculties shall remove the empty-state hint and render normal faculty tags.

**FR-LS-10:** There shall be **no bulk-add** of faculties to multiple building controllers simultaneously. Faculties are added to one building controller at a time.

### 6.2 Infrastructure Management — Timetable Relays

**FR-CDN-01:** Atrium shall provide the ability to **create and manage Timetable Relays** with fields: hostname, proxy URL (**required**, **generated automatically** — see `FR-P2-19`), description, IP address, campus, location, Campus Hub association, and building controller associations.

**FR-CDN-02:** The **Campus Hub must be selected first** before building controllers can be associated. After creation the Campus Hub Association stays editable on the Relay side panel (`FR-P2-16`), and changing it detaches the building controllers that stayed on the old Campus Hub.

**FR-CDN-02a:** When creating a Relay alongside a Building Controller (unified form), the Relay's **Campus Hub Association shall inherit** the Building Controller's Campus Hub selection. The Relay Campus Hub field is **disabled and auto-filled** with the same value. If the Building Controller Campus Hub is cleared or the Building Controller section is toggled off, the Relay Campus Hub field restores its own independent dropdown. The inheritance also runs the other way: when the Relay section's Campus Hub is picked first and the Building Controller Campus Hub is empty, the Building Controller Campus Hub field takes it, disabled, with the help text "Inherited from Relay Campus Hub selection".

**FR-CDN-03:** A Relay's building controller membership is managed from a **unified add/remove list** (`FR-P2-17`) offering every building controller on the Relay's own Campus Hub: those already associated arrive checked and can be unchecked to remove them. A building controller belongs to **at most one Relay** (`FR-P2-24`), so building controllers already on **another** Relay are listed **disabled**, tagged with that Relay (`FR-P2-28`). _(Supersedes the earlier "no single-Relay exclusivity" rule.)_

**FR-CDN-04:** For **Connected Campuses**, the Relay is the building controller itself — a disclaimer shall inform the user. *(Prototype: the Relay section of the Create form shows this as a static info notification — "Connected Campus type nodes: The Timetable Relay is the building controller itself, no dedicated Relay is needed. Only Standalone Campus type nodes require a separate physical Relay node." — regardless of the campus's Node Type.)*

**FR-CDN-05:** Timetable Relay records shall be **synced back to Campus Hub**.

**FR-CDN-06:** A Relay's **hostname is editable at any time** from the Relay side panel (first editable field), with required + `atrium.test` domain (`FR-P2-21`) + uniqueness validation. No other record references a Relay by hostname, so no propagation is required — see FR-P2-13.

### 6.3 Infrastructure Management — Campus Hubs

**FR-GH-01:** Atrium shall provide the ability to **create and manage Campus Hubs** with fields: hostname, description, IP address, campus, location, bridge service, network protocol (read-only `aria2c`), auto-generated internal node ID, and proxy URL (optional, manual). *(Prototype: the Create form collects Hostname, IP, Description and Location; Bridge Service is set on the side panel and a new Campus Hub starts with it OFF; there is no Proxy URL input.)* (Sync User is **not** included — see §5.2.)

**FR-GH-02:** For **Standalone Campuses**, a **local Campus Hub** must be created before any building controller can be added for that campus. *(Real app — not enforced in this prototype: there is no campus-type gate, and because the Campus Hub dropdown offers campus-local **and** NORT Campus Hubs (`FR-LS-07`), a Standalone Campus with no local Campus Hub can currently take a NORT Campus Hub instead.)*

**FR-GH-03:** For **Connected Campuses and Test Labs**, the master Campus Hub (`hub.atrium.test`) shall be used — no local Campus Hub registration needed.

**FR-GH-04:** **Node Type** (Standalone Campus / Connected Campus / Test Lab) is a **per-building-controller property**, displayed and editable on the Building Controller side panel as the **first editable field** (above Hostname, matching the Create New Node form's order), and required on the Create New Node form (default empty; Save blocked until the user picks). It is no longer a campus-level field. Each campus keeps a default Node Type seed that backfills building controllers predating the field and drives internal form behavior — it is not surfaced to the user.

**FR-GH-05:** A Campus Hub's **hostname is editable at any time** from its side panel. A rename is rewritten into the Campus Hub association of every building controller (active, archived, faculty-less) and Relay that references it (`FR-P2-13`), and, where the Proxy URL is generated, into the **Proxy URL** of every such building controller and Relay; the others are flagged Proxy URL outdated (`FR-P2-25`), after a confirmation on Save that counts them (the master Campus Hub `hub.atrium.test` is never confirmed — `FR-P2-25`). _(Supersedes the earlier rule that locked the Hostname while any building controller was associated. That association condition still gates **archiving** the Campus Hub, per `FR-P2-15`.)_

### 6.4 Node Decommissioning (Archived Nodes)

**FR-DS-01:** **No node shall ever be permanently deleted.** Removing a node moves it to an **Archived** state. This applies to all three node types — building controllers, Campus Hubs and Timetable Relays (`FR-P2-15`).

**FR-DS-02:** Removing a faculty from a building controller syncs the removal to Campus Hub (archived nodes list) **in the background**. The removed faculty association is **not shown in Atrium's UI** — the faculty disappears from the building controller's details panel and the building controller is hidden from that faculty's branch in the tree. The association is **retained internally** so that archive flows (FR-DS-05, FR-DS-06) can later surface the full faculty history.

**FR-DS-03:** Archived nodes are **hidden by default** in the tree view. A single filter toggle — **"Show Archived Nodes"** — reveals them: archived building controllers at the bottom of the building controllers list, archived Campus Hubs and Relays at the bottom of their respective sections. Toggling filters shall **preserve the current selection** unless the selected node was archived and the archived filter was just disabled.

**FR-DS-04:** Archived node records shall be **synced back to Campus Hub**.

**FR-DS-05:** Archived building controllers show all faculties they were ever associated with (including faculties removed during the active period) on both the tree row (faculty tags; archived building controllers sit at the bottom of the campus's flat building controller list — `FR-DS-03`) and the side panel (faculty tags). This historical set is preserved across active → archive → unarchive → archive cycles: re-archiving a building controller again surfaces every faculty ever associated with it, including faculties unselected during a prior unarchive.

**FR-DS-06:** Unarchiving a building controller shall open the **Create New Node form in unarchive mode**: the Campus Hub and Relay toggle sections are hidden, the Building Controller toggle header is hidden, and all Building Controller fields are pre-filled from the archived building controller's data and **fully editable** (node type, hostname, IP, proxy URL, description, location, Campus Hub association, faculties, Relay association, Energy Saver, Exam Lockdown, Alert Service). The drawer title shall read "Unarchive Building Controller for `<Campus>`" and the primary action button shall be labeled "Unarchive". The faculty multi-select is pre-checked with the building controller's **full historical set** (limited to the faculties its Campus Hub still grants) — every faculty ever associated with the building controller, including faculties removed during a prior active period. Unarchive runs the same save-time checks as Move (§9.1: a Campus Hub, required fields, an active Campus Hub, IP format, hostname and IP uniqueness), and a Relay picked in the Relay Association field is attached on save. Faculties remain **optional** (`FR-LS-09`): unarchiving with none selected restores the building controller as faculty-less. On confirmation, the building controller is restored only to the user-selected subset (other historical faculties remain in the historical record and reappear on a subsequent re-archive). While in unarchive mode the Close button's confirmation popover shall use unarchive-specific copy — header "Stop Unarchiving", body "All changes made to this building controller will be lost. Are you sure you want to stop unarchiving?" and a **Keep Unarchiving** button in place of "Keep Creating" — and revert to the default "Close Node Creation" copy when the drawer leaves unarchive mode.

**FR-DS-07:** **Archiving or moving a building controller scheduled for a Timetable Release shall be blocked.** The release is still queued, so the user must cancel it before the building controller can be archived. The attempt raises the error toast "This Building controller is scheduled for Timetable Release. Cancel the deploy before archiving." and the building controller stays active. **Moving** it to another campus is blocked the same way, surfaced up front instead: the Manage menu's **Move → To available Campus** item is disabled with the tooltip "Cancel the scheduled Timetable Release before moving." (`FR-P2-23`). The scheduled-release condition also blocks turning Registry Sync off (`FR-P2-04`).

### 6.5 Faculty ↔ Building Controller Association

**FR-PA-01:** Atrium shall retrieve faculty data from **Campus Master Data** via API.

**FR-PA-02:** Association is driven **from the Building Controller**: select a building controller → Manage Faculties → add or remove faculties.

> *Real app — not prototyped:* a second entry point "**From the Faculty:** select faculty → add building controllers" was originally specified. Faculties are not selectable nodes in this prototype's tree, so only the building-controller-side flow exists. The Relay-side "Add Building Controller" drawer is a different relationship (Relay ↔ building controller), not faculty ↔ building controller.

**FR-PA-03:** Available building controllers shall be **filtered by the Campus Hub** that serves the faculty's campus. *(Real app — part of the "From the Faculty" flow of `FR-PA-02`, not prototyped.)*

**FR-PA-04:** Each faculty in a selection list carries a **building controller icon indicator** when that faculty already has at least one building controller on the **selected Campus Hub**, and no icon when it does not. The indicator tooltip reads "Has building controllers on this Campus Hub". (This supersedes the earlier green/black colour-coding rule; see `FR-LS-07a` and `FR-LS-07b`, which define the same indicator.)

**FR-PA-05:** A faculty must be **added to a campus in Campus Master Data** before it can be associated in Atrium.

### 6.6 Proxy URL Management

**FR-PU-01:** Atrium replaces `proxies.legacy.test` for proxy URL management.

**FR-PU-02:** Proxy URL is a free-text field on all three node types. On **building controllers** (`FR-P2-14`) and **Relays** (`FR-P2-19`) it is **required**, **generated automatically and freely editable** (`FR-P2-25`); on **Campus Hubs** it is **optional**, **manually entered** and never derived. *(Prototype: the Campus Hub Proxy URL has no input — see §5.2.)*

### 6.7 Alert Service

**FR-PG-01:** Alert Service can be enabled/disabled per building controller.

**FR-PG-02:** Defaults to **OFF** on creation.

**FR-PG-03:** Alert Service is a per-building-controller setting only; it is independent of the Relay association (`FR-LS-05`) and carries no other Atrium-side configuration in this phase.

---

## 7. End-to-End Workflows

### 7.1 New Standalone Campus Onboarding
```
1. Create the campus in Campus Master Data (external)
2. Create the faculty in Campus Master Data and associate it to the campus (external)
3. Register a local Campus Hub (required before building controllers)
4. Register Building Controller (select campus, Campus Hub, Node Type;
   fill hostname/IP/description/location; optionally faculties and Alert Service)
5. Register a dedicated Timetable Relay (optional)
```

### 7.2 New Connected Campus Onboarding
```
1. Create the campus in Campus Master Data (external)
2. Create the faculty in Campus Master Data and associate it to the campus (external)
3. Register Building Controller (select campus, master Campus Hub hub.atrium.test — no local Campus Hub
   needed — and Node Type Connected Campus)
4. Register a Timetable Relay (optional; the building controller acts as its own Relay)
```

### 7.3 General Workflow
```
1. Campus Master Data → Create Campus
2. Campus Master Data → Create Faculty, associate to Campus
3. Atrium/Campus Hub   → (Standalone Campus only) Create local Campus Hub
4. Atrium        → Create Building Controller
                  - Select Campus (from Campus Master Data)
                  - Select Campus Hub (filtered by campus, + NORT)
                  - Select Node Type (Standalone Campus / Connected Campus / Test Lab)
                  - Enter Hostname, Description, IP, Location
                  - The Proxy URL fills in from Campus Hub + Hostname,
                    or type it (required — see FR-P2-14, FR-P2-25)
5. Atrium        → (Optional) Associate Faculty(s) to Building Controller
                  (enabled after Campus Hub selected)
6. Atrium        → (Optional) Create Timetable Relay and associate Building Controller(s)
                  - The Proxy URL fills in from Campus Hub + Relay Hostname,
                    or type it (required — see FR-P2-19, FR-P2-25)
7. Atrium        → Sync all changes back to Campus Hub
```

---

## 8. UI/UX Requirements

**UX-01:** Follow **existing Atrium navigation patterns** (right-side slide-out panels, etc.).

**UX-02:** Unified **All Nodes** view with flat tree hierarchy: Campus → [Building Controllers (flat list, primary focus)] + [Campus Hubs (collapsible section)] + [Timetable Relays (collapsible section)]. Building controllers are direct children of the campus node. Campus Hub and Relay are separate collapsible sections at the bottom of the tree, not parent nodes. A section appears only when it has at least one node to show (after the Show Archived Nodes filter); the Registry Sync filter does not affect these sections, and the Faculties filter affects them only through the one cross-campus NORT Campus Hub rule of `FR-P2-07`; Show Archived Nodes affects them directly. A **Show Archived Nodes** filter toggle shows/hides archived building controllers, Campus Hubs and Relays (`FR-DS-03`). The **header campus selector is multi-select**: the user picks one or more campuses and the tree renders one top-level Campus root per selected campus (each Campus root is itself collapsible — chevron toggle, same machinery as Campus Hub/Relay sections).

**UX-02a:** **Expand/collapse state survives every re-render.** Saving from the side panel, applying a bulk or campus cascade, running a Manage action, creating or unarchiving a node, and changing any filter all rebuild the tree — and each one leaves the branches the user had open still open, and the ones they had closed still closed. This applies to **Campus roots as well as the Campus Hub/Relay sections**: a campus root the user collapses stays collapsed. *Prototype limitation (a defect, not intended behaviour):* when **every** branch is collapsed, the prototype cannot tell that from a first render and re-expands the campus roots. Campus roots are expanded by default only on the **first** render of a selection. Branches that appear for the first time in a rebuild render collapsed.

**UX-03:** Campus Hub association displayed as a property on the building controller details panel (dropdown/read-only field). The Relay association is an editable **Relay Association** dropdown on the same panel (`FR-P2-24`), and the saved Relay is shown in a read-only **"Associated Timetable Relay"** section that mirrors **Associated Campus Hub**: Hostname (navigable), Proxy URL, IP Address, Node ID, Campus, Network Protocol, then Description and Location. It is hidden when the building controller has no Relay. A building controller appears in at most one Relay's list. The same navigate/open affordance also sits beside the editable **Proxy URL** field on the Building Controller and Relay details panels, where it opens the URL in a new tab (FR-P2-09). The long-term vision is to remove Campus Hub entirely (a university-wide delivery service will replace it), so Campus Hub should not be a structural element of the tree.

**UX-04:** The Campus Hub selection dropdown shows Campus Hubs from **the campus selected in the drawer's Campus field + NORT** (the campus hosting the master hub). NORT Campus Hubs display with a "(NORT)" suffix in the dropdown.

**UX-04a:** The **Create New Node drawer** behaves differently depending on the entry point. **Subheader entry** (the Create Node button in the page subheader): the drawer renders an in-drawer single-select **Campus** dropdown above the three form-toggle sections (Building Controller / Campus Hub / Relay). The dropdown lists exactly the campuses currently selected in the header multi-select, and a help line below the field tells the user the list reflects the header selection (and that updating the Campus filter in the header will add more campuses to the dropdown). When exactly one campus is selected in the header, the drawer hides the Campus field and titles itself `Create New Node for <Campus>`, the same as a Manage entry; with two or more, the drawer shows the dropdown on a placeholder (`Select a campus`) and the user MUST pick a campus before the rest of the form becomes interactive — while no campus is picked the three toggle sections are visually dimmed and click-blocked, and Save stays disabled. Picking a campus unlocks the toggle sections and refreshes every campus-dependent dropdown. **Manage entry** (the Create actions in the Manage menu of a Campus / Campus Hub / Relay node): the drawer hides the Campus field entirely and the drawer title becomes `Create New Node for <Campus>`, where `<Campus>` is the originating campus of the selected node. **Unarchive entry**: the Campus field is hidden and locked to the archived node's origin campus (which may be outside the header's current selection, so an archived node can always be restored to its origin); the drawer title reads `Unarchive <Building Controller | Campus Hub | Timetable Relay> for <Campus>`. **Move entry** (`FR-P2-23`): the Campus dropdown is **shown** and lists the campuses selected in the header **except the node's current campus**; it always starts on the placeholder, so the form stays dimmed and Save disabled until a target is picked. The help line reads "Choose where to move this node. The list shows the other campuses currently selected. Update the Campus filter in the header to add more." The drawer title reads `Move <Building Controller | Campus Hub> from <Campus>` and the primary button reads **Move**.

**UX-05:** When a non-NORT campus's building controllers reference NORT Campus Hubs, those NORT Campus Hubs appear in the campus's **Campus Hubs tree section** with a blue "NORT" badge to distinguish them from campus-local Campus Hubs. Navigation to NORT Campus Hubs is enabled from any campus (they are in the tree).

**UX-06:** The **Campus Hub** details panel includes a **Campus** field. When the Campus Hub is from a different campus (e.g., NORT on a non-NORT campus), a blue tag badge indicates the origin campus. The **Relay** details panel does **not** currently surface a Campus field — its read-only grid is Node ID and Network Protocol (IP Address and Campus Hub Association are editable — `FR-P2-22`, `FR-P2-16`). *(Open: add it for consistency, or accept that a Relay's campus is implied by its position in the tree.)*

**UX-07:** Associated Building Controllers lists on Campus Hub panels group building controllers **by campus with section headers** when they span multiple campuses. A building controller is **cross-campus** when its campus is not among the campuses selected in the header; navigate icons are disabled for cross-campus building controllers with a hover tooltip (`FR-P2-07`). Faculty-less building controllers are listed like any other. Hostnames not found in any campus data are filtered out.

**UX-07a:** The same Associated Building Controllers lists (Campus Hub **and** Relay panels) keep listing **archived** building controllers, but their navigate icon is **disabled with a hover tooltip** while **Show Archived Nodes** is off — the row has no tree node to navigate to. Each archived row also carries the **Archived** tag used on the tree row. The tooltip tells the user to turn the filter on to view the building controller. Turning the filter on re-enables the link. The cross-campus rule (`UX-07`) takes precedence when both apply.

**UX-08:** Faculty tags displayed inline with building controllers in the tree view (right-aligned, gray tags). There is no separate show/hide toggle for the tags. When the **Faculties** filter is narrowed, a row shows only the tags of the faculties in the filter and folds the others into the `+N` badge, whose hover popover always lists the full set. (The **Faculties** control in the subheader — `UX-13` — is a *filter* that narrows which building controllers appear, not a tag-visibility switch.)

**UX-09:** Non-editable fields (Node ID, campus) visually differentiated as read-only. _(IP Address is editable since `FR-P2-22`; the campus changes only through Move, `FR-P2-23`.)_

**UX-10:** The Relay form shows an **info notification** explaining that for Connected Campuses the Relay is the building controller itself. It is static — shown on every campus, not only Connected Campus ones (`FR-CDN-04`).

**UX-11:** **Export** button in the subheader downloads a CSV of the building controllers **currently shown in the tree** — every selected campus (header multi-select), after the Faculties, Registry Sync and Show Archived Nodes filters are applied. The download filename is the selected campus codes, **sorted alphabetically** and joined with a hyphen, followed by the fixed suffix `-building-controllers.csv` (e.g. `MEDS-NORT-building-controllers.csv`). Column headers are: Hostname, IP Address, Node ID, Campus, **Node Type**, Status, Description, Location, Faculties, Campus Hub Association, Relay Association, Alert Service, Energy Saver, Exam Lockdown. The Node Type column reflects each building controller's stored value.

> **What it's used for** (per Priya Raman, AV operations): housekeeping. It's used to produce an ad-hoc list of building controllers — e.g. the set being updated, or when the Help Desk asks for information — so the list can be taken offline and worked from outside Atrium. The same data is technically already obtainable from the monitoring dashboards; the export is a convenience, not the system of record. It is therefore a **nice-to-have**, not a critical-path requirement, and there is no re-import path.

**UX-12:** Campus details panel surfaces only the **Configuration** section (Registry Sync — see the Registry Sync cascade). Campus Info (campus name + campus type) was removed; Node Type is now a per-building-controller property edited on the Building Controller side panel. The Manage dropdown on the campus still provides Create Building Controller, Create Timetable Relay, Create Campus Hub shortcuts. The Manage dropdown on an active **Building Controller** or **Campus Hub** also carries a **Move** group with **To available Campus** (`FR-P2-23`).

**UX-13:** The subheader carries three scope controls on the left, in this order: **Campus multi-select**, vertical divider, **Faculties filter**, **Search bar** — followed by Export and Create Node on the right. The divider, Faculties filter, and Search bar are **hidden until at least one campus is selected**; selecting a campus reveals all three together (the same gate that reveals the Export and Create Node actions). When a campus is first picked the Faculties filter defaults to "all selected", so every building controller for that campus is shown automatically — narrowing is opt-in.

**UX-14:** The **search field** shall support searching nodes by **hostname, node ID, campus, and faculty**, matching a substring anywhere in any of those fields from the third character typed. The field's placeholder abbreviates the list as `Search by hostname, ID, faculty ...`; campus is matched even though it is not named in the placeholder. Only building controllers, Campus Hubs and Relays are results — Campus, Faculty and section rows are tree scaffolding and never appear. The results dropdown is laid out as follows:

- **Count line** — `N results found:` above the list (`1 result found:` in the singular), stating what the list holds.
- **One group per node type**, in the order Building Controllers → Campus Hubs → Timetable Relays, each opened by a **header row** carrying the type icon, the type name, and the **names of the right-hand columns** — `Faculties` and `ID` for building controllers, `ID` alone for Campus Hubs and Relays (neither carries faculty associations). The header is what tells the user the number on the right is the node's ID and not a count.
- **Result rows** — `<CAMPUS> › <hostname>` with the matched substring in **bold** (only inside the hostname; a row matched on ID, campus or faculty has nothing bold), an `Archived` tag when the node is archived, the building controller's faculty tags right-aligned under `Faculties` (capped at two, the remainder folded into a `+N` badge whose tooltip lists them all), and the node ID right-aligned under `ID`. The master Campus Hub is shared across campuses, so it renders with no campus prefix.
- **Selecting a result** expands every collapsed ancestor, scrolls the row into view, selects it, and clears the field. **Escape** or a click outside dismisses the dropdown without selecting.
- **No match** replaces the list with a single `No results found` line.

**The dropdown is NOT scoped by the tree filters — it searches the whole estate.** Every building controller (active, archived, faculty-less), Campus Hub and Relay is matchable regardless of the Campus multi-select, Faculties filter, Registry Sync filter or Show Archived Nodes checkbox. Searching for a hostname should not require first guessing which filter is hiding it. Search still requires **at least one campus to be selected** before the field is available (`UX-13`); from that point it reaches every campus, not only the selected ones.

**Picking a result that the current filters hide relaxes only what hides it.** On selection the system widens, only where needed: turns **Show Archived Nodes** on if the node is archived, resets the **Registry Sync** filter to All if it excludes the node, adds the result's **campus** to the Campus multi-select, and widens the **Faculties** filter if it excludes the node (for a faculty-less building controller, that means dropping the narrowing entirely). Filters are only ever **widened, never narrowed** — every other part of the user's filter setup is left as it was, and the reset-filters button is the way back. The tree then renders once, the result's collapsed ancestors expand, and the row is selected. A result that is already visible changes no filter at all.

**UX-15:** **Checklist drawers** — Manage Faculties (`UX-17`), Manage Building Controllers from a Relay (`FR-P2-17`), and Manage Building Controllers from a Campus Hub (`FR-P2-20`) — shall share one **toolbar** with: a search input filtered by the entity name (placeholder `Search Building Controllers`), a column header row with select-all checkbox (supports indeterminate state), and a count showing `N Building Controllers Selected`. Select-all applies only to visible, non-disabled items. When the search filter zeroes the visible list, the checklist is replaced with an empty state (tray icon, single line `No Building Controllers available`). The association drawers open directly on the checklist — no info box or section title above it. There are two exceptions: the Campus Hub **Manage → Building Controllers** drawer leads with an explanatory note because its rows re-home a building controller rather than toggling a membership (`FR-P2-20`), and the Relay **Manage → Building Controllers** drawer shows a note above the list while any building controller belongs to another Relay (`FR-P2-28`).

**UX-16:** **Alert Service** shall be displayed as a **switch** (ON/OFF) on both the building controller details panel and the Create New Node form, not as a dropdown select.

**UX-17:** **Manage Faculties drawer** shall be a unified interface for adding and removing faculty associations on a building controller. All campus faculties that the building controller's Campus Hub grants (`FR-P2-18`) are listed with checkboxes — currently associated faculties are pre-checked. Checking a new faculty displays a green "ADDING" status tag; unchecking an existing faculty displays a red "REMOVING" status tag. The drawer includes: search filter (placeholder `Search Faculties`), sortable column header ("Faculties" with sort toggle), select-all checkbox with indeterminate state, `N Faculties Selected` count, and Campus Hub-scoped building controller indicator. When the search filter zeroes the visible list, the checklist is replaced with an empty state (tray icon, single line `No Faculties available`). Footer buttons: "Close" (secondary) and "Save" (primary). Save applies all additions and removals in one action. **Removing all faculties:** if Save would leave a building controller that had faculties with zero, Save opens a confirmation popover titled **Remove All Faculties** — "This will remove all faculties from `<hostname>`. The building controller will stay active with no associated faculties." — with Cancel and **Remove All** (danger). Confirming removes every association and keeps the building controller **active and faculty-less** (`FR-LS-09a`); it does **not** archive it. Cancel keeps the drawer open with the current selections. _(Supersedes the earlier "removing all faculties archives the node" rule.)_

**UX-18:** **Nothing is selected when the page loads.** The tree renders with no node selected and the details panel shows the empty state "Select item(s) in the tree to load options". The same applies after a filter change that removes the selected node: the panel returns to the empty state rather than falling back to the first campus. Campus roots always render **alphabetically**, regardless of the order the user picked them in the header multi-select.

**UX-19:** **Other behaviour a tester should expect** (rules only; wording of placeholders, hints and titles lives in the prototype).

- **Panel sections.** The ASSOCIATED sections are hidden when they have nothing to show, and a section the user collapses stays collapsed when another node is selected. Building Controller panel: CONFIGURATION, BUILDING CONTROLLER INFO, ASSOCIATED CAMPUS HUB, ASSOCIATED TIMETABLE RELAY. Campus Hub panel: CAMPUS HUB INFO, ASSOCIATED BUILDING CONTROLLERS, ASSOCIATED TIMETABLE RELAYS. Relay panel: TIMETABLE RELAY INFO, ASSOCIATED BUILDING CONTROLLERS, ASSOCIATED CAMPUS HUB. Every section header collapses and expands its section (open by default). Panel titles read "Building Controller Details", "Campus Hub Details", "Timetable Relay Details".
- **Campus Hub panel, ASSOCIATED TIMETABLE RELAYS.** Lists the Relays on the Campus Hub, sorted by hostname, each navigable; archived Relays are included (no Archived tag) and navigating to one that is not in the tree raises "Node not visible in current view". The section is hidden when there are none.
- **Associated Campus Hub mirror** (Building Controller and Relay panels) also shows Description, Location and Bridge Service (ON / OFF), and its Proxy URL is a link that opens in a new tab. Its Campus value becomes a blue tag when the Campus Hub's campus differs from the node's own; on the Campus Hub panel the tag shows when its campus is not among the campuses selected in the header.
- **Campus Hub Association values.** Saving a building controller's panel or moving it stores `<hostname> (Standalone Campus)` or `<hostname> (Connected Campus/Test Lab)`: Connected Campus and Test Lab both store `(Connected Campus/Test Lab)`, and a missing type stores Standalone Campus. Create and Unarchive store the dropdown's text instead (the bare hostname, or `<hostname> (NORT)`), and a Campus Hub created in the same form stores the suffix of the campus's seed type, so the stored text is not uniform. A Relay always stores the bare Campus Hub hostname. Dropdown options read `<hostname>`, `<hostname> (NORT)` for a NORT Campus Hub on another campus, and a disabled `<hostname> (unavailable)` when the current Campus Hub is out of scope.
- **Archived building controllers** stay editable and savable except Relay Association and Registry Sync (always locked) and Hostname (locked only when the building controller has faculty history, `FR-P2-13`). Changing an archived node's Campus Hub never removes faculties from its history.
- **Panel Save order.** Validation, then the Asset Registry refusal (`FR-P2-30`), then the Change Campus Hub / Change Hostname confirmation, then the commit.
- **Create drawer by entry point.** Subheader or Campus → Create Building Controller: Building Controller section on. Campus → Create Timetable Relay: only the Relay section on. Campus → Create Campus Hub: only the Campus Hub section on. From a Campus Hub node, Create Building Controller / Timetable Relay: the Campus Hub toggle is off and locked (hover tooltip "Pre-filled from the selected Campus Hub node") and both Campus Hub dropdowns are pre-filled and disabled. From a Relay node, Create Building Controller: the Campus Hub and Relay toggles are off and locked (hover tooltip "Pre-filled from the selected Relay node") and the Relay dropdown is pre-filled and disabled.
- **Relay section of the Create drawer.** While the Building Controller section is on, the building controller being created appears in Building Controller Association as `<hostname> (new)`, pre-checked the first time it appears; unchecking it sticks. Building controllers the user checks stay checked when the building controller hostname, faculties or Campus Hub change (rows that no longer apply drop out). When a new Campus Hub is created in the same form the `(new)` row is the only entry, and only once its hostname has been typed.
- **Closing a drawer.** The footer Close button asks for confirmation only when the form differs from how it opened: any field, select, checkbox, section toggle, faculty or Relay building-controller pick counts, and a form that was just opened (Create, Unarchive or Move) is not edited. The header X and a click on the backdrop close the Create drawer and the Manage drawers without confirmation, discarding their selections; Escape does the same, except that while the confirmation popover is open it closes only the popover (the Manage drawers do the same for the Remove All Faculties confirmation).
- **After a save.** Creating a building controller selects it in the tree (nothing happens if the current filters hide it); a Campus Hub-only or Relay-only create selects nothing. Unarchive and Move select the node. Manage Faculties, Manage Building Controllers and Archive re-select the node too, only if it is still in the rendered tree; a Manage drawer saved with nothing changed shows "No changes to save" and stays open. Saving a Campus keeps the Campus selected.
- **Tree.** A building controller row shows a Registry Sync indicator (shield; tooltip "Registry Sync: Enabled" or "Disabled"; green when enabled, gray when disabled). A campus whose building controllers are all filtered out shows "No Building Controllers Match Filters", and a campus with no building controllers at all (active, archived or faculty-less) shows "No Data", even if it has Campus Hub or Relays. With no campus selected the page shows "No campus selected". Selecting the Campus Hubs or Timetable Relays section header only expands or collapses it.
- **Filters.** When the Campus selection changes, the Faculties filter keeps its picks, adds newly available faculties and drops out-of-scope ones. Every filter change, and Reset, clears a bulk selection while keeping a single selected node that is still visible (it is re-selected without re-opening branches the user collapsed). Changing the Campus selection itself clears the selection, bulk included.
- **Search.** Results appear after a 300 ms pause; the query is not trimmed; the match runs on hostname, ID, campus and faculties together, so a query with a space can match across fields. Escape closes the dropdown and keeps the typed text; picking a result clears it. Rows within a group are in data order: active building controllers, then faculty-less ones (an archived faculty-less building controller keeps its Archived tag and picking it turns Show Archived on), then archived ones with faculties.
- **Toasts and modals.** Success, error and warning toasts disappear after 4 seconds; toasts with a **Details** link stay until closed or used. The two Details modals have sortable columns (a click toggles ascending / descending), a **Copy list** button that briefly reads "Copied" or "Copy failed", and close on Escape or a click outside.
- **Hostname and address rules.** A hostname is valid when it equals the suffix or ends with `.` + the suffix, case-insensitively (`meds-hub.campus.test` is not valid). An IPv4 address is four dot-separated groups of one to three digits, each at most 255 (leading zeros are accepted). The Proxy URL short-name parser ignores letters between `bc` / `rly` and the digits, accepts `-` or `_`, and is case-insensitive.
- **Export values.** Status is Active or Archived; Faculties are sorted and joined with `; `; Relay names are joined with `, `; Alert Service is `on` or `off`; Energy Saver and Exam Lockdown are `Yes` or `No`; Campus Hub Association is the stored text. Export does nothing when no campus is selected and shows no toast.
- **Manage menus.** Campus: Create → Building Controller / Timetable Relay / Campus Hub. Active Building Controller: Manage → Faculties, Move → To available Campus, Archive → Building Controller. Campus Hub: Create → Building Controller / Timetable Relay, Manage → Building Controllers, Move, Archive. Relay: Create → Building Controller, Manage → Building Controllers, Archive. Archived nodes: Unarchive only. Disabled items stay listed with their reason as a tooltip. The Manage button is hidden for other nodes and in bulk mode.
- **Checklist drawers.** The `N … Selected` count covers only the rows the search leaves visible. The sort toggle exists only on Manage Faculties.
- **Faculties filter.** It counts as narrowed only when fewer faculties are picked than the selected campuses offer (the union of their active and archived faculties). An active building controller matches on its current faculties, an archived one on its full faculty history, and once the filter is narrowed faculty-less building controllers are hidden; with no faculty picked only the "No Building Controllers Match Filters" row remains. A building controller that is archived for one faculty but active for another is shown once, as active. The filter keeps its narrowing if every campus is cleared and one is picked again.
- **Tree order.** Active and faculty-less building controllers are listed together in ascending Node ID order (not by hostname and not by faculty), followed by the archived ones. The Campus dropdown offers the campuses that have building-controller data and a select-all.
- **Search field.** With no campus selected it is disabled and emptied.
- **Bulk selection.** The panel of a selection that drops to a single node is the ordinary details panel. A Cmd/Ctrl/Shift click on a Campus Hub, Relay or archived row does nothing; on a Campus Hubs / Timetable Relays section header it expands or collapses the section until a bulk selection exists, after which the header is disabled and the click is ignored. Changing the Campus selection also clears a bulk selection.
- **Manage Faculties** is never disabled: for a building controller with no Campus Hub, or whose Campus Hub grants none of the campus's faculties, it opens onto the "No Faculties available" empty state when the building controller also has no faculty of its own (faculties it already holds stay listed). Its sort toggle starts ascending and the first click sorts descending.
- **Panel navigation.** Selecting another node, following an Associated link or navigating by search replaces the panel without asking, discarding unsaved edits; following a link also expands collapsed ancestors in the tree and scrolls the target into view. The Associated Building Controllers lists are ordered by campus code, then hostname.
- **Uniqueness checks.** Hostnames compare case-insensitively on the panels and on the Create form; IP addresses compare exactly. Hostname and IP are trimmed on save, and a whitespace-only value counts as empty.
- **Toasts** share one fixed spot at the top centre and stack in the order shown (the Asset Registry refusal toast first and then the success toast, or "updated" followed by the Proxy URL warning), restacking when one closes.
- **Demo data.** `lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3` and `lab-bc02-1` (all `.atrium.test`, NORT, faculty-less, Registry Sync on) are refused by Asset Registry; `lab-bc02-2` and `lab-bc02-3` are accepted, so a bulk or Campus change can show both outcomes.

---

## 9. Constraints & Business Rules

| Rule | Description |
|---|---|
| **No hard deletes** | Nodes are never permanently deleted; moved to Archived state |
| **IP uniqueness** | Node IP addresses must be unique across all nodes |
| **ID uniqueness** | Node IDs must be unique across all nodes (guaranteed by generation — IDs are never user-entered) |
| **Immutable fields** | Node ID cannot be changed after creation. The campus changes only through **Move** (`FR-P2-23`); IP address is editable (`FR-P2-22`) |
| **Standalone Campus requires a local hub** | A local Campus Hub must exist before a building controller can be created for a Standalone Campus *(real app — not enforced in this prototype; see `FR-GH-02`)* |
| **Protocol lock** | Campus Hub: `aria2c`; Building Controller/Relay: `rsync` — not configurable |
| **HTTPS on generated URLs** | Generated Proxy URLs always use `https://` and always end in `/campus/`, on building controllers (`FR-P2-14`) and Relays (`FR-P2-19`) alike. Manually entered Proxy URLs are **not** format-validated (`FR-P2-09`), so the scheme is not enforced on them |
| **Alert default off** | Alert Service is Off by default on all new building controllers and can be enabled with or without a Relay |
| **Campus source** | Campuses always sourced from Campus Master Data |
| **Faculty source** | Faculties always sourced from Campus Master Data |
| **Relay Campus Hub editable** | A Relay's Campus Hub is chosen first on creation and stays editable on the Relay side panel; a change detaches the building controllers left on the old Campus Hub (`FR-P2-16`) |
| **Campus Hub shared across sections** | In the unified create form, whichever of the Building Controller and Relay sections gets a Campus Hub first passes it to the other (auto-filled, disabled) |
| **One Relay per building controller** | A Relay serves many building controllers; a building controller has **at most one** Relay (`FR-P2-24`). No write path can put a building controller on two Relays |
| **Campus Hub cross-campus** | Any campus can select from NORT Campus Hubs + its own campus's Campus Hubs |
| **Campus Hub gates faculties** | Faculty selection is disabled until a Campus Hub is selected; building controller icon indicator is scoped to the selected Campus Hub |
| **Campus Hub required on creation** | The Campus Hub association is mandatory on the Create New Node form; after creation it can be set to `Not assigned` from the panel or by unchecking the building controller in the Campus Hub **Manage → Building Controllers** drawer (`FR-P2-16`, `FR-P2-20`) |
| **Campus Hub cross-campus tree** | NORT Campus Hubs referenced by a campus's building controllers appear in that campus's Campus Hub tree section with an "NORT" badge |
| **NORT Campus Hub navigable** | NORT Campus Hubs are navigable from any campus (they appear in the tree); other cross-campus Campus Hubs remain disabled |
| **Associated building controller grouping** | When associated building controllers span multiple campuses, they are grouped by campus with section headers; cross-campus building controllers have disabled navigate icons |
| **Default faculties** | GENERAL, TEMPLATE, NONE — whichever exist on the campus — pre-selected on building controller creation once a Campus Hub is selected, and again whenever the Campus Hub or campus changes (not on Move; on Unarchive only when the Campus Hub changes) |
| **No bulk add** | Faculties are added to one building controller at a time (no multi-node bulk assignment) |
| **Node Type per building controller** | Node Type (Standalone Campus / Connected Campus / Test Lab) is a per-building-controller property — required on the Create form (empty by default), editable on the Building Controller side panel as the **first** editable field, above Hostname (same order as the Create form). Each campus's Node Type seed backfills building controllers that predate the field. |
| **Removed faculties hidden** | Removed faculty associations sync to Campus Hub but are not visible in Atrium UI |
| **Filter persistence** | Tree filter changes preserve current selection; only resets if selected node was archived and archived filter was disabled |
| **Unarchive faculties optional** | Unarchiving a building controller does **not** require selecting a faculty; with none selected it is restored as faculty-less. All other fields are editable before confirming |
| **Archived Configuration off** | Archiving a building controller **turns Registry Sync off**; while archived the Configuration toggle reads **off and disabled**, and the tree-row indicator reads Disabled. Unarchiving restores it off with the toggle enabled again. Archived building controllers are **not bulk-selectable** and are excluded from a Campus selection and its cascade (`FR-P2-10`). |
| **Timetable Release blocks archive, move and Registry Sync off** | A building controller scheduled for a Timetable Release cannot be archived, moved to another campus, or have Registry Sync turned off until the release is cancelled (`FR-DS-07`, `FR-P2-23`, `FR-P2-04`) |
| **Hostname locked by faculties** | A building controller's Hostname is **not editable while any faculty is associated** with it, since faculties reference it by name (`FR-P2-13`). A faculty-less building controller stays renameable; an archived one is locked and told to unarchive. A locked field never blocks Save and never shows an error, so a legacy hostname cannot strand the button. |
| **Unsaved edit blocks scope actions** | While the side panel is dirty, **Manage** and **Create Node** are disabled — both rebuild the tree and would silently discard the pending edit (`§9.4`). |
| **Search ignores the filters** | The global search matches every node in the estate, not just the visible tree. Picking a hidden result **widens** only the filters that hide it and never narrows the others (`UX-14`). |
| **Tree keeps its shape** | Every rebuild — save, cascade, Manage action, create, unarchive, filter change — preserves which branches are expanded, campus roots included (`UX-02a`). |

---

## 9.1 Form Validation — Create New Node and Details Panels

### Required Fields (on blur)
The required error appears when the user has **focused the field and left it empty** — so a field the user never touched shows no error, but tabbing in and straight out of an empty field does. Inline error below the field with red border. **A field shows one message at a time**: an error hides any warning and the help text, and a warning (for example the Campus Hub rename warning of `FR-P2-25`) hides the Hostname format hint.

Inline copy comes from the shared `ProjFieldError` plugin and carries **no trailing period**. The same messages apply on the Create New Node form (including its Unarchive and Move modes) and on the details panels:

| Field | Error Message |
|---|---|
| Node Type (Building Controller) | "Select Node Type" — details panel only; on the Create / Unarchive / Move form the button simply stays disabled until a type is picked |
| Hostname (Building Controller, Campus Hub, Relay) | "Enter Hostname" |
| IP Address (Building Controller, Campus Hub, Relay) | "Enter IP Address" |
| Proxy URL (Building Controller, Relay) | "Enter Proxy URL" |
| Description (Building Controller, Campus Hub, Relay) | "Enter Description" |
| Location (Building Controller, Campus Hub, Relay) | "Enter Location" |

### Save-time Required Validation
On the Create New Node form, the **Save** button stays disabled until every required field for each enabled section is non-empty and every enabled Hostname ends in `atrium.test` (Hostname, IP, Description, Location, plus Proxy URL on the Building Controller and Relay sections, Node Type and a Campus Hub selection on the Building Controller section, and the drawer's Campus field). Faculties are **not** part of this gate — they are optional (`FR-LS-09`). On the details panels Save stays **disabled** while any required field is empty or any changed value is invalid (§9.4); as a backstop, a Save that reaches an invalid value shows the inline error, focuses the field and raises an error toast ("`<Field>` is required.", "Enter a valid IP Address.", "Hostname must end with atrium.test.", or the duplicate toast).

### IP Format Validation (on blur)
If the IP field contains a non-empty value that is not a valid IPv4 address (four octets, each 0–255):
- Inline error: "Enter a valid IP Address"

### Hostname Domain (on blur and on Save)
A Hostname that does not end in `atrium.test` (`FR-P2-21`) shows the inline error "Hostname must end with atrium.test" on blur and keeps the Create / Save button disabled; a details-panel Save that reaches it raises the error toast "Hostname must end with atrium.test.". Applies to Building Controller, Campus Hub and Relay hostnames. A stored hostname that already breaks the rule shows the error as soon as its panel, Unarchive or Move form opens (unless the field is locked — `FR-P2-13`).

### Duplicate Checks (on save)
When the user clicks Create, the system checks all entered hostnames and IPs against **all existing nodes** (active, archived, Campus Hub, Relay). If a duplicate is found:

| Check | Inline Error | Toast (Error) |
|---|---|---|
| Duplicate Hostname | "Hostname already in use" | "Hostname already in use. Please, try again with a different Hostname." |
| Duplicate IP | "IP Address already in use" | "IP Address already in use. Please, try again with a different IP Address." |

Save is blocked until duplicates are resolved. Multiple errors can be shown simultaneously. The same hostname or IP typed in two sections of the same Create form is a duplicate too.

The **Duplicate Hostname** and **Duplicate IP** checks also run on the details panels (Building Controller, Campus Hub, Relay) — on blur, while typing and on Save — with the same inline + toast copy. Their scope also includes faculty-less building controllers. The node being edited never clashes with itself — its own copies (one per faculty, plus the copies nested under Relay nodes) are excluded from the check.

### Creation Error Toasts (real app — not prototyped)
When the backend fails to create one or more nodes, the following error toasts are shown:

| Scenario | Toast Message |
|---|---|
| All nodes fail (multiple types) | "Atrium was unable to create Nodes. Please try again" |
| Only Building Controller fails | "Atrium was unable to create Building Controller. Please, try again" |
| Only Campus Hub fails | "Atrium was unable to create Campus Hub. Please, try again" |
| Only Timetable Relay fails | "Atrium was unable to create Timetable Relay. Please, try again" |
| Partial success (1 fail, e.g., Building Controller) | "Atrium was unable to create Building Controller. Other Nodes were created" |
| Partial success (2 fails, e.g., Relay + Building Controller) | "Atrium was unable to create Timetable Relay and Building Controller. Campus Hub was created" |

---

## 9.2 Toast Messages

Success and error toasts have no label prefix; **warning** toasts are prefixed with a bold **Warning:**. Two warning toasts are **plain** (regular weight, no label, no icon, a larger close icon, kept on screen until closed or used) because they carry a **Details** link: the Proxy URL manual-update toast (`FR-P2-25`) and the bulk / Campus Asset Registry refusal toast (`FR-P2-30`). Messages are concise and action-specific.

### Success Toasts

| Action | Toast Message |
|---|---|
| Create Building Controller only | "Building Controller Created" |
| Create Campus Hub only | "Campus Hub Created" |
| Create Timetable Relay only | "Timetable Relay Created" |
| Create Building Controller + Campus Hub | "Building Controller and Campus Hub Created" |
| Create Building Controller + Relay | "Building Controller and Timetable Relay Created" |
| Create Campus Hub + Relay | "Campus Hub and Timetable Relay Created" |
| Create all three | "Building Controller, Campus Hub and Timetable Relay Created" |
| Manage Faculties (add/remove) | "Faculties Updated for Building Controller" |
| Manage Faculties — remove every faculty (confirmed) | "All Faculties Removed from Building Controller" |
| Manage Building Controllers, from the Relay (`FR-P2-17`) | "Building Controllers Updated for Timetable Relay" |
| Manage Building Controllers, from the Campus Hub (`FR-P2-20`) | "Building Controllers Updated for Campus Hub" |
| Archive Building Controller | "Building Controller Archived" |
| Unarchive Building Controller | "Building Controller Unarchived" |
| Move Building Controller (`FR-P2-23`) | "Building Controller moved to `<Campus>`" |
| Move Campus Hub (`FR-P2-23`) | "Campus Hub moved to `<Campus>`" |
| Archive Campus Hub (`FR-P2-15`) | "Campus Hub Archived" |
| Unarchive Campus Hub (`FR-P2-15`) | "Campus Hub Unarchived" |
| Archive Timetable Relay (`FR-P2-15`) | "Timetable Relay Archived" |
| Unarchive Timetable Relay (`FR-P2-15`) | "Timetable Relay Unarchived" |
| Bulk Configuration Save (2+ nodes) | "Registry Sync applied to N Building Controllers" (singular "Building Controller" when N = 1; N = building controllers written) |
| Side panel Save — Building Controller | "Building Controller updated." |
| Side panel Save — Campus Hub | "Campus Hub updated." |
| Side panel Save — Timetable Relay | "Timetable Relay updated." |
| Side panel Save — Campus, Registry Sync cascade (`FR-P2-05`) | "Registry Sync applied to N Building Controllers" (N = building controllers written; no toast when every node was refused) |

Discard Changes shows **no toast** — the panel simply reverts.

The create toasts name the types written, in the order Building Controller, Campus Hub, Relay.


### Blocking & Guidance Toasts

| Situation | Toast Message | Type |
|---|---|---|
| Archiving a building controller scheduled for a Timetable Release (`FR-DS-07`) | "This Building controller is scheduled for Timetable Release. Cancel the deploy before archiving." | error |
| Archiving a Relay that still has building controllers (`FR-P2-15`) — the menu item is disabled, so this only fires against a stale menu | "Remove the associated Building Controller before archiving." / "Remove all `<N>` associated Building Controllers before archiving." | error |
| Archiving a Campus Hub that still has active building controllers or Relays (`FR-P2-15`) — same | "Remove all associated Building Controllers and Timetable Relays before archiving." | error |
| Archiving the master Campus Hub (`FR-P2-27`) — same | "hub.atrium.test is the master Campus Hub and can't be archived." | error |
| Archiving a building controller that has a Relay (`FR-P2-27`) — same | "Remove the Timetable Relay association (`<relay>`) before archiving." | error |
| Create New Node with no section enabled | "Enable at least one node section" | warning |
| Create / Unarchive / Move of a Building Controller with no Campus Hub chosen | "Select a Campus Hub node" | warning |
| Create pressed with the Building Controller section on and no Campus resolved (defensive — the Save gate already requires a Campus) | "Select a campus in the navigation first" | warning |
| A Manage drawer (Faculties / Building Controllers) saved with nothing changed | "No changes to save" | success (neutral, no prefix) |
| Navigating to a node outside the current filters | "Node not visible in current view" | warning |
| Duplicate hostname on save | "Hostname already in use. Please, try again with a different Hostname." | error |
| Duplicate IP on save | "IP Address already in use. Please, try again with a different IP Address." | error |
| Required field empty on panel Save (backstop) | "`<Field>` is required." | error |
| Invalid IP on panel Save (backstop) | "Enter a valid IP Address." | error |
| Hostname not on `atrium.test` on panel Save (backstop) | "Hostname must end with atrium.test." | error |
| Proxy URL flagged outdated on panel Save (backstop, `FR-P2-25`) | The field's outdated message | error |
| Turning Registry Sync off on a Building Controller scheduled for a Timetable Release, panel (`FR-P2-04`; *not yet rebuilt in the prototype*) | "Cannot save: building controller is scheduled for Timetable Release." | error |
| Turning Registry Sync off on Building Controllers scheduled for a Timetable Release, bulk / Campus (`FR-P2-04`; *not yet rebuilt in the prototype*) | "Cannot apply: N building controller(s) scheduled for Timetable Release." | error |
| Asset Registry refuses an archive, a Registry Sync disable or a hostname change on one Building Controller (`FR-P2-30`) | Two lines: bold "Unable to `<action>`, Registry Sync change was not successful." then the node's message | error |
| Asset Registry refuses a bulk / Campus change for some Building Controllers (`FR-P2-30`) | "Unable to update N Building Controllers Registry Sync status" + **Details** | warning (plain) |
| A Campus Hub rename leaves Proxy URLs to update by hand (`FR-P2-25`) | "`<counts>` need(s) its Proxy URL updated manually." + **Details** | warning (plain) |

---

## 9.3 Multi-Select Fields

The multi-select dropdowns display selected items with a dismiss (×) button — **Faculties** as blue pills (`ProjMultiSelect`), **Building Controller Association** as gray tags. Behavior:
- Each selected item renders as a pill/tag with × to deselect
- Tags are displayed on a single line; items that overflow are hidden
- A `+N` badge appears at the end indicating the count of hidden items
- Clicking × on a tag deselects the item and unchecks it in the dropdown

---

## 9.4 Side Panel — Save / Discard Dirty-State

The Node details side panel (Building Controller, Campus Hub, Relay, Campus) provides **Save** and **Discard Changes** controls in the panel footer. Both buttons follow a dirty-state model:

- On selection of any node, an **editable snapshot** is captured for the active panel type and the buttons are **disabled**.
- The buttons **enable as soon as any editable field differs from the snapshot** — text inputs (Hostname, IP Address, Proxy URL, Description, Location), switches (Bridge Service, Alert Service, Registry Sync, the Campus Registry Sync toggle), checkboxes (Energy Saver, Exam Lockdown), or the selects (Node Type, Campus Hub Association, Relay Association). A **disabled** field (a locked Hostname — `FR-P2-13`) cannot be changed and therefore never contributes.
- If the user reverts every field back to its snapshot value, both buttons return to the disabled state automatically.
- **Save** commits the current values, refreshes the tree, re-selects the node, captures a new snapshot, and disables the buttons again. The refresh **preserves the tree's expand/collapse state** (`UX-02a`).
- **Discard Changes** opens a popover confirm; on confirmation the panel restores from the snapshot and the buttons disable again. While disabled, the Discard button cannot open the confirm popover (native `<button disabled>` blocks the click).

**Validation resolves on blur, and Save is gated on validity.**

- Every required or format rule is evaluated **as the user leaves the field**: an empty required field, a hostname (any node type) that does not end in `atrium.test` (`FR-P2-21`), an IP Address that is not a valid IPv4 address, or a hostname or IP Address already in use all show their inline message on **blur**.
- **Save is disabled for as long as any required field is empty, or any value the user has changed is invalid**, whether or not they have left that field. An empty required field (e.g. a Proxy URL that was never filled) **shows its required error as soon as the panel opens**, so a Save that is unavailable from the start always says why. A **format** problem on a value the user has **not** changed — a stored hostname off `atrium.test` (for example a legacy `campus.test` or `.local` host) — does **not** block Save; otherwise every unrelated edit on the node (an IP Address, a Description) would be impossible to save. That hostname still shows its domain error on open (§9.1), unless the field is locked.
- **Discard Changes is gated only on there being an unsaved change** — validity does not affect it. A dirty but invalid panel keeps **Save disabled and Discard enabled**, so the user can always back out of an edit they cannot complete. (Only the clean, unchanged state disables both.)
- While the user is typing, a **required** error never appears — it waits for blur, since an emptied field is normal mid-edit — but **domain, IP-format and duplicate** messages update live, appearing and clearing as the value changes, so a message never disappears while Save is still blocked. A message already shown stays until blur if the field is emptied.
- Save itself re-checks the same rules as a backstop and, on a violation, **focuses the offending field** and raises the error toast — the field order in `FR-P2-13` / `FR-GH-04` decides which one is focused first.
- **A locked field is exempt from all of the above** (`FR-P2-13`): it neither blocks Save nor shows an error.
- Turning Registry Sync off can be blocked by a Timetable Release (`FR-P2-04`, not yet rebuilt in the prototype) or refused by Asset Registry (`FR-P2-30`). Nothing else blocks a Save of the Configuration toggle.

**The scope-wide actions stand down during an unsaved edit.** While the panel is dirty, the **Manage** dropdown and the subheader's **Create Node** button are **disabled**, re-enabling on Save or Discard, or whenever the panel is cleared (bulk save, Clear Selection, a filter change that drops the node). Both start flows that rebuild the tree and re-select a node, which would silently discard the pending edit. No tooltip explains it: the active Save / Discard footer is the explanation.

- **A Campus Hub Association change that would strand associations interposes one confirmation** before committing (`FR-P2-16`). Cancelling leaves the panel dirty and nothing written.
- **A Campus Hub change re-derives the Proxy URL** (`FR-P2-25`): the new URL is written into the field with the "Proxy URL updated because the Campus Hub changed." warning, or flagged as outdated when it can't be derived. On the Building Controller panel a Campus Hub change re-scopes the **Relay Association** list (keeping the pick only if it is on the new Campus Hub, `FR-P2-24`); Alert Service is unaffected (`FR-LS-05`).
- **Bulk Configuration uses the same footer.** The multi-select Bulk Configuration panel (2+ nodes) reuses this Save / Discard Changes footer instead of a separate "Apply" button; its dirty-state compares the bulk Registry Sync toggle against the captured saved state of the effective building controllers, Save runs the bulk cascade, and Discard reverts the toggle.
- **A single-campus selection is also a cascade** and writes through the same footer (`FR-P2-05`).

---

## 10. Open Items & Action Items

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | **What does a campus move mean outside Atrium?** `FR-P2-23` moves a Building Controller or Campus Hub between campuses in Atrium's data only. Confirm how the move reaches Campus Hub through sync-back, and whether Asset Registry needs the old registration deleted and a new one created, as with a rename (`FR-P2-13`). | Campus Hub Team | Open |

---

## Configuration & Bulk Edit Mode (May 2026)

### FR-P2-01: Configuration Section

A new "CONFIGURATION" collapsible section at the top of the Building Controller details panel with one toggle:

| Field | Type | Default | Help Text |
|-------|------|---------|-----------|
| Registry Sync | Switch (On/Off) | On for newly created building controllers (`FR-P2-11`); Off when unarchived (`FR-P2-10`) | Grant Building Controllers access to communicate with Asset Registry. |

- The toggle follows the same pattern as Alert Service (switch + help text below)
- Value persists via Save/Discard (same workflow as existing editable fields)
- Section appears as FIRST section for building controllers (before BUILDING CONTROLLER INFO)
- A building controller whose value has never been set reads as **enabled** (absence is treated as on), which is why a record imported without the value shows enabled, like a newly created one
- **Archived building controllers**: archiving **turns Registry Sync off** and it stays off (see FR-P2-10). The Configuration section stays visible on the details panel but its toggle reads **off and disabled**; the tree-row Asset Registry indicator reads Disabled. Archived building controllers are not bulk-selectable and are not part of a campus's cascade.

### FR-P2-02: Bulk Selection Mode

Always-on multi-select via keyboard shortcuts:
- **Cmd+Click** (Mac) / **Ctrl+Click** (Windows): Toggle individual building controllers or campuses in/out of selection
- **Shift+Click**: Select the range of visible, bulk-selectable nodes (Campuses included; collapsed branches are skipped) between the last-clicked node, or the current selection, and the clicked one. While Shift is held, hovering previews the range
- The first Cmd/Ctrl/Shift+Click adds the node that is already selected, when it is a Campus or an active building controller, to the set
- **Building controllers and Campuses** are bulk-selectable. Picking a Campus contributes every building controller visible beneath it. Campus Hub, Relay and section-header nodes appear disabled with tooltip: "Only campuses and building controllers can be selected in bulk mode"
- **Faculty-less building controllers are bulk-selectable** whenever they are visible in the tree. **Archived building controllers are not**: Cmd/Shift+Click skips them and, once a bulk selection exists, they are disabled with the tooltip "Archived building controllers cannot be selected in bulk mode" (`FR-P2-10`)
- **Single click** (no modifier): Exits bulk mode and selects that single node normally. This holds on disabled rows too (a Campus Hub, Relay or archived building controller): the click ends the bulk selection and selects that row
- **Escape** clears the bulk selection (when 2 or more nodes are picked)
- When Cmd/Ctrl+Click leaves exactly **one** node picked, that node becomes the ordinary single selection and bulk state ends. A Shift range whose anchor is not a visible, bulk-selectable node (a Campus Hub, Relay, archived node or a row in a collapsed branch) is just the clicked node
- The disabled styling and tooltips appear once two or more nodes are picked (a single picked node is just the ordinary selection). Picking a Campus, or selecting one, also highlights its visible building controllers (visual only). A Shift+Click with no anchor and nothing selected simply picks the clicked node

**Bulk Selection Info Bar** (top of tree, below header):
- Notification-style bar with keyboard shortcut hints, noting the affordance is available for Building Controllers and Campuses
- "Clear Selection" button appears when more than one node is picked, and also when a single Campus is selected
- Clear Selection returns the panel to its **empty state** with nothing selected (matching `UX-18`), not to the campus node

**Bulk Configuration Panel** (replaces normal details panel):
- Shown when 2+ nodes (Campuses or building controllers) are picked, even if they contribute no visible building controller (the title then reads "Bulk Configuration (0 Building Controllers)")
- Panel title: "Bulk Configuration (N Building Controllers)" — N is the *effective* building-controller count (union of directly-picked building controllers and every **visible** building controller under any picked campus, de-duplicated)
- Contains the same Configuration toggle (Registry Sync)
- Mixed state: When selected building controllers disagree on a value, switch shows unchecked with "Mixed" label
- **Archived building controllers can't be selected** (`FR-P2-10`): Cmd/Shift+Click skips them, and once a bulk selection exists their tree rows are disabled with the tooltip "Archived building controllers cannot be selected in bulk mode"
- Uses the **standard Save / Discard Changes footer** shared with the single-node side panel (no dedicated "Apply" button). **Save** commits the toggle to every effective building controller; **Discard Changes** reverts the toggle to the current saved state. Both follow the same dirty-state model (disabled until the toggle differs from the captured state).
- Success toast: "Registry Sync applied to N Building Controllers" (N counts the building controllers written). After a save that wrote at least one building controller the tree re-renders and the selection clears to the empty state. A Save with the switch left unchanged (or still Mixed) does nothing and shows no toast. A pending switch value is kept while picks are added or removed (it resets if the selection drops to one node and back). With 0 effective building controllers Save and Discard stay disabled
- The panel notice (`FR-P2-05` copy) shows only when at least one Campus is picked and always uses the "a campus / that campus" wording; it has no "Unavailable" variant
- Manage dropdown hidden during bulk mode

> **A single-campus selection is a bulk configuration too.** Selecting a single Campus in the tree opens the same configuration panel and header — the panel title reads **"Bulk Configuration (N Building Controllers)"** (N = the campus's visible building controllers), not "Campus Details". The header and Save/Discard footer are identical to the multi-select bulk case; see FR-P2-05 for the campus-level Asset Registry cascade.

### FR-P2-03: Tree Filters for Configuration Properties

Configuration filters live **inline in the tree section header** (titled "Filters"), no longer behind a "Filters" popover button. Left to right the header carries: a **Registry Sync** dropdown, a **Show Archived Nodes** checkbox, and a reset-filters icon button (enabled only when a filter differs from its default — Registry Sync not All, Show Archived Nodes checked, or the subheader **Faculties** filter narrowed; clicking it restores all three):

| Filter | Options | Default | Behavior |
|--------|---------|---------|----------|
| Registry Sync | All / Enabled / Disabled | All | Filters building controllers by their Registry Sync value |

- Rendered as a compact (24px) select to fit the header band
- Changing the filter clears any active bulk selection
- Filters apply AND logic when combined
- Archived building controllers always report **Disabled** (archiving turns Registry Sync off — `FR-P2-10`), so they only ever appear under the **Disabled** Registry Sync filter, and their Configuration toggle is shown off and disabled on the panel

### FR-P2-04: A Timetable Release Blocks Turning Registry Sync Off *(reinstated November 4, 2026)*

Turning Registry Sync **off** on a building controller that is scheduled for a Timetable Release is blocked: the release is still queued, so the user must cancel it first. With the Asset Registry refusal of `FR-P2-30`, these are the two conditions that can block a Configuration change.

- **Trigger:** only a change from On to Off. Turning the toggle On, saving an unrelated edit and archiving (`FR-DS-07`) do not run this check.
- **Side panel Save:** the toggle shows the inline error "This Building controller is scheduled for Timetable Release. Cancel the deploy before disabling." and the error toast "Cannot save: building controller is scheduled for Timetable Release." is raised. Save stays blocked until the toggle is put back.
- **Bulk Save**, including a Campus selection (a bulk configuration — `FR-P2-05`): each selected building controller that is scheduled for a Timetable Release **and** would flip from On to Off is a blocker. One blocker shows the same inline error as the panel; several show "These Building controllers are scheduled for Timetable Release: `<host1>`, `<host2>`. Cancel the deploy before disabling.". The error toast reads "Cannot apply: N building controller(s) scheduled for Timetable Release." and nothing is written.
- **Order:** the Timetable Release check runs first. Only a Save that passes it reaches Asset Registry, which can still refuse (`FR-P2-30`).
- **Demo node:** `rvrs-bc1-3.atrium.test`.
- *Not in the prototype:* the check was removed on August 31, 2026 and has not been rebuilt. The wording above is the pre-withdrawal wording, confirmed by the product owner on November 4, 2026.

## Proxy URL, Campus-Level Registry Sync & Filter Polish (June 2026)

### FR-P2-05: Campus-Level Registry Sync Configuration

The Campus details panel gains a "CONFIGURATION" section (the only section on the panel — Campus Info was removed, see `UX-12` — with its info notification above the toggle) containing a **Registry Sync** toggle that applies to the whole campus:

- The toggle is **four-state**, reflecting the campus's building controllers that are visible under the current tree filters: **Enabled** (all on), **Disabled** (all off), **Mixed** (some on, some off — shown as an amber indeterminate switch labeled "Mixed"), or **Unavailable** (the active filters narrow the campus to zero building controllers — the input is disabled, the label reads "Unavailable", and Save/Discard are inert for this row).
- Scope is every building controller **visible in the tree** under that campus: active and faculty-less — **archived building controllers are excluded** from the aggregate state and the cascade. This is the same definition bulk mode uses (`FR-P2-10`).
- The aggregate state and the Save cascade are **scoped by both tree filters**: the **Faculties filter** (faculty bucket intersection) and the **Registry Sync filter** (Enabled / Disabled / All). Only building controllers visible under both filters contribute to the state and receive the cascaded value.
- An info notification reads: "Changing Registry Sync here updates every building controller in this campus. Use the filters to limit changes to a specific subset." When any filter is narrowed (Faculties narrowed OR Registry Sync filter ≠ All), the copy swaps to: "Changing Registry Sync here updates only the building controllers in this campus that match the current filters." When the filters narrow to zero building controllers (Unavailable state), the copy swaps to: "No building controllers match the current filters, so Registry Sync cannot be changed for this campus. Adjust the Faculties or Registry Sync filter to enable changes." When more than one campus is selected in the header, the wording swaps "this campus" for "a campus / that campus" so the cascade scope stays unambiguous. The multi-select Bulk Configuration panel uses the same copy.
- On **Save**, when the toggle has been changed to a definite Enabled/Disabled (not left Mixed and not Unavailable), the value cascades to **every building controller of the campus that passes the active tree filters** (Faculties + Registry Sync), archived building controllers are never part of it (`FR-P2-10`). The tree re-renders so each building controller's Registry Sync indicator updates.
- Follows the campus panel's existing Save/Discard dirty-state model. The cascade is gated like any bulk change: a building controller scheduled for a Timetable Release blocks turning Registry Sync off (`FR-P2-04`), and Asset Registry can refuse it per building controller (`FR-P2-30`).
- **Header**: Because a single-campus selection is a bulk configuration of that campus's building controllers, the panel title reads **"Bulk Configuration (N Building Controllers)"** (N = the campus's visible building controllers), matching the multi-select bulk header — not "Campus Details".

### FR-P2-06: Proxy URL Across Forms and Panels

- The **Campus Hub Create New Node form** has **no Proxy URL field**, and neither does the **Campus Hub side panel**. A Campus Hub's Proxy URL is never derived (FR-P2-14 / FR-P2-19 do not cover Campus Hub) and is not captured or edited in this prototype; seeded Campus Hub values are shown **read-only** in the **Associated Campus Hub** section of the Building Controller and Relay panels.
- The **Relay Create New Node form** includes a **required** Proxy URL field positioned **directly under Campus Hub Association**, the field it derives from — same placement, and same reason, as the Building Controller form (FR-P2-19). On the **Relay side panel** it is an **editable** field directly under Campus Hub Association.
- On the **Building Controller side panel**, Proxy URL is an **editable** field positioned **directly under Relay Association** (order: Node Type → Hostname → IP Address → Campus Hub Association → Relay Association → Proxy URL — see FR-P2-13). On the **Create New Node form** it sits under Campus Hub Association, because it is derived from it (FR-P2-14). (See FR-P2-09 for the full editable-panel behavior and validation.)
- The Building Controller's **Proxy URL** is **generated automatically** from the Campus Hub association + hostname and is freely editable (see FR-P2-14, FR-P2-25); the Relay's works the same way (FR-P2-19). This single field consolidates what the spec previously split into a separate "Controller Proxy URL" and an auto-generated "Pass-Through URL" — they are the same thing (see updated §5.3 and FR-LS-06).
- Every seed Campus Hub carries a Proxy URL value, and seed building controllers and Relays whose hostname the rule can parse are given one on import (`FR-P2-14d`). Seed building controllers whose names the rule cannot parse — the legacy separator-less names (`hlsd-bc101`, `meds-bc101` and siblings), `engr-bc-studio`, `atrium-test` and the archived `*-old` controllers — stay **empty**, as does the legacy Relay `meds-rly01`; they take the manual path of `FR-P2-14a`.

### FR-P2-07: Cross-Campus NORT Campus Hub De-duplication & Navigate Links

- When **NORT is among the selected campuses**, a NORT Campus Hub referenced by another campus's building controllers appears **only under NORT** in the tree — it is no longer also duplicated under the referencing campus's Campus Hub section. When NORT is not selected, the referenced NORT Campus Hub still appears (cross-campus, with the blue "NORT" badge) under the referencing campus, as long as one of that campus's building controllers in the picked faculties references it (faculty-less and archived building controllers count, whatever the other filters say; deselecting every faculty removes it).
- A Campus Hub **navigate (go-to-node) link is enabled whenever the target node's campus is present in the current tree** (its campus is among the selected campuses, or it is a NORT Campus Hub whose row is currently in the tree) — replacing the previous same-campus-or-NORT-only rule. Applied to the Associated Campus Hub link on the Building Controller and Relay panels (the editable Campus Hub Association field is a dropdown and has no link).

### FR-P2-08: Tree Header & Label Polish

- Tree section title is "Filters"; spacing between the inline header filters increased (see FR-P2-03).
- Fixed a typo in the Alert Service label on the Create New Node form.

## Editable Proxy URL & Archived Configuration (July 2026)

### FR-P2-09: Editable Proxy URL on Side Panels

Proxy URL is **editable directly from the details side panel** on the Building Controller and Relay panels, replacing the previous read-only display. The Campus Hub panel has **no Proxy URL field** (`FR-P2-06`).

- **Building Controller**: editable, positioned **directly under Relay Association** (Node Type, Hostname, IP Address, Campus Hub Association and Relay Association sit above it). Stored on the building controller as the Proxy URL (formerly also called the Pass-Through URL). Generated automatically — see FR-P2-14.
- **Timetable Relay**: editable, positioned **directly under Campus Hub Association** (Hostname, IP Address and Campus Hub Association sit above it — see FR-P2-16). Generated automatically — see FR-P2-19.
- **Automatic update:** the field follows its Hostname and Campus Hub Association — see `FR-P2-25`. There is no Generate button.
- **Open in a new tab:** each Proxy URL field carries a trailing icon button (the same open/navigate affordance used by the Associated Campus Hub / Building Controller / Relay lists) that opens the URL. It always targets the **saved** URL — an unsaved edit in the field neither re-points it nor enables/disables it, so a half-typed URL can never be opened. It re-targets on Save, on Discard, and when another node is selected, and is disabled when the saved value is empty.
- The value participates in the standard Save / Discard dirty-state model (FR §9.4): the panel is dirty when Proxy URL differs from the snapshot, Discard restores it, and Save persists it to every copy of the node.
- **Validation matches this prototype's Create New Node form.** The Building Controller and Relay Proxy URL are **required** on the Create form and on their side panels, with the same blur message ("Enter Proxy URL"), Save gating and Save-time check as the other required fields (§9.1). There is no uniqueness check and no format check. (An earlier version of the form also required the Building Controller Proxy URL, and de-duplicated it.)
- The **Associated Campus Hub** mirror section on the Building Controller and Relay panels remains **read-only** (it reflects another node's value).

### FR-P2-10: Archiving Turns Registry Sync Off

Archiving a building controller turns its Configuration off, and it stays off for as long as the building controller is archived. _(This reverses the earlier "archiving preserves Configuration" rule.)_

- **On archive**, Registry Sync is forced **off**. Whatever value the building controller had is dropped; the archived record is stored with Registry Sync off.
- **While archived**, the Configuration section stays visible on the details panel but its Registry Sync toggle reads **off and disabled** — it cannot be turned on while the building controller is archived. A note below the toggle reads: "Archived building controllers cannot use Registry Sync. Unarchive to change this."
- **On unarchive**, the building controller is restored with Registry Sync **off** and the toggle **enabled** again, so the user can turn it back on from the panel, the campus cascade, or bulk.
- The **tree-row Registry Sync indicator** reads "Disabled" for every archived building controller.
- Archived building controllers are **not bulk-selectable** and are excluded from a Campus selection and its cascade, so no bulk or campus write ever touches an archived building controller's Registry Sync value (see `FR-P2-05` and the bulk rules above). The bulk toggle is therefore never locked for an all-archived selection, and no save skips archived building controllers.

## Creation Defaults (July 2026)

### FR-P2-11: New Building Controllers Start With Registry Sync Enabled

A building controller created via the Create New Node drawer is persisted with **Registry Sync on** (changed November 4, 2026; it used to start off). The Create form carries no Registry Sync field. A newly created building controller therefore shows the "on" tree indicator, passes the Registry Sync filter "Enabled", and can be turned off afterwards from the Building Controller side panel, the campus-level cascade or bulk mode (`FR-P2-04`, `FR-P2-30`). Unarchive is different: an unarchived building controller is restored with Registry Sync off (`FR-P2-10`), and Move keeps the stored value.

## Editable Hostname on the Details Panels (August 2026)

### FR-P2-13: Hostname Is Editable on the Side Panels

Hostname is an **editable field on all three details side panels**, and heads the editable section on the Campus Hub and Relay panels (it is no longer part of the read-only info grid on any panel). On the **Building Controller** panel it is the second field, below **Node Type** — see `FR-GH-04`. On the Building Controller panel the field **locks once something references the building controller by name**; on the Campus Hub and Relay panels it is always editable:

- **Building Controller** — editable **only while no faculty is associated with the building controller**. Order in the editable section: Node Type → Hostname → IP Address → Campus Hub Association → Relay Association → Proxy URL → Description → Location → … (Node Type leads because it is what the rest of the record is read against; Campus Hub Association became editable in `FR-P2-16` and sits above the field it derives.)
  - With one or more associated faculties the input is **disabled** and a note below it reads: **"Hostname cannot be updated when Building Controller contains associated faculties."** This note **replaces** the format hint (the `atrium.test` guidance) while locked, since the field cannot be edited. Every other field on the panel stays editable.
  - "Associated" means the building controller's **current** faculties. A **faculty-less (orphan) building controller is therefore renameable** — nothing references it yet.
  - **Archived building controllers are never locked.** The faculty history stored on an archived record is not a live reference, so the Hostname stays editable while archived, whether or not the building controller ever had faculties.
- **Timetable Relay** — editable at any time (nothing references a Relay by hostname). Order: Hostname → IP Address → Campus Hub Association → Proxy URL → Description → Location.
- **Campus Hub** — editable at any time. Order: Hostname → IP Address → Description → Location → Bridge Service. A rename is propagated to every building controller and Relay that references the Campus Hub (see *Reference propagation* below). _(Until v2.31 the field was locked while any building controller was associated.)_

> **A locked field never blocks Save and never shows an error.** It is not a problem the user can act on from this panel, so it is skipped by every validation rule in §9.4 — including the `atrium.test` suffix rule. Some existing records carry a legacy hostname *and* the associations that lock it; without this exemption their Save button would be permanently unavailable, blocking every unrelated edit on the node.

**Validation** (identical to the Create New Node form, per §9.1):

- **Required** — an empty Hostname shows the inline error "Enter Hostname" on blur; Save stays disabled, and a Save-time backstop focuses the field and raises the toast "Hostname is required.".
- **Domain** — the hostname must end in `atrium.test` ("Hostname must end with atrium.test", `FR-P2-21`), on all three panels.
- **Unique** — the hostname is checked on blur, while typing and on Save against every existing node (building controllers active/archived/faculty-less, Campus Hub, Relay). A clash shows "Hostname already in use" inline plus the toast "Hostname already in use. Please, try again with a different Hostname." and blocks the save. The node being renamed is excluded from its own check. IP Address follows the same required / "Enter a valid IP Address" / "IP Address already in use" rules (`FR-P2-22`).
- The short-name shape (`<campus>-bc<floor>-<n>`) is not validated.

**Dirty state** — Hostname participates in the standard Save / Discard model (§9.4): the panel is dirty when it differs from the snapshot, Discard restores the previous hostname, and Save commits it.

**Reference propagation** — associations are stored as hostname strings, not ids, so a rename rewrites every reference in the same Save:

- Renaming a **building controller** updates the `Associated Building Controllers` lists on all Campus Hubs and Relays, plus the building controller copies nested under Relay records — the building controller keeps appearing in the same associations under its new name.
- Renaming a **Campus Hub** updates the Campus Hub association on every building controller (active, archived, faculty-less) and Relay that referenced it, preserving the `<hostname> (<Type>)` suffix format used on building controllers.
- Renaming a **Relay** requires no propagation — nothing references a Relay by hostname.
- All copies of the renamed node (one per associated faculty, plus archived and faculty-less copies) are updated together, so the tree, search, and export reflect the new hostname immediately.

**Not modeled:** the downstream Asset Registry consequence of a rename (Asset Registry has no update endpoint, so the real system must mark the old record deleted and register a new one) is not modeled. The **domain** half of the naming convention is enforced on all three node types — see `FR-P2-21` — but the short-name shape (`<campus>-bc<floor>-<n>` for building controllers, `<campus>-rly<floor>-<n>` for Relays) is not: the Hostname fields carry full example placeholders — `e.g. meds-bc1-4.atrium.test` (Building Controller), `e.g. meds-hub.atrium.test` (Campus Hub), `e.g. meds-rly1-1.atrium.test` (Relay) — plus a format hint below the field, as guidance only.

## Generated Proxy URL (August 2026)

> The two rule templates are restated below so this document stands on its own, and it specifies the Atrium UI behaviour built on top of them.

### FR-P2-14: The Building Controller Proxy URL Is Generated Automatically

The Proxy URL is **generated** from the building controller's Campus Hub association and hostname, so the user
never has to work it out by hand. Which rule applies depends **solely on the associated Campus Hub
hostname**, *not* on the building controller's Node Type (Standalone Campus / Connected Campus / Test Lab):

- **Rule 1 — local Campus Hub** (any Campus Hub other than the master): `https://<hubHostname>/<shortName>/campus/`,
  where `<shortName>` is `bc<floor>-<n>` extracted from the building controller hostname
  (`meds-bc1-4.atrium.test` → `bc1-4`).
- **Rule 2 — master Campus Hub** (`hub.atrium.test`): `https://<buildingControllerHostname>/campus/`, provided that
  hostname still carries a parseable short name (`FR-P2-14a`).

**Relays follow the same rules** — see `FR-P2-19`, which states the one substitution. **Campus Hub** Proxy
URLs are never derived (and have no input in the prototype — `FR-P2-06`).

**Atrium's normalisation decisions** — these are Atrium's own, since the examples collected from live data
vary:

- Atrium always generates `https://`, never `http://`.
- The URL always ends in `/campus/`, with the trailing slash. **This holds for Relays too** (`FR-P2-19`) — the service path is the same on every Proxy URL Atrium generates.
- The master rule matches on the **exact** hostname `hub.atrium.test`, never a partial match — so
  `hub-lab01.campus.test` is a *different* Campus Hub and takes Rule 1.
- Rule 2 embeds the building controller hostname **as it stands**; the old domain-rewrite step is gone
  (`FR-P2-21`). Short-name extraction strips the known domains (`.campus.test`, `.legacy.test`, `.local`) as well as
  `.atrium.test`.

#### FR-P2-14a: When the hostname cannot be parsed

**Both** rules need a parseable short name — `bc<floor>-<n>` for building controllers, `rly<floor>-<n>`
for Relays — **including Rule 2**. A hostname without one (a name such as `engr-bc-studio`,
`atrium-test` or `meds-rly01`, or a legacy name that ends in a suffix such as `-old`) cannot be
generated from: the field keeps whatever it holds, and an existing value is flagged as **outdated**
(`FR-P2-25`). Atrium never guesses a path segment. An empty field is still required, so a new building controller
or Relay needs a Proxy URL entered by hand; an existing URL only draws the outdated warning and does not block Save. (The one exception is a URL flagged by a Campus Hub rename, which blocks Save until it is changed — `FR-P2-25`.)

#### FR-P2-14b: Generating the value

The value is generated **automatically** — see `FR-P2-25` for when it updates, the warning shown when an
existing URL is replaced, and the outdated state. It derives from the Hostname and Campus Hub **currently in
the form**. On the Create form the Campus Hub may be the one being created in the same form (its Hostname is
read as typed); the Relay section also accepts a Campus Hub inherited from the Building Controller section. Outside the
forms, the Campus Hub **Manage → Building Controllers** drawer (`FR-P2-20`) and a **Campus Hub rename** (`FR-P2-25`) also
rewrite it (a rename only where the URL is generated). _(Supersedes the **Generate** button, its tooltips and the "never filled automatically" rule.)_

#### FR-P2-14c: Editing

The field is free text, **required** (`FR-LS-06`, §9.1) and not format-validated (`FR-P2-09`). There is
no Reset action: a URL typed by hand is kept until the Hostname or Campus Hub changes again (`FR-P2-25`). The
open-in-new-tab button targets the **saved** value and re-targets only on Save, Discard or selection.
_(Supersedes the earlier auto-fill / "Manually edited." hint / "Reset to generated URL" model.)_

#### FR-P2-14d: Existing records

Building controllers and Relays that predate the rule are **backfilled on import** wherever the hostname
carries a parseable short name; both rules are exercised. In the seed, **a handful of building controllers carry
names without the pattern** (`engr-bc-studio`, `atrium-test` and the archived `arts-bc01-2-old`,
`hlsd-bc001-old`, `meds-bc001-old`, `meds-bc002-old`, `rvrs-bc9-1-old`, `rvrs-bc9-2-old`) and stay **empty**,
taking the manual path of `FR-P2-14a` —
because the field is required, the panel's Save stays disabled on such a building controller until a Proxy URL is
entered. (The demo controllers `lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3`, `lab-bc02-1`, `lab-bc02-2` and `lab-bc02-3` are the exception: they are seeded with a hand-written URL.) On the Relay side only `meds-rly01` stays empty. In the real system this is the import-time
cleanup described in the hostname-convention work.

#### Still required

The Proxy URL remains a **required concept**: Atrium reaches building controllers *through* Campus Hub, and Atrium's
database is the source of truth for proxy URLs (it no longer reads them from the Campus Hub database). The
field must not be dropped in a later cleanup even though the user rarely types in it.

---

## Node Lifecycle & Editable Associations (September 2026)

### FR-P2-15: Archiving Campus Hub and Timetable Relays

Campus Hubs and Relays gain the archive lifecycle building controllers already have (`FR-DS-01`). A node that
is out of service is archived, never deleted, and can be brought back.

**Archive.** The Manage menu on a Campus Hub or Relay node offers **Archive → Campus Hub** / **Archive → Timetable
Relay**, which opens the same confirmation popover the Building Controller archive uses. The copy differs —
"The node will appear as archived in the tree view and can no longer be associated with new building
controllers." — because there are no faculty associations to remove.

**Gate.** The action is available **only while nothing active is associated with the node** (archived building controllers don't count for a Campus Hub). Otherwise the
menu item is still listed (so the action stays discoverable) but rendered **disabled**, with the reason as
a tooltip. Archiving a node that is still serving other nodes would strand every association pointing
at it.

- A **Campus Hub** is blocked by its **active** Building Controllers (active and faculty-less building controllers that name it;
  **archived ones don't block** — they are out of service) **and** by its active Timetable Relays. The panel's
  ASSOCIATED BUILDING CONTROLLERS section still lists archived ones, each with the **Archived** tag. A Campus Hub whose only building controllers are archived can therefore be archived. The tooltip reads "Remove all associated Building Controllers and Timetable Relays before archiving.", whatever the count.
- A **Relay** is blocked by its building controller membership (`FR-P2-17`): "Remove the associated Building Controller
  before archiving." / "Remove all `<N>` associated Building Controllers before archiving."
- The Timetable Release guard (`FR-DS-07`) is a **Building Controller rule only** and does not apply here.

**Presentation.** An archived Campus Hub or Relay carries the same "Archived" tag and muted styling as an
archived building controller, sorts to the bottom of its tree section, and is hidden unless **Show Archived
Nodes** is on (`FR-DS-03`). An archived node is **excluded from every association list** — the
Create New Node form's Campus Hub/Relay dropdowns, the side-panel Campus Hub dropdowns (`FR-P2-16`) and the association
drawers (`FR-P2-17`) — because nothing new may be attached to a node that is out of service.

**Unarchive.** The Manage menu on an archived Campus Hub/Relay collapses to **Unarchive → Campus Hub** /
**→ Timetable Relay**, which opens the **Create New Node form in unarchive mode** exactly as `FR-DS-06`
describes for building controllers: only the matching section is shown, its toggle header is hidden, fields are
pre-filled and fully editable, the title reads "Unarchive `<Type>` for `<Campus>`", and the primary
action is labelled "Unarchive". A Relay can only be archived once it has no building controllers (`FR-P2-27`), so only its Campus Hub Association
survives the archive and is pre-selected; the Building Controller Association list starts empty and any building controllers checked on unarchive are added. Required-field, IP-format and uniqueness validation all apply, and the uniqueness
check **excludes the record being unarchived** — it never left the dataset, so it would otherwise clash
with itself.

**Data model note (prototype).** Building controllers are stored once per associated faculty, so archiving them
moves copies between datasets to preserve faculty history. Campus Hub and Relay records exist exactly once and
have no faculty dimension, so they are archived by **flagging the record in place**. This keeps every
association that referenced the node intact for the unarchive.

---

### FR-P2-16: Campus Hub Association Is Editable on the Building Controller and Relay Panels

The **Campus Hub Association** moves out of the read-only info grid and becomes an editable dropdown in the
editable section of both the Building Controller panel (below IP Address, above Relay Association) and the Relay
panel (below IP Address, above Proxy URL). The read-only **ASSOCIATED CAMPUS HUB** section stays on both panels as the navigable
detail view. It participates in the standard Save / Discard dirty-state model (`§9.4`).

**Options.** Every Campus Hub reachable from the node's campus — the campus's own plus NORT's (`FR-LS-07`) —
excluding archived ones (`FR-P2-15`). A node pointing at a Campus Hub that has since been archived or moved
out of scope keeps a **disabled** option for it, so the panel never silently reads "Not assigned".

**Storage formats differ and are not interchangeable.** A building controller stores the association as
`<hostname> (<Type>)`; a Relay stores the **bare hostname**. Each panel writes back in its own format.

**Cascade on Save.** Changing the Campus Hub is never blocked, but it has consequences, and all of them are
applied together:

| # | Consequence | Applies to |
|---|---|---|
| 1 | The old Campus Hub's reciprocal `associated building controllers` list loses the building controller; the new one's gains it | Building Controller |
| 2 | **Faculties the new Campus Hub does not grant access to are removed** — see `FR-P2-18` | Building Controller |
| 3 | The Relay membership is dropped when the Relay is on a **different** Campus Hub — a Relay only serves building controllers on its own Campus Hub. The Relay Association dropdown re-scopes to the new Campus Hub immediately (`FR-P2-24`) | Building Controller |
| 4 | Building controllers left behind on the old Campus Hub are detached from the Relay | Relay |
| 5 | The Proxy URL is re-derived from the new Campus Hub, or flagged as outdated when it can't be (`FR-P2-25`) | both |

**Confirmation.** When — and only when — the change would strand a Relay membership, Save opens a
**Change Campus Hub** popover before anything is written. On the Building Controller panel it reads "Changing
the Campus Hub will remove the associated Relay node, because a Relay node can only serve Building Controllers on
its own Campus Hub."; on the Relay panel "Changing the Campus Hub will detach all
associated Building Controllers, because a Relay node can only serve Building Controllers on its own Campus Hub." **Cancel** leaves the panel dirty and unchanged; **Save
Changes** commits. As soon as the selection changes, a note under the dropdown warns ahead of time:
"Saving will detach it from its Timetable Relay." (Building Controller) or "Saving will detach any Building Controllers attached
to this Relay node." (Relay). Faculty removals (row 2) are not warned about. The popover is anchored to the
bottom-right of the panel footer so it stays inside the panel and its actions are always reachable.

**Proxy URL.** A Campus Hub change re-derives the Proxy URL as soon as the selection changes, on either panel,
with the "Proxy URL updated because the Campus Hub changed." warning — or flags it as outdated when it
can't be derived (`FR-P2-25`). _(Supersedes the v2.34 rule that a Campus Hub change did not touch it until the
user clicked **Generate**.)_

---

### FR-P2-17: Relay ↔ Building Controller Membership

Relay membership is an add-and-remove relationship. A building controller has **at most one Relay** (`FR-P2-24`), so
the two sides use different controls. _(Until v2.33 both sides used a checklist, and the Building Controller
menu carried **Manage → Timetable Relays**. That entry is removed.)_

| Panel | Control | Candidates |
|---|---|---|
| Building Controller | **Relay Association** dropdown in the editable section, saved with the panel's Save / Discard | `Not assigned`, plus every non-archived Relay on the Campus Hub currently picked in the Campus Hub dropdown |
| Timetable Relay | **Manage → Building Controllers** checklist, with **ADDING** / **REMOVING** status tags, mirroring **Manage Faculties** | Every active building controller of this Relay's own campus on its Campus Hub; one already on **another** Relay is shown disabled and tagged with it (`FR-P2-28`) |

This replaces the Relay panel's add-only **Add → Building Controller** action (`FR-CDN-03`).

**The Relay's Manage → Building Controllers entry is disabled when its candidate list would be empty.** That happens with no Campus Hub assigned ("Assign a Campus Hub to this Relay node first."), or a Campus Hub carrying no non-archived building controllers ("There are no Building Controllers on `<campus hub>`."). A Campus Hub whose building controllers all belong to another Relay still opens the drawer (`FR-P2-28`). The menu item stays listed with the reason as a tooltip, rather than opening a drawer onto an empty list. On the Building Controller panel, the dropdown is instead disabled and its placeholder says why: "Select a Campus Hub first" (no Campus Hub picked) or "No Relay nodes for this Campus Hub". The Create form reads "Select a Campus Hub first" and, for a Campus Hub that has no Relay, "No Relay nodes for this Campus Hub" ("No Relay nodes available" when the form's own Campus Hub section is on).

**Writes.** A membership is recorded in two places on the Relay record — the flat association list the
side panel renders, and the nested child the tree renders. Both are written on add and on remove;
updating only one would leave the two views disagreeing about the same association.

**Alert Service** is not touched when a Relay is removed (`FR-LS-05`, v2.38).

**Faculty-less building controllers are eligible.** A building controller with no faculties is a live node; it is
offered in the Relay's list like any other.

---

### FR-P2-18: A Campus Hub Grants Its Building Controllers Access to Faculties

A faculty is available to a building controller only where **both the Campus and the Campus Hub** offer it. The Campus Hub
carries that grant as its own **faculty list** — it is an attribute of the Campus + Campus Hub pair, not
something inferred from whichever building controllers happen to point at the Campus Hub today.

**Consequence on a Campus Hub change.** When a building controller moves to a different Campus Hub, every faculty it holds
that the new Campus Hub does **not** grant is **removed** from it. The removal is a soft one, identical to
unchecking the faculty in Manage Faculties (`FR-DS-02`): the building controller leaves that faculty's branch of the
tree and its own faculty tags, while the historical set is retained so the archive views can still
replay it.

**Losing every faculty is allowed.** If the new Campus Hub grants none of them, the building controller becomes
**faculty-less** and stays visible in the tree with the "No Faculties selected" hint (`FR-LS-09a`) — the
same state a faculty-less create or unarchive produces. It is not deleted and not archived.

**Visibility.** The Campus Hub side panel lists the faculties it grants, read-only, under **Faculties**. Without
it the removal reads as arbitrary. The grant is **read-only in Atrium**: it is supplied with the Campus Hub and cannot be edited from any panel or form.

**Manage Faculties offers only granted faculties.** The Manage Faculties drawer (`UX-17`) lists the faculties that the building controller's campus has **and** its Campus Hub grants, so a faculty that a later Campus Hub change would remove can never be added. A building controller with no Campus Hub is offered none, and a faculty already on the node stays listed so it can still be removed. The Create and Unarchive forms follow the same rule: the Faculties dropdown offers only the faculties the campus has and the chosen Campus Hub grants ("No faculties available" when the Campus Hub grants none for the campus), and Unarchive pre-checks only the historical faculties the Campus Hub still grants. A Campus Hub created in the same form has no grant yet, so every faculty of the campus is offered, and the faculties picked on the form become that Campus Hub's grant (none when the Building Controller section is off).

**Prototype seeding.** Most seed Campus Hub records ship this field empty, so it is backfilled at load from the
faculties their current building controllers already hold — the only signal the seed carries, and one that makes
the seed self-consistent, so no pre-existing association is retroactively invalid. The Campus Hubs with
no active building controllers (`nort-hub-lab`, `hlsd-hub2`, `meds-hub2`, `meds-hub3`) carry a hand-written list
instead; `meds-hub2` grants `SCI` only, so moving a building controller there demonstrates a partial removal
rather than stripping everything.
`rvrs-hub2` is instead served only by two archived Building Controllers (`rvrs-bc9-1-old`, `rvrs-bc9-2-old`): it can be archived, and its ASSOCIATED BUILDING CONTROLLERS list shows both with the **Archived** tag.

---

## Generated Relay Proxy URL (September 2026)

### FR-P2-19: The Timetable Relay Proxy URL Is Generated Automatically

The Timetable Relay **Proxy URL** is generated automatically from its **Campus Hub association and its own hostname**, under
the **same two rules** as the building controller Proxy URL (`FR-P2-14`). Which rule applies still depends
**solely on the associated Campus Hub hostname**:

- **Rule 1 — local Campus Hub** (any Campus Hub other than the master): the URL is built from the Campus Hub hostname plus
  a short name extracted from the **Relay** hostname.
- **Rule 2 — master Campus Hub** (`hub.atrium.test`): the URL is built from the Relay hostname directly, provided
  it still carries a parseable short name (`FR-P2-14a`).

The **service path is `/campus/` on every Proxy URL Atrium generates**, Relays included. An earlier
revision of this requirement specified `/relay/` for Relays; that was wrong and is corrected here.

**Only one thing differs from `FR-P2-14`:**

| | Building Controller | Timetable Relay |
|---|---|---|
| Short name | `bc<floor>-<n>`, from the building controller hostname | `rly<floor>-<n>`, from the Relay hostname |
| Service path | `/campus/` | `/campus/` — the same (corrected September 4, 2026; it was briefly specified as `/relay/`) |

Worked examples:

| Relay hostname | Associated Campus Hub | Generated Proxy URL |
|---|---|---|
| `meds-rly1-1.atrium.test` | `meds-hub.atrium.test` (local) | `https://meds-hub.atrium.test/rly1-1/campus/` |
| `rvrs-rly2-1.atrium.test` | `rvrs-hub.atrium.test` (local) | `https://rvrs-hub.atrium.test/rly2-1/campus/` |
| `meds-rly1-1.atrium.test` | `hub.atrium.test` (master) | `https://meds-rly1-1.atrium.test/campus/` |

**Everything else is `FR-P2-14` unchanged**, applied to the Relay field:

- **Normalisation** (`FR-P2-14`): always `https://`, always a trailing slash, and the master rule matches
  the **exact** hostname `hub.atrium.test`. The master rule does not rewrite the domain — since
  `FR-P2-21` every Relay hostname is already on `atrium.test`, the certificate domain, so it is
  used as it stands.
- **Unparseable hostname** (`FR-P2-14a`): a Relay hostname carrying no `rly<floor>-<n>` pattern, under
  either rule, can't be generated from. The field is left as it stands and flagged as outdated
  (`FR-P2-25`).
- **Generating** (`FR-P2-14b`, `FR-P2-25`): on the Create New Node form (field directly under Campus Hub
  Association), the Unarchive and Move forms and the Relay side panel, the field follows the Relay Hostname
  and the Campus Hub currently in the form — including a Campus Hub being created in the same form, or inherited
  from the Building Controller section. Unarchive prefills the archived value as-is. A Campus Hub rename regenerates or flags Relay Proxy URLs the same way as Building Controller ones (`FR-P2-25`).
- **Editing** (`FR-P2-14c`): the field is **required**, free text and not format-validated; there is no
  Reset link.
- **Existing records** (`FR-P2-14d`): Relays that predate the rule are **backfilled on import**; only `meds-rly01` stays empty.
- **Open in a new tab** (`FR-P2-09`) and the **Save / Discard dirty-state model** (§9.4) are unchanged —
  the open button still targets the **saved** URL, never the live field.

**Campus Hub Proxy URLs are never derived** and have no editable field in the prototype (`FR-P2-06` / `FR-PU-02`).

---

## Managing Building Controllers From the Campus Hub (September 2026)

### FR-P2-20: Campus Hub → Building Controller Association, Managed From the Campus Hub

The Campus Hub panel gains **Manage → Building Controllers**, the add/remove checklist `FR-P2-17` gives
the Relay's Manage → Building Controllers entry: a searchable list carrying **ADDING** / **REMOVING** status tags against the current
state, opened from the Manage menu into the action drawer.

| Panel | Action | Candidate list |
|---|---|---|
| Campus Hub | **Manage → Building Controllers** | Every active building controller the Campus Hub is allowed to serve — its own campus's, or every campus's when the Campus Hub is on **NORT** (the reverse of the dropdown rule in `FR-LS-07`) |

**It is a re-home, not a membership toggle.** This is where it parts company with `FR-P2-17`. A building
controller belongs to **exactly one** Campus Hub, so checking a row **moves** that building controller off whichever Campus Hub
it is on today, and unchecking one leaves it **unassigned** — the same "Not assigned" state the Building
Controller panel's Campus Hub dropdown offers. Both directions therefore run the full `FR-P2-16` / `FR-P2-18`
cascade: the reciprocal lists on both Campus Hubs, the faculties the new Campus Hub does not grant, the Relay
memberships the move invalidated, and the derived Proxy URL (`FR-P2-14b`). Unassigning
drops **every** faculty and leaves the building controller faculty-less and visible under `FR-LS-09a`.

Because that reach is wider than the Relay drawer's, the drawer states it up front, and **every row that
would be a move rather than a plain add is tagged with the Campus Hub hostname it is currently on**.

**Proxy URL.** There is no in-drawer field, so the drawer re-derives it itself (as the panel does when its Campus Hub changes, `FR-P2-25`): the URL is
rewritten for the new Campus Hub when the stored value is **empty** or still equals what the **old** Campus Hub
derives. Any other value survives untouched, as does a
hostname the new Campus Hub cannot parse — unlike the panel, the drawer shows no outdated warning for it. Unassigning clears a derived URL, leaving the required field empty
until one is entered on the panel. (On the panel, choosing "Not assigned" instead keeps the old URL and flags it outdated — `FR-P2-25`.)

**Archived building controllers are excluded**, exactly as on the Relay side. An archived building controller still counts
against the Move gate (`FR-P2-23`) but **not** the Campus Hub archive gate (`FR-P2-15`); it is detached by
unarchiving it and changing its own Campus Hub, not from this drawer.

**The entry is disabled when the candidate list would be empty**, with the reason as a tooltip — "There
are no Building Controllers on `<Campus>`." (or "There are no Building Controllers to associate." for a NORT Campus Hub) — rather than opening a drawer onto an empty list.

---

## Hostname Domain Rule (September 2026)

### FR-P2-21: Node Hostnames End in `atrium.test`

Every **building controller, Relay and Campus Hub** hostname must end in **`atrium.test`**. _(Supersedes
the earlier version of this requirement, which exempted Campus Hub hostnames and enforced the domain with a
fixed, non-editable suffix beside a short-name input.)_

**The suffix is a back-end setting.** The back end returns it as `meta.hostnameSuffix` on `GET /manage-infrastructure`,
and every Hostname validation (create and update, on all three node types) reads that value; nothing
else hardcodes the domain. A hostname **equal to the suffix** is valid (suffix `atrium.test`, hostname
`atrium.test`). The prototype has no back end, so one constant stands in for it, set to `atrium.test`.

**Enforced by validation, not by the field.** On all six Hostname fields — the Building Controller, Relay and Campus Hub
side panels, and the Building Controller, Relay and Campus Hub sections of the Create New Node form (which also serve
Unarchive and Move) — the input is free text holding the **full hostname**, with a format hint below it.
A value that does not end in `atrium.test` shows "Hostname must end with atrium.test" on blur and
keeps Save disabled; a panel Save-time backstop focuses the field and raises the toast "Hostname must end
with atrium.test.". A stored hostname that already breaks the rule shows the error as soon as its
panel, Unarchive or Move form opens — unless the field is locked (`FR-P2-13`), in which case it never
blocks Save. Required and uniqueness checks are unchanged (`FR-P2-13`, §9.1).

- **Placeholders are full hostnames**: `e.g. meds-bc1-4.atrium.test` (Building Controller),
  `e.g. meds-rly1-1.atrium.test` (Relay), `e.g. meds-hub.atrium.test` (Campus Hub). Below the field a format hint reads "Hostname must be {campus}-bc{floor}-{n}.atrium.test or any valid domain name ending in atrium.test." (Building Controller; `rly` for a Relay) or "Hostname must be a valid domain name ending in atrium.test." (Campus Hub).
- **Outdated hostnames are flagged in the tree** (orange icon and text), and the header's **Hostname
  outdated** legend appears whenever the rendered tree contains one. Legacy hosts on `campus.test`, `legacy.test` or `.local` are the outdated ones.

**Consequences for the Proxy URL rules.** Rule 2 embeds the node's hostname as it stands; the earlier
domain-rewrite step is gone (`FR-P2-14`, `FR-P2-19`). Short-name extraction strips the
other known domains (`.campus.test`, `.legacy.test`, `.local`) as well as `.atrium.test`, and a hostname carrying no `bc<floor>-<n>` /
`rly<floor>-<n>` pattern still falls to the manual path (`FR-P2-14a`).

**Existing records.** The suffix changed from `campus.test` to `atrium.test` in v2.38, the domain the Campus Hub hostnames
already used. Seed building controller and Relay hostnames were moved onto it, keeping their short name
(`meds-bc101.campus.test` → `meds-bc101.atrium.test`, `meds-rly1-1.legacy.test` →
`meds-rly1-1.atrium.test`). Two building controllers are deliberately left on other domains to demonstrate the
outdated flag: `hlsd-bc104.campus.test` and `meds-bc501.local`. The master Campus Hub `hub.atrium.test` is valid
because it ends in the suffix. A few Campus Hubs on other domains (`hub-lab01.campus.test`, `hub-lab02.campus.test`) read as outdated.

**Still not modeled:** the **short-name** half of the naming convention (`<campus>-bc<floor>-<n>` / `<campus>-rly<floor>-<n>`).

---

## Editable IP Address (September 2026)

### FR-P2-22: IP Address Is Editable on the Side Panels

IP Address is an **editable field on all three details side panels** — Building Controller, Campus Hub and Relay — and
is no longer part of the read-only info grid on any of them. It sits **directly under Hostname**, the
same order as the Create New Node form. _(Supersedes the `FR-LS-03` rule that locked the IP address after
initial submission.)_

**Validation** (identical to the Create New Node form, per §9.1):

- **Required** — an empty IP Address shows "Enter IP Address" on blur; Save stays disabled, and a
  Save-time backstop focuses the field and raises the toast "IP Address is required.".
- **Format** — the value must be a valid IPv4 address (four octets, each 0–255). An invalid value shows
  "Enter a valid IP Address" and blocks the save.
- **Unique** — the IP is checked against every existing node (building controllers active/archived/
  faculty-less, Campus Hub, Relay). A clash shows "IP Address already in use" inline plus the toast "IP Address
  already in use. Please, try again with a different IP Address." The node being edited is excluded
  from its own check.

**Dirty state** — IP Address participates in the standard Save / Discard model (§9.4). Save writes it to
every copy of the node. Nothing references a node by IP, so no propagation is needed; the
Associated Campus Hub sections on the Building Controller and Relay panels read the new IP the next time they render.

---

## Moving Nodes Between Campuses (September 2026)

### FR-P2-23: Move a Building Controller or Campus Hub to Another Campus

An **active Building Controller** or **Campus Hub** can be moved to another campus. The Manage dropdown on its
details panel gains a **Move** group with one item, **To available Campus**, placed before the Archive
group so the destructive action stays last. Archived nodes are not movable: their menu stays
Unarchive-only, so unarchive first. Relays are not covered.

_(Supersedes the rule that a node's campus cannot change after creation — `FR-LS-03`, §5.3, §9
"Immutable fields". The campus is still not editable on the side panel; Move is the only way to change it.
`§2.1` lists campus-to-node association as in scope: Campus Master Data supplies the list of campuses, and the
association itself is Atrium's.)_

**Which campuses are available.** Only campuses **selected in the header and visible in the tree**, except
the one the node is on. The item is **disabled** (still listed, with the reason as a tooltip), and
checked in this order, when:

| Condition | Tooltip |
|---|---|
| Building controller scheduled for a Timetable Release (`FR-DS-07`) | "Cancel the scheduled Timetable Release before moving." |
| Campus Hub with any associated building controller (active or archived — unlike the `FR-P2-15` archive gate, which ignores archived ones) **or any non-archived Relay** on it. Only a NORT Campus Hub may serve other campuses, so a move would strand them. | "Remove all associated Building Controllers and Timetable Relays before moving." |
| No other campus is selected in the header | "Select another campus in the Campus filter to move this node." |

**The drawer.** Move opens the **Create New Node drawer in move mode**, the same pattern as unarchive mode
(`FR-DS-06`): only the node's section is shown, its toggle header is hidden, the title reads
**"Move `<Building Controller | Campus Hub>` from `<current campus>`"**, and the primary button reads **Move**. The
close confirmation reads **"Stop Moving"**, with a **Keep Moving** button in place of "Keep Creating". The **Campus** field is shown and required (`UX-04a`). Until a
campus is picked, the rest of the form is dimmed and Save is disabled.

**What is prefilled.** Everything the campus does not affect is prefilled from the node and stays
editable under the Create form's validation (§9.1):

- **Building Controller:** Node Type, Hostname, IP Address, Description, Location, Energy Saver, Exam Lockdown.
- **Campus Hub:** Hostname, IP Address, Description, Location.

**What the campus change resets (Building Controller).** These fields are settled each time a target campus is
picked:

- **Campus Hub Association** is kept **only if it is a NORT Campus Hub**, because every campus's Campus Hub list includes
  NORT. A local Campus Hub belongs to the old campus, so the field starts empty.
- **Proxy URL** is kept only when the Campus Hub is kept. It derives from the Campus Hub (`FR-P2-14`), so otherwise
  it starts empty and fills in automatically once a Campus Hub is picked on the new campus (`FR-P2-25`), or is
  entered by hand. It stays required.
- **Faculties** are re-listed for the target campus. The building controller's current faculties are pre-selected where
  the target campus has them **and** the selected Campus Hub grants them (`FR-P2-18`); the Create form's
  default faculties are **not** applied.
- **Relay Association** starts empty, because Relays belong to a campus. **Alert** starts off
  and stays available (`FR-LS-05`).

**Validation.** Same required, format and duplicate checks as unarchive. The node's own current
hostname and IP never count as a clash.

**On Move:**

- **Building Controller:**
  - A hostname edit is propagated first (`FR-P2-13`).
  - The building controller leaves its Relay (if any) and its old Campus Hub's building controller list.
  - Every stored copy on the old campus is removed.
  - It is re-created on the new campus under the **same Node ID**, once per selected faculty, or in the
    faculty-less bucket when none is selected (`FR-LS-09a`). Its faculty history (`everAssociated`) is reset to the faculties selected on the new campus. All other stored settings, Registry Sync
    included, are kept.
  - The new Campus Hub lists it, and the selected Relay (if any) gains it.
- **Campus Hub:**
  - The record moves to the new campus with the same Node ID.
  - Its faculty grant keeps only the faculties the new campus has (`FR-P2-18`).
  - A hostname edit is propagated (`FR-P2-13`).

The drawer closes, the tree re-renders with the moved node selected (the target campus is in the
header, so it is visible), and a toast confirms: **"Building Controller moved to `<Campus>`"** /
**"Campus Hub moved to `<Campus>`"** (§9.2).

**Not modeled:** how the move reaches Campus Hub through sync-back, and its Asset Registry consequence (§10 item 1).

---

## One Relay per Building Controller (September 2026)

### FR-P2-24: A Building Controller Belongs to at Most One Timetable Relay

The Relay ↔ Building Controller relationship is **one-to-many**: a Relay serves many building controllers, and a building
controller has **zero or one** Relay. _(Supersedes the many-to-many rule — §9 "Relay multi-association",
`FR-CDN-03`, `UX-03` and the April 27, 2026 clarification.)_

Membership is still stored on the Relay record only: its building controller list, plus the nested copy the tree
renders (`FR-P2-17`). The rule is that no building controller appears on two Relays' lists. Every write path
enforces it:

| Where | Behaviour |
|---|---|
| **Building Controller side panel** | An editable **Relay Association** dropdown sits directly under Campus Hub Association. It offers `Not assigned` plus the non-archived Relays of the building controller's own campus on the Campus Hub **currently picked** in the Campus Hub dropdown. Changing the Campus Hub re-scopes the list live: a Relay not on the new Campus Hub falls back to `Not assigned`. On Save, the building controller leaves its old Relay and joins the new one; Discard restores the saved Relay. Alert Service is independent of the Relay association (`FR-LS-05`). |
| **Archived Building Controller** | An archived building controller is out of service and **cannot be associated with a Relay**. On its side panel the **Relay Association** dropdown is **disabled**, shows `Not assigned`, and an info note below the field reads "Archived Building Controllers cannot be associated with Timetable Relays." Unarchiving (`FR-DS-06`) makes the dropdown editable again. Consistent with the archive gate (`FR-P2-27`), which already requires the Relay association to be removed first, and with the Relay's **Manage → Building Controllers** list, which excludes archived building controllers. |
| **ASSOCIATED TIMETABLE RELAY section** | The read-only mirror of ASSOCIATED CAMPUS HUB, for the **saved** Relay: Hostname (navigates to the Relay), Proxy URL, IP Address, Node ID, Campus, Network Protocol, Description, Location. It is hidden when there is no Relay. |
| **Building Controller Manage menu** | **Manage → Timetable Relays** is removed. The dropdown replaces it. |
| **Create New Node form, Building Controller section** | **Relay Association (optional)** is a single dropdown filtered by the selected Campus Hub. It is locked to the new Relay when the Relay section is on, and to the pre-filled Relay when the form is opened from a Relay. |
| **Relay Manage → Building Controllers** | Building controllers already on **another** Relay are listed disabled, tagged with that Relay (`FR-P2-28`). |
| **Create form, Building Controller Association** | Building controllers already on **another** Relay are not offered. In Relay unarchive, the Relay's own building controllers stay listed. |
| **Move** (`FR-P2-23`) | The moved building controller leaves its old Relay and may join one Relay on the target campus. |

**Seed data.** The two failover Relays used to share building controllers with their primaries. Each pair is now
split: `meds-rly1-1` serves `meds-bc101` and `meds-bc102`, `meds-rly3-1` serves `meds-bc103`;
`rvrs-rly2-1` serves `rvrs-bc1-3` and `rvrs-bc2-3`, `rvrs-rly1-1` serves `rvrs-bc1-7`. A load-time pass also
keeps the first Relay for any building controller listed on more than one, so later seed edits cannot break the
rule.


## Requirement Changes (October 2026)

### FR-P2-25: The Proxy URL Updates Automatically

_Supersedes the **Generate** button of `FR-P2-14` / `FR-P2-19` (and the earlier v2.35 "select Generate"
wording of this requirement). The generation rules themselves are unchanged._

The Building Controller and Relay Proxy URL are built from the node's **Hostname** and its **Campus Hub Association**.
They now **follow those fields automatically**. There is no Generate button on the side panels or in the
Create New Node drawer (Create, Unarchive, Move).

- When the Hostname (on leaving the field) or the Campus Hub Association changes, the Proxy URL is re-derived and
  written into the field. When the Campus Hub section is on in the Create drawer, its Hostname is the source too.
- When the update **replaces an existing URL**, an orange warning appears under the field naming what
  changed it: "Proxy URL updated because the Hostname changed." / "…the Campus Hub changed." / "…the
  Hostname and Campus Hub changed." It stays until the URL is saved, discarded, typed over by hand or back
  to its loaded value. Filling an empty field shows no warning.
- The field stays **editable**. A URL typed by hand is kept until the Hostname or Campus Hub changes again.
- When the URL **can't be derived** (the hostname has no parseable `bc<floor>-<n>` / `rly<floor>-<n>` short name, or there is no Campus Hub), the
  old value is kept and is **outdated**. An orange warning shows under the field on the side panels and in the
  Create New Node drawer (Create, Unarchive, Move), and **Save stays available** (the field still holds a URL); the warning clears once the user types a new URL:
  - "Proxy URL is outdated and can't be generated from this Hostname. Enter it manually."
  - "Proxy URL is outdated. Select a Campus Hub to update it, or enter it manually." (no Campus Hub)
- A change that leaves the derived URL the same, or that is undone, does not make it outdated.
- **Renaming a Campus Hub affects the Proxy URL of every Building Controller and Timetable Relay connected to it** (active, archived,
  faculty-less building controllers included). On Save, a Building Controller or Timetable Relay whose Proxy URL is **generated** — exactly what the rules above produce
  for its Hostname and the old Campus Hub — gets the URL regenerated for the new Campus Hub hostname. Any other Building Controller or Timetable Relay
  that holds a URL (typed by hand, or on a hostname the generator can't parse) keeps it and is flagged
  **Proxy URL outdated**; one with no URL has nothing to flag.
- **After the rename, the user is told who needs a manual update.** When at least one Building Controller or Timetable Relay is flagged, a
  **warning toast** appears after the "updated" toast: "`<counts>` need(s) its Proxy URL updated
  manually." (for example "1 Building Controller and 1 Timetable Relay need its Proxy URL updated manually.") with a **Details** link. The toast follows the Asset Registry failure toast (`FR-P2-30`): regular weight, no
  "Warning:" label, no icon, a larger close icon. It stays on screen until closed or used. The link opens a modal,
  "Proxy URLs to update", with an intro line and a table of those nodes (**Type**, **Node**, **Campus**, **Current Proxy URL**)
  and two buttons: **Copy list** (tab-separated text with a header row, ready for a spreadsheet) and **Close**.
  Nothing is shown when no node needs it. The same toast follows a Campus Hub rename made by Unarchive or Move.
- **A flagged Building Controller or Timetable Relay** keeps the flag on its record. Its panel shows, under Proxy URL, "Proxy URL is
  outdated because the Campus Hub hostname changed. Enter it manually." and **Save stays disabled** until the
  URL is changed (or regenerated by changing the Hostname or Campus Hub). Saving a different URL, or a Move /
  Unarchive that writes a new one, clears the flag. The tree shows no marker for it.
- While the Campus Hub Hostname differs from the saved one, an orange warning under the field says so: "Changing
  the Hostname changes the Proxy URL of the connected Building Controllers." (or "…connected Timetable Relays." / "…connected Building Controllers and Timetable Relays.", naming what is connected; no count; the counter is only in the
  Save confirmation). It replaces the format hint, gives way to a Hostname error (§9.1), and shows only when at least
  one Building Controller or Timetable Relay is on the Campus Hub. It clears on Save, Discard, or when the saved hostname is typed back.
- **Save asks first.** Clicking **Save** with a changed Campus Hub Hostname and at least one connected Building Controller or Timetable Relay
  opens a confirmation popover (titled "Change Hostname"). It opens immediately, with no loading state, and shows an orange warning, "Changing the hostname changes
  the Proxy URL of **N** Building Controllers and **M** Timetable Relays connected to this Campus Hub. Those whose Proxy URL isn't generated
  automatically must be updated manually." The counter sits in the warning text and does not separate
  generated from manual URLs. There is no list of hostnames. Only the kinds that are connected are named.
  **Keep Editing** closes the popover and leaves the edit unsaved; **Yes, Save** saves. With no connected
  Building Controller or Timetable Relay there is nothing to confirm and Save goes straight through.
- **The master Campus Hub (`hub.atrium.test`) is never confirmed.** Renaming it saves straight through, with no
  "Change Hostname" popover, even though it has connected Building Controllers. The Proxy URL rules above still apply.
- An Unarchive / Move prefill keeps the stored URL as-is. It re-derives only when a source field changes.

### FR-P2-26: Unarchiving a Node Whose Campus Hub Is Archived

A Building Controller (or Timetable Relay) being unarchived may point at a Campus Hub that has since been archived too.

- The Campus Hub Association dropdown shows that Campus Hub as a **disabled** option labelled `<hostname> (Archived)`,
  selected, so the user sees the old association but can't pick it again.
- The field shows the error **"Campus Hub `<hostname>` is archived. Select another Campus Hub or unarchive it first."**
  and **Unarchive stays disabled** until an active Campus Hub is selected.
- If the unarchive request is still sent and the server rejects it, its error message is shown as an error toast and the form stays open.
- Seed data: the archived `hlsd-bc001-old` building controller and the archived `hlsd-rly1-2` Relay both point at the
  archived `hlsd-hub-old` Campus Hub.

### FR-P2-27: Archive Blocks — Master Campus Hub and Relay ↔ Building Controller

The Manage menu's **Archive** item is disabled, with a tooltip giving the reason, when:

| Node | Condition | Tooltip |
|---|---|---|
| Campus Hub | It is the master Campus Hub `hub.atrium.test` — never archivable | "hub.atrium.test is the master Campus Hub and can't be archived." |
| Campus Hub | It still has associated **active** Building Controllers or active Timetable Relays (`FR-P2-15`). Archived ones don't block | "Remove all associated Building Controllers and Timetable Relays before archiving." |
| Relay | It has associated Building Controllers (Relay → Building Controller) | "Remove the associated Building Controller / all N associated Building Controllers before archiving." |
| Building Controller | It has a Timetable Relay association (Building Controller → Relay) | "Remove the Timetable Relay association (`<relay>`) before archiving." |

The Timetable Release block on building controllers (`FR-DS-07`) is unchanged. The same check runs again when archiving
is confirmed.

### FR-P2-28: Relay Manage → Building Controllers Shows Building Controllers on Another Relay, Disabled

_Amends `FR-P2-24`, which hid them._ The Relay's **Manage → Building Controllers** list now shows every non-archived
Building Controller on the Relay's Campus Hub, including the ones that already belong to a **different** Timetable Relay.

- Those rows are **disabled** (they can't be checked, and Select All skips them). Each one is tagged with
  the name of the Timetable Relay it belongs to.
- When any are present, a note at the top of the list says: "A Building Controller belongs to one Timetable Relay. Building
  Controllers tagged with another Timetable Relay can't be added until they are removed from it."
- The menu item is disabled only when the Campus Hub has no non-archived Building Controllers at all ("There are no
  Building Controllers on `<campus hub>`."). The Create form's Building Controller Association still hides them.


### FR-P2-29: Building Controller Archive Popover Checks Attached Devices

Opening **Archive** on a Building Controller first shows a loading indicator ("Checking attached devices…") in the
popover body, with the **Archive** button disabled until the check returns. Then:

- **Devices attached:** an orange warning above the usual copy says devices exist, without a count: "This Building
  Controller has devices registered to it." (The check returns only whether any exist.)
- **Check failed:** an orange warning says "Failed to check this Building Controller's devices. You can still archive
  it."
- **No devices:** the usual copy only.

The confirmation copy mentions "This will turn off Registry Sync." only when Registry Sync is on. The buttons
read **Keep `<Type>`** (Keep Building Controller / Keep Timetable Relay / Keep Campus Hub) and **Yes, Archive**, matching
the close-confirmation pattern (`FR-DS-06`, `FR-P2-23`).

Devices never block archiving; **Archive** is enabled in every outcome. Campus Hub and Relay archive are unchanged.
Prototype data: `nort-bc1-2` and `bio-bc05-1` (devices registered), `phys-bc03-1` (check fails).

### FR-P2-30: Asset Registry Host Removal Can Be Refused

Asset Registry can refuse to remove a Building Controller's host, for example while devices registered on it are not retired. Atrium
never retires devices on its own. Every action that removes the host checks this first, and a refusal leaves
**everything unchanged**, with an **error toast of two lines**, the first in **bold**:

> **Unable to `<action>`, Registry Sync change was not successful.**
> `<server error message>`

`<action>` is **archive**, **disable Registry Sync** or **change the hostname**. The second line is the
message the node returns, shown as-is (the prototype shows the literal text `<server error message>`).

| Action | On refusal |
|---|---|
| Turn Registry Sync off on the Building Controller panel | Not saved; Registry Sync stays on |
| Archive a Building Controller with Registry Sync on | Popover closes, the building controller stays active with Registry Sync on |
| Change the hostname of a Building Controller with Registry Sync on (the host is deleted and re-created) | Not saved; the form keeps the unsaved edit |
| Turn Registry Sync off in bulk or from a Campus | Each node is handled independently: the others are disabled, and the refused ones are reported together in one warning toast, "Unable to update N Building Controllers Registry Sync status", with a **Details** link (below) |

**Bulk and Campus changes.** The warning toast is plain, like the `FR-P2-25` toast: regular weight, no "Warning:" label, no icon, a larger close icon, and it stays until closed or used. **Details** opens a modal with the same title and a red error icon, an intro line ("Asset Registry refused the change for these Building Controllers, so they were left as they were. The other selected Building Controllers were updated."), a sortable table (**Building Controller**, **Campus**, **Details** — the server's error message) and two buttons, **Close** and **Copy list** (tab-separated text). The success toast "Registry Sync applied to N Building Controllers" counts only the nodes written, and is not shown when every node was refused. On the panel and in bulk the Timetable Release check (`FR-P2-04`) runs before Asset Registry is asked.

A node with Registry Sync already off has no host to remove, so it is never refused. This is independent of
the Building Controller devices warning on the archive popover (`FR-P2-29`), which never blocks.

Prototype data: `lab-bc01-1` (active, faculty-less, Registry Sync on). With no faculty its hostname is editable, so all
three actions can be shown on it.
