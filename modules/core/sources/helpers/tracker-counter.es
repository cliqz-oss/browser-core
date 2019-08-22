/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable no-param-reassign */

import domainInfo from '../services/domain-info';

function emptyEntry() {
  return {
    cookies: 0,
    fingerprints: 0,
    ads: 0,
  };
}

export default class TrackerCounter {
  constructor() {
    this.bugs = {};
    this.others = {};
  }

  _createEntry(base, key) {
    if (!base[key]) {
      base[key] = emptyEntry();
    }
  }

  _incrementEntry(base, key, stat) {
    this._createEntry(base, key);
    base[key][stat] += 1;
  }

  _addStat(bugId, domain, stat) {
    if (bugId) {
      this._incrementEntry(this.bugs, bugId, stat);
    } else {
      this._incrementEntry(this.others, domain, stat);
    }
  }

  addTrackerSeen(bugId, domain) {
    if (bugId) {
      this._createEntry(this.bugs, bugId);
    } else {
      this._createEntry(this.others, domain);
    }
  }

  addCookieBlocked(bugId, domain) {
    this._addStat(bugId, domain, 'cookies');
  }

  addTokenRemoved(bugId, domain) {
    this._addStat(bugId, domain, 'fingerprints');
  }

  addAdBlocked(bugId, domain) {
    this._addStat(bugId, domain, 'ads');
  }

  getSummary() {
    const othersSummary = Object.keys(this.others).reduce((summary, domain) => {
      const owner = domainInfo.getDomainOwner(domain);
      if (summary[owner.name]) {
        Object.keys(this.others[domain]).forEach((stat) => {
          summary[owner.name][stat] += this.others[domain][stat];
        });
        summary[owner.name].domains.push(domain);
      } else {
        summary[owner.name] = {
          ...owner,
          ...this.others[domain],
          domains: [domain],
        };
      }
      return summary;
    }, {});
    return {
      others: othersSummary,
      bugs: this.bugs,
    };
  }
}
