# Atrium Module Knowledge Base (Portfolio)

One document per topic, each merging every source that describes it: the shipped client, the user guide, and the DaVinci prototypes and requirements docs. This portfolio carries the three topics that match its prototypes.

**3 topics.**

**Start with [../system-overview.md](../system-overview.md)** if you're new: what Atrium is, the systems it sits between, and how the client is built. [../glossary.md](../glossary.md) holds the shared vocabulary.

**Layer key:** `client` = shipped, in the client domain docs · `guide` = a user-guide topic · `prototype` = a DaVinci prototype · `requirements` = a versioned spec alongside the prototype.

---

## Devices

| Topic | What it covers | Layers |
|---|---|---|
| [manage-devices.md](manage-devices.md) | Registering, viewing and retiring Devices (projectors, microphones, door readers, room panels) at a Campus across two disjoint modes (IT-managed, Faculty-registered), with XLSX and manual registration. Notes the deprecated, hidden Approve/Reject capability | client · guide · prototype · requirements |

## Infrastructure

| Topic | What it covers | Layers |
|---|---|---|
| [manage-infrastructure.md](manage-infrastructure.md) | ⚠️ **Design-only.** Managing campus infrastructure in Atrium: Building Controllers, Campus Hubs and Timetable Relays per campus, details panel, Create Node drawer, Registry Sync cascade | prototype · requirements v2.44 |

## Device recovery

| Topic | What it covers | Layers |
|---|---|---|
| [device-recovery.md](device-recovery.md) | ⚠️ **Design prototype.** Registration status of IT-managed Devices' recovery profiles with the Room Booking Manager, the Send Recovery Request safety valve, and rolling out recovery versions (3-step wizard, schedule, history, XLSX import) | prototype · requirements |

---

## Shared context files

| File | State |
|---|---|
| [../glossary.md](../glossary.md) | Shared vocabulary |
| [../system-overview.md](../system-overview.md) | What Atrium is, the external systems, the platform split, and the client architecture |
| [../roles-permissions.md](../roles-permissions.md) | The three stacking gates, the `AuthContext` flag inventory, and a per-module gate table |
