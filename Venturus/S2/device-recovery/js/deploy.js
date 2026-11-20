/**
 * Roll out tab (window.FdrDeploy): roll out a recovery version to devices. Same flow as the Faculty-registered recovery roll-out,
 * with units as the targets instead of building controllers, and only Registered units can be targeted.
 *   Version strip: current version, version picker, scheduled count, Import version
 *   Wizard: 1 Select a version, 2 Select units, 3 Proceed to roll-out (summary, optional schedule)
 *   Table: units, grouped Faculty > Campus like the Registration tab, last deploy status, history
 *   Dialogs: summary, status (retry / cancel schedule), history, scheduled list, versions, import (XLSX, 2 steps)
 * Everything is a local mock.
 */
(function() {
    'use strict';

    var D = window.FdrData;
    var S = window.FdrState;
    var T = window.FdrTable;

    var DEPLOY_MS = 1200;      // simulated request
    var RUN_MS = 3500;         // a deploying unit finishes after this
    var ME = 'You';
    var ERR_MSG = 'The device did not acknowledge the recovery package.';

    function esc(t) { return T.esc(t); }
    function plural(n, a, b) { return T.plural(n, a, b); }
    function versionById(id) { return D.versions.filter(function(v) { return v.id === id; })[0]; }
    function unitsById(ids) { return D.units.filter(function(u) { return ids.indexOf(u.id) !== -1; }); }
    function toast(type, msg) { if (typeof showNotification === 'function') showNotification(type, msg); }

    /* Only a Registered unit can receive a deploy (and not one that is deploying right now). */
    /* The recovery version installed on a unit is the last deploy that succeeded; a failed, scheduled or running deploy does not change it. */
    function installedLabel(u) {
        var v = D.installedVersion(u);
        return v ? esc((versionById(v) || {}).label || 'v' + v) : '-';
    }

    function eligible(u) {
        return u.status === 'REGISTERED' && !u.unavailable && !(u.deploy && u.deploy.status === 'deploying');
    }
    function ineligibleReason(u) {
        if (u.deploy && u.deploy.status === 'deploying') return 'A roll-out is running on this device.';
        return 'Only registered devices can receive a recovery roll-out. This device is ' + (D.STATUS[D.unitStatus(u)].label) + '.';
    }

    /* ── Status icons ── */
    var DSTATUS = {
        success:   { icon: 'checkmark.circle.fill', tone: 'green',  label: 'Rolled out' },
        error:     { icon: 'xmark.circle.fill',     tone: 'red',    label: 'Failed' },
        scheduled: { icon: 'clock',                 tone: 'blue',   label: 'Scheduled' },
        deploying: { icon: null,                    tone: 'blue',   label: 'Rolling out' }
    };
    function statusIcon(status) {
        var m = DSTATUS[status];
        if (!m.icon) return '<span class="loader__spinner loader__spinner--small" aria-hidden="true"></span>';
        return '<sf-symbol name="' + m.icon + '"></sf-symbol>';
    }

    /* ── Generic dialog ── */
    function openDialog(o) {
        var old = document.getElementById(o.id);
        if (old) old.remove();
        var overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = o.id;
        overlay.innerHTML = '<div class="modal modal--' + (o.size || 'medium') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '">'
            + '<div class="modal__header"><h3 class="modal__title">' + esc(o.title) + '</h3><button type="button" class="modal__close" aria-label="Close"><sf-symbol name="xmark"></sf-symbol></button></div>'
            + '<div class="modal__body"></div>' + (o.footer === false ? '' : '<div class="modal__footer"></div>') + '</div>';
        document.body.appendChild(overlay);
        var opener = document.activeElement;
        var dlg = {
            el: overlay,
            body: overlay.querySelector('.modal__body'),
            footer: overlay.querySelector('.modal__footer'),
            close: function() { if (o.locked && o.locked()) return; overlay.remove(); if (opener && opener.focus && document.contains(opener)) opener.focus(); if (o.onClose) o.onClose(); }
        };
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay || e.target.closest('.modal__close')) dlg.close();
        });
        requestAnimationFrame(function() {
            overlay.classList.add('modal-overlay--open');
            var first = overlay.querySelector('.modal__footer .btn--primary') || overlay.querySelector('.modal__close');   // focus moves into the dialog
            if (first) first.focus();
        });
        return dlg;
    }

    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Escape') return;
        var open = document.querySelectorAll('.fdr-dialog.modal-overlay--open');
        if (open.length) { var last = open[open.length - 1]; var c = last.querySelector('.modal__close'); if (c) c.click(); }
    });

    function dialog(o) { var d = openDialog(o); d.el.classList.add('fdr-dialog'); return d; }

    /* ── Version strip and wizard ── */

    function scheduledUnits() {
        return D.units.filter(function(u) { return u.deploy && u.deploy.status === 'scheduled'; });
    }

    function latestVersion() { return D.versions[0]; }

    function renderBar() {
        var bar = document.getElementById('fdrDeployBar');
        var latest = latestVersion();
        var sched = scheduledUnits().length;
        var picked = S.deploy.version ? versionById(S.deploy.version) : null;
        var sel = S.deploy.selected.size;
        var steps = [
            { label: 'Select a version', on: !picked, done: !!picked },
            { label: 'Select devices', on: !!picked && !sel, done: !!sel },
            { label: 'Proceed to roll-out', on: !!picked && !!sel, done: false }
        ];
        var strip = '<div class="fdr-vstrip">'
            + '<div class="fdr-vstrip__item"><span class="fdr-vstrip__label">Latest recovery version</span> <a href="#" class="link" data-deploy-versions>' + esc(latest.label) + '</a></div>'
            + '<div class="fdr-vstrip__item"><label class="fdr-vstrip__label" for="fdrVersionSelect">recovery version to roll-out</label> '
            + '<select id="fdrVersionSelect" class="form-select" aria-label="recovery version to roll-out"><option value="">Select a version</option>'
            + D.versions.map(function(v) { return '<option value="' + v.id + '"' + (picked && picked.id === v.id ? ' selected' : '') + '>' + esc(v.label) + (v.note ? ' (' + v.note + ')' : '') + '</option>'; }).join('')
            + '</select></div>'
            + '<div class="fdr-vstrip__spacer"></div>'
            + '<a href="#" class="link fdr-vstrip__action" data-deploy-schedule><sf-symbol name="clock"></sf-symbol> ' + (sched ? plural(sched, 'scheduled roll-out', 'scheduled roll-outs') : 'No scheduled roll-outs') + '</a>'
            + (S.readonly ? '' : '<button type="button" class="btn btn--secondary btn--small" data-deploy-import><sf-symbol name="square.and.arrow.up"></sf-symbol> Import version</button>')
            + '</div>';
        var html = '';
        if (!S.readonly) {
            html += '<div class="fdr-wizard"><ol class="fdr-wizard__steps">' + steps.map(function(s, i) {
                return '<li class="fdr-wizard__step' + (s.on ? ' fdr-wizard__step--on' : '') + (s.done ? ' fdr-wizard__step--done' : '') + '"><span class="fdr-wizard__num">' + (s.done ? '<sf-symbol name="checkmark"></sf-symbol>' : (i + 1)) + '</span>' + s.label + '</li>';
            }).join('') + '</ol><div class="fdr-wizard__end"><span class="fdr-sub">' + (picked ? plural(sel, 'device', 'devices') + ' selected for ' + esc(picked.label) : 'No version selected') + '</span>'
            + '<button type="button" class="btn btn--primary btn--small" data-deploy-proceed' + (picked && sel ? '' : ' disabled') + '>Proceed to roll-out</button></div></div>';
        }
        // Wizard first (where the user is in the flow), then the version and schedule actions.
        bar.innerHTML = html + strip;
    }

    /* ── Table ── */

    function deployRow(u) {
        var ok = eligible(u);
        var sel = S.deploy.selected.has(u.id);
        var cbInner = '<label class="checkbox"><input type="checkbox" class="checkbox__input fdr-deploy-check" data-unit="' + u.id + '"' + (sel ? ' checked' : '') + (ok && S.deploy.version ? '' : ' disabled') + ' aria-label="Select ' + esc(u.serial) + '"><span class="checkbox__box"></span></label>';
        var cb = S.readonly ? '' : (ok ? (S.deploy.version ? cbInner : T.tip('Select a version first.', cbInner, 'fdr-tip--start')) : T.tip(ineligibleReason(u), cbInner, 'fdr-tip--start'));
        var d = u.deploy;
        var last;
        if (!d) last = '<span class="fdr-sub">Never rolled out</span>';
        else {
            var when = d.status === 'scheduled' ? 'Scheduled for ' + T.fmt(d.scheduledFor) : T.fmt(d.at);
            last = '<button type="button" class="fdr-dstatus fdr-dstatus--' + DSTATUS[d.status].tone + '" data-deploy-status="' + u.id + '" aria-label="' + DSTATUS[d.status].label + ': open details" title="' + DSTATUS[d.status].label + '">' + statusIcon(d.status) + '</button> '
                + '<span class="fdr-dwhen">' + when + '</span>' + (d.by ? '<div class="fdr-sub">' + esc(d.by) + '</div>' : '');
        }
        var hist = T.tip('Roll-out history', '<button type="button" class="btn btn--secondary btn--small btn--icon" data-deploy-history="' + u.id + '" aria-label="Roll-out history"><sf-symbol name="clock.arrow.circlepath"></sf-symbol></button>');
        return '<tr class="table__row fdr-unit' + (sel ? ' fdr-unit--selected' : '') + (ok ? '' : ' fdr-unit--muted') + '">'
            + '<td class="table__cell">' + cb + '</td>'
            + '<td class="table__cell"><span class="fdr-name__text">' + esc(u.serial) + '</span>' + (S.groupBySite ? '' : '<div class="fdr-sub">' + esc(u.project) + ' · ' + esc(u.site) + '</div>') + '</td>'
            + '<td class="table__cell"><span class="tag tag--tiny tag--gray">' + esc(u.fdrType || 'Not set') + '</span></td>'
            + '<td class="table__cell">' + installedLabel(u) + '</td>'
            + '<td class="table__cell">' + last + '</td>'
            + '<td class="table__cell fdr-action"><div class="fdr-action__group">' + hist + '</div></td></tr>';
    }

    function render(list) {
        // A tick on a unit that is no longer deployable (for example it was just sent for re-registration) is dropped.
        Array.from(S.deploy.selected).forEach(function(id) { var u = unitsById([id])[0]; if (!u || !eligible(u)) S.deploy.selected.delete(id); });
        renderBar();
        var allSel = list.filter(function(u) { return eligible(u) && S.deploy.version; });
        var allChecked = allSel.length && allSel.every(function(u) { return S.deploy.selected.has(u.id); });
        document.getElementById('fdrDeployHead').innerHTML = '<tr class="table__row"><th class="table__header fdr-col-check">'
            + (S.readonly ? '' : '<label class="checkbox"><input type="checkbox" class="checkbox__input" id="fdrDeploySelectAll" aria-label="Select all registered devices"' + (allChecked ? ' checked' : '') + (allSel.length ? '' : ' disabled') + '><span class="checkbox__box"></span></label>')
            + '</th>' + T.headerCell('unit', 'Device', true) + T.headerCell('type', 'Recovery profile', true) + T.headerCell('version', 'Recovery version', false) + T.headerCell('deployed', 'Last rolled out', false)
            + '<th class="table__header fdr-col-action"></th></tr>';
        var sorted = T.sortUnits(list, null);
        document.getElementById('fdrDeployTable').classList.toggle('fdr-grouped', S.groupBySite || S.projects.length > 1);
        document.getElementById('fdrDeployBody').innerHTML = list.length ? T.groupedRows(sorted, {
            labelSpan: 3, restSpan: 2, rowHtml: deployRow,
            totals: function(units) { var n = units.filter(eligible).length; return '<span class="fdr-sub">' + n + ' of ' + units.length + ' can be rolled out</span>'; }
        }) : '';
    }

    /* ── Roll out flow ── */

    function pushHistory(u, entry) { u.history.push(entry); u.deploy = Object.assign({}, entry); }

    function startRun(u, version, by) {
        u.deploy = { version: version, status: 'deploying', at: new Date().toISOString(), by: by || ME };
        setTimeout(function() {
            var fail = S.demo === 'deploy-fail' && parseInt(u.serial.slice(-2), 10) % 2 === 0;
            pushHistory(u, { version: version, status: fail ? 'error' : 'success', at: new Date().toISOString(), by: by || ME, message: fail ? ERR_MSG : '' });
            if (S.tab === 'deploy') window.FdrApp.render();
        }, RUN_MS);
    }

    function openSummary() {
        var picked = versionById(S.deploy.version);
        var us = unitsById(Array.from(S.deploy.selected)).filter(eligible);
        if (!picked || !us.length) return;
        var sending = false;
        var dlg = dialog({ id: 'fdrDeploySummary', title: 'Recovery version roll-out', size: 'large', locked: function() { return sending; } });
        dlg.body.innerHTML = '<p class="fdr-modal__lead"><strong>' + plural(us.length, 'device', 'devices') + '</strong> selected for roll-out of recovery <strong>' + esc(picked.label) + '</strong>.</p>'
            + '<div class="fdr-dlg-table"><table class="table"><thead class="table__head"><tr class="table__row"><th class="table__header">Device</th><th class="table__header">Faculty</th><th class="table__header">Campus</th><th class="table__header">recovery profile</th><th class="table__header">Installed version</th><th class="table__header">After roll-out</th></tr></thead><tbody class="table__body">'
            + us.map(function(u) {
                var cur = installedLabel(u);
                return '<tr class="table__row"><td class="table__cell">' + esc(u.serial) + '</td><td class="table__cell">' + esc(u.project) + '</td><td class="table__cell">' + esc(u.site) + '</td><td class="table__cell">' + esc(u.fdrType) + '</td><td class="table__cell">' + cur + '</td><td class="table__cell"><strong>' + esc(picked.label) + '</strong></td></tr>';
            }).join('') + '</tbody></table></div>';
        dlg.footer.innerHTML = '<label class="checkbox fdr-sched"><input type="checkbox" class="checkbox__input" id="fdrSchedCheck"><span class="checkbox__box"></span><span class="checkbox__label">Schedule roll-out</span></label>'
            + '<input type="datetime-local" class="form-input fdr-sched__when" id="fdrSchedWhen" disabled aria-label="Schedule date and time">'
            + '<span class="fdr-sched__hint" id="fdrSchedHint" hidden>Choose a future date and time.</span>'
            + '<span class="fdr-sched__spacer"></span>'
            + '<button type="button" class="btn btn--secondary btn--medium" id="fdrSumCancel">Cancel</button>'
            + '<button type="button" class="btn btn--primary btn--medium" id="fdrSumDeploy">Roll out</button>';
        var chk = dlg.footer.querySelector('#fdrSchedCheck'), when = dlg.footer.querySelector('#fdrSchedWhen'), go = dlg.footer.querySelector('#fdrSumDeploy'), hint = dlg.footer.querySelector('#fdrSchedHint');
        function futureOk() { return !!when.value && new Date(when.value).getTime() > Date.now(); }
        function ready() {
            if (sending) return;
            go.disabled = chk.checked && !futureOk();
            go.textContent = chk.checked ? 'Schedule' : 'Roll out';
            hint.hidden = !(chk.checked && !futureOk());
        }
        var d0 = new Date(Date.now() + 86400000); d0.setMinutes(0, 0, 0);
        when.value = new Date(d0.getTime() - d0.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        chk.addEventListener('change', function() { when.disabled = !chk.checked; ready(); });
        when.addEventListener('input', ready);
        dlg.footer.querySelector('#fdrSumCancel').addEventListener('click', function() { dlg.close(); });
        go.addEventListener('click', function() {
            if (sending) return;
            if (chk.checked && !futureOk()) { ready(); return; }   // the chosen time may have passed while the dialog was open
            var scheduleNow = chk.checked, whenNow = when.value;   // snapshot: the request uses what was chosen at the click
            sending = true; S.deploy.sending = true; go.disabled = true; chk.disabled = true; when.disabled = true;
            go.innerHTML = '<span class="loader__spinner loader__spinner--small"></span> ' + (scheduleNow ? 'Scheduling…' : 'Rolling out…');
            setTimeout(function() {
                sending = false; S.deploy.sending = false;
                if (S.demo === 'deploy-down') {
                    dlg.close();
                    window.FdrActions.notify('error', '<strong>The roll-out service could not be reached.</strong> No roll-out was started.');
                    return;
                }
                var scheduled = scheduleNow ? new Date(whenNow).toISOString() : null;
                us.forEach(function(u) {
                    if (scheduled) u.deploy = { version: picked.id, status: 'scheduled', scheduledFor: scheduled, by: ME };
                    else startRun(u, picked.id, ME);
                    S.deploy.selected.delete(u.id);
                });
                dlg.close();
                window.FdrActions.clearNotice();
                toast('success', scheduled ? '<strong>' + plural(us.length, 'roll-out', 'roll-outs') + ' scheduled</strong> for recovery ' + esc(picked.label) + '.' : '<strong>Rolling out recovery ' + esc(picked.label) + '</strong> to ' + plural(us.length, 'device', 'devices') + '. This page updates by itself.');
                window.FdrApp.render();
            }, DEPLOY_MS);
        });
    }

    function detailRows(rows) {
        return '<dl class="fdr-kv">' + rows.map(function(r) { return '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>'; }).join('') + '</dl>';
    }

    function entryDetail(u, e) {
        var v = (versionById(e.version) || {}).label || 'v' + e.version;
        var rows = [['Device', esc(u.serial)], ['Recovery version', esc(v)],
                    ['Status', '<span class="fdr-dstatus-inline fdr-dstatus--' + DSTATUS[e.status].tone + '">' + statusIcon(e.status) + ' ' + DSTATUS[e.status].label + '</span>']];
        if (e.status === 'scheduled') rows.push(['Scheduled for', T.fmt(e.scheduledFor)]);
        else rows.push(['Rolled out at', T.fmt(e.at)]);
        rows.push(['By', esc(e.by || '-')]);
        if (e.message) rows.push(['Message', esc(e.message)]);
        return detailRows(rows);
    }

    function openStatus(id) {
        var u = unitsById([id])[0];
        if (!u || !u.deploy) return;
        var d = u.deploy;
        var dlg = dialog({ id: 'fdrDeployStatus', title: 'Roll-out status · ' + u.serial, size: 'medium' });
        dlg.body.innerHTML = entryDetail(u, d);
        var html = '<button type="button" class="btn btn--secondary btn--medium" data-close>Close</button>';
        if (!S.readonly && d.status === 'error') html += '<button type="button" class="btn btn--primary btn--medium" data-retry-deploy><sf-symbol name="arrow.clockwise"></sf-symbol> Retry</button>';
        if (!S.readonly && d.status === 'scheduled') html += '<button type="button" class="btn btn--danger btn--medium" data-cancel-schedule>Cancel schedule</button>';
        dlg.footer.innerHTML = html;
        dlg.footer.addEventListener('click', function(e) {
            if (e.target.closest('[data-close]')) dlg.close();
            else if (e.target.closest('[data-retry-deploy]')) { dlg.close(); startRun(u, d.version, ME); toast('success', '<strong>Retrying recovery ' + esc((versionById(d.version) || {}).label) + '</strong> on ' + esc(u.serial) + '.'); window.FdrApp.render(); }
            else if (e.target.closest('[data-cancel-schedule]')) { cancelSchedule(u); dlg.close(); }
        });
    }

    function cancelSchedule(u) {
        u.deploy = u.history.length ? Object.assign({}, u.history[u.history.length - 1]) : null;
        toast('success', '<strong>Scheduled roll-out cancelled</strong> for ' + esc(u.serial) + '.');
        window.FdrApp.render();
    }

    function openHistory(id) {
        var u = unitsById([id])[0];
        if (!u) return;
        var entries = u.history.slice().reverse();
        if (u.deploy && (u.deploy.status === 'scheduled' || u.deploy.status === 'deploying')) entries.unshift(u.deploy);
        var active = 0;
        var dlg = dialog({ id: 'fdrDeployHistory', title: 'Roll-out history · ' + u.serial, size: 'large', footer: false });
        function paint() {
            dlg.body.innerHTML = entries.length
                ? '<div class="fdr-hist"><ul class="fdr-hist__list">' + entries.map(function(e, i) {
                    var v = (versionById(e.version) || {}).label || 'v' + e.version;
                    return '<li><button type="button" class="fdr-hist__item' + (i === active ? ' fdr-hist__item--on' : '') + '" data-hist="' + i + '"><span class="fdr-dstatus-inline fdr-dstatus--' + DSTATUS[e.status].tone + '">' + statusIcon(e.status) + '</span> <strong>' + esc(v) + '</strong><span class="fdr-sub">' + T.fmt(e.at || e.scheduledFor) + '</span></button></li>';
                }).join('') + '</ul><div class="fdr-hist__detail">' + entryDetail(u, entries[active]) + '</div></div>'
                : '<div class="empty-state"><div class="empty-state__title">No roll-outs yet</div><div class="empty-state__subtitle">This device has never received an recovery version.</div></div>';
        }
        paint();
        dlg.body.addEventListener('click', function(e) {
            var b = e.target.closest('[data-hist]');
            if (b) { active = +b.dataset.hist; paint(); }
        });
    }

    function openSchedule() {
        var dlg = dialog({ id: 'fdrDeploySchedule', title: 'Scheduled roll-outs', size: 'large' });
        function paint() {
            var us = scheduledUnits().sort(function(a, b) { return a.deploy.scheduledFor < b.deploy.scheduledFor ? -1 : 1; });
            dlg.body.innerHTML = us.length
                ? '<div class="fdr-dlg-table"><table class="table"><thead class="table__head"><tr class="table__row"><th class="table__header">Device</th><th class="table__header">Faculty</th><th class="table__header">Campus</th><th class="table__header">recovery version</th><th class="table__header">Scheduled for</th><th class="table__header">By</th><th class="table__header"></th></tr></thead><tbody class="table__body">'
                    + us.map(function(u) {
                        return '<tr class="table__row"><td class="table__cell">' + esc(u.serial) + '</td><td class="table__cell">' + esc(u.project) + '</td><td class="table__cell">' + esc(u.site) + '</td><td class="table__cell">' + esc((versionById(u.deploy.version) || {}).label) + '</td><td class="table__cell">' + T.fmt(u.deploy.scheduledFor) + '</td><td class="table__cell">' + esc(u.deploy.by || '-') + '</td>'
                            + '<td class="table__cell">' + (S.readonly ? '' : '<button type="button" class="btn btn--link btn--small" data-cancel="' + u.id + '">Cancel</button>') + '</td></tr>';
                    }).join('') + '</tbody></table></div>'
                : '<div class="empty-state"><sf-symbol class="empty-state__icon" name="clock"></sf-symbol><div class="empty-state__title">No scheduled roll-outs</div><div class="empty-state__subtitle">Schedule a roll-out from the summary step.</div></div>';
        }
        paint();
        dlg.footer.innerHTML = '<button type="button" class="btn btn--secondary btn--medium" data-close>Close</button>';
        dlg.el.addEventListener('click', function(e) {
            if (e.target.closest('[data-close]')) dlg.close();
            var c = e.target.closest('[data-cancel]');
            if (c) { cancelSchedule(unitsById([c.dataset.cancel])[0]); paint(); }
        });
    }

    function openVersions() {
        var dlg = dialog({ id: 'fdrDeployVersions', title: 'Recovery versions', size: 'medium' });
        dlg.body.innerHTML = '<div class="fdr-dlg-table"><table class="table"><thead class="table__head"><tr class="table__row"><th class="table__header">Version</th><th class="table__header">Imported at</th><th class="table__header">By</th><th class="table__header">Rooms</th></tr></thead><tbody class="table__body">'
            + D.versions.map(function(v) { return '<tr class="table__row"><td class="table__cell"><strong>' + esc(v.label) + '</strong>' + (v.note ? ' <span class="tag tag--tiny tag--primary">' + esc(v.note) + '</span>' : '') + '</td><td class="table__cell">' + T.fmt(v.importedAt) + '</td><td class="table__cell">' + esc(v.by) + '</td><td class="table__cell">' + v.stations + '</td></tr>'; }).join('') + '</tbody></table></div>';
        dlg.footer.innerHTML = '<button type="button" class="btn btn--secondary btn--medium" data-close>Close</button>' + (S.readonly ? '' : '<button type="button" class="btn btn--primary btn--medium" data-import><sf-symbol name="square.and.arrow.up"></sf-symbol> Import version</button>');
        dlg.footer.addEventListener('click', function(e) {
            if (e.target.closest('[data-close]')) dlg.close();
            else if (e.target.closest('[data-import]')) { dlg.close(); openImport(); }
        });
    }

    /* Import a new recovery version from an XLSX file: 1 upload and validate, 2 review and confirm. */
    function openImport() {
        var step = 0, fileName = '', importing = false;
        var next = latestVersion().id + 1;
        var dlg = dialog({ id: 'fdrDeployImport', title: 'Import recovery version', size: 'large', locked: function() { return importing; } });
        var warnings = ['Room EN-104 Studio is in the file but has no devices at the selected campuses.', '2 rooms have no recovery keys.'];
        var sample = [['EN-101 Lecture Theatre', 'Standard', 'OK'], ['EN-103 AV Lab', 'Extended', 'OK'], ['EN-105 Teaching Lab', 'Standard', 'OK'], ['EN-104 Studio', 'Not set', 'No devices'], ['EN-102 Seminar Room', 'Standard', 'OK']];
        function steps() {
            return '<ol class="fdr-wizard__steps fdr-wizard__steps--modal"><li class="fdr-wizard__step' + (step === 0 ? ' fdr-wizard__step--on' : ' fdr-wizard__step--done') + '"><span class="fdr-wizard__num">' + (step === 0 ? 1 : '<sf-symbol name="checkmark"></sf-symbol>') + '</span>Upload and validate</li>'
                + '<li class="fdr-wizard__step' + (step === 1 ? ' fdr-wizard__step--on' : '') + '"><span class="fdr-wizard__num">2</span>Review and import</li></ol>';
        }
        function paint() {
            var failed = S.demo === 'import-error' && fileName;
            if (step === 0) {
                dlg.body.innerHTML = steps() + '<div class="fdr-drop">' + (fileName
                    ? '<sf-symbol name="doc.text"></sf-symbol> <strong>' + esc(fileName) + '</strong> <button type="button" class="btn btn--link btn--small" data-remove>Remove</button>'
                    : '<sf-symbol name="square.and.arrow.up"></sf-symbol><div>Drop an XLSX file here, or</div><label class="btn btn--secondary btn--small fdr-drop__pick">Choose file<input type="file" accept=".xlsx" hidden id="fdrImportFile"></label> <button type="button" class="btn btn--link btn--small" data-sample>Use a sample file</button>') + '</div>'
                    + (failed ? '<div class="notification notification--error"><div class="notification__icon"><sf-symbol name="xmark.circle.fill"></sf-symbol></div><div class="notification__content"><div class="notification__message"><strong>The file could not be validated.</strong> Column "recovery profile" is missing.</div></div></div>'
                        : fileName ? '<div class="notification notification--warning"><div class="notification__icon"><sf-symbol name="exclamationmark.triangle.fill"></sf-symbol></div><div class="notification__content"><div class="notification__message"><strong>Validated with ' + plural(warnings.length, 'warning', 'warnings') + '.</strong><ul class="fdr-modal__list">' + warnings.map(function(w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></div></div></div>' : '');
                dlg.footer.innerHTML = '<button type="button" class="btn btn--secondary btn--medium" data-close>Cancel</button><button type="button" class="btn btn--primary btn--medium" data-next' + (fileName && !failed ? '' : ' disabled') + '>Next</button>';
            } else {
                dlg.body.innerHTML = steps() + '<p class="fdr-modal__lead">This creates recovery version <strong>v' + next + '</strong> from <strong>' + esc(fileName) + '</strong> with <strong>' + sample.length + ' rooms</strong> shown below (sample).</p>'
                    + '<div class="fdr-dlg-table"><table class="table"><thead class="table__head"><tr class="table__row"><th class="table__header">Room</th><th class="table__header">recovery profile</th><th class="table__header">Check</th></tr></thead><tbody class="table__body">'
                    + sample.map(function(r) { return '<tr class="table__row"><td class="table__cell">' + esc(r[0]) + '</td><td class="table__cell">' + esc(r[1]) + '</td><td class="table__cell">' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
                dlg.footer.innerHTML = '<button type="button" class="btn btn--secondary btn--medium" data-back' + (importing ? ' disabled' : '') + '>Back</button><button type="button" class="btn btn--primary btn--medium" data-import' + (importing ? ' disabled' : '') + '>' + (importing ? '<span class="loader__spinner loader__spinner--small"></span> Importing…' : 'Import') + '</button>';
            }
        }
        paint();
        dlg.el.addEventListener('change', function(e) {
            if (e.target.id === 'fdrImportFile' && e.target.files[0]) { fileName = e.target.files[0].name; paint(); }
        });
        dlg.el.addEventListener('click', function(e) {
            var t = e.target;
            if (t.closest('[data-close]')) dlg.close();
            else if (t.closest('[data-sample]')) { fileName = 'fdr-v' + next + '.xlsx'; paint(); }
            else if (t.closest('[data-remove]')) { fileName = ''; paint(); }
            else if (t.closest('[data-next]')) { step = 1; paint(); }
            else if (t.closest('[data-back]')) { step = 0; paint(); }
            else if (t.closest('[data-import]')) {
                if (importing) return;
                importing = true; S.deploy.sending = true; paint();
                setTimeout(function() {
                    importing = false; S.deploy.sending = false;
                    D.versions.forEach(function(v) { v.note = ''; });
                    D.versions.unshift({ id: next, label: 'v' + next, importedAt: new Date().toISOString(), by: ME, stations: sample.length, note: 'Latest' });
                    dlg.close();
                    toast('success', '<strong>Recovery v' + next + ' imported.</strong> It is now the latest version.');
                    window.FdrApp.render();
                }, DEPLOY_MS);
            }
        });
    }

    /* ── Events ── */

    function bind() {
        document.addEventListener('click', function(e) {
            var t = e.target;
            var b;
            if ((b = t.closest('[data-deploy-status]'))) { openStatus(b.dataset.deployStatus); }
            else if ((b = t.closest('[data-deploy-history]'))) { openHistory(b.dataset.deployHistory); }
            else if (t.closest('[data-deploy-proceed]')) { openSummary(); }
            else if (t.closest('[data-deploy-schedule]')) { e.preventDefault(); openSchedule(); }
            else if (t.closest('[data-deploy-versions]')) { e.preventDefault(); openVersions(); }
            else if (t.closest('[data-deploy-import]')) { openImport(); }
        });
        document.addEventListener('change', function(e) {
            var t = e.target;
            if (t.id === 'fdrVersionSelect') {
                S.deploy.version = t.value ? +t.value : null;
                if (!S.deploy.version) S.deploy.selected.clear();   // clearing the version resets the selection, as on the Faculty-registered page
                window.FdrApp.render();
            } else if (t.id === 'fdrDeploySelectAll') {
                T.visibleDeploy().filter(function(u) { return eligible(u) && S.deploy.version; }).forEach(function(u) { if (t.checked) S.deploy.selected.add(u.id); else S.deploy.selected.delete(u.id); });
                window.FdrApp.render();
            } else if (t.classList.contains('fdr-deploy-check')) {
                if (t.checked) S.deploy.selected.add(t.dataset.unit); else S.deploy.selected.delete(t.dataset.unit);
                window.FdrApp.render();
            }
        });
    }

    window.FdrDeploy = { render: render, bind: bind, eligible: eligible };
})();
