# Manage Devices — to-do

Working doc that tracks divergences between the [Transcript-4](Transcript-4.vtt) meeting outcomes, the [requirements.md](requirements.md), and the [PROTOTYPE.md](PROTOTYPE.md). Section 2 captures locked-in decisions; Section 3 items have all been actioned (2026-06-25). Section 4 still has open questions; Sections 5–6 are historical (the gated work is now done).

---

## 1. Tracker

### Confirm divergences (closed 2026-06-25)
- [x] §3.1 — Data source direction: Asset Registry-primary vs Building Controller-primary → **Asset Registry-primary**, Building Controller complement
- [x] §3.2 — Drop `NOT REGISTERED` devices from Faculty-registered view → **dropped from data + lifecycle**
- [x] §3.3 — Drop "Register in Asset Registry" per-row action → **removed (button + handler + wiring)**
- [x] §3.4 — Collapse scope picker to Campus-only in Faculty-registered mode (B2) → **done**
- [x] §3.5 — Restore Type picker in the Add Devices wizard → **added on the Add Manually tab**, defaulted to the page toggle (later removed, see §3.5)
- [x] §3.6 — Drop Building Controller picker + "Also register in Asset Registry" switch from Add Devices → **done**
- [x] §3.7 — Align Faculty-registered status set to Asset Registry states → **done** (lifecycle: PENDING APPROVAL / READY / PROVISIONED / ACTIVE / RETIRED; Faculty-registered sample data uses ACTIVE / READY / RETIRED)

### Resolve open questions (§4)
- [x] §4.1 — Building controller selection UX: **resolved 2026-07-07** — Building Controller removed entirely; both modes scope by Campus only (header cascader + Add-manually form)
- [ ] §4.2 — Do Faculty-registered devices reach READY / PROVISIONED? (still needs Asset Registry confirmation; sample data currently uses only ACTIVE / READY / RETIRED)
- [ ] §4.3 — Partial-failure behaviour for Building Controller fan-out (server-side, Atrium server work)
- [ ] §4.4 — `Show history` UX surface + content (Phase 2)
- [ ] §4.5 — Selection / action gating for devices not registered in Asset Registry (Phase 2 only — NOT REGISTERED is no longer surfaced in Phase 1)
- [ ] §4.6 — Add Devices: warning when the asset tag isn't on any Building Controller yet

---

## 2. Decisions made (Phase 1, locked)

Each bullet cites the Transcript-4 turn(s) that locked the decision (numbered cues in the meeting transcript).

- **Phase 1 scope = Faculty-registered devices already registered in Asset Registry.** The full Building Controller device list and controller-side management are deferred to a later phase. *(turns 5, 6, 13, 44, 45)*
- **Data flow inverted vs original requirements.md.** Asset Registry is the **primary** source — fetch the list of `type=Registered` devices from Asset Registry, then enrich per device with the Building Controller for faculty/floor/room/IP/last seen. *(turns 3, 5, 6)*
- **Type column removed** from the Manage Devices table — already reflected in the prototype. *(turns 10, 11)*
- **Add Devices capability preserved** — Ines: *"the page is already in a single mode, so the picker added nothing"* (the Type picker was later replaced by a locked type and a footer note). Adding a Faculty-registered device through Atrium creates it in Asset Registry; Building Controllers pick it up via their existing sync job. *(turns 16–19, 21)*
- **No building-controller-side management UI for Phase 1.** Atrium does **not** yet let you "add 7 devices to Building Controller X" — that workflow belongs to a larger sprint. *(turns 12, 13)*
- **No Asset Registry→Building Controller sync today.** Ravi confirmed; Atrium doesn't need to compensate. *(turn 44)*
- **It's OK if an Asset Registry-registered device doesn't exist on any Building Controller.** Pre-registration is a valid scenario; each controller's sync job only iterates over asset tags it already knows. *(turns 44, 45)*
- **Updated By / Updated At** come from Asset Registry devices API directly (the existing fields on the device), **not** from the new history feature. *(turn 43)*
- **History feature is on-demand only** — do **not** fetch Asset Registry history when listing devices. Surface it as a per-device "Show history" command that fires the request asynchronously when invoked. *(turn 43)*
- **Phase-1 filtering performance is acceptable.** Faculty-registered devices are few per floor; the large-volume scenario (thousands of devices per Building Controller) only matters once full controller browsing lands.
- **Approval workflow deprecated; both types are born `READY`.** Approve/Reject stay in code but are hidden. *(turns 38–41)*
- **Asset tag rules:** 8–14 alphanumeric characters checked inline; duplicates checked at commit and shown as a toast. *(turns 22, 26–30)*
- **Retire** is allowed from `PENDING APPROVAL` / `READY` / `PROVISIONED`; `ACTIVE` cannot be retired. *(turns 35–37)*

---

## 3. Divergences resolved (2026-06-25)

All items from §3.1–3.7 have been actioned in code and docs (see commit / changelog entry dated 2026-06-25). Kept here for historical reference.

### 3.1 Data source direction → resolved
Asset Registry-primary, Building Controller complement supplying Faculty / Floor / Room / Device IP. `requirements.md` rewritten to match. `js/data.js` header comment updated.

### 3.2 NOT REGISTERED devices → resolved
Removed from the mock dataset, the status lifecycle, and the status-tag map. The registry-membership helper was removed (vacuously true). Sample entries previously NOT REGISTERED were promoted to READY / ACTIVE.

### 3.3 "Register in Asset Registry" per-row action → resolved
`#registerBtn` removed from `canvas-navigation-data.json` subheader; `handleRegister` and `register` action source removed from `js/actions.js`; visibility logic removed from `js/subheader.js`.

### 3.4 Campus + Building Controller multi-select scope picker → resolved
`columnsForMode()` collapsed to a single `siteColumns()` returning one Campus column. Empty-state copy unified across modes.

### 3.5 Add Devices wizard — Type picker → resolved
Added `#addTypeSelect` (Registered | Managed) to the Add Manually tab, defaulted to the page toggle. Upload tab still inherits from the toggle.
**Superseded 2026-07-07:** the Type picker was removed — Type is now locked to the active page toggle (no picker), since the wizard only ever adds devices of the mode being viewed.

### 3.6 Add Devices wizard — Building Controller selection in Faculty-registered flow → resolved
Campus-only cascader for both modes. "Also register in Asset Registry" switch removed; commit originally landed as PENDING APPROVAL for Faculty-registered (now `READY`, since the approval workflow is deprecated).

### 3.7 Status set in Faculty-registered mode → resolved
Status set now matches Asset Registry: PENDING APPROVAL · READY · PROVISIONED · ACTIVE · RETIRED. `registrystatus` is no longer referenced in the prototype.

---

## 4. Definitions still to decide (open questions)

### 4.1 Building Controller selection UX (requirements.md Q #6 → resolved)
**Resolved 2026-07-07.** Building Controller selection was removed entirely — both IT-managed and
Faculty-registered scope by **Campus only** (single Campus column in the header cascader; Campus-only
picker in the Add-manually form). New Faculty-registered devices carry no `lineServer` on commit; the
per-controller sync job supplies the complement later. The `lineServer` field remains on
existing Faculty-registered *devices* in `data.js` as the complement source, but it is no longer a
selectable scope.

### 4.2 READY / PROVISIONED in Faculty-registered (requirements.md Q #2)
Do Faculty-registered devices ever reach `READY` / `PROVISIONED` in Asset Registry, or are those IT-managed-only? Sample data currently uses only ACTIVE / READY / RETIRED for Faculty-registered rows; confirm with backend.

### 4.3 Partial-failure behaviour (requirements.md Q #3)
When per-device Building Controller lookups fan out and one or more controllers are unreachable: return partial results with a warning, or fail the whole request? Backend decision; no prototype impact.

### 4.4 `Show history` UX
- Surface: kebab menu on the row? side drawer? expand-row?
- Content shape: what does the Asset Registry history feature actually return, and which fields do we render?
- Loading/error state when Asset Registry history fetch is slow or fails.

### 4.5 Selection / action gating for devices not registered in Asset Registry
Becomes relevant only if/when the full Building Controller list lands in Phase 2 — NOT REGISTERED devices are not visible in Phase 1.

### 4.6 Add Devices — asset-tag-not-on-any-controller warning
Hannah said it's OK to add an asset tag that no Building Controller has yet (pre-registration; turns 45, 48, 49). Do we want a confirmation/warning copy in the wizard so that's a deliberate action, or stay silent? **Needs UX call.**

---

## 5. Phase 2 backlog

Not in Phase 1. Captured for future sprints:

- Full Building Controller device list browsing (includes devices not yet in Asset Registry).
- Controller-targeted device creation from Atrium (target specific Building Controllers).
- NOT REGISTERED device handling (selection / action gating, status filter option).
- Large-volume filtering / sort / server-side pagination (thousands of devices per Building Controller).
- `Show history` per-row action (kebab menu surface).
