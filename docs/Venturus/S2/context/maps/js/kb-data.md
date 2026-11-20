---
src: js/kb-data.js
does: Fetches the knowledge base Markdown and parses it into the graph model, nodes, edges and the facets the layouts group by.
symbols: [plain, linkedTopicIds, section, tableRows, fetchText, parseManifest, parseFlagged, flush, countMatches, classifyPlatform, classifyStatus, detectSystems, detectPrototypes, parseReferences, push, parseTopicFile, buildEdges]
exports: [window.KbData]
state: [KB_DIR, SHARED_DOCS, PLATFORM_OVERRIDES, PROTOTYPE_FOLDERS, SYSTEMS, SYSTEM_MIN, PLATFORM_MIN, model]
map-sig: v1 3414015667
---
