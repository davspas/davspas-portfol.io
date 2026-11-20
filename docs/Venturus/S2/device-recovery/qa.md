# Q&A — Device Recovery

Every open question and every doubt for the Device Recovery screen of Atrium, in one place. Sources: `requirements.md`, `PROTOTYPE.md`, `error-cases.md`, and the guesses this prototype had to make while it was built (`index.html`, `js/*.js`). Where an item points at a requirement id (for example **FR-RR-04**), that requirement is the place where the current behaviour is written down.

**Type legend** — **Blocking**: the build of that part cannot be trusted without an answer. **Risk**: the current model may be wrong. **Gap**: the sources are silent and the prototype guessed.

**Id legend** — **FR-xx**: a functional requirement in `requirements.md`. **P-xx**: a doubt raised by the prototype itself (section F).

> **What is settled** (built as fact): the Room Booking Manager registers an IT-managed device's recovery profile automatically when the device asks for its room info, and retries failures itself; the real gap is visibility; the manual Send Recovery Request is an optional safety valve; Not registered is normal until a device asks for its room info; a status can change by itself (for example Re-register); recovery keys are a separate, sensitive thing and are never shown; the screen is for Campus IT Admins and covers IT-managed devices only.

> **How the screen works today.** One row per device, grouped by faculty and, with "Group by campus" on, by campus. Two tabs: **Registration** (counters, status, Send Recovery Request) and **Roll out** (version strip, a three-step wizard, last roll-out per device). All data and all requests are local mocks; the demo states are `?state=unavailable`, `fsm-down`, `partial`, `readonly`, `deploy-fail`, `deploy-down` and `import-error`.

* * *

## A. Backend and delivery

**1. Are the two Room Booking Manager endpoints built?** — *Blocking* · **FR-DEP-01**
*Current behaviour:* the status read and the re-register request are only specified as examples. Paths, auth (user token or service identity), request and response shapes and error codes are unknown. The prototype is a mock: data is local, a send is simulated (1.2 s) and then statuses move.
*Needs:* a written contract before the Atrium proxy is built.

**2. Is automatic registration live in production?** — *Blocking*
*Current behaviour:* the prototype assumes it is. If devices do not get registered when they ask for their room info, nothing moves whatever Atrium shows, and the ribbon ("registers devices automatically… retries failures itself") would be wrong. Nobody has verified the retry end to end.

**3. Where does Failed come from?** — *Blocking* · **FR-ST-02**
*Current behaviour:* the status endpoint is assumed to return Failed per device, because the "Need attention" counter depends on it. The Room Booking Manager may only keep a registered flag and a queued or re-register marker, with retries tracked elsewhere. Which of its internal states map to Failed, and which to Not registered?

**4. Can a device be switched off for recovery registration?** — *Risk*
*Current behaviour:* the screen has no Off state and the status read is assumed not to report one. If a device can be excluded from recovery, it needs its own status and must be skipped by every send.

**5. Is there one read that covers every selected campus?** — *Risk* · **FR-ST-10**
*Current behaviour:* the counters (Need attention, Not registered yet, In progress, Cannot register, Registered) are computed from one list for all selected campuses and faculties. One request per row is not acceptable; the prototype assumes a batch read exists.

**6. What polling interval is acceptable?** — *Gap* · **FR-ST-07**
*Current behaviour:* a 4 s mock tick that starts only after a send from this page and stops when no device sent from this page is still moving (Re-register, then Queued, then Registered). Devices that were Queued when the page loaded never move, so they play the "looks stuck" case. The tick keeps running if the admin changes campus or faculty meanwhile.

**7. How long before Queued or Re-register counts as stale?** — *Risk*
*Current behaviour:* no stale state exists; Queued and Re-register are always "In progress". The Room Booking Manager retries on its own, so a record that sits Queued may be healthy. Without a threshold an admin cannot tell "slow" from "stuck".

## B. Scope and behaviour of a request

**8. What does one Send Recovery Request act on?** — *Blocking* · **FR-RR-02, FR-RR-07**
*Current behaviour:* a request targets ticked devices, one request per device. A ticked Queued device is skipped and counted ("1 device already queued is skipped"); Registered and Re-register devices that are ticked are re-sent and set to Re-register. Nothing says whether the Room Booking Manager treats several devices of one room as one registration, or whether a second request for a device that is already Registered does harm.

**9. Which statuses invite a manual request?** — *Risk* · **FR-RR-02**
*Current behaviour:* the row button is enabled only for Failed and Not registered; Registered devices show a blank space; Queued and Re-register show it disabled ("already queued, nothing to send"). The ribbon says to use it only when a status looks stuck, yet Not registered is described as normal. Should the button appear for Not registered at all?

**10. Should a request ever cover a whole room?** — *Gap*
*Current behaviour:* the recovery profile lives on the room (Standard, Extended, Not set, No access) but the screen works on devices. An admin who wants to re-register EN-103 AV Lab ticks its devices one by one, or filters the Device column and uses select all.

**11. Who can fix a "Cannot register" device, and where?** — *Gap* · **FR-RR-08, FR-RR-12**
*Current behaviour:* a device whose room profile is Not set or No access shows "Cannot register" with a tooltip ("The recovery profile is not set… Set it in Manage Devices."). Its checkbox and send button are disabled. The row action "See in Manage Devices" opens `../manage-devices/?site=<campus>&type=Managed&q=<asset tag>`, which selects that campus and device type and searches the tag. It is not confirmed that Manage Devices lets anyone edit a recovery profile, nor that Campus IT Admins are allowed to.

**12. Is a user-visible history of who sent what needed?** — *Gap*
*Current behaviour:* none. Only the server is expected to log who sent a request (FR-SEC-02). The Roll out tab does have per-device history; Registration does not.

**13. Is there any limit on how many devices one request can carry?** — *Gap*
*Current behaviour:* "select all" ticks every selectable device in the current filter and one confirmation sends them all; the pop-confirm lists the first six and "and N more". With many campuses selected this could be hundreds of devices in one click.

## C. Where it lives and who sees it

**14. Is this a separate screen or part of Manage Devices?** — *Blocking*
*Current behaviour:* a separate screen in the navigation ("Device Recovery"), with its own sub-header (campus and faculty multi-selects, search, "Group by campus", Send Recovery Request). Manage Devices links in by deep link but has no recovery column. Admins must hold two screens in mind for one device.

**15. Which permission gates the actions, and hidden or disabled when denied?** — *Blocking* · **FR-RR-03, FR-DP-09**
*Current behaviour:* with `?state=readonly` (Daniel Reyes, Viewer) the checkboxes, the row send buttons, the sub-header button, the wizard and Import version are hidden, not disabled, and the ribbon adds a note. The real permission names, and whether Campus IT Admins such as Maya Okafor hold them by default, are not defined. Enforcement must be server-side (FR-SEC-01); the read-only role is a query-string demo, not wired to impersonation.

**16. How does Atrium know a device is IT-managed?** — *Gap* · **FR-ST-09**
*Current behaviour:* the device type toggle in the navigation bar is pinned to IT-managed and every device in the mock is IT-managed. Faculty-registered is disabled with a tooltip. The mock never shows a device whose type is missing or wrong.

**17. What do Faculty-registered devices get?** — *Gap* · **FR-ST-09**
*Current behaviour:* nothing here. The disabled half of the toggle says "Faculty-registered devices are registered by their Building Controller." A Faculty Coordinator who registered a device in a lecture hall has no way to see, from this screen, whether it can be recovered, and Campus IT Admins cannot tell which side a broken device is on without leaving.

**18. Who owns the recovery profile of a room?** — *Risk*
*Current behaviour:* the profile is shown per device as a tag but belongs to the room (EN-101 Lecture Theatre is Standard at both NORT and HLSD; EN-103 AV Lab is Extended). Campus Master Data is the source of truth for rooms, faculties and campuses, but who sets the profile (central IT, the faculty, an AV technician at registration) is not decided. The question decides who must be told when a room shows Cannot register.

**19. Should the screen remember its state when the admin returns from Manage Devices?** — *Gap* · **P-02**
*Current behaviour:* no. Counters, filters and expanded groups reset because the page reloads. The "See in Manage Devices" link opens in a new tab, so the original page stays; whether that is enough is untested.

## D. Roll out

**20. Does the roll-out service accept a single device as the target?** — *Blocking* · **FR-DP-01, FR-DEP-01**
*Current behaviour:* a roll-out request per device; success, failure and scheduling are simulated (1.2 s request, 3.5 s run). The real service may expect a room or a Building Controller as the target, which would change the table, the summary and the history.

**21. Why only Registered devices?** — *Risk* · **FR-DP-02**
*Current behaviour:* checkboxes are enabled only for Registered devices with no roll-out running and only once a version is picked. Every other device is listed but muted, with a tooltip giving the reason ("Only registered devices can receive a recovery roll-out. This device is Failed."). Eligibility is checked at selection time; it is dropped again on every render if the device stops qualifying, but it is not re-checked when a scheduled roll-out fires.

**22. What happens to a pending roll-out when a device is retired?** — *Risk*
*Current behaviour:* retiring happens in Manage Devices and the prototype has no Retired status, so nothing handles it. A device with a scheduled roll-out (for example the one scheduled for 2026-11-20 by Priya Raman) would stay in "Scheduled roll-outs" and the roll-out would fire at a device that no longer exists. Should retiring cancel the schedule, block until it is cancelled, or hide the device?

**23. Should a roll-out wait for the end of teaching hours?** — *Risk* · **FR-DP-03**
*Current behaviour:* the summary offers "Schedule roll-out" with any future date and time, interpreted in the browser's time zone and stored as UTC. Nothing warns when the time falls inside a timetabled class or an exam, and a Building Controller may be busy at the time. No maintenance window exists.

**24. What does a second schedule do to the first?** — *Gap* · **FR-DP-07**
*Current behaviour:* a device with a scheduled roll-out can still be ticked, and a new roll-out or schedule replaces the pending one without a warning. The Scheduled roll-outs list shows each device once, with Cancel per row. Confirm the intended rule.

**25. Recovery versions across several faculties** — *Gap* · **FR-DP-01**
*Current behaviour:* v12, v11 and v10 are one shared list for every faculty (ENG, SCI, LIB), imported by Priya Raman and Tomas Herrera. Importing a version does not say which faculty it belongs to, and the versions dialog shows only a count of rooms covered (14, 14, 12).

**26. What does the import check, and what does it parse?** — *Gap* · **FR-DP-08**
*Current behaviour:* a two-step dialog (upload and validate, review and import). The XLSX is not parsed: a sample file is offered, the warnings are fixed ("Room EN-104 Studio is in the file but has no devices at the selected campuses", "2 rooms have no recovery keys") and `?state=import-error` shows a missing "recovery profile" column. Real validation rules, file size limits and who may import are open. A successful import makes the new version the latest at once.

**27. What happens after a failed roll-out?** — *Gap* · **FR-DP-05, FR-DP-06**
*Current behaviour:* the status icon opens a dialog with the message ("The device did not acknowledge the recovery package.") and Retry; each attempt is added to the device history. Nothing limits retries or says when to escalate. The installed version stays the last roll-out that succeeded, so a failed v12 leaves the device on v11 and the table says so.

## E. What the prototype did not build, and why

**28. Entry points inside Manage Devices** — *Gap* · **FR-ST-11, FR-ST-18**
The arrival side is built (`?station=nort-dev1&unit=<asset tag>` opens with the Device column filter set and the device highlighted). A recovery status column or filter in the Manage Devices table, and a count of Failed devices on its toolbar, are proposals only. The count would need one read across all campuses; if it is not available the badge is left out.

**29. "Cannot register" and "Not registered yet" overlap** — *Gap* · **FR-ST-05, FR-RR-08**
A room whose profile is Not set has all devices Not registered. *Prototype assumed:* the device counts under **Cannot register** only, never twice; Not set, No access and blank are treated the same. A Failed device in such a room also counts only as Cannot register, so Need attention can under-count.

**30. Unavailable, partial result and Room Booking Manager unreachable** — *Gap* · **FR-ST-06, FR-RR-09, FR-RR-10**
*Prototype assumed:* a device whose status cannot be read shows Unavailable with Retry, and the sixth counter appears only while at least one device is unavailable (`?state=unavailable`). If the Room Booking Manager rejects part of a request, a warning banner names the device and the reason (`?state=partial`, "rejected: no MAC"). If it cannot be reached at all, an error banner says no request was sent, with Try again (`?state=fsm-down`). Permission-denied and unexpected errors are not designed (`error-cases.md`).

## F. Doubts with no design consequence yet

These are context, not UI decisions. They stay open so nobody mistakes the prototype for an answer.

- **P-01** Is the plain-words ribbon ("The Room Booking Manager registers devices automatically… Use Send Recovery Request only when a status looks stuck.") the right message, and is a permanent ribbon (not dismissible) acceptable? *Assumed:* yes.
- **P-02** Should the page keep its counters, filters and expanded groups when an admin comes back from Manage Devices? *Assumed:* no; it reloads (see question 19).
- **P-03** How many devices are affected, how often a registration gets stuck, and what it costs a faculty when a lecture hall panel cannot be recovered. No data; ask Help Desk and AV Technicians.
- **P-04** A real Campus IT Admin to validate workflow and wording. Maya Okafor is the persona used in the prototype, not an interview.
- **P-05** No written success measure.

* * *

## Summary

| Section | Questions | Blocking | Risk | Gap |
|---|---|---|---|---|
| A. Backend and delivery | 1 to 7 | 3 | 3 | 1 |
| B. Scope and behaviour of a request | 8 to 13 | 1 | 1 | 4 |
| C. Where it lives and who sees it | 14 to 19 | 2 | 1 | 3 |
| D. Roll out | 20 to 27 | 1 | 3 | 4 |
| E. What the prototype did not build | 28 to 30 | 0 | 0 | 3 |
| **Total** | **30** | **7** | **8** | **15** |
