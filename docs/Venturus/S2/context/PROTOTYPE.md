# Knowledge Base — PROTOTYPE.md (router)

## META
- **Path**: `/prototypes/context/`
- **Architecture**: Map architecture (modular `js/` + `css/` + `maps/`)
- **Dependencies**: DaVinci Canvas; `marked` (auto-loaded globally by `plugins.js`); the
  shared `.requirements-drawer__markdown` typography from the `proj-requirements-panel`
  plugin. **No graph library** — the SVG, the force simulation and all five layouts are
  hand-rolled in `js/kb-graph.js`.
- **Navigation**: no entry in `canvas-navigation-data.json`. Reached from the
  **Knowledge Base** button that the `proj-kb-launcher` plugin injects into every
  prototype's ribbon; the same plugin puts a **Back to prototypes** button in that slot
  here. The canvas top-navbar and sub-header are hidden on this page — the ribbon is the
  only chrome kept, and the graph toolbar is the page's own header.
- **Not design-system-styled**: the graph surface is a deliberate dark tool surface with its own
  local palette, and the page bed behind it is darkened to match. Only the reading drawer
  follows the design system. The ribbon keeps DaVinci's yellow: that marker is
  workspace-wide, not this page's to restyle.

## Purpose
A node-graph browser over the Atrium knowledge base. Three topic documents (Manage Infrastructure, Manage Devices, Device Recovery) become nodes,
their `See also` / `Cross-topic dependencies` cross-links become edges, and the four
shared documents (Index, Glossary, System Overview, Roles & Permissions) sit on a strip of
buttons across the top of the graph — they relate to everything, so as nodes they would
flatten it.

Selecting a node opens the document in a right-hand drawer that ends in **related
content** cards — one per neighbour, carrying the relationship prose the file itself
wrote about it.

## This folder is also the knowledge base
`module-knowledge-base/`, `glossary.md`, `roles-permissions.md` and `system-overview.md`
are the KB itself, not copies. The UI lives here rather than in a folder of its own for a
packaging reason: `pack-milan.sh` and `pack-pages.sh` copy `prototypes/*/` only when the
folder contains an `index.html`. UI and documents in one prototype folder means a shared
Milan zip carries both; a `prototypes/knowledge-base/` UI reading `../context/*.md` would
ship with every document missing.

## No build step
The page fetches and parses the same Markdown a human reads, on every load. There is no
generated bundle to regenerate and nothing that can go stale against the files.

Adding a topic to the KB adds a node automatically, provided the two conventions the
knowledge base already follows:

1. **A row in `module-knowledge-base/README.md`.** That file is the manifest — the `##`
   section a row sits under becomes the node's category, and the row's own cells supply
   its summary and source layers. A topic file with no README row is invisible here.
2. **Reciprocal cross-links.** Edges come from `## See also` bullets and
   `## Cross-topic dependencies` rows. A topic nobody links to renders as an island.

## Derived facets
Three node properties are inferred rather than declared, and each is inferred from
evidence the reader can check:

| Facet | Source | Caveat |
|---|---|---|
| **Status** (shipped / partially shipped / design-only) | The file's own `## Status:` heading, else whether the README Layers cell lists `client` | Authoritative where the file declares it |
| **Platform** (IT-managed / Faculty-registered / both / neutral) | Mention counts, ≥ 3 to count | A heuristic. Correct it in `PLATFORM_OVERRIDES` at the top of `js/kb-data.js` — not by tuning thresholds |
| **External systems** (Asset Registry, Room Booking Manager, Campus Hub, Building Controller, Relay) | Mention counts, ≥ 3 to count | Drives the systems layout only |

A node carrying a `!` badge is one the README's own **Staleness & gaps** section calls
out; the tooltip and the drawer chip quote the sentence that raised it. Only paragraphs
carrying ⚠️, or sitting under the "Known stale fact" subheading, count — the section also
lists prototypes with no KB file, which link topics only in passing.

## Layouts
| Mode | Arrangement |
|---|---|
| **Relationship** (default) | Force-directed. Edge thickness = number of references between the pair |
| **Hierarchy** | One lane per README section |
| **IT-managed / Faculty-registered** | Lanes by inferred platform, plus a platform-neutral lane |
| **Maturity** | Lanes by status |
| **External systems** | Topics orbit their dominant system; a dashed connector marks *every* system they depend on |

Node colour is category in every mode, so a node keeps its identity as the arrangement
changes. Node size is connection count.

The force layout is deterministic — nothing here calls `Math.random()`, the seed is a
circle in manifest order — so the same KB always draws the same picture and two reviewers
see the same graph.

## Search
One case-insensitive scan over the raw Markdown of all seven documents (three topics, the README index and the three shared documents). Matching nodes keep
their badge and count; non-matching nodes are hidden (or dimmed, via the toolbar switch).
Results are grouped **Topics** and **Shared documents** — that second group exists because
the shared documents aren't nodes, so filtering the graph can never surface them, and a
glossary-only term would otherwise read as "nothing found".

Opening a result highlights every occurrence in the drawer with prev/next navigation.

## Interactions
- Click a node → open it in the drawer · double-click → isolate its 1-hop neighbourhood
- Hover → highlight neighbours, dim the rest, show a summary tooltip
- Drag a node to reposition · drag the background to pan · wheel or the buttons to zoom
- Escape unwinds one layer at a time: results list → isolate → drawer
- Inside the drawer, links to other KB documents select that node instead of navigating
- The legend explains the active layout and can be dismissed — from its own × or the
  toolbar's **Legend** toggle. The choice is remembered across sessions, because on a
  large graph the bottom-right corner it occupies is real estate.

## Gotchas
- **HTTP only.** The page reads the Markdown with `fetch`, so opening `index.html` from
  the file system shows the error state. Serve the workspace. (The Requirements and Q&A
  drawers already share this constraint.)
- **`PROTOTYPE_FOLDERS` in `js/kb-data.js` is hand-maintained.** It validates
  `prototypes/<name>` mentions before turning them into "Open prototype" chips, because a
  page cannot list a directory. Add a row when a prototype folder is added or renamed, or
  its chip silently disappears.
- **`classList.toggle(name, force)` needs a real boolean.** Passing `undefined` or `null`
  makes it *flip* the class instead of forcing it. Several expressions in
  `refreshClasses()` naturally produce those, so they are all coerced with `!!` — this
  already caused highlight state to flip-flop once.
- **The packagers rewrite `.davinci/` inside these documents.** `pack-milan.sh` and
  `pack-pages.sh` run a blanket `s#\.davinci/#davinci/#g` over every staged `.md`, which
  is right for prototype docs but also edits KB *prose* — `.davinci/davinci-users.json`
  reads as `davinci/davinci-users.json` in a shared build. Affects a few lines
  in `roles-permissions.md` and the three topic files, in the
  shared copy only; the workspace files are untouched. Not fixable from here — the
  packagers are plugin-owned and replaced on every top-up.
- Renaming this folder means updating `KB_URL` in
  `runtime/plugins/proj-kb-launcher.js`, which is the only place the path appears.
