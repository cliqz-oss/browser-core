/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import { browser } from '../platform/globals';

const BROWSER_STORAGE_KEY = 'autoconsent';
const STORAGE_KEY_DEFAULT = 'consent/default';

export default class ConsentSettings {
  constructor() {
    this.load = browser.storage.local.get(BROWSER_STORAGE_KEY)
      .then(res => res[BROWSER_STORAGE_KEY] || {});
    this.tempStore = {};
  }

  async save() {
    const sto = await this.load;
    browser.storage.local.set({
      [BROWSER_STORAGE_KEY]: sto,
    });
  }

  getConsentStorageKey(site) {
    return `consent/${site}`;
  }

  async getStatusForSite(/* site */) {
    // Site status always null - not saved at present
    return null;
  }

  async setSiteConsentStatus(/* site, state */) {
    // Do not save site consent status - not used in current UI
  }

  async getActionOnPopup(site) {
    const storageKey = this.getConsentStorageKey(site);
    if (this.tempStore[storageKey]) {
      return this.tempStore[storageKey];
    }
    const results = await this.load;
    if (results[storageKey]) {
      return results[storageKey];
    }
    return this.getDefaultActionOnPopup();
  }

  async getDefaultActionOnPopup() {
    const results = await this.load;
    return results[STORAGE_KEY_DEFAULT];
  }

  async setActionPreferenceDefault(action) {
    const result = await this.load;
    result[STORAGE_KEY_DEFAULT] = action;
    return this.save();
  }

  async setActionPreferenceSite(site, action, temporary = false) {
    const key = this.getConsentStorageKey(site);
    if (temporary) {
      this.tempStore[key] = action;
      return;
    }
    const result = await this.load;
    result[key] = action;
    delete this.tempStore[key];
    await this.save();
  }

  async clearActionPreferenceSite(site) {
    const key = this.getConsentStorageKey(site);
    const result = await this.load;
    delete result[key];
    delete this.tempStore[key];
    return this.save();
  }

  async getDisabledSites() {
    const storage = { ...this.tempStore, ...await this.load };
    const disabled = Object.keys(storage).reduce((list, key) => {
      if (storage[key] === 'none') {
        const host = key.split('/')[1];
        list.push(host);
      }
      return list;
    }, []);
    return disabled;
  }
}
