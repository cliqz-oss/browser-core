import { getGeneralDomain } from '../antitracking/domain';
import { isTabURL } from '../platform/browser';
import { URLInfo } from '../antitracking/url';
import domainInfo from '../core/domain-info';


class PageStats {
  constructor(url) {
    this.pageUrl = url;
    this.count = 0;
    this.blocked = new Map();
    this.blockedDomains = new Set();
  }

  addBlockedUrl(url) {
    // retrieve company
    const domain = getGeneralDomain(URLInfo.get(url).hostname);
    this.blockedDomains.add(domain);

    let company;
    // Re-use anti tracking company list for the moment.
    // TODO: Replace it with a proper ads company list later
    if (domain in domainInfo.domainOwners) {
      company = domainInfo.domainOwners[domain];
    } else if (domain === getGeneralDomain(URLInfo.get(this.pageUrl).hostname)) {
      company = 'First party';
    } else {
      company = domain;
    }
    if (this.blocked.get(company)) {
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
    this.pages = new Map();
    this.tabs = new Map();
  }

  addBlockedUrl(sourceUrl, url, tabId) {
    if (!this.tabs.get(tabId)) {
      this.tabs.set(tabId, new PageStats(sourceUrl));
    }
    const page = this.tabs.get(tabId);

    if (!this.pages.get(sourceUrl)) {
      this.pages.set(sourceUrl, page);
    }
    page.addBlockedUrl(url);
  }

  addNewPage(sourceUrl) {
    this.pages.set(sourceUrl, new PageStats(sourceUrl));
  }

  report(url) {
    if (this.pages.get(url)) {
      return this.pages.get(url).report();
    }
    return {
      totalCount: 0,
      advertisersList: {},
    };
  }

  clearStats() {
    this.pages.forEach((value, key) => {
      if (!isTabURL(key)) {
        this.pages.delete(key);
      }
    });
  }
}

export default AdbStats;
