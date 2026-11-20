# Design Manage Devices - Faculty-registered mode

## Overview

The Manage Devices page supports an IT-managed / Faculty-registered toggle (device type values `Managed` and `Registered`). This document captures the discovery work for enabling the Faculty-registered option and describes the required changes on both the Atrium server and the Atrium client. Both modes use a Campus-only scope picker; Faculty-registered devices come from Asset Registry, with a Building Controller complement filling in the faculty / floor / room / device IP fields.
* * *

## Background

Atrium has no device storage of its own. It is an orchestration layer that queries external systems and merges data for presentation. The toggle on Manage Devices determines which type of devices are shown — both types are sourced from Asset Registry as the system of record:

* **IT-managed selected** → Atrium shows IT-managed devices (Asset Registry + Room Booking Manager)
* **Faculty-registered selected** → Atrium shows Faculty-registered devices (Asset Registry + Building Controller complement)

Devices in Asset Registry have a type field. IT-managed devices are always created through Atrium and always have a counterpart in Room Booking Manager (where the room / faculty / floor assignment is managed). Faculty-registered devices can be created through Atrium or directly on a Building Controller by an AV technician in the room; either way they are registered in Asset Registry before they appear in Atrium.
Room Booking Manager is exclusively an IT-managed concern. Faculty-registered devices never have Room Booking Manager counterparts; their faculty / floor / room / IP fields are supplied by the Building Controller as a complement to the Asset Registry record.
A campus can have multiple Building Controllers. Each Building Controller is an independent machine running its own controller application instance with its own database — Atrium fans out to all Building Controllers under the selected campus to gather the Building Controller complement.
* * *

## Current State — IT-managed Mode

### Data Sources

|Source	|Data provided	|
|---	|---	|
|Asset Registry	|Device list: asset tag, status, type, updated by	|
|---	|---	|
|Room Booking Manager	|Room / faculty / floor assignment (joined by asset tag via `device_config_id`)	|
|Room Booking Manager Room Stats	|Device IP address and last seen timestamp	|

### Data Flow (`UnitService.getUnitsByCampusName`)

1. Room Booking Manager `getCampus` → resolves `campus_config_id`
2. In parallel: Asset Registry `getDevices` + Room Booking Manager `getDevice` + Room Booking Manager `getRoomDevice`
3. Optional: Room Booking Manager RoomStats for Device IP and last seen
4. In-memory merge (`mergeUnits`): Asset Registry devices are the spine, Room Booking Manager data is joined by asset tag

### Known Issue

`mergeUnits()` does not explicitly guard the Room Booking Manager lookup to IT-managed devices only. Faculty-registered devices fall through naturally (no Room Booking Manager match found), but an explicit type check should be added. This should be addressed alongside this feature.
* * *

## Proposed Feature — Faculty-registered Mode

When the Faculty-registered toggle is selected on the Manage Devices page, Atrium should:

* Resolve all Building Controllers for the selected campus (no UI Building Controller picker)
* Fetch the Faculty-registered devices from Asset Registry for the selected campus
* For each device, fan out requests to each Building Controller under the campus (via the controller device API `/public/api/testunit`) and merge the Building Controller complement (faculty / floor / room / device IP)
* Return a flat list of Asset Registry devices enriched with the Building Controller complement
* Never call Room Booking Manager

* * *

## Building Controller Device API Response (complement source)

The device endpoint returns a response with two top-level keys:

* `links` — array of individual device resource paths
* `data` — array of device objects

Each device object has `type: "testunit"` and an `attributes` object. Key fields used as the Building Controller complement for Faculty-registered devices:

|Field	|Description	|
|---	|---	|
|`AssetTag`	|Used to join with the Asset Registry device	|
|---	|---	|
|`facultyname`	|Faculty code (e.g. `"CS"`)	|
|`floorname`	|Floor name (e.g. `"Tech Centre L3"`)	|
|`roomname`	|Room name (e.g. `"TC-S3"`)	|
|`IPAddress`	|Device IP address	|
|`LastSeen`	|Last seen timestamp	|

Fields like `registrystatus`, `Username`, `TimePosted` are NOT consumed — status, Updated By, and Updated At come from Asset Registry (the system of record).
* * *

## Status Mapping

Status comes from Asset Registry for both modes. The shared lifecycle is:

|Status	|Meaning	|
|---	|---	|
|`PENDING APPROVAL`	|Registered in Asset Registry, awaiting approval (legacy; the approval workflow is deprecated and new devices skip this status)	|
|---	|---	|
|`READY`	|Registered via Atrium (both device types are born here), or approved (Approve: PENDING APPROVAL → READY)	|
|`PROVISIONED`	|Platform certificates issued (outside Atrium)	|
|`ACTIVE`	|Device certificates issued (outside Atrium); cannot be retired	|
|`RETIRED`	|Retire (and Reject) target	|

Note: `NOT REGISTERED` is no longer an Atrium-visible status — Faculty-registered devices that exist only on a Building Controller without an Asset Registry record are not surfaced in Atrium. The Faculty-registered sample data uses only `ACTIVE`, `READY` and `RETIRED`.
* * *

## Data Sources — Faculty-registered Mode

|Source	|Role	|When used	|
|---	|---	|---	|
|Asset Registry	|Primary — full device list (asset tag, status, type, Updated By, Updated At, etc.)	|Always	|
|---	|---	|---	|
|Building Controller (one or more under the campus)	|Complement — Faculty, Floor, Room, Device IP, Last Seen	|Always — fan out to all Building Controllers under the campus, merge by asset tag	|
|Room Booking Manager	|Not used	|Never	|

* * *

## Column Mapping — Faculty-registered Mode

|Column	|IT-managed source	|Faculty-registered source	|Notes	|
|---	|---	|---	|---	|
|Asset Tag	|Asset Registry `assetTag`	|Asset Registry `assetTag`	|Direct mapping	|
|---	|---	|---	|---	|
|Status	|Asset Registry `status`	|Asset Registry `status`	|See Status Mapping above	|
|Faculty	|Room Booking Manager `DEVICE_ASSIGNMENT.FACULTY`	|Building Controller complement `facultyname`	|	|
|Floor	|Room Booking Manager `DEVICE_ASSIGNMENT.FLOOR`	|Building Controller complement `floorname`	|	|
|Room	|Room Booking Manager `DEVICE_ASSIGNMENT.ROOM`	|Building Controller complement `roomname`	|	|
|Device IP	|Room Booking Manager RoomStats	|Building Controller complement `IPAddress`	|	|
|Last Seen	|Room Booking Manager RoomStats	|Building Controller complement `LastSeen`	|	|
|Updated by	|Asset Registry `user`	|Asset Registry `user`	|	|
|Updated at	|Asset Registry `createdAt`	|Asset Registry `createdAt`	|	|

Device Type column is not shown — the page toggle is the authoritative type indicator.

### Missing / unreadable Building Controller complement (Faculty-registered)

The Building Controller complement is filled in by the per-controller sync job after a device is registered with a Building Controller, so the five complemented columns can be empty. The table represents this in three ways:

* **Not yet assigned to a Building Controller** (`lineServer` empty, e.g. `MICNORT1401`–`PNLNORT1403`) → the five columns each render `-`.
* **Assigned but the complement is not yet fully reported** (Building Controller reachable, some fields present) → only the missing fields render `-` individually.
* **Assigned but the Building Controller is unreachable** (all five complemented fields empty, e.g. `PRJNORT1404`–`PNLNORT1407`) → the five columns collapse into a single cell reading *"Information cannot be read from Building Controller &lt;hostname&gt;"* with a red warning icon.

The column help tooltip on all five complemented columns reads *"Information provided by the Building Controller. Empty until the device is registered with a controller."*
* * *

## Actions — Faculty-registered Mode

|Action	|Applicable	|Condition	|Notes	|
|---	|---	|---	|---	|
|Add Devices	|Yes	|—	|See open question #1 — where to write the device (Asset Registry, Building Controller, both)	|
|---	|---	|---	|---	|
|Approve	|Deprecated	|`status = PENDING APPROVAL`	|Via Asset Registry approval API; hidden in the UI, logic retained in code	|
|Reject	|Deprecated	|`status = PENDING APPROVAL`	|Via Asset Registry approval API → RETIRED; hidden in the UI, logic retained in code	|
|Retire	|Yes	|`status` in `PENDING APPROVAL` / `READY` / `PROVISIONED`	|`ACTIVE` cannot be retired	|
|Download / Export	|Yes	|—	|Same as IT-managed	|
|Search	|Yes	|—	|By asset tag	|

* * *

## Scope — Campus-only (matches IT-managed)

The Faculty-registered scope picker is a single Campus dropdown — identical to IT-managed. Once a campus is selected, Atrium's backend automatically resolves all Building Controllers for that campus, fans out device requests to each Building Controller in parallel, and merges the Building Controller complement into the Asset Registry device list. There is no Building Controller selector in the UI.

* * *

## Server-Side Changes Required (Atrium server)

### 1. `ControllerRequestService.ts`

* Add `getTestUnits(lineServer)` method calling `GET /public/api/testunit`
* The Building Controller client infrastructure (auth, base URL, HTTP patterns) is already in place

### 2. `UnitService.ts`

* Add a new method (or extend `getUnitsBySiteName`) that, for Faculty-registered mode:
  - Loads Asset Registry Faculty-registered devices for the selected campus
  - Resolves all Building Controllers for the campus
  - Fans out `getTestUnits()` calls in parallel to each Building Controller
  - Merges the Building Controller complement into the Asset Registry device list (joined by asset tag)
  - Handles partial failures — define behaviour when one or more Building Controllers are unreachable (return partial results with a warning, or fail entirely)
* No Room Booking Manager calls
* Add explicit IT-managed type guard in existing `mergeUnits()` to enforce the implicit assumption

### 3. `UnitController.ts` / `UnitRoute.ts`

* Route `GET /devices` to the correct service method based on the source filter parameter
* The `filter[source]` query param already exists and is parsed by the controller

* * *

## Client-Side Changes Required (Atrium client)

### 1. `ManageUnitsContent.tsx`

* Import and consume `useConfigState()` from `ConfigContext`
* Pass `currentSource` to `useUnits` hook
* Campus selector drives everything — no Building Controller state is needed on the client

### 2. `useUnits.ts`

* Remove hardcoded `sourceType: [UnitType.MANAGED]`
* Forward the selected campus only — Building Controller resolution happens server-side

### 3. `ManageUnitsHeader.tsx` / Table columns

* Both modes share the same Campus cascader, table columns, and flat layout
* The Device Type column is hidden in both modes (the toggle is the type indicator)
* Status filter options use the shared Asset Registry lifecycle (READY → PROVISIONED → ACTIVE, plus RETIRED; legacy PENDING APPROVAL)

### 4. Add Devices wizard

* The wizard's **Type is locked to the active page toggle** — there is no Type picker (it adds no value here, since the page is already in a single mode). The modal title reflects only the Campus (`"Add Devices to <Campus>"`); the locked type is surfaced as a left-aligned footer note (info icon) in both steps: `"Devices added to this Campus will have the <Device Type> type."` (where `<Device Type>` is `Managed` or `Registered`)
* On the Add Manually tab, expose a single Campus picker (`proj-cascader`); the Upload File tab inherits the Campus from the page state
* Step 2 review table flags only **format errors** inline. "Already exists" (same-type or cross-type) is evaluated at commit time and surfaced as a toast — never inline
* Asset tag format: 8–14 alphanumeric characters, separated by commas, semicolons, spaces or line breaks; otherwise the row shows "Invalid asset tag (use 8–14 alphanumeric characters)."
* On commit, if the wizard's Campus differs from the page state, switch the page Campus so the newly-added devices land in the visible scope (Type is locked, so it never diverges)
* Closing the wizard via Cancel / X / Escape with pending input (file uploaded, manual asset tags, or Step 2 rows) opens a pop-confirm popover — **Keep editing** dismisses the popover; **Discard** closes the wizard

### 5. Toast notifications

* **Success toast on commit** (top-center, auto-dismiss): `"<N> Device<s> added to <Campus> on <Device Type>"` for the rows that actually committed
* **Error toast on commit** (red, one per side with conflicts): bold title `"Atrium couldn't register the devices"` + detail `"Selected device(s) already in use on <Type> Asset Registry."`
* When the error toast fires, the wizard stays open and the successfully-added rows are removed from the Step 2 list so the user can address what remains

### 6. Navbar toggle info

* Active toggle option shows a leading `info.circle` icon. Hovering the whole active option reveals a down-facing tooltip ~4px below the navbar:
  * Faculty-registered → "Devices being shown are Faculty-registered devices registered with Asset Registry."
  * IT-managed → "Devices being shown are IT-managed native, created in Room Booking Manager."

* * *

## Open Questions / Points to Validate

### 1. Add Devices write target in Faculty-registered mode

When a user creates a Faculty-registered device through Atrium, where should it be created?

* Asset Registry only (does the Building Controller pick it up automatically)?
* Building Controller only?
* Both the Building Controller and Asset Registry?

**Needs team validation before implementation.**

### 2. READY and PROVISIONED statuses in Faculty-registered mode

These Asset Registry statuses do not appear in the Building Controller sample data. Confirm whether Faculty-registered devices ever reach READY or PROVISIONED in Asset Registry, or if those are IT-managed-only states.
**Needs confirmation.**

### 3. Partial failure handling for multi-controller fan-out

When Atrium fans out to multiple Building Controllers under a campus and one is unreachable, should it:

* Return partial results with a warning indicating which Building Controller(s) failed?
* Fail the entire request?

**Needs team decision.**
