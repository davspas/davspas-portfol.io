/**
 * ProjTimeline — Horizontal read-only milestone timeline plugin component
 *
 * Factory: ProjTimeline.create(config)
 *
 * Config:
 *   containerId   {string}  ID of the container element to render into
 *   templateId    {string}  (optional) Handlebars template ID — if omitted, uses built-in template
 *   iconsPath     {string}  (optional) Path to icons folder — default: '../../.davinci/assets/icons/regular/'
 *   milestones    {array}   Array of milestone objects:
 *     label       {string}  Top label (e.g., "P1", "P2")
 *     value       {string}  Bottom value (e.g., "04/01/2026")
 *     current     {boolean} Whether this is the current milestone
 *     selected    {boolean} Whether this milestone is selected (outer ring)
 *     draft       {boolean} Whether the current milestone is in draft state
 *
 * Base states (derived):
 *   past    — before current index (blue dot)
 *   current — the current milestone (blue dot + checkmark)
 *   draft   — current + draft flag (white dot, gray border + gray checkmark)
 *   future  — after current index (white dot, gray border)
 *
 * Modifier:
 *   selected — blue outer ring, can overlay any base state
 */
(function() {
    'use strict';

    window.ProjTimeline = {
        create: function(config) {
            var instance = {
                config: config,
                _tpl: null,

                init: function() {
                    this.render();
                    this._bindEvents();
                },

                /** Build HTML directly from computed state (no Handlebars template needed) */
                _buildHTML: function(ctx) {
                    var html = '<div class="proj-timeline"><div class="proj-timeline__track"><div class="proj-timeline__milestones">';
                    html += '<div class="proj-timeline__line"></div><div class="proj-timeline__progress"></div>';

                    for (var i = 0; i < ctx.milestones.length; i++) {
                        var m = ctx.milestones[i];
                        var cls = 'proj-timeline__milestone proj-timeline__milestone--' + m.base;
                        if (m.isSelected) cls += ' proj-timeline__milestone--selected';

                        html += '<div class="' + cls + '">';
                        html += '<span class="proj-timeline__label">' + m.label + '</span>';
                        html += '<div class="proj-timeline__circle">';
                        if (m.hasCheck) {
                            html += '<sf-symbol name="checkmark" style="font-size:8px" class="proj-timeline__checkmark"></sf-symbol>';
                        }
                        html += '</div>';
                        html += '<span class="proj-timeline__value">' + m.value + '</span>';
                        html += '</div>';
                    }

                    html += '</div></div></div>';
                    return html;
                },

                render: function() {
                    var container = document.getElementById(this.config.containerId);
                    if (!container) return;

                    var ctx = this._computeState();

                    // Use custom Handlebars template if provided, otherwise built-in HTML builder
                    if (this.config.templateId) {
                        var tplEl = document.getElementById(this.config.templateId);
                        if (!tplEl) return;
                        if (!this._tpl) {
                            this._tpl = Handlebars.compile(tplEl.innerHTML);
                        }
                        container.innerHTML = this._tpl(ctx);
                    } else {
                        container.innerHTML = this._buildHTML(ctx);
                    }

                    // Position lines when container is visible (handles hidden tabs)
                    var self = this;
                    var observer = new IntersectionObserver(function(entries) {
                        if (entries[0].isIntersecting) {
                            self._positionLines(container);
                            observer.disconnect();
                        }
                    });
                    observer.observe(container);
                },

                _bindEvents: function() {
                    var container = document.getElementById(this.config.containerId);
                    if (!container) return;
                    var self = this;

                    container.addEventListener('click', function(e) {
                        var milestone = e.target.closest('.proj-timeline__milestone');
                        if (!milestone) return;

                        var all = container.querySelectorAll('.proj-timeline__milestone');
                        for (var i = 0; i < all.length; i++) {
                            all[i].classList.remove('proj-timeline__milestone--selected');
                        }
                        milestone.classList.add('proj-timeline__milestone--selected');
                        self._positionLines(container);
                    });
                },

                _positionLines: function(container) {
                    var ms = container.querySelectorAll('.proj-timeline__milestone');
                    var line = container.querySelector('.proj-timeline__line');
                    var progress = container.querySelector('.proj-timeline__progress');

                    if (ms.length < 2 || !line) return;

                    var parent = ms[0].parentElement;
                    var parentLeft = parent.getBoundingClientRect().left;
                    var firstCircle = ms[0].querySelector('.proj-timeline__circle');
                    var lastCircle = ms[ms.length - 1].querySelector('.proj-timeline__circle');
                    var firstCenter = firstCircle.getBoundingClientRect().left + firstCircle.offsetWidth / 2 - parentLeft;
                    var lastCenter = lastCircle.getBoundingClientRect().left + lastCircle.offsetWidth / 2 - parentLeft;

                    line.style.left = firstCenter + 'px';
                    line.style.width = (lastCenter - firstCenter) + 'px';

                    if (progress) {
                        var selectedMs = container.querySelector('.proj-timeline__milestone--selected');
                        if (selectedMs) {
                            var selCircle = selectedMs.querySelector('.proj-timeline__circle');
                            var selCenter = selCircle.getBoundingClientRect().left + selCircle.offsetWidth / 2 - parentLeft;
                            progress.style.left = firstCenter + 'px';
                            progress.style.width = (selCenter - firstCenter) + 'px';
                        } else {
                            progress.style.width = '0';
                        }
                    }
                },

                _computeState: function() {
                    var ms = this.config.milestones;
                    var currentIdx = -1, i;

                    for (i = 0; i < ms.length; i++) {
                        if (ms[i].current) currentIdx = i;
                    }

                    var processed = [];
                    for (i = 0; i < ms.length; i++) {
                        var base;
                        if (ms[i].current && ms[i].draft) {
                            base = 'draft';
                        } else if (ms[i].current) {
                            base = 'current';
                        } else if (i < currentIdx) {
                            base = 'past';
                        } else {
                            base = 'future';
                        }
                        processed.push({
                            label: ms[i].label,
                            value: ms[i].value,
                            base: base,
                            hasCheck: base === 'current' || base === 'draft',
                            isSelected: !!ms[i].selected
                        });
                    }

                    return {
                        milestones: processed
                    };
                }
            };

            return instance;
        }
    };
})();
