import * as persist from '../core/persistent-state';
import events from '../core/events';
import ResourceLoader from '../core/resource-loader';
import resourceManager from '../core/resource-manager';
import utils from '../core/utils';
import config from '../core/config';

const VERSIONCHECK_URL = `${config.settings.CDN_BASEURL}/anti-tracking/whitelist/versioncheck.json`;
const CONFIG_URL = `${config.settings.CDN_BASEURL}/anti-tracking/config.json`;

export const VERSION = '0.102';
export const MIN_BROWSER_VERSION = 35;

export const TELEMETRY = {
  DISABLED: 0,
  TRACKERS_ONLY: 1,
  ALL: 2,
};

export const DEFAULTS = {
  safekeyValuesThreshold: 4,
  shortTokenLength: 6,
  placeHolder: 'cliqz.com/tracking',
  cliqzHeader: 'CLIQZ-AntiTracking',
  enabled: true,
  cookieEnabled: true,
  qsEnabled: true,
  bloomFilterEnabled: true,
  telemetryMode: TELEMETRY.ALL,
  sendAntiTrackingHeader: true,
  blockCookieNewToken: true,
  tpDomainDepth: 2,
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
};

/**
 * These are attributes which are loaded from the remote CONFIG_URL
 * @type {Array}
 */
const REMOTELY_CONFIGURED = ['blockRules', 'reportList', 'cookieWhitelist', 'subdomainRewriteRules'];

export default class Config {
  constructor({
    defaults = DEFAULTS,
    versionUrl = VERSIONCHECK_URL
  }) {
    this.debugMode = false;
    this.versionCheckUrl = versionUrl;

    this.tokenDomainCountThreshold = 2;
    this.safeKeyExpire = 7;
    this.localBlockExpire = 24;

    Object.assign(this, defaults);

    this.safekeyValuesThreshold = parseInt(persist.getValue('safekeyValuesThreshold'), 10) ||
                                  this.safekeyValuesThreshold;
    this.shortTokenLength = parseInt(persist.getValue('shortTokenLength'), 10) ||
                            this.shortTokenLength;
    this.placeHolder = persist.getValue('placeHolder') || this.placeHolder;
    this.cliqzHeader = persist.getValue('cliqzHeader') || this.cliqzHeader;

    this.paused = false;

    this.loadPrefs();
  }

  loadPrefs() {
    Object.keys(PREFS).forEach((conf) => {
      this[conf] = utils.getPref(PREFS[conf], this[conf] || false);
    });
  }

  setPref(name, value) {
    if (!PREFS[name]) {
      throw new Error(`pref ${name} not known`);
    }
    utils.setPref(PREFS[name], value);
  }

  onPrefChange(pref) {
    if (Object.keys(PREFS).map(n => PREFS[n]).indexOf(pref) > -1) {
      this.loadPrefs();
    }
  }

  init() {
    const versionCheckLoader = new ResourceLoader(['antitracking', 'versioncheck.json'], {
      remoteURL: this.versionCheckUrl,
      cron: 1000 * 60 * 60 * 12,
      remoteOnly: true
    });
    resourceManager.addResourceLoader(versionCheckLoader, this._updateVersionCheck.bind(this));

    const configLoader = new ResourceLoader(['antitracking', 'config.json'], {
      remoteURL: CONFIG_URL,
      cron: 1000 * 60 * 60 * 12,
    });
    resourceManager.addResourceLoader(configLoader, this._updateConfig.bind(this));
    return Promise.resolve();
  }

  unload() {
  }

  _updateVersionCheck(versioncheck) {
    // config in versioncheck
    if (versioncheck.placeHolder) {
      persist.setValue('placeHolder', versioncheck.placeHolder);
      this.placeHolder = versioncheck.placeHolder;
    }

    if (versioncheck.shortTokenLength) {
      persist.setValue('shortTokenLength', versioncheck.shortTokenLength);
      this.shortTokenLength = parseInt(versioncheck.shortTokenLength, 10) || this.shortTokenLength;
    }

    if (versioncheck.safekeyValuesThreshold) {
      persist.setValue('safekeyValuesThreshold', versioncheck.safekeyValuesThreshold);
      this.safekeyValuesThreshold = parseInt(versioncheck.safekeyValuesThreshold, 10) ||
                                    this.safekeyValuesThreshold;
    }

    if (versioncheck.cliqzHeader) {
      persist.setValue('cliqzHeader', versioncheck.cliqzHeader);
      this.cliqzHeader = versioncheck.cliqzHeader;
    }

    // fire events for list update
    events.pub('attrack:updated_config', versioncheck);
  }

  _updateConfig(conf) {
    REMOTELY_CONFIGURED.forEach((key) => {
      this[key] = conf[key];
    });
  }
}
