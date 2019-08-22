/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class SubdomainCheck {
  constructor(config) {
    this.config = config;
  }

  checkBadSubdomain(state, response) {
    const subdomainRewriteRules = this.config.subdomainRewriteRules || {};
    const requestHost = state.urlParts.hostname;
    const rules = Object.keys(subdomainRewriteRules);
    for (let i = 0; i < rules.length; i += 1) {
      const rule = rules[i];
      if (requestHost.endsWith(rule)) {
        const newUrl = state.url.replace(requestHost, subdomainRewriteRules[rule]);
        response.redirectTo(newUrl);
        return false;
      }
    }
    return true;
  }
}
