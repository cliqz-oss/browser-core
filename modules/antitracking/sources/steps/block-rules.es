/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export default class BlockRules {
  constructor(config) {
    this.config = config;
  }

  get qsBlockRule() {
    return this.config.blockRules || [];
  }

  shouldBlock(host, sourceHost) {
    for (let i = 0; i < this.qsBlockRule.length; i += 1) {
      const sRule = this.qsBlockRule[i][0];
      const uRule = this.qsBlockRule[i][1];
      if (sourceHost.endsWith(sRule)
        && host.endsWith(uRule)) {
        return true;
      }
    }
    return false;
  }

  applyBlockRules(state, response) {
    if (this.shouldBlock(state.urlParts.hostname, state.tabUrlParts.hostname)) {
      state.incrementStat('req_rule_aborted');
      response.cancel = true;
      return false;
    }
    return true;
  }
}
