/* proj-wizard.js */
/* Plugin component: Wizard (full-screen takeover shell) */
/*
 * Factory: ProjWizard.create(config) → instance
 *
 * Config:
 *   steps        {array}    [{ label }] — one per step; drives the stepper
 *   title        {string}   (optional) initial header title
 *   onClose      {function} (optional) called after close() (X or Escape)
 *   onStepChange {function} (optional) called with the new 0-based index on setStep()
 *
 * Instance methods:
 *   open() / close()      show / hide the overlay (Escape also closes)
 *   setTitle(text)        set the header title
 *   setStep(index)        0-based; re-renders the stepper (earlier → checkmark, current → number)
 *   getStep()             current 0-based step index
 *   bodyEl() / footerEl() the caller-owned content containers (fill via innerHTML)
 *   destroy()             remove the overlay + template from the DOM
 *
 * The stepper is rendered by proj-timeline (custom template) — load proj-timeline.js first.
 */
(function() {
    'use strict';

    var _seq = 0;

    // Custom proj-timeline template: horizontal numbered stepper.
    // proj-timeline supplies each milestone's computed `base` (past|current|future); the
    // number/checkmark swap and the connector line are handled in proj-wizard.css.
    var STEP_TEMPLATE =
        '<div class="proj-wizard__steps">' +
        '{{#each milestones}}' +
        '<div class="proj-wizard__step proj-wizard__step--{{base}}">' +
        '<span class="proj-wizard__step-circle">' +
        '<span class="proj-wizard__step-num"></span>' +
        '<span class="proj-wizard__step-check"><sf-symbol name="checkmark"></sf-symbol></span>' +
        '</span>' +
        '<span class="proj-wizard__step-label">{{label}}</span>' +
        '</div>' +
        '{{/each}}' +
        '</div>';

    window.ProjWizard = {
        create: function(config) {
            config = config || {};
            var steps = config.steps || [];
            var currentStep = 0;

            var id = 'proj-wizard-' + (++_seq);
            var stepperId = id + '-stepper';
            var tplId = id + '-step-tpl';

            // Inject the stepper template so proj-timeline can compile it by id.
            var tplEl = document.createElement('script');
            tplEl.type = 'text/x-handlebars-template';
            tplEl.id = tplId;
            tplEl.textContent = STEP_TEMPLATE;
            document.body.appendChild(tplEl);

            // Build + portal the overlay to <body>. Reuses the large modal for the
            // backdrop, centered panel, sizing (80rem, 90vh) and scrollable body.
            var overlay = document.createElement('div');
            overlay.className = 'modal-overlay proj-wizard-overlay';
            overlay.id = id;
            overlay.innerHTML =
                '<div class="modal modal--large proj-wizard">' +
                '<div class="modal__header proj-wizard__header">' +
                '<button class="proj-wizard__close" type="button" aria-label="Close">' +
                '<sf-symbol name="xmark"></sf-symbol></button>' +
                '<h2 class="proj-wizard__title"></h2>' +
                '<div class="proj-wizard__stepper" id="' + stepperId + '"></div>' +
                '</div>' +
                '<div class="modal__body proj-wizard__body"></div>' +
                '<div class="modal__footer proj-wizard__footer"></div>' +
                '</div>';
            document.body.appendChild(overlay);

            var titleEl = overlay.querySelector('.proj-wizard__title');
            var bodyEl = overlay.querySelector('.proj-wizard__body');
            var footerEl = overlay.querySelector('.proj-wizard__footer');
            var closeBtn = overlay.querySelector('.proj-wizard__close');

            function renderStepper() {
                if (!window.ProjTimeline) return;
                var milestones = steps.map(function(s, i) {
                    return { label: s.label, value: '', current: i === currentStep };
                });
                ProjTimeline.create({
                    containerId: stepperId,
                    templateId: tplId,
                    milestones: milestones
                }).init();
            }

            function onKeydown(e) {
                if (e.key === 'Escape' && overlay.classList.contains('modal-overlay--open')) {
                    api.close();
                }
            }

            var api = {
                open: function() {
                    overlay.classList.add('modal-overlay--open');
                    document.addEventListener('keydown', onKeydown);
                    renderStepper();
                    return this;
                },
                close: function() {
                    overlay.classList.remove('modal-overlay--open');
                    document.removeEventListener('keydown', onKeydown);
                    if (typeof config.onClose === 'function') config.onClose();
                    return this;
                },
                setTitle: function(text) {
                    titleEl.textContent = text || '';
                    return this;
                },
                setStep: function(index) {
                    currentStep = index;
                    renderStepper();
                    if (typeof config.onStepChange === 'function') config.onStepChange(index);
                    return this;
                },
                getStep: function() { return currentStep; },
                bodyEl: function() { return bodyEl; },
                footerEl: function() { return footerEl; },
                destroy: function() {
                    document.removeEventListener('keydown', onKeydown);
                    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                    if (tplEl.parentNode) tplEl.parentNode.removeChild(tplEl);
                }
            };

            closeBtn.addEventListener('click', function() { api.close(); });
            if (config.title) titleEl.textContent = config.title;

            return api;
        }
    };
})();
