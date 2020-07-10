/*!
 * Copyright (c) 2014-present Cliqz GmbH. All rights reserved.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import * as persist from '../core/persistent-state';
import prefs from '../core/prefs';
import config from '../core/config';
import asyncPrefs from '../platform/async-storage';
import { getConfigTs } from './time';
import events from '../core/events';
import { fetch } from '../core/http';
import pacemaker from '../core/services/pacemaker';

const SETTINGS = config.settings;
const VERSIONCHECK_URL = `${SETTINGS.ANTITRACKING_BASE_URL}/whitelist/versioncheck.json`;
const CONFIG_URL = `${SETTINGS.ANTITRACKING_BASE_URL}/config.json`;
const WHITELIST2_URL = `${SETTINGS.ANTITRACKING_BASE_URL}/whitelist/2`;
const PROTECTION = 'antitrackingProtectionEnabled';


export const VERSION = '0.102';

export const TELEMETRY = {
  DISABLED: 0,
  TRACKERS_ONLY: 1,
  ALL: 2,
};

export const COOKIE_MODE = {
  THIRD_PARTY: 'thirdparty',
  TRACKERS: 'trackers',
  GHOSTERY: 'ghostery',
};

export const DEFAULTS = {
  safekeyValuesThreshold: 4,
  shortTokenLength: 6,
  placeHolder: SETTINGS.antitrackingPlaceholder,
  cliqzHeader: SETTINGS.antitrackingHeader,
  enabled: true,
  cookieEnabled: Object.prototype.hasOwnProperty.call(SETTINGS, PROTECTION)
    ? SETTINGS[PROTECTION] : true,
  qsEnabled: Object.prototype.hasOwnProperty.call(SETTINGS, PROTECTION)
    ? SETTINGS[PROTECTION] : true,
  bloomFilterEnabled: true,
  telemetryMode: TELEMETRY.TRACKERS_ONLY,
  sendAntiTrackingHeader: true,
  blockCookieNewToken: false,
  tpDomainDepth: 2,
  firstPartyIsolation: false,
  tokenTelemetry: {},
  databaseEnabled: true,
  cookieMode: COOKIE_MODE.THIRD_PARTY,
};

export const PREFS = {
  enabled: 'modules.antitracking.enabled',
  cookieEnabled: 'attrackBlockCookieTracking',
  qsEnabled: 'attrackRemoveQueryStringTracking',
  fingerprintEnabled: 'attrackCanvasFingerprintTracking',
  referrerEnabled: 'attrackRefererTracking',
  trackerTxtEnabled: 'trackerTxt',
  bloomFilterEnabled: 'attrackBloomFilter',
  forceBlockEnabled: 'attrackForceBlock',
  overrideUserAgent: 'attrackOverrideUserAgent',
  cookieTrustReferers: 'attrackCookieTrustReferers',
  telemetryMode: 'attrackTelemetryMode',
  sendAntiTrackingHeader: 'attrackSendHeader',
  firstPartyIsolation: 'attrack.firstPartyIsolation',
  cookieMode: 'attrack.cookieMode',
};

/**
 * These are attributes which are loaded from the remote CONFIG_URL
 * @type {Array}
 */
const REMOTELY_CONFIGURED = ['blockRules', 'reportList', 'cookieWhitelist',
  'subdomainRewriteRules', 'compatibilityList', 'tokenTelemetry'];

export default class Config {
  constructor({
    defaults = DEFAULTS,
    versionUrl = VERSIONCHECK_URL,
    whitelistUrl = WHITELIST2_URL,
  }, onUpdated) {
    this.debugMode = false;
    this.versionCheckUrl = versionUrl;
    this.whitelistUrl = whitelistUrl;
    this.onUpdated = onUpdated;

    this.tokenDomainCountThreshold = 2;
    this.safeKeyExpire = 7;
    this.localBlockExpire = 24;

    Object.assign(this, defaults);

    this.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold'), 10)
                                  || this.safekeyValuesThreshold;
    this.shortTokenLength = parseInt(persist.getValue('shortTokenLength'), 10)
                            || this.shortTokenLength;

    this.paused = false;

    this.loadPrefs();
  }

  loadPrefs() {
    Object.keys(PREFS).forEach((conf) => {
      this[conf] = prefs.get(PREFS[conf], this[conf] || false);
    });
  }

  setPref(name, value) {
    if (!PREFS[name]) {
      throw new Error(`pref ${name} not known`);
    }
    prefs.set(PREFS[name], value);
  }

  onPrefChange(pref) {
    if (Object.keys(PREFS).map(n => PREFS[n]).indexOf(pref) > -1) {
      this.loadPrefs();
    }
  }

  async init() {
    await this._loadConfig();
    this._prefListener = events.subscribe('prefchange', (pref) => {
      if (pref === 'config_ts') {
        this._loadConfig();
      }
    });
  }

  unload() {
    if (this._prefListener) {
      this._prefListener.unsubscribe();
      this._prefListener = null;
    }
  }

  async _loadConfig() {
    const storedConfig = await asyncPrefs.multiGet(['attrack.configLastUpdate', 'attrack.config']);
    const lastUpdate = storedConfig.reduce((obj, kv) => Object.assign(obj, { [kv[0]]: kv[1] }), {});
    const day = prefs.get('config_ts', null) || getConfigTs();
    if (storedConfig.length === 2 && lastUpdate['attrack.configLastUpdate'] === day) {
      this._updateConfig(JSON.parse(lastUpdate['attrack.config']));
      return;
    }
    try {
      const conf = await (await fetch(CONFIG_URL)).json();
      this._updateConfig(conf);
      await asyncPrefs.multiSet([
        ['attrack.configLastUpdate', day],
        ['attrack.config', JSON.stringify(conf)],
      ]);
    } catch (e) {
      pacemaker.setTimeout(this._loadConfig.bind(this), 30000);
    }
  }

  _updateConfig(conf) {
    REMOTELY_CONFIGURED.forEach((key) => {
      this[key] = conf[key];
    });
    if (this.onUpdated) {
      this.onUpdated();
    }
  }
}
