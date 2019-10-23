/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import inject from '../core/kord/inject';

export default class ReconsentTelemetry {
  constructor() {
    this.wrPipeline = inject.module('webrequest-pipeline');
  }

  get isEnabled() {
    return this.wrPipeline.isEnabled();
  }

  async getTabAnnotations(tabId) {
    return (await this.wrPipeline.action('getPageForTab', tabId)).annotations;
  }

  async recordCMPDetected(cmp, popupOpen) {
    if (this.isEnabled) {
      const annotations = await this.getTabAnnotations(cmp.tab.id);
      annotations.cmp = {
        name: cmp.getCMPName(),
        popupOpen,
      };
    }
  }

  async recordConsentError(cmp, error) {
    if (this.isEnabled) {
      const annotations = await this.getTabAnnotations(cmp.tab.id);
      annotations.cmp = Object.assign(annotations.cmp || {}, {
        name: cmp.getCMPName(),
        error,
      });
    }
  }

  async recordConsentTime(cmp, action, time) {
    if (this.isEnabled) {
      const annotations = await this.getTabAnnotations(cmp.tab.id);
      annotations.cmp = Object.assign(annotations.cmp || {}, {
        name: cmp.getCMPName(),
        action,
        time,
      });
      if (cmp.hasTest() && action === 'deny') {
        await new Promise(res => setTimeout(res, 5000));
        try {
          const testResult = await cmp.testOptOutWorked() || false;
          annotations.cmp.testResult = testResult;
        } catch (e) {
          annotations.cmp.testFailure = e.toString();
        }
      }
    }
  }

  async recordCosmeticMatches(cmp, matches) {
    if (this.isEnabled) {
      const annotations = await this.getTabAnnotations(cmp.tab.id);
      annotations.hiddenElements = matches;
    }
  }
}
