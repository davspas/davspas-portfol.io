# Manage Infrastructure — PROTOTYPE.md (Router)

> Router doc. Each `maps/<area>/<name>.md` is an **index** (src / does / symbols|blocks|regions / dom /
> state / deps / map-sig) — the story lives here, in RECENT BEHAVIOR. Rows marked _pending_ have no
> map yet; create one when you next edit that source file.

## META
- **Path**: `manage-infrastructure/`
- **Entry HTML**: `index.html` (content in `<script id="page-content">`)
- **JS entry**: `js/init.js` → wires feature modules; `js/init-search.js` `init()` does the heavy wiring on `davinci:canvas:ready`
- **CSS entry**: `css/main.css` (`@import`s feature files)
- **Dependencies**: DaVinci Canvas, the Atrium design system, the `ProjMultiSelect` and
  `ProjFieldError` plugins. **Cross-prototype**: none; the sibling Manage Devices prototype (`manage-devices/`) keeps its own data
- **Companion docs**: `error-cases.md` (hidden error states and the flow to reach each — surfaced by the `ProjErrorCasesPanel` ribbon button, gated on this file; **add an entry whenever a new hidden error, blocked or warning state is introduced**), `requirements.md` (requirements — surfaced by the `ProjRequirementsPanel` ribbon) and `changelog.json`. The Proxy URL rules live in `requirements.md` `FR-P2-14` / `FR-P2-19`, open items in its §10.
- **Status**: Manage Infrastructure prototype: multi-campus selection, Registry Sync configuration, bulk mode, master Campus Hub cross-campus visibility

## PURPOSE
Infrastructure management interface for Campus IT Admins at Northfield University. Building Controllers are the primary focus, with Campus Hubs and Timetable Relays as associations. Flat tree navigation (Campus → Building Controllers + collapsible Campus Hub/Relay sections) with a context-aware details panel, a Manage dropdown of actions, a unified Create Node drawer, always-on bulk selection, and a Registry Sync configuration model (Registry Sync is the toggle that sends a controller's device changes to the Asset Registry) that cascades from the campus level.

## MODULE MAP

### JavaScript (`js/`)
| Feature | Code | Map | Purpose |
|---|---|---|---|
| Page init & wiring | `js/init.js` | _pending_ | Boots modules on canvas ready |
| Campus/Faculties multi-selects, filters, tree clicks | `js/init-search.js` | `maps/js/init-search.md` | Multi-selects, filter listeners, reset button; **no auto-select fallbacks** |
| Data & helpers | `js/config-data.js` | `maps/js/config-data.md` | 5 datasets (building controllers, Campus Hubs, Relays, archived, faculty-less) + factories + load-time passes (everAssociated, archived-Registry-Sync-off, serverType, controller + Relay Proxy URL backfill, `_enforceSingleCDN` (FR-P2-24), Timetable Release flag, `_backfillGHDSProjects`) + `forEachSeedServer` (the search index's dataset walker) + Proxy URL derivation rules + `isProxyURLOutdated` / `proxyURLOutdatedMessage` (automatic update, FR-P2-25) + `isHostnameOutdated` / `isValidIPv4` + **shared Campus Hub / Relay option builders** (`getGHDSServersForSite`, `getCDNServersForSite` — archived excluded) |
| Tree build & layout | `js/ui-helpers.js` | `maps/js/ui-helpers.md` | `buildAllServersTree` (archived filter now spans building controllers **+ Campus Hubs + Relays**), `_rebuildTreeDOM` (**the one rebuild path**, preserves expansion), `updateLayoutVisibility` (empty-state on load), Faculties sync + the two `_suppress*OnChange` guards, toast |
| Tree render | `js/tree-rendering.js` | `maps/js/tree-rendering.md` | Node creation, inline faculty tags, empty states (tray icon), `findNodeById`, `captureTreeExpansion` / `restoreTreeExpansion` |
| Global search | `js/tree-search.js` | `maps/js/tree-search.md` | Search by hostname/id/campus/faculty across the **whole estate** (`buildSearchIndex`, filters ignored); grouped results dropdown with per-type **column-header rows**; `navigateToSearchResult` widens only the filters hiding a picked result |
| Selection & details panel | `js/selection.js` | `maps/js/selection.md` | `selectNode`, `update*Info`, campus Registry Sync toggle, Save/Discard, `hideAllServerInfo`; editable Hostname on all three panels (**Building Controller locked while it has faculties** — `_lineHostnameLocked`; Campus Hub and Relay always editable) + editable **IP Address** (all three, FR-P2-22) + rename propagation; **editable Campus Hub Association on the Building Controller + Relay panels** and the **Relay Association dropdown on the Building Controller panel** (`#infoCDNSelect`, `_populateCDNSelect` — one Relay per Building Controller, FR-P2-24) with the association cascades (`_applyLineServerGHDSChange`, `_applyCDNGHDSChange`, `attach`/`detachLineServerFromCDN`); automatic Proxy URL (`_autoUpdatePanelProxy`, `_panelProxyBaseline`, outdated rule kind) + open-URL buttons; campus Registry Sync state + cascade are **tree-driven** over non-archived + faculty-less controllers (**archived controllers are excluded**, `FR-P2-10`); Registry Sync-off paths check `fsnHostRemovalError` (`FR-P2-30`); one `PANEL_FIELD_RULES` table (required incl. Proxy URL on Building Controller/Relay, `atrium.test` suffix, IPv4, uniqueness) behind the Save gate, the Save backstop and the blur messages; `_setGlobalActionsEnabled` parks Manage + Create Node while dirty |
| Bulk mode | `js/bulk-mode.js` | `maps/js/bulk-mode.md` | Cmd/Shift multi-select + bulk Registry Sync cascade; **faculty-less controllers are selectable, archived controllers are NOT** (`_kindForNode` returns null for them; `_lineServerNodesForSite` skips them, so the Campus cascade excludes them); no Timetable Release guard on Registry Sync; **archived controllers never take Registry Sync** — all-archived disables the toggle, a mixed save skips them (`FR-P2-10`) |
| Create/Unarchive/Move drawer | `js/new-node-drawer.js` | `maps/js/new-node-drawer.md` | Entry-point-aware drawer; **unarchive mode for all three node types** (`_unarchiveKind`); **move mode** for Building Controller / Campus Hub (`_moveMode`, rides on the unarchive machinery via `_enterExistingServerMode`; Campus shown, header campuses minus the current one; FR-P2-23); Unarchive title "…for &lt;Campus&gt;"; Proxy URL (required on Building Controller + Relay) re-derived automatically from Hostname / Campus Hub (`_autoUpdateDrawerProxies`, `_proxyBaseline`); single-select **Relay Association** on the Building Controller section (`_setLineCDNOptions`); `_validateExistingServer` validates unarchive and move against the node itself; **Faculties optional on unarchive** (faculty-less restore) |
| Manage actions | `js/manage-actions.js` | `maps/js/manage-actions.md` | Manage dropdown: **Move → To available Campus** (`_moveBlockReason`), faculties (the Building Controller menu has no Relay entry — its single Relay is the panel's Relay Association dropdown, FR-P2-24), **the two association drawers** (Building Controllers from a Relay — building controllers on another Relay shown disabled, tagged with it (FR-P2-28) — and Building Controllers from a Campus Hub), archive (**all three types**, Timetable Release guard on Building Controllers only — it also blocks Move), unarchive, create actions; one unified add/remove `_buildChecklist` (three call sites) |
| CSV export | `js/export.js` | _pending_ | Export visible Building Controllers |
| Faculty selection | `js/faculty-selection.js` | _pending_ | **Unused** (faculty filter moved to subheader) |

### CSS (`css/`)
| Code | Map | Purpose |
|---|---|---|
| `css/main.css` | `maps/css/main.md` | Entry point, `@import`s + page wrapper |
| `css/base.css` | `maps/css/base.md` | Canvas height chain, `.field-note` persistent hints, `.proj-tooltip` (now unused — its only callers were the removed Generate buttons); `.field-hint-row` is now unused (dead rule) |
| `css/layout.css` | _pending_ | Page layout structure |
| `css/tree-section.css` | `maps/css/tree-section.md` | Tree view, header two-zone layout, archived styling, config indicators, empty states |
| `css/tree-search.css` | `maps/css/tree-search.md` | Search input + icon + results dropdown (count line, group headers, columns) |
| `css/settings-panel.css` | `maps/css/settings-panel.md` | Details panel shell, sticky footer, footer-anchored `.panel-confirm-popover`, details empty state |
| `css/settings-categories.css` | `maps/css/settings-categories.md` | Collapsible categories |
| `css/settings-list.css` | `maps/css/settings-list.md` | Setting rows (the `min-width: 0` that keeps the value column inside the panel), switch/checkbox alignment (incl. mixed/amber state) |
| `css/info-display.css` | _pending_ | Read-only info, faculty tags, link buttons |
| `css/wizard.css` | `maps/css/wizard.md` | Create/Unarchive/Move drawer form styles (Campus field, toggle-section dividers) |
| `css/subheader.css` | _pending_ | Custom subheader controls |
| `css/manage-actions.css` | _pending_ | Manage popover, action drawer, checklists |

### HTML
| Code | Map | Purpose |
|---|---|---|
| `index.html` | `maps/html/index.md` | Body empty state, two-pane layout, panel empty state, drawers (Create / Unarchive / Move share one) |

## INTEGRATION POINTS
- **Canvas events**: modules init on `davinci:canvas:ready` (via `init.js`/`init-search.js`).
- **Subheader** (from `runtime/canvas-navigation-data.json`): Campus multi-select + Faculties filter + Search + Export + Create Node button. Not in page-content.
- **Plugins**: `ProjMultiSelect` powers the Campus and Faculties multi-selects; `ProjFieldError` renders every inline field error ("Enter <Label>" / "Enter a valid <Label>" / "<Label> already in use").
- **Design system**: empty states, tags, forms/selects, checkboxes, switches, buttons, drawer, popover.
- **State globals** (shared across modules): `lineServersData`, `selectedNodeId`, `selectedSites` (sorted A→Z at assignment), `selectedProjects`, `serverTypesData`, form toggle flags. See individual maps.

## RECENT BEHAVIOR (this change set)
- **2026-11-04 review pass** (see `requirements.md` v2.44 and UX-19). Faculty-less building controllers are now found by `_findLineServerSite`, counted by the duplicate check, and handled correctly when archived (`isServerFullyArchived`, `_ghdsAssociatedLineServers`, the search index, `_execArchiveServer`). The three Unarchive flows save what the form shows (`_validateExistingServer('line')`, chosen Relay attached; Relay keeps its Campus Hub and memberships; Campus Hub keeps its Proxy URL). Filter handlers capture `selectedNodeId` before `BulkMode.clearSelection()` (a bulk end goes to the empty state) and re-select with `selectNode`, so collapsed branches stay collapsed. Create/Unarchive Faculties follow the Campus Hub grant (`_offeredFormProjects`); a Campus Hub created in the form is granted the picked faculties. The Relay's building-controller list reads `_ghdsAssociatedLineServers(campus hub, true)` and keeps the user's checks (`_cdnOptionIds`). `_isFormDirty` compares `_formSignature()` with the baseline taken 250 ms after open. Bulk: one remaining pick becomes a normal selection, Shift ranges use `_rangeBetween`, `isDirty` is false with 0 effective servers. New building controllers start with Registry Sync on (`FR-P2-11`); Unarchive still restores it off. The Relay dropdown on the Building Controller panel is limited to the controller's campus, and a master Campus Hub link is enabled only when its row is in the tree. `hideAllServerInfo` re-enables Manage / Create Node.
- **Automatic Proxy URL** (`FR-P2-25`, v2.36 — the Generate buttons are removed from markup, CSS and JS).
  `isProxyURLOutdated` + `proxyURLOutdatedMessage(campus hub)` in `config-data.js`. Panel: `_autoUpdatePanelProxy`
  runs on the Hostname `change` (not `input`) and in both Campus Hub dropdown listeners, writes the derived URL
  and resets `_panelProxyBaseline` (also reset on snapshot capture, Discard, and — in capture phase — on
  typing in the Proxy field). An underivable change leaves the value, and the `'outdated'` rule kind blocks
  Save (`_firstPanelViolation` counts it although the Proxy field itself is unchanged; painted by
  `_refreshPanelProxyOutdated` on every `_refreshSaveDiscardState`). Drawer: `_autoUpdateDrawerProxies` on the
  three Hostname `change`s, both Campus Hub dropdowns, the Campus Hub/Relay toggles and the Campus change. It only touches a
  section whose sources moved off `_proxyBaseline`, so a hand-typed URL holds. Gate/backstops as before.
  **"Proxy URL updated because … changed." warning** (orange, `renderProxyChangedNote` in `ui-helpers.js`,
  `.proxy-changed-note` in `base.css`, text from `proxyURLChangedMessage`) in `#infoProxyNote` /
  `#cdnProxyNote` / `#newLineProxyHelp` / `#newCDNProxyHelp`. Panel: `_refreshPanelProxyChangedNote` shows it
  while the field holds `_panelProxyAutoValue` and differs from a non-empty snapshot URL. Drawer:
  `_proxyChange[kind]` records a replacement of a non-empty value; `_refreshDrawerProxyChangedNote` drops it once
  the field no longer holds it.
- **Relay Manage → Building Controllers** (`FR-P2-28`): `getLineServersForCDN(node, { includeOtherCDN: true })` keeps
  building controllers on another Relay; `_buildManageLSForCDN` renders them `disabled` with that Relay as the row tag,
  plus a note. `_buildChecklist`'s Select All now skips disabled rows in add/remove mode too.
  `_manageCDNLSBlockReason` blocks only when the Campus Hub has no building controllers.
- **Archived Campus Hub on unarchive** (`FR-P2-26`): `updateGHDSOptions(archivedHostname)` /
  `updateCDNGHDSOptions(archivedHostname)` add the stored Campus Hub back as a disabled `data-archived` option
  (`_appendArchivedGHDSOption`); `_refreshArchivedGHDSError` / `_checkGHDSNotArchived` handle the error + gate.
  Prefills now select by exact hostname (`_selectGHDSOptionByHostname`) instead of a substring match.
- **Archive blocks** (`FR-P2-27`): `_archiveBlockReason` covers the master Campus Hub (`MASTER_GHDS_HOSTNAME`), a Campus Hub with associated Building Controllers or non-archived Relays, a Relay with Building Controllers, and a Building Controller on a Relay
  (`findAssociatedCDNServers`); the Building Controller Archive menu item now takes `disabledReason` too.
- **Devices check on Building Controller archive** (`FR-P2-29`): `_showArchiveConfirm` shows a `.loader` for ~900 ms, then an orange warning (devices count or check failed); never blocks. Mock data: `_unitsByHost` in `config-data.js`. The popover omits the "turn off Registry Sync" sentence when Registry Sync is already off, and its buttons read `Keep <Type>` / `Yes, Archive`.
- **Required Proxy URL** (v2.31): the Building Controller and Relay Proxy URL are required on the Create form, in
  Unarchive / Move and on both panels (`PANEL_FIELD_RULES`, `validate()`, `updateSaveButtonState`,
  `_validateExistingServer`). (Historical: the Generate buttons that once cleared this error are gone, see `FR-P2-25`.)
- **IP Address is editable on all three panels** (`FR-P2-22`): `#infoIPAddress` / `#ghdsIPAddress` /
  `#cdnIPAddress` sit under Hostname; rules are required, `isValidIPv4` (shared with the drawer, which
  lost its private `_isValidIP`), and unique via `_serverFieldInUse('ip', …)` excluding the snapshot
  value. Written to every copy; no propagation.
- **Move → To available Campus** (`FR-P2-23`) for active Building Controller / Campus Hub. `_moveBlockReason` checks, in
  order: Timetable Release → Campus Hub with associated building controllers or non-archived Relays → no other header campus. `openForMove`
  reuses `_enterExistingServerMode` (`_moveMode` rides on `_unarchiveMode`), shows Campus minus the current
  one, titles the drawer "Move <Kind> from <Campus>" / "Stop Moving". `_applyMoveSiteDefaults` keeps only an
  master Campus Hub (and its Proxy URL); `_preselectMoveProjects` keeps faculties the target campus has and the Campus Hub
  grants. `_moveLineServerSave` / `_moveGHDSSave` keep the Node ID (the building controller's `everAssociated` is reset to
  the new faculties) and toast "<Kind> moved to <Campus>".
- **One Relay per building controller** (`FR-P2-24`): the `#infoCDNSelect` dropdown (Not assigned + non-archived Relays
  on the currently picked Campus Hub, re-scoped live; **disabled for an archived Building Controller**, with the `#infoCDNNote` text "Archived Building Controllers cannot be associated with Timetable Relays." — `_populateCDNSelect` returns early on `nodeData.archived`; Alert is independent of it — `_applyLinePGMState`) and the
  `#lineServerAssociatedCDN` read-only card (`#assocCDN*`). The commit is one detach + attach swap (no Alert side effect, `FR-LS-05` v2.38). The Create form's Relay Association is a native `<select id="newLineCDN">`
  (`_setLineCDNOptions`; `formSelectedCDNs` stays an array of 0–1 ids). `getLineServersForCDN` and the
  Create form's Relay Building Controller list hide building controllers already on another Relay; `_enforceSingleCDN` keeps the seed
  honest at load.
- **Seed-data defects fixed 2026-11-04:** `hlsd-bc101.atrium.test` now carries one id (`31`) on both faculty copies, and the archived twin of `arts-bc01-2` is renamed `arts-bc01-2-old.atrium.test`, so every hostname is unique across active and archived servers and `forEachServerCopy` no longer crosses records. Building Controller id `29` now belongs to `engr-bc-studio.atrium.test` only. The Timetable Release flag is on `rvrs-bc1-3.atrium.test` only.
- **Tree expand/collapse state survives every rebuild** (`requirements.md` `UX-02a`). `captureTreeExpansion` /
  `restoreTreeExpansion` (`tree-rendering.js`, which owns the expanded-class vocabulary) snapshot the open
  branches by node id and put them back; `_rebuildTreeDOM` (`ui-helpers.js`) is the one place that does
  capture → `renderTree` → restore, and **both** rebuild paths now call it (`reRenderTree` and
  `updateLayoutVisibility`), which covers every save path. Campus roots are force-expanded **only on first
  render** (an empty snapshot), so a collapsed campus root now stays collapsed — unless *every* branch is
  collapsed, which reads as an empty snapshot and re-expands the roots — a deliberate change from the
  old unconditional re-expand. `updateLayoutVisibility`'s 50 ms timer survives but now only clears the
  selection; it is vestigial and flagged as such.
- **Global search matches the whole estate, and picking a hidden result widens only what hides it**
  (`UX-14`). `searchNodes` walked `lineServersData` — the *filtered* tree — so nothing outside the current
  filters was findable. It is replaced by `buildSearchIndex` / `searchServers` (`tree-search.js`) over the
  five raw datasets via `forEachSeedServer` (`config-data.js`).
  - **`forEachSeedServer` filters by `level` for a reason.** `cdnServersData` nests read-only Building Controller
    mirrors under each Relay with synthetic `relay-ls-*` ids that `buildAllServersTree` strips, so a naive
    recursive index would emit eight rows (one per Relay membership) whose every click hits `navigateToServer`'s "not visible" toast.
    `_hostnameInUse` (`selection.js`) deliberately still walks them — a duplicate-name check must see every
    name in the data. The two walks look alike; do not consolidate them.
  - **Index order is load-bearing:** active building controllers, then faculty-less controllers, then archived, each skipping ids
    already seen — the same precedence `buildAllServersTree` applies. A server archived for one faculty but
    active for another must read as active, or the relaxer would switch Show Archived on to reveal a row
    that was never hidden. Archived seed records carry no `archived` key, so the index stamps it.
  - `_blockingFilters` + `navigateToSearchResult` widen (never narrow) and in a fixed order: DOM-first fast
    path → archived/Asset Registry properties set **without dispatching `change`** (the listeners would each fire their
    own rebuild) → campus added under a **new `_suppressSitesOnChange`** guard → Faculties **last**, once the
    available pool has settled → one `reRenderTree` → navigate. It uses `reRenderTree`, not
    `updateLayoutVisibility`, because the latter is async and clears the selection it is about to make.
  - `_suppressSitesOnChange` must stay **separate** from `_suppressProjectsOnChange`:
    `syncProjectsFilterForSites` sets and clears the Faculties flag itself, so one shared flag would re-arm
    the Campus MS mid-sequence. Rows carry their record in `data-*` attributes so the debounce cannot strand
    the click handler on a stale array.
- **A building controller's Hostname is locked while it has faculties** (`FR-P2-13`) — the only hostname lock left (the Campus Hub one was removed in v2.31):
  `_lineHostnameLocked` + `#infoHostnameNote` in `updateLineServerInfo`. Current faculties only, so an faculty-less controller
  stays renameable; archived servers are never locked (their stored faculty history is not a live reference).
- **Save is gated on validity, and validation resolves on blur** (`§9.4`). One `PANEL_FIELD_RULES` table now
  feeds all three consumers — the gate (`_panelIsValid`), the Save-time backstop
  (`_validatePanelRequiredFields`, cut from 64 lines to ~25, still the thing that focuses the field and
  toasts), and the blur/input messages. It replaces two hand-kept lists that had drifted: `#infoServerType`
  was required at Save but had no blur handler, so its error could be raised and never cleared.
  `_panelHostnameOutdated` is **deleted** — its job is the `suffix` rule, with the editability guard built in.
  `touched` moved out of the per-field closures to `_panelFieldTouched`, reset inside
  `_clearAllPanelFieldErrors` so it clears on selection, save and discard alike.
  - **The invariant that makes this safe: a field the user cannot edit never blocks Save and never shows an
    error.** `_panelFieldViolation` returns null for a disabled field and `_showPanelHostnameErrorIfOutdated`
    bails on one. Without it, `hlsd-bc104.campus.test` and `meds-bc501.local` — legacy hostnames that also carry
    the faculties that lock them — would have had Save disabled forever, blocking every unrelated edit.
  - **Empty required fields always block; format rules block only once edited.** `_firstPanelViolation` returns
    a `required` violation unconditionally, but skips a suffix / IP / duplicate violation whose field still holds
    its as-loaded value (`_panelFieldChanged`, against `_editableSnapshot.fields`, captured per `PANEL_FIELD_RULES`
    entry). Every seed Campus Hub has a legacy hostname, and gating on it made an IP or Description edit unsaveable on
    all 15. The empty seed Proxy URLs (the eight building controllers listed in the superseded entry below, plus the `meds-rly01` Relay) still block, so
    `_showPanelRequiredErrorsOnOpen` paints their required error on open — before, Save was disabled with no
    visible reason, which read as "editing the IP doesn't enable Save".
  - On `input`, every violation **except `required`** is painted live (`if (!violation || violation.kind !==
    'required') paint(violation)`): `required` stays blur-only (an emptied field is normal mid-edit), while
    suffix, IP-format and duplicate messages appear and clear as the value changes. The old unconditional
    clear is exactly what would leave Save looking stuck. Side effect: emptying a field that showed a suffix
    or IP error leaves that message up until blur.
- **Manage and Create Node are disabled while the panel is dirty** (`§9.4`). `_setGlobalActionsEnabled`
  targets `#manageBtn` and `#newServerBtn`, driven from `_refreshSaveDiscardState` plus the three paths that
  call `_setSaveDiscardEnabled` directly (`captureEditableSnapshot`, both `handleDiscardConfirm` branches) —
  `_setSaveDiscardEnabled` itself is not a usable hook because it is also called with `false` on clean
  transitions. Disabling `#manageBtn` also keeps its design-system popover shut, the same mechanism `#discardBtn` uses.
  No conflict with `ManageActions.showMenu`, which touches `display`, not `disabled`.
- **The inert "Search Settings" field is gone** — markup, the `css/settings-panel.css` block, and all five
  `style.display` toggles in `selection.js`.
- **Fixed on the way through: `ProjMultiSelect.getItems` does not exist.** Both calls sat inside `try/catch`
  in `init-search.js`, so Reset Filters never lit up for a narrowed Faculties filter and its Faculties branch
  never reset `selectedProjects`. Now reads `getAvailableProjectsForSites(selectedSites)`.
- **Archiving a building controller turns Registry Sync off, and it stays off while archived** (`requirements.md`
  `FR-P2-10`, reversed — this supersedes the older "Archiving preserves Configuration" note below).
  `_archiveServerForProject` (`manage-actions.js`) writes `fsnApiCalls: false` on the archived copy;
  `_unarchiveLineSave` (`new-node-drawer.js`) restores it off; `_forceArchivedFSNOff(archivedServersData)`
  (`config-data.js`) keeps the seed in step so the tree indicator and panel agree. On the building controller panel
  `updateLineServerInfo` (`selection.js`) shows the Registry Sync toggle **off + disabled** for an archived server,
  with `#infoFSNApiCallsNote` explaining it. Bulk (`bulk-mode.js`): `populateBulkSwitches` **disables** the
  switch for an **all-archived** selection; `applyConfiguration` **skips archived nodes**, so a mixed save
  writes only the active building controllers and the toast counts them. The campus cascade `_applySiteFSNToLineServers`
  (`selection.js`) likewise **skips archived when turning Registry Sync on** — a campus showing any archived building controller never
  settles on Enabled. The archive-confirm copy names the side effect.
- **Tree section header regrouped.** The "Filters" title and the filter controls now sit together in a
  left `.tree-section__header-zone`, and the **Hostname-outdated legend** (`#hostnameOutdatedLegend`) moved
  out of the shortcuts hint row up into the header, right-aligned (its leading `|` separator dropped). JS
  toggles it by id as before (`tree-rendering.js` `_updateOutdatedHostnameLegend`); the `.tree-legend__sep`
  rule is gone (`index.html`, `css/tree-section.css`).
- **Building controller, Campus Hub and Relay hostnames must end in `atrium.test`.** The rule is enforced by validation
  on the Hostname field (`SERVER_HOSTNAME_SUFFIX`): the suffix is checked on blur and gates Save (see the validity-gate entry above).
  `isHostnameOutdated` (`config-data.js`) applies to all three node types, so a hostname not ending in the
  suffix is flagged orange in the tree, drives the `#hostnameOutdatedLegend` legend, and shows the inline
  error on the panel and the Create forms. Since v2.31 the Campus Hub Hostname is always editable, so a Campus Hub that still sits on a legacy domain (`hub-lab01.campus.test`, `hub-lab02.campus.test`) reads as outdated and shows the
  suffix error on open; **Save is only blocked if the hostname itself is edited to a value outside `atrium.test`** — including the master `hub.atrium.test`,
  whose exact hostname `MASTER_GHDS_HOSTNAME` depends on. (Resolved in v2.38: the rule is the `atrium.test` suffix, and the master hub is the one exact hostname the Proxy URL rules key on.)
  - ⚠️ **The split-field implementation described here is gone.** This entry originally described a
    `ProjHostSuffix` helper (`ui-helpers.js`) that rendered the domain as an inert `.input-suffix` chunk and
    redefined `value` on the four hostname inputs so `.value` returned the whole hostname while the box held
    only the short name. **`ProjHostSuffix` was removed in `f2bcab1d`**, along with the `.input-with-suffix`
    markup and CSS. The four inputs are now plain `.form-input`s carrying the full hostname, there is no
    `Object.defineProperty` anywhere in the prototype, and `.value` is exactly what is in the box. Treat any
    surviving `ProjHostSuffix` / `.input-suffix` / `shortName()` reference in these docs or the maps as stale.
  - **The seed data was migrated with it** — every building controller and Relay hostname except the two deliberate legacy demos
    (`hlsd-bc104.campus.test`, `meds-bc501.local`) moved onto the `atrium.test` domain (from `.campus.test`, `.legacy.test` and `.local`), Campus Hub records untouched. Two NORT disabled twins were
    renamed to stay unique (`nort-bc2-2.atrium.test` / `nort-bc2-3.atrium.test`), keeping their `bc<floor>-<server>` tail
    parseable so they don't lose their derived Proxy URL. See `maps/js/config-data.md`.
  - **Derived Proxy URLs pick the domain up for free**, and the master-hub branch of both derive
    functions stopped rewriting the domain — the hostname it is handed is already on
    the `atrium.test` certificate domain. `HOSTNAME_DOMAIN_RE` still lists the legacy domains (`campus.test`, `legacy.test`, `.local`) because the two
    short-name parsers must strip whatever they are given.
  - **The Create form keeps its static error spans** (`#newLineHostnameError` / `#newCDNHostnameError` /
    `#newGHDSHostnameError`), which ProjFieldError prefers over injecting one. The flex wrapper and its
    `:has(.form-input--invalid)` border mirror went with `ProjHostSuffix`. The two Create-form Proxy URL
    inputs sit in a flex `.proxy-input-group`, so they carry static `#newLineProxyURLError` /
    `#newCDNProxyURLError` spans for the same reason.
- **`Manage > Building Controllers` on a Campus Hub is a re-home, not a membership toggle.** It reuses the `FR-P2-17`
  checklist wholesale — `_buildChecklist(..., {addRemove: true})`, `_checklistDiff()`, ADDING/REMOVING
  tags — but the write underneath is a different shape. A Relay membership is a Relay's list of building controllers (a building controller is on at
  most one — FR-P2-24); a Campus Hub association is the building controller's ONE `ghdsAssociation` string. So a tick is a
  **move** off whatever Campus Hub the server is on today and an untick is **unassign**, and both go through
  the new `moveLineServerToGHDS` (selection.js) rather than an attach/detach pair. Spec: `FR-P2-20`.
- **`moveLineServerToGHDS` is `commitEditableFields`'s Campus Hub branch, replayed without a panel** — and the
  one remaining place a Proxy URL is re-derived. Same order — `_applyLineServerGHDSChange` first
  (reciprocal lists, faculties the new Campus Hub doesn't grant, the Relay membership the move invalidated, Alert),
  then the association + Proxy URL onto every stored copy via `forEachServerCopy` × 2 +
  `forEachOrphanLineServerCopy`. (Historically the panel never re-derived; it does now, see `FR-P2-25`.) This drawer has no field,
  so it rewrites the URL when the stored value is empty or equals what the **old** Campus Hub generated. Unassigning clears a derived URL, which leaves the now-required Proxy URL empty until the user
  types one; a hostname the new Campus Hub's rule can't parse leaves the field alone (`FR-P2-14a`).
- **The Campus Hub candidate pool is the inverse of the Campus Hub dropdown.** `getLineServersForGHDS` mirrors
  `getGHDSServersForSite`: a campus-local Campus Hub offers its own campus's active building controllers, an **NORT** Campus Hub
  offers every campus's. Archived building controllers are excluded, matching `getLineServersForCDN` — note the
  consequence, that an archived building controller still counts against `_archiveBlockReason` and
  `_moveBlockReason` but cannot be detached from this drawer. Same latent gap exists on the Relay
  side; neither was closed.
- **Because the reach is wider than the Relay drawer's, the drawer says so.** `_buildManageLSForGHDS`
  prepends a `.manage-action__confirm-message` note (a class that already existed in
  `css/manage-actions.css` and had no callers) and tags every row that would be a *move* with the Campus Hub
  hostname it is currently on, via the checklist's existing `item.tag`. No new CSS.
- **Unarchive-mode fix: `ghdsEnabled` has to be ON for the Campus Hub kind.** `openForUnarchive` hard-wired it
  to `false` for all three kinds, reasoning that unarchiving never *creates* a Campus Hub — but the same flag
  is what `updateSaveButtonState` counts as "a section is enabled", so `lineServerEnabled || ghdsEnabled
  || cdnEnabled` was false and the Unarchive button was disabled forever;
  `_prefillUnarchiveGHDS`'s closing `updateSaveButtonState()` re-disabled the one `openForUnarchive` had
  just enabled by hand. Setting it is safe here because the Building Controller and Relay sections it also governs
  are hidden for this kind, and `handleSave` short-circuits to `_handleUnarchiveSave` before any
  `'__new__'` sentinel is read. Line and Relay unarchive were never affected.
- **Node Type moved above Hostname on the Building Controller panel**, so the panel and the Create form finally
  agree (the form already had it first). The Save-time focus order comes from `PANEL_FIELD_RULES.line`
  (Node Type → Hostname → IP → Proxy URL → Description → Location), so an empty Node Type is focused
  first. The Campus Hub and Relay panels have no Node Type — it is a
  per-controller property (`FR-GH-04`).
- **Every generated Proxy URL ends in `/campus/`, Relay included.** `deriveCDNProxyURL` was appending
  `/relay/` on both rules; the short name (`rly<floor>-<server>`) is now the only thing that differs from the
  building controller derivation. Nothing in the seed data needed editing — nine of the ten Relays ship `proxyURL: ''` and
  are filled by `_backfillCDNProxyURL` at load (`rvrs-rly1-1` carries a hand-typed URL). This **corrects `FR-P2-19` as originally written**, which
  specified `/relay/`; treat any surviving `/relay/` in older prose as stale.
- _SUPERSEDED by the automatic Proxy URL (`FR-P2-25`, v2.36) — the Generate buttons, `.proxy-input-group`,
  `proxyGenerateState` and the `*Generate*` functions are gone; kept for history._
  **Proxy URL is generated on demand, not derived live** (since `f2bcab1d`; required on Building Controller + Relay
  since v2.31). Every building controller/Relay Proxy URL field is a `.proxy-input-group` with a leading **Generate** button
  (`wand.and.sparkles`: `#infoProxyGenerate`, `#cdnProxyGenerate`, `#newLineProxyGenerate`,
  `#newCDNProxyGenerate`). `proxyGenerateState(hostname, campus hub, kind)` (`config-data.js`) decides
  enablement and the tooltip ("Cannot be auto generated: missing …"); the button uses `aria-disabled` so it
  stays hoverable. Clicking writes `deriveLineServerProxyURL` / `deriveCDNProxyURL` into the field
  (`_generatePanelProxyURL` / `_generateCDNPanelProxyURL` on the panel, `generateLineProxyURL` /
  `generateCDNProxyURL` in the drawer), clears the required error and refreshes the Save gate by hand (no
  `input` fires). A `null` derivation writes "Could not be generated from this hostname — enter the Proxy
  URL manually." into `#infoProxyNote` / `#cdnProxyNote` / `#newLineProxyHelp` / `#newCDNProxyHelp` —
  effectively unreachable, since Generate is disabled in exactly that case. **Nothing re-derives
  afterwards** — not a rename, not a Campus Hub change, not Save; there is no Reset link, no "Manually edited."
  state and no touched flag. The one exception is `moveLineServerToGHDS` (above). Both rules require a
  parseable short name (`bc<floor>-<server>` / `rly<floor>-<server>`), **master Campus Hub included**; master
  `hub.atrium.test` (exact) → `https://<hostname>/campus/` with no domain rewrite, any other Campus Hub →
  `https://<campus hub>/<short>/campus/`. `_backfillProxyURL` / `_backfillCDNProxyURL` still stamp seed records
  at load: of the 44 distinct seed building-controller hostnames (active and archived), 36 end up with a Proxy URL (35 derived, plus the hand-typed `rvrs-bc2-3`) and 8 stay
  empty — `engr-bc-studio`, `atrium-test`, `arts-bc01-2-old` and the five archived `*-old` controllers (`hlsd-bc001-old`, `meds-bc001-old`, `meds-bc002-old`, `rvrs-bc9-1-old`, `rvrs-bc9-2-old`) — Proxy URL
  being required, those panels show the required error on open and keep Save disabled until a URL is typed or generated. 9 of 10 Relays end up with a URL (`meds-rly01`
  stays empty). **Campus Hubs have no Proxy URL field at all** (removed from panel and Create form in
  `f2bcab1d`); open buttons exist on the two remaining fields only (`PROXY_OPEN_FIELDS`).
- **Nine of the ten seed Relays ship `proxyURL: ''`** (the tenth, `rvrs-rly1-1`, holds a hand-typed URL) and are filled by `_backfillCDNProxyURL(cdnServersData)` at load, the Relay twin of `_backfillProxyURL`.
- **The estate grew: 8 new Campus Hub and 6 new Relays, across every campus that already had them.** Two per campus — one active, one archived — so both the archive and the unarchive flows have something to act on everywhere, on both server types. NORT gets Campus Hubs only; it has no Relay, and by design (Connected Campus campuses use the Building Controller itself as the Relay — the note on the Create form says so).
  - **Archived ones are flagged in place** (`archived: true` + `status: 'inactive'` inside `ghdsServersData` / `cdnServersData`), *not* moved to `archivedServersData`, which stays building-controller-only. That is `FR-P2-15` and what `_archiveStandaloneServer` does. All of them have empty `associatedLineServers` — a server with associations can't be archived, so an archived seed carrying them would be unreachable state.
  - **New *active* Campus Hub carry no building controllers on purpose.** Giving them any would mean re-pointing existing building controllers, which moves them in the tree and rewrites their derived Proxy URLs — far more than "add some servers". The upside is that every campus now has an association-free Campus Hub, which makes the archive and move actions demoable outside MEDS.
  - **Two new Relays are populated, additively.** `meds-rly3-1` and `rvrs-rly1-1` are failover Relays on their primary's Campus Hub. Since FR-P2-24 (one Relay per building controller) each takes one building controller off its primary (`meds-bc103`, `rvrs-bc1-7`) instead of sharing them; `_enforceSingleCDN` in `config-data.js` keeps the rule on load. No building controller's own data changed.
  - **Two new Relays fill gaps in the Proxy URL rule's seed coverage** (noted as missing when `FR-P2-19` landed): `hlsd-rly2-1` sits on the university master Campus Hub, so it is the only seed Relay taking Rule 2 (`https://hlsd-rly2-1.atrium.test/campus/`), and archived `meds-rly01` carries the legacy `rly01` name the short-name regex can't parse, so its Proxy URL stays **empty** and must be typed by hand (`FR-P2-14a`).
- **`getCDNProxySourceGHDSHostname` reads the option *text*, not the value.** Unlike `#infoGHDSSelect` (bare hostnames), `#newCDNGHDS` is keyed by Campus Hub **id**, and in the "inherited from Building Controller Campus Hub selection" case the option is cloned from the building controller dropdown and may carry an ` (NORT)` suffix — hence `ghdsHostnameFromAssociation(opt.textContent)`. When the Campus Hub section toggle is on the source is `#newGHDSHostname` as it is typed, mirroring `getProxySourceGHDSHostname`.
- **The Relay Create-form Proxy URL sits below Campus Hub Association**, matching the Building Controller form and for the same reason — it derives from it.
- **A Campus Hub *rename* re-derives generated URLs only.** `propagateGHDSRename` rewrites association strings, regenerates a Building Controller or Timetable Relay's Proxy URL when it was the generated one (`isProxyURLAutomatic`), and flags the others `proxyOutdated` (listed in the manual-update toast).
- **Campus Hub and Relays archive by flagging the record in place**, not by moving datasets. A building controller is stored once *per associated faculty*, so archiving it has to fan copies out into `archivedServersData` to preserve faculty history; a Campus Hub lives once under `ghdsServersData[campus][key].children[0].children` and a Relay once under `cdnServersData[campus][key].children`, with no faculty dimension. `_archiveStandaloneServer` (`manage-actions.js`) therefore just sets `archived: true` + `status: 'inactive'` via `forEachServerCopy`, and unarchive clears them. Every association pointing at the server survives untouched, which is what makes the unarchive lossless. `buildAllServersTree` already `Object.assign`-clones Campus Hub/Relay nodes, so the flag reaches the tree for free and `createTreeNode`'s existing `node.archived` branch renders the tag without a change.
- **The archive and move gates read the panel's own helper.** `_archiveBlockReason` calls `_ghdsAssociatedLineServers(node, true)` (activeOnly — archived Building Controllers don't block) for a Campus Hub — the same function behind the panel's ASSOCIATED BUILDING CONTROLLERS list and `_moveBlockReason` — and `node.associatedLineServers.length` for a Relay. A blocked action stays *listed* but gets `popover__menu-item--disabled` (already in the design system, no CSS added) with the reason as `title`. `_showArchiveConfirm` re-checks the gate before opening, so a menu built against since-mutated data can't slip through.
- **Asset Registry refusals are one two-line toast** for single-server actions; bulk and Campus changes collect `fsnRefusalDetail(...)` objects and show `notifyFSNFailures` (warning toast + Details dialog). `fsnHostRemovalError(node, action)` (`config-data.js`; action `archive` | `disable` | `hostname`) returns the HTML for "<strong>Unable to <action>, Registry Sync change was not successful.</strong><br>&lt;server error message&gt;" or null. A node refuses only when `fsnRefuses` is set — seeded on the faculty-less controllers `lab-bc01-1`, `lab-bc01-2`, `lab-bc01-3` and `lab-bc02-1` (all `.atrium.test`; `lab-bc02-2` and `lab-bc02-3` are accepted, and with no faculty their hostnames are editable). Callers: archive (`manage-actions.js`), panel Save (`_panelFSNRefusal`), bulk and Campus cascade (joined with `<br>`).
- **Campus Hub Hostname Save popconfirm.** `handleSaveClick` → `_confirmGHDSChangeIfNeeded` checks `_pendingGHDSRename()` first (`{ lineServers, cdnServers }`) and reuses `#ghdsChangeConfirmPopover` (`_confirmGHDSRename`: warning with the counter in its text — no list; buttons Keep Editing / Yes, Save, set by `_setGHDSConfirmButtons`). The Relay-stranding message keeps the original Cancel / Save Changes copy. `propagateGHDSRename` regenerates the Proxy URL of Building Controllers where `isProxyURLAutomatic(ls, oldGHDS)` and sets `proxyOutdated = true` where `proxyURLNeedsManualUpdate` (URL present, not generated); the panel treats a `proxyOutdated` server whose URL is unchanged as outdated (`_panelProxyStaleAfterGHDSRename`, blocks Save).
- **Manual Proxy URL notice.** `propagateGHDSRename` returns `[{ type, name, campus, proxyURL }]` for the Building Controllers and Timetable Relays it flagged; the save paths (`_commitPanelSave` via `_renameNeedsManualProxy`, Campus Hub Unarchive, Campus Hub Move) pass it to `notifyProxyURLsNeedingUpdate` (`ui-helpers.js`): a persistent warning toast (`showToast(msg, type, { action })`) whose **Details** link opens `showProxyURLUpdateDetails` — a modal with a table and a Copy list (TSV) button. The tree/legend flag hostnames only. Seed: `rvrs-hub` has two generated-URL Building Controllers and one hand-typed (`rvrs-bc2-3`).
- **Archived tag in Associated Building Controllers.** `renderAssociatedLineServerList` appends the tree's `tag tag--tiny tag--gray` Archived badge when `isServerFullyArchived`. `rvrs-hub2` is served only by archived `rvrs-bc9-1-old` / `rvrs-bc9-2-old` (seeded in `archivedServersData`), so it is archivable.
- **"Show Archived Building Controllers" is now "Show Archived Nodes"** and covers all three types. `buildAllServersTree` step 4a runs Campus Hub and Relay nodes through `_partitionArchived`, which either drops archived rows or sinks them to the bottom of their section — the same ordering the building controller list gets from its `activeLs` / `archivedLs` split.
- **One unarchive mode, three kinds.** `openForUnarchive` derives `_unarchiveKind` from `node.level` through the `UNARCHIVE_KINDS` table (key, label, section index, section id), shows only that section, hides its toggle header and the other two, and sets `lineServerEnabled` / `ghdsEnabled` / `cdnEnabled` to match so dependent-field updates scope correctly. `_resetUnarchiveMode` now restores **all three** sections plus whichever toggle header was hidden — it previously reset only sections 1–2 and the building controller header, which was correct when building controllers were the only kind. `_handleUnarchiveSave` branches to `_unarchiveLineSave` (the original body, extracted unchanged) or `_unarchiveStandaloneSave(kind)`.
- **A Campus Hub/Relay unarchive validates against itself.** `validate()` is never reached in unarchive mode (`handleSave` short-circuits), and its duplicate check would reject the record anyway: the in-place flag means the server never left the dataset, so its own hostname and IP are still "taken". `_validateExistingServer` (was `_validateStandaloneUnarchive`; now also used by Move and the Building Controller kind) runs required + IP-format + uniqueness with the node excluded, mirroring how `_hostnameInUse(hostname, previousHostname)` excludes the server being edited on the side panel. A Campus Hub renamed during unarchive goes through `propagateGHDSRename`; a Relay needs no propagation.
- **Campus Hub Association is an editable dropdown on the Building Controller AND Relay panels** (`#infoGHDSSelect`, `#cdnGHDSSelect`), moved out of the read-only info grid into the editable section — under IP Address on both panels; on the building controller panel it is followed by the Relay Association dropdown and then Proxy URL. The read-only ASSOCIATED CAMPUS HUB category stays as the navigable detail view. **The two panels store the association in different formats** and they are not interchangeable: a building controller keeps `"<hostname> (<Type>)"` (rebuilt by `lineServerGHDSAssociationLabel`), a Relay keeps the **bare hostname**, because `findCDNServersForGHDS` compares it with `===`. Option *values* are always the bare hostname; each commit branch re-applies its own format. A server pointing at a Campus Hub that has since been archived or gone out of scope keeps a **disabled** option for it, so the panel never silently reads "Not assigned".
- **A Campus Hub grants its building controllers access to faculties** (`FR-P2-18`), and that grant is what a Campus Hub change enforces: faculties the new Campus Hub doesn't carry are dropped from the building controller. `ghdsServersData` already had an `associatedProjects` field but it was empty on the three NORT records and absent everywhere else — vestigial. `_backfillGHDSProjects()` (config-data.js) now fills it at load from the faculties each Campus Hub's current building controllers run, which is the only signal the seed carries and makes the seed self-consistent (no pre-existing association is retroactively invalid — asserted in testing). `meds-hub2` is hand-authored to grant `SCI` only, so moving a building controller there demos a *partial* removal instead of stripping everything. `ghdsGrantedProjects(host)` is the lookup; the Campus Hub panel shows the grant read-only under **Faculties** (`#ghdsAssociatedProjects`) so the removal doesn't read as arbitrary.
- **Dropping the last faculty parks the server in the faculty-less controller bucket.** A building controller is stored once per associated faculty, so removing them all leaves no copy anywhere and the server silently disappears — the same trap the faculty-less unarchive hit. `_parkAsOrphanLineServer` runs *before* the field writes, so the parked copy still picks them up. `removeLineServerFromProject` is now shared: `manage-actions.js`'s `_removeProjectAssociation` delegates to it, so Manage Faculties and the Campus Hub cascade leave identical residue.
- **Association cascades live in one place** in `selection.js`, because Campus Hub associations are stored as hostname strings on *both* sides and nothing keeps the halves in step automatically. `_applyLineServerGHDSChange` swaps the server between the two Campus Hub `associatedLineServers` lists, drops Relay memberships on any other Campus Hub; `_applyCDNGHDSChange` is the mirror for a Relay that moved. Alert is independent of the Relay (`FR-LS-05` v2.38), so nothing syncs it.
- **Association writes must resolve the backing record.** `findNodeById` returns the *rendered* node, which `buildAllServersTree` builds as `Object.assign({}, relay, { children: [] })` — a clone with a **fresh** `children` array. Pushing a nested building controller copy onto that clone updates the panel for one repaint and is then discarded (the flat `associatedLineServers` array survives only because `Object.assign` copies the reference). `attachLineServerToCDN` / `detachLineServerFromCDN` therefore call `findCDNRecordById(node.id)` first, and both write **both** representations — the flat list the panel renders and the nested child the tree renders — since updating one leaves the two views disagreeing about the same association.
- **`Manage > Building Controllers` (Relay)** is a unified add/remove checklist with ADDING/REMOVING tags (replaced the add-only `Add > Building Controller`). Candidates are `getLineServersForCDN`: the Relay's Campus Hub, minus fully-archived **and minus any building controller already on another Relay** (FR-P2-24); disabled with a tooltip via `_manageCDNLSBlockReason` (no Campus Hub / "no Building Controllers on <campus hub>" / "…without a Timetable Relay"). The Building Controller side uses the panel's **Relay Association dropdown** instead — `Manage > Timetable Relays` was removed in v2.33. `_buildChecklist` (`opts.addRemove`, `opts.sortable`) has three call campuses (Faculties, controllers-for-Relay, controllers-for-Campus-Hub); `_checklistDiff()` is the single diff.
- **`isServerFullyArchived` counts faculty-less building controllers as live.** It scanned only `lineServersDataSets`, so a faculty-less server read as archived and was hidden from `getLineServersForCDN` — invisible before, load-bearing now that the Relay's list is the only way to attach one.
- **`getGHDSServersForSite` / `getCDNServersForSite` moved to `config-data.js`.** They were private to the drawer IIFE; the panel dropdowns and the association drawers need the same lists, and all of them must exclude archived servers identically. The drawer's copies were deleted rather than left to drift.
- ⚠️ **Reversed on 2026-11-04: `requirements.md` `FR-P2-04` is reinstated** (a Timetable Release blocks turning Registry Sync off, alongside the Asset Registry refusal of `FR-P2-30`). This prototype has not rebuilt the check yet, so the entry below describes the code as it is today, not the requirement.
- **No Timetable Release check on Registry Sync.** Disabling the Configuration toggle is unrestricted on all three write paths — Building Controller panel, bulk, and campus cascade. `_validateConfigInUseSidePanel` and `_cbDeployBlockedMessage` are gone from `selection.js` (and the call out of `handleSaveClick`), and `applyConfiguration` in `bulk-mode.js` no longer builds a blocked list. `requirements.md` `FR-P2-04` is **withdrawn** (number retained so cross-references resolve). This has now flipped twice — the check was deleted by `3389c39`, restored, then withdrawn by decision — so don't "restore" it again from history without checking `FR-P2-04` first. The guard remains on **archiving and moving** (`_showArchiveConfirm`, `_moveBlockReason`), building controllers only.
- **`cbDeployScheduled` survives for the archive and move guards** (`FR-DS-07`, `manage-actions.js` `_showArchiveConfirm` / `_moveBlockReason`). `_cbDeployScheduledHosts` + `_backfillCBDeploy()` stay in `config-data.js` because the flag must land on **every copy** of a hostname: a building controller is stored once per associated faculty, so the older inline literal guarded only the copy the user happened to open and archiving from any other faculty branch slipped through. Seed set is back to the single demo server `rvrs-bc1-3.atrium.test` — the extra hostnames existed to demo the multi-blocker Asset Registry copy, which no longer exists.
- **Faculties are optional when unarchiving.** `_handleUnarchiveSave` used to bail with a `Select at least one faculty` warning. Removed — but the restore loop is `faculties.forEach(...)`, so with zero faculties the server was deleted from `archivedServersData` and never re-inserted, i.e. it would vanish from the tree. Added the faculty-less branch that `insertLineServer` already uses for a faculty-less create (`orphanLineServersData[campus]`, which `ui-helpers.js` surfaces), so the server comes back as faculty-less with the `No Faculties selected` hint (`FR-LS-09a`). The unarchive-mode `Faculties` label swap is gone too — the label stays `Faculties (optional)` in both modes — which made `_setProjectsLabel` and its restore call dead code, now removed (`new-node-drawer.js`).
- **Bulk Asset Registry notice copy caught up with v2.15.** `_updateBulkFSNNotice` still said "the current **Faculties filter**" and computed `narrowed` from the Faculties filter alone, so with an active Registry Sync filter it claimed it would touch "every building controller" while silently excluding some. Now matches `_updateSiteFSNNotice`: "the current **filters**", and `narrowed` also consults `_siteFSNFilter()`. The two hardcoded pre-v2.15 strings in `index.html` (`#bulkFSNApiCallsNoticeMessage`, `#siteFSNApiCallsNotice`) — what renders before the first refresh — were updated to match (`bulk-mode.js`, `index.html`).
- **The global search dropdown was rebuilt to the design spec** (UX-14 review). It used to render a two-line `name` over a full breadcrumb `path`, with uppercase group titles and no count, no IDs and no faculties — and it matched Campus / Faculty / Node Category rows too, which are not selectable servers. It now opens with an `N results found:` count line, groups results Building Controller → Campus Hub → Relay, and gives every group a **header row** carrying the type icon, the type name and the names of its right-hand columns. That header is the point of the change: without it the ID on the right reads as a per-row count. Rows are one line — `<CAMPUS> › <hostname>` with the matched substring **bolded** (not `mark`-highlighted, unlike the tree), an `Archived` tag, faculty tags and the ID. Three things that are load-bearing rather than cosmetic: the `--projects` / `--id` cells are **fixed widths shared by the header and the rows**, and Campus Hub / Relay rows render an *empty* faculties cell rather than omitting it, or their ID column would slide out from under its label; results are de-duplicated on `level::id`, because a non-NORT campus pulls in the master Campus Hub its building controllers point at, so two such campuses would otherwise list `hub.atrium.test` twice; and the **master Campus Hub renders with no campus prefix**, since it is shared across campuses and a `<CAMPUS> ›` breadcrumb on it would be a lie. Clicking a result now calls `navigateToServer` (`selection.js`) instead of the local `expandPathToNode` — Campus Hub and Relay results live inside collapsed sections and the DOM-walking version expands them reliably; `expandPathToNode` and `buildNodePath` were deleted with the breadcrumb they served. Also fixed on the way through: the outside-click dismissal keyed off `.tree-search`, a class the markup never carries (it is `.tree-search-wrapper`), so clicking back into the field closed the dropdown — it only *looked* right because the row handler closes it first. Escape now dismisses without clearing the query, and a no-match search shows `No results found` instead of nothing at all (`js/tree-search.js`, `css/tree-search.css`, `maps/js/tree-search.md`, `maps/css/tree-search.md`, `requirements.md` `UX-14`).
- **Subheader search bar renders correctly again.** The magnifying-glass icon had `position: absolute` applied directly to the `<sf-symbol>`, which is inert — `sf-symbol.js` writes `display: inline-block; position: relative` as **inline styles** on its own host, and inline beats a class rule. With `.form-input { width: 100% }` the symbol therefore wrapped onto a second line at the wrapper's left edge (icon below-left of the input) and doubled the wrapper's height, knocking the field out of vertical alignment with the Campus multi-select. Fixed by wrapping the symbol in a `<span class="search-input-icon">` and positioning the span — the same pattern the Manage Devices prototype uses for its search icon. Two dead CSS rules went with it: the positioning context and the disabled-opacity rule both keyed off `.search-input-wrapper`, a class the markup never carried; they now key off the real `.tree-search-wrapper`, which also means the wrapper self-anchors instead of leaning on `css/subheader.css`. Markup lives in `runtime/canvas-navigation-data.json` (the "Manage Infrastructure" subheader), so it is not grep-reachable from `manage-infrastructure/` (`canvas-navigation-data.json`, `css/tree-search.css`, `maps/css/tree-search.md`).
- **Proxy URL derivation rules** live in `config-data.js` — `deriveLineServerProxyURL`, `lineServerProxyShortName`, `deriveCDNProxyURL`, `cdnProxyShortName`, `ghdsHostnameFromAssociation`, `MASTER_GHDS_HOSTNAME` — spec `requirements.md` `FR-P2-14` / `FR-P2-19`. The short-name regex returns `null` for legacy `gh101`-style names and callers treat `null` as "tell the user to type it" — never a guess. Re-derive seed counts with the snippet in `maps/js/config-data.md` rather than trusting a number after a data change.
- **The Campus Hub-change confirmation is not a design-system popover-trigger pair.** The design system binds a toggle to the first `button` inside any `.popover__trigger` (`querySelectorAll(".popover__trigger")` in `design-system.min.js`), so wrapping the panel's Save button in one made **every** Save click open the popover, and the design system's positioner then centred it on the trigger with inline styles — off the right edge of the panel, buttons unreachable. The popover is now a plain child of `.settings-panel__footer` (which gains `position: relative`) with `.panel-confirm-popover` anchoring it `bottom: 100%; right: var(--space-m)` and re-aiming the arrow over Save. Because nothing design-system-owned positions it, plain CSS suffices — no `!important` needed. Two things this depends on: `handleSaveClick` calls `e.stopPropagation()` when it opens the popover, or the design system's document-level "close every popover" handler would shut it on the way up; and the rule must **not** re-declare `display`, since it loads after the design system and would beat `.popover--open`.
- **Open-in-new-tab action on both Proxy URL fields** (`#infoProxyURLOpen`, `#cdnProxyURLOpen` — Campus Hub has no Proxy URL): `arrow.up.right.square` in a `.navigate-icon-btn`, beside the `.proxy-input-group` in `.setting-value__input-row` (`css/settings-list.css`). `initProxyOpenButtons` / `_syncProxyOpenButtons` in `selection.js` target the **saved** URL, captured into `_proxyOpenURLs` at the settle points (selection / Save / Discard) — the icon is not wired to `input`, so an unsaved edit can neither re-point it nor change its enabled state.
- **Hostname fields carry full example placeholders** — `e.g. meds-bc1-4.atrium.test` / `e.g. meds-hub.atrium.test` / `e.g. meds-rly1-1.atrium.test` on both the Create form and the panels — plus a persistent `.field-note` format hint under each Hostname field. The domain is validated (`atrium.test`); the short-name shape is not (`index.html`).
- **Hostname is editable on all three side panels** — reverses the earlier read-only-hostname change. `#infoHostname`, `#ghdsHostname` and `#cdnHostname` are `form-input`s at the top of each panel's editable section (below Node Type on the building controller panel). Hostname is in snapshot/restore/dirty/commit and in `dirtyTextIds` / `PANEL_FIELD_RULES`; Save enforces required + `atrium.test` suffix + uniqueness (`_serverFieldInUse`, excluding the edited server by its *previous* value — copies share a name but not always an id). The **building controller** Hostname locks while the server has faculties (`_lineHostnameLocked`); **Campus Hub and Relay are always editable** (the Campus Hub lock and `#ghdsHostnameNote` were removed in v2.31, since `propagateGHDSRename` rewrites every reference). Renames propagate through `propagateLineServerRename` (Campus Hub/Relay `associatedLineServers` + Relay-nested building controller copies) and `propagateGHDSRename` (`ghdsAssociation` on building controller/Relay records, exact-hostname match, ` (<Type>)` suffix preserved); a Relay rename needs no propagation (`index.html`, `selection.js`, `config-data.js`).
- **New building controllers are created with Registry Sync enabled** (`FR-P2-11`, which reversed the earlier "created disabled" behaviour). `insertLineServer` writes `fsnApiCalls: true` on both the per-faculty nodes and the faculty-less node (`new-node-drawer.js`), so the flag is explicit rather than relying on readers treating a missing value as enabled (`fsnApiCalls !== false`). Unarchive restores Registry Sync off (`FR-P2-10`).
- **Bulk and Campus scope is tree-driven.** ⚠️ An intermediate revision made archived building controllers bulk-selectable; the current code reverses that (`_kindForNode` in `bulk-mode.js` returns null for archived ones, and `_lineServerNodesForSite` skips them), matching the Bulk Mode row above and `FR-P2-10`. A building controller **visible and active in the tree** (including faculty-less ones) is bulk-eligible (Cmd/Shift+Click) and included when a Campus is selected. Campus Registry Sync state + the Registry Sync Save cascade are **tree-driven** — `selection.js` reads the rendered building controller nodes under a campus (`_lineServerNodesForSite`/`_lineServerIdsForSite`/`_siteTreeNode`) instead of re-walking raw data, so "visible" is the single definition of scope. Active Registry Sync writes go through to `lineServersDataSets` and `orphanLineServersData`; **archived building controllers are never written Registry Sync on** (see the Registry Sync archive note at the top of this section — `FR-P2-10`). The now-dead `_lsExcludedByFSNFilter` was removed.
- **Editable Proxy URL on side panels**: Building Controller (`#infoProxyURL`, under Relay Association) and Relay (`#cdnProxyURL`, under Campus Hub Association); Campus Hub has none. Participates in snapshot/restore/dirty/commit and is **required** (blur error, Save gate, Save backstop — `PANEL_FIELD_RULES`); no format or uniqueness check. Associated Campus Hub / Relay mirror fields stay read-only (`selection.js`, `index.html`).
- **Archiving turns Configuration off** (**superseded** — see the Registry Sync archive note at the top of this section): archiving a building controller forces Registry Sync off, the archived panel shows the toggle off + disabled, and the tree indicator reads Disabled (`manage-actions.js` `_archiveServerForProject`, `selection.js`, `ui-helpers.js` `buildAllServersTree`, `tree-rendering.js`, `config-data.js` `_forceArchivedFSNOff`). The earlier revision of this note said archiving *preserved* Configuration and that some NORT archived seed servers shipped with Registry Sync enabled — both no longer hold (`FR-P2-10`).
- **Unarchive drawer title** now reads "Unarchive Building Controller for &lt;Campus&gt;" (`new-node-drawer.js`).
- **No auto-select on campus load**: the tree loads with nothing selected; the details panel shows "Select item(s) in the tree to load options" (`ui-helpers.js` `updateLayoutVisibility`, `index.html`). Filter-change fallbacks also clear to the empty state instead of selecting the first campus (`init-search.js`).
- **Empty-campus Asset Registry fix**: `_siteScopedProjects` now intersects `selectedProjects` with the queried campus's own faculties, so an empty campus correctly shows Registry Sync as "Unavailable" (`selection.js`).
- **Timetable Release validation gates archiving and moving only.** Archiving a scheduled building controller is blocked with an error toast ("…Cancel the deploy before archiving."); Move is disabled in the menu with "Cancel the scheduled Timetable Release before moving." Disabling Registry Sync is **not** restricted — see the entry above and `requirements.md` `FR-DS-07` / withdrawn `FR-P2-04` (`config-data.js`, guard in `manage-actions.js` `_showArchiveConfirm`).
- **Tree ordering**: campuses render alphabetically regardless of selection order (`selectedSites` sorted in `init-search.js`).

## NOT IMPLEMENTED
- **Room safety interlocks are not part of this prototype.** An early draft carried a Safety Rule
  section on the Building Controller panel, a bulk version for a Campus / multi-select scope, an
  "Add from Catalog" drawer and a Copy From / Copy To pair. All of it was removed after the
  stakeholder review: safety rules are out of scope for Manage Infrastructure.
- `js/faculty-selection.js` is dead (subheader owns the Faculties filter).
- Maps for the _pending_ modules — added on next touch of each file.
