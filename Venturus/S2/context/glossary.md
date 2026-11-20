# Atrium Glossary

Shared vocabulary across the [module knowledge base](module-knowledge-base/README.md). Aggregated from the Terms tables of the three topic files ([manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md), [manage-devices.md](module-knowledge-base/manage-devices.md) and [device-recovery.md](module-knowledge-base/device-recovery.md)), with conflicts resolved or flagged rather than averaged away.

For how the systems these terms name fit together, see [system-overview.md](system-overview.md).

Each entry links to the topic file that defines it most fully. Terms specific to a single module stay in that module's own Terms table — this file holds only what recurs, plus the terms whose meaning **shifts between modules**, which is where most of the confusion lives.

> ⚠️ **Read [Same word, different thing](#same-word-different-thing) before trusting a term you've seen in the other module.** A handful of Atrium terms mean slightly different things depending on whether you are managing infrastructure or devices.

---

## Campus hierarchy

The spine of the data model. Both prototypes hang off some part of it.

```
Campus  →  Faculty  →  Floor  →  Room  →  Room device
                                            ↑
                              Device (unassigned, at Campus level)
```

| Term | Meaning |
|---|---|
| **Campus** | Top level of the hierarchy; a physical Northfield University campus, identified by a short code: `NORT` (North), `HLSD` (Hillside), `MEDS` (Medical Sciences), `RVRS` (Riverside), `SOUT` (South). Owned by Campus Master Data. See [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |
| **Faculty** | An academic unit that owns rooms and equipment on a Campus (`ENG`, `SCI`, `MED`, `LAW`, `BUS`, `ART`, `LIB`, `ARCH`, `EDU`, `PSY`, `CHEM`, `MATH`, `PHYS`, `NURS`, `ECON`, `HIST`, `BIO`, `GEO`, `CS`, `MUS`). Three defaults also exist: `GENERAL`, `TEMPLATE` and `NONE` |
| **Floor** | A level of a building within a Faculty's space, for example "Science Block L2" |
| **Room** | A lecture hall, lab or library room, for example "Lecture Theatre A" or "TC-S3" |
| **Device** | A piece of AV or room-control hardware (projector, microphone, door reader, room panel), assignable to Rooms or unassigned at Campus level. Identified by its **Asset Tag**. Lifecycle in [manage-devices.md](module-knowledge-base/manage-devices.md) |
| **Room device** | A Device attributed to a Room in a Faculty. ⚠️ Only a device that is not yet `ACTIVE` can be retired |
| **Asset Tag** | The identifier printed on a Device: a type prefix (`PRJ` projector, `MIC` microphone, `DRD` door reader, `PNL` room panel), the campus code and a number, for example `PRJNORT1001` |
| **Server types** | `Standalone Campus` (needs its own local Campus Hub and a dedicated Timetable Relay), `Connected Campus` (uses the master Campus Hub; the Building Controller acts as its own Relay) and `Test Lab` (a lab controller that behaves like a Connected Campus). Only in [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |

## Nodes

A **Node** is the generic word for any of the three server kinds below. The UI says Node ID, Node Type and Show Archived Nodes, and the page is called **Manage Infrastructure**.

| Term | Meaning |
|---|---|
| **Building Controller** | The edge server in a building. It talks to the devices in its rooms, and pulls timetables and room policies from a Campus Hub. The primary subject of [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md). Short names follow `bc<floor>-<n>` (for example `bc1-3`) |
| **Campus Hub** | The central store for timetables and room policies: **one university master hub (`hub.atrium.test`) plus local hubs per campus** (`nort-hub`, `meds-hub`, `rvrs-hub`, `hlsd-hub`). A Standalone Campus needs a local hub |
| **Timetable Relay** (short form **Relay**) | The file-transfer node that mirrors timetable and firmware files to Building Controllers. Short names follow `rly<floor>-<n>`. A Building Controller has at most one Relay |
| **Node ID** | The numeric identifier Atrium assigns to a node. Kept when a node is moved to another Campus |
| **Proxy URL** | The URL through which Atrium reaches a Building Controller's API. Generated from the hostname and the associated Campus Hub (path `/campus/`), and editable. See [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |
| **Hostname rule** | Hostnames must end with `atrium.test`. Legacy hosts on `campus.test`, `legacy.test` or `.local` show a **Hostname outdated** warning |
| **Exam Lockdown controller** | A Building Controller with the Exam Lockdown setting on, which restricts room devices during assessments. A per-controller checkbox |
| **Energy Saver** | A per-controller checkbox that lets rooms power devices down when idle |
| **Alert Service** | A per-controller switch (default OFF) that raises device alerts. Independent of whether the controller has a Relay |
| **Bridge Service** | A switch on a Campus Hub that enables SQL replication |

## External systems

| Term | Meaning |
|---|---|
| **Asset Registry** | System of record for Devices — owns status, certificates and the device type field. Also the target of the **Registry Sync** toggle on a Building Controller |
| **Room Booking Manager** | The system where IT-managed Devices are born; also owns campuses, faculties, floors and rooms for IT-managed Devices. ⚠️ Also acts as an **external permission authority** — see [Same word, different thing](#same-word-different-thing) |
| **Campus Master Data (CMD)** | Source of truth for campuses, faculties and rooms. Atrium reads from it and validates against it |
| **Proxy Manager** | `proxies.legacy.test` — the legacy proxy-URL manager that [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) is designed to replace |
| **Atrium Access** | `access.atrium.test` — the permission system controlling which faculties a user can access. ⚠️ A gate **separate from** the Atrium role — both must pass |
| **Directory group** | The directory group `atrium-admins` governs Campus IT Admin membership; it is managed outside Atrium |

## Device types and Registry Sync

Atrium runs two mutually exclusive views of the device list, toggled from the top navigation bar (the pill reads **Registered** / **Managed** in the navbar).

| Term | Meaning |
|---|---|
| **IT-managed** | Device type value `Managed` in code. Devices created by central IT, born in Room Booking Manager, sourced from Asset Registry and complemented by Room Booking Manager. Born `READY` |
| **Faculty-registered** | Device type value `Registered` in code. Devices an AV Technician registers for a Faculty, approved by a Faculty Coordinator, sourced from Asset Registry and complemented by the Building Controller that serves the room (Faculty, Floor, Room and Device IP) |
| **Mode toggle** | The navbar control selecting between them. ⚠️ Switching **resets the current view, filters and any in-progress operation** |
| **Registry Sync** | The per-Building-Controller toggle that keeps the controller's devices in step with Asset Registry. Cascades from the Campus level. Turning it off can be blocked by a scheduled Timetable Release, or refused by Asset Registry itself |
| **Show Archived Nodes** | Filter that reveals archived nodes in the Manage Infrastructure tree |

### Device statuses

| Status | Meaning |
|---|---|
| **PENDING APPROVAL** | Registered, awaiting a Faculty Coordinator's approval. The approve/reject workflow is deprecated in the Manage Devices prototype (buttons hidden, logic retained) |
| **READY** | Approved and waiting to be provisioned. IT-managed devices are born here |
| **PROVISIONED** | Certificates issued; device not yet reporting. Happens outside Atrium |
| **ACTIVE** | In service and reporting. Cannot be retired |
| **RETIRED** | Taken out of service. A soft delete: the record stays |

`READY → PROVISIONED → ACTIVE` happens outside Atrium; the UI actions are Approve, Reject and **Retire**. In the sample data Faculty-registered devices use only `ACTIVE`, `READY` and `RETIRED`.

## Device recovery

Defined most fully in [device-recovery.md](module-knowledge-base/device-recovery.md).

| Term | Meaning |
|---|---|
| **Device Recovery** | The page (folder `device-recovery/`) that shows whether each IT-managed Device has its recovery profile registered with the Room Booking Manager and rolls out recovery versions to Registered Devices. Faculty-registered Devices are out of scope |
| **Recovery profile** | A Room-level setting copied onto its Devices: Standard, Extended, Not set or No access. Not set and No access mean the Device cannot be registered |
| **Recovery version** | A numbered package of recovery data imported from an XLSX file (v12 latest, v11, v10 in the sample data). The version installed on a Device is that of its last successful roll-out |
| **Recovery request** | The action **Send Recovery Request**: asks the Room Booking Manager to register a Device again. A safety valve for a status that looks stuck; the Room Booking Manager normally registers and retries by itself |
| **Roll out** | Pushing a recovery version to Registered Devices, immediately or on a schedule, through a 3-step wizard (Select a version, Select devices, Proceed to roll-out). Roll-out entries are Rolled out, Failed, Scheduled or Rolling out |
| **Device recovery statuses** | Registration: Registered, Queued, Re-register, Failed, Not registered and Unavailable. Counter cards group them as Need attention (Failed), Not registered yet, In progress, Cannot register, Registered and Unavailable. Distinct from the [Device statuses](#device-statuses) lifecycle |

## Configuration & release

| Term | Meaning |
|---|---|
| **Timetable Release** | A scheduled publication of timetable data to a Building Controller. ⚠️ While a controller is scheduled for one it cannot be archived, moved to another Campus, or have Registry Sync turned off until the release is cancelled |
| **Archive / Unarchive** | Taking a node out of service without deleting it, and restoring it. Archiving turns Registry Sync off; unarchiving restores it off |
| **Move** | Re-homing a Building Controller or Campus Hub to another Campus, keeping its Node ID |
| **Override** | A value set at a specific level, taking precedence over the inherited or default value |
| **Inherit** | A level receiving a setting's value from a parent level rather than having it explicitly set |

## Roles

Fully described in [roles-permissions.md](roles-permissions.md).

| Term | Meaning |
|---|---|
| **Campus IT Admin** | Full-access role. Membership is managed **externally**, via the directory group `atrium-admins`. Live prototype persona (Maya Okafor) |
| **AV Technician** | Registers devices per room |
| **Facilities Manager** | Owns the physical rooms and floors |
| **Faculty Coordinator** | Approves Faculty-registered devices for a Faculty |
| **Help Desk** | First-line support; looks things up |
| **Viewer** | Default read-only role. Live prototype persona (Daniel Reyes) |

## Formats & conventions

| Term | Meaning |
|---|---|
| **CSV export** | Manage Infrastructure exports the building controllers currently shown in the tree; Manage Devices exports a template or the data |
| **Inline edit** | Direct editing within a panel or table, rather than in a drawer or modal |
| **Tree view** | The hierarchical navigation panel on the left of Manage Infrastructure (Campus → Building Controllers, Campus Hubs, Timetable Relays) |
| **Bulk mode** | Always-on multi-selection in the Manage Infrastructure tree (Cmd/Shift click) for cascading Registry Sync changes |
| **Node details panel** | The context-aware right-hand panel showing the selected node |

---

## Same word, different thing

The terms most likely to mislead. In each case both usages are current and correct in their own module.

### Room Booking Manager

| Usage | Meaning | Where |
|---|---|---|
| Room manager | Owns campuses, faculties, floors and rooms for IT-managed Devices; the IT-managed complement for Devices | [manage-devices.md](module-knowledge-base/manage-devices.md) |
| Permission authority | An **external permission system** granting editor, admin or viewer access — applied by that system, not by Atrium | [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |

Same system, two roles in Atrium's world: a data source and a permission authority.

### Registry Sync

| Usage | Meaning | Where |
|---|---|---|
| Per-controller toggle | Switch on a Building Controller's side panel | [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |
| Campus cascade | The Campus toggle that sets every non-archived Building Controller on that Campus | [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) |
| Registry (the system) | The Asset Registry that the toggle talks to and that may refuse the change | [manage-devices.md](module-knowledge-base/manage-devices.md) |

### Faculty-registered / IT-managed

Both name a **platform**, and are used interchangeably as a *mode* and a *Device type*. Which one is meant is usually clear from context, but the mode is global (the navbar pill) while the type is a property of each Device.

### Node

In the UI a Node is any Building Controller, Campus Hub or Timetable Relay. In older sources and in code identifiers the same objects are still called servers (`lineServer`, `ghdsAssociation` and similar), and those identifiers stay as they are.

---

## Spelling variants

All of these appear in current sources. None is wrong; expect all of them when grepping.

| Canonical | Also written |
|---|---|
| Building Controller | Building controller, controller, `lineServer` (code identifier) |
| Campus Hub | Hub, `ghdsAssociation` (code identifier for the association field) |
| Timetable Relay | Relay |
| Registry Sync | Asset Registry sync, `fsnApiCalls` (code identifier) |
| IT-managed | Managed (device type value) |
| Faculty-registered | Registered (device type value) |

---

## Terms deliberately not here

- **Module-specific vocabulary** stays in each topic file's own Terms table — the orphan bucket and association drawers (servers), the Add Devices wizard steps and the Device status lifecycle (devices), and so on.
- **Withdrawn or deprecated terms** are recorded where they died, with the reason: `PENDING APPROVAL` and the approve/reject workflow in [manage-devices.md](module-knowledge-base/manage-devices.md).
- **Roles beyond the two live personas** — see [roles-permissions.md](roles-permissions.md) for the full role list and what the prototypes implement.

---

## Maintaining this file

A term belongs here when it appears in **both** topic files, or when its meaning shifts between them. Everything else stays local.

When adding a topic: put its vocabulary in that file's Terms table first, then promote anything that collides with or duplicates an entry here — and if it collides *in meaning*, add it to [Same word, different thing](#same-word-different-thing) rather than picking a winner.
