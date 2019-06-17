import getDexie from '../platform/lib/dexie';
import moment from '../platform/lib/moment';
import { getGeneralDomain } from '../core/tlds';
import domainInfo from '../core/services/domain-info';
import md5 from '../core/helpers/md5';

const DATE_FORMAT = 'YYYY-MM-DD';

export default class AntitrackingStatCounter {
  constructor(pageLoadListener, trackerList) {
    this.pageLoadListener = pageLoadListener;
    this.trackerList = trackerList;
    this.db = null;
  }

  async init() {
    if (this.db !== null) return Promise.resolve();

    const Dexie = await getDexie();
    this.db = new Dexie('antitracking-stats');
    this.db.version(1).stores({
      daily: 'day',
      sites: '[day+site], day, site',
      trackers: '[day+tracker], day, tracker',
      trackersSites: '[day+tracker+site], day, tracker, site',
    });
    this.callback = (tab, page) => {
      this.onPage(page);
    };

    this.pageLoadListener.addEventListener('stage', this.callback);
    return Promise.resolve();
  }

  unload() {
    this.pageLoadListener.removeEventListener('stage', this.callback);
  }

  static aggregateTrackerStats(keys, object) {
    const entries = keys.map(k => object[k]);
    return {
      cookiesBlocked: entries.reduce((count, tp) =>
        count + (tp.set_cookie_blocked || 0) + (tp.cookie_blocked || 0), 0),
      datapointsRemoved: entries.reduce((count, tp) =>
        count + (tp.token_blocked_placeholder || 0) + (tp.token_blocked_block || 0), 0),
      requestsBlocked: entries.reduce((count, tp) =>
        count + (tp.blocked_external || 0) + (tp.blocked_blocklist || 0), 0),
    };
  }

  onPage(rawPage) {
    if (!rawPage) {
      return;
    }
    const page = rawPage.asPlainObject();
    if (rawPage.private || page.t < 10000 || ['http', 'https'].indexOf(page.scheme) === -1) {
      return;
    }
    const day = moment().format(DATE_FORMAT);
    const site = rawPage.hostname;

    // subset of domains which are tracker domains
    const trackerDomains = Object.keys(page.tps)
      .filter(
        domain => this.trackerList.isTrackerDomain(md5(getGeneralDomain(domain)).substring(0, 16))
      );
    // object: domain names -> owner company
    const trackerOwners = trackerDomains
      .reduce((owners, domain) => ({
        ...owners,
        [domain]: domainInfo.getDomainOwner(domain).name
      }), {});
    const aggregate = AntitrackingStatCounter.aggregateTrackerStats(trackerDomains, page.tps);
    aggregate.trackersSum = (new Set(Object.values(trackerOwners))).size;

    // global stats
    this.db.transaction('rw', this.db.daily, async () => {
      let counters = await this.db.daily.get(day);
      if (!counters) {
        counters = {
          day,
          pagesVisited: 0,
          cookiesBlocked: 0,
          datapointsRemoved: 0,
          requestsBlocked: 0,
          trackersSum: 0,
        };
      }
      counters.pagesVisited += 1;
      Object.keys(aggregate).forEach((stat) => {
        counters[stat] += aggregate[stat];
      });
      return this.db.daily.put(counters);
    });

    // site stats
    this.db.transaction('rw', this.db.sites, async () => {
      let siteStats = await this.db.sites.get({ day, site });
      if (!siteStats) {
        siteStats = {
          day,
          site,
          pagesVisited: 0,
          cookiesBlocked: 0,
          datapointsRemoved: 0,
          requestsBlocked: 0,
          trackersSum: 0,
        };
      }
      siteStats.pagesVisited += 1;
      Object.keys(aggregate).forEach((stat) => {
        siteStats[stat] += aggregate[stat];
      });
      return this.db.sites.put(siteStats);
    });

    // tracker stats
    this.db.transaction('rw', this.db.trackers, async () => {
      // reversal of trackerOwners
      const trackersDomains = Object.keys(trackerOwners).reduce((h, domain) => ({
        ...h,
        [trackerOwners[domain]]: [domain, ...(h[trackerOwners[domain]] || [])],
      }), {});
      // gather existing db entries
      const trackerRows = (await this.db.trackers.where(['day', 'tracker'])
        .anyOf(Object.keys(trackersDomains).map(trk => [day, trk]))
        .toArray())
        .reduce((rowMap, row) => ({ ...rowMap, [row.tracker]: row }), {});
      // add new tracker entries to trackerRows map
      Object.keys(trackersDomains).filter(tracker => !trackerRows[tracker]).forEach((tracker) => {
        trackerRows[tracker] = {
          day,
          tracker,
          pagesPresent: 0,
          cookiesBlocked: 0,
          datapointsRemoved: 0,
          requestsBlocked: 0,
        };
      });

      // sum page stats with day stats
      Object.keys(trackerRows).forEach((tracker) => {
        const addStats = AntitrackingStatCounter.aggregateTrackerStats(
          trackersDomains[tracker], page.tps
        );
        const stats = trackerRows[tracker];
        stats.pagesPresent += 1;
        Object.keys(addStats).forEach((key) => {
          stats[key] += addStats[key];
        });
      });
      return this.db.trackers.bulkPut(Object.values(trackerRows));
    });

    // tracker - site stats
    this.db.transaction('rw', this.db.trackersSites, async () => {
      const trackersOnSite = [...new Set(Object.values(trackerOwners))];
      const trackerSiteRows = (await this.db.trackersSites.where('day', 'tracker', 'site')
        .anyOf(trackersOnSite.map(trk => [day, trk, site]))
        .toArray())
        .reduce((rowMap, row) => ({ ...rowMap, [row.tracker]: row }), {});
      trackersOnSite.filter(tracker => !trackersOnSite[tracker]).forEach((tracker) => {
        trackerSiteRows[tracker] = {
          day,
          tracker,
          site,
          count: 0,
        };
      });
      Object.keys(trackerSiteRows).forEach((tracker) => {
        trackerSiteRows[tracker].count += 1;
      });
      return this.db.trackersSites.bulkPut(Object.values(trackerSiteRows));
    });
  }

  async getDailySummary(daysBack = 0) {
    const days = [];
    for (let i = 0; i <= daysBack; i += 1) {
      days.push(moment().subtract(i, 'days').format(DATE_FORMAT));
    }
    return this.db.daily.where('day').anyOf(days).toArray();
  }

  async getSiteSummaries(day) {
    return this.db.sites
      .where('day')
      .equals(day)
      .reverse()
      .sortBy('pagesVisited');
  }

  async getSite(site) {
    return this.db.sites.where('site').equals(site).toArray();
  }

  async getTracker(tracker) {
    return this.db.trackers.where('tracker').equals(tracker).toArray();
  }

  async getTrackerSummaries(day) {
    return this.db.trackers
      .where('day')
      .equals(day)
      .reverse()
      .sortBy('pagesPresent');
  }

  async getAllDaysSummary() {
    const summary = {
      cookiesBlocked: 0,
      datapointsRemoved: 0,
      requestsBlocked: 0,
    };

    const allDaysSummary = await this.db.daily.toArray();

    return allDaysSummary
      .reduce((sum, el) => ({
        cookiesBlocked: sum.cookiesBlocked + el.cookiesBlocked,
        datapointsRemoved: sum.datapointsRemoved + el.datapointsRemoved,
        requestsBlocked: sum.requestsBlocked + el.requestsBlocked,
      }), summary);
  }

  async getTrackersOnSite(site) {
    return this.db.trackersSites
      .where('site')
      .equals(site)
      .reverse()
      .sortBy('count');
  }

  async getSitesWhereTracker(tracker) {
    return this.db.trackersSites
      .where('tracker')
      .equals(tracker)
      .reverse()
      .sortBy('count');
  }
}
