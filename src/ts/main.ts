import {ConvivaAnalytics} from './ConvivaAnalytics';

// Export Conviva Analytics to global namespace
let w = (window as any);
w.bitmovin = w.bitmovin || {};
w.bitmovin.player = w.bitmovin.player || {};
w.bitmovin.player.analytics = w.bitmovin.player.analytics || {};
w.bitmovin.player.analytics.ConvivaAnalytics = ConvivaAnalytics;
