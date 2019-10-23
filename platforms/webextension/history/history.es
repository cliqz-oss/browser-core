/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { browser, chrome } from '../globals';

export default class {
  static deleteVisit(visitId) {
    return browser.cliqzHistory.history.deleteVisit(+visitId);
  }

  static deleteVisits(visitIds) {
    return visitIds.reduce(
      (deletePromise, visitId) => deletePromise.then(() => this.deleteVisit(visitId)),
      Promise.resolve()
    );
  }

  static showHistoryDeletionPopup() {
    return browser.cliqzHistory.history.showHistoryDeletionPopup();
  }

  static fillFromVisit(url, triggeringUrl) {
    return browser.cliqzHistory.history.fillFromVisit(url, triggeringUrl);
  }

  static markAsHidden(url) {
    return browser.cliqzHistory.history.markAsHidden(url);
  }

  static cleanupEmptySearches() {
    return browser.cliqzHistory.history.cleanupEmptySearches();
  }

  static addVisit({ url, title, transition, visitTime }) {
    if (!url || !visitTime) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      browser.history.addUrl({
        url,
        title,
        transition: transition || browser.history.TransitionType.TYPED,
        visitTime,
      }, () => {
        const e = browser.runtime.lastError;
        if (e) {
          reject(e);
        } else {
          resolve();
        }
      });
    });
  }

  static migrate() {
    // There is nothing to migrate on this platform (OR IS IT?)
    return Promise.resolve();
  }

  static query({ limit, frameStartsAt, frameEndsAt, domain, query }) {
    if (typeof frameStartsAt === 'string') {
      // eslint-disable-next-line
      frameStartsAt = +frameStartsAt;
    }
    if (typeof frameEndsAt === 'string') {
      // eslint-disable-next-line
      frameEndsAt = +frameEndsAt;
    }
    return browser.cliqzHistory.history.query({ limit, frameStartsAt, frameEndsAt, domain, query });
  }

  static queryVisitsForTimespan({ frameStartsAt, frameEndsAt }) {
    return new Promise((resolve) => {
      if (chrome.history) {
        chrome.history.search({
          text: '',
          startTime: Math.floor(frameStartsAt / 1000), // only integer values are allowed
          endTime: Math.floor(frameEndsAt / 1000),
        }, (items) => {
          resolve(items.map(({ url, lastVisitTime }) => ({
            url,
            ts: lastVisitTime
          })));
        });
      } else {
        resolve([]);
      }
    });
  }

  static async stats() {
    if (browser.cliqzHistory && browser.cliqzHistory.history
        && browser.cliqzHistory.history.stats) {
      return browser.cliqzHistory.history.stats();
    }

    return {
      size: -1,
      days: -1
    };
  }
}
