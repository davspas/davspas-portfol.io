/**
 * Manage Devices — Shared state module (window.UnitsState)
 * Central mutable state for the two views (Managed / Registered — both flat unit lists),
 * plus localStorage keys/helpers. Only ONE site is selectable at a time.
 */
(function() {
    'use strict';

    var STORAGE_KEY_SITE = 'manage-devices:site';                  // single site id (string)
    var STORAGE_KEY_UNIT_TYPE = 'manage-devices:unitType';
    var STORAGE_KEY_SITES_LEGACY = 'manage-devices:sites';         // pre-cascader JSON array (migrated away)

    var VALID_SITES = ['NORT', 'HLSD', 'MEDS'];
    var VALID_UNIT_TYPES = ['Managed', 'Registered'];

    window.UnitsState = {
        // localStorage keys
        STORAGE_KEY_SITE: STORAGE_KEY_SITE,
        STORAGE_KEY_UNIT_TYPE: STORAGE_KEY_UNIT_TYPE,
        STORAGE_KEY_SITES_LEGACY: STORAGE_KEY_SITES_LEGACY,
        VALID_SITES: VALID_SITES,
        VALID_UNIT_TYPES: VALID_UNIT_TYPES,

        // Working set (filtered for the active view) + selection
        currentData: [],
        selectedRows: new Set(),

        // Active mode: 'Managed' | 'Registered' | null
        currentTypeFilter: null,

        // Subheader scope selection (single site, shared across both modes).
        selectedSite: null,

        // localStorage helpers (safe — disabled storage must not break the page)
        read: function(key) {
            try { return localStorage.getItem(key); } catch (_) { return null; }
        },
        write: function(key, value) {
            try { localStorage.setItem(key, value); } catch (_) {}
        }
    };
})();
