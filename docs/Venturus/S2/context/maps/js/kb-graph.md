---
src: js/kb-graph.js
does: The graph itself, hand-rolled SVG rendering, five layouts, animated transitions, and all pointer interaction.
symbols: [el, clear, clamp, byId, layoutForce, layoutLanes, group, layoutHierarchy, layoutPlatform, of, layoutMaturity, layoutSystems, build, nodeRadius, wrapLabel, renderEdges, renderHubs, renderLanes, renderNodes, positionNodes, applyView, animateTo, frame, neighbourhood, isVisible, refreshClasses, wireNode, endDrag, wireStage, stopPan, zoomAround, bounds, topInset, fit, observeStage]
exports: [window.KbGraph]
dom: ["#kbSvg", "#kbViewport", "#kbLanes", "#kbEdges", "#kbNodes", "#kbFloating"]
state: [LAYOUTS, CATEGORY_COLORS, LANE_GAP, NODE_MIN_R, NODE_MAX_R, ANIM_MS, MIN_ZOOM, MAX_ZOOM, FIT_ZOOM_MAX, MIN_FIT_PX, FIT_MARGIN, els, model, nodes, edges, hubs, sysLinks, categoryColor, layout, view, selectedId, hoverId, isolateId, visibleIds, hideNonMatching, badges, callbacks, animFrame]
deps: [kb-data.js#KbData.SYSTEMS]
map-sig: v1 3918928882
---
