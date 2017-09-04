import { getGeneralDomain } from '../antitracking/domain';
import { checkIsWindowActive } from '../platform/browser';
import { URLInfo } from '../antitracking/url';
import domainInfo from '../core/domain-info';


class PageStats {
  constructor(url) {
    this.pageUrl = url;
    this.hostGD = getGeneralDomain(URLInfo.get(url).hostname);
    this.count = 0;
    this.blocked = new Map();
    this.blockedDomains = new Set();
  }

  addBlockedUrl(url) {
    // retrieve company
    const domain = getGeneralDomain(URLInfo.get(url).hostname);
    this.blockedDomains.add(domain);

    let company;
    if (domain in domainInfo.domainOwners) {
      company = domainInfo.domainOwners[domain];
    } else if (domain === this.hostGD) {
      company = 'First party';
    } else {
      company = domain;
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
    };
  }
}


class AdbStats {
  constructor() {
    this.tabs = new Map();
  }

  addBlockedUrl(sourceUrl, url, tabId) {
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

    page.addBlockedUrl(url);
  }

  addNewPage(sourceUrl, tabId) {
    const page = new PageStats(sourceUrl);
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
