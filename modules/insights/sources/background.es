import background from '../core/base/background';
import inject from '../core/kord/inject';
import domainInfo from '../core/services/domain-info';
import { extractHostname, sameGeneralDomain } from '../core/tlds';
import config from '../core/config';
import prefs from '../core/prefs';
import WTMApi from './wtm-api';
import InsightsDb, { mergeStats as statReducer } from './insights-db';
import logger from './logger';
import { query as getTabs } from '../core/tabs';

// True if the module responsible for triggering tab stats itself, otherwise triggering is external.
const isInternalTriggering = config.platform === 'webextension' && config.settings.channel !== 'CH80';

function mergeStats(stats) {
  return stats.reduce((_agg, elem) => {
    const agg = _agg;
    if (elem) {
      const { cookies, fingerprints, ads } = elem;
      agg.cookies += cookies;
      agg.fingerprints += fingerprints;
      agg.ads += ads;
    }
    return agg;
  }, {
    cookies: 0,
    fingerprints: 0,
    ads: 0,
  });
}

function mergeStatPair({ bugs, others }) {
  return mergeStats([
    mergeStats(Object.values(bugs)),
    mergeStats(Object.values(others)),
  ]);
}

function pageLoadTime(pageInfo) {
  if (!pageInfo.pageTiming || !pageInfo.pageTiming.timing) {
    // timing information didn't arrive - use time from first load
    const now = Date.now();
    return now - (pageInfo.firstLoadTimestamp || pageInfo.timestamp || now);
  }
  const pageTiming = pageInfo.pageTiming;
  return (pageTiming.timing.loadEventEnd || Date.now()) - pageTiming.timing.navigationStart;
}

const MAX_LOAD_TIME = 30000;
function timeSaved(loadTime, trackersBlocked) {
  const tl = Math.min(loadTime, MAX_LOAD_TIME);
  return Math.round((tl * (1.025 ** trackersBlocked)) - tl);
}

function shouldCalculateDataSaved() {
  return prefs.get('insights.datasaved', false);
}

/**
  @namespace <namespace>
  @class Background
 */
export default background({

  antitracking: inject.module('antitracking'),
  adblocker: inject.module('adblocker'),
  hpn: inject.module('hpnv2'),

  requiresServices: ['domainInfo'],

  /**
    @method init
    @param settings
  */
  async init() {
    this.api = new WTMApi();
    this.db = new InsightsDb();
    this.antitrackStaged = new Map();
    this.adblockerStaged = new Map();
    this.suggestionsSet = new Set();
    this.pageInfo = new Map();
    await Promise.all([
      this.api.init(),
      this.db.init()
    ]);
    if (isInternalTriggering) {
      try {
        this.tabInfo = await this.antitracking.action('getTabTracker');
      } catch (e) {
        logger.debug('no antitracking available');
      }

      inject.module('webrequest-pipeline').action('addPipelineStep', 'onBeforeRequest', {
        name: 'insights.onTabChanged',
        spec: 'collect',
        before: ['antitracking.onBeforeRequest', 'adblocker'],
        fn: (details) => {
          if (details.tabId > -1 && details.type === 'main_frame') {
            this.onPageEnd(details);
          }
        },
      });
    }
  },

  async onPageEnd({ tabId, isPrivate }) {
    if (isPrivate) {
      return null;
    }
    if (isInternalTriggering) {
      // we either have page stats for a completed load from pageinfo (sent from content-script),
      // or we can get partial information from the anti-tracking module.
      const result = await this.getStatsForTab(tabId);
      this.pageInfo.delete(tabId);
      return this.db.insertStats('daily', result);
    }
    this.pageInfo.delete(tabId);
    return null;
  },

  unload() {
    this.db.unload();
    this.api.unload();
  },

  beforeBrowserShutdown() {

  },

  async getAntitrackingReport(tabId, pageHost) {
    if (this.antitrackStaged.has(tabId)) {
      const { url, host, report } = this.antitrackStaged.get(tabId);
      this.antitrackStaged.delete(tabId);
      logger.info('attrack report', host, pageHost, url);
      if (host === pageHost) {
        return report;
      }
    }
    return this.antitracking.action('getGhosteryStats', tabId);
  },

  async getAdblockerReport(tabId, pageHost) {
    if (this.adblockerStaged.has(tabId)) {
      const { url, host, report } = this.adblockerStaged.get(tabId);
      this.adblockerStaged.delete(tabId);
      logger.info('adb report', host, pageHost, url);
      if (pageHost.indexOf(host) > -1) {
        return report;
      }
    }
    return this.adblocker.action('getGhosteryStats', tabId);
  },

  async getStatsForTab(tabId) {
    if (isInternalTriggering) {
      if ((this.pageInfo.has(tabId) || (this.tabInfo && this.tabInfo._active[tabId]))) {
        // we either have page stats for a completed load from pageinfo (sent from content-script),
        // or we can get partial information from the anti-tracking module.
        const info = this.pageInfo.get(tabId) || {
          host: this.tabInfo._active[tabId].hostname,
          timestamp: this.tabInfo._active[tabId].s
        };
        return this.aggregatePageStats(tabId, info, [], {});
      }
      return {};
    }
    return {};
  },

  async aggregatePageStats(tabId, pageInfo, apps, bugs) {
    const loadTime = pageLoadTime(pageInfo);
    const blocked = apps.filter(t => t.blocked).length;
    const requestsBlocked = apps
      .reduce((count, t) => t.sources.filter(s => s.blocked).length + count, 0);

    // Stats from anti-tracking modules, merged into a single result.
    const antitrackingStats = this.getAntitrackingReport(tabId, pageInfo.host);
    const adblockerStats = this.getAdblockerReport(tabId, pageInfo.host);
    const cliqzModuleStats = await Promise.all([
      antitrackingStats.then(mergeStatPair, () => { }),
      adblockerStats.then(mergeStatPair, () => { }),
    ]).then(mergeStats);
    const { cookies, fingerprints } = cliqzModuleStats;
    let ads = cliqzModuleStats.ads;

    // if there is no adblocker, calculate ads block from Advertising trackers
    if (!this.adblocker.isPresent()) {
      const owners = Object.keys(bugs).map(bid => domainInfo.getBugOwner(bid))
        .filter(owner => owner.cat === 'advertising');
      ads += owners.length;
    }

    // Count the total number of trackers we blocked on this page
    // Combine bugs blocked by ghostery with ones blocked by the adblocker
    const allBlockedApps = new Set();
    const trackersAndAdsBlocked = await adblockerStats
      .catch(() => ({ bugs: {}, others: {} }))
      .then((stats) => {
        // get bugIds from ghostery
        const bugIds = new Set(Object.keys(bugs).filter(b => bugs[b].blocked));
        // bugids blocked by adblocker
        Object.keys(stats.bugs).forEach(id => bugIds.add(id));
        // convert bugids to app ids
        [...bugIds].forEach(bid => allBlockedApps.add(domainInfo.getAppForBug(bid)));
        return allBlockedApps.size + Object.keys(stats.others).length;
      });

    // Count the total number of trackers seen on this page.
    // Combine antitracking and ghostery counts
    const trackersSeen = await antitrackingStats
      .catch(() => ({ bugs: {}, others: {} }))
      .then((stats) => {
        // ghostery bugids
        const bugIds = new Set(Object.keys(bugs));
        Object.keys(stats.bugs).forEach(id => bugIds.add(id));
        // get wtm ids for 'others' group
        const othersWtm = Object.values(stats.others).map(s => s.wtm);
        // find wtm ids for ghostery bugs where possible
        return new Set([...bugIds].map((bid) => {
          const aid = domainInfo.getAppForBug(bid);
          const owner = domainInfo.getAppOwner(aid);
          return owner.wtm || aid;
        }).concat(othersWtm)
          .filter(tracker => !!tracker));
      });

    // collect WTM links for trackers blocked on this page
    const trackerOwners = apps.filter(t => t.blocked || allBlockedApps.has(t.id))
      .reduce((ownersList, { id, sources }) => {
        const app = domainInfo.getAppOwner(id);
        if (!app.wtm) {
          const hosts = [...new Set(sources.map(({ src }) => extractHostname(src)))];
          const owners = hosts.map(h => domainInfo.getDomainOwner(h));
          hosts.forEach((h, i) => {
            if (owners[i].wtm && !sameGeneralDomain(pageInfo.host, h)) {
              ownersList.push(owners[i]);
            }
          });
        } else {
          ownersList.push(app);
        }
        return ownersList;
      }, []);
    // fetch data consumption stats for these trackers
    let dataSaved = 0;
    if (shouldCalculateDataSaved()) {
      const statsForTrackers = await this.api.getTrackerInfo(trackerOwners.map(o => o.wtm));
      dataSaved = Math.round(
        Object.values(statsForTrackers)
          .reduce((sum, s) => sum + (s && s.overview ? s.overview.content_length : 0), 0)
      );
    }

    return {
      loadTime,
      timeSaved: timeSaved(loadTime, trackersAndAdsBlocked),
      trackersDetected: trackersSeen.size,
      trackersBlocked: blocked,
      trackerRequestsBlocked: requestsBlocked,
      cookiesBlocked: cookies,
      fingerprintsRemoved: fingerprints,
      adsBlocked: ads,
      dataSaved,
      trackers: trackersSeen
    };
  },

  events: {
    'core:tab_close': function onTabClose(tab) {
      this.onPageEnd(tab);
    },
    'antitracking:tracker-report': function onAntitracking({ tabId, url, host, report }) {
      if (isInternalTriggering) {
        this.antitrackStaged.set(tabId, {
          url,
          host,
          report,
        });
      }
    },
    'adblocker:tracker-report': function onAdblocker({ tabId, url, host, report }) {
      if (isInternalTriggering) {
        this.adblockerStaged.set(tabId, {
          url,
          host,
          report,
        });
      }
    }
  },

  actions: {
    /**
     * Stats from ghostery when a navigation event happens.
     * @param tabId int
     * @param pageInfo Object: {
     *  timestamp: when page navigation was started
     *  pageTiming: {
     *    timing: {
     *      navigationStart: from performance api
     *      loadEventEnd: from performance api
     *    }
     *  },
     *  host: first party hostname
     * }
     * @param apps Array [{
     *  id: app ID,
     *  blocked: Boolean,
     *  sources: Array [{ src: string url, blocked: boolean }]
     * }, ...]
     * @param bugs Object {
     *  [bug ID]: {
     *    blocked: Boolean,
     *    sources: Array [{ src: string url, blocked: boolean }]
     *  }
     * }
     */
    async pushGhosteryPageStats(tabId, pageInfo, apps, bugs) {
      logger.debug(`page stats were pushed for tab ${tabId} - ${pageInfo.host}`);
      const result = await this.aggregatePageStats(tabId, pageInfo, apps, bugs);
      await this.db.insertStats('daily', result);
      return result;
    },

    /**
     * Get stats that *would* be added, given current tab state. Does not add stats
     * to the day counter. Arguments match #pushGhosteryPageStats().
     * @param tabId
     * @param pageInfo
     * @param apps
     * @param bugs
     */
    async getGhosteryPageStats(tabId, pageInfo, apps, bugs) {
      const pageStats = await this.aggregatePageStats(tabId, pageInfo, apps, bugs);
      // pageStats.trackers is a set which is not serialisable so we convert it to an array.
      pageStats.trackers = [...pageStats.trackers];
      pageStats.trackersDetailed = pageStats.trackers.map(this.actions.getTrackerDetails);
      return pageStats;
    },

    async getDashboardStats(period, tabs) {
      const historicalStats = this.db.getDashboardStats(period);
      let result = {};
      if (!tabs && getTabs) {
        // on firefox, instead of providing tabs we can pull in data.
        const currentTabs = await getTabs({});
        const activeTabStats = await Promise.all(
          currentTabs.map(({ id }) => this.getStatsForTab(id))
        );
        result = activeTabStats.reduce(statReducer, result);
      } else if (tabs) {
        // active tabs provided by the caller - merge with antitracking and adblocker data
        const activeTabStats = await Promise.all(
          tabs.map(({ tabId, pageInfo, apps, bugs }) =>
            this.aggregatePageStats(tabId, pageInfo, apps, bugs))
        );
        result = activeTabStats.reduce(statReducer, result);
      }
      const stats = statReducer(result, await historicalStats);
      // detailed tracker stats: `name`, `cat` and `wtm` ID (optional) for each tracker.
      if (stats.trackers) {
        stats.trackersDetailed = stats.trackers.map(this.actions.getTrackerDetails);
      }
      return stats;
    },

    async insertSearchStats(counters) {
      this.db.insertStats('search', counters);
    },

    // Get result in milliseconds to be consistent with timeSaved from getDashboardStats
    async getSearchTimeSaved() {
      const searchStats = await this.db.getSearchStats();

      return (searchStats.historySelected || 0) * 1000
        + (searchStats.organicSelected || 0) * 3000
        + (searchStats.speedDialClicked || 0) * 4000
        + (searchStats.smartCliqzTriggered || 0) * 5000;
    },

    /**
     * Get an array of daily summaries for a date range.
     * @param from lower bound for day search in moment compatible format
     * @param to upper bound for day search in moment compatible format
     * @param includeFrom if true, the 'from' day should be included in the results
     * @param includeTo if true, the 'to' day should be included in the results
     * @returns Array of stat objects for the specified time period
     */
    async getStatsTimeline(from, to, includeFrom, includeTo) {
      return this.db.getStatsTimeline(from, to, includeFrom, includeTo);
    },

    /**
     * Get stats object for a specific day
     * @param day moment-compatible date.
     */
    async getStatsForDay(day) {
      return this.db.getStatsForDay(day);
    },

    /**
     * Get an array of days for which there exists insights stats.
     */
    async getAllDays() {
      return this.db.getAllDays();
    },

    async clearData() {
      return this.db.clearData();
    },

    recordPageInfo(info, sender) {
      this.pageInfo.set(sender.tab.id, info);
    },

    getTrackerDetails(wtmOrAppId) {
      return domainInfo.getTrackerDetails(wtmOrAppId);
    },
  },
});
