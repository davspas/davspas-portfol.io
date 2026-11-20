/**
 * ProjJsonDiff — side-by-side JSON diff plugin component
 *
 * Factory: ProjJsonDiff.create(config).render()
 *
 * Two payloads, one aligned line-by-line comparison: gutter line numbers, a red
 * tint on lines only the left side has, a green tint on lines only the right side
 * has, an inline mark on the part of a paired line that actually changed, and a
 * "N differences found" badge with prev/next navigation.
 *
 * WHAT THE THREE STATES MEAN, because the whole component exists to say this and
 * nothing else:
 *
 *   added     a run only the right side has  → green block on the right, striped
 *                                              filler on the left
 *   removed   a run only the left side has   → red block on the left, striped
 *                                              filler on the right
 *   changed   a line present on both, differing → red on the left BESIDE green on
 *                                              the right, on one row, with the
 *                                              differing span marked in each
 *
 * ⚠️ FOR RECORD DATA (an array of objects) THOSE HAVE TO LAND ON WHOLE RECORDS, and
 * two things in `anchorsFor` / `slideRuns` exist only to make that true. Read both
 * ⚠️ notes before touching the alignment: pretty-printed JSON breaks the textbook
 * versions of each, and the failures are not subtle — one reported a removal plus an
 * addition as a chain of renames, the other tinted an untouched record green.
 *
 * Config:
 *   container    {Element} target element (or use containerId)
 *   containerId  {string}  id of the target element
 *   left         {object}  { label, title, text } — the BEFORE pane
 *   right        {object}  { label, title, text } — the AFTER pane
 *                          `text` is a JSON string, or any value (stringified
 *                          with 2-space indent)
 *   copy         {boolean} per-pane copy-to-clipboard button (default true)
 *   navigate     {boolean} the differences badge + prev/next (default true)
 *
 * Instance:
 *   render()  build and bind — returns the instance
 *   count     number of difference BLOCKS (a run of adjacent changed lines is one)
 *   next() / prev()  scroll to the next/previous block and highlight it
 *
 * SCROLLING IS THE HOST'S JOB. The component has no height and no vertical
 * overflow of its own: the pane headers are `position: sticky`, so dropping it
 * into any scrolling container gives pinned headers without a nested scrollbar.
 * Navigation uses `scrollIntoView`, so it works whichever ancestor scrolls.
 */
(function() {
    'use strict';

    /* DP cell budget for the middle section, after common prefix/suffix are
       trimmed. One byte per cell (the direction matrix), so this is ~9MB and a
       few tens of ms at the very top end. Beyond it the middle is rendered as one
       replaced block — degraded alignment, never a frozen tab. */
    var MAX_CELLS = 9e6;

    var COPY_ICON = 'doc.on.doc';
    var COPIED_ICON = 'checkmark';

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /* A string stays a string; anything else is stringified as pretty JSON, so
       callers can pass the object they already have. */
    function toText(value) {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string') return value;
        try {
            return JSON.stringify(value, null, 2);
        } catch (err) {
            return String(value);
        }
    }

    function toLines(value) {
        return toText(value).replace(/\r\n/g, '\n').split('\n');
    }

    /* --- Diff -------------------------------------------------------------
     *
     * ANCHOR-FIRST (patience) DIFF, WITH LCS AS THE FALLBACK. Pretty-printed JSON
     * is the worst case for plain LCS: hundreds of records share the same shape, so
     * lines like `    "type": "varchar"` or `  {` repeat everywhere. LCS maximises
     * the NUMBER of matched lines and is free to match any of those duplicates to
     * any other, which produced records paired against unrelated records — a
     * payload where one field changed read as `OPTS` becoming `MDLC`.
     *
     * So: match only lines that are UNIQUE — in the WHOLE file, see `anchorsFor` —
     * on both sides (an `"attr_name"` line, a `project_config_id`), keep the longest
     * increasing run of those as anchors, and recurse into the gaps between them.
     * What survives is the alignment a reader would draw by hand. Gaps with no unique
     * line left fall back to LCS, and beyond the cell budget to a single wholesale
     * replacement.
     *
     * THEN THE RUNS ARE SLID — `slideRuns`. Alignment settles WHICH lines differ; a
     * minimal edit script does not settle WHERE an ambiguous run of them starts, and
     * for arrays of same-shaped records the default answer straddles two records.
     * That pass is about framing only; it never changes what the two files are.
     */

    /**
     * Longest increasing subsequence of `pairs` by `.b` — `pairs` arrives ordered by
     * `.a`, so this is what keeps the anchor set monotonic in both files (crossing
     * anchors cannot both be honoured).
     */
    function longestIncreasing(pairs) {
        var tails = [];
        var back = [];
        var i, lo, hi, mid;

        for (i = 0; i < pairs.length; i++) {
            lo = 0;
            hi = tails.length;
            while (lo < hi) {
                mid = (lo + hi) >> 1;
                if (pairs[tails[mid]].b < pairs[i].b) lo = mid + 1;
                else hi = mid;
            }
            back[i] = lo > 0 ? tails[lo - 1] : -1;
            tails[lo] = i;
        }

        var out = [];
        var k = tails.length ? tails[tails.length - 1] : -1;
        while (k >= 0) { out.push(pairs[k]); k = back[k]; }
        out.reverse();
        return out;
    }

    /**
     * How many times each line occurs in a WHOLE file. Computed once per diff and read
     * by `anchorsFor` at every level of the recursion — see the ⚠️ note there for why
     * uniqueness has to be measured against the file and not against the range.
     *
     * Set by `rowsFor()` and read all the way down. Module-level rather than threaded
     * through `diffRange`'s eight parameters; safe because a diff runs start to finish
     * synchronously, so two of them can never interleave.
     */
    var _countA = null;
    var _countB = null;

    function countLines(lines) {
        var counts = Object.create(null);
        for (var i = 0; i < lines.length; i++) {
            counts[lines[i]] = (counts[lines[i]] || 0) + 1;
        }
        return counts;
    }

    /**
     * Lines usable as anchors in this range: paired up and made monotonic.
     *
     * ⚠️ UNIQUE IN THE WHOLE FILE, NOT UNIQUE IN THE RANGE — and that distinction is the
     * difference between this diff working and this diff inventing renames. Textbook
     * patience diff tests uniqueness inside the range being aligned, on the assumption
     * that a line occurring once is a line that MEANS something. In pretty-printed JSON
     * it is the opposite: `  },`, `  {`, `"type": "varchar"` and every other shared field
     * value repeat across every record, so as soon as the range narrows to a record or
     * two they become "unique" by accident and anchor structural noise.
     *
     * What that cost: with one record removed and another added, the punctuation of the
     * surviving record in between anchored at its OLD offsets, which outvoted the two
     * real anchors (its own `bobcat_alias` and `attr_name` lines, which had moved and so
     * crossed the noise). The result read as a chain of renames — the removed record
     * "became" the survivor, the survivor "became" the added one — with no addition and
     * no removal reported anywhere, and an untouched record shown as changed twice.
     *
     * Measured against the file, a line like `  },` is never a candidate at any depth,
     * and an `"attr_name"` line is a candidate at every depth. `posB` still comes from
     * the range, so a globally unique line that lives outside this gap is not pulled in.
     *
     * ⚠️ THE TRADE IS FEWER ANCHORS, HENCE MORE LCS. A gap with no globally unique line
     * falls through to `lcsOps` — correct, just slower, and bounded by `MAX_CELLS`. For
     * record data it barely bites: every record carries a unique key line, so anchors
     * stay ~2 per record and the gaps stay a handful of lines.
     */
    function anchorsFor(a, b, lo1, hi1, lo2, hi2) {
        var posB = Object.create(null);
        var i, j, line;

        for (j = lo2; j < hi2; j++) posB[b[j]] = j;

        var pairs = [];
        for (i = lo1; i < hi1; i++) {
            line = a[i];
            if (_countA[line] === 1 && _countB[line] === 1 && posB[line] !== undefined) {
                pairs.push({ a: i, b: posB[line] });
            }
        }

        return longestIncreasing(pairs);
    }

    /**
     * Edit script over a range: `=` kept, `-` left-only, `+` right-only. Indices
     * are absolute into `a` / `b`.
     */
    function lcsOps(a, b, lo1, hi1, lo2, hi2) {
        var n = hi1 - lo1;
        var m = hi2 - lo2;
        var w = m + 1;
        /* 0 = match (diagonal), 1 = drop from a (up), 2 = take from b (left). */
        var dir = new Uint8Array((n + 1) * w);
        var prev = new Int32Array(w);
        var cur = new Int32Array(w);
        var i, j, tmp;

        for (i = 1; i <= n; i++) {
            cur[0] = 0;
            for (j = 1; j <= m; j++) {
                if (a[lo1 + i - 1] === b[lo2 + j - 1]) {
                    cur[j] = prev[j - 1] + 1;
                    dir[i * w + j] = 0;
                } else if (prev[j] >= cur[j - 1]) {
                    cur[j] = prev[j];
                    dir[i * w + j] = 1;
                } else {
                    cur[j] = cur[j - 1];
                    dir[i * w + j] = 2;
                }
            }
            tmp = prev; prev = cur; cur = tmp;
        }

        var out = [];
        i = n; j = m;
        while (i > 0 && j > 0) {
            var d = dir[i * w + j];
            if (d === 0) { out.push({ t: '=', a: lo1 + i - 1, b: lo2 + j - 1 }); i--; j--; }
            else if (d === 1) { out.push({ t: '-', a: lo1 + i - 1 }); i--; }
            else { out.push({ t: '+', b: lo2 + j - 1 }); j--; }
        }
        while (i > 0) { out.push({ t: '-', a: lo1 + i - 1 }); i--; }
        while (j > 0) { out.push({ t: '+', b: lo2 + j - 1 }); j--; }
        out.reverse();
        return out;
    }

    /* Recursion guard. Each level strictly shrinks the range, so this is a
       backstop against a pathological anchor chain rather than a real limit —
       hitting it costs alignment quality in one gap, nothing else. */
    var MAX_DEPTH = 24;

    function diffRange(a, b, lo1, hi1, lo2, hi2, depth, out) {
        var i, j, k;

        while (lo1 < hi1 && lo2 < hi2 && a[lo1] === b[lo2]) {
            out.push({ t: '=', a: lo1, b: lo2 });
            lo1++; lo2++;
        }

        var tail = [];
        while (hi1 > lo1 && hi2 > lo2 && a[hi1 - 1] === b[hi2 - 1]) {
            hi1--; hi2--;
            tail.push({ t: '=', a: hi1, b: hi2 });
        }
        tail.reverse();

        if (lo1 === hi1 || lo2 === hi2) {
            /* One side has nothing left: everything remaining is a pure add or a
               pure remove. */
            for (i = lo1; i < hi1; i++) out.push({ t: '-', a: i });
            for (j = lo2; j < hi2; j++) out.push({ t: '+', b: j });
        } else {
            var anchors = depth < MAX_DEPTH ? anchorsFor(a, b, lo1, hi1, lo2, hi2) : [];

            if (anchors.length) {
                var pa = lo1;
                var pb = lo2;
                for (k = 0; k < anchors.length; k++) {
                    diffRange(a, b, pa, anchors[k].a, pb, anchors[k].b, depth + 1, out);
                    out.push({ t: '=', a: anchors[k].a, b: anchors[k].b });
                    pa = anchors[k].a + 1;
                    pb = anchors[k].b + 1;
                }
                diffRange(a, b, pa, hi1, pb, hi2, depth + 1, out);
            } else if ((hi1 - lo1) * (hi2 - lo2) <= MAX_CELLS) {
                var ops = lcsOps(a, b, lo1, hi1, lo2, hi2);
                for (k = 0; k < ops.length; k++) out.push(ops[k]);
            } else {
                /* Too big to align line by line — state it as one wholesale
                   replacement rather than guessing. */
                for (i = lo1; i < hi1; i++) out.push({ t: '-', a: i });
                for (j = lo2; j < hi2; j++) out.push({ t: '+', b: j });
            }
        }

        for (k = 0; k < tail.length; k++) out.push(tail[k]);
    }

    /* Leading whitespace, in characters. The only thing `slideRuns` scores on.
       A line that is nothing BUT whitespace scores as unreachably deep, so a blank line
       can never win a tie and drag a block onto itself. */
    function indentOf(line) {
        var i = 0;
        while (i < line.length && (line.charCodeAt(i) === 32 || line.charCodeAt(i) === 9)) i++;
        return i === line.length ? Infinity : i;
    }

    /**
     * Slide each pure add / pure remove run to the boundary a reader would draw.
     *
     * ⚠️ THE EDIT SCRIPT IS AMBIGUOUS AND THE DEFAULT ANSWER IS THE WRONG-LOOKING ONE.
     * Deleting a record from an array of records, every one of which ends `},`, admits
     * several equally minimal scripts. The one that falls out of the diff starts at the
     * first line that differs — the removed record's first FIELD — and so runs
     *
     *     "bobcat_alias": …  ⟶  "type": …  ⟶  },  ⟶  {
     *
     * seven lines, all correct, framed one brace out of step: the red block opens inside
     * one record and closes having swallowed the next record's `{`. Worse on the insert
     * side, where the run can open on the SURVIVING record's last fields and tint three
     * lines of a record nobody touched. The reader is told "something around here", when
     * the truth available is "this record". Rotating the same run gives `{ … },` — the
     * record, exactly.
     *
     * A run may slide one line in either direction whenever the line it would swap with
     * is identical to the line n away — that is what makes the rotation describe the same
     * two files. Among every position reachable that way, take the one whose FIRST line is
     * least indented: in any brace/bracket format that is the line that opens something,
     * which is where a block of whole items should start. Ties go to the fewest slides,
     * i.e. nearest where the diff put it — a tie means the positions read alike, so there
     * is no case for moving further than necessary.
     *
     * ⚠️ BOTH DIRECTIONS, AND DOWN IS THE ONE THAT MATTERS MOST. An append to the end of
     * an array is genuinely cheaper as "the previous record's `}` gains a comma, then the
     * new record's lines" — but a minimal line diff will not spend an op on the comma, so
     * it opens the run three lines early, inside the previous record. Sliding down walks
     * it back off those lines and onto the `},` that really did change.
     *
     * MIXED RUNS ARE LEFT ALONE. A run holding both removals and insertions is a modified
     * record, already read as red-beside-green on the same rows, and "where does the block
     * start" is not a question anyone is asking of it.
     *
     * Correctness note: `ops` covers each file's lines once, in order, so the op directly
     * above a `-` of line L is either a `-` (same run) or an `=` whose left index is
     * necessarily L-1; likewise below. That is what makes one slide a local swap of two
     * ops rather than a rebuild — and `lines[x] === lines[x + n]` plus the `=` op's own
     * match is what proves the `=` the swap leaves behind is a real one.
     */
    function slideRuns(ops, a, b) {
        var i = 0;

        while (i < ops.length) {
            if (ops[i].t === '=') { i++; continue; }

            var t = ops[i].t;
            var end = i;
            var pure = true;
            while (end < ops.length && ops[end].t !== '=') {
                if (ops[end].t !== t) pure = false;
                end++;
            }
            if (!pure) { i = end; continue; }

            var lines = (t === '-') ? a : b;
            var key = (t === '-') ? 'a' : 'b';
            var first = ops[i][key];
            var n = end - i;

            /* Candidate offsets, negative = up. Scored on the indent of the line the run
               would then open on; `best` stays 0 unless something is strictly shallower,
               which is the "fewest slides on a tie" rule. */
            var best = 0;
            var bestIndent = indentOf(lines[first]);
            var step, indent;

            for (step = 1; i - step >= 0 && ops[i - step].t === '='
                           && lines[first - step] === lines[first + n - step]; step++) {
                indent = indentOf(lines[first - step]);
                if (indent < bestIndent) { bestIndent = indent; best = -step; }
            }

            for (step = 1; end + step - 1 < ops.length && ops[end + step - 1].t === '='
                           && lines[first + step - 1] === lines[first + n + step - 1]; step++) {
                indent = indentOf(lines[first + step]);
                if (indent < bestIndent) { bestIndent = indent; best = step; }
            }

            var k, up, down, moved, kept;

            for (k = 0; k < -best; k++) {
                /* One step up: the `=` above joins the run, the run's last op becomes the
                   `=` — same pairing, one line further on. */
                up = ops[i - 1 - k];
                kept = ops[end - 1 - k];
                moved = { t: t };
                moved[key] = up[key];
                ops[i - 1 - k] = moved;
                ops[end - 1 - k] = {
                    t: '=',
                    a: (t === '-') ? kept.a : up.a,
                    b: (t === '-') ? up.b : kept.b
                };
            }

            for (k = 0; k < best; k++) {
                /* One step down: mirror image — the `=` below joins the run and the run's
                   first op becomes the `=`. */
                down = ops[end + k];
                kept = ops[i + k];
                moved = { t: t };
                moved[key] = down[key];
                ops[end + k] = moved;
                ops[i + k] = {
                    t: '=',
                    a: (t === '-') ? kept.a : down.a,
                    b: (t === '-') ? down.b : kept.b
                };
            }

            i = end + (best > 0 ? best : 0);
        }
    }

    /**
     * The edit script as DISPLAY ROWS. Each row holds a left index, a right
     * index, or both — which is what keeps the two panes aligned: a pane with
     * nothing to show on a row gets a filler line of the same height.
     *
     * Within one changed block the left and right lines are paired in order, so
     * a modified line reads as red-beside-green rather than as a removal
     * followed some rows later by an addition.
     */
    function rowsFor(a, b) {
        _countA = countLines(a);
        _countB = countLines(b);

        var ops = [];
        diffRange(a, b, 0, a.length, 0, b.length, 0, ops);
        slideRuns(ops, a, b);

        var rows = [];
        var blocks = [];
        var i = 0;

        while (i < ops.length) {
            if (ops[i].t === '=') {
                rows.push({ l: ops[i].a, r: ops[i].b, kind: 'same' });
                i++;
                continue;
            }

            var dels = [];
            var ins = [];
            while (i < ops.length && ops[i].t !== '=') {
                if (ops[i].t === '-') dels.push(ops[i].a);
                else ins.push(ops[i].b);
                i++;
            }

            /* One contiguous run of changed lines is ONE difference, which is what
               the badge counts and what prev/next steps through. */
            blocks.push(rows.length);

            var n = Math.max(dels.length, ins.length);
            for (var k = 0; k < n; k++) {
                var hasL = k < dels.length;
                var hasR = k < ins.length;
                rows.push({
                    l: hasL ? dels[k] : null,
                    r: hasR ? ins[k] : null,
                    kind: (hasL && hasR) ? 'change' : (hasL ? 'del' : 'ins')
                });
            }
        }

        return { rows: rows, blocks: blocks };
    }

    /**
     * A paired line with the changed part wrapped in a mark, so `"length": 17,`
     * against `"length": 18,` points at the value rather than tinting the whole
     * row and leaving the reader to find it.
     *
     * SKIPPED WHEN THE TWO LINES BARELY RESEMBLE EACH OTHER. Rows are paired
     * positionally inside a changed block, so a block where one side is longer than
     * the other ends up pairing lines that have nothing to do with one another —
     * `"updated": null,` beside `  {`. Marking the difference between those two is
     * noise that reads as meaning. Below the threshold the tint says "this line is
     * only on one side", which is all that is true.
     */
    var MIN_SIMILARITY = 0.45;

    function markedLine(text, other) {
        var p = 0;
        var lenA = text.length;
        var lenB = other.length;
        while (p < lenA && p < lenB && text.charCodeAt(p) === other.charCodeAt(p)) p++;

        var endA = lenA;
        var endB = lenB;
        while (endA > p && endB > p && text.charCodeAt(endA - 1) === other.charCodeAt(endB - 1)) {
            endA--; endB--;
        }

        /* Nothing in common, or nothing NOT in common — either way a mark adds
           nothing. */
        if (p >= endA) return escapeHtml(text);

        var shared = p + (lenA - endA);
        var longest = Math.max(lenA, lenB) || 1;
        if (shared / longest < MIN_SIMILARITY) return escapeHtml(text);

        return escapeHtml(text.slice(0, p))
             + '<mark class="proj-json-diff__mark">' + escapeHtml(text.slice(p, endA)) + '</mark>'
             + escapeHtml(text.slice(endA));
    }

    /* --- Markup ------------------------------------------------------------ */

    function lineHtml(index, text, modifier, other) {
        var cls = 'proj-json-diff__line';
        if (modifier) cls += ' proj-json-diff__line--' + modifier;

        /* A filler line: no number, no content, just the height that keeps the
           two panes in step. */
        if (index === null) {
            return '<div class="' + cls + ' proj-json-diff__line--filler">'
                 + '<span class="proj-json-diff__num"></span>'
                 + '<span class="proj-json-diff__text"> </span>'
                 + '</div>';
        }

        var body = (other === undefined || other === null)
            ? escapeHtml(text)
            : markedLine(text, other);

        return '<div class="' + cls + '">'
             + '<span class="proj-json-diff__num">' + (index + 1) + '</span>'
             + '<span class="proj-json-diff__text">' + body + '</span>'
             + '</div>';
    }

    function paneHeadHtml(pane, side, copyable) {
        var copyBtn = copyable
            ? '<button class="proj-json-diff__copy" type="button" data-side="' + side + '"'
                + ' aria-label="Copy JSON">'
                + '<sf-symbol name="' + COPY_ICON + '"></sf-symbol>'
              + '</button>'
            : '';

        return '<div class="proj-json-diff__pane-head">'
             + (pane.label ? '<span class="proj-json-diff__pane-label">' + escapeHtml(pane.label) + '</span>' : '')
             + '<div class="proj-json-diff__pane-title">'
             +   '<span class="proj-json-diff__pane-name" title="' + escapeHtml(pane.title || '') + '">'
             +     escapeHtml(pane.title || '') + '</span>'
             +   copyBtn
             + '</div>'
             + '</div>';
    }

    function navHtml(count) {
        var label = count === 1 ? '1 difference found' : count + ' differences found';

        return '<div class="proj-json-diff__nav">'
             + '<span class="proj-json-diff__nav-icon"><sf-symbol name="exclamationmark.circle"></sf-symbol></span>'
             + '<span class="proj-json-diff__nav-count">' + label + '</span>'
             + '<span class="proj-json-diff__nav-btns">'
             +   '<button class="proj-json-diff__nav-btn" type="button" data-dir="prev" aria-label="Previous difference">'
             +     '<sf-symbol name="chevron.up"></sf-symbol></button>'
             +   '<button class="proj-json-diff__nav-btn" type="button" data-dir="next" aria-label="Next difference">'
             +     '<sf-symbol name="chevron.down"></sf-symbol></button>'
             + '</span>'
             + '</div>';
    }

    function identicalHtml() {
        return '<div class="proj-json-diff__nav proj-json-diff__nav--clean">'
             + '<span class="proj-json-diff__nav-icon"><sf-symbol name="checkmark.circle"></sf-symbol></span>'
             + '<span class="proj-json-diff__nav-count">No differences</span>'
             + '</div>';
    }

    window.ProjJsonDiff = {
        create: function(config) {
            var cfg = config || {};

            var instance = {
                config: cfg,
                count: 0,
                _rows: [],
                _blocks: [],
                _cursor: -1,
                _el: null,

                _container: function() {
                    if (cfg.container) return cfg.container;
                    return cfg.containerId ? document.getElementById(cfg.containerId) : null;
                },

                render: function() {
                    var host = this._container();
                    if (!host) return this;

                    var left = cfg.left || {};
                    var right = cfg.right || {};
                    var a = toLines(left.text);
                    var b = toLines(right.text);
                    this._leftText = toText(left.text);
                    this._rightText = toText(right.text);

                    var diff = rowsFor(a, b);
                    this._rows = diff.rows;
                    this._blocks = diff.blocks;
                    this.count = diff.blocks.length;
                    this._cursor = -1;

                    var copyable = cfg.copy !== false;
                    var navigable = cfg.navigate !== false;

                    var leftLines = '';
                    var rightLines = '';
                    diff.rows.forEach(function(row) {
                        if (row.kind === 'same') {
                            leftLines += lineHtml(row.l, a[row.l], '');
                            rightLines += lineHtml(row.r, b[row.r], '');
                        } else if (row.kind === 'change') {
                            leftLines += lineHtml(row.l, a[row.l], 'del', b[row.r]);
                            rightLines += lineHtml(row.r, b[row.r], 'ins', a[row.l]);
                        } else if (row.kind === 'del') {
                            leftLines += lineHtml(row.l, a[row.l], 'del');
                            rightLines += lineHtml(null, '', 'empty');
                        } else {
                            leftLines += lineHtml(null, '', 'empty');
                            rightLines += lineHtml(row.r, b[row.r], 'ins');
                        }
                    });

                    var html = '<div class="proj-json-diff">'
                        + '<div class="proj-json-diff__head">'
                        +   paneHeadHtml(left, 'left', copyable)
                        +   paneHeadHtml(right, 'right', copyable)
                        +   (navigable ? (this.count ? navHtml(this.count) : identicalHtml()) : '')
                        + '</div>'
                        + '<div class="proj-json-diff__body">'
                        +   '<div class="proj-json-diff__col" data-side="left">' + leftLines + '</div>'
                        +   '<div class="proj-json-diff__col" data-side="right">' + rightLines + '</div>'
                        + '</div>'
                        + '</div>';

                    host.innerHTML = html;
                    this._el = host.querySelector('.proj-json-diff');
                    this._bind();
                    return this;
                },

                _bind: function() {
                    var self = this;
                    if (!this._el) return;

                    this._el.querySelectorAll('.proj-json-diff__nav-btn').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            if (btn.dataset.dir === 'prev') self.prev();
                            else self.next();
                        });
                    });

                    this._el.querySelectorAll('.proj-json-diff__copy').forEach(function(btn) {
                        btn.addEventListener('click', function() {
                            var text = btn.dataset.side === 'right' ? self._rightText : self._leftText;
                            self._copy(btn, text);
                        });
                    });
                },

                /* Clipboard API only — this runs in a modern-browser prototype, and
                   the fallback (a hidden textarea + execCommand) is dead weight. The
                   button reports success by swapping its own glyph, so a rejected
                   promise simply leaves it unchanged. */
                _copy: function(btn, text) {
                    if (!navigator.clipboard) return;
                    navigator.clipboard.writeText(text).then(function() {
                        var glyph = btn.querySelector('sf-symbol');
                        if (!glyph) return;
                        btn.classList.add('proj-json-diff__copy--done');
                        glyph.setAttribute('name', COPIED_ICON);
                        setTimeout(function() {
                            btn.classList.remove('proj-json-diff__copy--done');
                            glyph.setAttribute('name', COPY_ICON);
                        }, 1400);
                    }).catch(function() { /* nothing to report */ });
                },

                next: function() { this._go(1); },
                prev: function() { this._go(-1); },

                /* Wraps in both directions: a user at the last difference pressing
                   down expects the first one, not a dead button. */
                _go: function(step) {
                    if (!this.count || !this._el) return;

                    this._cursor = (this._cursor + step + this.count) % this.count;
                    var rowIndex = this._blocks[this._cursor];

                    var cols = this._el.querySelectorAll('.proj-json-diff__col');
                    this._el.querySelectorAll('.proj-json-diff__line--current')
                        .forEach(function(el) { el.classList.remove('proj-json-diff__line--current'); });

                    var target = null;
                    cols.forEach(function(col) {
                        var line = col.children[rowIndex];
                        if (!line) return;
                        line.classList.add('proj-json-diff__line--current');
                        if (!target) target = line;
                    });

                    /* `scrollIntoView` rather than setting scrollTop: the scrolling
                       ancestor belongs to the host, and this works whichever one it
                       is. `center` keeps the surrounding context visible. */
                    if (target) target.scrollIntoView({ block: 'center', behavior: 'smooth' });
                }
            };

            return instance;
        }
    };
})();
