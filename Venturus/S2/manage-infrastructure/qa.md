# Q&A: Manage Infrastructure

Open design questions for the Manage Infrastructure prototype. Each one is either raised in `requirements.md` (section 10, Open Items, and the "Still not modeled" notes), or surfaced by comparing those requirements with what the prototype had to decide while it was built. The error flows referred to below are written up in `error-cases.md`.

**Type legend**: **Blocking**: implementation cannot start on that part without an answer. **Risk**: the current model may be wrong. **Gap**: the requirements are silent and the prototype had to guess.

**Vocabulary note.** The page manages three kinds of **Node**: **Building Controllers**, **Timetable Relays** (Relay) and **Campus Hubs**. A Building Controller has a **Node Type** of Standalone Campus, Connected Campus or Test Lab. Its devices are registered in the **Asset Registry**, which the **Registry Sync** toggle keeps in step. The master Campus Hub is `hub.atrium.test`.

> The details of the Proxy URL derivation rules (`FR-P2-14`, `FR-P2-19`) and the Create flow validation (section 9.1) are settled and are not asked again below. Only the places where they collide with other rules are.

* * *

## 1. Node model

### #1. Can the Node Type of a Building Controller change after creation? (Risk)

Node Type decides how a controller gets its timetables: a Standalone Campus controller uses a local Campus Hub and a dedicated Relay, a Connected Campus or Test Lab controller uses the master hub and acts as its own Relay (section 4.2). The Node Type select on the details panel is editable, and it counts as a dirty field (section 9.4).

* **Option A:** keep it editable and change nothing else (today).
* **Option B:** lock Node Type once the controller exists; a change means archive and re-create.
* **Option C:** keep it editable, but re-validate the Campus Hub Association and Relay Association on change and warn about what is dropped.

**Current behaviour:** Option A. Switching a controller from Standalone Campus to Connected Campus leaves its local hub and Relay association in place, so the stored record can contradict its own type.

### #2. Is the local Campus Hub really required for Standalone Campus? (Gap)

The Create form says a local Campus Hub is "Required for Standalone Campus campuses without existing Local Campus Hub", and the Relay note says only Standalone Campus controllers need a separate physical Relay. Nothing stops a Standalone Campus controller from pointing at the master hub: the seed record `hlsd-bc103.atrium.test` pairs `hub.atrium.test` with the Standalone Campus label.

* **Option A:** advisory only, as the form note reads (today).
* **Option B:** validate on save: Standalone Campus needs a hub other than `hub.atrium.test` and a Relay.
* **Option C:** drive it from the campus: a campus is Standalone once it has a local hub, and all its controllers inherit that.

**Current behaviour:** Option A. Only the Create form hints at it; the panel save does not check it.

### #3. Is one Relay per Building Controller the right limit? (Risk)

`FR-P2-24` says a controller belongs to at most one Relay. The Relay's Manage → Building Controllers list hides controllers that are already on another Relay, and the controller panel offers only Relays on the picked Campus Hub. To move a controller between Relays, the user must first detach it, then attach it elsewhere.

* **Option A:** keep the limit and the two-step move (today).
* **Option B:** keep the limit but let the list show controllers on another Relay with a "move here" action. `FR-P2-28` shows them disabled today.
* **Option C:** allow a primary and a standby Relay.

**Current behaviour:** Option A. An archived controller cannot hold a Relay at all, and it keeps counting against the Relay's archive gate until it is detached.

### #4. Who owns Exam Lockdown, Energy Saver and Alert Service? (Gap)

All three are Building Controller settings. Exam Lockdown and Energy Saver moved off the Campus Hub (section 5.2 note), and Alert Service is independent of the Relay (`FR-LS-05`, `FR-PG-03`). Atrium stores the flags and nothing else. The requirements do not say which system acts on them, nor whether a change takes effect straight away or at the next Timetable Release.

* **Option A:** Atrium only records the flag; the controller reads it on its next sync (today's implied model).
* **Option B:** a change on the panel is pushed to the controller and confirmed.
* **Option C:** the three flags are owned by the Campus Master Data record of the room, and Atrium shows them read-only.

**Current behaviour:** Option A. Exam Lockdown and Energy Saver are checkboxes, Alert Service is a switch that defaults to Off. All three are exported to the CSV.

* * *

## 2. Campus Hub and Proxy URL

### #5. What happens to a Building Controller's Proxy URL when the Campus Hub is renamed? (Risk)

`FR-P2-25`: a generated URL follows the new hub hostname; a hand-typed one, or one on a hostname the generator cannot parse, is kept and flagged. The flagged node's Save stays disabled until its URL changes. The user is told by one orange toast with a **Details** link and a **Copy list** button. The "Change Hostname" confirmation shows only counts, not the list.

* **Option A:** keep the flag-and-fix-by-hand approach (today).
* **Option B:** list the affected nodes in the confirmation, split into regenerated and manual.
* **Option C:** offer "regenerate all" in the details modal, overwriting hand-typed URLs.

**Current behaviour:** Option A. The tree shows no marker for a flagged node, so after the toast is closed the only way back to the list is to open each panel. Open sub-question: who tells the controller that its Proxy URL changed?

### #6. How protected is the master Campus Hub? (Gap)

`hub.atrium.test` cannot be archived: the menu item is disabled with a tooltip (`FR-P2-27`). The requirements say nothing else about it. A rename saves without the "Change Hostname" confirmation, even though every Connected Campus controller depends on it, and its hostname can be edited to a value outside `atrium.test`, which only Save refuses.

* **Option A:** only archive is blocked (today).
* **Option B:** also lock the hostname of the master hub.
* **Option C:** keep it editable, but always confirm and name the number of affected nodes across all campuses.

**Current behaviour:** Option A. Move is not offered for it either, because it belongs to no single campus (cross-campus de-duplication, `FR-P2-07`).

* * *

## 3. Archive, move and Registry Sync

### #7. Does a scheduled Timetable Release gate everything it should? (Blocking)

A Timetable Release on `rvrs-bc1-3.atrium.test` blocks Move (the item is disabled: "Cancel the scheduled Timetable Release before moving.") and blocks Archive in the code. Turning Registry Sync **off** is meant to be blocked too, ahead of the Asset Registry check (`FR-P2-04`, reinstated on November 4, 2026), but the prototype has no such guard: the check was removed on August 31, 2026 and has not been rebuilt. In the prototype, Archive is also hidden behind the Relay rule on that node, so the archive wording has no seeded example.

* **Option A:** rebuild `FR-P2-04` as written, for the panel, bulk and Campus cascade.
* **Option B:** drop the Registry Sync gate and let the Asset Registry refusal be the only blocker.
* **Option C:** gate all three (Registry Sync off, Archive, Move) through one helper and one message family.

**Current behaviour:** the gap is open. A Registry Sync-off save on `rvrs-bc1-3` goes through, while Archive and Move are blocked.

### #8. Which refusals can the Asset Registry give, and what can the user do next? (Risk)

`FR-P2-30`: the Asset Registry may refuse to remove a Building Controller's host (for example while devices on it are not retired) on Archive, Registry Sync off and hostname change. Atrium shows two lines: a bold "Unable to `<action>`, Registry Sync change was not successful." and the server's message as-is. The prototype shows the literal text `<server error message>`. Atrium never retires devices itself.

* **Option A:** show the message and stop (today).
* **Option B:** add a link to the controller's devices in Manage Devices.
* **Option C:** let a Campus IT Admin retry, or force the change after confirming.

**Current behaviour:** Option A, demonstrated on `lab-bc01-1.atrium.test`. A controller with Registry Sync already off is never refused.

### #9. How should a partly refused bulk change be reported? (Risk)

In a bulk selection or a Campus cascade each node is handled independently. In the seeded NORT lab set, `lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3` and `lab-bc02-1` are refused while `lab-bc02-2` and `lab-bc02-3` succeed. The user gets a success toast for 2 and one orange warning for 4 with a **Details** dialog.

* **Option A:** partial success, with the refused list and **Copy list** (today).
* **Option B:** all or nothing: any refusal rolls the whole change back.
* **Option C:** partial success plus a **Retry refused** button in the dialog.

**Current behaviour:** Option A. The success toast is not shown when every node was refused. After the toast is closed the refused nodes keep Registry Sync on with nothing in the tree to say why.

### #10. Should archiving a Building Controller with devices ever be blocked? (Risk)

The archive popover first shows "Checking attached devices…" for about a second, then either warns "This Building Controller has devices registered to it." or, if the lookup fails, "Failed to check this Building Controller's devices. You can still archive it." Neither blocks (`FR-P2-29`). The Asset Registry may still refuse afterwards (#8), so the two checks can disagree.

* **Option A:** warn only (today).
* **Option B:** block when devices are registered and the controller has Registry Sync on.
* **Option C:** warn only, and show the device count with a link to Manage Devices.

**Current behaviour:** Option A. `bio-bc05-1` and `nort-bc1-2` show the warning, `phys-bc03-1` shows the failed lookup.

### #11. What does moving a node to another campus mean outside Atrium? (Blocking)

Open item 1 in section 10. `FR-P2-23` moves a Building Controller or Campus Hub between campuses in Atrium's data only. It is not known how the move reaches the hub through sync-back, nor whether the Asset Registry must delete the old registration and create a new one, as it does for a hostname rename (`FR-P2-13`). Move is also disabled for a Campus Hub that still has controllers or non-archived Relays, and needs another campus selected in the header filter.

* **Option A:** keep it a data-only move (today).
* **Option B:** treat a move as archive plus create, with the Asset Registry re-registration and its refusals (#8).
* **Option C:** forbid moving a controller that has Registry Sync on until it is turned off.

**Current behaviour:** Option A. Owner of the answer: the Campus Hub Team.

* * *

## 4. Hostnames

### #12. What should be done with legacy hostnames that cannot be auto-derived? (Gap)

The Proxy URL needs a `bc<floor>-<n>` or `rly<floor>-<n>` short name. Separator-less names such as `hlsd-bc101` or `meds-bc101`, and the legacy `rly01` style, return no short name, so the user has to type the URL (`FR-P2-14a`). At load, 8 of the 44 distinct seed controller hostnames end up with an empty Proxy URL, and their panels open with the required error.

* **Option A:** always manual, never a guess (today).
* **Option B:** accept a loose pattern (`bc101` read as floor 1, number 01) and show the result for confirmation.
* **Option C:** require a rename to the full convention before the node can be saved.

**Current behaviour:** Option A. The "short-name half of the naming convention" is still not modeled (`FR-P2-21`), so nothing stops a new name from falling into the manual path.

### #13. How should the `atrium.test` suffix rule treat legacy domains? (Risk)

Every hostname must end in `atrium.test`, a back-end setting returned as `meta.hostnameSuffix`. Hosts on `campus.test`, `legacy.test` or `.local` are flagged "Hostname outdated" (orange in the tree). The rule is enforced on blur and on Save, but a stored legacy name only blocks Save when it is edited. Two controllers (`hlsd-bc104.campus.test`, `meds-bc501.local`) and two hubs (`hub-lab01.campus.test`, `hub-lab02.campus.test`) show the flag.

* **Option A:** flag, but let unrelated edits through (today).
* **Option B:** block every edit until the hostname is migrated.
* **Option C:** offer a one-click migration to the same short name on `atrium.test`.

**Current behaviour:** Option A. A hostname change on a controller with Registry Sync on deletes and re-creates the host in the Asset Registry, so a migration would meet the refusals of #8.

### #14. Why is the Hostname locked once a controller has faculties? (Gap)

A Building Controller that has faculties cannot be renamed ("Hostname cannot be updated when Building Controller contains associated faculties."). The requirement does not give the reason. A faculty-less controller such as `lab-bc01-1` is renameable, and so is an archived one. Campus Hubs and Relays are always renameable.

* **Option A:** keep the lock (today).
* **Option B:** allow the rename and cascade it to the faculty grants.
* **Option C:** lock only while the controller has devices registered.

**Current behaviour:** Option A. It means the legacy hosts in #13 that have faculties cannot be migrated from this page.

* * *

## 5. Bulk mode, export and access

### #15. What are the limits of bulk mode? (Gap)

Bulk mode is entered with Cmd/Ctrl-click or Shift-click and edits the Configuration section (Registry Sync). Archived controllers are not selectable and are skipped by a Campus selection, because their Registry Sync is held Off (`FR-P2-10`). Faculty-less controllers are selectable. A single remaining pick turns back into a normal selection.

* **Option A:** Registry Sync only, active controllers only (today).
* **Option B:** also allow Alert Service, Energy Saver and Exam Lockdown in bulk.
* **Option C:** allow archived controllers to be selected so they can be unarchived in bulk.

**Current behaviour:** Option A. No maximum selection size is defined, and no confirmation is shown before a Campus-wide cascade.

### #16. What does the CSV export contain? (Gap)

The Export button downloads the Building Controllers currently shown in the tree: the selected campuses, after the Faculties, Registry Sync and Show Archived Nodes filters. The file is named from the sorted campus codes plus `-building-controllers.csv`. It has 14 columns, from Hostname to Exam Lockdown. It does nothing, with no toast, when no campus is selected.

* **Option A:** keep Building Controllers only (today).
* **Option B:** add Campus Hubs and Timetable Relays with a Node Category column.
* **Option C:** add Registry Sync and Proxy URL, so an export can be used to review the estate.

**Current behaviour:** Option A. Hubs, Relays, Registry Sync and Proxy URL are not in the file. Archived controllers appear only when Show Archived Nodes is on, with Status "Archived".

### #17. Should a Viewer see Manage Infrastructure, and what may they do there? (Risk)

The demo has two personas: Maya Okafor (Campus IT Admin) and Daniel Reyes (Viewer). The prototype does not change the page for Daniel: Create Node, Manage, Save and bulk edits are all available to him.

* **Option A:** the whole page is hidden from Viewers.
* **Option B:** Viewers see the tree and panels read-only, and may export.
* **Option C:** read-only, and campus visibility follows the `atrium-admins` directory group from Atrium Access.

**Current behaviour:** no permission handling. Every campus is in the picker.

### #18. How does multi-campus selection behave at scale? (Risk)

The header campus picker is a multi-select. The tree, the search index, the Registry Sync cascade and the CSV export all walk every selected campus, and a Campus selection reads the rendered nodes. The prototype seeds 44 distinct Building Controller hostnames, so it never shows a slow case.

* **Option A:** build everything for all selected campuses (today).
* **Option B:** render the tree lazily per expanded campus and keep a counts-only header.
* **Option C:** cap the selection (for example five campuses) and ask for a narrower filter beyond it.

**Current behaviour:** Option A. There is no loading state on the tree and no paging in the search results.

* * *

## Summary

| # | Question | Type | Status | Source |
|---|---|---|---|---|
| 1 | Can Node Type change after creation? | Risk | Not answered | Section 4.2, 9.4 |
| 2 | Local hub required for Standalone Campus? | Gap | Not answered | Create form |
| 3 | One Relay per Building Controller | Risk | Answered, may need revisiting | FR-P2-24, FR-P2-28 |
| 4 | Ownership of Exam Lockdown, Energy Saver, Alert Service | Gap | Not answered | FR-LS-05, FR-PG-03 |
| 5 | Proxy URL after a Campus Hub rename | Risk | Answered for the prototype | FR-P2-25 |
| 6 | Protection of the master Campus Hub | Gap | Partial | FR-P2-27 |
| 7 | Timetable Release gates Archive, Move, Registry Sync off | Blocking | Partial, not rebuilt | FR-P2-04 |
| 8 | Asset Registry refusals and next steps | Risk | Partial | FR-P2-30 |
| 9 | Partly refused bulk change | Risk | Answered for the prototype | FR-P2-30 |
| 10 | Archive with registered devices | Risk | Answered, may need revisiting | FR-P2-29 |
| 11 | Campus move outside Atrium | Blocking | Open with the Campus Hub Team | Section 10, FR-P2-23 |
| 12 | Legacy separator-less hostnames | Gap | Not answered | FR-P2-14a, FR-P2-21 |
| 13 | Suffix rule versus legacy domains | Risk | Answered for the prototype | FR-P2-21 |
| 14 | Hostname lock with faculties | Gap | Not answered | FR-P2-13 |
| 15 | Bulk mode limits | Gap | Not answered | FR-P2-02, FR-P2-10 |
| 16 | CSV export contents | Gap | Not answered | UX-11 |
| 17 | Viewer access to Manage Infrastructure | Risk | Not answered | none |
| 18 | Multi-campus selection at scale | Risk | Not answered | none |

Tally: **9 not answered · 4 partial or open with another team · 5 answered** · by type: **2 blocking · 9 risk · 7 gap**.
