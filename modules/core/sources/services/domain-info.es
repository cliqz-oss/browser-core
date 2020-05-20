/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../kord/inject';
import { BundledResource } from '../resource-loader';
import { getGeneralDomain } from '../tlds';

class DomainInfo {
  constructor() {
    this.domainOwners = {};
    this.apps = {};
    this.bugs = {};
    this.domains = {};
  }

  getAppOwner(appId) {
    return this.apps[appId] || { name: 'Unknown', cat: 'unknown' };
  }

  getBugOwner(bugId) {
    const appId = this.getAppForBug(bugId);
    return this.getAppOwner(appId);
  }

  getAppForBug(bugId) {
    return this.bugs[bugId];
  }

  _getDomainOwner(dom) {
    if (dom in this.domains) {
      return this.apps[this.domains[dom]];
    }
    if (dom.indexOf('.') === -1) {
      return false;
    }
    return this._getDomainOwner(dom.substring(dom.indexOf('.') + 1));
  }

  getDomainOwner(dom) {
    return this._getDomainOwner(dom) || {
      name: getGeneralDomain(dom),
      cat: 'unknown',
    };
  }

  getTrackerDetails(wtmOrAppId) {
    if (this.apps[wtmOrAppId]) {
      return this.apps[wtmOrAppId];
    }
    return Object.values(this.apps).find(app => app.wtm === wtmOrAppId);
  }
}

export const service = async function service() {
  const domainInfo = new DomainInfo();

  function parseDomainOwners(companyList) {
    const { apps, bugs, domains } = companyList;
    domainInfo.apps = apps;
    domainInfo.bugs = bugs;
    domainInfo.domains = domains;

    const revList = {};
    Object.keys(domains).forEach((domain) => {
      revList[domain] = apps[domains[domain]].name;
    });

    domainInfo.domainOwners = revList;
  }

  const loader = new BundledResource(['core', 'tracker_db_v2.json']);
  parseDomainOwners(await loader.load());

  service.unload = () => {
    loader.stop();
  };

  return domainInfo;
};

export default inject.service('domainInfo', ['getAppOwner', 'getBugOwner', 'getAppForBug', 'getDomainOwner', 'getTrackerDetails', 'domains']);
