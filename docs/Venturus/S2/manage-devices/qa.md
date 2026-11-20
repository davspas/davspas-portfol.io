# Q&A: Manage Devices

Open design questions for the Manage Devices prototype. Each one is either raised in `requirements.md`, or surfaced by comparing those requirements with what the prototype had to settle while it was built. Cue numbers refer to `Transcript-4.vtt`, the planning meeting with Ines Moreau, Kofi Mensah, Ravi Iyer and Hannah Lindqvist.

**Type legend**: **Blocking**: implementation cannot start on that part without an answer. **Risk**: the current model may be wrong. **Gap**: the requirements are silent and the prototype had to guess.

**Vocabulary note.** The page toggle offers **IT-managed** and **Faculty-registered** devices (type values `Managed` and `Registered` in the code). Both are stored in the **Asset Registry**; Faculty-registered devices are completed by the **Building Controller complement** (Faculty, Floor, Room, Device IP, Last Seen). The statuses are PENDING APPROVAL, READY, PROVISIONED, ACTIVE and RETIRED.

> Anything about individual Building Controllers (adding devices to a specific controller, browsing a controller's full device list) was parked for a later phase at cues 12-13 and is not asked again below.

* * *

## 1. What is an asset tag?

### #1. Should the wizard enforce the tag prefix? (Gap)

Real tags look like `PRJNORT1001`: three letters for the device kind (PRJ projector, MIC microphone, DRD door reader, PNL room panel), the campus code, then a number (cue 23). The wizard only checks length and characters.

* **Option A:** keep the 8 to 14 alphanumeric check only.
* **Option B:** also require a known kind prefix, and warn when the campus code in the tag differs from the campus chosen in the wizard.
* **Option C:** derive kind and campus from the tag and fill them in automatically.

**Current behaviour:** Option A. `MICNORT4001` and `MICNORT1101` both pass, even when added to a different campus. Deferred "until the naming convention is final" (cues 24-25).

### #2. Is a tag unique across both device types? (Risk)

The duplicate check looks at every device in the Asset Registry, so a tag registered as Faculty-registered cannot be added as IT-managed, and the reverse. The comparison ignores case and any non-alphanumeric characters.

* **Option A:** one tag, one device, whatever the type (today).
* **Option B:** unique per type, so a projector could be re-registered under the other type.
* **Option C:** unique per campus.

**Current behaviour:** Option A. Confirmed in the meeting (cue 27); whether the registry team enforces the same rule is not stated.

### #3. The "already in use" toast does not say which tags conflict (Gap)

Conflicts are found at commit time, one registry lookup per tag, so they cannot appear inline (cues 28-29). The red toast names the type but not the tags.

* **Option A:** keep the generic toast and leave the conflicting tags in the review list (today).
* **Option B:** mark the conflicting rows inline after the commit attempt, with the owning type.
* **Option C:** run the lookup when the user moves to step two and flag rows before commit.

**Current behaviour:** Option A. The wizard stays open and the added rows are removed from the list, so what remains is the problem set (cue 30). One toast fires per type that had conflicts (cue 29).

* * *

## 2. Lifecycle and actions

### #4. Who may retire an ACTIVE device? (Risk)

Active devices cannot be retired because their certificates have already been issued (cue 35). The only route is to decommission them outside Atrium first (cue 36). That leaves a technician looking at a broken, Active projector with no way to take it out of service from this page.

* **Option A:** keep the rule; the Retire button simply ignores Active rows (today).
* **Option B:** let a Campus IT Admin retire an Active device after a confirmation that names the certificate consequence.
* **Option C:** show an explanatory tooltip on Active rows so the rule is discoverable.

**Current behaviour:** Option A. Retire is red, hidden until a campus is chosen, and disabled until the selection contains at least one eligible row (cue 37). Ineligible rows in a mixed selection are skipped silently.

### #5. Does Retire need a confirmation, and can it be undone? (Gap)

Retire moves PENDING APPROVAL, READY and PROVISIONED devices to RETIRED in one click. The requirements do not say whether RETIRED is final.

* **Option A:** act immediately, no way back (today).
* **Option B:** confirm with a count of eligible and skipped rows.
* **Option C:** confirm, and allow a Campus IT Admin to reinstate a retired device to READY.

**Current behaviour:** Option A. The status changes in local data and the selection of the acted-on rows is cleared.

### #6. Will Approve and Reject ever return? (Risk)

Faculty Coordinators used to approve every Faculty-registered device and nobody wanted the step (cue 38). The workflow is deprecated: the code stays, the buttons are hidden in every mode (cue 39), and new devices are born READY (cue 40).

* **Option A:** keep the code dormant indefinitely (today).
* **Option B:** delete it once old PENDING APPROVAL records have been cleared from the registry.
* **Option C:** bring it back behind a per-faculty setting.

**Current behaviour:** Option A. The PENDING APPROVAL status stays in the lifecycle for old records only. Open sub-question: who clears those records?

### #7. Do Faculty-registered devices ever reach PROVISIONED? (Gap)

READY to PROVISIONED to ACTIVE happens outside Atrium (cue 36). Sample data for Faculty-registered devices uses only ACTIVE, READY and RETIRED (cue 41), but it is not known whether the registry ever moves them to PROVISIONED. The registry team has to confirm (cue 47).

**Current behaviour:** the status filter and Retire eligibility cover all five statuses in both modes, so nothing breaks either way.

* * *

## 3. Adding devices

### #8. Can IT-managed devices be added by hand at all? (Blocking)

IT-managed devices are born in the Room Booking Manager, which holds their faculty, floor and room assignment (cue 3). The wizard nevertheless registers a `Managed` device with an asset tag alone and no room assignment.

* **Option A:** keep the wizard for both types, and let the Room Booking Manager counterpart be created later (today).
* **Option B:** hide Add Devices in IT-managed mode; those devices only arrive from the Room Booking Manager.
* **Option C:** keep it, but make the wizard collect faculty, floor and room for IT-managed tags.

**Current behaviour:** Option A. The footer note reads "Devices added to this Campus will have the Managed type" (cue 18). Nothing in the transcript says a Room Booking Manager record is created.

### #9. Where is a Faculty-registered device written? (Blocking)

`requirements.md` open question 1: the Asset Registry only, the Building Controller only, or both. The meeting settled the direction of the data (the registry first, controllers complete the record; cue 5) and that there is no sync from the registry to controllers today (cue 44).

**Current behaviour:** the device is created in the Asset Registry only, born READY, with no Building Controller; the table shows dashes until a controller reports it. Pre-registering is accepted as a normal scenario (cue 45).

### #10. Should the wizard warn when a tag is on no Building Controller yet? (Gap)

Raised by Hannah (cue 48) and logged as a UX call (cue 49). Because pre-registration is valid, a warning would cost every user a click to protect against a rare mistake.

* **Option A:** stay silent (today).
* **Option B:** an informational note in step two, with a count, that does not block the commit.
* **Option C:** a per-row badge.

**Current behaviour:** Option A.

### #11. How large an XLSX import is reasonable? (Risk)

The dropzone says "XLSX (MAX 10mb)". The upload is mocked: it always loads a four-tag sample file, and the template download does nothing.

Open points: a row limit as well as a size limit; what happens on a partly valid file (today, valid rows are pre-selected and invalid rows flagged); whether the review table needs paging at several thousand rows; whether the campus column in a file may override the page campus.

**Current behaviour:** the 10 MB figure is text only. The whole file is parsed and every row shown in step two. The campus is always inherited from the page.

* * *

## 4. Reading the table

### #12. How should an unreachable Building Controller appear? (Risk)

A campus can have several controllers, each with its own database, so Atrium asks all of them (cue 6). If one cannot be reached, the five complement columns collapse into one cell with a warning icon: "Information cannot be read from Building Controller" followed by its hostname (cue 9). Devices with no controller assigned just show dashes (cue 8).

The backend question is open: partial results with a warning, or fail the whole request (cues 46-47, `requirements.md` open question 3).

* **Option A:** warning cell per affected device (today, assumes partial results).
* **Option B:** one banner above the table naming each unreachable controller, and plain dashes in the rows.
* **Option C:** fail the page and ask the user to retry.

**Current behaviour:** Option A. Open sub-questions: sorting and filtering by Floor, Room or Last Seen cannot place the warning rows; and an admin has no retry action.

### #13. What does "Last Seen" mean? (Gap)

The column was called Last Heard From. For IT-managed devices the value comes from Room Booking Manager room statistics; for Faculty-registered devices it comes from the Building Controller (`requirements.md`, data sources and complement table).

Open points: whether the two clocks are comparable; whether it is a heartbeat from the device or the last time any record changed; the timezone and format shown; and what a blank value means for a newly added device versus a device that has gone silent.

**Current behaviour:** a raw ISO timestamp, a dash when empty, sortable. Updated by and Updated at are a different thing: they come from the Asset Registry device record and not from the history feature, which will be an on-demand "Show history" command (cue 43).

* * *

## 5. Export and access

### #14. What do Export Template and Export Data contain? (Gap)

The Export menu offers Template and Data. Both only write to the console. Export Data is disabled until a campus is chosen.

Open points: all ten visible columns or a chosen set; the current filtered and searched view or the whole campus; selected rows only when a selection exists; whether rows with an unreachable controller export their warning text or empty cells; and whether the Type is written out, given the Type column was removed because the toggle is the indicator (cues 10-11). The template should probably match the upload format from #11.

**Current behaviour:** neither export produces a file.

### #15. What may a Viewer do, and which campuses may they see? (Risk)

The demo has two personas, Maya Okafor (Campus IT Admin) and Daniel Reyes (Viewer). The prototype does not change the page for Daniel: Add Devices, Retire and Export are available to everyone.

* **Option A:** Viewer sees the table and can export; Add and Retire are hidden.
* **Option B:** Viewer is read-only with no export.
* **Option C:** campus access follows the directory group, so a user only sees the campuses they are assigned to.

**Current behaviour:** no permission handling. The campus picker lists every campus, and the last chosen campus and type are remembered in the browser.

* * *

## Summary

| # | Question | Type | Status | Cue |
|---|---|---|---|---|
| 1 | Enforce the asset tag prefix? | Gap | Deferred | 24-25 |
| 2 | Is a tag unique across both types? | Risk | Answered for the prototype | 27 |
| 3 | Conflict toast does not name the tags | Gap | Not answered | 29-30 |
| 4 | Who may retire an ACTIVE device? | Risk | Answered, may need revisiting | 35-36 |
| 5 | Retire confirmation and reinstatement | Gap | Not answered | none |
| 6 | Will Approve and Reject return? | Risk | Answered for now | 38-40 |
| 7 | Do Faculty-registered devices reach PROVISIONED? | Gap | Waiting on the registry team | 47 |
| 8 | Can IT-managed devices be added by hand? | Blocking | Not answered | 3, 18 |
| 9 | Where is a Faculty-registered device written? | Blocking | Partial | 5, 44-45 |
| 10 | Warn when a tag is on no controller | Gap | Open UX call | 48-49 |
| 11 | Large XLSX imports | Risk | Not answered | none |
| 12 | Unreachable Building Controller handling | Risk | Partial | 6, 8-9, 46-47 |
| 13 | Meaning of Last Seen | Gap | Not answered | 43 (Updated by only) |
| 14 | Export columns and scope | Gap | Not answered | none |
| 15 | Viewer permissions and campus scoping | Risk | Not answered | none |

Tally: **8 not answered or waiting · 4 partial or deferred · 3 answered** · by type: **2 blocking · 6 risk · 7 gap**.

* * *

## Answered in the planning meeting

| Question | Answer | Cue |
|---|---|---|
| Is there a Type column? | **No.** The navbar toggle is the type indicator; IT-managed is the default on load | 10-11 |
| Which scope picker? | **Campus only** in both modes; no Building Controller selector | 12-13 |
| Is there a Type picker in the wizard? | **No.** The type is locked to the toggle and shown as a footer note | 16-18 |
| What does the wizard title show? | The campus only: "Add Devices to" and the campus name | 19 |
| How are tags entered? | Upload a file, or type them manually with a Campus picker | 21 |
| What is a valid tag? | 8 to 14 letters or digits, separated by commas, semicolons, spaces or line breaks; no prefix check yet | 22, 25 |
| When are duplicates checked? | At commit, against the Asset Registry, under both types, shown as one red toast per type | 27-29 |
| What happens after a conflict? | The wizard stays open and only the problem tags remain | 30 |
| What if the wizard is closed mid-edit? | A popover offers Keep editing or Discard; a successful commit skips it | 33 |
| Which statuses can be retired? | PENDING APPROVAL, READY and PROVISIONED; never ACTIVE | 35-37 |
| Is the approval workflow kept? | **Deprecated.** Buttons hidden, code retained, new devices born READY | 38-41 |
| Where do Updated by and Updated at come from? | The Asset Registry device record, not the history feature | 43 |
| Must a device exist on a controller before it is registered? | **No.** Pre-registration is normal | 44-45 |
