# Error Cases — Manage Infrastructure

Hidden error, blocked and warning states: the ones that only appear for a specific seeded server or a
non-obvious sequence. Ordinary inline validation (an empty required field, a bad IP) is not listed.

**Shortcut for every flow:** type the hostname in the tree search box and pick the result. It widens whatever
filter was hiding the server (campus, Show Archived Nodes, Registry Sync filter), so you never need to set filters by hand.
**Manage** is the button on the details panel of the selected server.

_To add a case:_ one `###` block with the message the user sees and a numbered **Flow**. Keep the hostnames
exact, and re-check the flow after changing seed data in `js/config-data.js`.

---

## Asset Registry refusal (FR-P2-30)

The Asset Registry can refuse to remove a Building Controller's host. Seed: **`lab-bc01-1.atrium.test`** (NORT, active,
faculty-less, Registry Sync on). Nothing is saved in any of these. The seed lives in the faculty-less set of `js/config-data.js`.

Message, always two lines (the first bold):

> **Unable to `<action>`, Registry Sync change was not successful.**
> `<server error message>`

### Archive
1. Search `lab-bc01-1.atrium.test` and select it.
2. **Manage → Archive → Building Controller**, then **Yes, Archive**.
3. The popover closes, the toast says "Unable to archive…", the server stays active with Registry Sync still on.

### Disable Registry Sync on the panel
1. Select `lab-bc01-1.atrium.test`.
2. Turn **Registry Sync** off in the Configuration section, then **Save**.
3. Toast "Unable to disable Registry Sync…". The toggle stays as edited, nothing is saved.

### Change the hostname
1. Select `lab-bc01-1.atrium.test` (its Hostname is editable only because it has no faculties).
2. Change the Hostname to another valid `….atrium.test` name, then **Save**.
3. Toast "Unable to change the hostname…". The form keeps the unsaved edit.

### Bulk change
1. Select `lab-bc01-1.atrium.test`, then Cmd/Ctrl-click (or Shift-click) at least one other Building Controller in the tree that has Registry Sync on.
2. Turn **Registry Sync** off in the bulk panel and **Save**.
3. Registry Sync is turned off on the others ("Registry Sync applied to N Building Controllers"). The refused ones are not changed
   and are reported in one orange warning toast, "Unable to update N Building Controllers Registry Sync status", with a **Details** link (plain text: no "Warning:" label, no icon).

### Multiple failures in one bulk change
Seeds (NORT, no faculty, Registry Sync on, all on `.atrium.test`): `lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3` and `lab-bc02-1` are refused by the Asset Registry; `lab-bc02-2` and `lab-bc02-3` are accepted.
1. Select `lab-bc01-1.atrium.test` and Cmd/Ctrl-click the other five (or Shift-click the range).
2. Turn **Registry Sync** off and **Save**.
3. A success toast reports 2 Building Controllers, and a warning toast reports "Unable to update 4 Building Controllers Registry Sync status".
4. Click **Details**: the "Unable to update N Building Controllers Registry Sync status" dialog (red error icon, intro line, sortable columns) lists each refused Building Controller with its
   campus and "<server error message>" under **Details**. **Close** is secondary, **Copy list** primary. **Copy list** copies the table as tab-separated text.

### Campus cascade
1. Select the **NORT** campus node.
2. Turn **Registry Sync** off in its Configuration section, then **Save**.
3. Registry Sync is turned off on every NORT Building Controller except the refused ones (`lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3`, `lab-bc02-1`), which are
   reported in the same warning toast and details dialog.

---

## Archive popover: devices check (FR-P2-29)

Opening **Manage → Archive → Building Controller** first shows "Checking attached devices…" with **Yes, Archive**
disabled (about one second). Archiving is never blocked by the result.

### Devices registered
1. Search `bio-bc05-1.atrium.test` (or `nort-bc1-2.atrium.test`) and select it.
2. **Manage → Archive → Building Controller**.
3. After the loader, an orange warning: "This Building Controller has devices registered to it." **Yes, Archive** works.

### Devices check failed
1. Search `phys-bc03-1.atrium.test` and select it.
2. **Manage → Archive → Building Controller**.
3. After the loader: "Failed to check this Building Controller's devices. You can still archive it."

---

## Archive and move blocked (FR-P2-15, FR-P2-23, FR-P2-27, FR-DS-07)

The menu item is rendered disabled and the reason shows as its tooltip. Hover it.

### Master Campus Hub
1. Select `hub.atrium.test` (Campus Hub, NORT).
2. **Manage →** Archive → Campus Hub is disabled: "hub.atrium.test is the master Campus Hub and can't be archived."

### Campus Hub with active Building Controllers or Relays
1. Select `hub-lab01.campus.test` (or `rvrs-hub.atrium.test`).
2. Archive → Campus Hub is disabled: "Remove all associated Building Controllers and Timetable Relays before archiving."
   Move → To available Campus is disabled with the matching "…before moving." text.

### Relay with Building Controllers
1. Select `rvrs-rly2-1.atrium.test` (Relay, RVRS).
2. Archive → Timetable Relay is disabled: "Remove all 2 associated Building Controllers before archiving."

### Building Controller on a Relay
1. Select `rvrs-bc1-3.atrium.test` (RVRS), which is on the Relay `rvrs-rly2-1.atrium.test`.
2. Archive → Building Controller is disabled: "Remove the Timetable Relay association (rvrs-rly2-1.atrium.test) before archiving."

### Archived Building Controller and Relay Association
1. Turn on **Show Archived Nodes**, select `rvrs-bc9-1-old.atrium.test` (an archived Building Controller, RVRS).
2. The **Relay Association** dropdown is disabled, shows "Not assigned", and the note below it reads
   "Archived Building Controllers cannot be associated with Timetable Relays."

### Scheduled Timetable Release
1. Select `rvrs-bc1-3.atrium.test` (RVRS).
2. Move → To available Campus is disabled: "Cancel the scheduled Timetable Release before moving."
   (Move needs another campus selected in the header Campus filter, or it says "Select another campus…" first.)
3. The archive version, the toast "This Building controller is scheduled for Timetable Release. Cancel the deploy before
   archiving.", is hidden behind the Relay rule above for this server and has no seeded example of its own.

### Campus Hub served only by archived Building Controllers (allowed)
1. Turn on **Show Archived Nodes**, select `rvrs-hub2.atrium.test` (RVRS).
2. Its ASSOCIATED BUILDING CONTROLLERS list shows `rvrs-bc9-1-old.atrium.test` and `rvrs-bc9-2-old.atrium.test`, each with the **Archived** tag.
3. Archive → Campus Hub is enabled, because archived Building Controllers don't block.

---

## Unarchive with an archived Campus Hub (FR-P2-26)

### Building Controller
1. Turn on **Show Archived Nodes**, select `hlsd-bc001-old.atrium.test` (HLSD).
2. **Manage → Unarchive → Building Controller**.
3. The Campus Hub Association shows `hlsd-hub-old.atrium.test (Archived)`, disabled and selected, with the error
   "Campus Hub hlsd-hub-old.atrium.test is archived. Select another Campus Hub or unarchive it first."
   The unarchive button stays disabled until an active Campus Hub is picked.

### Timetable Relay
1. Turn on **Show Archived Nodes**, select `hlsd-rly1-2.atrium.test` (HLSD).
2. **Manage → Unarchive → Timetable Relay**. Same error and behaviour as above.

---

## Hostname

### Hostname locked by faculties
1. Select any Building Controller that has faculties, e.g. `bio-bc05-1.atrium.test`.
2. The Hostname field is disabled; the note reads "Hostname cannot be updated when Building Controller contains
   associated faculties." Archived servers are never locked.

### Wrong suffix
1. Select `lab-bc01-1.atrium.test` (the editable one) and replace the Hostname with `lab-bc01-1.example.com`.
2. Click out of the field: "Hostname must end with atrium.test" and Save is disabled.
   A hostname equal to the suffix itself (`atrium.test`) is valid.

---

## Renaming a Campus Hub (FR-P2-25)

Renaming a Campus Hub affects the Proxy URL of every connected Building Controller and Timetable Relay. A generated URL follows the
new hostname; any other URL is kept and flagged. Seed: **`rvrs-hub.atrium.test`** (RVRS), with three Building Controllers:
`rvrs-bc1-3.atrium.test` and `rvrs-bc1-7.atrium.test` (generated URLs) and `rvrs-bc2-3.atrium.test` (a hand-typed URL), and Timetable Relays
`rvrs-rly2-1.atrium.test` (generated URL) and `rvrs-rly1-1.atrium.test` (a hand-typed URL; `rvrs-rly3-1.atrium.test` is archived but still counted).

### Confirmation (warning)
1. Select `rvrs-hub.atrium.test` and change its Hostname to another valid `….atrium.test` name; an
   orange note appears under the field.
2. Click **Save**: the **Change Hostname** popover opens at once (no loader) with the warning, "Changing the hostname
   changes the Proxy URL of **3 Building Controllers and 3 Timetable Relays** connected to this Campus Hub…". The counters
   are in the warning text; no list and no split between generated and manual URLs. **Keep Editing** leaves the edit unsaved.

### Master Campus Hub rename
1. Select `hub.atrium.test` and change its Hostname to another valid `….atrium.test` name.
2. Click **Save**: no popover opens and the rename saves at once.

### Alert toast and details modal after the rename
1. In the popover, click **Yes, Save**.
2. Two toasts appear: "Campus Hub updated." and an orange warning, "1 Building Controller and 1 Timetable Relay need
   its Proxy URL updated manually. **Details**" (regular weight, no icon or label; it stays until closed). `rvrs-bc1-3`, `rvrs-bc1-7` and
   `rvrs-rly2-1` were regenerated and are not listed.
3. Click **Details**: the "Proxy URLs to update" modal has a **Type** column (Building Controller / Timetable Relay) and
   lists `rvrs-bc2-3.atrium.test` and `rvrs-rly1-1.atrium.test` with their campus and current (old) Proxy URL. **Copy list** copies the table as tab-separated text.
4. Select `rvrs-bc2-3.atrium.test`: under Proxy URL, "Proxy URL is outdated because the Campus Hub hostname changed. Enter
   it manually." and Save is disabled until the URL is changed.

### Hostname outdated
1. Any server on a hostname outside `atrium.test` (for example `hlsd-bc104.campus.test`, HLSD) is orange in
   the tree (icon and name) and the header legend shows **Hostname outdated**.
