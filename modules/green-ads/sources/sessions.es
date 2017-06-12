import utils from '../core/utils';
import History from '../platform/history/history';
import Anacron from '../core/anacron';
import moment from '../platform/moment';
import logger from './logger';
import { sanitiseUrl } from './utils';

export function getHistory({ from, to, domain, includeSubdomains = false }) {
  const domainPattern = includeSubdomains ? `[a-zA-Z0-9]*.${domain}` : domain;
  return History.query({ frameStartsAt: from, frameEndsAt: to, domain: domainPattern })
  .then(({ places }) => {
    // remove false positives from query results
    if (domain) {
      return places.filter((place) => {
        try {
          const host = place.url.split('://')[1].split('/')[0];
          return host.endsWith(domain);
        } catch (e) {
          return false;
        }
      });
    }
    return places;
  });
}


export function getHistorySummary({ from, to, domain, includeSubdomains = false }) {
  return getHistory({ from, to, domain, includeSubdomains }).then((places) => {
    const visits = places.length;
    const pages = places.reduce((_hash, item) => {
      const hash = _hash;
      const url = sanitiseUrl(item.url);
      if (!hash[url]) {
        hash[url] = 0;
      }
      hash[url] += 1;
      return hash;
    }, Object.create(null));

    const sessions = places.reduce((_hash, item) => {
      const hash = _hash;
      if (!hash[item.session_id]) {
        hash[item.session_id] = 0;
      }
      hash[item.session_id] += 1;
      return hash;
    }, Object.create(null));
    return {
      visits,
      pages,
      sessions,
      domain,
    };
  });
}

export function getRetention({ from, to, domain, includeSubdomains = false }) {
  return getHistory({ from, to, domain, includeSubdomains }).then((places) => {
    const activeDays = places.reduce((days, visit) => {
      days.add(moment(visit.visit_date / 1000).format('YYYYMMDD'));
      return days;
    }, new Set());
    return activeDays;
  });
}

const MODE_SINCE_PREF = 'greenadsModeSince';

export default class SiteRetention {

  constructor(domainList, greenMode, sendTelemetry) {
    this.domains = new Set(domainList);
    this.anacron = new Anacron(
      { get: utils.getPref, set: utils.setPref }, // storage
      { name: 'greenads.anacron' },               // options
    );
    this.greenMode = greenMode;
    this.sendTelemetry = sendTelemetry;
  }

  init() {
    this.anacron.schedule(this.measureRetention.bind(this), '1 0 * * *'); // everyday at midnight
    this.anacron.start();
    if (!utils.hasPref(MODE_SINCE_PREF)) {
      this.toggleState();
    }
  }

  unload() {
    this.anacron.stop();
  }

  toggleState(greenMode) {
    utils.setPref(MODE_SINCE_PREF, Date.now().toString());
    this.greenMode = greenMode;
  }

  measureRetention(date) {
    // timestamps in millis
    const greenSince = parseInt(utils.getPref(MODE_SINCE_PREF, 0), 10) * 1000;

    const dayToMeasure = moment(date).subtract(1, 'day').startOf('day').valueOf();
    const from = Math.max(dayToMeasure * 1000, greenSince);
    const to = moment(dayToMeasure).endOf('day').valueOf() * 1000;

    // we don't know what mode we were in on this day - don't send data
    if (from > to) {
      return Promise.reject('Before greenads setting changed');
    }

    const domains = [...this.domains];
    const getHistorySummaries = Promise.all(domains
      .map(domain => getHistorySummary({ from, to, domain, includeSubdomains: true })));

    const retention = domains.map(domain => getRetention({
      from: moment(dayToMeasure).subtract(10, 'days').valueOf() * 1000,
      to: dayToMeasure * 1000,
      domain,
      includeSubdomains: true,
    }));
    const getRetentionSummary = Promise.all(retention).then((sitesActivity) => {
      const activeDays = sitesActivity.reduce((days, d) => {
        d.forEach(item => days.add(item));
        return d;
      }, new Set());
      const lastActive = activeDays.size > 0 ?
          Math.max(...[...activeDays].map(Number)).toString() : null;
      return {
        daysActive: activeDays.size,
        lastActive,
      };
    });

    const generateDailySummary = Promise.all([getHistorySummaries, getRetentionSummary])
    .then((results) => {
      const [summaries, retentionSummary] = results;
      const activeSites = summaries.filter(sum => sum.visits > 0);
      const siteActive = activeSites.length > 0;
      const heavyUser = retentionSummary.daysActive > 7;

      const summary = {
        day: moment(dayToMeasure).format('YYYYMMDD'),
        greenMode: this.greenMode,
        sites: [...this.domains],
        siteActive,
        lastActive: retentionSummary.lastActive,
        heavyUser,
      };

      if (!siteActive) {
        // check for any activity
        return getHistory({ from, to }).then((places) => {
          const dailyActive = places.length > 0;
          return Object.assign(summary, { dailyActive });
        });
      }
      return Object.assign(summary, {
        dailyActive: true,
        activity: activeSites
          .reduce((hash, item) => Object.assign(hash, { [item.domain]: item }),
            Object.create(null)),
      });
    });

    return generateDailySummary.then((summary) => {
      logger.log('sending daily user summary', summary);
      this.sendTelemetry({
        type: 'humanweb',
        action: 'greenads.activity',
        payload: summary,
      });
    });
  }
}
