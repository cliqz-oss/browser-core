import { checkIsWindowActive } from '../platform/browser';
import domainInfo from '../core/services/domain-info';
import { parse, getGeneralDomain } from '../core/tlds';
import TrackerCounter from '../core/helpers/tracker-counter';
import events from '../core/events';

const FIRSTPARTY = 'First party';

class PageStats {
  constructor(url) {
    this.pageUrl = url;
    this.hostGD = getGeneralDomain(url);
    this.count = 0;
    this.blocked = new Map();
    this.blockedDomains = new Set();
    this.blockedInfo = {};
    // for ghostery counts
    this.counter = new TrackerCounter();
    this.ts = Date.now();
  }

  addBlockedUrl(url, bugId) {
    // retrieve company
    const { hostname, domain } = parse(url);
    this.blockedDomains.add(domain);
    this.counter.addAdBlocked(bugId, hostname);

    let company;
    if (domain === this.hostGD) {
      company = FIRSTPARTY;
    } else {
      const owner = domainInfo.getDomainOwner(domain);
      company = owner.name;
      this.blockedInfo[company] = owner;
    }

    if (this.blocked.has(company)) {
      if (!this.blocked.get(company).has(url)) {
        this.count += 1;
      }
      this.blocked.get(company).add(url);
    } else {
      this.blocked.set(company, new Set([url]));
      this.count += 1;
    }
  }

  report() {
    const advertisersList = {};
    this.blocked.forEach((v, k) => {
      advertisersList[k] = [...v];
    });
    return {
      totalCount: this.count,
      advertisersList,
      advertisersInfo: this.blockedInfo
    };
  }

  reportTrackers() {
    const report = this.counter.getSummary();
    if (this.blocked.has(FIRSTPARTY)) {
      report.firstPartyAds = this.blocked.get('First party').size;
    }
    return report;
  }
}


class AdbStats {
  constructor() {
    this.tabs = new Map();
  }

  addBlockedUrl(sourceUrl, url, tabId, bugId) {
    let page;
    if (!this.tabs.has(tabId)) {
      page = this.addNewPage(sourceUrl, tabId);
    } else {
      page = this.tabs.get(tabId);
    }

    // If it's a new url in an existing tab
    if (sourceUrl !== page.pageUrl) {
      page = this.addNewPage(sourceUrl, tabId);
    }

    page.addBlockedUrl(url, bugId);
  }

  addNewPage(sourceUrl, tabId) {
    const page = new PageStats(sourceUrl);
    if (this.tabs.has(tabId)) {
      // emit summary of stats from previous page
      const p = this.tabs.get(tabId);
      events.pub('adblocker:tracker-report', {
        tabId,
        ts: p.ts,
        url: p.pageUrl,
        host: p.hostGD,
        report: p.reportTrackers(),
      });
    }
    this.tabs.set(tabId, page);
    return page;
  }

  report(tabId) {
    if (this.tabs.has(tabId)) {
      return this.tabs.get(tabId).report();
    }

    return {
      totalCount: 0,
      advertisersList: {},
      advertisersInfo: {},
    };
  }

  reportTrackers(tabId) {
    if (this.tabs.has(tabId)) {
      return this.tabs.get(tabId).reportTrackers();
    }
    return {
      bugs: {},
      others: {},
    };
  }

  clearStats() {
    const promises = [];

    // Delete stats of closed tabs
    this.tabs.forEach((pageStats, tabId) => {
      promises.push(checkIsWindowActive(tabId).then((active) => {
        if (active) {
          this.tabs.delete(tabId);
        }
      }));
    });

    return Promise.all(promises);
  }
}

export default AdbStats;
