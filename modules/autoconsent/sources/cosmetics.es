/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { browser, isContentScriptsSupported } from '../platform/globals';
import config from '../core/config';
import ResourceLoader from '../core/resource-loader';
import { URLInfo } from '../core/url-info';

const COSMETICS_URL = `${config.settings.CDN_BASEURL}/autoconsent/cosmetics.json`;

export default class Cosmetics {
  constructor(settings) {
    this.contentScript = null;
    this.settings = settings;
    this.rules = {};
    this.ruleLoader = new ResourceLoader(['autoconsent', 'cosmetics.json'], {
      remoteURL: COSMETICS_URL,
    });
    this.ruleLoader.onUpdate((data) => {
      this.rules = data;
      this.reload();
    });
  }

  async init() {
    this.rules = await this.ruleLoader.load();
    await this.reload();
  }

  async reload() {
    if (!isContentScriptsSupported()) {
      this.logger.warn('ContentScripts API not supported - cosmetics will not be injected');
      return;
    }
    if (this.contentScript) {
      this.contentScript.unregister();
      this.contentScript = null;
    }
    if (['allow', 'deny'].indexOf(await this.settings.getDefaultActionOnPopup()) === -1) {
      // cosmetics disabled
      return;
    }
    const siteWhitelist = await this.settings.getDisabledSites();
    const excludeMatches = siteWhitelist.map(d => `*://${d}/*`);

    const contentScriptOptions = {
      allFrames: false,
      css: [
        {
          code: `${this.rules.static.join(',')} { display: none !important; }`,
        },
      ],
      matches: ['https://*/*', 'http://*/*'],
      matchAboutBlank: false,
      runAt: 'document_end',
    };
    if (excludeMatches.length > 0) {
      contentScriptOptions.excludeMatches = excludeMatches;
    }

    this.contentScript = await browser.contentScripts.register(contentScriptOptions);
  }

  unload() {
    if (this.contentScript) {
      this.contentScript.unregister();
      this.contentScript = null;
    }
  }

  async applySiteSpecificCosmetics(cmp) {
    const url = URLInfo.get(cmp.url.href);
    const siteRules = this.rules.site[url.hostname] || this.rules.site[url.generalDomain] || [];
    const hidden = siteRules.length > 0 ? await cmp.applyCosmetics(siteRules) : [];
    return hidden;
  }

  async applyCosmetics(cmp) {
    const hidden = [];
    // check static rules
    await Promise.all(
      this.rules.static.map(async (rule) => {
        if (await cmp.tab.elementExists(rule)) {
          hidden.push(rule);
        }
      }),
    );
    return hidden;
  }
}
