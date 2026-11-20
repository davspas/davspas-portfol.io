# Roles & Permissions

Who can do what in Atrium, as far as the prototypes actually implement it. Assembled from the `Roles & permissions` sections of the three [module knowledge base](module-knowledge-base/README.md) topics, the requirements documents, and the demo personas in `runtime/davinci-users.json`.

> ⚠️ **Read [Roles versus what is implemented](#roles-versus-what-is-implemented) first.** The role list below is the intended model. Only **Campus IT Admin** and **Viewer** exist as live prototype personas, and the only gate they actually exercise is navigation visibility.

## See also

- [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) — the Manage Infrastructure screens the gates sit on. This file is about the *effect* of permissions across the app; that one is about the module.
- [manage-devices.md](module-knowledge-base/manage-devices.md) — the Manage Devices screens, including Retire and the deprecated Approve and Reject actions
- [device-recovery.md](module-knowledge-base/device-recovery.md) — the Device Recovery screens, whose only gate is the read-only demo
- [system-overview.md](system-overview.md) — the auth entry path and campus scoping
- [glossary.md](glossary.md) — **Campus IT Admin**, **Viewer**, **Atrium Access**, **Directory group**

---

## Roles versus what is implemented

Atrium describes six roles. Two of them can be demonstrated; the rest are part of the intended model only.

| Role | What the role is for | Live prototype persona |
|---|---|---|
| **Campus IT Admin** | Full access. Manages infrastructure (Building Controllers, Campus Hubs, Timetable Relays) and devices | ✅ Maya Okafor — the default persona |
| **AV Technician** | Registers devices per room | ❌ Not a persona |
| **Facilities Manager** | Owns the physical rooms and floors | ❌ Not a persona |
| **Faculty Coordinator** | Approves Faculty-registered devices for a Faculty | ❌ Not a persona |
| **Help Desk** | First-line support; looks up devices and nodes | ❌ Not a persona |
| **Viewer** | Read-only | ✅ Daniel Reyes |

Only the two personas exist live. The remaining four roles are described by the requirements but nothing in the prototypes switches on them.

---

## The three gates

A user reaching a capability passes up to three independent checks. They stack — passing one says nothing about the others.

```
1. ROLE          Campus IT Admin? Viewer?              →  nav item hidden, or action absent
2. ACCESS        Granted this faculty / campus?        →  filtered campus list, or an empty state
                 (Atrium Access, external to Atrium)
3. RESOURCE      Is the target usable?                 →  a blocked menu item with a reason,
                 (not archived, not scheduled for a        an error toast, or the control vanishes
                  Timetable Release)
```

**Gate 2 is not an Atrium permission.** Faculty access is granted in Atrium Access. The campus and faculty lists in both prototypes are filtered to what the user may see.

**Gate 3 is easy to mistake for gate 1.** Cases where a missing or inert control is *not* a permission problem:

- A Building Controller scheduled for a **Timetable Release** cannot be archived, moved to another Campus, or have Registry Sync turned off until the release is cancelled (`FR-DS-07`, `FR-P2-23`, `FR-P2-04`). The menu item stays listed but inert, with its reason as a tooltip.
- **Archived** Building Controllers have Registry Sync and Relay Association locked, and an archived node cannot take new associations.
- Asset Registry may **refuse** a Registry Sync change (`FR-P2-30`), and that comes back as an error, not a missing button.
- An **ACTIVE** device cannot be retired.

---

## How a user gets a role

1. **Campus IT Admin is not assignable in Atrium.** Membership is the directory group **`atrium-admins`**, managed outside Atrium through Atrium Access (`access.atrium.test`).
2. **Viewer is the default** for a user who has no other role: read-only across the application, limited to the faculties they have access to.
3. **Anything more is requested, not self-served.** The other roles are granted by a Campus IT Admin on request.

Consequences worth knowing:

- Access is the **union** of a user's roles. There is no deny rule and no precedence order.
- Faculty access (gate 2) is independent of the role: both must pass.

---

## Where permissions actually take effect

In the prototypes, nowhere beyond the browser. The persona rules in `runtime/davinci-users.json` are CSS selectors that **hide**, **disable** or **mark readonly** parts of the page for the active persona, and the canvas re-applies them whenever the DOM changes. Nothing is enforced server-side because there is no server.

Two hooks exist for finer gating:

- **Navigation items** — `.nav-menu__item:has(> a[href$="manage-infrastructure"])` and its siblings hide a left-navigation entry.
- **Feature markers** — `_renderMenu` in `manage-infrastructure/js/manage-actions.js` stamps `data-permission="<feature>"` on any Manage-menu item that declares a `permission`, and on the menu's trigger when every item shares one. A rule of the form `[data-permission="<feature>"]` then hides the whole feature without leaving an orphaned heading or divider. No Manage-menu item declares a `permission` today, so this is a hook, not a live gate.

---

## What the personas gate

| Persona | Role | Nav items hidden | Controls disabled |
|---|---|---|---|
| **Maya Okafor** (default) | Campus IT Admin | None that belong to the two prototypes | None |
| **Daniel Reyes** | Viewer | **Manage Infrastructure** (`manage-infrastructure`) is hidden from the left navigation | None in these prototypes |

Notes:

- Manage Devices (`manage-devices`) is visible to both personas. Neither persona has readonly rules applied to its table, so a Viewer who reaches Manage Devices can still see Add, Retire and Export.
- `runtime/davinci-users.json` still carries selectors from earlier prototypes (for example entries for pages that do not exist here). They match nothing and are harmless.

---

## Per-module gates

What each module's sources actually state. **"Not stated" means the sources are silent — not that the module is ungated.**

| Module | Documented gate |
|---|---|
| [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) | ⚠️ **Partial.** The requirements define no role model for the module; the prototype hides the whole page from the Viewer persona via the navigation rule. Resource gates (Timetable Release, archived state, Asset Registry refusal) are documented in detail |
| [manage-devices.md](module-knowledge-base/manage-devices.md) | ❌ **Not stated.** Retire and Add are available to every persona who can reach the page. Whether Retire should be gated separately from Add is open |
| [device-recovery.md](module-knowledge-base/device-recovery.md) | ❌ **Not stated.** Device Recovery has no role gating in the prototype except the `?state=readonly` demo (hides Send Recovery Request, roll-out start, schedule and cancel, and Import version). Campus IT Admin is the audience; neither persona has rules applied to it |

**Score: 0 of 3 modules state a role gate in their requirements.** The only gate is the persona navigation rule.

---

## Gaps worth verifying

Each of these is a concrete follow-up the prototypes cannot resolve.

| # | Question | Why it matters |
|---|---|---|
| 1 | **What maps a user to a role?** Which directory group or claim makes someone an AV Technician, Facilities Manager, Faculty Coordinator or Help Desk user? | Only Campus IT Admin has a documented source (`atrium-admins`) |
| 2 | **Should Viewer see Manage Devices as read-only?** | Today a Viewer who reaches the page gets the full action set |
| 3 | **Is bulk retirement gated separately from registration?** [manage-devices.md](module-knowledge-base/manage-devices.md) | Retirement is a soft delete applied in bulk; nothing distinguishes it from registering |
| 4 | **Who may approve a Faculty-registered device?** | A Faculty Coordinator is the intended approver, but the Approve and Reject buttons are hidden in the prototype |
| 5 | **Should Registry Sync changes be gated?** [manage-infrastructure.md](module-knowledge-base/manage-infrastructure.md) | A campus-level cascade can change many controllers at once |
| 6 | **Is any of this audited?** | No module records who changed what beyond the "Updated by" column on devices |

---

## What this file does not tell you

Deliberately, because nothing implemented supports it:

- **Which role can use which module**, beyond the Viewer persona losing Manage Infrastructure.
- **What each non-live role means in practice.** AV Technician, Facilities Manager, Faculty Coordinator and Help Desk are named by the model; their permission sets are not defined.
- **Per-action permissions inside a module.** Where a module has one gate, that gate is all-or-nothing for the page.

### Prototype impersonation is not a specification

`runtime/davinci-users.json` configures two demo personas — **Campus IT Admin** (Maya Okafor) and **Viewer** (Daniel Reyes) — with CSS-selector `hide` / `disable` / `readonly` rules.

⚠️ **It is not a specification of anything.** Three reasons:

1. **The persona list only partially covers the role list.** Four of the six roles have no persona.
2. **It gates by CSS selector** — nav items and button ids. Renaming a button id or a nav href silently un-gates it.
3. **Its coverage is inconsistent and possibly accidental.** Manage Infrastructure is hidden from the Viewer and Manage Devices from nobody — with nothing recording whether that difference is deliberate.

Use it to demo a prototype as a given role. Do not use it to answer a permissions question.

---

## Source map

| Source | Layer | Path |
|---|---|---|
| `Roles & permissions` sections, both topics | Aggregated — the per-module table is built from these | [module-knowledge-base/](module-knowledge-base/README.md) |
| Manage Infrastructure requirements | Resource gates: Timetable Release, archive, Registry Sync | `manage-infrastructure/requirements.md` |
| Manage Devices requirements | Device lifecycle and Retire rules | `manage-devices/requirements.md` |
| Manage menu feature marker | The `data-permission` hook | `manage-infrastructure/js/manage-actions.js` |
| Prototype impersonation | Demo-only, **not authoritative** | `runtime/davinci-users.json` |
