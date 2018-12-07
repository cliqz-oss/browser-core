import background from '../core/base/background';
import inject from '../core/kord/inject';
import AntitrackingStatCounter from './antitracking-stats';

/**
 * This module aims is an experimental attempt at creating
 * a local representation of whotracks.me data based on the user's
 * history.
 *
 * This is done by tapping into the anti-tracking module to retrieve
 * the needed anti-tracking stats
 *
 * @namespace  whotracksme
 * @class  Background
 */
export default background({

  antitracking: inject.module('antitracking'),

  async init() {
    const tabTracker = await this.antitracking.action('getTabTracker');
    const trackerList = await this.antitracking.action('getWhitelist');
    this.statCounter = new AntitrackingStatCounter(tabTracker, trackerList);
    return this.statCounter.init();
  },

  unload() {
    if (this.statCounter) {
      this.statCounter.unload();
    }
  },

  actions: {
    getDailySummary(daysBack) {
      return this.statCounter.getDailySummary(daysBack);
    },

    getSite(site) {
      return this.statCounter.getSite(site);
    },

    getTracker(tracker) {
      return this.statCounter.getTracker(tracker);
    },

    getSiteSummaries(day) {
      return this.statCounter.getSiteSummaries(day);
    },

    getTrackerSummaries(day) {
      return this.statCounter.getTrackerSummaries(day);
    },

    getAllDaysSummary() {
      return this.statCounter.getAllDaysSummary();
    },

    getTrackersOnSite(site) {
      return this.statCounter.getTrackersOnSite(site);
    },

    getSitesWhereTracker(tracker) {
      return this.statCounter.getSitesWhereTracker(tracker);
    },
  }
});
