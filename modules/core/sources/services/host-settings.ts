/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

interface HostPrefsListener {
  (): void;
}

interface Browser {
  cliqz?: {
    getPref(key: String): Promise<any>;
    setPref(key: String, value: any): Promise<void>;
    hasPref(key: String): Promise<boolean>;
    clearPref(key: String): Promise<void>;
    onPrefChange: {
      addListener: (listener: HostPrefsListener, prefix: String, key?: String) => void;
      removeListener: (listener: HostPrefsListener) => void;
    };
  }
}

interface HostPrefs {
  get(key: String, defaultValue?: any): Promise<any>;
  set(key: String, value: any): Promise<any>;
  has(key: String): Promise<boolean>;
  clear(key: String): Promise<void>;
  addListener(listener: HostPrefsListener, key: String): void;
  removeListener(listener: HostPrefsListener): void;
}

// eslint-disable-next-line import/prefer-default-export
export async function service(_: any, browser: Browser) {
  const hostPrefs: HostPrefs = {
    async get(key, defaultValue) {
      if (!browser.cliqz || !browser.cliqz.getPref) {
        return defaultValue;
      }
      const value = await browser.cliqz.getPref(key);
      if (typeof value === 'undefined' || value === null) {
        return defaultValue;
      }
      return value;
    },
    async set(key, value) {
      if (!browser.cliqz || !browser.cliqz.setPref) {
        return;
      }
      return browser.cliqz.setPref(key, value);
    },
    async has(key) {
      if (!browser.cliqz || !browser.cliqz.hasPref) {
        return false;
      }
      return browser.cliqz.hasPref(key);
    },
    async clear(key) {
      if (!browser.cliqz || !browser.cliqz.clearPref) {
        return;
      }
      return browser.cliqz.clearPref(key);
    },
    addListener(listener, prefName) {
      if (!browser.cliqz || !browser.cliqz.onPrefChange) {
        return;
      }
      return browser.cliqz.onPrefChange.addListener(listener, prefName, '');
    },
    removeListener(listener) {
      if (!browser.cliqz || !browser.cliqz.onPrefChange) {
        return;
      }
      browser.cliqz.onPrefChange.removeListener(listener);
    },
  };

  let listeners = new Set<HostPrefsListener>();

  // @ts-ignore
  service.unload = () => {
    [...listeners].forEach((listener) => {
      hostPrefs.removeListener(listener);
    })
    listeners.clear();
  };

  return {
    get: hostPrefs.get,
    set: hostPrefs.set,
    has: hostPrefs.has,
    clear: hostPrefs.clear,
    addListener(listener: HostPrefsListener, prefName: String, ) {
      hostPrefs.addListener(listener, prefName);
      listeners.add(listener);
    },
    removeListener(listener: HostPrefsListener) {
      hostPrefs.removeListener(listener);
      listeners.delete(listener);
    },
  };
}
