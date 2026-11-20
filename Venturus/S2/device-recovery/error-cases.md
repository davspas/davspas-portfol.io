# Error cases — Device Recovery

Each case is reachable in the prototype through `?state=…` on the page address, or by the stated action. Wording is the user-visible message.

### Room Booking Manager could not be reached (FR-RR-09)
Reach it: `?state=fsm-down`, tick a device, Send Recovery Request, confirm.
Message: **Room Booking Manager could not be reached.** No request was sent. **Try again**
**Flow**
1. The confirmation shows "Sending…" and the confirm button is disabled.
2. The pop-confirm closes and an error banner appears. No device changes status.
3. Try again reopens the confirmation for the same devices. Dismiss clears the banner.

### Some devices were rejected (FR-RR-10)
Reach it: `?state=partial`, tick PRJNORT4004 (NORT) and the Failed device of HLSD (PRJHLSD4032, EN-101 Lecture Theatre), send.
Message: **1 unit sent · 1 failed.** PRJHLSD4032 · HLSD: Room Booking Manager rejected: no MAC.
**Flow**
1. The request is not all-or-nothing: the NORT device moves to Re-register.
2. The rejected device keeps its status and stays ticked for another try.
3. A warning banner lists each rejected device with the Room Booking Manager reason.

### Status unavailable for a device (FR-ST-06)
Reach it: `?state=unavailable` (the first device of EN-103 AV Lab at NORT, MICNORT4009).
Message: **Unavailable.** Status unavailable for this device. **Retry**
**Flow**
1. The device shows Unavailable, its send icon is disabled and it cannot be ticked.
2. A separate counter appears while at least one device is unavailable.
3. Retry shows "Retrying…" and restores the device. The rest of the page never stops.

### Device cannot register (FR-RR-08, FR-RR-12)
Reach it: the devices of EN-104 Studio at NORT (PNLNORT4015, PRJNORT4016; recovery profile Not set).
Message (tooltip on the **Cannot register** status): **The recovery profile is not set, so the Room Booking Manager does not register this device.** Set it in Manage Devices.
**Flow**
1. The send icon is disabled, with the reason as its tooltip (prefixed "Send Recovery Request. Unavailable:"), and the checkbox is disabled.
2. The device counts under Cannot register, never under Not registered yet.
3. The See in Manage Devices icon opens Manage Devices in a new tab, on the device's campus and IT-managed type, with the asset tag in the search box.

### Already queued (FR-RR-07)
Reach it: a Queued or Re-register device (for example DRDNORT4002 and PNLNORT4003 in EN-101 Lecture Theatre at NORT).
Message: send icon tooltip: **Send Recovery Request. In progress: already queued, nothing to send.**
**Flow**
1. The send icon is disabled; this is information, not an error.
2. If the device is ticked in a multi-device request and is Queued, it is skipped and counted in the confirmation.

### No devices (FR-ST-09)
Reach it: select only the faculty LIB (or SCI with only HLSD or MEDS), or clear every campus or every faculty.
Message: **No IT-managed devices in LIB** / **Select campuses** / **Select faculties**
**Flow**
1. Counters and the table are hidden; the empty state explains what to do.

### Read-only user (OQ-04)
Reach it: `?state=readonly`.
Message: You can see device recovery registration but not send recovery requests.
**Flow**
1. Checkboxes, send icons and the sub-header button are hidden (and, on Roll out, the wizard, Import and the Retry and Cancel schedule actions). Counters, search, filters and the links keep working.

### Permission denied at send time (FR-RR-09, not drawn)
Message: not designed. Needs an answer to Q&A 18 first; the server rejects and the client shows a distinct message.

### Unexpected error at send time (FR-RR-09, not drawn)
Message: not designed. Same banner as "Room Booking Manager could not be reached" with the generic cause; copy to be written once the Room Booking Manager error codes are known (Q&A 1).

### Roll-out to a device that is not Registered (FR-DP-02)
Reach it: Roll out tab, pick a version, look at any device that is not Registered (for example PRJNORT4004 or the devices of EN-104 Studio).
Message (tooltip on the disabled checkbox): **Only registered devices can receive a recovery roll-out. This device is Failed.** (or its own status). Before a version is picked every checkbox says **Select a version first.** A device mid-roll-out says **A roll-out is running on this device.**
**Flow**
1. The row is muted and its checkbox disabled; nothing blocks the rest of the table.

### Roll-out failed on a device (FR-DP-04, FR-DP-05)
Reach it: `?state=deploy-fail`, roll out to a few Registered devices; or open the Failed status of PNLNORT4011 in the sample data.
Message: **The device did not acknowledge the recovery package.**
**Flow**
1. The device's last-rolled-out icon turns red; the status dialog shows the message and **Retry**.
2. Retry starts the same version again on that device.

### Roll-out service not reachable (FR-DP-03)
Reach it: `?state=deploy-down`, tick devices, Proceed to roll-out, Roll out.
Message: **The roll-out service could not be reached.** No roll-out was started.
**Flow**
1. The summary closes and an error banner appears on the page. Nothing changes on the devices and the ticks stay.

### Import file does not validate (FR-DP-08)
Reach it: `?state=import-error`, Import version, Use a sample file.
Message: **The file could not be validated.** Column "recovery profile" is missing.
**Flow**
1. The Next button stays disabled; Remove clears the file. A file that validates with warnings (the normal sample) lists them and can still be imported.
