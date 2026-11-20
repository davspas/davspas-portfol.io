(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;
    var T = window.FdrTable;

    var POLL_MS = 4000;
    var SEND_MS = 1200;
    var _pollTimer = null;
    var _pending = [];
    var _anchor = null;

    function unitsById(ids) {
        return D.units.filter(function(u) { return ids.indexOf(u.id) !== -1; });
    }

    /* A Queued unit is skipped, every other unit of the request is sent. */
    function summarize(us) {
        var projects = {}, sites = {}, send = 0, skip = 0;
        us.forEach(function(u) {
            projects[u.project] = 1; sites[u.site] = 1;
            if (u.status === 'QUEUED') skip++; else send++;
        });
        return { units: us.length, projects: Object.keys(projects).length, sites: Object.keys(sites).length, send: send, skip: skip };
    }

    function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

    function notify(type, html, opts) {
        var icons = { success: 'checkmark.circle.fill', warning: 'exclamationmark.triangle.fill', error: 'xmark.circle.fill', info: 'info.circle.fill' };
        var slot = document.getElementById('fdrResult');
        slot.innerHTML = '<div class="notification notification--' + type + '"><div class="notification__icon"><sf-symbol name="' + icons[type] + '"></sf-symbol></div>'
            + '<div class="notification__content"><div class="notification__message">' + html + '</div></div>'
            + '<button type="button" class="notification__close" aria-label="Dismiss" data-dismiss-result>×</button></div>';
        slot.hidden = false;
    }

    function clearNotice() {
        var slot = document.getElementById('fdrResult');
        slot.hidden = true; slot.innerHTML = '';
    }

    function openConfirm(ids, anchor) {
        if (S.readonly || S.sending) return;
        _pending = ids;
        _anchor = anchor || document.getElementById('fdrSendBtn');
        buildConfirm();
        var us = unitsById(ids);
        var sum = summarize(us);
        var multi = us.length > 1;
        document.getElementById('fdrModalTitle').textContent = multi ? 'Send Recovery Requests?' : 'Send Recovery Request?';
        var MAX = 6;
        var list = us.slice(0, MAX).map(function(u) {
            return '<li><strong>' + T.esc(u.serial) + '</strong> · ' + T.esc(u.project) + ' · ' + u.site + (u.status === 'QUEUED' ? ' · already queued' : '') + '</li>';
        }).join('') + (us.length > MAX ? '<li>and ' + (us.length - MAX) + ' more</li>' : '');
        document.getElementById('fdrModalBody').innerHTML =
            '<p class="fdr-modal__lead">' + plural(sum.units, 'device', 'devices') + ' in ' + plural(sum.projects, 'faculty', 'faculties')
            + ' at ' + plural(sum.sites, 'campus', 'campuses') + ' will be re-registered with the Room Booking Manager.</p>'
            + '<ul class="fdr-modal__list">' + list + '</ul>'
            + '<p class="fdr-modal__counts">' + plural(sum.send, 'device', 'devices') + ' will be sent.'
            + (sum.skip ? ' ' + plural(sum.skip, 'device already queued is', 'devices already queued are') + ' skipped.' : '') + '</p>';
        var btn = document.getElementById('fdrModalConfirm');
        btn.textContent = multi ? 'Send Recovery Requests' : 'Send Recovery Request';
        btn.disabled = false;
        // Deferred: the design system closes every .popover on the same click's bubble phase, which would hide ours right after opening.
        setTimeout(function() { showConfirm(); btn.focus(); }, 0);
    }

    /* Pop-confirm, same pattern as the Manage Devices discard confirm: a fixed popover on the body, positioned from the
       trigger's rectangle (the design system writes inline styles on popovers, so position is set here and forced in CSS). */
    function buildConfirm() {
        if (document.getElementById('fdrConfirm')) return;
        var pop = document.createElement('div');
        pop.id = 'fdrConfirm';
        pop.className = 'popover popover--bottom fdr-confirm';
        pop.setAttribute('role', 'dialog');
        pop.setAttribute('aria-labelledby', 'fdrModalTitle');
        pop.innerHTML =
            '<div class="popover__content">'
            + '<div class="popover__header"><h4 class="popover__title" id="fdrModalTitle">Send Recovery Request?</h4></div>'
            + '<div class="popover__body" id="fdrModalBody"></div>'
            + '<div class="popover__footer fdr-confirm__actions">'
            + '<button type="button" class="btn btn--secondary btn--small" id="fdrModalCancel">Cancel</button>'
            + '<button type="button" class="btn btn--primary btn--small" id="fdrModalConfirm">Send Recovery Request</button>'
            + '</div></div>'
            + '<div class="popover__arrow"></div>';
        document.body.appendChild(pop);
    }

    function showConfirm() {
        var pop = document.getElementById('fdrConfirm');
        if (!pop || !_anchor) return;
        pop.style.display = 'block';
        pop.classList.add('popover--open');
        var pr = pop.getBoundingClientRect();
        var r = _anchor.getBoundingClientRect();
        var below = r.bottom + 8 + pr.height <= window.innerHeight;
        var left = Math.min(Math.max(8, r.right - pr.width), window.innerWidth - pr.width - 8);
        pop.classList.toggle('popover--bottom', below);
        pop.classList.toggle('popover--top', !below);
        pop.style.left = left + 'px';
        pop.style.top = (below ? r.bottom + 8 : r.top - pr.height - 8) + 'px';
        var arrow = pop.querySelector('.popover__arrow');
        arrow.style.left = Math.max(12, Math.min(pr.width - 12, r.left + r.width / 2 - left)) + 'px';
        arrow.style.right = 'auto';
    }

    function closeConfirm() {
        if (S.sending) return;
        hideConfirm();
    }

    function hideConfirm() {
        var pop = document.getElementById('fdrConfirm');
        if (!pop) return;
        pop.style.display = 'none';
        pop.classList.remove('popover--open');
    }

    function nowIso() { return new Date().toISOString(); }

    function send() {
        if (S.sending) return;
        S.sending = true;
        window.FdrApp.render();   // row send icons and the sub-header button show as disabled while the request runs
        var btn = document.getElementById('fdrModalConfirm');
        btn.disabled = true; btn.innerHTML = '<span class="loader__spinner loader__spinner--small"></span> Sending…';
        setTimeout(function() {
            S.sending = false;
            hideConfirm();
            if (S.demo === 'fsm-down') {
                notify('error', '<strong>Room Booking Manager could not be reached.</strong> No request was sent. <button type="button" class="fdr-linkbtn" data-retry-send>Try again</button>');
                window.FdrApp.render();
                return;
            }
            var sent = 0, skipped = 0, failed = [];
            unitsById(_pending).forEach(function(u) {
                if (S.demo === 'partial' && u.stationId === 'hlsd-dev1' && u.status === 'FAILED') { failed.push(u); return; }
                if (u.status === 'QUEUED') { skipped++; S.selected.delete(u.id); return; }
                u.status = 'RE_REGISTER'; u.updatedAt = nowIso(); u.sim = true; sent++;
                S.selected.delete(u.id);
            });
            var msg = '<strong>' + plural(sent, 'device', 'devices') + ' sent.</strong> Re-registering'
                + (skipped ? ', ' + skipped + ' skipped' : '') + '. This page updates by itself.';
            if (failed.length) {
                notify('warning', '<strong>' + plural(sent, 'device', 'devices') + ' sent · ' + failed.length + ' failed.</strong> ' + failed.map(function(u) {
                    return T.esc(u.serial) + ' · ' + u.site + ': Room Booking Manager rejected: no MAC';
                }).join('; ') + '.');
            } else {
                clearNotice();
                if (typeof showNotification === 'function') showNotification('success', msg);
            }
            window.FdrApp.render();
            startPolling();
        }, SEND_MS);
    }

    function tick() {
        var changed = false;
        D.units.forEach(function(u) {
            if (!u.sim) return;
            if (u.status === 'RE_REGISTER') { u.status = 'QUEUED'; u.updatedAt = nowIso(); changed = true; }
            else if (u.status === 'QUEUED') { u.status = 'REGISTERED'; u.updatedAt = nowIso(); u.sim = false; changed = true; }
        });
        if (changed) window.FdrApp.render();
        var simLeft = D.units.some(function(u) { return u.sim; });
        if (!simLeft) stopPolling();
    }

    function startPolling() {
        if (_pollTimer) return;
        _pollTimer = setInterval(tick, POLL_MS);
    }
    function stopPolling() {
        if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    }

    function updateBar() {
        var bar = document.getElementById('fdrSelectionBar');
        if (!bar) return;
        var us = unitsById(Array.from(S.selected));
        bar.hidden = S.readonly || S.tab !== 'registration';
        document.getElementById('fdrSendLabel').textContent = us.length > 1 ? 'Send Recovery Requests' : 'Send Recovery Request';
        document.getElementById('fdrSendBtn').disabled = !us.length || S.sending;
    }

    function bind() {
        document.addEventListener('click', function(e) {
            var t = e.target;
            if (t.closest('#fdrSendBtn')) { openConfirm(Array.from(S.selected), t.closest('#fdrSendBtn')); return; }
            if (t.closest('#fdrModalConfirm')) { send(); return; }
            if (t.closest('#fdrModalCancel')) { closeConfirm(); return; }
            // Outside click dismisses the pop-confirm. The trigger that opens it is handled by its own handler.
            var pop = document.getElementById('fdrConfirm');
            if (pop && pop.classList.contains('popover--open') && !t.closest('#fdrConfirm') && !t.closest('[data-send-unit],#fdrSendBtn')) closeConfirm();
            if (t.closest('[data-dismiss-result]')) { clearNotice(); return; }
            if (t.closest('[data-retry-send]')) { clearNotice(); S.demo = ''; openConfirm(_pending, document.getElementById('fdrSendBtn') || document.querySelector('[data-send-unit]')); }
        });
        // While a request runs the pop-confirm and the dialogs must stay open. The design system also closes popovers and
        // modals on Escape / outside click without knowing about our requests, so those events are stopped here, before it sees them.
        window.addEventListener('keydown', function(e) { if (e.key === 'Escape' && (S.sending || S.deploy.sending)) e.stopImmediatePropagation(); }, true);
        window.addEventListener('click', function(e) { if (S.sending && !e.target.closest('#fdrConfirm')) e.stopImmediatePropagation(); }, true);
        document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeConfirm(); });
        window.addEventListener('scroll', function(e) { if (!(e.target.closest && e.target.closest('#fdrConfirm'))) closeConfirm(); }, true);
        window.addEventListener('resize', function() { closeConfirm(); });
    }

    window.FdrActions = { bind: bind, openConfirm: openConfirm, updateBar: updateBar, startPolling: startPolling, notify: notify, clearNotice: clearNotice };
})();
