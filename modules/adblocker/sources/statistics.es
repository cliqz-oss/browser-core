/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { checkIsWindowActive } from '../platform/browser';
import domainInfo from '../core/services/domain-info';
import { nextTick } from '../core/decorators';
import TrackerCounter from '../core/helpers/tracker-counter';
import events from '../core/events';
import pacemaker from '../core/services/pacemaker';

const FIRSTPARTY = 'First party';

class PageStats {
  constructor(context) {
    this.tabUrl = context.tabUrl;
    this.hostGD = context.tabUrlParts.generalDomain;
    this.blockedRequests = [];

    // Lazily computed once a report is requested
    this._counter = new TrackerCounter();
    this._count = 0;
    this._blocked = new Map();
    this._blockedDomains = new Set();
    this._blockedInfo = {};
  }

  get count() {
    this.processBlockedRequests();
    return this._count;
  }

  get blocked() {
    this.processBlockedRequests();
    return this._blocked;
  }

  get blockedDomains() {
    this.processBlockedRequests();
    return this._blockedDomains;
  }

  get blockedInfo() {
    this.processBlockedRequests();
    return this._blockedInfo;
  }

  get counter() {
    this.processBlockedRequests();
    return this._counter;
  }

  /**
   * This function is called from onBeforeRequest handler in the adblocker and
   * should run as fast as possible. To this end, no processing is performed
   * eagerly. The blocked requests info is queued and tracker info is retrieved
   * only when a report is requested.
   */
  addBlockedUrl(context) {
    this.blockedRequests.push({
      url: context.url,
      hostname: context.urlParts.hostname,
      domain: context.urlParts.generalDomain,
      ghosteryBug: context.ghosteryBug,
    });
  }

  /**
   * Whenever a report for this tab is requested, process blocked requests.
   */
  processBlockedRequests() {
    // If no request was blocked, there is nothing to do
    if (this.blockedRequests.length === 0) {
      return;
    }

    for (let i = 0; i < this.blockedRequests.length; i += 1) {
      const { url, hostname, domain, ghosteryBug } = this.blockedRequests[i];

      // retrieve company
      this._blockedDomains.add(domain);
      this._counter.addAdBlocked(ghosteryBug, hostname);

      let company;
      if (domain === this.hostGD) {
        company = FIRSTPARTY;
      } else {
        const owner = domainInfo.getDomainOwner(domain);
        company = owner.name;
        this._blockedInfo[company] = owner;
      }

      if (this._blocked.has(company)) {
        if (!this._blocked.get(company).has(url)) {
          this._count += 1;
        }
        this._blocked.get(company).add(url);
      } else {
        this._blocked.set(company, new Set([url]));
        this._count += 1;
      }
    }

    // Reset pending requests
    this.blockedRequests = [];
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


export default class AdbStats {
  constructor() {
    this.tabs = new Map();
    this.clearInterval = null;
  }

  init() {
    this.clearInterval = pacemaker.everyFewMinutes(() => { this.clearStats(); });
  }

  unload() {
    pacemaker.clearTimeout(this.clearInterval);
  }

  addBlockedUrl(context) {
    // Check if we already have a context for this tab
    let page = this.tabs.get(context.tabId);
    if (page === undefined) {
      page = this.addNewPage(context);
    }

    // If it's a new url in an existing tab
    if (context.tabUrl !== page.tabUrl) {
      page = this.addNewPage(context);
    }

    page.addBlockedUrl(context);
  }

  addNewPage(context) {
    const existingPage = this.tabs.get(context.tabId);
    if (existingPage !== undefined) {
      // Emit summary of stats from previous page
      nextTick(() => {
        events.pub('adblocker:tracker-report', {
          tabId: context.tabId,
          url: existingPage.tabUrl,
          host: existingPage.hostGD,
          report: existingPage.reportTrackers(),
        });
      });
    }

    // Create new PageStats for this tab
    const page = new PageStats(context);
    this.tabs.set(context.tabId, page);
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
