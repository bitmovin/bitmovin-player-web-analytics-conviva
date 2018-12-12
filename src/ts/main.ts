/// <reference path="../types/global.d.ts">

import ConvivaAnalytics from './ConvivaAnalytics';

export * from './ConvivaAnalytics';

// Export Conviva Analytics to global namespace
window.bitmovin = window.bitmovin || {};
window.bitmovin.player = window.bitmovin.player || {};
window.bitmovin.player.analytics = window.bitmovin.player.analytics || {};
window.bitmovin.player.analytics.ConvivaAnalytics = ConvivaAnalytics;
