// kb-data.js — turns the knowledge base's Markdown into a graph model.
//
// There is no build step and no generated bundle: the page fetches the same files a
// human reads, so the graph can never drift from the documents. Everything the graph
// needs is already authored in the KB's own conventions:
//
//   module-knowledge-base/README.md   the manifest — one table row per topic, giving
//                                     its category (the `##` section it sits under),
//                                     its one-line summary and its source layers
//   <topic>.md  `# Title`             display title
//               line 3                the file's own one-line description
//               `## See also`         outbound relationships (bullets)
//               `## Cross-topic
//                  dependencies`      outbound relationships (table)
//               `## Status: …`        maturity, where the file declares one
//
// Adding a topic to the KB therefore adds a node here for free — the knowledge-base
// conventions already require the README row and the reciprocal cross-links.
//
// Public surface: window.KbData.load() -> Promise<model>
(function() {
  'use strict';

  var KB_DIR = 'module-knowledge-base/';

  // The four documents that are NOT nodes. They are the KB's shared context, reachable
  // from the floating buttons instead — putting them in the graph would make every
  // topic a neighbour of all four and drown the real relationships.
  var SHARED_DOCS = [
    { id: 'index',             path: KB_DIR + 'README.md',      title: 'Index',               icon: 'list.bullet.rectangle' },
    { id: 'glossary',          path: 'glossary.md',             title: 'Glossary',            icon: 'character.book.closed' },
    { id: 'system-overview',   path: 'system-overview.md',      title: 'System Overview',     icon: 'square.stack.3d.up' },
    { id: 'roles-permissions', path: 'roles-permissions.md',    title: 'Roles & Permissions', icon: 'person.badge.key' }
  ];

  // The IT-managed / Faculty-registered platform is inferred from mention density (see classifyPlatform), which is a
  // heuristic. Anything it gets wrong is corrected here by hand rather than by tuning the
  // thresholds — the counts are evidence, not truth.
  var PLATFORM_OVERRIDES = {
    // 'topic-id': 'kodiak' | 'groundhog' | 'both' | 'neutral'
    // Roles reach both platforms — they carry Room Booking Manager (IT-managed) permission
    // grants AND apply to Faculty-registered devices. Mention counts are too close to
    // call it either way on evidence alone.
    // Device Recovery is IT-managed only (the Faculty-registered option is disabled on the page),
    // although its text names Faculty-registered Devices to explain why they are excluded.
    'device-recovery': 'kodiak'
  };

  // Prototype folders under the workspace root. Used to turn `prototypes/<name>`
  // mentions in a Source map into working "Open prototype" links. Hardcoded because the
  // page cannot list a directory; update when a prototype folder is added or renamed.
  var PROTOTYPE_FOLDERS = [
    'manage-infrastructure', 'manage-devices', 'device-recovery'
  ];

  // External systems the KB keeps referring to. Drives the "External systems" layout.
  var SYSTEMS = [
    { id: 'AssetRegistry',      label: 'Asset Registry',       re: /\bAsset Registry\b/gi },
    { id: 'RoomBookingManager', label: 'Room Booking Manager', re: /\bRoom Booking Manager\b/gi },
    { id: 'CampusHub',          label: 'Campus Hub',           re: /\bCampus Hubs?\b/gi },
    { id: 'BuildingController', label: 'Building Controller',  re: /\bBuilding Controllers?\b/gi },
    { id: 'TimetableRelay',     label: 'Timetable Relay',      re: /\bTimetable Relays?\b/gi }
  ];

  // A system needs this many mentions before a topic is considered to orbit it —
  // one passing reference in a cross-link table is not a dependency.
  var SYSTEM_MIN = 3;
  var PLATFORM_MIN = 3;

  // --- Small Markdown helpers -------------------------------------------------

  // Strip inline Markdown down to readable prose: links to their text, bold/italic/code
  // markers removed. Used for summaries, chips and relationship labels.
  function plain(md) {
    if (!md) return '';
    return String(md)
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // [text](url) -> text
      .replace(/`([^`]*)`/g, '$1')
      .replace(/\*\*([^*]*)\*\*/g, '$1')
      .replace(/\*([^*]*)\*/g, '$1')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // All `](something.md)` targets in a chunk of Markdown, as topic ids.
  function linkedTopicIds(md) {
    var ids = [];
    var re = /\]\(([^)#]+?)\.md(?:#[^)]*)?\)/g;
    var m;
    while ((m = re.exec(md)) !== null) {
      // Targets are written relative to the file, e.g. `manage-devices.md` or `../glossary.md`.
      var id = m[1].split('/').pop();
      if (ids.indexOf(id) === -1) ids.push(id);
    }
    return ids;
  }

  // The body of a `## <heading>` section, up to the next `## ` (or EOF).
  function section(md, headingTest) {
    var lines = md.split('\n');
    var out = null;
    for (var i = 0; i < lines.length; i++) {
      var h = /^##\s+(.*)$/.exec(lines[i]);
      if (h) {
        if (out !== null) break;                 // hit the next section — stop
        if (headingTest(h[1].trim())) out = [];
        continue;
      }
      if (out !== null) out.push(lines[i]);
    }
    return out === null ? null : out.join('\n');
  }

  function tableRows(md) {
    var rows = [];
    md.split('\n').forEach(function(line) {
      var t = line.trim();
      if (t.charAt(0) !== '|') return;
      if (/^\|[\s:|-]+\|$/.test(t)) return;      // separator row
      var cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function(c) {
        return c.trim();
      });
      rows.push(cells);
    });
    return rows;
  }

  // --- Fetching ---------------------------------------------------------------

  function fetchText(path) {
    return fetch(path, { cache: 'no-store' }).then(function(res) {
      if (!res.ok) throw new Error(path + ' → HTTP ' + res.status);
      return res.text();
    });
  }

  // --- README: the manifest ---------------------------------------------------

  // Category sections are the `##` headings whose table is the topic table
  // ("| Topic | What it covers | Layers |"). Prose sections like "Known traps" and
  // "Conventions" also contain tables, so the header row is what discriminates.
  function parseManifest(readme) {
    var manifest = [];
    var categories = [];
    var lines = readme.split('\n');
    var category = null;
    var isTopicTable = false;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var h2 = /^##\s+(.*)$/.exec(line);
      if (h2) {
        category = h2[1].trim();
        isTopicTable = false;
        continue;
      }
      var t = line.trim();
      if (t.charAt(0) !== '|') { continue; }

      var cells = t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(function(c) { return c.trim(); });
      if (/^topic$/i.test(cells[0])) { isTopicTable = true; continue; }   // header row
      if (/^[\s:|-]*$/.test(cells.join(''))) continue;                    // separator
      if (!isTopicTable) continue;

      var link = /\[[^\]]*\]\(([^)]+?)\.md\)/.exec(cells[0]);
      if (!link) continue;

      var id = link[1].split('/').pop();
      manifest.push({
        id: id,
        category: category,
        summary: plain(cells[1] || ''),
        summaryMd: cells[1] || '',
        layers: (cells[2] || '').split('·').map(plain).filter(Boolean)
      });
      if (categories.indexOf(category) === -1) categories.push(category);
    }

    return { topics: manifest, categories: categories };
  }

  // Topics the README's own "Staleness & gaps" section calls out. Surfaced as a badge
  // (with the sentence that raised it) rather than silently trusted.
  //
  // Not every link in that section is a warning: it also lists prototypes with no KB
  // file and deliberately-excluded sources, and those paragraphs link topics only in
  // passing. Only two things count as a flag — a paragraph carrying the ⚠️ marker, or
  // one under the "Known stale fact" subheading.
  function parseFlagged(readme) {
    var body = section(readme, function(h) { return /^Staleness/i.test(h); });
    var flags = {};
    if (!body) return flags;

    var subheading = '';
    var paragraph = [];

    function flush() {
      if (!paragraph.length) return;
      var text = paragraph.join(' ');
      var isFlag = text.indexOf('⚠️') !== -1 || /stale/i.test(subheading);
      if (isFlag) {
        var reason = plain(text).replace(/^⚠️\s*/, '');
        if (reason.length > 220) reason = reason.slice(0, 217) + '…';
        linkedTopicIds(text).forEach(function(id) {
          if (!flags[id]) flags[id] = reason;
        });
      }
      paragraph = [];
    }

    body.split('\n').forEach(function(line) {
      var h3 = /^###\s+(.*)$/.exec(line);
      if (h3) { flush(); subheading = h3[1]; return; }
      if (!line.trim()) { flush(); return; }
      paragraph.push(line.trim());
    });
    flush();

    return flags;
  }

  // --- Per-topic file ---------------------------------------------------------

  function countMatches(text, re) {
    var m = text.match(re);
    return m ? m.length : 0;
  }

  function classifyPlatform(id, text) {
    if (PLATFORM_OVERRIDES[id]) return PLATFORM_OVERRIDES[id];
    var k = countMatches(text, /IT-managed/gi);
    var g = countMatches(text, /Faculty-registered/gi);
    if (k >= PLATFORM_MIN && g >= PLATFORM_MIN) return 'both';
    if (k >= PLATFORM_MIN) return 'kodiak';
    if (g >= PLATFORM_MIN) return 'groundhog';
    return 'neutral';
  }

  function classifyStatus(text, layers, summary) {
    // The file's own `## Status:` heading wins — it is the author's explicit statement.
    if (/^##\s+Status:\s*design-only/im.test(text)) return 'design-only';
    if (/^##\s+Status:\s*partially shipped/im.test(text)) return 'partial';
    if (/design-only/i.test(summary)) return 'design-only';
    var joined = layers.join(' ').toLowerCase();
    if (/client \(thin\)/.test(joined)) return 'partial';
    if (/\bclient\b/.test(joined)) return 'shipped';
    return 'design-only';
  }

  function detectSystems(text) {
    var out = [];
    SYSTEMS.forEach(function(sys) {
      var n = countMatches(text, sys.re);
      if (n >= SYSTEM_MIN) out.push({ id: sys.id, count: n });
    });
    out.sort(function(a, b) { return b.count - a.count; });
    return out;
  }

  function detectPrototypes(text) {
    var found = [];
    var re = /prototypes\/([a-z0-9-]+)/gi;
    var m;
    while ((m = re.exec(text)) !== null) {
      var name = m[1].toLowerCase();
      if (PROTOTYPE_FOLDERS.indexOf(name) === -1) continue;
      if (found.indexOf(name) === -1) found.push(name);
    }
    return found;
  }

  // "See also" bullets and "Cross-topic dependencies" rows, as outbound references.
  // A reference whose target is not a topic file (e.g. **Manage Infrastructure**, Room Booking Manager) is
  // kept too — it is real related content, it just has nowhere to link.
  function parseReferences(md, knownIds) {
    var refs = [];

    function push(kind, targetsMd, label) {
      var ids = linkedTopicIds(targetsMd).filter(function(id) { return knownIds.indexOf(id) !== -1; });
      if (ids.length) {
        ids.forEach(function(id) { refs.push({ kind: kind, to: id, label: plain(label) }); });
      } else {
        var name = plain(targetsMd);
        // Skip the shared-context bullets: they are covered by the floating buttons.
        if (!name || /^shared context/i.test(name)) return;
        // A reference with no explanatory prose (a bare pointer like "Workspace
        // conventions: workspace guide") has nothing to put on a card — drop it.
        if (!plain(label)) return;
        refs.push({ kind: kind, to: null, external: name, label: plain(label) });
      }
    }

    var seeAlso = section(md, function(h) { return /^see also$/i.test(h); });
    if (seeAlso) {
      seeAlso.split('\n').forEach(function(line) {
        var b = /^\s*[-*]\s+(.*)$/.exec(line);
        if (!b) return;
        // `- [x.md](x.md) — why it matters`  (em dash, en dash or hyphen)
        var parts = b[1].split(/\s+[—–-]\s+/);
        push('see-also', parts[0], parts.slice(1).join(' — '));
      });
    }

    var cross = section(md, function(h) { return /^cross-topic dependencies$/i.test(h); });
    if (cross) {
      tableRows(cross).forEach(function(cells) {
        if (/^topic$/i.test(cells[0])) return;   // header row
        if (cells.length < 2) return;
        push('cross-topic', cells[0], cells[1]);
      });
    }

    return refs;
  }

  function parseTopicFile(entry, md) {
    var titleMatch = /^#\s+(.*)$/m.exec(md);
    var body = md.split('\n');
    // Line 3 by convention: the file's own one-line description, under the H1.
    var description = '';
    for (var i = 1; i < body.length && i < 8; i++) {
      var t = body[i].trim();
      if (!t || t.charAt(0) === '#') continue;
      description = plain(t);
      break;
    }

    return {
      id: entry.id,
      kind: 'topic',
      path: KB_DIR + entry.id + '.md',
      title: titleMatch ? plain(titleMatch[1]) : entry.id,
      category: entry.category,
      summary: entry.summary,
      description: description,
      layers: entry.layers,
      status: classifyStatus(md, entry.layers, entry.summaryMd),
      platform: classifyPlatform(entry.id, md),
      systems: detectSystems(md),
      prototypes: detectPrototypes(md),
      headings: (md.match(/^##\s+.*$/gm) || []).map(function(h) { return plain(h.replace(/^##\s+/, '')); }),
      text: md,
      refs: [],          // filled in once every id is known
      neighbours: []     // filled in by buildEdges
    };
  }

  // --- Edges ------------------------------------------------------------------

  // One edge per pair, however many times the two files reference each other. `weight`
  // is that reference count, so thickness reads as "how coupled are these two".
  function buildEdges(topics) {
    var byId = {};
    topics.forEach(function(t) { byId[t.id] = t; });

    var edges = [];
    var index = {};

    topics.forEach(function(topic) {
      topic.refs.forEach(function(ref) {
        if (!ref.to || !byId[ref.to] || ref.to === topic.id) return;
        var key = [topic.id, ref.to].sort().join('::');
        var edge = index[key];
        if (!edge) {
          var pair = key.split('::');
          edge = { id: key, a: pair[0], b: pair[1], weight: 0, refs: [] };
          index[key] = edge;
          edges.push(edge);
        }
        edge.weight++;
        edge.refs.push({ from: topic.id, to: ref.to, kind: ref.kind, label: ref.label });
      });
    });

    edges.forEach(function(edge) {
      byId[edge.a].neighbours.push(edge.b);
      byId[edge.b].neighbours.push(edge.a);
    });
    topics.forEach(function(t) {
      t.neighbours = t.neighbours.filter(function(v, i, arr) { return arr.indexOf(v) === i; });
      t.degree = t.neighbours.length;
    });

    return edges;
  }

  // --- Public -----------------------------------------------------------------

  var model = null;

  window.KbData = {
    SHARED_DOCS: SHARED_DOCS,
    SYSTEMS: SYSTEMS,

    get: function() { return model; },

    load: function() {
      if (model) return Promise.resolve(model);

      return fetchText(KB_DIR + 'README.md').then(function(readme) {
        var manifest = parseManifest(readme);
        if (!manifest.topics.length) {
          throw new Error('No topic rows found in module-knowledge-base/README.md — the graph is built from its tables.');
        }
        var knownIds = manifest.topics.map(function(t) { return t.id; });
        var flagged = parseFlagged(readme);

        var topicFetches = manifest.topics.map(function(entry) {
          return fetchText(KB_DIR + entry.id + '.md')
            .then(function(md) { return parseTopicFile(entry, md); })
            .catch(function(err) {
              console.warn('KB: could not read ' + entry.id + '.md', err);
              return null;
            });
        });

        var sharedFetches = SHARED_DOCS.map(function(doc) {
          return fetchText(doc.path)
            .then(function(md) {
              var titleMatch = /^#\s+(.*)$/m.exec(md);
              return {
                id: doc.id, kind: 'shared', path: doc.path, icon: doc.icon,
                title: doc.title,
                documentTitle: titleMatch ? plain(titleMatch[1]) : doc.title,
                text: md,
                headings: (md.match(/^##\s+.*$/gm) || []).map(function(h) { return plain(h.replace(/^##\s+/, '')); })
              };
            })
            .catch(function(err) {
              console.warn('KB: could not read ' + doc.path, err);
              return null;
            });
        });

        return Promise.all([Promise.all(topicFetches), Promise.all(sharedFetches)])
          .then(function(results) {
            var topics = results[0].filter(Boolean);
            var shared = results[1].filter(Boolean);
            if (!topics.length) throw new Error('None of the topic files could be read.');

            var ids = topics.map(function(t) { return t.id; });
            topics.forEach(function(topic) {
              topic.refs = parseReferences(topic.text, ids);
              topic.flagged = !!flagged[topic.id];
              topic.flagReason = flagged[topic.id] || '';
            });

            var edges = buildEdges(topics);

            model = {
              topics: topics,
              shared: shared,
              edges: edges,
              categories: manifest.categories.filter(function(cat) {
                return topics.some(function(t) { return t.category === cat; });
              }),
              byId: topics.reduce(function(acc, t) { acc[t.id] = t; return acc; }, {}),
              sharedById: shared.reduce(function(acc, d) { acc[d.id] = d; return acc; }, {}),
              // The relationship text one topic wrote about another, for the related cards.
              // Prefer what THIS file says about the neighbour (its Cross-topic dependencies
              // row is the most specific), then its See also bullet, then the neighbour's
              // own description of the relationship.
              relationship: function(fromId, toId) {
                var edge = edges.filter(function(e) {
                  return (e.a === fromId && e.b === toId) || (e.a === toId && e.b === fromId);
                })[0];
                if (!edge) return '';
                var labelled = edge.refs.filter(function(r) { return r.label; });
                var pick = labelled.filter(function(r) { return r.from === fromId && r.kind === 'cross-topic'; })[0]
                        || labelled.filter(function(r) { return r.from === fromId; })[0]
                        || labelled[0];
                return (pick || {}).label || '';
              }
            };
            return model;
          });
      });
    }
  };
})();
