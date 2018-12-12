import BitmovinPlayer from 'bitmovin-player';
import ConvivaAnalytics from '../ts/ConvivaAnalytics';

declare global {
  interface Window {
    bitmovin: {
      player?: {
        Player?: typeof BitmovinPlayer,
        analytics?: {
          ConvivaAnalytics?: typeof ConvivaAnalytics,
        },
      },
    }
  }
}
