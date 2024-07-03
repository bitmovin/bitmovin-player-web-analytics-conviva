import { ConvivaAnalyticsTracker } from './ConvivaAnalyticsTracker';

export class ConvivaSsaiAnalytics {
  private readonly convivaAnalyticsTracker: ConvivaAnalyticsTracker;

  constructor(convivaAnalyticsTracker: ConvivaAnalyticsTracker) {
    this.convivaAnalyticsTracker = convivaAnalyticsTracker;
  }
}
