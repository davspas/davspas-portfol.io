/**
 * CRITICAL: This initialization pattern is required for all prototypes
 *
 * The DaVinci Canvas dispatches a 'davinci:canvas:ready' event when
 * it has fully loaded and injected all DOM elements. This is more reliable
 * than arbitrary time delays, especially for hosted solutions with varying
 * network conditions.
 *
 * The pattern includes a fallback timeout to ensure initialization even if
 * the event is missed (e.g., if this script loads after canvas is ready).
 */
(function() {
    let initialized = false;

    function safeInit() {
        if (initialized) return;
        initialized = true;
        init();
    }

    // Primary: Listen for template ready event
    document.addEventListener('davinci:canvas:ready', safeInit);

    // Fallback: If canvas is already loaded or event was missed
    // Check if main container exists (indicates canvas is ready)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Give canvas a moment to dispatch event
            setTimeout(() => {
                if (!initialized && document.querySelector('.main-container')) {
                    console.warn('Canvas ready event missed, using fallback initialization');
                    safeInit();
                }
            }, 100);
        });
    } else {
        // DOM already loaded, check immediately
        setTimeout(() => {
            if (!initialized && document.querySelector('.main-container')) {
                console.warn('Canvas ready event missed, using fallback initialization');
                safeInit();
            }
        }, 100);
    }
})();
